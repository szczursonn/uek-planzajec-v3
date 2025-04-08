import { TIME_ZONE } from './consts';

// year, month, day, hour, minute
export type LocalDateParts = [number, number, number, number, number];

export const compareDateParts = (parts1: LocalDateParts, parts2: LocalDateParts) => {
    for (let i = 0; i < 5; i++) {
        if (parts1[i]! > parts2[i]!) {
            return 1;
        }

        if (parts1[i]! < parts2[i]!) {
            return -1;
        }
    }

    return 0;
};

export const compareDatePartsWithoutTime = (parts1: LocalDateParts, parts2: LocalDateParts) => {
    for (let i = 0; i < 3; i++) {
        if (parts1[i]! > parts2[i]!) {
            return 1;
        }

        if (parts1[i]! < parts2[i]!) {
            return -1;
        }
    }

    return 0;
};

const timeZoneCheckFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    timeZoneName: 'longOffset',
});
const getMostlyAccurateTimezoneOffset = (date: Date) => {
    const offsetString = timeZoneCheckFormatter.formatToParts(date).at(-1)!.value.substring(3);

    if (offsetString === '') {
        return 0;
    }

    const [hourOffset, minuteOffset] = offsetString.split(':').map((part) => parseInt(part)) as [number, number];

    return hourOffset * 60 * 60 * 1000 + (hourOffset > 0 ? minuteOffset : -minuteOffset) * 60 * 1000;
};

const localDatePartsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
});

const LOCAL_DATE_PART_TYPE_TO_INDEX = localDatePartsFormatter.formatToParts(new Date(0)).reduce(
    (map, part, i) => ({
        ...map,
        [part.type]: i,
    }),
    {} as Record<Intl.DateTimeFormatPart['type'], number>,
);

export const getLocalDatePartsFromDate = (date: Date) => {
    const parts = localDatePartsFormatter.formatToParts(date);

    return [
        parseInt(parts[LOCAL_DATE_PART_TYPE_TO_INDEX.year]!.value),
        parseInt(parts[LOCAL_DATE_PART_TYPE_TO_INDEX.month]!.value),
        parseInt(parts[LOCAL_DATE_PART_TYPE_TO_INDEX.day]!.value),
        parseInt(parts[LOCAL_DATE_PART_TYPE_TO_INDEX.hour]!.value),
        parseInt(parts[LOCAL_DATE_PART_TYPE_TO_INDEX.minute]!.value),
    ] as LocalDateParts;
};

const isPartsLastDayOfMonth = (dateParts: LocalDateParts) => {
    if (dateParts[1] === 2) {
        if (dateParts[0] % 4 === 0 && dateParts[0] % 100 !== 0) {
            return dateParts[2] === 29;
        } else {
            return dateParts[2] === 28;
        }
    }

    if (
        dateParts[1] === 1 ||
        dateParts[1] === 3 ||
        dateParts[1] === 5 ||
        dateParts[1] === 7 ||
        dateParts[1] === 8 ||
        dateParts[1] === 10 ||
        dateParts[1] === 12
    ) {
        return dateParts[2] === 31;
    }

    return dateParts[2] === 30;
};

export const areDatePartsEqualWithoutTime = (parts1: LocalDateParts, parts2: LocalDateParts) =>
    parts1[0] === parts2[0] && parts1[1] === parts2[1] && parts1[2] === parts2[2];

export function* eachLocalDatePartsBetween(startParts: LocalDateParts, endParts: LocalDateParts) {
    const currentParts = [startParts[0], startParts[1], startParts[2], 0, 0] as LocalDateParts;

    while (true) {
        yield [...currentParts] as LocalDateParts;

        if (areDatePartsEqualWithoutTime(currentParts, endParts)) {
            break;
        }

        if (isPartsLastDayOfMonth(currentParts)) {
            currentParts[2] = 1;

            if (currentParts[1] === 12) {
                currentParts[0]++;
                currentParts[1] = 1;
            } else {
                currentParts[1]++;
            }
        } else {
            currentParts[2]++;
        }
    }
}

const prefixNumberWithZero = (n: number) => n.toString().padStart(2, '0');

const TIME_LOOP_STEP = 1000 * 60 * 15; // 15m
export const getDateFromLocalParts = (dateParts: LocalDateParts) => {
    // 1. Parse the date as if it was UTC
    const date = new Date(
        `${dateParts[0]}-${prefixNumberWithZero(dateParts[1])}-${prefixNumberWithZero(dateParts[2])}T${prefixNumberWithZero(dateParts[3])}:${prefixNumberWithZero(dateParts[4])}:00.000Z`,
    );

    // 2. Offset the date by the mostlyAccurate™ timezone's offset for that date (may be inaccurate if DST boundary has been crossed)
    date.setTime(date.getTime() - getMostlyAccurateTimezoneOffset(date));

    // 3. Change the date a little bit at a time to fix the inaccuracy (super inefficient)
    while (true) {
        const compareDatePartsResult = compareDateParts(dateParts, getLocalDatePartsFromDate(date));

        if (compareDatePartsResult === 1) {
            date.setTime(date.getTime() + TIME_LOOP_STEP);
        } else if (compareDatePartsResult === -1) {
            date.setTime(date.getTime() - TIME_LOOP_STEP);
        } else {
            break;
        }
    }

    return date;
};

export const stripLocalTime = (date: Date) => {
    const localDateParts = getLocalDatePartsFromDate(date);
    const localDatePartsWithoutTime = stripLocalTimeFromParts(localDateParts);

    // optimization: do not call getDateFromLocalParts unnecessarily
    if (!localDateParts.every((_, i) => localDateParts[i] === localDatePartsWithoutTime[i])) {
        return getDateFromLocalParts(localDatePartsWithoutTime);
    }

    return date;
};

export const stripLocalTimeFromParts = (parts: LocalDateParts) =>
    [parts[0], parts[1], parts[2], 0, 0] as LocalDateParts;

export const parseISODateWithTimezone = (isoDateWithTimezoneOffset: string) => {
    // TODO: validation?

    const localParts = isoDateWithTimezoneOffset
        .split('T')
        .flatMap((part) => part.split('-'))
        .flatMap((part) => part.split(':'))
        .map((part) => parseInt(part));
    localParts.length = 5;

    return {
        iso: isoDateWithTimezoneOffset,
        date: new Date(isoDateWithTimezoneOffset),
        localParts: localParts as LocalDateParts,
    };
};

const DATE_LOOP_STEP = 1000 * 60 * 60 * 12; //12h
const dayOfWeekCheckFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
});
export const getClosestPastMonday = (date: Date) => {
    date = new Date(date);

    while (dayOfWeekCheckFormatter.format(date) !== 'Mon') {
        date.setTime(date.getTime() - DATE_LOOP_STEP);
    }

    return stripLocalTime(date);
};

export const getClosestFutureSunday = (date: Date) => {
    date = new Date(date);

    while (dayOfWeekCheckFormatter.format(date) !== 'Sun') {
        date.setTime(date.getTime() + DATE_LOOP_STEP);
    }

    return stripLocalTime(date);
};

export const advancePartsByOneDay = (parts: LocalDateParts) => {
    parts = [...parts];

    if (isPartsLastDayOfMonth(parts)) {
        parts[2] = 1;

        if (parts[1] === 12) {
            parts[0]++;
            parts[1] = 1;
        } else {
            parts[1]++;
        }
    } else {
        parts[2]++;
    }

    return parts;
};

export const formatPartsTime = (parts: LocalDateParts) =>
    `${parts[3].toString().padStart(2, '0')}:${parts[4].toString().padStart(2, '0')}`;
