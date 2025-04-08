package uekmock

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type mockRoundTripper struct {
	passThrough bool
	delay       time.Duration
}

func RoundTripper(passThrough bool, delay time.Duration) http.RoundTripper {
	return &mockRoundTripper{
		passThrough: passThrough,
		delay:       delay,
	}
}

func (t *mockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	f, err := os.OpenFile(getMockResponseFilePathFromQuery(req.URL.Query()), os.O_RDONLY, 0)
	if err != nil {
		if t.passThrough && strings.Contains(err.Error(), "cannot find") {
			return http.DefaultTransport.RoundTrip(req)
		}

		return nil, fmt.Errorf("failed to open mock file: %w", err)
	}

	if t.delay > 0 {
		select {
		case <-req.Context().Done():
			return nil, req.Context().Err()
		case <-time.After(t.delay):
		}
	}

	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{},
		Body:       f,
	}, nil
}
