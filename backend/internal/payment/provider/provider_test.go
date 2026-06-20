package provider

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"sort"
	"strings"
	"testing"
)

type stubProvider struct {
	id      string
	name    string
	kind    string
	methods []string
	enabled bool
	create  func(context.Context, CreateOrderInput) (*CreateOrderResult, error)
	verify  func(context.Context, CallbackRequest) (*CallbackResult, error)
}

func (p *stubProvider) ID() string   { return p.id }
func (p *stubProvider) Name() string { return p.name }
func (p *stubProvider) Kind() string { return p.kind }
func (p *stubProvider) SupportedMethods() []string {
	out := make([]string, len(p.methods))
	copy(out, p.methods)
	return out
}
func (p *stubProvider) Enabled() bool { return p.enabled }
func (p *stubProvider) CreateOrder(ctx context.Context, in CreateOrderInput) (*CreateOrderResult, error) {
	if p.create != nil {
		return p.create(ctx, in)
	}
	return &CreateOrderResult{}, nil
}
func (p *stubProvider) VerifyCallback(ctx context.Context, req CallbackRequest) (*CallbackResult, error) {
	if p.verify != nil {
		return p.verify(ctx, req)
	}
	return &CallbackResult{}, nil
}

func TestMethodInfoHelpersAndParseEnabledMethods(t *testing.T) {
	all := AllMethodInfos()
	if len(all) < 2 {
		t.Fatalf("expected built-in payment methods")
	}
	all[0].Label = "mutated"
	if got := MethodInfoFor(MethodAlipay); got.Label != "支付宝" {
		t.Fatalf("AllMethodInfos returned shared backing storage, got label %q", got.Label)
	}

	if got := MethodInfoFor("bank"); got.Key != "bank" || got.Label != "bank" || got.Icon != "" {
		t.Fatalf("unknown method fallback mismatch: %+v", got)
	}

	cases := []struct {
		name      string
		raw       string
		supported []string
		want      []string
	}{
		{name: "empty", raw: "", supported: []string{MethodAlipay}, want: nil},
		{name: "trim filter dedupe", raw: " wxpay, alipay, wxpay, bad,, ", supported: []string{MethodAlipay, MethodWxpay}, want: []string{MethodWxpay, MethodAlipay}},
		{name: "no supported tokens", raw: "bank", supported: []string{MethodAlipay}, want: nil},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			if got := parseEnabledMethods(tt.raw, tt.supported); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("parseEnabledMethods() = %#v, want %#v", got, tt.want)
			}
		})
	}
}

func TestRegistryPickFindAvailableMethodsAndAllCopy(t *testing.T) {
	r := NewRegistry()
	disabled := &stubProvider{id: "disabled", enabled: false, methods: []string{MethodAlipay}}
	wxpay := &stubProvider{id: "wxpay", enabled: true, methods: []string{MethodWxpay}}
	alipay := &stubProvider{id: "alipay", enabled: true, methods: []string{MethodAlipay, "bank"}}
	r.Replace([]Provider{disabled, wxpay, alipay})

	if got := r.Find("wxpay"); got != wxpay {
		t.Fatalf("Find() = %v, want wxpay provider", got)
	}
	if got := r.Find("missing"); got != nil {
		t.Fatalf("Find(missing) = %v, want nil", got)
	}

	got, err := r.Pick(MethodWxpay)
	if err != nil || got != wxpay {
		t.Fatalf("Pick(wxpay) = (%v, %v), want wxpay provider", got, err)
	}
	got, err = r.Pick(MethodAlipay)
	if err != nil || got != alipay {
		t.Fatalf("Pick(alipay) = (%v, %v), want alipay provider", got, err)
	}
	if _, err := r.Pick("qqpay"); !errors.Is(err, ErrNoProviderAvailable) {
		t.Fatalf("Pick(qqpay) error = %v, want ErrNoProviderAvailable", err)
	}

	methods := r.AvailableMethods()
	if got, want := methodKeys(methods), []string{MethodAlipay, MethodWxpay}; !reflect.DeepEqual(got, want) {
		t.Fatalf("AvailableMethods keys = %#v, want %#v", got, want)
	}

	all := r.All()
	if len(all) != 3 {
		t.Fatalf("All() returned %d providers, want 3", len(all))
	}
	all[0] = nil
	if r.All()[0] == nil {
		t.Fatalf("All() returned mutable internal slice")
	}
}

func TestBuilderAndKindMetaRegistries(t *testing.T) {
	kinds := RegisteredKinds()
	if !sort.StringsAreSorted(kinds) {
		t.Fatalf("RegisteredKinds not sorted: %#v", kinds)
	}
	for _, want := range []string{KindAlipayOfficial, KindEpayCaihong, KindEpayEasyPay, KindEpayXunhu, KindWxpayOfficial} {
		if !containsString(kinds, want) {
			t.Fatalf("RegisteredKinds missing %s in %#v", want, kinds)
		}
		if _, err := Build(want, want+"_id", false, map[string]string{}); err != nil {
			t.Fatalf("Build(%s) returned error: %v", want, err)
		}
		if meta, ok := GetKindMeta(want); !ok || meta.Kind != want || meta.Name == "" || len(meta.FieldDescriptors) == 0 {
			t.Fatalf("GetKindMeta(%s) = (%+v, %v), want populated meta", want, meta, ok)
		}
	}
	if _, err := Build("missing_kind", "id", true, nil); err == nil || !strings.Contains(err.Error(), "unknown provider kind") {
		t.Fatalf("Build(missing_kind) error = %v, want unknown kind", err)
	}

	metas := AllKindMetas()
	for i := 1; i < len(metas); i++ {
		if metas[i-1].Kind > metas[i].Kind {
			t.Fatalf("AllKindMetas not sorted: %#v", metas)
		}
	}
}

func TestRegisterDuplicatePanics(t *testing.T) {
	kind := "unit_test_duplicate_kind"
	Register(kind, func(string, bool, map[string]string) (Provider, error) {
		return &stubProvider{id: "unit", enabled: true}, nil
	})
	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("Register duplicate did not panic")
		}
	}()
	Register(kind, func(string, bool, map[string]string) (Provider, error) {
		return &stubProvider{id: "unit2", enabled: true}, nil
	})
}

func TestCaihongProviderCreateOrderAndVerifyCallback(t *testing.T) {
	prov, err := buildCaihong("caihong_main", true, map[string]string{
		"pid":             " 1001 ",
		"key":             " secret ",
		"gateway":         "https://pay.example.com/",
		"enabled_methods": "wxpay",
	})
	if err != nil {
		t.Fatalf("buildCaihong error: %v", err)
	}
	p := prov.(*caihongProvider)
	if p.ID() != "caihong_main" || p.Kind() != KindEpayCaihong || !strings.Contains(p.Name(), "caihong_main") {
		t.Fatalf("caihong identity mismatch: id=%s kind=%s name=%s", p.ID(), p.Kind(), p.Name())
	}
	if !p.Enabled() {
		t.Fatalf("expected provider to be enabled")
	}
	if got, want := p.SupportedMethods(), []string{MethodWxpay}; !reflect.DeepEqual(got, want) {
		t.Fatalf("SupportedMethods() = %#v, want %#v", got, want)
	}

	result, err := p.CreateOrder(context.Background(), CreateOrderInput{
		OutTradeNo: "AG123",
		Amount:     12.3,
		Subject:    "充值",
		Method:     MethodWxpay,
		NotifyURL:  "https://airgate.test/notify",
		ReturnURL:  "https://airgate.test/orders",
		ClientIP:   "127.0.0.1",
	})
	if err != nil {
		t.Fatalf("CreateOrder error: %v", err)
	}
	parsed, err := url.Parse(result.PaymentURL)
	if err != nil {
		t.Fatalf("payment URL parse error: %v", err)
	}
	if parsed.Scheme != "https" || parsed.Host != "pay.example.com" || parsed.Path != "/submit.php" {
		t.Fatalf("payment URL target mismatch: %s", result.PaymentURL)
	}
	q := parsed.Query()
	assertQueryValue(t, q, "pid", "1001")
	assertQueryValue(t, q, "type", "wxpay")
	assertQueryValue(t, q, "out_trade_no", "AG123")
	assertQueryValue(t, q, "money", "12.30")
	assertQueryValue(t, q, "clientip", "127.0.0.1")
	assertQueryValue(t, q, "sign_type", "MD5")
	if got, want := q.Get("sign"), signCaihong(q, "secret"); got != want {
		t.Fatalf("sign = %s, want %s", got, want)
	}
	if result.Raw["sign"] != q.Get("sign") {
		t.Fatalf("raw sign mismatch: %#v", result.Raw)
	}

	if _, err := p.CreateOrder(context.Background(), CreateOrderInput{Method: "bank"}); !errors.Is(err, ErrUnsupportedMethod) {
		t.Fatalf("CreateOrder unsupported error = %v, want ErrUnsupportedMethod", err)
	}
	disabled, _ := buildCaihong("disabled", true, map[string]string{})
	if _, err := disabled.CreateOrder(context.Background(), CreateOrderInput{Method: MethodAlipay}); !errors.Is(err, ErrProviderDisabled) {
		t.Fatalf("CreateOrder disabled error = %v, want ErrProviderDisabled", err)
	}

	callback := url.Values{
		"out_trade_no":  {"AG123"},
		"trade_no":      {"T123"},
		"money":         {"12.30"},
		"trade_status":  {"TRADE_SUCCESS"},
		"sign_type":     {"MD5"},
		"empty_ignored": {""},
	}
	callback.Set("sign", signCaihong(callback, "secret"))
	cb, err := p.VerifyCallback(context.Background(), CallbackRequest{Form: callback})
	if err != nil {
		t.Fatalf("VerifyCallback error: %v", err)
	}
	if cb.OutTradeNo != "AG123" || cb.ChannelTxn != "T123" || cb.Status != "paid" || cb.Amount != 12.30 || cb.Reply != "success" {
		t.Fatalf("callback result mismatch: %+v", cb)
	}

	callback.Set("trade_status", "WAIT_BUYER_PAY")
	callback.Set("sign", signCaihong(callback, "secret"))
	cb, err = p.VerifyCallback(context.Background(), CallbackRequest{Form: callback})
	if err != nil {
		t.Fatalf("VerifyCallback pending error: %v", err)
	}
	if cb.Status != "pending" {
		t.Fatalf("pending callback status = %s, want pending", cb.Status)
	}

	callback.Del("sign")
	if _, err := p.VerifyCallback(context.Background(), CallbackRequest{Form: callback}); !errors.Is(err, ErrInvalidSignature) {
		t.Fatalf("missing sign error = %v, want ErrInvalidSignature", err)
	}
	callback.Set("sign", "bad")
	if _, err := p.VerifyCallback(context.Background(), CallbackRequest{Form: callback}); !errors.Is(err, ErrInvalidSignature) {
		t.Fatalf("bad sign error = %v, want ErrInvalidSignature", err)
	}
}

func TestXunhuProviderCreateOrderHTTPBranches(t *testing.T) {
	var captured url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		if ct := r.Header.Get("Content-Type"); ct != "application/x-www-form-urlencoded" {
			t.Fatalf("Content-Type = %q", ct)
		}
		if accept := r.Header.Get("Accept"); accept != "application/json" {
			t.Fatalf("Accept = %q", accept)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm error: %v", err)
		}
		captured = r.PostForm
		if got, want := captured.Get("hash"), signXunhu(captured, "secret"); got != want {
			t.Fatalf("hash = %s, want %s", got, want)
		}
		_, _ = io.WriteString(w, `{"errcode":0,"errmsg":"ok","url":"https://pay.example.com/go","url_qrcode":"weixin://qr","hash":"reply-hash"}`)
	}))
	defer server.Close()

	prov, err := buildXunhu("xunhu_main", true, map[string]string{
		"appid":           "app",
		"appsecret":       "secret",
		"gateway_url":     server.URL,
		"enabled_methods": "alipay,wxpay",
	})
	if err != nil {
		t.Fatalf("buildXunhu error: %v", err)
	}
	xunhu := prov.(*xunhuProvider)
	if xunhu.ID() != "xunhu_main" || xunhu.Kind() != KindEpayXunhu || !strings.Contains(xunhu.Name(), "xunhu_main") {
		t.Fatalf("xunhu identity mismatch: id=%s kind=%s name=%s", xunhu.ID(), xunhu.Kind(), xunhu.Name())
	}
	if got, want := xunhu.SupportedMethods(), []string{MethodAlipay, MethodWxpay}; !reflect.DeepEqual(got, want) {
		t.Fatalf("xunhu supported methods = %#v, want %#v", got, want)
	}
	result, err := prov.CreateOrder(context.Background(), CreateOrderInput{
		OutTradeNo:    "AGX",
		Amount:        5,
		Subject:       "余额",
		Method:        MethodWxpay,
		NotifyURL:     "https://airgate.test/notify",
		ReturnURL:     "https://airgate.test/orders",
		ClientIP:      "10.0.0.1",
		ExpireSeconds: 1800,
	})
	if err != nil {
		t.Fatalf("CreateOrder error: %v", err)
	}
	assertQueryValue(t, captured, "appid", "app")
	assertQueryValue(t, captured, "trade_order_id", "AGX")
	assertQueryValue(t, captured, "type", "wechat")
	assertQueryValue(t, captured, "total_fee", "5.00")
	assertQueryValue(t, captured, "attach", "10.0.0.1")
	if captured.Get("nonce_str") == "" {
		t.Fatalf("nonce_str not set")
	}
	if result.PaymentURL != "https://pay.example.com/go" || result.QRCodeContent != "weixin://qr" || result.Raw["hash"] != "reply-hash" {
		t.Fatalf("CreateOrder result mismatch: %+v", result)
	}

	t.Run("disabled", func(t *testing.T) {
		disabled, _ := buildXunhu("x", true, map[string]string{})
		if _, err := disabled.CreateOrder(context.Background(), CreateOrderInput{Method: MethodAlipay}); !errors.Is(err, ErrProviderDisabled) {
			t.Fatalf("error = %v, want ErrProviderDisabled", err)
		}
	})
	t.Run("unsupported", func(t *testing.T) {
		if _, err := prov.CreateOrder(context.Background(), CreateOrderInput{Method: "bank"}); !errors.Is(err, ErrUnsupportedMethod) {
			t.Fatalf("error = %v, want ErrUnsupportedMethod", err)
		}
	})
	t.Run("http status", func(t *testing.T) {
		s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			http.Error(w, strings.Repeat("x", 250), http.StatusBadGateway)
		}))
		defer s.Close()
		p, _ := buildXunhu("x", true, map[string]string{"appid": "app", "appsecret": "secret", "gateway_url": s.URL})
		_, err := p.CreateOrder(context.Background(), CreateOrderInput{Method: MethodAlipay})
		if err == nil || !strings.Contains(err.Error(), "虎皮椒 HTTP 502") || !strings.Contains(err.Error(), "...") {
			t.Fatalf("http status error = %v", err)
		}
	})
	t.Run("bad json", func(t *testing.T) {
		s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			_, _ = io.WriteString(w, "{bad")
		}))
		defer s.Close()
		p, _ := buildXunhu("x", true, map[string]string{"appid": "app", "appsecret": "secret", "gateway_url": s.URL})
		_, err := p.CreateOrder(context.Background(), CreateOrderInput{Method: MethodAlipay})
		if err == nil || !strings.Contains(err.Error(), "解析虎皮椒响应失败") {
			t.Fatalf("bad json error = %v", err)
		}
	})
	t.Run("api error", func(t *testing.T) {
		s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			_, _ = io.WriteString(w, `{"errcode":40029,"errmsg":"bad sign"}`)
		}))
		defer s.Close()
		p, _ := buildXunhu("x", true, map[string]string{"appid": "app", "appsecret": "secret", "gateway_url": s.URL})
		_, err := p.CreateOrder(context.Background(), CreateOrderInput{Method: MethodAlipay})
		if err == nil || !strings.Contains(err.Error(), "虎皮椒下单失败") {
			t.Fatalf("api error = %v", err)
		}
	})
}

func TestXunhuProviderVerifyCallback(t *testing.T) {
	prov, _ := buildXunhu("xunhu_main", true, map[string]string{
		"appid":       "app",
		"appsecret":   "secret",
		"gateway_url": "https://pay.example.com/do.html",
	})

	form := url.Values{
		"trade_order_id": {"AGX"},
		"transaction_id": {"TXN"},
		"total_fee":      {"8.90"},
		"status":         {"OD"},
	}
	form.Set("hash", signXunhu(form, "secret"))
	cb, err := prov.VerifyCallback(context.Background(), CallbackRequest{Form: form})
	if err != nil {
		t.Fatalf("VerifyCallback error: %v", err)
	}
	if cb.OutTradeNo != "AGX" || cb.ChannelTxn != "TXN" || cb.Status != "paid" || cb.Amount != 8.9 || cb.ReplyType != "text" {
		t.Fatalf("callback result mismatch: %+v", cb)
	}
	if cb.Raw["hash"] == "" || cb.Raw["trade_order_id"] != "AGX" {
		t.Fatalf("raw form not flattened: %#v", cb.Raw)
	}

	form.Set("status", "WAIT")
	form.Set("hash", signXunhu(form, "secret"))
	cb, err = prov.VerifyCallback(context.Background(), CallbackRequest{Form: form})
	if err != nil {
		t.Fatalf("pending callback error: %v", err)
	}
	if cb.Status != "pending" {
		t.Fatalf("status = %s, want pending", cb.Status)
	}

	form.Del("hash")
	if _, err := prov.VerifyCallback(context.Background(), CallbackRequest{Form: form}); !errors.Is(err, ErrInvalidSignature) {
		t.Fatalf("missing hash error = %v, want ErrInvalidSignature", err)
	}
	form.Set("hash", "bad")
	if _, err := prov.VerifyCallback(context.Background(), CallbackRequest{Form: form}); !errors.Is(err, ErrInvalidSignature) {
		t.Fatalf("bad hash error = %v, want ErrInvalidSignature", err)
	}

	disabled, _ := buildXunhu("x", false, map[string]string{"appid": "app", "appsecret": "secret", "gateway_url": "https://example.com"})
	if _, err := disabled.VerifyCallback(context.Background(), CallbackRequest{Form: form}); !errors.Is(err, ErrProviderDisabled) {
		t.Fatalf("disabled error = %v, want ErrProviderDisabled", err)
	}
}

func TestEasyPayProviderCreateOrderAndVerifyCallback(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/pay/create" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read body error: %v", err)
		}
		if got, want := r.Header.Get("X-App-Id"), "app"; got != want {
			t.Fatalf("X-App-Id = %q, want %q", got, want)
		}
		wantSig := easyPaySign("secret", http.MethodPost, "/api/v1/pay/create", r.Header.Get("X-Timestamp"), r.Header.Get("X-Nonce"), body)
		if got := r.Header.Get("X-Signature"); got != wantSig {
			t.Fatalf("signature = %s, want %s", got, wantSig)
		}
		var req easyPayCreateReq
		if err := json.Unmarshal(body, &req); err != nil {
			t.Fatalf("json body error: %v", err)
		}
		if req.MerchantOrderNo != "AGE" || req.Channel != "alipay" || req.Amount != 1235 || req.ExpireSeconds != 90 {
			t.Fatalf("request body mismatch: %+v", req)
		}
		_, _ = io.WriteString(w, `{"code":"OK","message":"ok","data":{"OrderNo":"E123","CodeURL":"qr-content","H5URL":"https://h5.example.com/pay"}}`)
	}))
	defer server.Close()

	prov, err := buildEasyPay("easy_main", true, map[string]string{
		"app_id":          "app",
		"app_secret":      "secret",
		"gateway":         server.URL + "/",
		"enabled_methods": "alipay",
	})
	if err != nil {
		t.Fatalf("buildEasyPay error: %v", err)
	}
	easy := prov.(*easyPayProvider)
	if easy.ID() != "easy_main" || easy.Kind() != KindEpayEasyPay || !strings.Contains(easy.Name(), "easy_main") {
		t.Fatalf("easy-pay identity mismatch: id=%s kind=%s name=%s", easy.ID(), easy.Kind(), easy.Name())
	}
	if got, want := easy.SupportedMethods(), []string{MethodAlipay}; !reflect.DeepEqual(got, want) {
		t.Fatalf("easy-pay supported methods = %#v, want %#v", got, want)
	}
	result, err := prov.CreateOrder(context.Background(), CreateOrderInput{
		OutTradeNo:    "AGE",
		Amount:        12.345,
		Method:        MethodAlipay,
		Subject:       "余额充值",
		NotifyURL:     "https://airgate.test/notify",
		ExpireSeconds: 90,
	})
	if err != nil {
		t.Fatalf("CreateOrder error: %v", err)
	}
	if result.PaymentURL != "https://h5.example.com/pay" || result.QRCodeContent != "qr-content" || result.Raw["order_no"] != "E123" {
		t.Fatalf("result mismatch: %+v", result)
	}

	t.Run("code url fallback", func(t *testing.T) {
		s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			_, _ = io.WriteString(w, `{"code":"OK","data":{"OrderNo":"E124","CodeURL":"qr-only"}}`)
		}))
		defer s.Close()
		p, _ := buildEasyPay("easy", true, map[string]string{"app_id": "app", "app_secret": "secret", "gateway": s.URL})
		res, err := p.CreateOrder(context.Background(), CreateOrderInput{OutTradeNo: "A", Amount: 1, Method: MethodWxpay})
		if err != nil {
			t.Fatalf("CreateOrder error: %v", err)
		}
		if res.PaymentURL != "qr-only" || res.QRCodeContent != "qr-only" {
			t.Fatalf("fallback result mismatch: %+v", res)
		}
	})
	t.Run("disabled and unsupported", func(t *testing.T) {
		disabled, _ := buildEasyPay("easy", true, map[string]string{})
		if _, err := disabled.CreateOrder(context.Background(), CreateOrderInput{Method: MethodAlipay}); !errors.Is(err, ErrProviderDisabled) {
			t.Fatalf("disabled error = %v, want ErrProviderDisabled", err)
		}
		if _, err := prov.CreateOrder(context.Background(), CreateOrderInput{Method: "bank"}); !errors.Is(err, ErrUnsupportedMethod) {
			t.Fatalf("unsupported error = %v, want ErrUnsupportedMethod", err)
		}
	})
	t.Run("http and api errors", func(t *testing.T) {
		tests := []struct {
			name string
			code int
			body string
			want string
		}{
			{name: "http status", code: http.StatusBadGateway, body: "gateway down", want: "easy-pay HTTP 502"},
			{name: "bad json", code: http.StatusOK, body: "{bad", want: "解析 easy-pay 响应失败"},
			{name: "api code", code: http.StatusOK, body: `{"code":"FAIL","message":"bad"}`, want: "easy-pay 下单失败"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
					w.WriteHeader(tt.code)
					_, _ = io.WriteString(w, tt.body)
				}))
				defer s.Close()
				p, _ := buildEasyPay("easy", true, map[string]string{"app_id": "app", "app_secret": "secret", "gateway": s.URL})
				_, err := p.CreateOrder(context.Background(), CreateOrderInput{Method: MethodAlipay})
				if err == nil || !strings.Contains(err.Error(), tt.want) {
					t.Fatalf("error = %v, want containing %q", err, tt.want)
				}
			})
		}
	})

	p := easy
	body := []byte(`{"order_no":"E123","merchant_order_no":"AGE","channel":"alipay","channel_order_no":"C123","amount":1234,"currency":"CNY","status":"paid","paid_at":"2026-01-02T03:04:05Z"}`)
	headers := http.Header{}
	headers.Set("X-Timestamp", "1700000000")
	headers.Set("X-Nonce", "nonce")
	headers.Set("X-Signature", easyPaySign("secret", http.MethodPost, "/api/v1/payment-callback/payment-epay/notify/easy_main", "1700000000", "nonce", body))
	cb, err := p.VerifyCallback(context.Background(), CallbackRequest{Body: body, Headers: headers})
	if err != nil {
		t.Fatalf("VerifyCallback error: %v", err)
	}
	if cb.OutTradeNo != "AGE" || cb.ChannelTxn != "C123" || cb.Status != "paid" || cb.Amount != 12.34 || cb.ReplyType != "json" {
		t.Fatalf("callback result mismatch: %+v", cb)
	}
	if cb.Raw["paid_at"] != "2026-01-02T03:04:05Z" {
		t.Fatalf("raw payload mismatch: %#v", cb.Raw)
	}

	body = []byte(`{"merchant_order_no":"AGE","amount":100,"status":"created"}`)
	headers.Set("X-Signature", easyPaySign("secret", http.MethodPost, "/api/v1/payment-callback/payment-epay/notify/easy_main", "1700000000", "nonce", body))
	cb, err = p.VerifyCallback(context.Background(), CallbackRequest{Body: body, Headers: headers})
	if err != nil {
		t.Fatalf("pending VerifyCallback error: %v", err)
	}
	if cb.Status != "pending" || cb.Amount != 1 {
		t.Fatalf("pending callback mismatch: %+v", cb)
	}

	for _, tt := range []struct {
		name    string
		headers http.Header
		body    []byte
		want    error
	}{
		{name: "missing headers", headers: http.Header{}, body: body, want: ErrInvalidSignature},
		{name: "bad signature", headers: cloneHeaderWithSignature(headers, "bad"), body: body, want: ErrInvalidSignature},
		{name: "bad json", headers: headersForEasyPay(p.id, "secret", []byte("{bad")), body: []byte("{bad"), want: nil},
	} {
		t.Run(tt.name, func(t *testing.T) {
			_, err := p.VerifyCallback(context.Background(), CallbackRequest{Body: tt.body, Headers: tt.headers})
			if tt.want != nil {
				if !errors.Is(err, tt.want) {
					t.Fatalf("error = %v, want %v", err, tt.want)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), "解析回调 body 失败") {
				t.Fatalf("error = %v, want JSON parse error", err)
			}
		})
	}
}

func TestOfficialProvidersDisabledAndSmallHelpers(t *testing.T) {
	for _, raw := range []string{"true", " TRUE ", "1", "yes", "on"} {
		if !parseBool(raw) {
			t.Fatalf("parseBool(%q) = false, want true", raw)
		}
	}
	for _, raw := range []string{"", "false", "0", "no", "off", "anything"} {
		if parseBool(raw) {
			t.Fatalf("parseBool(%q) = true, want false", raw)
		}
	}

	alipayProv, err := buildAlipayOfficial("ali", true, map[string]string{})
	if err != nil {
		t.Fatalf("buildAlipayOfficial error: %v", err)
	}
	if alipayProv.Enabled() {
		t.Fatalf("incomplete alipay provider should be disabled")
	}
	if alipayProv.ID() != "ali" || alipayProv.Kind() != KindAlipayOfficial ||
		!strings.Contains(alipayProv.Name(), "ali") ||
		!reflect.DeepEqual(alipayProv.SupportedMethods(), []string{MethodAlipay}) {
		t.Fatalf("alipay identity mismatch: id=%s kind=%s name=%s methods=%#v",
			alipayProv.ID(), alipayProv.Kind(), alipayProv.Name(), alipayProv.SupportedMethods())
	}
	if _, err := alipayProv.CreateOrder(context.Background(), CreateOrderInput{Method: MethodAlipay}); !errors.Is(err, ErrProviderDisabled) {
		t.Fatalf("alipay CreateOrder error = %v, want ErrProviderDisabled", err)
	}
	if _, err := alipayProv.VerifyCallback(context.Background(), CallbackRequest{Form: url.Values{"sign": {"x"}}}); !errors.Is(err, ErrProviderDisabled) {
		t.Fatalf("alipay VerifyCallback error = %v, want ErrProviderDisabled", err)
	}
	invalidAli, err := buildAlipayOfficial("ali", true, map[string]string{
		"app_id":            "app",
		"private_key":       "not-a-key",
		"alipay_public_key": "not-a-public-key",
		"is_sandbox":        "true",
	})
	if err != nil {
		t.Fatalf("invalid alipay build error: %v", err)
	}
	if invalidAli.Enabled() {
		t.Fatalf("invalid alipay keys should leave provider disabled")
	}

	wxProv, err := buildWxpayOfficial("wx", true, map[string]string{})
	if err != nil {
		t.Fatalf("buildWxpayOfficial error: %v", err)
	}
	wx := wxProv.(*wxpayOfficialProvider)
	if wx.fieldsComplete() || wx.Enabled() {
		t.Fatalf("incomplete wx provider should be disabled")
	}
	if wx.ID() != "wx" || wx.Kind() != KindWxpayOfficial ||
		!strings.Contains(wx.Name(), "wx") ||
		!reflect.DeepEqual(wx.SupportedMethods(), []string{MethodWxpay}) {
		t.Fatalf("wx identity mismatch: id=%s kind=%s name=%s methods=%#v",
			wx.ID(), wx.Kind(), wx.Name(), wx.SupportedMethods())
	}
	invalidWX, err := buildWxpayOfficial("wx", true, map[string]string{
		"mch_id":      "mch",
		"app_id":      "app",
		"serial_no":   "serial",
		"apiv3_key":   "12345678901234567890123456789012",
		"private_key": "not-a-private-key",
	})
	if err != nil {
		t.Fatalf("invalid wx build error: %v", err)
	}
	if invalidWX.Enabled() {
		t.Fatalf("invalid wx private key should leave provider disabled")
	}
	if _, err := invalidWX.CreateOrder(context.Background(), CreateOrderInput{Method: MethodWxpay}); !errors.Is(err, ErrProviderDisabled) {
		t.Fatalf("wx CreateOrder error = %v, want ErrProviderDisabled", err)
	}
	if _, err := invalidWX.VerifyCallback(context.Background(), CallbackRequest{}); !errors.Is(err, ErrProviderDisabled) {
		t.Fatalf("wx VerifyCallback error = %v, want ErrProviderDisabled", err)
	}

	if got := derefString(nil); got != "" {
		t.Fatalf("derefString(nil) = %q", got)
	}
	value := "ok"
	if got := derefString(&value); got != "ok" {
		t.Fatalf("derefString(&value) = %q", got)
	}

	nonce := randomNonce(15)
	if len(nonce) != 15 {
		t.Fatalf("randomNonce length = %d, want 15", len(nonce))
	}
	if got := truncate("abcdef", 3); got != "abc..." {
		t.Fatalf("truncate shortened = %q", got)
	}
	if got := truncate("abc", 3); got != "abc" {
		t.Fatalf("truncate unchanged = %q", got)
	}
}

func methodKeys(methods []MethodInfo) []string {
	keys := make([]string, len(methods))
	for i, method := range methods {
		keys[i] = method.Key
	}
	return keys
}

func assertQueryValue(t *testing.T, q url.Values, key, want string) {
	t.Helper()
	if got := q.Get(key); got != want {
		t.Fatalf("%s = %q, want %q in %v", key, got, want, q)
	}
}

func cloneHeaderWithSignature(in http.Header, sig string) http.Header {
	out := in.Clone()
	out.Set("X-Signature", sig)
	return out
}

func headersForEasyPay(providerID, secret string, body []byte) http.Header {
	headers := http.Header{}
	headers.Set("X-Timestamp", "1700000000")
	headers.Set("X-Nonce", "nonce")
	headers.Set("X-Signature", easyPaySign(secret, http.MethodPost, "/api/v1/payment-callback/payment-epay/notify/"+providerID, "1700000000", "nonce", body))
	return headers
}

func TestEasyPaySignIsDeterministic(t *testing.T) {
	body := []byte(`{"amount":100}`)
	got := easyPaySign("secret", "post", "/path", "1700000000", "nonce", body)
	gotAgain := easyPaySign("secret", "POST", "/path", "1700000000", "nonce", body)
	if got != gotAgain {
		t.Fatalf("method case changed signature: %s != %s", got, gotAgain)
	}
	if len(got) != 64 {
		t.Fatalf("sha256 hex length = %d, want 64", len(got))
	}
}

func TestFlattenFormUsesFirstValue(t *testing.T) {
	form := url.Values{"a": {"first", "second"}, "b": {""}}
	got := flattenForm(form)
	if !reflect.DeepEqual(got, map[string]string{"a": "first", "b": ""}) {
		t.Fatalf("flattenForm() = %#v", got)
	}
}

func TestCreateOrderResultRawValuesRemainStrings(t *testing.T) {
	prov, _ := buildCaihong("c", true, map[string]string{"pid": "p", "key": "k", "gateway": "https://pay.example.com"})
	res, err := prov.CreateOrder(context.Background(), CreateOrderInput{OutTradeNo: "A", Amount: 1, Method: MethodAlipay})
	if err != nil {
		t.Fatalf("CreateOrder error: %v", err)
	}
	if res.Raw["pid"] != "p" || res.Raw["money"] != "1.00" || res.Raw["sign_type"] != "MD5" {
		t.Fatalf("raw values mismatch: %#v", res.Raw)
	}
}
