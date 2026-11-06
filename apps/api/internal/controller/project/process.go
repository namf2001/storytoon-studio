package project

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"

	"storytoon/internal/aiworker"
	"storytoon/internal/logger"
	"storytoon/internal/model"
	"storytoon/internal/repository"
)

// Process starts the async AI pipeline (voice, captions, scenes) for a project.
func (i impl) Process(ctx context.Context, id, voiceID string) error {
	p, err := i.repo.Project().GetByID(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if p.Status == model.ProjectStatusProcessing {
		return ErrBusy
	}
	if strings.TrimSpace(p.RawScript) == "" {
		return ErrEmptyScript
	}
	if err := i.repo.Project().UpdateStatus(ctx, id, model.ProjectStatusProcessing, nil); err != nil {
		return err
	}
	go i.runPipeline(context.Background(), p, voiceID)
	return nil
}

func (i impl) runPipeline(ctx context.Context, p model.Project, voiceID string) {
	res, err := i.ai.Process(ctx, p.ID, p.RawScript, voiceID, p.VideoType)
	if err == nil {
		err = i.saveResult(ctx, p.ID, res)
	}
	if err != nil {
		logger.ERROR.Printf("[ProjectProcess] project %s failed: %+v", p.ID, err)
		msg := err.Error()
		if uErr := i.repo.Project().UpdateStatus(ctx, p.ID, model.ProjectStatusFailed, &msg); uErr != nil {
			logger.ERROR.Printf("[ProjectProcess] update status failed: %+v", uErr)
		}
		return
	}
	logger.INFO.Printf("[ProjectProcess] project %s ready with %d scenes", p.ID, len(res.Scenes))
}

func (i impl) saveResult(ctx context.Context, projectID string, res aiworker.ProcessResult) error {
	scenes := make([]model.Scene, 0, len(res.Scenes))
	for _, s := range res.Scenes {
		chars, _ := json.Marshal(s.Characters)
		scenes = append(scenes, model.Scene{
			ID: uuid.NewString(), ProjectID: projectID, SceneIndex: s.SceneIndex,
			StartMs: s.StartMs, EndMs: s.EndMs, TranscriptText: s.TranscriptText,
			Setting: s.Setting, Characters: chars, ImagePrompt: s.ImagePrompt,
			CameraEffect: orDefault(s.CameraEffect, "zoom_in"), Transition: orDefault(s.Transition, "cut"),
			ShowCaption: true,
		})
	}
	return i.repo.DoInTx(ctx, func(ctx context.Context, txRepo repository.Registry) error {
		if err := txRepo.Project().UpdateProcessingResult(ctx, model.Project{
			ID: projectID, AudioPath: &res.AudioPath, CaptionSrtPath: &res.SrtPath,
			CaptionVttPath: &res.VttPath, DurationMs: res.DurationMs,
			Characters: rawOrEmpty(res.Characters), Words: rawOrEmpty(res.Words),
			Status: model.ProjectStatusReady,
		}); err != nil {
			return err
		}
		return txRepo.Scene().ReplaceForProject(ctx, projectID, scenes)
	}, nil)
}

func orDefault(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

func rawOrEmpty(r json.RawMessage) json.RawMessage {
	if len(r) == 0 || string(r) == "null" {
		return json.RawMessage("[]")
	}
	return r
}
