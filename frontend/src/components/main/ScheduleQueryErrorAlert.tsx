import { Icon } from '../common/Icon';
import { labels } from '../../lib/labels';
import { createOfficialScheduleURL } from '../../lib/uek';
import { Button } from '../common/Button';
import { scheduleIdsState, scheduleTypeState, useAppScheduleQuery } from '../../lib/useAppScheduleQuery';

export const ScheduleQueryErrorAlert = () => {
    const { error, revalidate } = useAppScheduleQuery();
    const scheduleIds = scheduleIdsState.use();
    const scheduleType = scheduleTypeState.use();

    return (
        <>
            <div class="pt-16"></div>
            <div class="bg-back-error text-error flex flex-col items-center justify-center gap-2 rounded-lg p-8 text-center md:mx-auto md:w-1/2">
                <Icon name="alert" class="h-16 w-16" />
                <p class="text-lg">{labels.unexpectedErrorHasOccured}</p>
                <p>{labels.checkIfOfficialScheduleIsWorkingMessage}</p>
                <code>{String(error)}</code>

                <div class="rounded-lg border-2 p-3">
                    <p class="text-lg font-semibold">{labels.officialSchedules}</p>
                    <ol>
                        {scheduleIds.map((scheduleId) => {
                            const url = createOfficialScheduleURL(scheduleType, scheduleId);

                            return (
                                <li key={url} class="text-sm md:text-base">
                                    <span class="font-semibold">{scheduleId}: </span>
                                    <a
                                        class="hover:underline"
                                        title={labels.officialScheduleFor(scheduleId.toString())}
                                        href={url}
                                        target="_blank"
                                    >
                                        {url}
                                    </a>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                <Button variant="secondary" class="text-white" onClick={revalidate} text={labels.refreshCTA} />
            </div>
        </>
    );
};
