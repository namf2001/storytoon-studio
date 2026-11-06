package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"storytoon/internal/repository/db/pg"
	"storytoon/internal/repository/project"
	"storytoon/internal/repository/scene"
)

// TxOptions configures DoInTx behaviour.
type TxOptions struct {
	MaxRetries int
	Isolation  sql.IsolationLevel
}

// Registry is the single entry point to every repository.
type Registry interface {
	Project() project.Repository
	Scene() scene.Repository
	DoInTx(ctx context.Context, fn func(ctx context.Context, txRepo Registry) error, opts *TxOptions) error
}

type impl struct {
	db pg.BeginnerExecutor
	ex pg.ContextExecutor
}

// New creates a Registry backed by the given database.
func New(db pg.BeginnerExecutor) Registry {
	return impl{db: db, ex: db}
}

// Project returns the project repository.
func (i impl) Project() project.Repository { return project.New(i.ex) }

// Scene returns the scene repository.
func (i impl) Scene() scene.Repository { return scene.New(i.ex) }

// DoInTx runs fn inside a transaction, retrying with exponential backoff on serialization failures.
func (i impl) DoInTx(ctx context.Context, fn func(ctx context.Context, txRepo Registry) error, opts *TxOptions) error {
	if opts == nil {
		opts = &TxOptions{MaxRetries: 3}
	}
	backoff := 50 * time.Millisecond
	var err error
	for attempt := 0; attempt <= opts.MaxRetries; attempt++ {
		if err = i.runTx(ctx, fn, opts); err == nil || !isRetryable(err) {
			return err
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
		}
		backoff *= 2
	}
	return err
}

func (i impl) runTx(ctx context.Context, fn func(ctx context.Context, txRepo Registry) error, opts *TxOptions) (err error) {
	tx, err := i.db.BeginTx(ctx, &sql.TxOptions{Isolation: opts.Isolation})
	if err != nil {
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	if err = fn(ctx, impl{db: i.db, ex: tx}); err != nil {
		return err
	}
	return tx.Commit()
}

func isRetryable(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "40001" || pgErr.Code == "40P01"
	}
	return false
}
