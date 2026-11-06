package scene

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
)

// UpdateInput holds optional scene fields to update.
type UpdateInput struct {
	ImagePrompt    *string
	ImageURL       *string
	Setting        *string
	CameraEffect   *string
	Transition     *string
	ShowCaption    *bool
	StartMs        *int
	EndMs          *int
	TranscriptText *string
	SceneIndex     *int
	LayoutType     *string
	Layers         *json.RawMessage
	CalloutTag     *string
	CalloutText    *string
	CalloutPosition *string
	CalloutTheme   *string
}

var validEffects = map[string]bool{
	"static": true, "zoom_in": true, "zoom_out": true, "pan_left": true, "pan_right": true, "shake": true,
}
var validTransitions = map[string]bool{
	"cut": true, "fade": true, "slide": true, "wipe": true, "flip": true,
}

// Update applies user edits (effect, transition, prompt, image/video URL, caption toggle) to a scene.
func (i impl) Update(ctx context.Context, id string, input UpdateInput) (Output, error) {
	s, err := i.repo.Scene().GetByID(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Output{}, ErrNotFound
	}
	if err != nil {
		return Output{}, err
	}
	if input.CameraEffect != nil {
		if !validEffects[*input.CameraEffect] {
			return Output{}, ErrInvalidInput
		}
		s.CameraEffect = *input.CameraEffect
	}
	if input.Transition != nil {
		if !validTransitions[*input.Transition] {
			return Output{}, ErrInvalidInput
		}
		s.Transition = *input.Transition
	}
	if input.ImagePrompt != nil {
		s.ImagePrompt = *input.ImagePrompt
	}
	if input.ImageURL != nil {
		raw := strings.TrimSpace(*input.ImageURL)
		prefix := strings.TrimRight(i.mediaBaseURL, "/") + "/"
		if strings.HasPrefix(raw, prefix) {
			raw = strings.TrimPrefix(raw, prefix)
		}
		if raw == "" {
			s.ImagePath = nil
		} else {
			s.ImagePath = &raw
		}
	}
	if input.Setting != nil {
		s.Setting = *input.Setting
	}
	if input.ShowCaption != nil {
		s.ShowCaption = *input.ShowCaption
	}
	if input.StartMs != nil {
		s.StartMs = *input.StartMs
	}
	if input.EndMs != nil {
		s.EndMs = *input.EndMs
	}
	if input.TranscriptText != nil {
		s.TranscriptText = *input.TranscriptText
	}
	if input.SceneIndex != nil {
		s.SceneIndex = *input.SceneIndex
	}
	if input.LayoutType != nil {
		s.LayoutType = *input.LayoutType
	}
	if input.Layers != nil {
		s.Layers = *input.Layers
	}
	if input.CalloutTag != nil {
		s.CalloutTag = *input.CalloutTag
	}
	if input.CalloutText != nil {
		s.CalloutText = *input.CalloutText
	}
	if input.CalloutPosition != nil {
		s.CalloutPosition = *input.CalloutPosition
	}
	if input.CalloutTheme != nil {
		s.CalloutTheme = *input.CalloutTheme
	}
	updated, err := i.repo.Scene().Update(ctx, s)
	if err != nil {
		return Output{}, err
	}
	return i.toOutput(updated), nil
}
