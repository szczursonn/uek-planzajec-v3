import * as z from 'zod/mini';
import { createLocalStorageState } from './state/localStorageState';
import { hiddenSubjectsState, scheduleIdsState, scheduleTypeState } from './appScheduleQuery';
import { scheduleIdSchema, scheduleTypeSchema } from './api/common';

const savedSchedulesSchema = z.array(
    z.object({
        type: scheduleTypeSchema,
        headers: z.array(
            z.object({
                id: scheduleIdSchema,
                name: z.string().check(z.minLength(1)),
            }),
        ),
        hiddenSubjects: z.array(z.string()),
    }),
);

export type SavedSchedule = z.infer<typeof savedSchedulesSchema>[number];

export const savedSchedulesState = (() => {
    const base = createLocalStorageState(
        'savedSchedules',
        (encodedValue) => {
            try {
                return savedSchedulesSchema.parse(JSON.parse(encodedValue));
            } catch (_) {
                return [];
            }
        },
        (value) => JSON.stringify(value),
    );

    return {
        ...base,
        add: (newSavedSchedule: SavedSchedule) => base.set([...base.get(), newSavedSchedule]),
        remove: (savedScheduleToDelete: SavedSchedule) =>
            base.set(base.get().filter((savedSchedule) => savedSchedule !== savedScheduleToDelete)),
    };
})();

export const createSavedScheduleSelectionUpdaters = (savedSchedule: SavedSchedule) =>
    [
        scheduleIdsState.createUpdate(savedSchedule.headers.map((header) => header.id)),
        scheduleTypeState.createUpdate(savedSchedule.type),
        hiddenSubjectsState.createUpdate(savedSchedule.hiddenSubjects),
    ] as const;
