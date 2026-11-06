package project

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"

	"storytoon/internal/model"
	"storytoon/internal/repository"
)

// SceneInput holds the scene payload when saving or replacing scenes of a project.
type SceneInput struct {
	ID             string          `json:"id"`
	SceneIndex     int             `json:"sceneIndex"`
	StartMs        int             `json:"startMs"`
	EndMs          int             `json:"endMs"`
	TranscriptText string          `json:"transcriptText"`
	Setting        string          `json:"setting"`
	Characters     json.RawMessage `json:"characters"`
	ImagePrompt    string          `json:"imagePrompt"`
	ImageURL       *string         `json:"imageUrl"`
	CameraEffect   string          `json:"cameraEffect"`
	Transition     string          `json:"transition"`
	ShowCaption    bool            `json:"showCaption"`
	LayoutType     string          `json:"layoutType"`
	Layers         json.RawMessage `json:"layers"`
	CalloutTag     string          `json:"calloutTag"`
	CalloutText    string          `json:"calloutText"`
	CalloutPosition string         `json:"calloutPosition"`
	CalloutTheme   string          `json:"calloutTheme"`
}

// SaveScenes replaces all scenes of a project in a transaction.
func (i impl) SaveScenes(ctx context.Context, projectID string, input []SceneInput) ([]SceneOutput, error) {
	_, err := i.repo.Project().GetByID(ctx, projectID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	modelScenes := make([]model.Scene, len(input))
	prefix := strings.TrimRight(i.mediaBaseURL, "/") + "/"

	for idx, s := range input {
		scID := strings.TrimSpace(s.ID)
		if scID == "" {
			scID = uuid.NewString()
		}
		var imgPath *string
		if s.ImageURL != nil && strings.TrimSpace(*s.ImageURL) != "" {
			raw := strings.TrimSpace(*s.ImageURL)
			if strings.HasPrefix(raw, prefix) {
				raw = strings.TrimPrefix(raw, prefix)
			}
			imgPath = &raw
		}

		cam := s.CameraEffect
		if cam == "" {
			cam = "static"
		}
		trans := s.Transition
		if trans == "" {
			trans = "cut"
		}
		chars := s.Characters
		if len(chars) == 0 {
			chars = json.RawMessage("[]")
		}

		layoutType := s.LayoutType
		if layoutType == "" {
			layoutType = "standard"
		}
		layers := s.Layers
		if len(layers) == 0 {
			layers = json.RawMessage("[]")
		}

		modelScenes[idx] = model.Scene{
			ID:             scID,
			ProjectID:      projectID,
			SceneIndex:     idx + 1,
			StartMs:        s.StartMs,
			EndMs:          s.EndMs,
			TranscriptText: s.TranscriptText,
			Setting:        s.Setting,
			Characters:     chars,
			ImagePrompt:    s.ImagePrompt,
			ImagePath:      imgPath,
			CameraEffect:   cam,
			Transition:     trans,
			ShowCaption:    s.ShowCaption,
			LayoutType:     layoutType,
			Layers:         layers,
			CalloutTag:     s.CalloutTag,
			CalloutText:    s.CalloutText,
			CalloutPosition: s.CalloutPosition,
			CalloutTheme:   s.CalloutTheme,
		}
	}

	err = i.repo.DoInTx(ctx, func(ctx context.Context, txRepo repository.Registry) error {
		return txRepo.Scene().ReplaceForProject(ctx, projectID, modelScenes)
	}, nil)
	if err != nil {
		return nil, err
	}

	stored, err := i.repo.Scene().ListByProject(ctx, projectID)
	if err != nil {
		return nil, err
	}

	outputs := make([]SceneOutput, len(stored))
	for idx, s := range stored {
		stLayout := s.LayoutType
		if stLayout == "" {
			stLayout = "standard"
		}
		stLayers := s.Layers
		if len(stLayers) == 0 {
			stLayers = json.RawMessage("[]")
		}
		outputs[idx] = SceneOutput{
			ID:             s.ID,
			SceneIndex:     s.SceneIndex,
			StartMs:        s.StartMs,
			EndMs:          s.EndMs,
			TranscriptText: s.TranscriptText,
			Setting:        s.Setting,
			Characters:     s.Characters,
			ImagePrompt:    s.ImagePrompt,
			ImageURL:       i.mediaURL(s.ImagePath),
			CameraEffect:   s.CameraEffect,
			Transition:     s.Transition,
			ShowCaption:    s.ShowCaption,
			LayoutType:     stLayout,
			Layers:         stLayers,
			CalloutTag:     s.CalloutTag,
			CalloutText:    s.CalloutText,
			CalloutPosition: s.CalloutPosition,
			CalloutTheme:   s.CalloutTheme,
		}
	}
	return outputs, nil
}
