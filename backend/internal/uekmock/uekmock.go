package uekmock

import (
	"fmt"
	"net/url"
	"path"
	"strings"
)

func getMockResponseFilePathFromQuery(mockDirectoryPath string, query url.Values) string {
	return path.Join(mockDirectoryPath, fmt.Sprintf("%s-%s-%s-%s.xml", formatMockResponseKeyPart(query.Get("typ")), formatMockResponseKeyPart(query.Get("grupa")), formatMockResponseKeyPart(query.Get("id")), formatMockResponseKeyPart(query.Get("okres"))))
}

func formatMockResponseKeyPart(s string) string {
	if s == "" {
		return "_"
	}

	return strings.ReplaceAll(s, "*", "+")
}
