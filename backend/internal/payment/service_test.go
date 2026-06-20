package payment

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"

	"github.com/DouDOU-start/airgate-epay/backend/internal/payment/provider"
)

type fakeProvider struct {
	id      string
	kind    string
	name    string
	methods []string
	enabled bool
	create  func(context.Context, provider.CreateOrderInput) (*provider.CreateOrderResult, error)
	verify  func(context.Context, provider.CallbackRequest) (*provider.CallbackResult, error)
}

func (p *fakeProvider) ID() string   { return p.id }
func (p *fakeProvider) Name() string { return p.name }
func (p *fakeProvider) Kind() string {
	if p.kind == "" {
		return provider.KindEpayCaihong
	}
	return p.kind
}
func (p *fakeProvider) SupportedMethods() []string {
	if len(p.methods) == 0 {
		return []string{provider.MethodAlipay}
	}
	out := make([]string, len(p.methods))
	copy(out, p.methods)
	return out
}
func (p *fakeProvider) Enabled() bool { return p.enabled }
func (p *fakeProvider) CreateOrder(ctx context.Context, in provider.CreateOrderInput) (*provider.CreateOrderResult, error) {
	if p.create != nil {
		return p.create(ctx, in)
	}
	return &provider.CreateOrderResult{PaymentURL: "https://pay.example.com", QRCodeContent: "qr"}, nil
}
func (p *fakeProvider) VerifyCallback(ctx context.Context, req provider.CallbackRequest) (*provider.CallbackResult, error) {
	if p.verify != nil {
		return p.verify(ctx, req)
	}
	return &provider.CallbackResult{OutTradeNo: "AG1", Status: "pending"}, nil
}

func newMockService(t *testing.T, opts ServiceOptions) (*Service, *provider.Registry, *sql.DB, sqlmock.Sqlmock) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New error: %v", err)
	}
	registry := provider.NewRegistry()
	svc := NewService(testLogger(), db, registry, opts)
	return svc, registry, db, mock
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestCreateOrderValidation(t *testing.T) {
	svc, _, db, mock := newMockService(t, ServiceOptions{MinAmount: 10, MaxAmount: 100})
	defer func() { _ = db.Close() }()

	cases := []struct {
		name string
		in   CreateOrderInput
		want string
	}{
		{name: "missing user", in: CreateOrderInput{UserID: 0, Amount: 20}, want: "缺少用户身份"},
		{name: "below min", in: CreateOrderInput{UserID: 1, Amount: 9.99}, want: "金额低于最低限额"},
		{name: "above max", in: CreateOrderInput{UserID: 1, Amount: 101}, want: "金额超过最高限额"},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := svc.CreateOrder(context.Background(), tt.in); err == nil || !strings.Contains(err.Error(), tt.want) {
				t.Fatalf("CreateOrder error = %v, want containing %q", err, tt.want)
			}
		})
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unexpected database call: %v", err)
	}
}

func TestCreateOrderDailyLimitAndProviderSelectionErrors(t *testing.T) {
	t.Run("daily query error", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{MinAmount: 1, MaxAmount: 100, DailyLimit: 50})
		defer func() { _ = db.Close() }()
		mock.ExpectQuery("SELECT COALESCE").WithArgs(int64(7)).WillReturnError(errors.New("db down"))
		_, err := svc.CreateOrder(context.Background(), CreateOrderInput{UserID: 7, Amount: 10})
		if err == nil || !strings.Contains(err.Error(), "查询日累失败") {
			t.Fatalf("CreateOrder daily query error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("daily limit exceeded", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{MinAmount: 1, MaxAmount: 100, DailyLimit: 50})
		defer func() { _ = db.Close() }()
		mock.ExpectQuery("SELECT COALESCE").WithArgs(int64(7)).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(45.0))
		_, err := svc.CreateOrder(context.Background(), CreateOrderInput{UserID: 7, Amount: 10})
		if err == nil || !strings.Contains(err.Error(), "超过单日充值上限") {
			t.Fatalf("CreateOrder limit error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("no provider", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{MinAmount: 1, MaxAmount: 100})
		defer func() { _ = db.Close() }()
		_, err := svc.CreateOrder(context.Background(), CreateOrderInput{UserID: 7, Amount: 10, Method: provider.MethodAlipay})
		if err == nil || !strings.Contains(err.Error(), "没有可用的支付服务商") {
			t.Fatalf("CreateOrder provider error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})
}

func TestCreateOrderSuccessAndFailureBranches(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc, registry, db, mock := newMockService(t, ServiceOptions{
			MinAmount:       1,
			MaxAmount:       1000,
			DailyLimit:      500,
			ExpireAfter:     30 * time.Minute,
			CallbackBaseURL: "https://airgate.example.com",
		})
		defer func() { _ = db.Close() }()

		registry.Replace([]provider.Provider{&fakeProvider{
			id:      "fake_main",
			enabled: true,
			methods: []string{provider.MethodAlipay},
			create: func(_ context.Context, in provider.CreateOrderInput) (*provider.CreateOrderResult, error) {
				if !strings.HasPrefix(in.OutTradeNo, "AG") || len(in.OutTradeNo) < 18 {
					t.Fatalf("out_trade_no format mismatch: %q", in.OutTradeNo)
				}
				if in.NotifyURL != "https://airgate.example.com/api/v1/payment-callback/payment-epay/notify/fake_main" {
					t.Fatalf("NotifyURL = %q", in.NotifyURL)
				}
				if in.ReturnURL != "https://airgate.example.com/plugins/payment-epay/orders" {
					t.Fatalf("ReturnURL = %q", in.ReturnURL)
				}
				if in.ExpireSeconds != 1800 || in.ClientIP != "1.2.3.4" || in.Subject != "余额充值" {
					t.Fatalf("provider input mismatch: %+v", in)
				}
				return &provider.CreateOrderResult{PaymentURL: "https://pay.example.com", QRCodeContent: "qr"}, nil
			},
		}})

		mock.ExpectQuery("SELECT COALESCE").WithArgs(int64(7)).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(20.0))
		mock.ExpectQuery("INSERT INTO payment_orders").
			WithArgs(sqlmock.AnyArg(), int64(7), "fake_main", provider.MethodAlipay, "fake_main", 30.0, "余额充值", "1.2.3.4", "https://pay.example.com", "qr", sqlmock.AnyArg(), sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(int64(42)))

		order, err := svc.CreateOrder(context.Background(), CreateOrderInput{
			UserID:   7,
			Method:   provider.MethodAlipay,
			Amount:   30,
			Subject:  "余额充值",
			ClientIP: "1.2.3.4",
		})
		if err != nil {
			t.Fatalf("CreateOrder error: %v", err)
		}
		if order.ID != 42 || order.UserID != 7 || order.ProviderID != "fake_main" || order.Channel != "fake_main" ||
			order.PaymentURL != "https://pay.example.com" || order.QRCodeContent != "qr" || order.Status != "pending" {
			t.Fatalf("order mismatch: %+v", order)
		}
		if order.ExpiresAt.Sub(order.CreatedAt) < 29*time.Minute || order.ExpiresAt.Sub(order.CreatedAt) > 31*time.Minute {
			t.Fatalf("expiration mismatch: created=%s expires=%s", order.CreatedAt, order.ExpiresAt)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("provider create error", func(t *testing.T) {
		svc, registry, db, mock := newMockService(t, ServiceOptions{MinAmount: 1, MaxAmount: 100, ExpireAfter: time.Minute})
		defer func() { _ = db.Close() }()
		registry.Replace([]provider.Provider{&fakeProvider{
			id:      "fake",
			enabled: true,
			create: func(context.Context, provider.CreateOrderInput) (*provider.CreateOrderResult, error) {
				return nil, errors.New("gateway failed")
			},
		}})
		_, err := svc.CreateOrder(context.Background(), CreateOrderInput{UserID: 1, Method: provider.MethodAlipay, Amount: 10})
		if err == nil || !strings.Contains(err.Error(), "渠道下单失败") {
			t.Fatalf("CreateOrder provider failure = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("insert error", func(t *testing.T) {
		svc, registry, db, mock := newMockService(t, ServiceOptions{MinAmount: 1, MaxAmount: 100, ExpireAfter: time.Minute})
		defer func() { _ = db.Close() }()
		registry.Replace([]provider.Provider{&fakeProvider{id: "fake", enabled: true}})
		mock.ExpectQuery("INSERT INTO payment_orders").
			WithArgs(sqlmock.AnyArg(), int64(1), "fake", provider.MethodAlipay, "fake", 10.0, "余额充值", "", "https://pay.example.com", "qr", sqlmock.AnyArg(), sqlmock.AnyArg()).
			WillReturnError(errors.New("insert failed"))
		_, err := svc.CreateOrder(context.Background(), CreateOrderInput{UserID: 1, Method: provider.MethodAlipay, Amount: 10, Subject: "余额充值"})
		if err == nil || !strings.Contains(err.Error(), "订单落库失败") {
			t.Fatalf("CreateOrder insert error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})
}

func TestHandleCallback(t *testing.T) {
	t.Run("unknown provider", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		_, err := svc.HandleCallback(context.Background(), "missing", provider.CallbackRequest{})
		if err == nil || !strings.Contains(err.Error(), "未知的支付服务商") {
			t.Fatalf("HandleCallback unknown provider error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("verify error", func(t *testing.T) {
		svc, registry, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		registry.Replace([]provider.Provider{&fakeProvider{
			id:      "fake",
			enabled: true,
			verify: func(context.Context, provider.CallbackRequest) (*provider.CallbackResult, error) {
				return nil, provider.ErrInvalidSignature
			},
		}})
		_, err := svc.HandleCallback(context.Background(), "fake", provider.CallbackRequest{})
		if !errors.Is(err, provider.ErrInvalidSignature) {
			t.Fatalf("HandleCallback verify error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("pending callback does not mark paid", func(t *testing.T) {
		svc, registry, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		registry.Replace([]provider.Provider{&fakeProvider{
			id:      "fake",
			enabled: true,
			verify: func(context.Context, provider.CallbackRequest) (*provider.CallbackResult, error) {
				return &provider.CallbackResult{OutTradeNo: "AG1", Status: "pending"}, nil
			},
		}})
		res, err := svc.HandleCallback(context.Background(), "fake", provider.CallbackRequest{})
		if err != nil || res.Status != "pending" {
			t.Fatalf("HandleCallback pending = (%+v, %v)", res, err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("paid callback marks order paid", func(t *testing.T) {
		svc, registry, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		registry.Replace([]provider.Provider{&fakeProvider{
			id:      "fake",
			enabled: true,
			verify: func(context.Context, provider.CallbackRequest) (*provider.CallbackResult, error) {
				return &provider.CallbackResult{OutTradeNo: "AG1", Status: "paid", Amount: 20, Raw: map[string]string{"status": "paid"}}, nil
			},
		}})
		expectMarkPaidSuccess(mock, "AG1", provider.MethodWxpay, "fake", 20, 5)
		res, err := svc.HandleCallback(context.Background(), "fake", provider.CallbackRequest{})
		if err != nil || res.Status != "paid" {
			t.Fatalf("HandleCallback paid = (%+v, %v)", res, err)
		}
		assertSQLExpectations(t, mock)
	})
}

func TestMarkPaidBranches(t *testing.T) {
	t.Run("begin error", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin().WillReturnError(errors.New("begin failed"))
		err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1"})
		if err == nil || !strings.Contains(err.Error(), "开启事务失败") {
			t.Fatalf("markPaid begin error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("lock order error", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin()
		mock.ExpectQuery("SELECT id, user_id, amount, status, method, provider_id FROM payment_orders").
			WithArgs("AG1").WillReturnError(sql.ErrNoRows)
		mock.ExpectRollback()
		err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1"})
		if err == nil || !strings.Contains(err.Error(), "锁订单失败") {
			t.Fatalf("markPaid lock order error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("idempotent paid", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin()
		expectOrderLock(mock, "AG1", "paid", provider.MethodAlipay, "fake", 20)
		mock.ExpectRollback()
		if err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1", Amount: 20}); err != nil {
			t.Fatalf("markPaid idempotent error: %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("invalid status", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin()
		expectOrderLock(mock, "AG1", "failed", provider.MethodAlipay, "fake", 20)
		mock.ExpectRollback()
		err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1", Amount: 20})
		if err == nil || !strings.Contains(err.Error(), "订单状态不允许") {
			t.Fatalf("markPaid invalid status error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("amount mismatch", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin()
		expectOrderLock(mock, "AG1", "pending", provider.MethodAlipay, "fake", 20)
		mock.ExpectRollback()
		err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1", Amount: 21})
		if err == nil || !strings.Contains(err.Error(), "不匹配") {
			t.Fatalf("markPaid amount mismatch error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("user lock error", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin()
		expectOrderLock(mock, "AG1", "pending", provider.MethodAlipay, "fake", 20)
		mock.ExpectQuery("SELECT balance FROM users").WithArgs(int64(7)).WillReturnError(errors.New("user missing"))
		mock.ExpectRollback()
		err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1", Amount: 20})
		if err == nil || !strings.Contains(err.Error(), "锁用户失败") {
			t.Fatalf("markPaid user lock error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("balance update error", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin()
		expectOrderLock(mock, "AG1", "pending", provider.MethodAlipay, "fake", 20)
		mock.ExpectQuery("SELECT balance FROM users").WithArgs(int64(7)).WillReturnRows(sqlmock.NewRows([]string{"balance"}).AddRow(5.0))
		mock.ExpectExec("UPDATE users SET balance").WithArgs(25.0, int64(7)).WillReturnError(errors.New("update failed"))
		mock.ExpectRollback()
		err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1", Amount: 20})
		if err == nil || !strings.Contains(err.Error(), "更新余额失败") {
			t.Fatalf("markPaid balance update error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("balance log error", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin()
		expectOrderLock(mock, "AG1", "pending", "custom", "fake", 20)
		mock.ExpectQuery("SELECT balance FROM users").WithArgs(int64(7)).WillReturnRows(sqlmock.NewRows([]string{"balance"}).AddRow(5.0))
		mock.ExpectExec("UPDATE users SET balance").WithArgs(25.0, int64(7)).WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("INSERT INTO balance_logs").WithArgs(20.0, 5.0, 25.0, "在线充值（custom）", int64(7)).WillReturnError(errors.New("log failed"))
		mock.ExpectRollback()
		err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1", Amount: 20})
		if err == nil || !strings.Contains(err.Error(), "写 balance_logs 失败") {
			t.Fatalf("markPaid balance log error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("order update error", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectBegin()
		expectOrderLock(mock, "AG1", "pending", provider.MethodAlipay, "fake", 20)
		mock.ExpectQuery("SELECT balance FROM users").WithArgs(int64(7)).WillReturnRows(sqlmock.NewRows([]string{"balance"}).AddRow(5.0))
		mock.ExpectExec("UPDATE users SET balance").WithArgs(25.0, int64(7)).WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("INSERT INTO balance_logs").WithArgs(20.0, 5.0, 25.0, "在线充值（支付宝）", int64(7)).WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("UPDATE payment_orders").WithArgs(sqlmock.AnyArg(), int64(1)).WillReturnError(errors.New("order update failed"))
		mock.ExpectRollback()
		err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1", Amount: 20})
		if err == nil || !strings.Contains(err.Error(), "更新订单状态失败") {
			t.Fatalf("markPaid order update error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})
}

func TestOrderQueries(t *testing.T) {
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	paidAt := now.Add(time.Hour)

	t.Run("get order success and owner mismatch", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectQuery("SELECT ").
			WithArgs("AG1").
			WillReturnRows(orderRows().AddRow(int64(1), "AG1", int64(7), provider.MethodAlipay, "fake", "fake", 10.0, "paid", "subject", "pay", "qr", `{"ok":true}`, paidAt, now, now, now))
		order, err := svc.GetOrder(context.Background(), 7, "AG1")
		if err != nil {
			t.Fatalf("GetOrder error: %v", err)
		}
		if order.PaidAt == nil || !order.PaidAt.Equal(paidAt) || string(order.NotifyPayload) != `{"ok":true}` || order.QRCodeContent != "qr" {
			t.Fatalf("GetOrder scan mismatch: %+v", order)
		}

		mock.ExpectQuery("SELECT ").
			WithArgs("AG1").
			WillReturnRows(orderRows().AddRow(int64(1), "AG1", int64(7), provider.MethodAlipay, "fake", "fake", 10.0, "paid", "subject", "pay", "qr", nil, nil, now, now, now))
		_, err = svc.GetOrder(context.Background(), 8, "AG1")
		if err == nil || !strings.Contains(err.Error(), "订单不属于当前用户") {
			t.Fatalf("GetOrder owner mismatch error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("list user orders defaults limit", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectQuery("SELECT ").
			WithArgs(int64(7), 50).
			WillReturnRows(orderRows().AddRow(int64(1), "AG1", int64(7), provider.MethodWxpay, "fake", "", 10.0, "pending", nil, nil, nil, nil, nil, now, now, now))
		orders, err := svc.ListUserOrders(context.Background(), 7, 0)
		if err != nil {
			t.Fatalf("ListUserOrders error: %v", err)
		}
		if len(orders) != 1 || orders[0].Subject != "" || orders[0].PaymentURL != "" || orders[0].PaidAt != nil {
			t.Fatalf("ListUserOrders result mismatch: %#v", orders)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("admin list orders", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectQuery("SELECT").
			WithArgs("%user@example.com%").
			WillReturnRows(sqlmock.NewRows([]string{
				"total", "paid", "pending", "expired", "failed", "cancelled", "refunded", "total_amount_paid", "today_amount_paid",
			}).AddRow(int64(5), int64(2), int64(1), int64(1), int64(1), int64(0), int64(0), 30.0, 10.0))
		mock.ExpectQuery("SELECT COUNT").
			WithArgs("%user@example.com%", "paid").
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(2)))
		mock.ExpectQuery("SELECT po.id").
			WithArgs("%user@example.com%", "paid", 20, 20).
			WillReturnRows(adminOrderRows().AddRow(int64(1), "AG1", int64(7), "user@example.com", provider.MethodAlipay, "fake", "fake", 10.0, "paid", "subject", "pay", "qr", nil, paidAt, now, now, now))

		result, err := svc.ListAllOrders(context.Background(), AdminListParams{
			Email:    " user@example.com ",
			Status:   "paid",
			Page:     2,
			PageSize: 500,
		})
		if err != nil {
			t.Fatalf("ListAllOrders error: %v", err)
		}
		if result.Total != 2 || result.Stats.Total != 5 || len(result.List) != 1 || result.List[0].UserEmail != "user@example.com" {
			t.Fatalf("ListAllOrders result mismatch: %+v", result)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("admin stats error", func(t *testing.T) {
		svc, _, db, mock := newMockService(t, ServiceOptions{})
		defer func() { _ = db.Close() }()
		mock.ExpectQuery("SELECT").WithArgs(nil).WillReturnError(errors.New("stats failed"))
		_, err := svc.ListAllOrders(context.Background(), AdminListParams{Status: "all"})
		if err == nil || !strings.Contains(err.Error(), "统计订单失败") {
			t.Fatalf("ListAllOrders stats error = %v", err)
		}
		assertSQLExpectations(t, mock)
	})
}

func TestAvailableMethodsExpireAndHelpers(t *testing.T) {
	svc, registry, db, mock := newMockService(t, ServiceOptions{})
	defer func() { _ = db.Close() }()
	registry.Replace([]provider.Provider{&fakeProvider{id: "fake", enabled: true, methods: []string{provider.MethodWxpay}}})
	methods := svc.AvailableMethods()
	if got, want := methodKeys(methods), []string{provider.MethodWxpay}; !reflect.DeepEqual(got, want) {
		t.Fatalf("AvailableMethods = %#v, want %#v", got, want)
	}

	mock.ExpectExec("UPDATE payment_orders").
		WillReturnResult(sqlmock.NewResult(0, 3))
	if err := svc.ExpirePendingOrders(context.Background()); err != nil {
		t.Fatalf("ExpirePendingOrders error: %v", err)
	}
	mock.ExpectExec("UPDATE payment_orders").
		WillReturnError(errors.New("update failed"))
	if err := svc.ExpirePendingOrders(context.Background()); err == nil || !strings.Contains(err.Error(), "过期订单清理失败") {
		t.Fatalf("ExpirePendingOrders failure = %v", err)
	}
	assertSQLExpectations(t, mock)

	if got := absDiff(3, 5); got != 2 {
		t.Fatalf("absDiff(3,5) = %v", got)
	}
	if got := absDiff(5, 3); got != 2 {
		t.Fatalf("absDiff(5,3) = %v", got)
	}
	orderNo := generateOutTradeNo()
	if !strings.HasPrefix(orderNo, "AG") || len(orderNo) != len("AG20060102150405")+8 {
		t.Fatalf("generateOutTradeNo format mismatch: %q", orderNo)
	}
}

func expectOrderLock(mock sqlmock.Sqlmock, outTradeNo, status, method, providerID string, amount float64) {
	mock.ExpectQuery("SELECT id, user_id, amount, status, method, provider_id FROM payment_orders").
		WithArgs(outTradeNo).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "amount", "status", "method", "provider_id"}).
			AddRow(int64(1), int64(7), amount, status, method, providerID))
}

func expectMarkPaidSuccess(mock sqlmock.Sqlmock, outTradeNo, method, providerID string, amount, beforeBalance float64) {
	afterBalance := beforeBalance + amount
	mock.ExpectBegin()
	expectOrderLock(mock, outTradeNo, "pending", method, providerID, amount)
	mock.ExpectQuery("SELECT balance FROM users").WithArgs(int64(7)).
		WillReturnRows(sqlmock.NewRows([]string{"balance"}).AddRow(beforeBalance))
	mock.ExpectExec("UPDATE users SET balance").WithArgs(afterBalance, int64(7)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	remark := map[string]string{
		provider.MethodWxpay:  "在线充值（微信支付）",
		provider.MethodAlipay: "在线充值（支付宝）",
	}[method]
	if remark == "" {
		remark = "在线充值（" + method + "）"
	}
	mock.ExpectExec("INSERT INTO balance_logs").
		WithArgs(amount, beforeBalance, afterBalance, remark, int64(7)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("UPDATE payment_orders").
		WithArgs(sqlmock.AnyArg(), int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
}

func orderRows() *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "out_trade_no", "user_id", "method", "provider_id", "channel", "amount", "status", "subject",
		"payment_url", "qr_code_url", "notify_payload", "paid_at", "expires_at", "created_at", "updated_at",
	})
}

func adminOrderRows() *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "out_trade_no", "user_id", "user_email", "method", "provider_id", "channel", "amount", "status", "subject",
		"payment_url", "qr_code_url", "notify_payload", "paid_at", "expires_at", "created_at", "updated_at",
	})
}

func methodKeys(methods []provider.MethodInfo) []string {
	keys := make([]string, len(methods))
	for i, method := range methods {
		keys[i] = method.Key
	}
	return keys
}

func assertSQLExpectations(t *testing.T, mock sqlmock.Sqlmock) {
	t.Helper()
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestMarkPaidSerializesRawPayload(t *testing.T) {
	svc, _, db, mock := newMockService(t, ServiceOptions{})
	defer func() { _ = db.Close() }()
	raw := map[string]string{"b": "2", "a": "1"}
	mock.ExpectBegin()
	expectOrderLock(mock, "AG1", "pending", provider.MethodAlipay, "fake", 20)
	mock.ExpectQuery("SELECT balance FROM users").WithArgs(int64(7)).
		WillReturnRows(sqlmock.NewRows([]string{"balance"}).AddRow(5.0))
	mock.ExpectExec("UPDATE users SET balance").WithArgs(25.0, int64(7)).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("INSERT INTO balance_logs").WithArgs(20.0, 5.0, 25.0, "在线充值（支付宝）", int64(7)).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("UPDATE payment_orders").
		WithArgs(sqlArgFunc(func(v driver.Value) bool {
			bytes, ok := v.([]byte)
			if !ok {
				return false
			}
			var got map[string]string
			return json.Unmarshal(bytes, &got) == nil && reflect.DeepEqual(got, raw)
		}), int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
	if err := svc.markPaid(context.Background(), &provider.CallbackResult{OutTradeNo: "AG1", Amount: 20, Raw: raw}); err != nil {
		t.Fatalf("markPaid error: %v", err)
	}
	assertSQLExpectations(t, mock)
}

type sqlArgFunc func(driver.Value) bool

func (f sqlArgFunc) Match(v driver.Value) bool {
	return f(v)
}
