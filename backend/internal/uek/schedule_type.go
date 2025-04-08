package uek

import "fmt"

type ScheduleType string

const (
	ScheduleTypeGroup    ScheduleType = "group"
	ScheduleTypeLecturer ScheduleType = "lecturer"
	ScheduleTypeRoom     ScheduleType = "room"
)

func (scheduleType ScheduleType) Validate() error {
	if scheduleType == ScheduleTypeGroup || scheduleType == ScheduleTypeLecturer || scheduleType == ScheduleTypeRoom {
		return nil
	}
	return fmt.Errorf("invalid schedule type: %s", scheduleType)
}

func (scheduleType ScheduleType) denormalize() originalScheduleType {
	switch scheduleType {
	case ScheduleTypeGroup:
		return originalScheduleTypeGroup
	case ScheduleTypeLecturer:
		return originalScheduleTypeLecturer
	case ScheduleTypeRoom:
		return originalScheduleTypeRoom
	}

	return originalScheduleType(scheduleType)
}

type originalScheduleType string

const (
	originalScheduleTypeGroup    originalScheduleType = "G"
	originalScheduleTypeLecturer originalScheduleType = "N"
	originalScheduleTypeRoom     originalScheduleType = "S"
)

func (originalType originalScheduleType) normalize() (ScheduleType, error) {
	switch originalType {
	case originalScheduleTypeGroup:
		return ScheduleTypeGroup, nil
	case originalScheduleTypeLecturer:
		return ScheduleTypeLecturer, nil
	case originalScheduleTypeRoom:
		return ScheduleTypeRoom, nil
	default:
		return "", fmt.Errorf("invalid uek schedule type: %s", originalType)
	}
}
