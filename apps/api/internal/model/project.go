package model

import (
	"encoding/json"
	"time"
)

// Project statuses.
const (
	ProjectStatusDraft      = "draft"
	ProjectStatusProcessing = "processing"
	ProjectStatusReady      = "ready"
	ProjectStatusFailed     = "failed"
)

// Project is the database model of a storytelling project.
type Project struct {
	ID             string
	Title          string
	RawScript      string
	AudioPath      *string
	CaptionSrtPath *string
	CaptionVttPath *string
	DurationMs     int
	AspectRatio    string
	VideoType      string
	Status         string
	ErrorMessage   *string
	Characters     json.RawMessage
	Words          json.RawMessage
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
