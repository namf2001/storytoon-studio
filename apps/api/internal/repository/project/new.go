package project

import (
	"context"

	"storytoon/internal/model"
	"storytoon/internal/repository/db/pg"
)

// Repository provides persistence operations for projects.
type Repository interface {
	Create(ctx context.Context, p model.Project) (model.Project, error)
	GetByID(ctx context.Context, id string) (model.Project, error)
	List(ctx context.Context) ([]model.Project, error)
	UpdateStatus(ctx context.Context, id, status string, errMsg *string) error
	UpdateProcessingResult(ctx context.Context, p model.Project) error
	UpdateVoiceover(ctx context.Context, p model.Project) (model.Project, error)
	Delete(ctx context.Context, id string) error
}

type impl struct {
	db pg.ContextExecutor
}

// New creates a project Repository.
func New(db pg.ContextExecutor) Repository {
	return impl{db: db}
}

const selectColumns = `id, title, raw_script, audio_path, caption_srt_path, caption_vtt_path,
	duration_ms, aspect_ratio, video_type, status, error_message, characters, words, created_at, updated_at`

type scanner interface {
	Scan(dest ...any) error
}

func scanProject(s scanner) (model.Project, error) {
	var p model.Project
	err := s.Scan(&p.ID, &p.Title, &p.RawScript, &p.AudioPath, &p.CaptionSrtPath, &p.CaptionVttPath,
		&p.DurationMs, &p.AspectRatio, &p.VideoType, &p.Status, &p.ErrorMessage, &p.Characters, &p.Words,
		&p.CreatedAt, &p.UpdatedAt)
	return p, err
}
