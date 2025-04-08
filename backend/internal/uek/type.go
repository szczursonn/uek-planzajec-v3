package uek

import "fmt"

type ScheduleType string

const (
	ScheduleTypeGroup    ScheduleType = "group"
	ScheduleTypeLecturer ScheduleType = "lecturer"
	ScheduleTypeRoom     ScheduleType = "room"
)

func (st ScheduleType) IsValid() bool {
	return st == ScheduleTypeGroup || st == ScheduleTypeLecturer || st == ScheduleTypeRoom
}

func (st ScheduleType) Validate() error {
	if st.IsValid() {
		return nil
	}

	return fmt.Errorf("invalid schedule type: %s", st)
}

func (st ScheduleType) asOriginal() originalScheduleType {
	switch st {
	case ScheduleTypeGroup:
		return originalScheduleTypeGroup
	case ScheduleTypeLecturer:
		return originalScheduleTypeLecturer
	case ScheduleTypeRoom:
		return originalScheduleTypeRoom
	}

	panic(fmt.Errorf("invalid schedule type: %s", st))
}

type originalScheduleType string

const (
	originalScheduleTypeGroup    originalScheduleType = "G"
	originalScheduleTypeLecturer originalScheduleType = "N"
	originalScheduleTypeRoom     originalScheduleType = "S"
)

func (ost originalScheduleType) asNormal() (ScheduleType, error) {
	switch ost {
	case originalScheduleTypeGroup:
		return ScheduleTypeGroup, nil
	case originalScheduleTypeLecturer:
		return ScheduleTypeLecturer, nil
	case originalScheduleTypeRoom:
		return ScheduleTypeRoom, nil
	default:
		return "", fmt.Errorf("invalid original schedule type: %s", ost)
	}
}
