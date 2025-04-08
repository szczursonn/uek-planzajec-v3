import { TIME_ZONE } from './timeZone';
import { DateParts } from './dateParts';

export const stripTime = (date: Date) => {
    const dateParts = DateParts.fromDate(date);
    const datePartsWithoutTime = dateParts.stripTime();

    // optimization: do not call expensive .toDate unnecessarily
    if (dateParts.isEqual(datePartsWithoutTime)) {
        return date;
    }

    return datePartsWithoutTime.toDate();
};

export const [getClosestPastMonday, getClosestFutureSunday] = (() => {
    const DATE_LOOP_STEP = 1000 * 60 * 60 * 12; // 12h
    const dayOfWeekCheckFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE.UEK,
        weekday: 'short',
    });

    const getClosestPastMonday = (date: Date) => {
        date = new Date(date);

        while (dayOfWeekCheckFormatter.format(date) !== 'Mon') {
            date.setTime(date.getTime() - DATE_LOOP_STEP);
        }

        return stripTime(date);
    };

    const getClosestFutureSunday = (date: Date) => {
        date = new Date(date);

        while (dayOfWeekCheckFormatter.format(date) !== 'Sun') {
            date.setTime(date.getTime() + DATE_LOOP_STEP);
        }

        return stripTime(date);
    };

    return [getClosestPastMonday, getClosestFutureSunday];
})();
