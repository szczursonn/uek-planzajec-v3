import useSWR from 'swr';
import * as z from '@zod/mini';
import { parse as parseCacheControl } from 'cache-parser';
import { appVersion } from 'virtual:version-info';
import { parseISODateWithTimezone } from './dateTime';
import { compress, sha1 } from './utils';

const QUERY_MIN_REFRESH_DELAY = 1000 * 60 * 2;
const QUERY_REFRESH_JITTER = 1000 * 10;

export const MAX_SELECTABLE_SCHEDULES = 4;

export const scheduleIdSchema = z.number().check(z.nonnegative());

export const SCHEDULE_TYPES = ['group', 'lecturer', 'room'] as const;
export const scheduleTypeSchema = z.enum([...SCHEDULE_TYPES]);
export type ScheduleType = z.infer<typeof scheduleTypeSchema>;
export const DEFAULT_SCHEDULE_TYPE = 'group' satisfies ScheduleType;

export const GROUP_MODES = ['full-time', 'part-time'] as const;
export const groupModeSchema = z.enum([...GROUP_MODES]);
export type GroupMode = z.infer<typeof groupModeSchema>;

export const GROUP_TIERS = ['bachelor', 'master', 'uniform'] as const;
export const groupTierSchema = z.enum([...GROUP_TIERS]);
export type GroupTier = z.infer<typeof groupTierSchema>;

export type ScheduleItemCategory =
    | 'lecture'
    | 'exercise'
    | 'language'
    | 'languageSlot'
    | 'reservation'
    | 'exam'
    | 'cancelled';
export const SCHEDULE_ITEM_TYPE_TO_CATEGORY = {
    wykład: 'lecture',
    'wykład do wyboru': 'lecture',
    'PPUZ wykład': 'lecture',
    ćwiczenia: 'exercise',
    'ćwiczenia do wyboru': 'exercise',
    'ćwiczenia warsztatowe': 'exercise',
    'ćwiczenia audytoryjne': 'exercise',
    'ćwiczenia e-learningowe': 'exercise',
    'ćwiczenia zdalne': 'exercise',
    'PPUZ ćwicz. warsztatowe': 'exercise',
    'PPUZ ćwicz. laboratoryjne': 'exercise',
    projekt: 'exercise',
    laboratorium: 'exercise',
    konwersatorium: 'exercise',
    'konwersatorium do wyboru': 'exercise',
    seminarium: 'exercise',
    lektorat: 'language',
    'PPUZ lektorat': 'language',
    rezerwacja: 'reservation',
    egzamin: 'exam',
    'przeniesienie zajęć': 'cancelled',
    language_slot: 'languageSlot',
} as Readonly<Record<string, ScheduleItemCategory>>;

class UnexpectedStatusCodeError extends Error {
    constructor(public readonly statusCode: number) {
        super(`unexpected status code: ${statusCode}`);
    }
}

const appVersionHeader = 'x-uekpz3-version';

let versionMismatchWarningShown = false;

const createUseAPI =
    <TArgs extends unknown[], TReturnValue>(
        createEndpoint: (...args: TArgs) => string,
        processResponseData: (responseData: unknown, ...args: TArgs) => Promise<TReturnValue> | TReturnValue,
    ) =>
    (...args: TArgs) => {
        const query = useSWR(
            createEndpoint(...args),
            async (endpoint) => {
                if (!endpoint) {
                    return undefined;
                }

                const res = await fetch(endpoint, {
                    cache: 'default',
                    headers: {
                        [appVersionHeader]: appVersion ?? '',
                    },
                });

                const serverAppVersion = res.headers.get(appVersionHeader);
                if (
                    !import.meta.env.DEV &&
                    !versionMismatchWarningShown &&
                    appVersion &&
                    serverAppVersion &&
                    appVersion !== serverAppVersion
                ) {
                    versionMismatchWarningShown = true;
                    alert(`Version mismatch\nClient: ${appVersion}\nServer: ${serverAppVersion}`);
                }

                if (!res.ok) {
                    throw new UnexpectedStatusCodeError(res.status);
                }

                const responseDate = new Date(res.headers.get('Date') ?? new Date());
                const responseCacheMaxAge =
                    (parseCacheControl(res.headers.get('Cache-Control') ?? '').maxAge ?? 0) * 1000;

                return {
                    data: await processResponseData(await res.json(), ...args),
                    freshUntil: new Date(responseDate.getTime() + responseCacheMaxAge),
                };
            },
            {
                errorRetryCount: 2,
                onError: (err) => console.error(err),
                shouldRetryOnError: (err) =>
                    !(err instanceof UnexpectedStatusCodeError && err.statusCode < 500) &&
                    !(err instanceof z.core.$ZodError),
                revalidateOnFocus: false,
                refreshInterval: (latestData) =>
                    Math.max(
                        latestData
                            ? latestData.freshUntil.getTime() -
                                  Date.now() +
                                  Math.round(Math.random() * QUERY_REFRESH_JITTER)
                            : 0,
                        QUERY_MIN_REFRESH_DELAY,
                    ),
            },
        );

        return {
            data: query.data?.data,
            error: query.error as unknown,
            isLoading: query.isLoading,
            isValidating: query.isValidating,
            revalidate: () => query.mutate() as Promise<void>,
        };
    };

const groupingsArraySchema = z.array(z.string().check(z.minLength(1)));
const groupingsResponseSchema = z.object({
    group: groupingsArraySchema,
    room: groupingsArraySchema,
});

export const useGroupingsAPI = createUseAPI(
    () => '/api/groupings',
    (responseData) => groupingsResponseSchema.parse(responseData),
);

// const GROUP_HEADER_DETAIL_REGEX = {
//     DEFAULT: /^[A-Z]{4}(?<mode>[SN])(?<tier>[12M])-(?<year>\d)(?<semester>\d)(?<groupNumber>.+)/,
//     CJ: /(?<mode>[SN])(?<tier>[12M])-{1,2}(?<year>\d)\/(?<semester>\d)-?(?<language>[A-Z]{3})\.(?<languageLevel>[A-Z]\d\+?(?:\/[A-Z]\d)?)-?(?<languageLevelVariant>[A-Z]{2})?-0?(?<languageGroupNumber>\d{1,2})/,
//     PPUZ: /^PPUZ-[A-Z]{3}(?<mode>[SN])(?<tier>[12M])-(?<year>\d)(?<semester>\d)(?<groupNumber>.+)/,
// } as const;

// const selectGroupDetailRegex = (headerName: string) => {
//     if (headerName.startsWith('CJ')) {
//         return GROUP_HEADER_DETAIL_REGEX.CJ;
//     }

//     if (headerName.startsWith('PPUZ')) {
//         return GROUP_HEADER_DETAIL_REGEX.PPUZ;
//     }

//     return GROUP_HEADER_DETAIL_REGEX.DEFAULT;
// };

// const extractGroupHeaderDetails = (headerName: string) => {
//     const matches = headerName.match(selectGroupDetailRegex(headerName))?.groups;
//     if (!matches) {
//         return null;
//     }

//     const year = parseInt(matches.year!);
//     const semester = parseInt(matches.semester!);

//     return {
//         // Double ternary, why not?
//         tier:
//             matches.tier === '1'
//                 ? ('bachelor' satisfies GroupTier)
//                 : matches.tier === '2'
//                   ? ('master' satisfies GroupTier)
//                   : ('uniform' satisfies GroupTier),
//         mode: matches.mode === 'S' ? ('full-time' satisfies GroupMode) : ('part-time' satisfies GroupMode),
//         // Semester 10 is represented by year=5, semester=1
//         semester: year === 5 && semester === 1 ? 10 : semester,
//         groupNumber: matches.groupNumber,
//         language: matches.language,
//         languageLevel: matches.languageLevel,
//         languageLevelVariant: matches.languageLevelVariant,
//         languageGroupNumber: matches.languageGroupNumber ? parseInt(matches.languageGroupNumber) : undefined,
//     };
// };

// const headersResponseSchema = z.array(
//     z.object({
//         id: scheduleIdSchema,
//         name: z.string().check(z.minLength(1)),
//     }),
// );

// const useHeadersAPI = createUseAPI(
//     (scheduleType: ScheduleType, grouping: string) =>
//         `/api/headers?type=${scheduleType}}&grouping=${encodeURIComponent(grouping ?? '')}`,
//     (responseData, scheduleType) =>
//         headersResponseSchema.parse(responseData).map((header) => ({
//             ...header,
//             details: scheduleType === 'group' ? extractGroupHeaderDetails(header.name) : null,
//         })),
// );

const aggregateScheduleResponseSchema = z.object({
    headers: z.array(
        z.object({
            id: scheduleIdSchema,
            name: z.string().check(z.minLength(1)),
            moodleId: z.optional(z.number()),
        }),
    ),
    items: z.array(
        z.object({
            start: z.iso.datetime({ offset: true }),
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
});

export const useAggregateScheduleAPI = createUseAPI(
    (scheduleType: ScheduleType, scheduleIds: number[], lastYear: boolean) =>
        scheduleIds.length > 0
            ? `/api/aggregateSchedule?type=${scheduleType}&lastYear=${lastYear ? '1' : '0'}${scheduleIds.map((scheduleId) => `&id=${scheduleId}`).join('')}`
            : '',
    async (responseData /*, scheduleType*/) => {
        const aggregateScheduleResponse = aggregateScheduleResponseSchema.parse(responseData);
        return {
            ...aggregateScheduleResponse,
            // headers: aggregateScheduleResponse.headers.map((header) => ({
            //     ...header,
            //     details: scheduleType === 'group' ? extractGroupHeaderDetails(header.name) : null,
            // })),
            items: await Promise.all(
                aggregateScheduleResponse.items.map(async (responseItem) => ({
                    ...responseItem,
                    start: parseISODateWithTimezone(responseItem.start),
                    end: parseISODateWithTimezone(responseItem.end),
                    id: await sha1(
                        responseItem.type,
                        responseItem.start,
                        responseItem.end,
                        responseItem.subject,
                        ...responseItem.groups,
                        ...responseItem.lecturers.flatMap((lecturer) => [lecturer.name, lecturer.moodleId]),
                        responseItem.room?.name,
                        responseItem.room?.url,
                        responseItem.extra,
                    ),
                    category: SCHEDULE_ITEM_TYPE_TO_CATEGORY[responseItem.type],
                })),
            ),
        };
    },
);

export type AggregateSchedule = NonNullable<ReturnType<typeof useAggregateScheduleAPI>['data']>;
export type ScheduleItem = AggregateSchedule['items'][number];

export const createOfficialScheduleURL = (scheduleType: ScheduleType, scheduleId: number) =>
    `https://planzajec.uek.krakow.pl/index.php?typ=${
        {
            group: 'G',
            lecturer: 'N',
            room: 'S',
        }[scheduleType]
    }&id=${scheduleId}&okres=1`;

export const createICalURL = (
    scheduleType: ScheduleType,
    scheduleIds: number[],
    hiddenSubjectsAndTypes: {
        subject: string;
        type: string;
    }[],
) =>
    `${window.location.origin}/api/ical/${encodeURIComponent(compress(JSON.stringify({ scheduleType, scheduleIds, hiddenSubjectsAndTypes })))}`;

export const createMoodleURL = (moodleId: number) => `https://e-uczelnia.uek.krakow.pl/course/view.php?id=${moodleId}`;
