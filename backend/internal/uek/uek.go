package uek

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/http"
	"time"

	"github.com/patrickmn/go-cache"
	"github.com/szczursonn/uek-planzajec-v3/internal/version"
)

type Client struct {
	httpClient          *http.Client
	cacheStore          *cache.Cache
	cacheTimeGroupings  time.Duration
	cacheTimeHeaders    time.Duration
	cacheTimeSchedules  time.Duration
	currentYearPeriodId int
	lastYearPeriodId    int
}

type ClientConfig struct {
	HttpClient          *http.Client
	CacheTimeGroupings  time.Duration
	CacheTimeHeaders    time.Duration
	CacheTimeSchedules  time.Duration
	CurrentYearPeriodId int
	LastYearPeriodId    int
}

const baseUrl = "https://planzajec.uek.krakow.pl/index.php"

var userAgent = fmt.Sprintf("uek-planzajec-v3/%s (+https://uek-planzajec-v3.fly.dev)", version.AppVersion)

func NewClient(config ClientConfig) *Client {
	client := &Client{
		httpClient:          config.HttpClient,
		cacheStore:          cache.New(0, time.Minute),
		cacheTimeGroupings:  config.CacheTimeGroupings,
		cacheTimeHeaders:    config.CacheTimeHeaders,
		cacheTimeSchedules:  config.CacheTimeSchedules,
		currentYearPeriodId: config.CurrentYearPeriodId,
		lastYearPeriodId:    config.LastYearPeriodId,
	}

	if client.httpClient == nil {
		client.httpClient = http.DefaultClient
	}

	return client
}

func (c *Client) fetchAndDecodeXML(ctx context.Context, targetUrl string, valuePointer any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetUrl, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", userAgent)

	res, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to do request: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", res.StatusCode)
	}

	if err = xml.NewDecoder(res.Body).Decode(valuePointer); err != nil {
		return fmt.Errorf("failed to decode xml response: %w", err)
	}

	return nil
}

func cacheMiddleware[T any](cacheStore *cache.Cache, cacheKey string, cacheDuration time.Duration, getFreshValue func() (T, error)) (T, time.Time, error) {
	if cachedValue, cachedValueExpirationDate, found := cacheStore.GetWithExpiration(cacheKey); found {
		return cachedValue.(T), cachedValueExpirationDate, nil
	}

	freshValue, err := getFreshValue()
	if err != nil {
		return freshValue, time.Time{}, err
	}

	if cacheDuration > 0 {
		cacheStore.Set(cacheKey, freshValue, cacheDuration)
	}
	return freshValue, time.Now().Add(cacheDuration), nil
}
