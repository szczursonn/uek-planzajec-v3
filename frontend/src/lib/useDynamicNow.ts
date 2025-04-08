import { useEffect, useState } from 'preact/hooks';
import {
    advancePartsByOneDay,
    getDateFromLocalParts,
    getLocalDatePartsFromDate,
    stripLocalTimeFromParts,
} from './dateTime';

export type DynamicNowResolution = 'minute' | 'localDay';

const RESOLUTION_TO_TIMEOUT_END_DATE_PROVIDER = {
    minute: (timeoutStartDate: Date) =>
        new Date(
            timeoutStartDate.getTime() +
                60_000 -
                timeoutStartDate.getSeconds() * 1000 -
                timeoutStartDate.getMilliseconds(),
        ),
    localDay: (timeoutStartDate: Date) =>
        getDateFromLocalParts(
            stripLocalTimeFromParts(advancePartsByOneDay(getLocalDatePartsFromDate(timeoutStartDate))),
        ),
} as const;

export const useDynamicNow = (resolution: DynamicNowResolution) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const getTimeoutEndDate = RESOLUTION_TO_TIMEOUT_END_DATE_PROVIDER[resolution];
        let timeout: ReturnType<typeof setTimeout> | null = null;

        const updateNow = () => setNow(new Date());

        const startTimeout = () => {
            if (!timeout) {
                const timeoutStartDate = new Date();
                const timeoutEndDate = getTimeoutEndDate(timeoutStartDate);

                timeout = setTimeout(() => {
                    stopTimeout();
                    updateNow();
                    startTimeout();
                }, timeoutEndDate.getTime() - timeoutStartDate.getTime());
            }
        };

        const stopTimeout = () => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateNow();
                startTimeout();
            } else {
                stopTimeout();
            }
        };

        startTimeout();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopTimeout();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [resolution]);

    return now;
};
