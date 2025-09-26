package server

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/szczursonn/uek-planzajec-v3/internal/uek"
)

const maxSchedulesPerRequest = 3

func (srv *Server) registerAPIRoutes() {
	mux := srv.httpServer.Handler.(*http.ServeMux)

	mux.HandleFunc("GET /api/", srv.debugLoggingMiddleware(func(w http.ResponseWriter, r *http.Request) {
		respondNotFound(w)
	}))
	mux.HandleFunc("GET /api/groupings", srv.debugLoggingMiddleware(srv.handleGroupings))
	mux.HandleFunc("GET /api/headers", srv.debugLoggingMiddleware(srv.handleHeaders))
	mux.HandleFunc("GET /api/aggregateSchedule", srv.debugLoggingMiddleware(srv.handleAggregateSchedule))
	mux.HandleFunc("GET /api/ical/{payload}", srv.debugLoggingMiddleware(srv.handleICal))
}

func (srv *Server) handleGroupings(w http.ResponseWriter, r *http.Request) {
	groupings, cacheExpirationDate, err := srv.uek.GetGroupings(r.Context())
	if err != nil {
		if !errors.Is(err, context.Canceled) {
			srv.logger.Error("Failed to get groupings", slog.Any("err", err))
		}
		respondServiceUnavailable(w)
		return
	}

	setCacheHeader(w, cacheExpirationDate)
	respondJSON(w, groupings)
}

func (srv *Server) handleHeaders(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	scheduleType, groupingName := uek.ScheduleType(q.Get("type")), q.Get("grouping")

	if !scheduleType.IsValid() {
		respondBadRequest(w)
		return
	}

	headers, cacheExpirationDate, err := srv.uek.GetHeaders(r.Context(), scheduleType, groupingName)
	if err != nil {
		if !errors.Is(err, context.Canceled) {
			srv.logger.Error("Failed to get headers", slog.Group("params", slog.String("scheduleType", string(scheduleType)), slog.String("groupingName", groupingName)), slog.Any("err", err))
		}
		respondServiceUnavailable(w)
		return
	}

	setCacheHeader(w, cacheExpirationDate)
	respondJSON(w, headers)
}

func (srv *Server) handleAggregateSchedule(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()
	scheduleType := uek.ScheduleType(queryParams.Get("type"))
	if !scheduleType.IsValid() {
		respondBadRequest(w)
		return
	}

	scheduleIds := []int{}
	for _, rawScheduleId := range queryParams["id"] {
		scheduleId, err := strconv.Atoi(rawScheduleId)
		if err != nil || slices.Contains(scheduleIds, scheduleId) {
			respondBadRequest(w)
			return
		}

		scheduleIds = append(scheduleIds, scheduleId)
	}
	if len(scheduleIds) == 0 || len(scheduleIds) > maxSchedulesPerRequest {
		respondBadRequest(w)
		return
	}

	periods, periodsCacheExpirationDate, err := srv.uek.GetSchedulePeriods(r.Context())
	if err != nil {
		respondServiceUnavailable(w)
		return
	}

	requestPeriodIdString := strings.TrimSpace(queryParams.Get("periodId"))
	var requestPeriodId int
	if requestPeriodIdString == "" {
		var ok bool
		if requestPeriodId, ok = pickCurrentYearPeriodId(periods); !ok {
			respondServiceUnavailable(w)
			return
		}
	} else {
		requestPeriodId, err = strconv.Atoi(requestPeriodIdString)
		if err != nil {
			respondBadRequest(w)
			return
		}

		idFound := false
		for _, period := range periods {
			if period.Id == requestPeriodId {
				idFound = true
				break
			}
		}

		if !idFound {
			respondBadRequest(w)
			return
		}
	}

	aggregateSchedule, aggregateScheduleCacheExpirationDate, err := srv.uek.GetAggregateSchedule(r.Context(), scheduleType, scheduleIds, requestPeriodId)
	if err != nil {
		if !errors.Is(err, context.Canceled) {
			srv.logger.Error("Failed to get schedule", slog.Group("params", slog.String("scheduleType", string(scheduleType)), slog.Any("scheduleIds", scheduleIds), slog.Int("periodId", requestPeriodId)), slog.Any("err", err))
		}
		respondServiceUnavailable(w)
		return
	}

	if aggregateScheduleCacheExpirationDate.Before(periodsCacheExpirationDate) {
		setCacheHeader(w, aggregateScheduleCacheExpirationDate)
	} else {
		setCacheHeader(w, periodsCacheExpirationDate)
	}

	respondJSON(w, struct {
		Schedule *uek.AggregateSchedule `json:"schedule"`
		Periods  []uek.SchedulePeriod   `json:"periods"`
	}{
		Schedule: aggregateSchedule,
		Periods:  periods,
	})
}

func (srv *Server) handleICal(w http.ResponseWriter, r *http.Request) {
	const icalTimestampFormat = "20060102T150405Z"
	type icalPayload struct {
		ScheduleType   uek.ScheduleType `json:"scheduleType"`
		ScheduleIds    []int            `json:"scheduleIds"`
		HiddenSubjects []string         `json:"hiddenSubjects"`
	}

	payload := icalPayload{}
	if err := json.NewDecoder(base64.NewDecoder(base64.StdEncoding, strings.NewReader(r.PathValue("payload")))).Decode(&payload); err != nil || len(payload.ScheduleIds) == 0 || len(payload.ScheduleIds) > maxSchedulesPerRequest {
		respondBadRequest(w)
		return
	}

	periods, periodsCacheExpirationDate, err := srv.uek.GetSchedulePeriods(r.Context())
	if err != nil {
		respondServiceUnavailable(w)
		return
	}

	currentYearPeriodId, ok := pickCurrentYearPeriodId(periods)
	if !ok {
		respondServiceUnavailable(w)
		return
	}

	aggregateSchedule, aggregateScheduleCacheExpirationDate, err := srv.uek.GetAggregateSchedule(r.Context(), payload.ScheduleType, payload.ScheduleIds, currentYearPeriodId)
	if err != nil {
		respondServiceUnavailable(w)
		return
	}

	calendarNameBuilder := strings.Builder{}
	calendarNameBuilder.WriteString("(UEK) ")
	for i, header := range aggregateSchedule.Headers {
		if i != 0 {
			calendarNameBuilder.WriteString(", ")
		}
		calendarNameBuilder.WriteString(header.Name)
	}
	if len(payload.HiddenSubjects) > 0 {
		calendarNameBuilder.WriteString(fmt.Sprintf(" (-%d)", len(payload.HiddenSubjects)))
	}
	calendarName := calendarNameBuilder.String()

	if aggregateScheduleCacheExpirationDate.Before(periodsCacheExpirationDate) {
		setCacheHeader(w, aggregateScheduleCacheExpirationDate)
	} else {
		setCacheHeader(w, periodsCacheExpirationDate)
	}

	w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.ics\"", calendarName))

	fmt.Fprintf(w, "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//%s\n", uek.UserAgent)
	fmt.Fprintf(w, "NAME: %s\nX-WR-CALNAME: %s\n", calendarName, calendarName)
	dtStamp := time.Now().UTC().Format(icalTimestampFormat)

	for _, item := range aggregateSchedule.Items {
		if slices.Contains(payload.HiddenSubjects, item.Subject) {
			continue
		}

		fmt.Fprintf(w, "BEGIN:VEVENT\nUID:%s\nSEQUENCE:0\nDTSTAMP:%s\nDTSTART:%s\nDTEND:%s\nSUMMARY:", uuid.NewString(), dtStamp, item.Start.UTC().Format(icalTimestampFormat), item.End.UTC().Format(icalTimestampFormat))
		if item.Extra != "" {
			fmt.Fprint(w, "[!] ")
		}
		fmt.Fprintf(w, "[%s] %s\n", item.Type, item.Subject)

		fmt.Fprint(w, "DESCRIPTION:")
		if item.Extra != "" {
			fmt.Fprint(w, item.Extra, "\\n\\n")
		}
		if item.Room != nil && item.Room.URL != "" {
			fmt.Fprint(w, item.Room.URL, "\\n\\n")
		}

		if len(item.Lecturers) > 0 {
			for i, lecturer := range item.Lecturers {
				if i != 0 {
					fmt.Fprint(w, ", ")
				}
				fmt.Fprint(w, lecturer.Name)
				if lecturer.MoodleId != 0 {
					fmt.Fprintf(w, " (https://e-uczelnia.uek.krakow.pl/course/view.php?id=%d)", lecturer.MoodleId)
				}
				fmt.Fprint(w, "\\n\\n")
			}
		}

		if len(item.Groups) > 0 {
			fmt.Fprint(w, "\\n")
			for i, group := range item.Groups {
				if i != 0 {
					fmt.Fprint(w, ", ")
				}
				fmt.Fprint(w, group)
			}
		}

		fmt.Fprint(w, "\n")

		if len(item.Lecturers) > 0 {
			fmt.Fprintf(w, "ORGANIZER;CN=\"%s\":mailto:unknown@invalid.invalid\n", item.Lecturers[0].Name)
		}

		if item.Room != nil {
			locationName := item.Room.Name
			if item.Room.URL != "" {
				locationName = "Online"
			}
			fmt.Fprintf(w, "LOCATION:%s\n", locationName)
		}

		fmt.Fprintf(w, "CATEGORIES:%s\nEND:VEVENT\n", item.Type)
	}

	fmt.Fprintln(w, "END:VCALENDAR")
}

func pickCurrentYearPeriodId(periods []uek.SchedulePeriod) (int, bool) {
	now := time.Now()

	var longestPeriodContainingNowId *int
	longestPeriodContainingNowDuration := time.Duration(0)

	for _, period := range periods {
		if period.Start.After(now) || period.End.Before(now) {
			continue
		}

		periodDuration := period.End.Sub(period.Start)
		if periodDuration > longestPeriodContainingNowDuration {
			longestPeriodContainingNowId = &period.Id
			longestPeriodContainingNowDuration = periodDuration
		}
	}

	if longestPeriodContainingNowId == nil {
		return 0, false
	}

	return *longestPeriodContainingNowId, true
}
