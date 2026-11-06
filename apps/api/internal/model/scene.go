package model

import "encoding/json"

// Scene is the database model of a single scene in a project.
type Scene struct {
	ID             string
	ProjectID      string
	SceneIndex     int
	StartMs        int
	EndMs          int
	TranscriptText string
	Setting        string
	Characters     json.RawMessage
	ImagePrompt    string
	ImagePath      *string
	CameraEffect   string
	Transition     string
	ShowCaption    bool
	LayoutType     string
	Layers         json.RawMessage
	CalloutTag     string
	CalloutText    string
	CalloutPosition string
	CalloutTheme   string
}
