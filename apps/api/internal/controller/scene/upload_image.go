package scene

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var allowedExt = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".webp": true,
	".mp4": true, ".webm": true, ".mov": true,
}

// UploadImage stores an image file for a scene and links it.
func (i impl) UploadImage(ctx context.Context, id, filename string, file io.Reader) (Output, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if !allowedExt[ext] {
		return Output{}, ErrInvalidImage
	}
	s, err := i.repo.Scene().GetByID(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Output{}, ErrNotFound
	}
	if err != nil {
		return Output{}, err
	}

	rel := filepath.ToSlash(filepath.Join(s.ProjectID, "images",
		fmt.Sprintf("scene_%03d_%d%s", s.SceneIndex, time.Now().Unix(), ext)))
	abs := filepath.Join(i.storageDir, rel)
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return Output{}, err
	}
	f, err := os.Create(abs)
	if err != nil {
		return Output{}, err
	}
	defer f.Close()
	if _, err := io.Copy(f, file); err != nil {
		return Output{}, err
	}

	s.ImagePath = &rel
	updated, err := i.repo.Scene().Update(ctx, s)
	if err != nil {
		return Output{}, err
	}
	return i.toOutput(updated), nil
}
