package server

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"

	"storytoon/internal/aiworker"
	projectctrl "storytoon/internal/controller/project"
	scenectrl "storytoon/internal/controller/scene"
	projecthandler "storytoon/internal/handler/rest/v1/project"
	scenehandler "storytoon/internal/handler/rest/v1/scene"
	"storytoon/internal/logger"
	"storytoon/internal/repository"
)

// Config holds server configuration.
type Config struct {
	DatabaseURL string
	Port        string
	AIWorkerURL string
	StorageDir  string
	PublicURL   string
}

// LoadConfig reads configuration from environment (and ../../.env if present).
func LoadConfig() Config {
	_ = godotenv.Load("../../.env", ".env")
	port := getenv("API_PORT", "8080")
	storage, _ := filepath.Abs(getenv("STORAGE_DIR", "../../storage"))
	return Config{
		DatabaseURL: getenv("DATABASE_URL", "postgres://storytoon:storytoon@localhost:5432/storytoon?sslmode=disable"),
		Port:        port,
		AIWorkerURL: getenv("AI_WORKER_URL", "http://localhost:8000"),
		StorageDir:  storage,
		PublicURL:   getenv("API_PUBLIC_URL", "http://localhost:"+port),
	}
}

// Run wires dependencies and starts the HTTP server.
func Run(cfg Config) error {
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return err
	}
	if err := db.Ping(); err != nil {
		return fmt.Errorf("db ping: %w", err)
	}
	if err := os.MkdirAll(cfg.StorageDir, 0o755); err != nil {
		return err
	}

	repo := repository.New(db)
	aiClient := aiworker.New(cfg.AIWorkerURL)
	mediaBase := cfg.PublicURL + "/media"
	projectCtrl := projectctrl.New(repo, aiClient, cfg.StorageDir, mediaBase)
	sceneCtrl := scenectrl.New(repo, aiClient, cfg.StorageDir, mediaBase)

	r := gin.Default()
	registerRoutes(r, cfg, projecthandler.New(projectCtrl), scenehandler.New(sceneCtrl))

	logger.INFO.Printf("API listening on :%s (storage=%s)", cfg.Port, cfg.StorageDir)
	return r.Run(":" + cfg.Port)
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
