package scene

import (
	"context"

	"storytoon/internal/model"
)

// Update saves user-editable fields of a scene and returns the stored record.
func (i impl) Update(ctx context.Context, s model.Scene) (model.Scene, error) {
	layoutType := s.LayoutType
	if layoutType == "" {
		layoutType = "standard"
	}
	layers := s.Layers
	if len(layers) == 0 {
		layers = []byte("[]")
	}
	row := i.db.QueryRowContext(ctx, `
		UPDATE scenes SET image_prompt = $2, image_path = $3, camera_effect = $4,
			transition = $5, show_caption = $6, setting = $7,
			start_ms = $8, end_ms = $9, transcript_text = $10, scene_index = $11,
			layout_type = $12, layers = $13,
			callout_tag = $14, callout_text = $15, callout_position = $16, callout_theme = $17
		WHERE id = $1
		RETURNING `+selectColumns,
		s.ID, s.ImagePrompt, s.ImagePath, s.CameraEffect, s.Transition, s.ShowCaption, s.Setting,
		s.StartMs, s.EndMs, s.TranscriptText, s.SceneIndex, layoutType, layers,
		s.CalloutTag, s.CalloutText, s.CalloutPosition, s.CalloutTheme)
	return scanScene(row)
}
