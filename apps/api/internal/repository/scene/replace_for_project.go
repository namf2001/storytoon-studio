package scene

import (
	"context"

	"storytoon/internal/model"
)

// ReplaceForProject deletes existing scenes of a project and inserts the given ones.
func (i impl) ReplaceForProject(ctx context.Context, projectID string, scenes []model.Scene) error {
	if _, err := i.db.ExecContext(ctx, `DELETE FROM scenes WHERE project_id = $1`, projectID); err != nil {
		return err
	}
	for _, s := range scenes {
		layoutType := s.LayoutType
		if layoutType == "" {
			layoutType = "standard"
		}
		layers := s.Layers
		if len(layers) == 0 {
			layers = []byte("[]")
		}
		_, err := i.db.ExecContext(ctx, `
			INSERT INTO scenes (id, project_id, scene_index, start_ms, end_ms, transcript_text,
				setting, characters, image_prompt, image_path, camera_effect, transition, show_caption, layout_type, layers,
				callout_tag, callout_text, callout_position, callout_theme)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
			s.ID, projectID, s.SceneIndex, s.StartMs, s.EndMs, s.TranscriptText, s.Setting,
			s.Characters, s.ImagePrompt, s.ImagePath, s.CameraEffect, s.Transition, s.ShowCaption, layoutType, layers,
			s.CalloutTag, s.CalloutText, s.CalloutPosition, s.CalloutTheme)
		if err != nil {
			return err
		}
	}
	return nil
}
