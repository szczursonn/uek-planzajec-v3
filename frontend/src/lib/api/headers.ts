import * as z from '@zod/mini';
import { createUseAPI, scheduleIdSchema, ScheduleType } from './common';

const GROUP_MODES = ['full-time', 'part-time'] as const;
const groupModeSchema = z.enum([...GROUP_MODES]);
export type GroupMode = z.infer<typeof groupModeSchema>;

const GROUP_STAGE = ['bachelor', 'master', 'uniform'] as const;
const groupStageSchema = z.enum([...GROUP_STAGE]);
export type GroupStage = z.infer<typeof groupStageSchema>;

const HEADER_DETAIL_REGEX = {
    DEFAULT: /^[A-Z]{4}(?<mode>[SN])(?<stage>[12M])-(?<year>\d)(?<semester>\d)(?<groupNumber>.+)/,
    CJ: /(?<mode>[SN])(?<stage>[12M])-{1,2}(?<year>\d)\/(?<semester>\d)-?(?<language>[A-Z]{3})\.(?<languageLevel>[A-Z]\d\+?(?:\/[A-Z]\d)?)-?(?<languageLevelVariant>[A-Z]{2})?-0?(?<languageGroupNumber>\d{1,2})/,
    PPUZ: /^PPUZ-[A-Z]{3}(?<mode>[SN])(?<stage>[12M])-(?<year>\d)(?<semester>\d)(?<groupNumber>.+)/,
} as const;

const selectHeaderDetailRegexFromName = (headerName: string) => {
    if (headerName.startsWith('CJ')) {
        return HEADER_DETAIL_REGEX.CJ;
    }

    if (headerName.startsWith('PPUZ')) {
        return HEADER_DETAIL_REGEX.PPUZ;
    }

    return HEADER_DETAIL_REGEX.DEFAULT;
};

const extractGroupHeaderDetails = (headerName: string) => {
    const matches = headerName.match(selectHeaderDetailRegexFromName(headerName))?.groups;
    if (!matches) {
        return null;
    }

    const year = parseInt(matches.year!);
    const semester = parseInt(matches.semester!);

    return {
        stage:
            matches.stage === '1'
                ? ('bachelor' satisfies GroupStage)
                : matches.stage === '2'
                  ? ('master' satisfies GroupStage)
                  : ('uniform' satisfies GroupStage),
        mode: matches.mode === 'S' ? ('full-time' satisfies GroupMode) : ('part-time' satisfies GroupMode),
        // Semester 10 is represented by year=5, semester=1
        semester: year === 5 && semester === 1 ? 10 : semester,
        groupNumber: matches.groupNumber,
        language: matches.language,
        languageLevel: matches.languageLevel,
        languageLevelVariant: matches.languageLevelVariant,
        languageGroupNumber: matches.languageGroupNumber ? parseInt(matches.languageGroupNumber) : undefined,
    } as const;
};

const headersResponseSchema = z.array(
    z.object({
        id: scheduleIdSchema,
        name: z.string().check(z.minLength(1)),
    }),
);

export const useHeadersAPI = createUseAPI(
    (scheduleType: ScheduleType, grouping: string) =>
        `/api/headers?type=${encodeURIComponent(scheduleType)}&grouping=${encodeURIComponent(grouping ?? '')}`,
    (responseData, scheduleType) =>
        headersResponseSchema.parse(responseData).map((responseHeader) => ({
            ...responseHeader,
            details: scheduleType === 'group' ? extractGroupHeaderDetails(responseHeader.name) : null,
        })),
);

export type ScheduleHeader = NonNullable<ReturnType<typeof useHeadersAPI>['data']>[number];
