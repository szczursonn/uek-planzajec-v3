import * as z from 'zod/mini';
import useSWR from 'swr';

export const scheduleIdSchema = z.number().check(z.nonnegative());

export const SCHEDULE_TYPES = ['group', 'lecturer', 'room'] as const;
export const scheduleTypeSchema = z.enum([...SCHEDULE_TYPES]);
export type ScheduleType = z.infer<typeof scheduleTypeSchema>;

class InvalidStatusCodeError extends Error {
    constructor(public readonly statusCode: number) {
        super(`Invalid response status code: ${statusCode}`);
    }

    public get isClientError() {
        return this.statusCode >= 400 && this.statusCode < 500;
    }
}

export const createUseAPI =
    <TArgs extends unknown[], TReturn>(
        createEndpoint: (...args: TArgs) => string,
        processResponseData: (responseData: unknown, ...args: TArgs) => TReturn,
    ) =>
    (...args: TArgs) =>
        useSWR(
            createEndpoint(...args),
            async (endpoint) => {
                if (!endpoint) {
                    return undefined;
                }

                const res = await fetch(endpoint, {
                    cache: 'default',
                });

                if (!res.ok) {
                    throw new InvalidStatusCodeError(res.status);
                }

                // await new Promise((resolve) => setTimeout(resolve, 2_000));

                return processResponseData(await res.json(), ...args);
            },
            {
                onError: (err, endpoint) => console.error(`[api] [${endpoint}]`, err),
                shouldRetryOnError: (err) =>
                    !(err instanceof z.core.$ZodError) && !(err instanceof InvalidStatusCodeError && err.isClientError),
            },
        );

export const createOfficialScheduleURL = (scheduleType: ScheduleType, scheduleId: number) =>
    `https://planzajec.uek.krakow.pl/index.php?typ=${
        {
            group: 'G',
            lecturer: 'N',
            room: 'S',
        }[scheduleType]
    }&id=${scheduleId}&okres=1`;

export const createMoodleURL = (moodleId: number) => `https://e-uczelnia.uek.krakow.pl/course/view.php?id=${moodleId}`;

export const createICalURL = (options: {
    scheduleType: ScheduleType;
    scheduleIds: number[];
    hiddenSubjects: string[];
}) => `${window.location.origin}/api/ical/${encodeURIComponent(btoa(JSON.stringify(options)))}`;
