package project

import (
	"context"

	"storytoon/internal/model"
)

// List returns all projects ordered by newest first, each with the media path of
// its first scene that has one (used as the listing thumbnail).
func (i impl) List(ctx context.Context) ([]model.Project, error) {
	rows, err := i.db.QueryContext(ctx, `SELECT `+selectColumns+`,
		(SELECT s.image_path FROM scenes s
		  WHERE s.project_id = projects.id AND s.image_path IS NOT NULL AND s.image_path <> ''
		  ORDER BY s.scene_index LIMIT 1) AS thumbnail_path
		FROM projects ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.Project
	for rows.Next() {
		var p model.Project
		err := rows.Scan(&p.ID, &p.Title, &p.RawScript, &p.AudioPath, &p.CaptionSrtPath, &p.CaptionVttPath,
			&p.DurationMs, &p.AspectRatio, &p.VideoType, &p.Status, &p.ErrorMessage, &p.Characters, &p.Words,
			&p.CreatedAt, &p.UpdatedAt, &p.ThumbnailPath)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
