package server

import (
	"embed"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"mime"
	"net/http"
	"path"
	"strings"
)

//go:embed static/*
var staticFS embed.FS

type staticAssetMetadata struct {
	contentType  string
	cacheControl string
}

func (srv *Server) registerStaticRoutes() {
	srv.httpServer.Handler.(*http.ServeMux).HandleFunc("GET /", srv.debugLoggingMiddleware(srv.handleStaticAssetRequest))
}

func (srv *Server) handleStaticAssetRequest(w http.ResponseWriter, r *http.Request) {
	reqPath := r.URL.Path
	if reqPath == "/" {
		reqPath = "/index.html"
	}
	filePath := path.Join("static", reqPath)

	f, err := staticFS.Open(filePath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			respondNotFound(w)
			return
		}
		respondInternalServerError(w)
		srv.logger.Error("Failed to open static asset file", slog.String("reqPath", reqPath), slog.Any("err", err))
		return
	}
	defer f.Close()

	assetMetadata, err := srv.getOrCreateStaticAssetMetadata(filePath)
	if err != nil {
		respondInternalServerError(w)
		srv.logger.Error("Failed to get static asset metadata", slog.String("reqPath", reqPath), slog.Any("err", err))
		return
	}

	headers := w.Header()
	headers.Set("Content-Type", assetMetadata.contentType)
	headers.Set("Cache-Control", assetMetadata.cacheControl)
	w.WriteHeader(http.StatusOK)

	buff := *srv.bufferPool.Get().(*[]byte)
	defer srv.bufferPool.Put(&buff)
	io.CopyBuffer(w, f, buff)

}

func (srv *Server) getOrCreateStaticAssetMetadata(filePath string) (staticAssetMetadata, error) {
	srv.staticAssetPathToMetadataMu.RLock()
	existingMetadata, hasExistingMetadata := srv.staticAssetPathToMetadata[filePath]
	srv.staticAssetPathToMetadataMu.RUnlock()

	if hasExistingMetadata {
		return existingMetadata, nil
	}

	newMetadata := staticAssetMetadata{
		cacheControl: determineStaticAssetCacheControl(filePath),
	}

	var err error
	if newMetadata.contentType, err = srv.determineStaticAssetContentType(filePath); err != nil {
		return staticAssetMetadata{}, fmt.Errorf("failed to determine content type: %w", err)
	}

	srv.staticAssetPathToMetadataMu.Lock()
	srv.staticAssetPathToMetadata[filePath] = newMetadata
	srv.staticAssetPathToMetadataMu.Unlock()

	return newMetadata, nil
}

func (srv *Server) determineStaticAssetContentType(filePath string) (string, error) {
	fileExtension := path.Ext(filePath)

	if fileExtension == ".webmanifest" {
		return "application/json", nil
	}

	if contentTypeFromExtension := mime.TypeByExtension(fileExtension); contentTypeFromExtension != "" {
		return contentTypeFromExtension, nil
	}

	f, err := staticFS.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	buff := *srv.bufferPool.Get().(*[]byte)
	defer srv.bufferPool.Put(&buff)

	n, err := io.ReadFull(f, buff)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	return http.DetectContentType(buff[:n]), nil
}

func determineStaticAssetCacheControl(filePath string) string {
	if strings.HasPrefix(filePath, "static/assets/") {
		return "public, immutable, max-age=31536000"
	}

	return "no-cache"
}
