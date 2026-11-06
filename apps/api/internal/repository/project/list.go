package project

import (
	"context"

	"storytoon/internal/model"
)

// List returns all projects ordered by newest first.
func (i impl) List(ctx context.Context) ([]model.Project, error) {
	rows, err := i.db.QueryContext(ctx, `SELECT `+selectColumns+` FROM projects ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.Project
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
