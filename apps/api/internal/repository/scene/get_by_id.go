package scene

import (
	"context"

	"storytoon/internal/model"
)

// GetByID returns a scene by its ID or sql.ErrNoRows.
func (i impl) GetByID(ctx context.Context, id string) (model.Scene, error) {
	row := i.db.QueryRowContext(ctx, `SELECT `+selectColumns+` FROM scenes WHERE id = $1`, id)
	return scanScene(row)
}
