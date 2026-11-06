package project

import (
	"context"
)

// Delete removes a project by its unique ID. Foreign keys with ON DELETE CASCADE remove associated scenes.
func (i impl) Delete(ctx context.Context, id string) error {
	_, err := i.db.ExecContext(ctx, `DELETE FROM projects WHERE id = $1`, id)
	return err
}
