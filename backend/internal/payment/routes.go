package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	sdk "github.com/DevilGenius/airgate-sdk/sdkgo"

	"github.com/DouDOU-start/airgate-epay/backend/internal/payment/provider"
)

// HTTP header 名称（与 core/extension_proxy.go 透传的头一致）
const (
	headerEntry  = "X-Airgate-Entry"   // admin / user / callback
	headerUserID = "X-Airgate-User-ID" // 普通用户 / 管理员的 user_id；管理员 API Key 时为 0
	headerRole   = "X-Airgate-Role"    // admin / user
)

// registerRoutes 把所有 HTTP handler 挂到 sdk.RouteRegistrar 上。
//
// 路径分布：
//
//	user 入口    (/api/v1/ext-user/payment-epay/...)：
//	  POST   /user/orders                      创建订单
//	  GET    /user/orders                      列出我的订单
//	  GET    /user/orders/{out_trade_no}       查询单个订单
//	  GET    /user/methods                     列出当前可用的支付方式（PayMethod）
//
//	admin 入口   (/api/v1/ext/payment-epay/...)：
//	  GET    /admin/orders                     全量订单列表（带 email 过滤）
//	  GET    /admin/providers                  列出已注册 Provider 实例 + 已注册 KindMeta
//	  POST   /admin/providers                  新增/更新 Provider 实例
//	  DELETE /admin/providers/{id}             删除 Provider 实例
//	  POST   /admin/providers/reload           手动重新加载 Provider 列表
//
//	callback 入口 (/api/v1/payment-callback/payment-epay/...)：
//	  POST/GET /notify/{provider_id}           异步回调
func (p *Plugin) registerRoutes(r sdk.RouteRegistrar) {
	// 用户级
	r.Handle(http.MethodPost, "/user/orders", p.requireUser(p.requireConfigured(p.handleCreateOrder)))
	r.Handle(http.MethodGet, "/user/orders", p.requireUser(p.requireConfigured(p.handleListUserOrders)))
	r.Handle(http.MethodGet, "/user/orders/", p.requireUser(p.requireConfigured(p.handleGetOrder)))
	// methods 接口即使未配置也允许返回（返回空数组），让前端能展示"暂无可用支付方式"而非 503
	r.Handle(http.MethodGet, "/user/methods", p.requireUser(p.handleListMethods))

	// 管理员级 - 订单
	r.Handle(http.MethodGet, "/admin/orders", p.requireAdmin(p.requireConfigured(p.handleAdminListOrders)))

	// 管理员级 - Provider 配置 CRUD
	r.Handle(http.MethodGet, "/admin/providers", p.requireAdmin(p.requireConfigured(p.handleAdminListProviders)))
	r.Handle(http.MethodPost, "/admin/providers", p.requireAdmin(p.requireConfigured(p.handleAdminUpsertProvider)))
	r.Handle(http.MethodDelete, "/admin/providers/", p.requireAdmin(p.requireConfigured(p.handleAdminDeleteProvider)))
	r.Handle(http.MethodPost, "/admin/providers/reload", p.requireAdmin(p.requireConfigured(p.handleAdminReloadProviders)))

	// 异步回调（前缀匹配，按 /notify/{provider_id} 解析）
	r.Handle(http.MethodPost, "/notify/", p.requireCallback(p.requireConfigured(p.handleCallback)))
	r.Handle(http.MethodGet, "/notify/", p.requireCallback(p.requireConfigured(p.handleCallback)))
}

// ============================================================================
// 入口校验中间件
// ============================================================================

// requireConfigured 在所有数据接口前校验插件已初始化（svc != nil）
func (p *Plugin) requireConfigured(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !p.Configured() {
			writeJSONErr(w, http.StatusServiceUnavailable,
				"支付插件尚未配置：请联系管理员检查 db_dsn 与回调 BaseURL")
			return
		}
		next(w, r)
	}
}

func (p *Plugin) requireUser(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get(headerEntry) != "user" {
			writeJSONErr(w, http.StatusForbidden, "该接口仅允许通过 /api/v1/ext-user 入口访问")
			return
		}
		if r.Header.Get(headerUserID) == "" {
			writeJSONErr(w, http.StatusUnauthorized, "缺少用户身份")
			return
		}
		next(w, r)
	}
}

func (p *Plugin) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get(headerEntry) != "admin" {
			writeJSONErr(w, http.StatusForbidden, "该接口仅允许通过 /api/v1/ext 入口访问")
			return
		}
		if r.Header.Get(headerRole) != "admin" {
			writeJSONErr(w, http.StatusForbidden, "需要管理员权限")
			return
		}
		next(w, r)
	}
}

func (p *Plugin) requireCallback(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get(headerEntry) != "callback" {
			writeJSONErr(w, http.StatusForbidden, "回调接口仅允许通过 /api/v1/payment-callback 入口访问")
			return
		}
		next(w, r)
	}
}

// ============================================================================
// 用户级 handler
// ============================================================================

type createOrderReq struct {
	Amount  float64 `json:"amount"`
	Method  string  `json:"method"`
	Subject string  `json:"subject"`
}

func (p *Plugin) handleCreateOrder(w http.ResponseWriter, r *http.Request) {
	uid, ok := userIDFromHeader(r)
	if !ok {
		writeJSONErr(w, http.StatusUnauthorized, "无效的用户身份")
		return
	}
	var body createOrderReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONErr(w, http.StatusBadRequest, "请求体解析失败: "+err.Error())
		return
	}
	if body.Subject == "" {
		body.Subject = "AirGate 余额充值"
	}
	order, err := p.svc.CreateOrder(r.Context(), CreateOrderInput{
		UserID:   uid,
		Method:   body.Method,
		Amount:   body.Amount,
		Subject:  body.Subject,
		ClientIP: clientIPFromHeader(r),
	})
	if err != nil {
		writeJSONErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}

func (p *Plugin) handleListUserOrders(w http.ResponseWriter, r *http.Request) {
	uid, ok := userIDFromHeader(r)
	if !ok {
		writeJSONErr(w, http.StatusUnauthorized, "无效的用户身份")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	orders, err := p.svc.ListUserOrders(r.Context(), uid, limit)
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"list": orders})
}

func (p *Plugin) handleGetOrder(w http.ResponseWriter, r *http.Request) {
	uid, ok := userIDFromHeader(r)
	if !ok {
		writeJSONErr(w, http.StatusUnauthorized, "无效的用户身份")
		return
	}
	outTradeNo := strings.TrimPrefix(r.URL.Path, "/user/orders/")
	if outTradeNo == "" {
		writeJSONErr(w, http.StatusBadRequest, "缺少 out_trade_no")
		return
	}
	order, err := p.svc.GetOrder(r.Context(), uid, outTradeNo)
	if err != nil {
		writeJSONErr(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// handleListMethods 列出当前可用的支付方式（前端用于渲染按钮）
//
// 返回结构与 channels 接口不同：现在是 MethodInfo 结构体数组而非字符串。
// 用户面板上看到的是「支付宝/微信/QQ 钱包」按钮，他们不知道也不关心背后哪家服务商。
func (p *Plugin) handleListMethods(w http.ResponseWriter, _ *http.Request) {
	if !p.Configured() {
		writeJSON(w, http.StatusOK, map[string]any{
			"methods":    []provider.MethodInfo{},
			"configured": false,
			"message":    "支付插件尚未配置，请联系管理员",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"methods":    p.svc.AvailableMethods(),
		"configured": true,
	})
}

// ============================================================================
// 管理员级 handler - 订单
// ============================================================================

func (p *Plugin) handleAdminListOrders(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("page_size"))
	result, err := p.svc.ListAllOrders(r.Context(), AdminListParams{
		Email:    q.Get("email"),
		Status:   q.Get("status"),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// ============================================================================
// 管理员级 handler - Provider 配置 CRUD
// ============================================================================

// adminProviderItem 单条 Provider 配置在 admin API 响应中的形态
type adminProviderItem struct {
	ID               string            `json:"id"`
	Kind             string            `json:"kind"`
	Name             string            `json:"name"`
	Enabled          bool              `json:"enabled"`
	Config           map[string]string `json:"config"`
	SupportedMethods []string          `json:"supported_methods"`
	IsRunning        bool              `json:"is_running"`
}

// handleAdminListProviders 返回当前已配置的 Provider 列表 + 所有可注册的 Kind 元信息。
//
// 前端 admin 页据此渲染：
//   - 已存在的 Provider 实例（含字段值，敏感字段保留以便编辑）
//   - 「添加新 Provider」下拉里的可选项
func (p *Plugin) handleAdminListProviders(w http.ResponseWriter, r *http.Request) {
	records, err := p.store.List(r.Context())
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	items := make([]adminProviderItem, 0, len(records))
	for _, rec := range records {
		item := adminProviderItem{
			ID:      rec.ID,
			Kind:    rec.Kind,
			Enabled: rec.Enabled,
			Config:  rec.Config,
		}
		if meta, ok := provider.GetKindMeta(rec.Kind); ok {
			item.Name = meta.Name
			item.SupportedMethods = meta.SupportedMethods
		}
		if running := p.registry.Find(rec.ID); running != nil {
			item.IsRunning = running.Enabled()
		}
		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"providers": items,
		"kinds":     provider.AllKindMetas(),
	})
}

type upsertProviderReq struct {
	// ID 当前要写入的 id（创建时可空，后端自动生成；编辑时可改）
	ID string `json:"id"`
	// OriginalID 编辑场景下携带的原 id；为空表示创建。
	// 当 OriginalID != ID 时，handler 会调用 Rename 在事务里同步更新订单的 provider_id 引用。
	OriginalID string            `json:"original_id"`
	Kind       string            `json:"kind"`
	Enabled    bool              `json:"enabled"`
	Config     map[string]string `json:"config"`
}

func (p *Plugin) handleAdminUpsertProvider(w http.ResponseWriter, r *http.Request) {
	var body upsertProviderReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONErr(w, http.StatusBadRequest, "请求体解析失败: "+err.Error())
		return
	}
	body.ID = strings.TrimSpace(body.ID)
	body.Kind = strings.TrimSpace(body.Kind)
	if body.Kind == "" {
		writeJSONErr(w, http.StatusBadRequest, "kind 必填")
		return
	}
	if _, ok := provider.GetKindMeta(body.Kind); !ok {
		writeJSONErr(w, http.StatusBadRequest, "未知的 provider kind: "+body.Kind)
		return
	}
	if body.Config == nil {
		body.Config = make(map[string]string)
	}

	body.OriginalID = strings.TrimSpace(body.OriginalID)

	// ID 为空时自动生成（创建场景）：{kind}_{N}，N 同 kind 下递增
	// admin 也可以填一个有意义的自定义 ID（例如 xunhu_main），便于多实例区分。
	// 编辑场景下前端会回填原 ID 到 OriginalID；如果 admin 改了显示的 ID，
	// body.ID != body.OriginalID，需要走 Rename 流程。
	if body.ID == "" {
		nextID, err := p.store.NextIDForKind(r.Context(), body.Kind)
		if err != nil {
			writeJSONErr(w, http.StatusInternalServerError, "生成实例 ID 失败: "+err.Error())
			return
		}
		body.ID = nextID
	} else {
		// 用户填了自定义 ID：校验字符合法性
		if !isValidProviderID(body.ID) {
			writeJSONErr(w, http.StatusBadRequest,
				"实例 ID 只能包含字母、数字、下划线、连字符（[a-zA-Z0-9_-]），长度 1-64")
			return
		}
	}

	// 编辑场景下检测到 ID 变化 → 走 Rename，在事务里同步改 configs.id 与 orders.provider_id
	if body.OriginalID != "" && body.OriginalID != body.ID {
		if err := p.store.Rename(r.Context(), body.OriginalID, body.ID); err != nil {
			writeJSONErr(w, http.StatusBadRequest, "重命名实例 ID 失败: "+err.Error())
			return
		}
	}

	// 持久化（Upsert 按 id 主键 ON CONFLICT 更新；Rename 后这条记录已是新 id）
	if err := p.store.Upsert(r.Context(), provider.ConfigRecord{
		ID:      body.ID,
		Kind:    body.Kind,
		Enabled: body.Enabled,
		Config:  body.Config,
	}); err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	// 立即重新加载 Registry，让新配置生效
	if err := p.ReloadProviders(r.Context()); err != nil {
		writeJSONErr(w, http.StatusInternalServerError, "已保存但重新加载失败: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": body.ID})
}

func (p *Plugin) handleAdminDeleteProvider(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/admin/providers/")
	id = strings.TrimSpace(id)
	if id == "" || id == "reload" {
		writeJSONErr(w, http.StatusBadRequest, "缺少 provider id")
		return
	}
	if err := p.store.Delete(r.Context(), id); err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := p.ReloadProviders(r.Context()); err != nil {
		writeJSONErr(w, http.StatusInternalServerError, "已删除但重新加载失败: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (p *Plugin) handleAdminReloadProviders(w http.ResponseWriter, r *http.Request) {
	if err := p.ReloadProviders(r.Context()); err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ============================================================================
// 回调入口
// ============================================================================

func (p *Plugin) handleCallback(w http.ResponseWriter, r *http.Request) {
	providerID := strings.TrimPrefix(r.URL.Path, "/notify/")
	if providerID == "" {
		writeJSONErr(w, http.StatusBadRequest, "缺少 provider id")
		return
	}

	// 派生请求级 logger 写回 ctx
	rid := sdk.ExtractOrGenerateRequestID(r.Header)
	ctx := sdk.WithRequestID(r.Context(), rid)
	ctx, logger := sdk.LoggerWithRequestID(ctx)

	// 同时支持 form-urlencoded（易支付/支付宝）与原始 body（v3 接口）
	body, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewReader(body))
	if err := r.ParseForm(); err != nil {
		_ = err
	}

	// 入口日志：仅记录订单号，不打印签名/完整 body
	var outTradeNo string
	if r.Form != nil {
		outTradeNo = r.Form.Get("out_trade_no")
		if outTradeNo == "" {
			outTradeNo = r.Form.Get("trade_order_id")
		}
	}
	logger.Info("payment_callback_received",
		"provider", providerID,
		"out_trade_no", outTradeNo,
	)

	res, err := p.svc.HandleCallback(ctx, providerID, provider.CallbackRequest{
		Form:    r.Form,
		Body:    body,
		Headers: r.Header,
	})
	if err != nil {
		http.Error(w, "fail: "+err.Error(), http.StatusBadRequest)
		return
	}

	switch res.ReplyType {
	case "xml":
		w.Header().Set("Content-Type", "application/xml")
	case "json":
		w.Header().Set("Content-Type", "application/json")
	default:
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	}
	if res.Reply == "" {
		_, _ = w.Write([]byte("success"))
		return
	}
	_, _ = w.Write([]byte(res.Reply))
}

// ============================================================================
// 工具函数
// ============================================================================

func userIDFromHeader(r *http.Request) (int64, bool) {
	v := r.Header.Get(headerUserID)
	if v == "" {
		return 0, false
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

func clientIPFromHeader(r *http.Request) string {
	if v := r.Header.Get("X-Forwarded-For"); v != "" {
		return strings.TrimSpace(strings.Split(v, ",")[0])
	}
	if v := r.Header.Get("X-Real-IP"); v != "" {
		return v
	}
	return r.RemoteAddr
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeJSONErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// isValidProviderID 校验自定义实例 ID 字符合法性。
// 只允许 [a-zA-Z0-9_-]，长度 1-64。这个集合保证 ID 直接拼到回调路径
// /api/v1/payment-callback/payment-epay/notify/{id} 时不需要任何转义，
// 也避免与 SQL ILIKE / shell 命令混淆。
func isValidProviderID(s string) bool {
	if len(s) == 0 || len(s) > 64 {
		return false
	}
	for _, c := range s {
		if (c >= 'a' && c <= 'z') ||
			(c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') ||
			c == '_' || c == '-' {
			continue
		}
		return false
	}
	return true
}

// 占位避免 context 未使用警告（一些 handler 内部不直接用 context 但参数签名需要）
var _ = context.Background
