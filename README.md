<div align="center">
  <h1>AirGate ePay</h1>

  <p><strong>多渠道支付与余额充值插件</strong></p>

  <p>
    <a href="https://github.com/DevilGenius/airgate-epay/releases"><img src="https://img.shields.io/github/v/release/DevilGenius/airgate-epay?style=flat-square" alt="release" /></a>
    <a href="https://github.com/DevilGenius/airgate-epay/blob/master/LICENSE"><img src="https://img.shields.io/github/license/DevilGenius/airgate-epay?style=flat-square" alt="license" /></a>
    <a href="https://github.com/DevilGenius/airgate-epay/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/DevilGenius/airgate-epay/ci.yml?branch=master&style=flat-square&label=CI" alt="ci" /></a>
    <img src="https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go" alt="go" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="react" />
  </p>
</div>

---

AirGate ePay 是 [airgate-core](https://github.com/DevilGenius/airgate-core) 的支付扩展插件。它在一个 gRPC 子进程里同时承载**虎皮椒、彩虹易支付、支付宝官方、微信支付官方**四类支付服务商，把"用户充值 → 跳转支付 → 异步通知 → 加余额"的全流程封装成一个可热装载的插件。

它解决一个具体问题：**网关想给用户开放余额充值，又不想把支付逻辑硬塞进 core**。ePay 把订单表、回调入口、加余额事务、对账任务全部装进自己的进程，core 只感知到一个标准插件。

## ✨ 核心特性

- **🏪 多服务商架构** — 同一种支付方式（如支付宝）可以同时挂多个服务商实例（虎皮椒 + 支付宝官方），管理员后台 CRUD 而非写死在配置里
- **🎯 PayMethod ↔ Provider 解耦** — 用户面前看到的是「支付宝/微信/QQ 钱包」按钮，背后由 `Registry.Pick(method, amount)` 选 Provider，便于按金额分流或灰度切换
- **💰 严格的加余额事务** — `markPaid` 在单个 SQL 事务里完成「锁订单 → 校验金额 → 锁用户 → 加余额 → 写流水 → 改订单状态」，重复回调天然幂等
- **🔁 自动对账与过期** — 后台任务定时扫 pending 订单，过期自动失效；status 流转受单一函数收敛
- **🔐 三入口隔离** — 用户级 / 管理员级 / 异步回调用三套独立的 `X-Airgate-Entry` 头校验，越权拒绝
- **🧩 嵌入式管理后台** — 管理员可在 `/admin/providers` 直接增删 Provider 实例、勾选启用的支付方式、热更新 Registry，无需重启插件

## 🏪 内置 Provider

| Kind | 名称 | 协议 | 支持方式 | 资质要求 |
|---|---|---|---|---|
| `epay_xunhu` | 虎皮椒 V3 | POST `do.html`，AppID + AppSecret 签名 | 支付宝 / 微信 | 个人可申请 |
| `epay_caihong` | 彩虹易支付（标准） | GET `submit.php` 跳转，PID + Key | 支付宝 / 微信 | 个人可申请 |
| `alipay_official` | 支付宝官方 | 支付宝开放平台，RSA 公私钥 | 支付宝 | 企业资质 |
| `wxpay_official` | 微信支付官方 V3 | 微信商户平台 APIv3，Native 扫码 | 微信 | 企业资质 |

新增一种 Provider 只需要实现 `provider.Provider` 接口并 `RegisterKindMeta` 注册元信息，admin 页面会自动渲染对应的字段表单。

## 🧩 接入位置

```text
                  ┌──────────────────────────────────────┐
                  │           AirGate Core               │
                  │   (用户、余额、管理后台、计费)         │
                  └────────────┬─────────────────────────┘
                               │ go-plugin (gRPC)
                               ▼
                  ┌──────────────────────────────────────┐
                  │       airgate-epay (本仓库)          │
                  │                                      │
                  │   provider.Registry (热重载)         │
                  │     ├── epay_xunhu_main              │
                  │     ├── epay_caihong_2               │
                  │     ├── alipay_official_corp         │
                  │     └── wxpay_official_corp          │
                  │                ▲                     │
                  │                │                     │
                  │   Service.CreateOrder ──► 跳转上游    │
                  │   Service.HandleCallback ◄── 异步通知 │
                  │                │                     │
                  │                ▼                     │
                  │   markPaid 事务 ──► users.balance    │
                  │                 └─► balance_logs     │
                  └──────────────────────────────────────┘
```

ePay 复用 core 的 PostgreSQL 实例：插件自有 `payment_orders` / `payment_refunds` / `payment_provider_configs` 表，与 core 的 `users` / `balance_logs` 表共用一个连接。`db_dsn` 由 core 自动注入，管理员不需要手填。

## 🚦 路由

插件路径已被 core 的 `ExtensionProxy` 剥掉前缀，下表展示**外部访问路径**。

### 用户入口（`/api/v1/ext-user/payment-epay/*`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/user/orders`                   | 创建订单 |
| GET  | `/user/orders`                   | 列出我的订单 |
| GET  | `/user/orders/{out_trade_no}`    | 查询单个订单 |
| GET  | `/user/methods`                  | 列出当前可用的支付方式（前端渲染按钮） |

### 管理员入口（`/api/v1/ext/payment-epay/*`，需要 admin 角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/admin/orders`                  | 全量订单列表（带 email / status 过滤、分页） |
| GET  | `/admin/providers`               | 列出已注册 Provider 实例 + 所有 KindMeta |
| POST | `/admin/providers`               | 新增 / 编辑 Provider 实例（支持改 ID 时同步迁移订单引用） |
| DELETE | `/admin/providers/{id}`        | 删除 Provider 实例 |
| POST | `/admin/providers/reload`        | 手动重新加载 Registry |

### 异步回调入口（`/api/v1/payment-callback/payment-epay/*`，无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST/GET | `/notify/{provider_id}`      | 各支付平台的异步通知，按 provider id 路由到对应实现 |

入口由 core 的 `ExtensionProxy` 通过 `X-Airgate-Entry` 头注入（`user` / `admin` / `callback`），插件用中间件强校验，避免越权。

## 🔧 配置

`db_dsn` 由 core 自动注入。各 Provider 的凭证（AppID、Key、私钥等）**不再走 ConfigSchema**，统一存在 `payment_provider_configs` 表，由 `/admin/providers` 页面 CRUD —— 这样配置 modal 不会被几十个字段撑爆，也支持「同一种 Provider 配多实例」。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `callback_base_url`     | string | —     | **必填**。外网可达的 core 根 URL，作为支付平台异步通知地址前缀，如 `https://airgate.example.com` |
| `min_amount`            | float  | 1     | 单笔最小金额，低于此值的订单将被拒绝 |
| `max_amount`            | float  | 10000 | 单笔最大金额，高于此值的订单将被拒绝 |
| `daily_limit`           | float  | 10000 | 同一用户单日累计充值上限（按已支付金额统计） |
| `order_expire_minutes`  | int    | 30    | 订单创建后未支付的过期分钟数 |

## 💰 加余额事务

所有"加余额"路径都收敛在 `service.go::markPaid`，在单个 SQL 事务里完成：

1. `SELECT … FOR UPDATE` 锁住订单行；如果已 `paid` 直接 return（**幂等**）
2. 校验回调金额与订单金额一致（防伪回调）
3. `SELECT balance FROM users FOR UPDATE` 锁住用户行
4. `UPDATE users SET balance = balance + amount`
5. `INSERT balance_logs` 一条 `action=add` 流水，`remark = recharge:{provider_id}:{out_trade_no}`
6. `UPDATE payment_orders SET status='paid', paid_at, notify_payload`

任意一步失败整体回滚。重复回调、并发回调、伪造回调都被这套流程兜住。

## 📁 目录结构

```text
airgate-epay/
├── backend/                              # Go 后端（插件主体）
│   ├── main.go                           # gRPC 插件入口
│   ├── cmd/genmanifest/                  # plugin.yaml 生成器
│   └── internal/payment/
│       ├── metadata.go                   # PluginInfo + ConfigSchema + FrontendPages（运行时单源）
│       ├── plugin.go                     # ExtensionPlugin 实现：生命周期 + 后台任务
│       ├── routes.go                     # 用户/管理员/回调三入口路由 + 中间件
│       ├── service.go                    # 订单业务 + markPaid 加余额事务
│       ├── db.go                         # 自有表 schema + 迁移
│       ├── assets.go                     # WebAssetsProvider，embed webdist
│       ├── webdist/                      # build 时由 web/dist 同步过来（go:embed）
│       └── provider/
│           ├── provider.go               # Provider / Registry / KindMeta 接口
│           ├── factory.go                # KindMeta 注册中心
│           ├── registry.go               # 实例热重载 + Pick(method, amount)
│           ├── store.go                  # payment_provider_configs CRUD + Rename 事务
│           ├── method.go                 # PayMethod 常量与元信息
│           ├── epay_xunhu.go             # 虎皮椒 V3 实现
│           ├── epay_caihong.go           # 彩虹易支付实现
│           ├── alipay_official.go        # 支付宝官方实现
│           └── wxpay_official.go         # 微信支付官方 V3 实现
├── web/                                  # 前端
│   └── src/
│       ├── index.tsx                     # PluginFrontendModule，注册 4 个页面
│       ├── RechargePage.tsx              # /recharge 充值（用户级）
│       ├── OrdersPage.tsx                # /orders 充值记录（用户级）
│       ├── AdminOrdersPage.tsx           # /admin/orders 订单总览
│       └── AdminProvidersPage.tsx        # /admin/providers Provider CRUD
├── .github/workflows/
│   ├── ci.yml                            # push/PR 触发，复用 make ci
│   └── release.yml                       # v* tag 触发，矩阵构建 4 平台二进制
├── plugin.yaml                           # genmanifest 自动生成
└── Makefile
```

## 🚀 构建与开发

### 安装到 core

打开 core 管理后台 → **插件管理** → 三种方式任选：

```text
1. 插件市场 → 点击「安装」    （从 GitHub Release 自动拉取，匹配当前架构）
2. 上传安装 → 拖入二进制文件   （适合内部环境）
3. GitHub 安装 → 输入 DevilGenius/airgate-epay
```

### 本地开发

需要 Go 1.25+、Node 22+、本地 PostgreSQL，以及兄弟目录 [`airgate-sdk`](https://github.com/DevilGenius/airgate-sdk) 与 [`airgate-core`](https://github.com/DevilGenius/airgate-core)：

```bash
make install        # 装 web 依赖与 Go 模块
make build          # 完整构建：web/dist → backend/webdist → bin/payment-epay
make manifest       # 重新生成 plugin.yaml
make ci             # 与 CI 完全一致的本地检查（type-check + vet + test + build）
```

把本插件以 dev 模式挂到 core，热重载不重启 core：

```yaml
# airgate-core/backend/config.yaml
plugins:
  dev:
    - name: payment-epay
      path: /absolute/path/to/airgate-epay/backend
```

然后 `cd airgate-core/backend && go run ./cmd/server`，core 会通过 `go run .` 启动本插件，握手 gRPC，依次调 `Init → Migrate → Start → RegisterRoutes`。

## 📦 发版

`metadata.go` 中的 `PluginVersion` 是 `var`，默认值仅用于本地开发。**正式发版只需要打 git tag，不要手工改版本号字段**：

```bash
git tag v0.2.0
git push origin v0.2.0
```

[release.yml](.github/workflows/release.yml) 工作流会自动：

1. 矩阵构建 4 个平台二进制（linux/darwin × amd64/arm64）
2. 通过 `-ldflags "-X .../payment.PluginVersion=${version}"` 把 git tag（去掉 `v` 前缀）注入到二进制
3. 上传到 GitHub Release，资产命名 `payment-epay-{os}-{arch}`，附带 `.sha256`
4. airgate-core 插件市场会通过 GitHub API 自动同步新版本

git tag = release 版本 = 已安装 tab 显示的版本，**单一来源、永不偏离**。

## 🤝 反馈

- Bug / Feature: [Issues](https://github.com/DevilGenius/airgate-epay/issues)
- 主仓库: [airgate-core](https://github.com/DevilGenius/airgate-core)
- 插件 SDK: [airgate-sdk](https://github.com/DevilGenius/airgate-sdk)

## 📜 License

MIT — 详见 [LICENSE](LICENSE)。
