package uek

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/http"
	"time"

	"github.com/patrickmn/go-cache"
)

const baseUrl = "https://planzajec.uek.krakow.pl/index.php"
const UserAgent = "uek-planzajec-v3/1.0 (+https://uek-planzajec-v3.fly.dev)"

type ClientConfig struct {
	HttpClient          *http.Client
	CacheTimeGroupings  time.Duration
	CacheTimeHeaders    time.Duration
	CacheTimeSchedules  time.Duration
	CurrentYearPeriodId int
	LastYearPeriodId    int
}

func (cfg *ClientConfig) validate() error {
	if cfg.CurrentYearPeriodId <= 0 {
		return fmt.Errorf("invalid or missing current year period id")
	}

	if cfg.LastYearPeriodId <= 0 {
		return fmt.Errorf("invalid or missing last year period id")
	}

	return nil
}

type Client struct {
	httpClient             *http.Client
	cacheStore             *cache.Cache
	cacheTimeGroupings     time.Duration
	cacheTimeHeaders       time.Duration
	cacheTimeSchedules     time.Duration
	currentYearPeriodId    int
	lastYearPeriodId       int
	selfRateLimitSemaphore chan struct{}
}

func NewClient(cfg *ClientConfig) (*Client, error) {
	if err := cfg.validate(); err != nil {
		return nil, err
	}

	client := &Client{
		httpClient:          cfg.HttpClient,
		cacheStore:          cache.New(0, time.Minute),
		cacheTimeGroupings:  cfg.CacheTimeGroupings,
		cacheTimeHeaders:    cfg.CacheTimeHeaders,
		cacheTimeSchedules:  cfg.CacheTimeSchedules,
		currentYearPeriodId: cfg.CurrentYearPeriodId,
		lastYearPeriodId:    cfg.LastYearPeriodId,
		// when there are 2+ concurrent requests response times get extremely long - waterfalls are faster
		// 2+1 requests - 300-400ms, 3 requests - 1000+ms
		selfRateLimitSemaphore: make(chan struct{}, 2),
	}

	if client.httpClient == nil {
		client.httpClient = http.DefaultClient
	}

	return client, nil
}

func (c *Client) fetchAndUnmarshalXML(ctx context.Context, targetUrl string, valuePointer any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetUrl, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Content-Type", "application/xml")

	c.selfRateLimitSemaphore <- struct{}{}
	defer func() {
		<-c.selfRateLimitSemaphore
	}()

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

func withCache[T any](cacheStore *cache.Cache, cacheKey string, cacheDuration time.Duration, getFreshValue func() (T, error)) (T, time.Time, error) {
	if cachedValue, cachedValueExpirationDate, found := cacheStore.GetWithExpiration(cacheKey); found {
		return cachedValue.(T), cachedValueExpirationDate, nil
	}

	freshValue, err := getFreshValue()
	if err != nil {
		return *new(T), time.Time{}, err
	}

	if cacheDuration > 0 {
		cacheStore.Set(cacheKey, freshValue, cacheDuration)
	}

	return freshValue, time.Now().Add(cacheDuration), nil
}
