import * as z from 'zod/mini';
import hash from 'stable-hash';
import { createUseAPI, scheduleIdSchema, ScheduleType } from './common';
import { DateParts } from '../date/dateParts';

export const MAX_SELECTABLE_SCHEDULES = 3;

export const getScheduleItemTypeCategory = (itemType: string) => {
    switch (itemType) {
        case 'wykład':
        case 'wykład do wyboru':
        case 'PPUZ wykład':
            return 'lecture' as const;
        case 'ćwiczenia':
        case 'ćwiczenia do wyboru':
        case 'ćwiczenia warsztatowe':
        case 'ćwiczenia audytoryjne':
        case 'ćwiczenia e-learningowe':
        case 'ćwiczenia zdalne':
        case 'PPUZ ćwicz. warsztatowe':
        case 'PPUZ ćwicz. laboratoryjne':
        case 'projekt':
        case 'laboratorium':
        case 'konwersatorium':
        case 'konwersatorium do wyboru':
        case 'seminarium':
            return 'exercise' as const;
        case 'lektorat':
        case 'PPUZ lektorat':
            return 'language' as const;
        case 'wstępna rezerwacja':
        case 'rezerwacja':
            return 'reservation' as const;
        case 'egzamin':
            return 'exam' as const;
        case 'przeniesienie zajęć':
            return 'cancelled' as const;
        default:
            return 'unknown' as const;
    }
};

export type ScheduleItemTypeCategory = ReturnType<typeof getScheduleItemTypeCategory>;

const aggregateScheduleResponseSchema = z.object({
    schedule: z.object({
        headers: z.array(
            z.object({
                id: scheduleIdSchema,
                name: z.string().check(z.minLength(1)),
                moodleId: z.optional(z.number()),
            }),
        ),
        items: z.array(
            z.object({
                start: z.iso.datetime({
                    offset: true,
                }),
                end: z.iso.datetime({
                    offset: true,
                }),
                subject: z.string(),
                type: z.string(),
                groups: z._default(z.array(z.string().check(z.minLength(1))), []),
                lecturers: z._default(
                    z.array(
                        z.object({
                            name: z.string().check(z.minLength(1)),
                            moodleId: z.optional(z.number()),
                        }),
                    ),
                    [],
                ),
                room: z.optional(
                    z.object({
                        name: z.string().check(z.minLength(1)),
                        url: z.optional(z.url()),
                    }),
                ),
                extra: z.optional(z.string().check(z.minLength(1))),
            }),
        ),
    }),
    periods: z.array(
        z.object({
            id: z.number(),
            start: z.iso.datetime({
                offset: true,
            }),
            end: z.iso.datetime({
                offset: true,
            }),
        }),
    ),
});

export const useAggregateScheduleAPI = createUseAPI(
    (scheduleType: ScheduleType, scheduleIds: number[], periodId: number | null) =>
        scheduleIds.length > 0
            ? `/api/aggregateSchedule?type=${encodeURIComponent(scheduleType)}${periodId === null ? '' : `&periodId=${periodId}`}${scheduleIds.map((scheduleId) => `&id=${scheduleId}`).join('')}`
            : '',
    (responseData) => {
        const aggregateScheduleResponse = aggregateScheduleResponseSchema.parse(responseData);
        return {
            schedule: {
                ...aggregateScheduleResponse.schedule,
                items: aggregateScheduleResponse.schedule.items.map((responseItem) => ({
                    ...responseItem,
                    id: hash(responseItem),
                    start: {
                        date: new Date(responseItem.start),
                        parts: DateParts.fromISO(responseItem.start),
                    },
                    end: {
                        date: new Date(responseItem.end),
                        parts: DateParts.fromISO(responseItem.end),
                    },
                    type: {
                        value: responseItem.type,
                        category: getScheduleItemTypeCategory(responseItem.type),
                    },
                    isOnline: !!responseItem.room?.url || responseItem.room?.name === 'Platforma Moodle',
                })),
            },
            periods: aggregateScheduleResponse.periods.map((period) => ({
                id: period.id,
                start: new Date(period.start),
                end: new Date(period.end),
            })),
        };
    },
);

export type ScheduleItem = NonNullable<ReturnType<typeof useAggregateScheduleAPI>['data']>['schedule']['items'][number];
