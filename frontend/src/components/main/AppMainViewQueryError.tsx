import { labels } from '../../lib/intl/labels';
import { createOfficialScheduleURL } from '../../lib/api/common';
import { scheduleIdsState, scheduleTypeState, useAppScheduleQuery } from '../../lib/appScheduleQuery';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { formatError } from '../../lib/errors';

export const AppMainViewQueryError = () => {
    const query = useAppScheduleQuery();
    const currentScheduleIds = scheduleIdsState.use();
    const currentScheduleType = scheduleTypeState.use();

    return (
        <div class="bg-x-bg-error border-x-bg-error-darker text-x-text-error mt-16 flex flex-col items-center justify-center gap-2 rounded-lg border-4 px-32 py-8 text-center md:mx-auto md:w-1/2">
            <Icon name="alert" class="h-16 w-16" />
            <p class="text-lg">{labels.unexpectedErrorHasOccured}</p>
            <pre class="bg-x-bg-error-darker max-h-96 min-w-1/2 overflow-y-auto rounded-md p-2 text-left font-mono text-sm">
                {formatError(query.error)}
            </pre>

            <div class="bg-x-bg-error-darker rounded-lg border-2 p-3">
                <p class="text-lg font-semibold">{labels.officialSchedule}</p>

                {currentScheduleIds.map((scheduleId) => {
                    const url = createOfficialScheduleURL(currentScheduleType, scheduleId);

                    return (
                        <div key={scheduleId} class="text-sm md:text-base">
                            <span class="font-semibold">{scheduleId}: </span>
                            <a
                                class="hover:underline"
                                title={labels.officialScheduleFor(scheduleId.toString())}
                                href={url}
                                target="_blank"
                            >
                                {url}
                            </a>
                        </div>
                    );
                })}
            </div>

            <Button class="text-x-text-default" onClick={() => query.mutate()} text={labels.refreshCTA} />
        </div>
    );
};
