package payment

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	sdk "github.com/DevilGenius/airgate-sdk/sdkgo"

	"github.com/DevilGenius/airgate-epay/backend/internal/payment/provider"
)

// Order 订单领域模型（service / handler 层共用）
//
// UserEmail 仅在 Admin 列表接口里通过 LEFT JOIN users 填充，用户级接口为空。
// 用 omitempty 避免给用户级 API 多塞冗余字段。
//
// Method 是用户面向的支付方式（alipay/wxpay/qqpay 等），ProviderID 是实际承载这笔订单的
// Provider 实例 ID。两个字段一起记录"用户选了什么 + 实际走了哪家服务商"，便于运营分析。
type Order struct {
	ID            int64           `json:"id"`
	OutTradeNo    string          `json:"out_trade_no"`
	UserID        int64           `json:"user_id"`
	UserEmail     string          `json:"user_email,omitempty"`
	Method        string          `json:"method"`
	ProviderID    string          `json:"provider_id"`
	Channel       string          `json:"channel,omitempty"` // 兼容老订单
	Amount        float64         `json:"amount"`
	Status        string          `json:"status"`
	Subject       string          `json:"subject"`
	PaymentURL    string          `json:"payment_url,omitempty"`
	QRCodeContent string          `json:"qr_code_content,omitempty"`
	NotifyPayload json.RawMessage `json:"notify_payload,omitempty"`
	PaidAt        *time.Time      `json:"paid_at,omitempty"`
	ExpiresAt     time.Time       `json:"expires_at"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// Service 封装支付订单核心业务：创建/查询订单、处理回调、给用户加余额。
//
// 关键设计：所有"加余额"路径都收敛在 markPaid，并在同一个 SQL 事务里完成
// "锁订单 → 锁用户 → 更新余额 → 写流水 → 改订单状态"，保证：
//   - 重复回调不会重复加余额（先检查 status='paid' 再处理）
//   - 余额变更与订单状态严格一致
//   - balance_logs 审计齐全
//
// 与旧版的差异：
//   - 不再持有 channels map，改为持有 *provider.Registry
//   - CreateOrder 通过 registry.Pick(method) 选 Provider
//   - HandleCallback 通过 registry.Find(providerID) 拿 Provider
type Service struct {
	logger      *slog.Logger
	db          *sql.DB
	registry    *provider.Registry
	minAmount   float64
	maxAmount   float64
	dailyLimit  float64
	expireAfter time.Duration
	callbackURL string
	mu          sync.Mutex // 串行化 markPaid 减少同订单并发回调争用
}

// NewService 构造 Service
func NewService(logger *slog.Logger, db *sql.DB, registry *provider.Registry, opts ServiceOptions) *Service {
	return &Service{
		logger:      logger,
		db:          db,
		registry:    registry,
		minAmount:   opts.MinAmount,
		maxAmount:   opts.MaxAmount,
		dailyLimit:  opts.DailyLimit,
		expireAfter: opts.ExpireAfter,
		callbackURL: opts.CallbackBaseURL,
	}
}

// ServiceOptions 业务参数
type ServiceOptions struct {
	MinAmount       float64
	MaxAmount       float64
	DailyLimit      float64
	ExpireAfter     time.Duration
	CallbackBaseURL string
}

// CreateOrderInput service 层下单入参
//
// 用户选的是 Method（支付方式），不再是 Channel（具体哪家服务商）。
// service 层通过 Router 决定实际走哪个 Provider。
type CreateOrderInput struct {
	UserID   int64
	Method   string
	Amount   float64
	Subject  string
	ClientIP string
}

// CreateOrder 创建订单：金额校验 → 日累校验 → Router 选 Provider → 调下单 → 落库
func (s *Service) CreateOrder(ctx context.Context, in CreateOrderInput) (*Order, error) {
	if in.UserID <= 0 {
		return nil, errors.New("缺少用户身份")
	}
	if in.Amount < s.minAmount {
		return nil, fmt.Errorf("金额低于最低限额 %.2f", s.minAmount)
	}
	if in.Amount > s.maxAmount {
		return nil, fmt.Errorf("金额超过最高限额 %.2f", s.maxAmount)
	}

	// 日累计校验：统计当天 paid 金额
	if s.dailyLimit > 0 {
		var paidToday float64
		err := s.db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(amount), 0) FROM payment_orders
			WHERE user_id = $1 AND status = 'paid'
			  AND created_at >= date_trunc('day', NOW())
		`, in.UserID).Scan(&paidToday)
		if err != nil {
			return nil, fmt.Errorf("查询日累失败: %w", err)
		}
		if paidToday+in.Amount > s.dailyLimit {
			return nil, fmt.Errorf("超过单日充值上限 %.2f（今日已 %.2f）", s.dailyLimit, paidToday)
		}
	}

	// 通过 Registry 选一个能服务此 method 的 Provider
	prov, err := s.registry.Pick(in.Method)
	if err != nil {
		return nil, fmt.Errorf("没有可用的支付服务商: %w", err)
	}

	now := time.Now()
	outTradeNo := generateOutTradeNo()
	expiresAt := now.Add(s.expireAfter)

	s.logger.Debug("provider_request_start",
		"provider", prov.ID(),
		"kind", prov.Kind(),
		"out_trade_no", outTradeNo,
		"method", in.Method,
		"amount", in.Amount,
	)
	chRes, err := prov.CreateOrder(ctx, provider.CreateOrderInput{
		OutTradeNo:    outTradeNo,
		Amount:        in.Amount,
		Subject:       in.Subject,
		Method:        in.Method,
		NotifyURL:     s.callbackURL + "/api/v1/payment-callback/" + PluginID + "/notify/" + prov.ID(),
		ReturnURL:     s.callbackURL + "/plugins/" + PluginID + "/orders",
		ClientIP:      in.ClientIP,
		ExpireSeconds: int(s.expireAfter.Seconds()),
	})
	if err != nil {
		s.logger.Error("upstream_request_failed",
			"provider", prov.ID(),
			"kind", prov.Kind(),
			"out_trade_no", outTradeNo,
			"method", in.Method,
			sdk.LogFieldError, err,
		)
		return nil, fmt.Errorf("渠道下单失败: %w", err)
	}
	s.logger.Debug("upstream_request_completed",
		"provider", prov.ID(),
		"kind", prov.Kind(),
		"out_trade_no", outTradeNo,
		"method", in.Method,
	)

	// 落库（channel 列保留写入 provider_id 以兼容老数据消费方）
	var id int64
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO payment_orders
			(out_trade_no, user_id, channel, method, provider_id, amount, subject, client_ip,
			 payment_url, qr_code_url, expires_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
		RETURNING id
	`, outTradeNo, in.UserID, prov.ID(), in.Method, prov.ID(), in.Amount, in.Subject, in.ClientIP,
		chRes.PaymentURL, chRes.QRCodeContent, expiresAt, now,
	).Scan(&id)
	if err != nil {
		s.logger.Error("payment_record_persist_failed",
			"out_trade_no", outTradeNo,
			sdk.LogFieldUserID, in.UserID,
			"provider", prov.ID(),
			sdk.LogFieldError, err,
		)
		return nil, fmt.Errorf("订单落库失败: %w", err)
	}

	s.logger.Info("payment_order_created",
		"order_id", id,
		"out_trade_no", outTradeNo,
		"amount", in.Amount,
		"provider", prov.ID(),
		"method", in.Method,
		sdk.LogFieldUserID, in.UserID,
	)

	return &Order{
		ID:            id,
		OutTradeNo:    outTradeNo,
		UserID:        in.UserID,
		Method:        in.Method,
		ProviderID:    prov.ID(),
		Channel:       prov.ID(),
		Amount:        in.Amount,
		Status:        "pending",
		Subject:       in.Subject,
		PaymentURL:    chRes.PaymentURL,
		QRCodeContent: chRes.QRCodeContent,
		ExpiresAt:     expiresAt,
		CreatedAt:     now,
		UpdatedAt:     now,
	}, nil
}

// HandleCallback 处理异步回调：按 provider id 找 Provider → 验签 → 落账
//
// providerID 来自路由 path（/notify/{provider_id}），由 routes.go 解出来传过来。
// 验签通过且状态是 paid 才真正执行 markPaid。
func (s *Service) HandleCallback(ctx context.Context, providerID string, req provider.CallbackRequest) (*provider.CallbackResult, error) {
	prov := s.registry.Find(providerID)
	if prov == nil {
		s.logger.Warn("payment_callback_unknown_provider", "provider", providerID)
		return nil, fmt.Errorf("未知的支付服务商: %s", providerID)
	}
	res, err := prov.VerifyCallback(ctx, req)
	if err != nil {
		// 仅记录订单号（form 里的 out_trade_no），不打印签名串/完整 body
		var outTradeNo string
		if req.Form != nil {
			outTradeNo = req.Form.Get("out_trade_no")
			if outTradeNo == "" {
				outTradeNo = req.Form.Get("trade_order_id")
			}
		}
		s.logger.Warn("payment_callback_signature_invalid",
			"provider", providerID,
			"out_trade_no", outTradeNo,
			sdk.LogFieldError, err,
		)
		return nil, err
	}
	s.logger.Debug("payment_callback_signature_verified",
		"provider", providerID,
		"out_trade_no", res.OutTradeNo,
		"status", res.Status,
	)
	if res.Status == "paid" {
		if err := s.markPaid(ctx, res); err != nil {
			s.logger.Error("payment_record_persist_failed",
				"out_trade_no", res.OutTradeNo,
				"provider", providerID,
				sdk.LogFieldError, err,
			)
			return nil, err
		}
	}
	return res, nil
}

// markPaid 在事务里完成"订单 paid + 用户加余额 + 写流水"。
//
// 幂等保证：先 SELECT ... FOR UPDATE 锁住订单行，看到 status='paid' 直接返回。
// 金额校验：用回调金额与订单金额比对，防止假回调。
func (s *Service) markPaid(ctx context.Context, cb *provider.CallbackResult) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("开启事务失败: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// 1) 锁订单
	var (
		orderID    int64
		userID     int64
		amount     float64
		status     string
		method     string
		providerID string
	)
	err = tx.QueryRowContext(ctx, `
		SELECT id, user_id, amount, status, method, provider_id FROM payment_orders
		WHERE out_trade_no = $1
		FOR UPDATE
	`, cb.OutTradeNo).Scan(&orderID, &userID, &amount, &status, &method, &providerID)
	if err != nil {
		return fmt.Errorf("锁订单失败: %w", err)
	}
	if status == "paid" {
		s.logger.Info("payment_callback_idempotent_hit",
			"out_trade_no", cb.OutTradeNo,
			"order_id", orderID,
			sdk.LogFieldUserID, userID,
		)
		return nil
	}
	if status != "pending" {
		return fmt.Errorf("订单状态不允许标记为 paid: %s", status)
	}

	// 2) 金额校验（允许 1 分钱误差）
	if cb.Amount > 0 && absDiff(cb.Amount, amount) > 0.01 {
		return fmt.Errorf("回调金额 %.2f 与订单金额 %.2f 不匹配", cb.Amount, amount)
	}

	// 3) 锁用户 + 加余额
	var beforeBalance float64
	err = tx.QueryRowContext(ctx, `SELECT balance FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&beforeBalance)
	if err != nil {
		return fmt.Errorf("锁用户失败: %w", err)
	}
	afterBalance := beforeBalance + amount
	if _, err := tx.ExecContext(ctx, `UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2`, afterBalance, userID); err != nil {
		s.logger.Error("payment_balance_update_failed",
			sdk.LogFieldUserID, userID,
			"amount", amount,
			"out_trade_no", cb.OutTradeNo,
			sdk.LogFieldError, err,
		)
		return fmt.Errorf("更新余额失败: %w", err)
	}

	// 4) 写 balance_logs
	methodLabel := map[string]string{
		"wxpay": "微信支付", "alipay": "支付宝", "qqpay": "QQ钱包", "bank": "银行卡",
	}[method]
	if methodLabel == "" {
		methodLabel = method
	}
	remark := fmt.Sprintf("在线充值（%s）", methodLabel)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO balance_logs
			(action, amount, before_balance, after_balance, remark, created_at, user_balance_logs)
		VALUES ('add', $1, $2, $3, $4, NOW(), $5)
	`, amount, beforeBalance, afterBalance, remark, userID); err != nil {
		return fmt.Errorf("写 balance_logs 失败: %w", err)
	}

	// 5) 改订单状态
	payload, _ := json.Marshal(cb.Raw)
	if _, err := tx.ExecContext(ctx, `
		UPDATE payment_orders
		SET status = 'paid', paid_at = NOW(), notify_payload = $1, updated_at = NOW()
		WHERE id = $2
	`, payload, orderID); err != nil {
		return fmt.Errorf("更新订单状态失败: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}
	s.logger.Info("payment_marked_paid",
		"out_trade_no", cb.OutTradeNo,
		"order_id", orderID,
		sdk.LogFieldUserID, userID,
		"amount", amount,
		"method", method,
		"provider", providerID,
		"before_balance", beforeBalance,
		"after_balance", afterBalance,
	)
	return nil
}

// orderColumns SELECT 列清单（用于 ListUserOrders / GetOrder 共享）
const orderColumns = `
	id, out_trade_no, user_id, method, provider_id, channel, amount, status, subject,
	payment_url, qr_code_url, notify_payload, paid_at, expires_at, created_at, updated_at
`

// GetOrder 用户级查询单个订单（带 user 归属校验）
func (s *Service) GetOrder(ctx context.Context, userID int64, outTradeNo string) (*Order, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+orderColumns+` FROM payment_orders WHERE out_trade_no = $1`, outTradeNo)
	o, err := scanOrder(row)
	if err != nil {
		return nil, err
	}
	if userID != 0 && o.UserID != userID {
		return nil, errors.New("订单不属于当前用户")
	}
	return o, nil
}

// ListUserOrders 列出某用户的订单
func (s *Service) ListUserOrders(ctx context.Context, userID int64, limit int) ([]*Order, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT `+orderColumns+`
		FROM payment_orders
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	out := make([]*Order, 0, limit)
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

// AdminListParams admin 订单列表查询参数
type AdminListParams struct {
	Email    string // 按用户邮箱子串过滤（大小写不敏感）
	Status   string // 按订单状态过滤；空字符串或 "all" 表示不过滤
	Page     int    // 第几页（从 1 开始）
	PageSize int    // 每页条数
}

// AdminOrdersResult admin 订单列表返回
type AdminOrdersResult struct {
	List  []*Order   `json:"list"`
	Total int64      `json:"total"`
	Stats OrderStats `json:"stats"`
}

// OrderStats admin 订单总览的统计指标
//
// 注意：stats 是按 email filter 范围内统计（不受 status filter 影响），
// 这样切换 status 筛选时统计数字保持稳定，便于运营理解全局态势。
type OrderStats struct {
	Total           int64   `json:"total"`
	Paid            int64   `json:"paid"`
	Pending         int64   `json:"pending"`
	Expired         int64   `json:"expired"`
	Failed          int64   `json:"failed"`
	Cancelled       int64   `json:"cancelled"`
	Refunded        int64   `json:"refunded"`
	TotalAmountPaid float64 `json:"total_amount_paid"`
	TodayAmountPaid float64 `json:"today_amount_paid"`
}

// ListAllOrders 管理员列出全量订单（带分页 + 过滤 + 统计）。
//
// 流程：
//  1. 用 email filter 算 stats（一次扫描，不受 status filter 影响）
//  2. 用 email + status filter 算 total（用于分页器）
//  3. 用 email + status filter + LIMIT/OFFSET 拉本页 list
//
// 三个查询都以 LEFT JOIN users 为基础，让每条订单顺带带上 email。
func (s *Service) ListAllOrders(ctx context.Context, params AdminListParams) (*AdminOrdersResult, error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PageSize <= 0 || params.PageSize > 200 {
		params.PageSize = 20
	}

	var emailParam any
	if strings.TrimSpace(params.Email) != "" {
		emailParam = "%" + strings.TrimSpace(params.Email) + "%"
	}
	var statusParam any
	if params.Status != "" && params.Status != "all" {
		statusParam = params.Status
	}

	stats, err := s.computeOrderStats(ctx, emailParam)
	if err != nil {
		return nil, fmt.Errorf("统计订单失败: %w", err)
	}

	// total
	var total int64
	err = s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM payment_orders po
		LEFT JOIN users u ON u.id = po.user_id
		WHERE ($1::text IS NULL OR u.email ILIKE $1)
		  AND ($2::text IS NULL OR po.status = $2)
	`, emailParam, statusParam).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("查询订单总数失败: %w", err)
	}

	// list
	offset := (params.Page - 1) * params.PageSize
	rows, err := s.db.QueryContext(ctx, `
		SELECT po.id, po.out_trade_no, po.user_id, COALESCE(u.email, ''),
		       po.method, po.provider_id, po.channel, po.amount, po.status, po.subject,
		       po.payment_url, po.qr_code_url, po.notify_payload,
		       po.paid_at, po.expires_at, po.created_at, po.updated_at
		FROM payment_orders po
		LEFT JOIN users u ON u.id = po.user_id
		WHERE ($1::text IS NULL OR u.email ILIKE $1)
		  AND ($2::text IS NULL OR po.status = $2)
		ORDER BY po.created_at DESC
		LIMIT $3 OFFSET $4
	`, emailParam, statusParam, params.PageSize, offset)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	list := make([]*Order, 0, params.PageSize)
	for rows.Next() {
		o, err := scanOrderWithEmail(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &AdminOrdersResult{
		List:  list,
		Total: total,
		Stats: stats,
	}, nil
}

// computeOrderStats 在 email filter 范围内算各状态订单数 + 累计/今日收款金额。
// 用一条 SQL 完成，避免多次往返。
func (s *Service) computeOrderStats(ctx context.Context, emailParam any) (OrderStats, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE TRUE)                                                                                       AS total,
			COUNT(*) FILTER (WHERE po.status = 'paid')                                                                         AS paid,
			COUNT(*) FILTER (WHERE po.status = 'pending')                                                                      AS pending,
			COUNT(*) FILTER (WHERE po.status = 'expired')                                                                      AS expired,
			COUNT(*) FILTER (WHERE po.status = 'failed')                                                                       AS failed,
			COUNT(*) FILTER (WHERE po.status = 'cancelled')                                                                    AS cancelled,
			COUNT(*) FILTER (WHERE po.status = 'refunded')                                                                     AS refunded,
			COALESCE(SUM(po.amount) FILTER (WHERE po.status = 'paid'), 0)                                                      AS total_amount_paid,
			COALESCE(SUM(po.amount) FILTER (WHERE po.status = 'paid' AND po.paid_at >= date_trunc('day', NOW())), 0)            AS today_amount_paid
		FROM payment_orders po
		LEFT JOIN users u ON u.id = po.user_id
		WHERE ($1::text IS NULL OR u.email ILIKE $1)
	`, emailParam)
	var s2 OrderStats
	if err := row.Scan(
		&s2.Total, &s2.Paid, &s2.Pending, &s2.Expired,
		&s2.Failed, &s2.Cancelled, &s2.Refunded,
		&s2.TotalAmountPaid, &s2.TodayAmountPaid,
	); err != nil {
		return OrderStats{}, err
	}
	return s2, nil
}

// AvailableMethods 返回当前可用的支付方式（前端用于渲染按钮）
func (s *Service) AvailableMethods() []provider.MethodInfo {
	return s.registry.AvailableMethods()
}

// ExpirePendingOrders 把过期未支付的 pending 订单标记为 expired。
// 由 plugin BackgroundTask 定时调用，不依赖任何外部支付平台接口。
func (s *Service) ExpirePendingOrders(ctx context.Context) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE payment_orders
		SET status = 'expired', updated_at = NOW()
		WHERE status = 'pending' AND expires_at < NOW()
	`)
	if err != nil {
		return fmt.Errorf("过期订单清理失败: %w", err)
	}
	if n, _ := res.RowsAffected(); n > 0 {
		s.logger.Info("已清理过期订单", "count", n)
	}
	return nil
}

// ============================================================================
// row scanner 工具
// ============================================================================

type rowScanner interface {
	Scan(dest ...any) error
}

// scanOrder 列顺序对应 const orderColumns
func scanOrder(r rowScanner) (*Order, error) {
	var (
		o          Order
		paidAt     sql.NullTime
		notifyPL   sql.NullString
		paymentURL sql.NullString
		qrCodeURL  sql.NullString
		subject    sql.NullString
		channel    sql.NullString
	)
	err := r.Scan(
		&o.ID, &o.OutTradeNo, &o.UserID, &o.Method, &o.ProviderID, &channel,
		&o.Amount, &o.Status, &subject,
		&paymentURL, &qrCodeURL, &notifyPL,
		&paidAt, &o.ExpiresAt, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	o.Channel = channel.String
	o.Subject = subject.String
	o.PaymentURL = paymentURL.String
	o.QRCodeContent = qrCodeURL.String
	if paidAt.Valid {
		t := paidAt.Time
		o.PaidAt = &t
	}
	if notifyPL.Valid && notifyPL.String != "" {
		o.NotifyPayload = json.RawMessage(notifyPL.String)
	}
	return &o, nil
}

// scanOrderWithEmail 列顺序与 ListAllOrders SELECT 一致
func scanOrderWithEmail(r rowScanner) (*Order, error) {
	var (
		o          Order
		paidAt     sql.NullTime
		notifyPL   sql.NullString
		paymentURL sql.NullString
		qrCodeURL  sql.NullString
		subject    sql.NullString
		channel    sql.NullString
	)
	err := r.Scan(
		&o.ID, &o.OutTradeNo, &o.UserID, &o.UserEmail,
		&o.Method, &o.ProviderID, &channel, &o.Amount, &o.Status, &subject,
		&paymentURL, &qrCodeURL, &notifyPL,
		&paidAt, &o.ExpiresAt, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	o.Channel = channel.String
	o.Subject = subject.String
	o.PaymentURL = paymentURL.String
	o.QRCodeContent = qrCodeURL.String
	if paidAt.Valid {
		t := paidAt.Time
		o.PaidAt = &t
	}
	if notifyPL.Valid && notifyPL.String != "" {
		o.NotifyPayload = json.RawMessage(notifyPL.String)
	}
	return &o, nil
}

// generateOutTradeNo 生成全局唯一商户订单号：时间戳 + 8 位随机十六进制
func generateOutTradeNo() string {
	var b [4]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("AG%s%s", time.Now().Format("20060102150405"), strings.ToLower(hex.EncodeToString(b[:])))
}

func absDiff(a, b float64) float64 {
	if a > b {
		return a - b
	}
	return b - a
}
