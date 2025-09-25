package uek

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type ScheduleHeader struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

func (c *Client) GetHeaders(ctx context.Context, scheduleType ScheduleType, groupingName string) ([]ScheduleHeader, time.Time, error) {
	if c.cfg.Cache != nil {
		if headers, validUntil, ok := c.cfg.Cache.GetHeaders(ctx, scheduleType, groupingName); ok {
			return headers, validUntil, nil
		}
	}

	headersUrl := fmt.Sprintf("%s?typ=%s&grupa=%s&xml", baseUrl, scheduleType.asOriginal(), url.QueryEscape(groupingName))
	res, err := c.fetchAndUnmarshalXML(ctx, headersUrl)
	if err != nil {
		return nil, time.Time{}, err
	}
	expirationDate := time.Now().Add(c.cfg.CacheTimeHeaders)

	headers := res.extractHeaders(scheduleType)

	if c.cfg.Cache != nil {
		go c.cfg.Cache.PutHeaders(expirationDate, scheduleType, groupingName, headers)
	}

	return headers, expirationDate, nil
}

func (res *responseBody) extractHeaders(requestedScheduleType ScheduleType) []ScheduleHeader {
	headers := make([]ScheduleHeader, 0, len(res.Zasob))

	for _, originalHeader := range res.Zasob {
		receivedScheduleType, err := originalHeader.Typ.asNormal()
		if err != nil {
			continue
		}
		if receivedScheduleType != requestedScheduleType {
			continue
		}

		headerName := strings.TrimSpace(originalHeader.Nazwa)
		if headerName == "" {
			continue
		}

		headerId, err := strconv.Atoi(originalHeader.Id)
		if err != nil {
			continue
		}

		headers = append(headers, ScheduleHeader{
			Id:   headerId,
			Name: headerName,
		})
	}

	return headers
}
