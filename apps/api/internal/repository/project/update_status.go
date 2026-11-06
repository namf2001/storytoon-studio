package project

import "context"

// UpdateStatus sets the status and optional error message of a project.
func (i impl) UpdateStatus(ctx context.Context, id, status string, errMsg *string) error {
	_, err := i.db.ExecContext(ctx,
		`UPDATE projects SET status = $2, error_message = $3, updated_at = now() WHERE id = $1`,
		id, status, errMsg)
	return err
}
