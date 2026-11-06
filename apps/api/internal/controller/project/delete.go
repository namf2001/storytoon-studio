package project

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
)

// Delete verifies that the project exists, deletes it from DB, and removes its files from disk.
func (i impl) Delete(ctx context.Context, id string) error {
	_, err := i.repo.Project().GetByID(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if err := i.repo.Project().Delete(ctx, id); err != nil {
		return err
	}

	// Clean up project assets and rendered files on disk
	if i.storageDir != "" && id != "" {
		// 1. Remove project assets folder (voice, captions, images)
		projectDir := filepath.Join(i.storageDir, id)
		_ = os.RemoveAll(projectDir)

		// 2. Remove rendered video outputs in storage/renders/
		matches, _ := filepath.Glob(filepath.Join(i.storageDir, "renders", id+"*"))
		for _, f := range matches {
			_ = os.Remove(f)
		}
	}

	return nil
}
