package aiworker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Scene is a scene returned by the AI worker breakdown.
type Scene struct {
	SceneIndex     int      `json:"sceneIndex"`
	StartMs        int      `json:"startMs"`
	EndMs          int      `json:"endMs"`
	TranscriptText string   `json:"transcriptText"`
	Setting        string   `json:"setting"`
	Characters     []string `json:"characters"`
	ImagePrompt    string   `json:"imagePrompt"`
	CameraEffect   string   `json:"cameraEffect"`
	Transition     string   `json:"transition"`
}

// ProcessResult is the output of the full AI pipeline.
type ProcessResult struct {
	Engine     string          `json:"engine"`
	AudioPath  string          `json:"audioPath"`
	SrtPath    string          `json:"srtPath"`
	VttPath    string          `json:"vttPath"`
	DurationMs int             `json:"durationMs"`
	Words      json.RawMessage `json:"words"`
	Characters json.RawMessage `json:"characters"`
	Scenes     []Scene         `json:"scenes"`
}

// GenerateImageInput holds parameters for generating a single scene illustration.
type GenerateImageInput struct {
	ProjectID   string `json:"project_id"`
	SceneIndex  int    `json:"scene_index"`
	Prompt      string `json:"prompt"`
	AspectRatio string `json:"aspect_ratio"`
}

// GenerateImageResult contains the storage-relative image path returned by the AI worker.
type GenerateImageResult struct {
	ImagePath string `json:"imagePath"`
}

// Client calls the Python AI worker.
type Client interface {
	Process(ctx context.Context, projectID, script, voiceID, videoType string) (ProcessResult, error)
	GenerateSceneImage(ctx context.Context, input GenerateImageInput) (GenerateImageResult, error)
}

type impl struct {
	baseURL string
	http    *http.Client
}

// New creates an AI worker Client.
func New(baseURL string) Client {
	return impl{baseURL: baseURL, http: &http.Client{Timeout: 30 * time.Minute}}
}

// Process runs TTS, captioning and scene breakdown for a script using the requested voiceID.
func (i impl) Process(ctx context.Context, projectID, script, voiceID, videoType string) (ProcessResult, error) {
	var out ProcessResult
	payload := map[string]string{
		"project_id": projectID,
		"script":     script,
	}
	if voiceID != "" {
		payload["voice_id"] = voiceID
	}
	if videoType != "" {
		payload["video_type"] = videoType
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, i.baseURL+"/process", bytes.NewReader(body))
	if err != nil {
		return out, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := i.http.Do(req)
	if err != nil {
		return out, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return out, fmt.Errorf("ai-worker %d: %s", resp.StatusCode, string(b))
	}
	return out, json.NewDecoder(resp.Body).Decode(&out)
}

// GenerateSceneImage requests a FLUX.1-schnell 2D cartoon illustration for a scene.
func (i impl) GenerateSceneImage(ctx context.Context, input GenerateImageInput) (GenerateImageResult, error) {
	var out GenerateImageResult
	body, _ := json.Marshal(input)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, i.baseURL+"/generate-image", bytes.NewReader(body))
	if err != nil {
		return out, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := i.http.Do(req)
	if err != nil {
		return out, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return out, fmt.Errorf("ai-worker %d: %s", resp.StatusCode, string(b))
	}
	return out, json.NewDecoder(resp.Body).Decode(&out)
}
