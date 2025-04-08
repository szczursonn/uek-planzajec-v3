import { TIME_ZONE } from './timeZone';

export class DateParts {
    private constructor(
        public readonly year: number,
        public readonly month: number,
        public readonly day: number,
        public readonly hour: number,
        public readonly minute: number,
    ) {}

    public static fromISO(isoDateWithTimezoneOffset: string) {
        const localParts = isoDateWithTimezoneOffset
            .split('T')
            .flatMap((part) => part.split('-'))
            .flatMap((part) => part.split(':'))
            .map((part) => parseInt(part));

        return new DateParts(localParts[0]!, localParts[1]!, localParts[2]!, localParts[3]!, localParts[4]!);
    }

    private static readonly LOCAL_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE.UEK,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    });

    private static readonly LOCAL_DATE_PART_TYPE_TO_INDEX = this.LOCAL_DATE_PARTS_FORMATTER.formatToParts(
        new Date(0),
    ).reduce(
        (map, part, i) => ({
            ...map,
            [part.type]: i,
        }),
        {} as Record<Intl.DateTimeFormatPart['type'], number>,
    );

    public static fromDate(date: Date) {
        const parts = this.LOCAL_DATE_PARTS_FORMATTER.formatToParts(date);

        return new DateParts(
            parseInt(parts[this.LOCAL_DATE_PART_TYPE_TO_INDEX.year]!.value),
            parseInt(parts[this.LOCAL_DATE_PART_TYPE_TO_INDEX.month]!.value),
            parseInt(parts[this.LOCAL_DATE_PART_TYPE_TO_INDEX.day]!.value),
            parseInt(parts[this.LOCAL_DATE_PART_TYPE_TO_INDEX.hour]!.value),
            parseInt(parts[this.LOCAL_DATE_PART_TYPE_TO_INDEX.minute]!.value),
        );
    }

    public isEqual(other: DateParts) {
        return this.isEqualWithoutTime(other) && this.hour === other.hour && this.minute === other.minute;
    }

    public isEqualWithoutTime(other: DateParts) {
        return this.year === other.year && this.month === other.month && this.day === other.day;
    }

    public compare(other: DateParts) {
        const withoutTimeCompareResult = this.compareWithoutTime(other);
        if (withoutTimeCompareResult !== 0) {
            return withoutTimeCompareResult;
        }

        if (this.hour > other.hour) {
            return 1;
        }

        if (this.hour < other.hour) {
            return -1;
        }

        if (this.minute > other.minute) {
            return 1;
        }

        if (this.minute < other.minute) {
            return -1;
        }

        return 0;
    }

    public compareWithoutTime(other: DateParts) {
        if (this.year > other.year) {
            return 1;
        }

        if (this.year < other.year) {
            return -1;
        }

        if (this.month > other.month) {
            return 1;
        }

        if (this.month < other.month) {
            return -1;
        }

        if (this.day > other.day) {
            return 1;
        }

        if (this.day < other.day) {
            return -1;
        }

        return 0;
    }

    public isLastDayOfMonth() {
        return this.day === this.getLastDayOfCurrentMonth();
    }

    private getLastDayOfCurrentMonth() {
        if (this.month === 2) {
            return this.year % 4 === 0 && this.year % 100 !== 0 ? 29 : 28;
        }

        if (
            this.month === 1 ||
            this.month === 3 ||
            this.month === 5 ||
            this.month === 7 ||
            this.month === 8 ||
            this.month === 10 ||
            this.month === 12
        ) {
            return 31;
        }

        return 30;
    }

    private static TIME_LOOP_STEP = 1000 * 60 * 15; // 15m - smallest diff between timezones

    private static readonly TIME_ZONE_OFFSET_CHECK_FORMATTER = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE.UEK,
        timeZoneName: 'longOffset',
    });

    private static prefixNumberWithZero(n: number) {
        return n.toString().padStart(2, '0');
    }

    private static getMostlyAccurateTimeZoneOffset(date: Date) {
        const offsetString = this.TIME_ZONE_OFFSET_CHECK_FORMATTER.formatToParts(date).at(-1)!.value.substring(3);
        if (offsetString === '') {
            return 0;
        }

        const [hourOffset, minuteOffset] = offsetString.split(':').map((part) => parseInt(part)) as [number, number];

        return hourOffset * 60 * 60 * 1000 + (hourOffset > 0 ? minuteOffset : -minuteOffset) * 60 * 1000;
    }

    public toDate() {
        // 1. Parse the date as if it was UTC
        const date = new Date(
            `${this.year}-${DateParts.prefixNumberWithZero(this.month)}-${DateParts.prefixNumberWithZero(this.day)}T${DateParts.prefixNumberWithZero(this.hour)}:${DateParts.prefixNumberWithZero(this.minute)}:00.000Z`,
        );

        // 2. Offset the date by the mostlyAccurate™ timezone's offset for that date (will be inaccurate if Daylight Saving Time boundary has been crossed)
        date.setTime(date.getTime() - DateParts.getMostlyAccurateTimeZoneOffset(date));

        // 3. Change the date a little bit at a time to fix the inaccuracy (super inefficient)
        while (true) {
            // const compareDatePartsResult = compareDateParts(dateParts, getLocalDatePartsFromDate(date));
            const compareResult = this.compare(DateParts.fromDate(date));

            if (compareResult === 1) {
                date.setTime(date.getTime() + DateParts.TIME_LOOP_STEP);
            } else if (compareResult === -1) {
                date.setTime(date.getTime() - DateParts.TIME_LOOP_STEP);
            } else {
                break;
            }
        }

        return date;
    }

    public static *eachDayBetween(start: DateParts, end: DateParts) {
        let current = start.stripTime();
        while (true) {
            yield current;

            if (current.isEqualWithoutTime(end)) {
                break;
            }

            current = current.incrementDay();
        }
    }

    public incrementDay() {
        if (this.isLastDayOfMonth()) {
            if (this.month === 12) {
                return new DateParts(this.year + 1, 1, 1, this.hour, this.minute);
            }
            return new DateParts(this.year, this.month + 1, 1, this.hour, this.minute);
        }
        return new DateParts(this.year, this.month, this.day + 1, this.hour, this.minute);
    }

    public stripTime() {
        return new DateParts(this.year, this.month, this.day, 0, 0);
    }

    public toTimeString() {
        return `${DateParts.prefixNumberWithZero(this.hour)}:${DateParts.prefixNumberWithZero(this.minute)}`;
    }
}
