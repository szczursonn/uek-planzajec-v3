import { type ComponentChildren, createContext } from 'preact';
import { useContext, useMemo } from 'preact/hooks';
import * as z from '@zod/mini';
import { stripLocalTime } from './dateTime';
import { useDynamicNow } from './useDynamicNow';
import { MAX_SELECTABLE_SCHEDULES, scheduleIdSchema, scheduleTypeSchema, useAggregateScheduleAPI } from './uek';
import { createEnumQueryParamState, createQueryParamState } from './queryParamState';
import { unicodeAwareStringArraySorter } from './utils';
import { createBooleanLocalStorageState } from './localStorageState';

export const SCHEDULE_PERIODS = ['upcoming', 'currentYear', 'lastYear'] as const;
export const schedulePeriodSchema = z.enum([...SCHEDULE_PERIODS]);
export type SchedulePeriod = z.infer<typeof schedulePeriodSchema>;
export const DEFAULT_SCHEDULE_PERIOD = 'upcoming' satisfies SchedulePeriod;

const SCHEDULE_ID_LIST_SEPERATOR = '_';
const scheduleIdsSchema = z.pipe(
    z.pipe(
        z.string(),
        z.transform((value) =>
            Array.from(new Set(value.split(SCHEDULE_ID_LIST_SEPERATOR).map((value) => parseInt(value)))),
        ),
    ),
    z.array(scheduleIdSchema).check(z.maxLength(MAX_SELECTABLE_SCHEDULES)),
);

export const scheduleIdsState = createQueryParamState(
    'id',
    (queryParamValue) => scheduleIdsSchema.safeParse(queryParamValue).data ?? [],
    (scheduleIds) => scheduleIds.join(SCHEDULE_ID_LIST_SEPERATOR),
);
export const scheduleTypeState = createEnumQueryParamState('type', scheduleTypeSchema, 'group');
export const schedulePeriodState = createEnumQueryParamState('period', schedulePeriodSchema, 'upcoming');
export const showLanguageSlotsState = createBooleanLocalStorageState('showLangSlots', false);
export const showLongBreaksState = createBooleanLocalStorageState('showLongBreaks', true);

const compactHiddenSubjectsAndTypesSchema = z.array(
    z.pipe(
        z.tuple([z.string(), z.string()]),
        z.transform(([subject, type]) => ({ subject, type })),
    ),
);

const sortAndDeduplicateHiddenSubjectsAndTypes = (
    hiddenSubjectsAndTypes: z.infer<typeof compactHiddenSubjectsAndTypesSchema>,
) => {
    const dedupedHiddenSubjectsAndTypes = [] as typeof hiddenSubjectsAndTypes;

    for (const hiddenSubjectAndType of hiddenSubjectsAndTypes) {
        if (
            !dedupedHiddenSubjectsAndTypes.find(
                (previouslyEncounteredHiddenSubjectAndType) =>
                    previouslyEncounteredHiddenSubjectAndType.subject === hiddenSubjectAndType.subject &&
                    previouslyEncounteredHiddenSubjectAndType.type === hiddenSubjectAndType.type,
            )
        ) {
            dedupedHiddenSubjectsAndTypes.push(hiddenSubjectAndType);
        }
    }

    return dedupedHiddenSubjectsAndTypes.sort(
        (a, b) => unicodeAwareStringArraySorter(a.subject, b.subject) || unicodeAwareStringArraySorter(a.type, b.type),
    );
};

export const hiddenSubjectsAndTypesState = createQueryParamState(
    'hiddenSubjectsAndTypes',
    (queryParamValue) => {
        try {
            return sortAndDeduplicateHiddenSubjectsAndTypes(
                compactHiddenSubjectsAndTypesSchema.parse(JSON.parse(queryParamValue)),
            );
        } catch (_) {
            return [];
        }
    },
    (hiddenSubjectsAndTypes) =>
        hiddenSubjectsAndTypes.length === 0
            ? ''
            : JSON.stringify(
                  sortAndDeduplicateHiddenSubjectsAndTypes(hiddenSubjectsAndTypes).map(({ subject, type }) => [
                      subject,
                      type,
                  ]),
              ),
);

const useAppScheduleQueryData = () => {
    const scheduleIds = scheduleIdsState.use();
    const scheduleType = scheduleTypeState.use();
    const schedulePeriod = schedulePeriodState.use();
    const showLanguageSlots = showLanguageSlotsState.use();
    const hiddenSubjectsAndTypes = hiddenSubjectsAndTypesState.use();

    const query = useAggregateScheduleAPI(scheduleType, scheduleIds, schedulePeriod === 'lastYear');

    const nowWithoutTimeTimestamp = stripLocalTime(useDynamicNow('localDay')).getTime();
    const filteredItems = useMemo(
        () =>
            query.data?.items.filter(
                (item) =>
                    !hiddenSubjectsAndTypes.find(
                        (hiddenSubjectAndType) =>
                            item.subject === hiddenSubjectAndType.subject && item.type === hiddenSubjectAndType.type,
                    ) &&
                    (item.category !== 'languageSlot' || showLanguageSlots) &&
                    (schedulePeriod !== 'upcoming' || item.start.date.getTime() >= nowWithoutTimeTimestamp),
            ) ?? [],
        [query.data, hiddenSubjectsAndTypes, showLanguageSlots, schedulePeriod],
    );

    return {
        ...query,
        data: query.data && {
            ...query.data,
            filteredItems,
        },
    };
};

const AppScheduleQueryContext = createContext<ReturnType<typeof useAppScheduleQueryData> | null>(null);

export const useAppScheduleQuery = () => {
    const contextValue = useContext(AppScheduleQueryContext);
    if (contextValue === null) {
        throw new Error('missing context');
    }

    return contextValue;
};

export const AppScheduleQueryProvider = ({ children }: { children?: ComponentChildren }) => (
    <AppScheduleQueryContext.Provider value={useAppScheduleQueryData()}>{children}</AppScheduleQueryContext.Provider>
);
