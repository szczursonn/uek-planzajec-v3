package server

import (
	"embed"
	"fmt"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
)

//go:embed static/*
var unscopedStaticFS embed.FS

func registerStaticRoutes(mux *http.ServeMux) error {
	staticFS, err := fs.Sub(unscopedStaticFS, "static")
	if err != nil {
		return err
	}

	patternToHandler := map[string]http.HandlerFunc{}

	if err := fs.WalkDir(staticFS, ".", func(filePath string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil
		}

		data, err := fs.ReadFile(staticFS, filePath)
		if err != nil {
			return err
		}

		fileExtension := path.Ext(filePath)
		contentTypeHeader := ""
		if fileExtension == ".webmanifest" {
			contentTypeHeader = "application/json"
		} else if contentTypeHeader = mime.TypeByExtension(fileExtension); contentTypeHeader == "" {
			contentTypeHeader = http.DetectContentType(data)
		}

		var cacheControlHeader string
		if strings.HasPrefix(filePath, "assets/") {
			cacheControlHeader = "public, immutable, max-age=31536000"
		} else {
			cacheControlHeader = "no-cache"
		}

		patternToHandler[fmt.Sprintf("GET /%s", filePath)] = createStaticRouteHandler(contentTypeHeader, cacheControlHeader, data)
		return nil
	}); err != nil {
		return err
	}

	if indexHtmlHandler, ok := patternToHandler["GET /index.html"]; ok {
		patternToHandler["GET /"] = indexHtmlHandler
	} else {
		patternToHandler["GET /"] = func(w http.ResponseWriter, r *http.Request) {
			respondNotFound(w)
		}
	}

	for pattern, handler := range patternToHandler {
		mux.HandleFunc(pattern, handler)
	}

	return nil
}

func createStaticRouteHandler(contentTypeHeader string, cacheControlHeader string, data []byte) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, _ *http.Request) {
		responseHeaders := w.Header()

		responseHeaders.Set("Content-Type", contentTypeHeader)
		responseHeaders.Set("Cache-Control", cacheControlHeader)

		w.Write(data)
	}
}
