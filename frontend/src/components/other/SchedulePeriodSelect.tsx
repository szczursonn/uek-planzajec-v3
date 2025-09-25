import { useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { TIME_ZONE } from '../../lib/date/timeZone';
import { labels } from '../../lib/intl/labels';
import { LOCALE } from '../../lib/intl/locale';
import { schedulePeriodSchema, useSchedulePeriod } from '../../lib/schedulePeriod';

const otherOptionsDateFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE.UEK,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

export const SchedulePeriodSelect = ({
    class: selectClass,
    optgroupClass,
    optionClass,
}: {
    class?: string;
    optgroupClass?: string;
    optionClass?: string;
}) => {
    const query = useAppScheduleQuery();
    const [currentSchedulePeriod, setSchedulePeriod] = useSchedulePeriod();

    return (
        <select
            class={selectClass}
            value={currentSchedulePeriod}
            onChange={(event) => {
                const valueAsNumber = parseInt(event.currentTarget.value);
                setSchedulePeriod(
                    schedulePeriodSchema.parse(isNaN(valueAsNumber) ? event.currentTarget.value : valueAsNumber),
                );
            }}
        >
            <optgroup class={optgroupClass} label={labels.schedulePeriodCategoryPresets}>
                <option class={optionClass} value="inferUpcoming" label={labels.schedulePeriodUpcoming} />
                <option class={optionClass} value="inferCurrentYear" label={labels.schedulePeriodCurrentYear} />
            </optgroup>
            {query.data && (
                <optgroup class={optgroupClass} label={labels.schedulePeriodCategoryOthers}>
                    {query.data.periods.map((period) => (
                        <option
                            key={period.id}
                            class={optionClass}
                            value={period.id}
                            label={`${otherOptionsDateFormatter.format(period.start)} - ${otherOptionsDateFormatter.format(period.end)}`}
                        />
                    ))}
                </optgroup>
            )}
        </select>
    );
};
