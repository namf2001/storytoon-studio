package response

// Response is the unified API response envelope.
type Response struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// NewResponse builds a unified API response.
func NewResponse(code, message string, data interface{}) Response {
	return Response{Code: code, Message: message, Data: data}
}
