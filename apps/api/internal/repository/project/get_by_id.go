package project

import (
	"context"

	"storytoon/internal/model"
)

// GetByID returns a project by its ID or sql.ErrNoRows.
func (i impl) GetByID(ctx context.Context, id string) (model.Project, error) {
	row := i.db.QueryRowContext(ctx, `SELECT `+selectColumns+` FROM projects WHERE id = $1`, id)
	return scanProject(row)
}
