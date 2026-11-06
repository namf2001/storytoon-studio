package logger

import (
	"log"
	"os"
)

// INFO is the logger for informational messages.
var INFO = log.New(os.Stdout, "[INFO] ", log.LstdFlags|log.Lmsgprefix)

// ERROR is the logger for error messages.
var ERROR = log.New(os.Stderr, "[ERROR] ", log.LstdFlags|log.Lmsgprefix)
