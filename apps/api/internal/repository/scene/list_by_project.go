package scene

import (
	"context"

	"storytoon/internal/model"
)

// ListByProject returns all scenes of a project ordered by scene index.
func (i impl) ListByProject(ctx context.Context, projectID string) ([]model.Scene, error) {
	rows, err := i.db.QueryContext(ctx,
		`SELECT `+selectColumns+` FROM scenes WHERE project_id = $1 ORDER BY scene_index`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.Scene
	for rows.Next() {
		s, err := scanScene(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
