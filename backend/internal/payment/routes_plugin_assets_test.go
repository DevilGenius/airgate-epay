package payment

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	sdk "github.com/DevilGenius/airgate-sdk/sdkgo"

	"github.com/DevilGenius/airgate-epay/backend/internal/payment/provider"
)

type fakeRegistrar struct {
	routes []registeredRoute
}

type registeredRoute struct {
	method string
	path   string
}

func (r *fakeRegistrar) Handle(method, path string, _ http.HandlerFunc) {
	r.routes = append(r.routes, registeredRoute{method: method, path: path})
}

func (r *fakeRegistrar) Group(string) sdk.RouteRegistrar {
	return r
}

type fakePluginContext struct {
	logger *slog.Logger
	config sdk.PluginConfig
}

func (c fakePluginContext) Logger() *slog.Logger     { return c.logger }
func (c fakePluginContext) Config() sdk.PluginConfig { return c.config }

type fakePluginConfig map[string]string

func (c fakePluginConfig) GetString(key string) string { return c[key] }
func (c fakePluginConfig) GetInt(key string) int {
	var out int
	_, _ = fmtSscanf(c[key], "%d", &out)
	return out
}
func (c fakePluginConfig) GetBool(key string) bool {
	return c[key] == "true" || c[key] == "1"
}
func (c fakePluginConfig) GetFloat64(key string) float64 {
	var out float64
	_, _ = fmtSscanf(c[key], "%f", &out)
	return out
}
func (c fakePluginConfig) GetDuration(key string) time.Duration {
	return time.Duration(c.GetInt(key))
}
func (c fakePluginConfig) GetAll() map[string]string {
	out := make(map[string]string, len(c))
	for key, value := range c {
		out[key] = value
	}
	return out
}

var fmtSscanf = func(str, format string, a ...any) (int, error) {
	return fmt.Sscanf(str, format, a...)
}

func TestBuildPluginInfoAndPluginBasics(t *testing.T) {
	info := BuildPluginInfo()
	if info.ID != PluginID || info.Name != PluginName || info.Version != PluginVersion ||
		info.Type != sdk.PluginTypeExtension || info.SDKVersion != sdk.SDKVersion {
		t.Fatalf("plugin info identity mismatch: %+v", info)
	}
	if len(info.FrontendPages) != 4 || len(info.ConfigSchema) != 5 || info.Capabilities == nil {
		t.Fatalf("plugin info shape mismatch: pages=%d config=%d caps=%#v", len(info.FrontendPages), len(info.ConfigSchema), info.Capabilities)
	}
	if info.FrontendPages[0].Path != "/recharge" || info.FrontendPages[0].Audience != "user" {
		t.Fatalf("first frontend page mismatch: %+v", info.FrontendPages[0])
	}

	p := New()
	if p.registry == nil {
		t.Fatalf("New did not initialize registry")
	}
	if p.Configured() {
		t.Fatalf("new plugin should not be configured")
	}
	if got := p.Info(); got.ID != PluginID {
		t.Fatalf("Info() = %+v", got)
	}
	if defaultIfZero(0, 30) != 30 || defaultIfZero(-1, 30) != 30 || defaultIfZero(5, 30) != 5 {
		t.Fatalf("defaultIfZero mismatch")
	}
	if defaultFloat(0, 1.5) != 1.5 || defaultFloat(-1, 1.5) != 1.5 || defaultFloat(2.5, 1.5) != 2.5 {
		t.Fatalf("defaultFloat mismatch")
	}
}

func TestPluginInitMigrateReloadStartStopAndTasks(t *testing.T) {
	t.Run("init nil config and empty dsn soft fail", func(t *testing.T) {
		p := New()
		if err := p.Init(fakePluginContext{logger: testLogger(), config: nil}); err != nil {
			t.Fatalf("Init nil config error: %v", err)
		}
		if p.Configured() {
			t.Fatalf("nil config should leave plugin unconfigured")
		}
		if err := p.Init(fakePluginContext{logger: testLogger(), config: fakePluginConfig{}}); err != nil {
			t.Fatalf("Init empty dsn error: %v", err)
		}
		if p.Configured() {
			t.Fatalf("empty dsn should leave plugin unconfigured")
		}
	})

	t.Run("migrate skipped without db", func(t *testing.T) {
		p := New()
		p.logger = testLogger()
		if err := p.Migrate(); err != nil {
			t.Fatalf("Migrate without db error: %v", err)
		}
	})

	t.Run("plugin migrate success", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.logger = testLogger()
		p.db = db
		p.store = provider.NewStore(db)
		expectMigrateSuccess(mock)
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
			WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}))
		if err := p.Migrate(); err != nil {
			t.Fatalf("Plugin.Migrate error: %v", err)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("migrate direct success and failure", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		expectMigrateSuccess(mock)
		if err := migrate(db); err != nil {
			t.Fatalf("migrate error: %v", err)
		}
		assertSQLExpectations(t, mock)

		db2, mock2, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db2.Close() }()
		mock2.ExpectExec("CREATE TABLE IF NOT EXISTS payment_orders").WillReturnError(errors.New("ddl failed"))
		err = migrate(db2)
		if err == nil || !strings.Contains(err.Error(), "create payment_orders") {
			t.Fatalf("migrate failure = %v", err)
		}
		assertSQLExpectations(t, mock2)
	})

	t.Run("reload providers skips bad kind", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		now := time.Now()
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
			WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}).
				AddRow("cai", provider.KindEpayCaihong, true, []byte(`{"pid":"p","key":"k","gateway":"https://pay.example.com"}`), now, now).
				AddRow("bad", "missing_kind", true, []byte(`{}`), now, now))
		p := New()
		p.logger = testLogger()
		p.store = provider.NewStore(db)
		if err := p.ReloadProviders(context.Background()); err != nil {
			t.Fatalf("ReloadProviders error: %v", err)
		}
		if all := p.registry.All(); len(all) != 1 || all[0].ID() != "cai" {
			t.Fatalf("registry after reload mismatch: %#v", all)
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("start stop and task no service", func(t *testing.T) {
		p := New()
		p.logger = testLogger()
		if err := p.Start(context.Background()); err != nil {
			t.Fatalf("Start error: %v", err)
		}
		tasks := p.BackgroundTasks()
		if len(tasks) != 1 || tasks[0].Name != "expire_pending_orders" || tasks[0].Interval != 5*time.Minute {
			t.Fatalf("BackgroundTasks mismatch: %+v", tasks)
		}
		if err := tasks[0].Handler(context.Background()); err != nil {
			t.Fatalf("Background task with nil service error: %v", err)
		}
		if err := p.Stop(context.Background()); err != nil {
			t.Fatalf("Stop error: %v", err)
		}
	})

	t.Run("background task with service and stop closes db", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		p := New()
		p.logger = testLogger()
		p.db = db
		p.svc = NewService(testLogger(), db, provider.NewRegistry(), ServiceOptions{})
		mock.ExpectExec("UPDATE payment_orders").WillReturnResult(sqlmock.NewResult(0, 0))
		if err := p.BackgroundTasks()[0].Handler(context.Background()); err != nil {
			t.Fatalf("background task error: %v", err)
		}
		if err := p.Stop(context.Background()); err != nil {
			t.Fatalf("Stop with db error: %v", err)
		}
		assertSQLExpectations(t, mock)
	})
}

func TestRegisterRoutesAndMiddleware(t *testing.T) {
	p := New()
	registrar := &fakeRegistrar{}
	p.RegisterRoutes(registrar)
	want := []registeredRoute{
		{http.MethodPost, "/user/orders"},
		{http.MethodGet, "/user/orders"},
		{http.MethodGet, "/user/orders/"},
		{http.MethodGet, "/user/methods"},
		{http.MethodGet, "/admin/orders"},
		{http.MethodGet, "/admin/providers"},
		{http.MethodPost, "/admin/providers"},
		{http.MethodDelete, "/admin/providers/"},
		{http.MethodPost, "/admin/providers/reload"},
		{http.MethodPost, "/notify/"},
		{http.MethodGet, "/notify/"},
	}
	if !reflect.DeepEqual(registrar.routes, want) {
		t.Fatalf("registered routes = %#v, want %#v", registrar.routes, want)
	}

	nextCalled := false
	next := func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}

	rec := httptest.NewRecorder()
	p.requireConfigured(next)(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusServiceUnavailable || nextCalled {
		t.Fatalf("requireConfigured unconfigured code=%d next=%v", rec.Code, nextCalled)
	}
	p.svc = NewService(testLogger(), nil, provider.NewRegistry(), ServiceOptions{})
	rec = httptest.NewRecorder()
	p.requireConfigured(next)(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusNoContent || !nextCalled {
		t.Fatalf("requireConfigured configured code=%d next=%v", rec.Code, nextCalled)
	}

	assertMiddlewareStatus(t, p.requireUser(next), http.Header{headerEntry: {"admin"}}, http.StatusForbidden)
	assertMiddlewareStatus(t, p.requireUser(next), http.Header{headerEntry: {"user"}}, http.StatusUnauthorized)
	assertMiddlewareStatus(t, p.requireAdmin(next), http.Header{headerEntry: {"user"}, headerRole: {"admin"}}, http.StatusForbidden)
	assertMiddlewareStatus(t, p.requireAdmin(next), http.Header{headerEntry: {"admin"}, headerRole: {"user"}}, http.StatusForbidden)
	assertMiddlewareStatus(t, p.requireCallback(next), http.Header{headerEntry: {"user"}}, http.StatusForbidden)

	assertMiddlewareStatus(t, p.requireUser(next), http.Header{headerEntry: {"user"}, headerUserID: {"7"}}, http.StatusNoContent)
	assertMiddlewareStatus(t, p.requireAdmin(next), http.Header{headerEntry: {"admin"}, headerRole: {"admin"}}, http.StatusNoContent)
	assertMiddlewareStatus(t, p.requireCallback(next), http.Header{headerEntry: {"callback"}}, http.StatusNoContent)
}

func TestRouteUtilities(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	if id, ok := userIDFromHeader(req); ok || id != 0 {
		t.Fatalf("empty user id = (%d, %v)", id, ok)
	}
	for _, raw := range []string{"0", "-1", "abc"} {
		req.Header.Set(headerUserID, raw)
		if _, ok := userIDFromHeader(req); ok {
			t.Fatalf("userIDFromHeader(%q) ok=true, want false", raw)
		}
	}
	req.Header.Set(headerUserID, "42")
	if id, ok := userIDFromHeader(req); !ok || id != 42 {
		t.Fatalf("userIDFromHeader valid = (%d, %v)", id, ok)
	}

	req = httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.0.2.1:1234"
	if got := clientIPFromHeader(req); got != "192.0.2.1:1234" {
		t.Fatalf("clientIP remote = %q", got)
	}
	req.Header.Set("X-Real-IP", "198.51.100.2")
	if got := clientIPFromHeader(req); got != "198.51.100.2" {
		t.Fatalf("clientIP real = %q", got)
	}
	req.Header.Set("X-Forwarded-For", " 203.0.113.3, 198.51.100.2")
	if got := clientIPFromHeader(req); got != "203.0.113.3" {
		t.Fatalf("clientIP forwarded = %q", got)
	}

	for _, value := range []string{"abc", "ABC_123-xyz", strings.Repeat("a", 64)} {
		if !isValidProviderID(value) {
			t.Fatalf("isValidProviderID(%q) = false, want true", value)
		}
	}
	for _, value := range []string{"", strings.Repeat("a", 65), "bad/id", "中文", "has space"} {
		if isValidProviderID(value) {
			t.Fatalf("isValidProviderID(%q) = true, want false", value)
		}
	}

	rec := httptest.NewRecorder()
	writeJSONErr(rec, http.StatusBadRequest, "bad")
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), `"error":"bad"`) ||
		!strings.Contains(rec.Header().Get("Content-Type"), "application/json") {
		t.Fatalf("writeJSONErr response mismatch: code=%d headers=%v body=%s", rec.Code, rec.Header(), rec.Body.String())
	}
}

func TestUserHandlers(t *testing.T) {
	t.Run("list methods unconfigured and configured", func(t *testing.T) {
		p := New()
		rec := httptest.NewRecorder()
		p.handleListMethods(rec, httptest.NewRequest(http.MethodGet, "/user/methods", nil))
		var unconfigured map[string]any
		mustDecodeJSON(t, rec.Body, &unconfigured)
		if unconfigured["configured"] != false {
			t.Fatalf("unconfigured methods response: %#v", unconfigured)
		}

		registry := provider.NewRegistry()
		registry.Replace([]provider.Provider{&fakeProvider{id: "fake", enabled: true, methods: []string{provider.MethodAlipay}}})
		p.svc = NewService(testLogger(), nil, registry, ServiceOptions{})
		rec = httptest.NewRecorder()
		p.handleListMethods(rec, httptest.NewRequest(http.MethodGet, "/user/methods", nil))
		var configured struct {
			Configured bool                  `json:"configured"`
			Methods    []provider.MethodInfo `json:"methods"`
		}
		mustDecodeJSON(t, rec.Body, &configured)
		if !configured.Configured || len(configured.Methods) != 1 || configured.Methods[0].Key != provider.MethodAlipay {
			t.Fatalf("configured methods response: %+v", configured)
		}
	})

	t.Run("create order validation and success", func(t *testing.T) {
		p := New()
		p.svc = NewService(testLogger(), nil, provider.NewRegistry(), ServiceOptions{})
		req := httptest.NewRequest(http.MethodPost, "/user/orders", strings.NewReader(`{}`))
		rec := httptest.NewRecorder()
		p.handleCreateOrder(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("missing user create code = %d", rec.Code)
		}

		req = httptest.NewRequest(http.MethodPost, "/user/orders", strings.NewReader(`{bad`))
		req.Header.Set(headerUserID, "7")
		rec = httptest.NewRecorder()
		p.handleCreateOrder(rec, req)
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "请求体解析失败") {
			t.Fatalf("bad json create response: code=%d body=%s", rec.Code, rec.Body.String())
		}

		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		registry := provider.NewRegistry()
		registry.Replace([]provider.Provider{&fakeProvider{id: "fake", enabled: true}})
		p.svc = NewService(testLogger(), db, registry, ServiceOptions{MinAmount: 1, MaxAmount: 100, ExpireAfter: time.Minute})
		mock.ExpectQuery("INSERT INTO payment_orders").
			WithArgs(sqlmock.AnyArg(), int64(7), "fake", provider.MethodAlipay, "fake", 10.0, "AirGate 余额充值", "198.51.100.1", "https://pay.example.com", "qr", sqlmock.AnyArg(), sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(int64(1)))
		req = httptest.NewRequest(http.MethodPost, "/user/orders", strings.NewReader(`{"amount":10,"method":"alipay"}`))
		req.Header.Set(headerUserID, "7")
		req.Header.Set("X-Real-IP", "198.51.100.1")
		rec = httptest.NewRecorder()
		p.handleCreateOrder(rec, req)
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"id":1`) {
			t.Fatalf("success create response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("list and get orders", func(t *testing.T) {
		now := time.Now().UTC()
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.svc = NewService(testLogger(), db, provider.NewRegistry(), ServiceOptions{})
		mock.ExpectQuery("SELECT ").WithArgs(int64(7), 25).
			WillReturnRows(orderRows().AddRow(int64(1), "AG1", int64(7), provider.MethodAlipay, "fake", "fake", 10.0, "pending", "subject", "pay", "qr", nil, nil, now, now, now))
		req := httptest.NewRequest(http.MethodGet, "/user/orders?limit=25", nil)
		req.Header.Set(headerUserID, "7")
		rec := httptest.NewRecorder()
		p.handleListUserOrders(rec, req)
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"out_trade_no":"AG1"`) {
			t.Fatalf("list response: code=%d body=%s", rec.Code, rec.Body.String())
		}

		req = httptest.NewRequest(http.MethodGet, "/user/orders/", nil)
		req.Header.Set(headerUserID, "7")
		rec = httptest.NewRecorder()
		p.handleGetOrder(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("missing out_trade_no code = %d", rec.Code)
		}

		mock.ExpectQuery("SELECT ").WithArgs("AG1").
			WillReturnRows(orderRows().AddRow(int64(1), "AG1", int64(7), provider.MethodAlipay, "fake", "fake", 10.0, "pending", "subject", "pay", "qr", nil, nil, now, now, now))
		req = httptest.NewRequest(http.MethodGet, "/user/orders/AG1", nil)
		req.Header.Set(headerUserID, "7")
		rec = httptest.NewRecorder()
		p.handleGetOrder(rec, req)
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"out_trade_no":"AG1"`) {
			t.Fatalf("get response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("list and get order errors", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.svc = NewService(testLogger(), db, provider.NewRegistry(), ServiceOptions{})

		rec := httptest.NewRecorder()
		p.handleListUserOrders(rec, httptest.NewRequest(http.MethodGet, "/user/orders", nil))
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("list missing user code = %d", rec.Code)
		}

		mock.ExpectQuery("SELECT ").WithArgs(int64(7), 50).WillReturnError(errors.New("list failed"))
		req := httptest.NewRequest(http.MethodGet, "/user/orders", nil)
		req.Header.Set(headerUserID, "7")
		rec = httptest.NewRecorder()
		p.handleListUserOrders(rec, req)
		if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "list failed") {
			t.Fatalf("list error response: code=%d body=%s", rec.Code, rec.Body.String())
		}

		mock.ExpectQuery("SELECT ").WithArgs("AG404").WillReturnError(sql.ErrNoRows)
		req = httptest.NewRequest(http.MethodGet, "/user/orders/AG404", nil)
		req.Header.Set(headerUserID, "7")
		rec = httptest.NewRecorder()
		p.handleGetOrder(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("get not found code = %d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})
}

func TestAdminProviderHandlers(t *testing.T) {
	now := time.Now().UTC()

	t.Run("list providers", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.store = provider.NewStore(db)
		p.registry.Replace([]provider.Provider{&fakeProvider{id: "cai", enabled: true, methods: []string{provider.MethodAlipay}}})
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
			WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}).
				AddRow("cai", provider.KindEpayCaihong, true, []byte(`{"pid":"p"}`), now, now))
		rec := httptest.NewRecorder()
		p.handleAdminListProviders(rec, httptest.NewRequest(http.MethodGet, "/admin/providers", nil))
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"is_running":true`) || !strings.Contains(rec.Body.String(), `"kinds"`) {
			t.Fatalf("list providers response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("list providers store error", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.store = provider.NewStore(db)
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").WillReturnError(errors.New("list failed"))
		rec := httptest.NewRecorder()
		p.handleAdminListProviders(rec, httptest.NewRequest(http.MethodGet, "/admin/providers", nil))
		if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "list failed") {
			t.Fatalf("list providers error response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("upsert validation", func(t *testing.T) {
		p := New()
		p.store = provider.NewStore(&sql.DB{})
		for _, tt := range []struct {
			body string
			want string
		}{
			{body: `{bad`, want: "请求体解析失败"},
			{body: `{"kind":""}`, want: "kind 必填"},
			{body: `{"kind":"missing"}`, want: "未知的 provider kind"},
			{body: `{"kind":"epay_caihong","id":"bad/id"}`, want: "实例 ID 只能包含"},
		} {
			rec := httptest.NewRecorder()
			p.handleAdminUpsertProvider(rec, httptest.NewRequest(http.MethodPost, "/admin/providers", strings.NewReader(tt.body)))
			if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), tt.want) {
				t.Fatalf("upsert validation body=%s code=%d resp=%s", tt.body, rec.Code, rec.Body.String())
			}
		}
	})

	t.Run("upsert create auto id and reload", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.logger = testLogger()
		p.store = provider.NewStore(db)
		mock.ExpectQuery("SELECT id FROM payment_provider_configs WHERE id LIKE").
			WithArgs(provider.KindEpayCaihong + "_%").
			WillReturnRows(sqlmock.NewRows([]string{"id"}))
		mock.ExpectExec("INSERT INTO payment_provider_configs").
			WithArgs(provider.KindEpayCaihong+"_1", provider.KindEpayCaihong, true, sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
			WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}).
				AddRow(provider.KindEpayCaihong+"_1", provider.KindEpayCaihong, true, []byte(`{"pid":"p","key":"k","gateway":"https://pay.example.com"}`), now, now))
		rec := httptest.NewRecorder()
		p.handleAdminUpsertProvider(rec, httptest.NewRequest(http.MethodPost, "/admin/providers", strings.NewReader(`{"kind":"epay_caihong","enabled":true,"config":{"pid":"p"}}`)))
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"id":"epay_caihong_1"`) {
			t.Fatalf("upsert create response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("upsert next id and save errors", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.store = provider.NewStore(db)
		mock.ExpectQuery("SELECT id FROM payment_provider_configs WHERE id LIKE").
			WithArgs(provider.KindEpayCaihong + "_%").
			WillReturnError(errors.New("next id failed"))
		rec := httptest.NewRecorder()
		p.handleAdminUpsertProvider(rec, httptest.NewRequest(http.MethodPost, "/admin/providers", strings.NewReader(`{"kind":"epay_caihong","enabled":true}`)))
		if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "生成实例 ID 失败") {
			t.Fatalf("next id error response: code=%d body=%s", rec.Code, rec.Body.String())
		}

		mock.ExpectExec("INSERT INTO payment_provider_configs").
			WithArgs("cai", provider.KindEpayCaihong, true, sqlmock.AnyArg()).
			WillReturnError(errors.New("upsert failed"))
		rec = httptest.NewRecorder()
		p.handleAdminUpsertProvider(rec, httptest.NewRequest(http.MethodPost, "/admin/providers", strings.NewReader(`{"id":"cai","kind":"epay_caihong","enabled":true}`)))
		if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "upsert failed") {
			t.Fatalf("upsert error response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("upsert rename success", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.logger = testLogger()
		p.store = provider.NewStore(db)
		mock.ExpectBegin()
		mock.ExpectQuery("SELECT EXISTS").WithArgs("old").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))
		mock.ExpectQuery("SELECT EXISTS").WithArgs("new").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))
		mock.ExpectExec("UPDATE payment_provider_configs SET id").WithArgs("new", "old").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("UPDATE payment_orders SET provider_id").WithArgs("new", "old").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit()
		mock.ExpectExec("INSERT INTO payment_provider_configs").
			WithArgs("new", provider.KindEpayCaihong, true, sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
			WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}))
		rec := httptest.NewRecorder()
		p.handleAdminUpsertProvider(rec, httptest.NewRequest(http.MethodPost, "/admin/providers", strings.NewReader(`{"id":"new","original_id":"old","kind":"epay_caihong","enabled":true}`)))
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"id":"new"`) {
			t.Fatalf("rename upsert response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("delete and reload", func(t *testing.T) {
		p := New()
		rec := httptest.NewRecorder()
		p.handleAdminDeleteProvider(rec, httptest.NewRequest(http.MethodDelete, "/admin/providers/", nil))
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("delete missing id code = %d", rec.Code)
		}
		rec = httptest.NewRecorder()
		p.handleAdminDeleteProvider(rec, httptest.NewRequest(http.MethodDelete, "/admin/providers/reload", nil))
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("delete reload pseudo-id code = %d", rec.Code)
		}

		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p.logger = testLogger()
		p.store = provider.NewStore(db)
		mock.ExpectExec("DELETE FROM payment_provider_configs").WithArgs("cai").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
			WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}))
		rec = httptest.NewRecorder()
		p.handleAdminDeleteProvider(rec, httptest.NewRequest(http.MethodDelete, "/admin/providers/cai", nil))
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"ok":true`) {
			t.Fatalf("delete response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("delete errors", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.store = provider.NewStore(db)
		mock.ExpectExec("DELETE FROM payment_provider_configs").WithArgs("cai").WillReturnError(errors.New("delete failed"))
		rec := httptest.NewRecorder()
		p.handleAdminDeleteProvider(rec, httptest.NewRequest(http.MethodDelete, "/admin/providers/cai", nil))
		if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "delete failed") {
			t.Fatalf("delete error response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		mock.ExpectExec("DELETE FROM payment_provider_configs").WithArgs("cai").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").WillReturnError(errors.New("reload failed"))
		rec = httptest.NewRecorder()
		p.handleAdminDeleteProvider(rec, httptest.NewRequest(http.MethodDelete, "/admin/providers/cai", nil))
		if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "已删除但重新加载失败") {
			t.Fatalf("delete reload error response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("admin reload error", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.store = provider.NewStore(db)
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").WillReturnError(errors.New("list failed"))
		rec := httptest.NewRecorder()
		p.handleAdminReloadProviders(rec, httptest.NewRequest(http.MethodPost, "/admin/providers/reload", nil))
		if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "list failed") {
			t.Fatalf("reload error response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("admin reload success", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.logger = testLogger()
		p.store = provider.NewStore(db)
		mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
			WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}))
		rec := httptest.NewRecorder()
		p.handleAdminReloadProviders(rec, httptest.NewRequest(http.MethodPost, "/admin/providers/reload", nil))
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"ok":true`) {
			t.Fatalf("reload success response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})
}

func TestAdminOrderAndCallbackHandlers(t *testing.T) {
	t.Run("admin list orders success", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		now := time.Now().UTC()
		p := New()
		p.svc = NewService(testLogger(), db, provider.NewRegistry(), ServiceOptions{})
		mock.ExpectQuery("SELECT").WithArgs(nil).
			WillReturnRows(sqlmock.NewRows([]string{"total", "paid", "pending", "expired", "failed", "cancelled", "refunded", "total_amount_paid", "today_amount_paid"}).
				AddRow(int64(1), int64(1), int64(0), int64(0), int64(0), int64(0), int64(0), 10.0, 10.0))
		mock.ExpectQuery("SELECT COUNT").WithArgs(nil, nil).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(1)))
		mock.ExpectQuery("SELECT po.id").WithArgs(nil, nil, 20, 0).
			WillReturnRows(adminOrderRows().AddRow(int64(1), "AG1", int64(7), "user@example.com", provider.MethodAlipay, "fake", "fake", 10.0, "paid", "subject", "pay", "qr", nil, now, now, now, now))
		rec := httptest.NewRecorder()
		p.handleAdminListOrders(rec, httptest.NewRequest(http.MethodGet, "/admin/orders", nil))
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"total":1`) {
			t.Fatalf("admin orders response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("admin list orders error", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		p := New()
		p.svc = NewService(testLogger(), db, provider.NewRegistry(), ServiceOptions{})
		mock.ExpectQuery("SELECT").WithArgs(nil).WillReturnError(errors.New("stats failed"))
		rec := httptest.NewRecorder()
		p.handleAdminListOrders(rec, httptest.NewRequest(http.MethodGet, "/admin/orders", nil))
		if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "stats failed") {
			t.Fatalf("admin list error response: code=%d body=%s", rec.Code, rec.Body.String())
		}
		assertSQLExpectations(t, mock)
	})

	t.Run("callback missing id and success reply types", func(t *testing.T) {
		p := New()
		p.svc = NewService(testLogger(), nil, provider.NewRegistry(), ServiceOptions{})
		rec := httptest.NewRecorder()
		p.handleCallback(rec, httptest.NewRequest(http.MethodPost, "/notify/", nil))
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("callback missing provider code = %d", rec.Code)
		}

		registry := provider.NewRegistry()
		registry.Replace([]provider.Provider{&fakeProvider{
			id:      "fake",
			enabled: true,
			verify: func(_ context.Context, req provider.CallbackRequest) (*provider.CallbackResult, error) {
				if req.Form.Get("out_trade_no") != "AG1" || string(req.Body) == "" {
					t.Fatalf("callback request mismatch: form=%v body=%s", req.Form, string(req.Body))
				}
				return &provider.CallbackResult{OutTradeNo: "AG1", Status: "pending", ReplyType: "json", Reply: `{"ok":true}`}, nil
			},
		}})
		p.svc = NewService(testLogger(), nil, registry, ServiceOptions{})
		rec = httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/notify/fake", strings.NewReader("out_trade_no=AG1"))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		p.handleCallback(rec, req)
		if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "application/json" || rec.Body.String() != `{"ok":true}` {
			t.Fatalf("callback success response: code=%d headers=%v body=%s", rec.Code, rec.Header(), rec.Body.String())
		}
	})

	t.Run("callback error xml and default success", func(t *testing.T) {
		p := New()
		p.svc = NewService(testLogger(), nil, provider.NewRegistry(), ServiceOptions{})
		rec := httptest.NewRecorder()
		p.handleCallback(rec, httptest.NewRequest(http.MethodPost, "/notify/missing", strings.NewReader("out_trade_no=AG1")))
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "fail:") {
			t.Fatalf("callback service error response: code=%d body=%s", rec.Code, rec.Body.String())
		}

		registry := provider.NewRegistry()
		registry.Replace([]provider.Provider{&fakeProvider{
			id:      "fake",
			enabled: true,
			verify: func(context.Context, provider.CallbackRequest) (*provider.CallbackResult, error) {
				return &provider.CallbackResult{OutTradeNo: "AG1", Status: "pending", ReplyType: "xml", Reply: "<xml/>"}, nil
			},
		}})
		p.svc = NewService(testLogger(), nil, registry, ServiceOptions{})
		rec = httptest.NewRecorder()
		p.handleCallback(rec, httptest.NewRequest(http.MethodPost, "/notify/fake", strings.NewReader("out_trade_no=AG1")))
		if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "application/xml" || rec.Body.String() != "<xml/>" {
			t.Fatalf("callback xml response: code=%d headers=%v body=%s", rec.Code, rec.Header(), rec.Body.String())
		}

		registry.Replace([]provider.Provider{&fakeProvider{
			id:      "fake",
			enabled: true,
			verify: func(context.Context, provider.CallbackRequest) (*provider.CallbackResult, error) {
				return &provider.CallbackResult{OutTradeNo: "AG1", Status: "pending"}, nil
			},
		}})
		rec = httptest.NewRecorder()
		p.handleCallback(rec, httptest.NewRequest(http.MethodGet, "/notify/fake", nil))
		if rec.Code != http.StatusOK || !strings.Contains(rec.Header().Get("Content-Type"), "text/plain") || rec.Body.String() != "success" {
			t.Fatalf("callback default response: code=%d headers=%v body=%s", rec.Code, rec.Header(), rec.Body.String())
		}
	})
}

func TestAssetsLoading(t *testing.T) {
	if assets := loadAssetsFromDir(filepath.Join(t.TempDir(), "missing")); assets != nil {
		t.Fatalf("loadAssetsFromDir missing = %#v, want nil", assets)
	}

	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "nested"), 0o755); err != nil {
		t.Fatalf("mkdir error: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "index.js"), []byte("console.log(1)"), 0o644); err != nil {
		t.Fatalf("write index error: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "nested", "style.css"), []byte("body{}"), 0o644); err != nil {
		t.Fatalf("write css error: %v", err)
	}
	assets := loadAssetsFromDir(root)
	if string(assets["index.js"]) != "console.log(1)" || string(assets["nested/style.css"]) != "body{}" {
		t.Fatalf("loaded assets mismatch: %#v", assets)
	}

	workspace := t.TempDir()
	if err := os.MkdirAll(filepath.Join(workspace, "web", "dist"), 0o755); err != nil {
		t.Fatalf("mkdir web dist error: %v", err)
	}
	if err := os.WriteFile(filepath.Join(workspace, "web", "dist", "index.js"), []byte("dev"), 0o644); err != nil {
		t.Fatalf("write dev asset error: %v", err)
	}
	oldwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Getwd error: %v", err)
	}
	defer func() { _ = os.Chdir(oldwd) }()
	if err := os.Chdir(workspace); err != nil {
		t.Fatalf("Chdir error: %v", err)
	}
	if devAssets := loadDevAssets(); string(devAssets["index.js"]) != "dev" {
		t.Fatalf("loadDevAssets = %#v", devAssets)
	}
	if got := New().GetWebAssets(); string(got["index.js"]) != "dev" {
		t.Fatalf("GetWebAssets dev override = %#v", got)
	}

	emptyWorkspace := t.TempDir()
	if err := os.Chdir(emptyWorkspace); err != nil {
		t.Fatalf("Chdir empty workspace error: %v", err)
	}
	embedded := New().GetWebAssets()
	if len(embedded) == 0 || len(embedded["index.css"]) == 0 {
		t.Fatalf("GetWebAssets embedded fallback mismatch: keys=%v", reflect.ValueOf(embedded).MapKeys())
	}
}

func TestOpenDBEmptyDSN(t *testing.T) {
	if db, err := openDB(""); err == nil || db != nil || !strings.Contains(err.Error(), "db_dsn 未配置") {
		t.Fatalf("openDB empty = (%v, %v)", db, err)
	}
	if db, err := openDB("bad"); err == nil || db != nil || !strings.Contains(err.Error(), "数据库连通性检测失败") {
		t.Fatalf("openDB invalid = (%v, %v)", db, err)
	}
}

func assertMiddlewareStatus(t *testing.T, h http.HandlerFunc, headers http.Header, want int) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	for key, values := range headers {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}
	rec := httptest.NewRecorder()
	h(rec, req)
	if rec.Code != want {
		t.Fatalf("middleware status = %d, want %d; body=%s", rec.Code, want, rec.Body.String())
	}
}

func expectMigrateSuccess(mock sqlmock.Sqlmock) {
	patterns := []string{
		"CREATE TABLE IF NOT EXISTS payment_orders",
		"ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS method",
		"ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS provider_id",
		"CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id",
		"CREATE INDEX IF NOT EXISTS idx_payment_orders_status",
		"CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at",
		"CREATE INDEX IF NOT EXISTS idx_payment_orders_method",
		"CREATE INDEX IF NOT EXISTS idx_payment_orders_provider",
		"CREATE TABLE IF NOT EXISTS payment_refunds",
		"CREATE INDEX IF NOT EXISTS idx_payment_refunds_order_id",
		"CREATE TABLE IF NOT EXISTS payment_provider_configs",
	}
	for _, pattern := range patterns {
		mock.ExpectExec(pattern).WillReturnResult(sqlmock.NewResult(0, 0))
	}
}

func mustDecodeJSON(t *testing.T, body *bytes.Buffer, out any) {
	t.Helper()
	if err := json.NewDecoder(body).Decode(out); err != nil {
		t.Fatalf("decode JSON error: %v; body=%s", err, body.String())
	}
}
