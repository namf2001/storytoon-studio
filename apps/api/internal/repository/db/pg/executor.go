package pg

import (
	"context"
	"database/sql"
)

// ContextExecutor abstracts *sql.DB and *sql.Tx for repositories.
type ContextExecutor interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// BeginnerExecutor is a ContextExecutor that can also start transactions.
type BeginnerExecutor interface {
	ContextExecutor
	BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error)
}
