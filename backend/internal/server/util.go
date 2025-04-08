package server

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"
)

func respondJSON(w http.ResponseWriter, val any) {
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(val)
}

func respondNotFound(w http.ResponseWriter) {
	http.Error(w, "Not Found", http.StatusNotFound)
}

func respondBadRequest(w http.ResponseWriter) {
	http.Error(w, "Bad Request", http.StatusBadRequest)
}

func respondInternalServerError(w http.ResponseWriter) {
	http.Error(w, "Internal Server Error", http.StatusInternalServerError)
}

func respondServiceUnavailable(w http.ResponseWriter) {
	http.Error(w, "Service Unavailable", http.StatusServiceUnavailable)
}

func setCacheHeader(w http.ResponseWriter, expirationDate time.Time) {
	maxAge := int(math.Ceil(time.Until(expirationDate).Seconds()))
	if maxAge > 0 {
		w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAge))
	}
}
