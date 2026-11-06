package scene

import (
	"context"

	"storytoon/internal/model"
	"storytoon/internal/repository/db/pg"
)

// Repository provides persistence operations for scenes.
type Repository interface {
	ListByProject(ctx context.Context, projectID string) ([]model.Scene, error)
	GetByID(ctx context.Context, id string) (model.Scene, error)
	ReplaceForProject(ctx context.Context, projectID string, scenes []model.Scene) error
	Update(ctx context.Context, s model.Scene) (model.Scene, error)
}

type impl struct {
	db pg.ContextExecutor
}

// New creates a scene Repository.
func New(db pg.ContextExecutor) Repository {
	return impl{db: db}
}

const selectColumns = `id, project_id, scene_index, start_ms, end_ms, transcript_text, setting,
	characters, image_prompt, image_path, camera_effect, transition, show_caption, layout_type, layers,
	callout_tag, callout_text, callout_position, callout_theme`

type scanner interface {
	Scan(dest ...any) error
}

func scanScene(s scanner) (model.Scene, error) {
	var m model.Scene
	err := s.Scan(&m.ID, &m.ProjectID, &m.SceneIndex, &m.StartMs, &m.EndMs, &m.TranscriptText,
		&m.Setting, &m.Characters, &m.ImagePrompt, &m.ImagePath, &m.CameraEffect, &m.Transition,
		&m.ShowCaption, &m.LayoutType, &m.Layers,
		&m.CalloutTag, &m.CalloutText, &m.CalloutPosition, &m.CalloutTheme)
	return m, err
}
