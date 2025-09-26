package uekmock

import (
	"context"
	"io"
	"net/http"
	"os"

	"github.com/go-xmlfmt/xmlfmt"
	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
)

func DownloadResponse(ctx context.Context, directoryPath string, urlAsString string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlAsString, nil)
	if err != nil {
		return err
	}

	queryParams := req.URL.Query()
	queryParams.Set("xml", "")
	req.URL.RawQuery = queryParams.Encode()

	req.Header.Set("User-Agent", uek.UserAgent)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	xmlBuff, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}

	os.Mkdir(directoryPath, 0644)

	return os.WriteFile(getMockResponseFilePathFromQuery(directoryPath, queryParams), []byte(xmlfmt.FormatXML(string(xmlBuff), "", "\t")), 0644)
}
