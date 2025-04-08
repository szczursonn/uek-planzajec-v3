import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { type TargetedEvent } from 'preact/compat';
import type * as z from '@zod/mini';
import { compress, decompress } from './utils';

export type QueryParams = Readonly<Record<string, string>>;
export type QueryParamsUpdateCallback = (queryParams: QueryParams) => QueryParams;

const COMPRESSED_URL_PATHNAME = 'c';
const COMPRESSED_URL_THRESHOLD = 320;

export const extractQueryParamsFromURL = (url: string) => {
    const parsedURL = new URL(url);
    const urlQueryParams = parsedURL.pathname.startsWith(`/${COMPRESSED_URL_PATHNAME}`)
        ? new URLSearchParams(
              decompress(decodeURIComponent(parsedURL.pathname.substring(COMPRESSED_URL_PATHNAME.length + 2))),
          )
        : parsedURL.searchParams;

    return Object.fromEntries(Array.from(urlQueryParams.entries()).filter(([, value]) => value)) as QueryParams;
};

export const createURLFromQueryParams = (queryParams: QueryParams) => {
    const encodedQueryParams = new URLSearchParams(
        Object.fromEntries([...Object.entries(queryParams)].filter(([, value]) => value)),
    ).toString();

    if (encodedQueryParams.length === 0) {
        return window.location.origin;
    }

    if (encodedQueryParams.length < COMPRESSED_URL_THRESHOLD) {
        return `${window.location.origin}/?${encodedQueryParams}`;
    }

    return `${window.location.origin}/${COMPRESSED_URL_PATHNAME}/${encodeURIComponent(compress(encodedQueryParams))}`;
};

let queryParams = extractQueryParamsFromURL(window.location.href);
let listeners = [] as (() => void)[];

window.addEventListener('popstate', () => {
    queryParams = extractQueryParamsFromURL(window.location.href);
    listeners.forEach((cb) => cb());
});

export const updateQueryParams = (
    historyUpdateType: 'replaceState' | 'pushState',
    ...updateCallbacks: QueryParamsUpdateCallback[]
) => {
    queryParams = updateCallbacks.reduce((queryParams, updateCallback) => updateCallback(queryParams), queryParams);

    try {
        window.history[historyUpdateType](window.history.state, '', createURLFromQueryParams(queryParams));
    } catch (err) {
        console.error('[queryParamState] failed to modify history', err);
    }

    listeners.forEach((cb) => cb());
};

// this needs to be a hook, so generated URL's are updated on changes to all query params, not only to those observed by the component
export const useCreateURL = () => {
    const [localQueryParams, setLocalQueryParams] = useState(queryParams);

    useEffect(() => {
        const notifyCallback = () => setLocalQueryParams(queryParams);
        listeners.push(notifyCallback);
        return () => {
            listeners = listeners.filter((cb) => cb !== notifyCallback);
        };
    }, []);

    return useCallback(
        (...updateCallbacks: QueryParamsUpdateCallback[]) =>
            createURLFromQueryParams(
                updateCallbacks.reduce((queryParams, updateCallback) => updateCallback(queryParams), localQueryParams),
            ),
        [queryParams],
    );
};

export const createUpdateFromURL =
    (url: string): QueryParamsUpdateCallback =>
    () =>
        extractQueryParamsFromURL(url);

export const createQueryParamState = <T>(
    queryParamName: string,
    decode: (queryParamValue: string) => T,
    encode: (value: T) => string,
) =>
    ({
        use: () => {
            const [queryParamValue, setQueryParamValue] = useState(queryParams[queryParamName] ?? '');

            useEffect(() => {
                // if setQueryParamValue gets called with the current value, there is no re-render, so there is no need for key-specific listeners
                const notifyCallback = () => setQueryParamValue(() => queryParams[queryParamName] ?? '');
                listeners.push(notifyCallback);

                return () => {
                    listeners = listeners.filter((cb) => cb !== notifyCallback);
                };
            }, []);

            return useMemo(() => decode(queryParamValue), [queryParamValue]);
        },
        get: () => decode(queryParams[queryParamName] ?? ''),
        createUpdate:
            (newValue: T): QueryParamsUpdateCallback =>
            (queryParams) => ({
                ...queryParams,
                [queryParamName]: encode(newValue),
            }),
    }) as const;

export const createBooleanQueryParamState = (key: string, defaultValue: boolean) =>
    createQueryParamState(
        key,
        (queryParamValue) => {
            if (queryParamValue === '0') {
                return false;
            }
            if (queryParamValue === '1') {
                return true;
            }
            return defaultValue;
        },
        (value) => {
            if (value === defaultValue) {
                return '';
            }
            return value ? '1' : '0';
        },
    );

export const createEnumQueryParamState = <T extends Readonly<Record<string, z.core.util.EnumValue>>>(
    key: string,
    enumSchema: z.ZodMiniEnum<T>,
    defaultValue: z.core.$InferEnumOutput<T>,
) =>
    createQueryParamState(
        key,
        (queryParamValue) => enumSchema.safeParse(queryParamValue).data ?? defaultValue,
        (value) => (value === defaultValue ? '' : value.toString()),
    );

export const createStringQueryParamState = (key: string) =>
    createQueryParamState(
        key,
        (queryParamValue) => queryParamValue,
        (value) => value,
    );

export const anchorClickPushStateHandler = (event: TargetedEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    updateQueryParams('pushState', createUpdateFromURL(event.currentTarget.href));
};
