package uekmock

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/szczursonn/uek-planzajec-v3/internal/config"
)

type RoundTripper struct {
	config.Mock
}

func (t *RoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	f, err := os.Open(getMockResponseFilePathFromQuery(t.DirectoryPath, req.URL.Query()))
	if err != nil {
		if t.Passthrough && strings.Contains(err.Error(), "cannot find") {
			return http.DefaultTransport.RoundTrip(req)
		}

		return nil, fmt.Errorf("failed to open mock file: %w", err)
	}

	if t.Delay > 0 {
		select {
		case <-req.Context().Done():
			return nil, req.Context().Err()
		case <-time.After(t.Delay):
		}
	}

	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{},
		Body:       f,
	}, nil
}
