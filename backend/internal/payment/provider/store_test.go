package provider

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestStoreMigrateUpsertAndDelete(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New error: %v", err)
	}
	defer func() { _ = db.Close() }()

	store := NewStore(db)
	mock.ExpectExec("CREATE TABLE IF NOT EXISTS payment_provider_configs").
		WillReturnResult(sqlmock.NewResult(0, 0))
	if err := store.Migrate(context.Background()); err != nil {
		t.Fatalf("Migrate error: %v", err)
	}

	mock.ExpectExec("CREATE TABLE IF NOT EXISTS payment_provider_configs").
		WillReturnError(errors.New("ddl failed"))
	if err := store.Migrate(context.Background()); err == nil || !strings.Contains(err.Error(), "创建 payment_provider_configs 表失败") {
		t.Fatalf("Migrate failure = %v", err)
	}

	mock.ExpectExec("INSERT INTO payment_provider_configs").
		WithArgs("main", KindEpayCaihong, true, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 1))
	if err := store.Upsert(context.Background(), ConfigRecord{
		ID:      "main",
		Kind:    KindEpayCaihong,
		Enabled: true,
		Config:  map[string]string{"pid": "p", "key": "k"},
	}); err != nil {
		t.Fatalf("Upsert error: %v", err)
	}

	for _, record := range []ConfigRecord{
		{Kind: KindEpayCaihong},
		{ID: "missing-kind"},
	} {
		if err := store.Upsert(context.Background(), record); err == nil || !strings.Contains(err.Error(), "缺少 id 或 kind") {
			t.Fatalf("Upsert(%+v) error = %v, want missing id/kind", record, err)
		}
	}

	mock.ExpectExec("INSERT INTO payment_provider_configs").
		WithArgs("main", KindEpayCaihong, false, sqlmock.AnyArg()).
		WillReturnError(errors.New("upsert failed"))
	if err := store.Upsert(context.Background(), ConfigRecord{ID: "main", Kind: KindEpayCaihong}); err == nil || !strings.Contains(err.Error(), "upsert provider 配置失败") {
		t.Fatalf("Upsert exec failure = %v", err)
	}

	mock.ExpectExec("DELETE FROM payment_provider_configs").
		WithArgs("main").
		WillReturnResult(sqlmock.NewResult(0, 1))
	if err := store.Delete(context.Background(), "main"); err != nil {
		t.Fatalf("Delete error: %v", err)
	}
	mock.ExpectExec("DELETE FROM payment_provider_configs").
		WithArgs("main").
		WillReturnError(errors.New("delete failed"))
	if err := store.Delete(context.Background(), "main"); err == nil || !strings.Contains(err.Error(), "删除 provider 配置失败") {
		t.Fatalf("Delete failure = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestStoreListAndGet(t *testing.T) {
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New error: %v", err)
	}
	defer func() { _ = db.Close() }()
	store := NewStore(db)

	mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
		WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}).
			AddRow("a", KindEpayCaihong, true, []byte(`{"pid":"p"}`), now, now).
			AddRow("b", KindEpayXunhu, false, []byte(`{}`), now, now))
	list, err := store.List(context.Background())
	if err != nil {
		t.Fatalf("List error: %v", err)
	}
	if len(list) != 2 || list[0].ID != "a" || list[0].Config["pid"] != "p" || list[1].Config == nil {
		t.Fatalf("List result mismatch: %#v", list)
	}

	mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
		WithArgs("a").
		WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}).
			AddRow("a", KindEpayCaihong, true, []byte(`{"key":"secret"}`), now, now))
	rec, err := store.Get(context.Background(), "a")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if rec == nil || rec.Config["key"] != "secret" || rec.CreatedAt != now {
		t.Fatalf("Get result mismatch: %#v", rec)
	}

	mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
		WithArgs("missing").
		WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}))
	rec, err = store.Get(context.Background(), "missing")
	if err != nil || rec != nil {
		t.Fatalf("Get missing = (%#v, %v), want nil nil", rec, err)
	}

	mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
		WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}).
			AddRow("bad", KindEpayCaihong, true, []byte(`{bad`), now, now))
	if _, err := store.List(context.Background()); err == nil || !strings.Contains(err.Error(), "解析 provider bad 配置失败") {
		t.Fatalf("List malformed JSON error = %v", err)
	}

	mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
		WillReturnError(errors.New("query failed"))
	if _, err := store.List(context.Background()); err == nil || !strings.Contains(err.Error(), "查询 provider 配置失败") {
		t.Fatalf("List query failure = %v", err)
	}

	mock.ExpectQuery("SELECT id, kind, enabled, config, created_at, updated_at").
		WithArgs("bad").
		WillReturnRows(sqlmock.NewRows([]string{"id", "kind", "enabled", "config", "created_at", "updated_at"}).
			AddRow("bad", KindEpayCaihong, true, []byte(`{bad`), now, now))
	if _, err := store.Get(context.Background(), "bad"); err == nil {
		t.Fatalf("Get malformed JSON error = nil")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestStoreNextIDForKind(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New error: %v", err)
	}
	defer func() { _ = db.Close() }()
	store := NewStore(db)

	mock.ExpectQuery("SELECT id FROM payment_provider_configs WHERE id LIKE").
		WithArgs(KindEpayXunhu + "_%").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).
			AddRow(KindEpayXunhu+"_1").
			AddRow(KindEpayXunhu+"_09").
			AddRow(KindEpayXunhu+"_backup").
			AddRow(KindEpayXunhu+"_0"))
	got, err := store.NextIDForKind(context.Background(), KindEpayXunhu)
	if err != nil {
		t.Fatalf("NextIDForKind error: %v", err)
	}
	if want := KindEpayXunhu + "_10"; got != want {
		t.Fatalf("NextIDForKind = %q, want %q", got, want)
	}

	mock.ExpectQuery("SELECT id FROM payment_provider_configs WHERE id LIKE").
		WithArgs(KindEpayXunhu + "_%").
		WillReturnError(errors.New("query failed"))
	if _, err := store.NextIDForKind(context.Background(), KindEpayXunhu); err == nil || !strings.Contains(err.Error(), "查询同 kind 实例 id 失败") {
		t.Fatalf("NextIDForKind query failure = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestStoreRename(t *testing.T) {
	t.Run("same id", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		if err := NewStore(db).Rename(context.Background(), "same", "same"); err != nil {
			t.Fatalf("Rename same id error: %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet expectations: %v", err)
		}
	})

	t.Run("success", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		store := NewStore(db)
		mock.ExpectBegin()
		mock.ExpectQuery("SELECT EXISTS").WithArgs("old").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))
		mock.ExpectQuery("SELECT EXISTS").WithArgs("new").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))
		mock.ExpectExec("UPDATE payment_provider_configs SET id").WithArgs("new", "old").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("UPDATE payment_orders SET provider_id").WithArgs("new", "old").WillReturnResult(sqlmock.NewResult(0, 3))
		mock.ExpectCommit()
		if err := store.Rename(context.Background(), "old", "new"); err != nil {
			t.Fatalf("Rename error: %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet expectations: %v", err)
		}
	})

	t.Run("old missing", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		store := NewStore(db)
		mock.ExpectBegin()
		mock.ExpectQuery("SELECT EXISTS").WithArgs("old").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))
		mock.ExpectRollback()
		err = store.Rename(context.Background(), "old", "new")
		if err == nil || !strings.Contains(err.Error(), "原实例 id") {
			t.Fatalf("Rename missing old error = %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet expectations: %v", err)
		}
	})

	t.Run("new conflict", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		store := NewStore(db)
		mock.ExpectBegin()
		mock.ExpectQuery("SELECT EXISTS").WithArgs("old").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))
		mock.ExpectQuery("SELECT EXISTS").WithArgs("new").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))
		mock.ExpectRollback()
		err = store.Rename(context.Background(), "old", "new")
		if err == nil || !strings.Contains(err.Error(), "已被占用") {
			t.Fatalf("Rename conflict error = %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet expectations: %v", err)
		}
	})

	t.Run("commit error", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock.New error: %v", err)
		}
		defer func() { _ = db.Close() }()
		store := NewStore(db)
		mock.ExpectBegin()
		mock.ExpectQuery("SELECT EXISTS").WithArgs("old").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))
		mock.ExpectQuery("SELECT EXISTS").WithArgs("new").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))
		mock.ExpectExec("UPDATE payment_provider_configs SET id").WithArgs("new", "old").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("UPDATE payment_orders SET provider_id").WithArgs("new", "old").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit().WillReturnError(errors.New("commit failed"))
		err = store.Rename(context.Background(), "old", "new")
		if err == nil || !strings.Contains(err.Error(), "提交事务失败") {
			t.Fatalf("Rename commit error = %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet expectations: %v", err)
		}
	})
}
