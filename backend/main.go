// Package main 是 airgate-epay 插件的入口。
//
// airgate-epay 是 airgate-core 的支付插件，单插件内集成多个支付渠道：
//   - 易支付（彩虹易支付等聚合）
//   - 支付宝官方
//   - 微信支付官方
//
// 用户在 core 前端发起充值订单 → 跳转到对应支付平台 → 支付完成后平台异步回调
// → 本插件验签 → 自有订单表标记为 paid → 直连 core 数据库给用户加余额。
package main

import (
	sdkgrpc "github.com/DevilGenius/airgate-sdk/runtimego/grpc"

	"github.com/DouDOU-start/airgate-epay/backend/internal/payment"
)

func main() {
	sdkgrpc.Serve(payment.New())
}
