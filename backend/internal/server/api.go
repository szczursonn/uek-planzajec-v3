package server

import (
	"compress/zlib"
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
	"github.com/szczursonn/uek-planzajec-v3/internal/version"
)

const icalTimestampFormat = "20060102T150405Z"
const maxSchedulesPerRequest = 4

func (srv *Server) handleGroupings(w http.ResponseWriter, r *http.Request) {
	groupings, cacheExpirationDate, err := srv.uek.GetGroupings(r.Context())
	if err != nil {
		if !errors.Is(err, context.Canceled) {
			srv.logger.Error("failed to get groupings", slog.Any("err", err))
		}
		respondBadGateway(w)
		return
	}

	setCacheHeader(w, cacheExpirationDate)
	respondJSON(w, groupings)
}

func (srv *Server) handleHeaders(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	scheduleType, groupingName := uek.ScheduleType(q.Get("type")), q.Get("grouping")

	if err := scheduleType.Validate(); err != nil {
		respondBadRequest(w)
		return
	}

	headers, cacheExpirationDate, err := srv.uek.GetHeaders(r.Context(), scheduleType, groupingName)
	if err != nil {
		if !errors.Is(err, context.Canceled) {
			srv.logger.Error("failed to get headers", slog.String("scheduleType", string(scheduleType)), slog.String("groupingName", groupingName), slog.Any("err", err))
		}
		respondBadGateway(w)
		return
	}

	setCacheHeader(w, cacheExpirationDate)
	respondJSON(w, headers)
}

func (srv *Server) handleAggregateSchedule(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()
	scheduleType := uek.ScheduleType(queryParams.Get("type"))
	if err := scheduleType.Validate(); err != nil {
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

	isLastYear, _ := strconv.ParseBool(queryParams.Get("lastYear"))

	aggregateSchedule, cacheExpirationDate, err := srv.uek.GetAggregateSchedule(r.Context(), scheduleType, scheduleIds, isLastYear)
	if err != nil {
		if !errors.Is(err, context.Canceled) {
			srv.logger.Error("failed to get schedule", slog.String("scheduleType", string(scheduleType)), slog.Any("scheduleIds", scheduleIds), slog.Bool("lastYear", isLastYear), slog.Any("err", err))
		}
		respondBadGateway(w)
		return
	}

	setCacheHeader(w, cacheExpirationDate)
	respondJSON(w, aggregateSchedule)
}

type icalPayload struct {
	ScheduleType           uek.ScheduleType `json:"scheduleType"`
	ScheduleIds            []int            `json:"scheduleIds"`
	HiddenSubjectsAndTypes []struct {
		Subject string `json:"subject"`
		Type    string `json:"type"`
	} `json:"hiddenSubjectsAndTypes"`
}

func readICalPayload(r *http.Request) *icalPayload {
	decodedPayloadReader, err := zlib.NewReader(base64.NewDecoder(base64.StdEncoding, strings.NewReader(r.PathValue("payload"))))
	if err != nil {
		return nil
	}
	defer decodedPayloadReader.Close()

	payload := &icalPayload{}
	if err := json.NewDecoder(decodedPayloadReader).Decode(payload); err != nil {
		return nil
	}

	if err := payload.ScheduleType.Validate(); err != nil || len(payload.ScheduleIds) == 0 || len(payload.ScheduleIds) > maxSchedulesPerRequest {
		return nil
	}

	return payload
}

func (srv *Server) handleICal(w http.ResponseWriter, r *http.Request) {
	payload := readICalPayload(r)
	if payload == nil {
		respondBadRequest(w)
		return
	}

	aggregateSchedule, cacheExpirationDate, err := srv.uek.GetAggregateSchedule(r.Context(), payload.ScheduleType, payload.ScheduleIds, false)
	if err != nil {
		respondBadGateway(w)
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
	if len(payload.HiddenSubjectsAndTypes) > 0 {
		calendarNameBuilder.WriteString(fmt.Sprintf(" (-%d)", len(payload.HiddenSubjectsAndTypes)))
	}
	calendarName := calendarNameBuilder.String()

	setCacheHeader(w, cacheExpirationDate)
	w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.ics\"", calendarName))

	fmt.Fprintf(w, "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//uek-planzajec-v3/%s\n", version.AppVersion)
	fmt.Fprintf(w, "NAME: %s\nX-WR-CALNAME: %s\n", calendarName, calendarName)

	isItemSubjectAndTypeHidden := func(item *uek.ScheduleItem) bool {
		for _, hiddenSubjectAndType := range payload.HiddenSubjectsAndTypes {
			if item.Subject == hiddenSubjectAndType.Subject && item.Type == hiddenSubjectAndType.Type {
				return true
			}
		}

		return false
	}

	dtStamp := time.Now().UTC().Format(icalTimestampFormat)
	for _, item := range aggregateSchedule.Items {
		if item.Type == uek.ScheduleItemTypeLanguageSlot || isItemSubjectAndTypeHidden(item) {
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
