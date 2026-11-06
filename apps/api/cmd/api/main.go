package main

import (
	"storytoon/cmd/api/server"
	"storytoon/internal/logger"
)

func main() {
	if err := server.Run(server.LoadConfig()); err != nil {
		logger.ERROR.Fatalf("server stopped: %+v", err)
	}
}
