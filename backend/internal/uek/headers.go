package uek

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type scheduleHeadersResponse struct {
	XMLName xml.Name `xml:"plan-zajec"`
	Zasob   []struct {
		Typ   originalScheduleType `xml:"typ,attr"`
		Id    string               `xml:"id,attr"`
		Nazwa string               `xml:"nazwa,attr"`
	} `xml:"zasob"`
}

type Header struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

func (c *Client) GetHeaders(ctx context.Context, scheduleType ScheduleType, groupingName string) ([]Header, time.Time, error) {
	return cacheMiddleware(c.cacheStore, fmt.Sprint("headers", scheduleType, groupingName), c.cacheTimeHeaders, func() ([]Header, error) {
		return c.getFreshHeaders(ctx, scheduleType, groupingName)
	})
}

func (c *Client) getFreshHeaders(ctx context.Context, scheduleType ScheduleType, groupingName string) ([]Header, error) {
	res := scheduleHeadersResponse{}
	if err := c.fetchAndDecodeXML(ctx, fmt.Sprintf("%s?typ=%s&grupa=%s&xml", baseUrl, scheduleType.denormalize(), url.QueryEscape(groupingName)), &res); err != nil {
		return nil, err
	}

	headers := make([]Header, 0, len(res.Zasob))
	for i, xmlHeader := range res.Zasob {
		if err := func() error {
			receivedScheduleType, err := xmlHeader.Typ.normalize()
			if err != nil {
				return err
			}
			if receivedScheduleType != scheduleType {
				return fmt.Errorf("received different schedule type than requested: %s", receivedScheduleType)
			}

			headerName := strings.TrimSpace(xmlHeader.Nazwa)
			if headerName == "" {
				return fmt.Errorf("missing name")
			}

			headerId, err := strconv.Atoi(xmlHeader.Id)
			if err != nil {
				return fmt.Errorf("cannot convert id to number: %w", err)
			}

			headers = append(headers, Header{
				Id:   headerId,
				Name: headerName,
			})

			return nil
		}(); err != nil {
			return nil, fmt.Errorf("%w at index %d", err, i)
		}
	}

	return headers, nil
}
