package constants

// ResponseCode pairs a business code with a human-readable message.
type ResponseCode struct {
	Code    string
	Message string
}

var (
	// Success indicates the request completed successfully.
	Success = ResponseCode{"00", "Success"}
	// InvalidRequest indicates the request payload failed validation.
	InvalidRequest = ResponseCode{"ERR001", "Invalid request"}
	// NotFound indicates the requested resource does not exist.
	NotFound = ResponseCode{"ERR002", "Resource not found"}
	// InternalError indicates an unexpected server error.
	InternalError = ResponseCode{"ERR003", "Internal server error"}
	// ProjectBusy indicates the project is already being processed.
	ProjectBusy = ResponseCode{"ERR004", "Project is being processed"}
	// InvalidImage indicates the uploaded file is not a supported image.
	InvalidImage = ResponseCode{"ERR005", "Invalid image file"}
	// EmptyScript indicates the project has no script to process.
	EmptyScript = ResponseCode{"ERR006", "Script is empty"}
)
