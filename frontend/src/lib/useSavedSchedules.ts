import * as z from '@zod/mini';
import { scheduleIdSchema, ScheduleType, scheduleTypeSchema } from './uek';
import { createLocalStorageState } from './localStorageState';
import { hiddenSubjectsAndTypesState, scheduleIdsState, scheduleTypeState } from './useAppScheduleQuery';

const savedSchedulesSchema = z.array(
    z.object({
        name: z.string().check(z.minLength(1)),
        type: scheduleTypeSchema,
        ids: z.array(scheduleIdSchema),
        hiddenSubjectsAndTypes: z.array(
            z.object({
                subject: z.string(),
                type: z.string(),
            }),
        ),
    }),
);

export type SavedSchedule = z.infer<typeof savedSchedulesSchema>[number];

export const savedSchedulesState = createLocalStorageState(
    'savedSchedules',
    (encodedValue) => {
        try {
            return savedSchedulesSchema.parse(JSON.parse(encodedValue));
        } catch (_) {
            return [];
        }
    },
    (value) => (value.length === 0 ? '' : JSON.stringify(value)),
);

export const createSavedScheduleSelectionUpdates = (savedSchedule: SavedSchedule) =>
    [
        scheduleIdsState.createUpdate(savedSchedule.ids),
        scheduleTypeState.createUpdate(savedSchedule.type),
        hiddenSubjectsAndTypesState.createUpdate(savedSchedule.hiddenSubjectsAndTypes),
    ] as const;

export const matchSavedSchedule = (
    savedSchedule: SavedSchedule,
    matchProperties: {
        scheduleIds: number[];
        scheduleType: ScheduleType;
        hiddenSubjectsAndTypes: {
            subject: string;
            type: string;
        }[];
    },
) =>
    savedSchedule.ids.length === matchProperties.scheduleIds.length &&
    savedSchedule.ids.every((id, i) => id === matchProperties.scheduleIds[i]!) &&
    savedSchedule.type === matchProperties.scheduleType &&
    savedSchedule.hiddenSubjectsAndTypes.length === matchProperties.hiddenSubjectsAndTypes.length &&
    savedSchedule.hiddenSubjectsAndTypes.every(
        (hiddenSubjectAndType, i) =>
            matchProperties.hiddenSubjectsAndTypes[i]!.subject === hiddenSubjectAndType.subject &&
            matchProperties.hiddenSubjectsAndTypes[i]!.type === hiddenSubjectAndType.type,
    );
