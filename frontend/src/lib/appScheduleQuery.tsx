import * as z from 'zod/mini';
import { useContext, useMemo } from 'preact/hooks';
import { type ComponentChildren, createContext } from 'preact';
import { scheduleIdSchema, scheduleTypeSchema, type ScheduleType } from './api/common';
import { MAX_SELECTABLE_SCHEDULES, useAggregateScheduleAPI } from './api/aggregateSchedule';
import { stripTime } from './date/dateUtils';
import { useCurrentDate } from './date/useCurrentDate';
import { createQueryParamState, createEnumQueryParamState } from './state/queryParamsState';
import { useSchedulePeriod } from './schedulePeriod';

export const scheduleIdsState = (() => {
    const LIST_SEPERATOR = '_';
    const schemaForParse = z.pipe(
        z.pipe(
            z.string(),
            z.transform((value) => Array.from(new Set(value.split(LIST_SEPERATOR).map((value) => parseInt(value))))),
        ),
        z.array(scheduleIdSchema).check(z.maxLength(MAX_SELECTABLE_SCHEDULES)),
    );

    const baseState = createQueryParamState(
        'id',
        (queryParamValue) => schemaForParse.safeParse(queryParamValue).data ?? [],
        (value) => value.join(LIST_SEPERATOR),
    );

    return {
        ...baseState,
        createAddUpdate: (newScheduleId: number) => baseState.createUpdate([...baseState.get(), newScheduleId]),
        createRemoveUpdater: (scheduleIdToRemove: number) =>
            baseState.createUpdate(baseState.get().filter((scheduleId) => scheduleId !== scheduleIdToRemove)),
    };
})();

const DEFAULT_SCHEDULE_TYPE = 'group' satisfies ScheduleType;
export const scheduleTypeState = createEnumQueryParamState('type', scheduleTypeSchema, DEFAULT_SCHEDULE_TYPE);

export const hiddenSubjectsState = (() => {
    const schema = z.array(z.string());
    const sortAndDeduplicate = (subjects: string[]) => Array.from(new Set(subjects)).sort((a, b) => a.localeCompare(b));

    const baseState = createQueryParamState(
        'hiddenSubjects',
        (queryParamValue) => {
            try {
                return sortAndDeduplicate(schema.parse(JSON.parse(queryParamValue)));
            } catch (_) {
                return [];
            }
        },
        (subjects) => (subjects.length > 0 ? JSON.stringify(sortAndDeduplicate(subjects)) : ''),
    );

    return {
        ...baseState,
        createAddUpdater: (newHiddenSubject: string) => baseState.createUpdate([...baseState.get(), newHiddenSubject]),
        createRemoveUpdater: (hiddenSubjectToRemove: string) =>
            baseState.createUpdate(baseState.get().filter((hiddenSubject) => hiddenSubject !== hiddenSubjectToRemove)),
    };
})();

const useAppScheduleQueryData = () => {
    const scheduleType = scheduleTypeState.use();
    const scheduleIds = scheduleIdsState.use();
    const [schedulePeriod] = useSchedulePeriod();
    const hiddenSubjects = hiddenSubjectsState.use();

    const query = useAggregateScheduleAPI(
        scheduleType,
        scheduleIds,
        typeof schedulePeriod === 'number' ? schedulePeriod : null,
    );

    const currentDateWithoutTimeTimestamp = stripTime(useCurrentDate('day')).getTime();
    const filteredItems = useMemo(
        () =>
            query.data?.schedule.items.filter(
                (item) =>
                    !hiddenSubjects.includes(item.subject) &&
                    (schedulePeriod !== 'inferUpcoming' ||
                        item.start.date.getTime() >= currentDateWithoutTimeTimestamp),
            ) ?? [],
        [query.data, hiddenSubjects, schedulePeriod],
    );

    return {
        ...query,
        data: query.data && {
            ...query.data,
            schedule: {
                ...query.data.schedule,
                filteredItems,
            },
        },
    };
};

const AppScheduleQueryContext = createContext<ReturnType<typeof useAppScheduleQueryData> | null>(null);

export const useAppScheduleQuery = () => {
    const value = useContext(AppScheduleQueryContext);
    if (value === null) {
        throw new Error('null context');
    }

    return value;
};

export const AppScheduleQueryProvider = ({ children }: { children?: ComponentChildren }) => (
    <AppScheduleQueryContext.Provider value={useAppScheduleQueryData()}>{children}</AppScheduleQueryContext.Provider>
);
