package payment

import (
	sdk "github.com/DevilGenius/airgate-sdk/sdkgo"
)

const (
	// PluginID 插件唯一标识，与 core marketplace 注册项一致
	PluginID = "payment-epay"
	// PluginName 显示名称
	PluginName = "支付插件"
)

// PluginVersion 插件版本号。
//
// 这里是 var 而不是 const，是为了让 release CI 通过 ldflags 把 git tag 注入进来：
//
//	go build -ldflags "-X 'github.com/DevilGenius/airgate-epay/backend/internal/payment.PluginVersion=0.1.0'"
//
// 默认值仅用于本地开发；正式发版的版本号永远来自 git tag（去掉 v 前缀）。
var PluginVersion = "0.1.0"

// BuildPluginInfo 构造插件元信息（PluginInfo）。
//
// FrontendPages 三个独立页面，按 audience 分发：
//   - /recharge / /orders   普通用户使用 (audience=user)
//   - /admin/orders         管理员订单总览 (audience=admin)
//   - /admin/providers      管理员配置支付服务商 (audience=admin)
//
// ConfigSchema 仅保留通用业务参数 + 回调 BaseURL：
//   - 各个支付服务商（虎皮椒/彩虹/支付宝/微信）的凭证不再走 ConfigSchema，
//     改为存在插件自有的 payment_provider_configs 表里，由 admin 页面 CRUD。
//   - 这样配置 modal 不会被几十个字段撑爆，而且支持"同一种 Provider 配多实例"。
func BuildPluginInfo() sdk.PluginInfo {
	return sdk.PluginInfo{
		ID:          PluginID,
		Name:        PluginName,
		Version:     PluginVersion,
		SDKVersion:  sdk.SDKVersion,
		Description: "多渠道支付插件：易支付（虎皮椒/彩虹）/ 支付宝官方 / 微信支付官方",
		Author:      "AirGate",
		Type:        sdk.PluginTypeExtension,
		// epay 不调用 HostService（payment 业务自己闭环），声明空 capabilities 让 core
		// 进入 0.3.0 capability 模型而非 sdk_version 兼容路径。
		// 注：当前仍读 db_dsn 写 public.payment_*；ADR-0001 Decision 5 的 schema 隔离
		// 留给"未来 cleanup"——本次只完成 capability 声明这一层。
		Capabilities: []sdk.Capability{},

		FrontendPages: []sdk.FrontendPage{
			{
				Path:        "/recharge",
				Title:       "plugin_pages.payment_epay.recharge",
				Icon:        "wallet",
				Description: "账户余额充值",
				Audience:    "user",
			},
			{
				Path:        "/orders",
				Title:       "plugin_pages.payment_epay.orders",
				Icon:        "history",
				Description: "我的充值订单",
				Audience:    "user",
			},
			{
				Path:        "/admin/orders",
				Title:       "plugin_pages.payment_epay.admin_orders",
				Icon:        "receipt",
				Description: "全量订单监控",
				Audience:    "admin",
			},
			{
				Path:        "/admin/providers",
				Title:       "plugin_pages.payment_epay.providers",
				Icon:        "settings",
				Description: "管理虎皮椒/彩虹/支付宝官方/微信官方等服务商",
				Audience:    "admin",
			},
		},

		ConfigSchema: []sdk.ConfigField{
			// 注意：db_dsn 由 core 自动注入（取自 core 的 database 配置），插件无需声明也无需管理员填写。
			{
				Key:         "callback_base_url",
				Label:       "回调 BaseURL",
				Type:        "string",
				Required:    true,
				Description: "外网可达的 core URL，支付平台异步通知的根地址，如 https://airgate.example.com",
				Placeholder: "https://airgate.example.com",
			},
			{Key: "min_amount", Label: "单笔最小金额", Type: "float", Default: "1", Description: "低于此金额的订单将被拒绝"},
			{Key: "max_amount", Label: "单笔最大金额", Type: "float", Default: "10000", Description: "高于此金额的订单将被拒绝"},
			{Key: "daily_limit", Label: "用户单日上限", Type: "float", Default: "10000", Description: "同一用户单日累计充值上限（按已支付金额统计）"},
			{Key: "order_expire_minutes", Label: "订单过期时间(分钟)", Type: "int", Default: "30", Description: "订单创建后多少分钟内未支付自动过期"},
		},
	}
}
