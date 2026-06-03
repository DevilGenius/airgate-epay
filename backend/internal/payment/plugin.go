package payment

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	sdk "github.com/DevilGenius/airgate-sdk/sdkgo"

	"github.com/DouDOU-start/airgate-epay/backend/internal/payment/provider"
)

// Plugin 是支付插件主体，实现 sdk.ExtensionPlugin。
//
// 与旧版的核心差异：
//   - 不再持有 channels map，改为持有 *provider.Registry + *provider.Store
//   - Init 不读取渠道凭证（虎皮椒/支付宝等），而是读 store 表里的 ConfigRecord 列表，
//     用 provider.Build 构造 Provider 实例集合塞进 Registry
//   - admin 通过插件自有的 /admin/providers/* API 增删改 Store 里的记录，
//     然后调用 Plugin.ReloadProviders() 让 Registry 重新加载
//
// 软失败原则保留：db 连不上时不阻塞插件加载，让管理员能在 UI 看到插件并修配置。
type Plugin struct {
	logger     *slog.Logger
	ctx        sdk.PluginContext
	db         *sql.DB
	store      *provider.Store
	registry   *provider.Registry
	svc        *Service
	initParams initParams
}

// initParams 缓存 Init 时拿到的业务参数，ReloadProviders 时复用
type initParams struct {
	expireMinutes int
	minAmount     float64
	maxAmount     float64
	dailyLimit    float64
	callbackURL   string
}

// 编译期断言：保证 Plugin 满足 sdk.ExtensionPlugin
var _ sdk.ExtensionPlugin = (*Plugin)(nil)

// New 构造 Plugin 实例
func New() *Plugin {
	return &Plugin{
		registry: provider.NewRegistry(),
	}
}

// Info 返回插件元信息
func (p *Plugin) Info() sdk.PluginInfo {
	return BuildPluginInfo()
}

// Init 由 core 调用，注入运行时上下文。
//
// 这里只做"基础设施级"初始化：DB 连接 + 业务参数。
// 真正的 Provider 实例集合在 Migrate 之后由 ReloadProviders 加载（因为它们存在自有表里）。
func (p *Plugin) Init(ctx sdk.PluginContext) error {
	p.ctx = ctx
	if ctx != nil {
		p.logger = ctx.Logger()
	}
	if p.logger == nil {
		p.logger = slog.Default()
	}

	cfg := ctx.Config()
	if cfg == nil {
		p.logger.Warn("plugin config 为空，插件以未配置态加载；请在后台填写配置后 Reload")
		return nil
	}

	dsn := cfg.GetString("db_dsn")
	if dsn == "" {
		p.logger.Warn("db_dsn 未配置，插件以未配置态加载")
		return nil
	}
	db, err := openDB(dsn)
	if err != nil {
		p.logger.Warn("打开 core 数据库失败，插件以未配置态加载",
			"error", err,
			"hint", "请检查 db_dsn 后在插件管理页 Reload",
		)
		return nil
	}
	p.db = db
	p.store = provider.NewStore(db)

	// 业务参数（带默认值兜底）
	p.initParams = initParams{
		expireMinutes: defaultIfZero(cfg.GetInt("order_expire_minutes"), 30),
		minAmount:     defaultFloat(cfg.GetFloat64("min_amount"), 1),
		maxAmount:     defaultFloat(cfg.GetFloat64("max_amount"), 10000),
		dailyLimit:    cfg.GetFloat64("daily_limit"),
		callbackURL:   cfg.GetString("callback_base_url"),
	}

	p.svc = NewService(p.logger, p.db, p.registry, ServiceOptions{
		MinAmount:       p.initParams.minAmount,
		MaxAmount:       p.initParams.maxAmount,
		DailyLimit:      p.initParams.dailyLimit,
		ExpireAfter:     time.Duration(p.initParams.expireMinutes) * time.Minute,
		CallbackBaseURL: p.initParams.callbackURL,
	})

	p.logger.Info("支付插件基础设施初始化完成",
		"min_amount", p.initParams.minAmount,
		"max_amount", p.initParams.maxAmount,
		"daily_limit", p.initParams.dailyLimit,
		"expire_minutes", p.initParams.expireMinutes,
	)
	return nil
}

// Migrate 创建插件自有表，然后从表里加载 Provider 列表。
// 软失败：db 没连上时跳过，不返回 error。
func (p *Plugin) Migrate() error {
	if p.db == nil {
		p.logger.Warn("Migrate 跳过：db 未初始化")
		return nil
	}
	if err := migrate(p.db); err != nil {
		return err
	}
	p.logger.Info("支付插件自有表迁移完成")

	// Migrate 之后表已存在，立即加载一次 Provider 列表
	if err := p.ReloadProviders(context.Background()); err != nil {
		p.logger.Warn("初次加载 Provider 列表失败", "error", err)
	}
	return nil
}

// ReloadProviders 从 payment_provider_configs 表读所有 ConfigRecord，
// 用 provider.Build 构造 Provider 实例并替换 Registry。
//
// admin 在配置页修改/启停 Provider 后调用此方法立即生效，无需重启插件。
func (p *Plugin) ReloadProviders(ctx context.Context) error {
	if p.store == nil || p.registry == nil {
		return nil
	}

	records, err := p.store.List(ctx)
	if err != nil {
		return err
	}

	providers := make([]provider.Provider, 0, len(records))
	for _, rec := range records {
		prov, err := provider.Build(rec.Kind, rec.ID, rec.Enabled, rec.Config)
		if err != nil {
			p.logger.Warn("构造 Provider 失败",
				"id", rec.ID, "kind", rec.Kind, "error", err)
			continue
		}
		providers = append(providers, prov)
	}
	p.registry.Replace(providers)

	enabled := 0
	for _, p := range providers {
		if p.Enabled() {
			enabled++
		}
	}
	p.logger.Info("Provider 列表已加载",
		"total", len(providers), "enabled", enabled)
	return nil
}

// Start 由 core 调用，目前无需额外初始化
func (p *Plugin) Start(_ context.Context) error {
	if p.logger != nil {
		p.logger.Info("支付插件启动")
	}
	return nil
}

// Stop 由 core 调用，关闭数据库连接
func (p *Plugin) Stop(_ context.Context) error {
	if p.db != nil {
		_ = p.db.Close()
	}
	if p.logger != nil {
		p.logger.Info("支付插件停止")
	}
	return nil
}

// RegisterRoutes 注册 HTTP 路由
func (p *Plugin) RegisterRoutes(r sdk.RouteRegistrar) {
	p.registerRoutes(r)
}

// BackgroundTasks 声明定时任务。
// 仅做过期订单清理，不调用任何外部支付平台接口。
func (p *Plugin) BackgroundTasks() []sdk.BackgroundTask {
	return []sdk.BackgroundTask{
		{
			Name:     "expire_pending_orders",
			Interval: 5 * time.Minute,
			Handler: func(ctx context.Context) error {
				if p.svc == nil {
					return nil
				}
				return p.svc.ExpirePendingOrders(ctx)
			},
		},
	}
}

// Configured 报告插件是否已成功初始化（service 可用）。
// handler 用它判断是否能服务请求。
func (p *Plugin) Configured() bool {
	return p.svc != nil
}

func defaultIfZero(v, fallback int) int {
	if v <= 0 {
		return fallback
	}
	return v
}

func defaultFloat(v, fallback float64) float64 {
	if v <= 0 {
		return fallback
	}
	return v
}
