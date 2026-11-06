package project

import (
	"context"

	"storytoon/internal/model"
)

// Create inserts a new project and returns the stored record.
func (i impl) Create(ctx context.Context, p model.Project) (model.Project, error) {
	if p.VideoType == "" {
		p.VideoType = "storytoon"
	}
	row := i.db.QueryRowContext(ctx, `
		INSERT INTO projects (id, title, raw_script, aspect_ratio, video_type, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+selectColumns,
		p.ID, p.Title, p.RawScript, p.AspectRatio, p.VideoType, p.Status)
	return scanProject(row)
}
