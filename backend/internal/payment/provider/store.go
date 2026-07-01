package provider

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"
)

// 这个文件管理插件自有的 provider_configs 表 — 所有 Provider 的运行时配置都存在这里。
//
// 为什么不走 core 的 ConfigSchema：
//   - 每个 Provider 的字段差异很大（虎皮椒只要 3 个字段，微信官方要 5 个文件级凭证）
//   - 用 ConfigSchema 一字段一行会让 admin 配置 modal 极长且无分组
//   - 配置 schema 是 SDK proto 强类型的，不适合"按 provider 类型动态分组"
//
// 解决方案：把每个 Provider 实例的配置当成一个 JSONB blob 存在插件自有表里，
// 由插件自己写 admin API + admin 页面去 CRUD，配置结构由 Provider 实现自定义。

// SchemaSQL 建表语句。Plugin.Migrate() 时执行。
const SchemaSQL = `
CREATE TABLE IF NOT EXISTS payment_provider_configs (
	id          VARCHAR(64) PRIMARY KEY,            -- Provider 实例 ID（与 Provider.ID() 一致）
	kind        VARCHAR(64) NOT NULL,               -- 协议家族（KindXxx 常量）
	enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
	config      JSONB       NOT NULL DEFAULT '{}',  -- Provider 自定义的配置字段
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`

// ConfigRecord 数据库里一行配置的领域模型。
//
// Config 字段是 Provider 特定的 key-value 对（虎皮椒用 appid/appsecret/gateway_url，
// 支付宝官方用 app_id/private_key/public_key/is_sandbox）。
// Provider 的 LoadFromConfig 函数知道怎么解析它自家需要的字段。
type ConfigRecord struct {
	ID        string            `json:"id"`
	Kind      string            `json:"kind"`
	Enabled   bool              `json:"enabled"`
	Config    map[string]string `json:"config"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

// Store 封装 provider_configs 表的 CRUD。
type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Migrate 建表
func (s *Store) Migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, SchemaSQL)
	if err != nil {
		return fmt.Errorf("创建 payment_provider_configs 表失败: %w", err)
	}
	return nil
}

// List 列出所有 Provider 配置（按 id 排序，行为确定）
func (s *Store) List(ctx context.Context) ([]ConfigRecord, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, kind, enabled, config, created_at, updated_at
		FROM payment_provider_configs
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("查询 provider 配置失败: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var out []ConfigRecord
	for rows.Next() {
		var (
			r          ConfigRecord
			configJSON []byte
		)
		if err := rows.Scan(&r.ID, &r.Kind, &r.Enabled, &configJSON, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		if len(configJSON) > 0 {
			if err := json.Unmarshal(configJSON, &r.Config); err != nil {
				return nil, fmt.Errorf("解析 provider %s 配置失败: %w", r.ID, err)
			}
		}
		if r.Config == nil {
			r.Config = make(map[string]string)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// Get 按 ID 拿单个 Provider 的配置；不存在时返回 (nil, nil)
func (s *Store) Get(ctx context.Context, id string) (*ConfigRecord, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, kind, enabled, config, created_at, updated_at
		FROM payment_provider_configs WHERE id = $1
	`, id)
	var (
		r          ConfigRecord
		configJSON []byte
	)
	err := row.Scan(&r.ID, &r.Kind, &r.Enabled, &configJSON, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if len(configJSON) > 0 {
		if err := json.Unmarshal(configJSON, &r.Config); err != nil {
			return nil, err
		}
	}
	if r.Config == nil {
		r.Config = make(map[string]string)
	}
	return &r, nil
}

// Upsert 创建或更新一个 Provider 配置（按 id 主键冲突更新）。
func (s *Store) Upsert(ctx context.Context, r ConfigRecord) error {
	if r.ID == "" || r.Kind == "" {
		return fmt.Errorf("provider config 缺少 id 或 kind")
	}
	if r.Config == nil {
		r.Config = make(map[string]string)
	}
	configJSON, err := json.Marshal(r.Config)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO payment_provider_configs (id, kind, enabled, config, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET
			kind = EXCLUDED.kind,
			enabled = EXCLUDED.enabled,
			config = EXCLUDED.config,
			updated_at = NOW()
	`, r.ID, r.Kind, r.Enabled, configJSON)
	if err != nil {
		return fmt.Errorf("upsert provider 配置失败: %w", err)
	}
	return nil
}

// NextIDForKind 为某个 kind 生成下一个未占用的实例 ID。
//
// 命名规则：{kind}_{N}，N 从 1 开始递增。例如：
//   epay_xunhu_1, epay_xunhu_2, epay_xunhu_3 ...
//
// 实现策略：扫描所有以 "{kind}_" 开头的现有 id，提取尾部数字取最大值 +1。
// 不依赖 SEQUENCE，避免删除某个实例后再创建出现 id 跳号但找不到漏洞的复杂度。
func (s *Store) NextIDForKind(ctx context.Context, kind string) (string, error) {
	prefix := kind + "_"
	rows, err := s.db.QueryContext(ctx, `
		SELECT id FROM payment_provider_configs WHERE id LIKE $1
	`, prefix+"%")
	if err != nil {
		return "", fmt.Errorf("查询同 kind 实例 id 失败: %w", err)
	}
	defer func() { _ = rows.Close() }()

	maxN := 0
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return "", err
		}
		// 提取 prefix 后的部分，纯数字才计入
		tail := id[len(prefix):]
		n, err := strconv.Atoi(tail)
		if err != nil || n <= 0 {
			continue
		}
		if n > maxN {
			maxN = n
		}
	}
	if err := rows.Err(); err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%d", prefix, maxN+1), nil
}

// Rename 在一个事务里把 Provider 实例 ID 从 oldID 改成 newID。
//
// 同步更新两张表：
//   1. payment_provider_configs.id（PRIMARY KEY）
//   2. payment_orders.provider_id（历史订单的服务商引用）
//
// 任一失败整体回滚。检查：
//   - newID 不能与现有任何记录冲突（除了 oldID 自己 — 大小写差异等情况）
//   - oldID 必须存在
//
// 这样改完之后，老订单查询、回调路由（如果还在等已发出去的支付通知）依然能正确路由到这个 Provider 实例。
func (s *Store) Rename(ctx context.Context, oldID, newID string) error {
	if oldID == newID {
		return nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("开启事务失败: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// 检查 oldID 是否存在
	var existsOld bool
	if err := tx.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM payment_provider_configs WHERE id = $1)`, oldID,
	).Scan(&existsOld); err != nil {
		return fmt.Errorf("检查原 id 失败: %w", err)
	}
	if !existsOld {
		return fmt.Errorf("原实例 id %q 不存在", oldID)
	}

	// 检查 newID 是否冲突
	var existsNew bool
	if err := tx.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM payment_provider_configs WHERE id = $1)`, newID,
	).Scan(&existsNew); err != nil {
		return fmt.Errorf("检查新 id 失败: %w", err)
	}
	if existsNew {
		return fmt.Errorf("新实例 id %q 已被占用", newID)
	}

	// 改 configs 表
	if _, err := tx.ExecContext(ctx,
		`UPDATE payment_provider_configs SET id = $1, updated_at = NOW() WHERE id = $2`,
		newID, oldID,
	); err != nil {
		return fmt.Errorf("更新 provider 配置失败: %w", err)
	}

	// 同步更新历史订单的 provider_id（不改 channel 列，channel 是用于兼容旧版本读取的）
	if _, err := tx.ExecContext(ctx,
		`UPDATE payment_orders SET provider_id = $1, updated_at = NOW() WHERE provider_id = $2`,
		newID, oldID,
	); err != nil {
		return fmt.Errorf("同步更新订单 provider_id 失败: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}
	return nil
}

// Delete 删除一个 Provider 配置
func (s *Store) Delete(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM payment_provider_configs WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("删除 provider 配置失败: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("读取 provider 删除结果失败: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("%w: %s", ErrProviderConfigNotFound, id)
	}
	return nil
}
