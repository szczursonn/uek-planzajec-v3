import { useEffect, useState } from 'preact/hooks';
import { labels } from '../../lib/intl/labels';
import { createBooleanQueryParamState, updateQueryParams } from '../../lib/state/queryParamsState';
import { createICalURL } from '../../lib/api/common';
import { hiddenSubjectsState, scheduleIdsState, scheduleTypeState } from '../../lib/appScheduleQuery';
import { Modal } from './Modal';
import { Button } from '../common/Button';

export const isExportModalOpenState = createBooleanQueryParamState('export', false);

export const ExportModalHost = () => (isExportModalOpenState.use() ? <ExportModal /> : null);

const ExportModal = () => {
    const [isCopySuccessIconVisible, setIsCopySuccessIconVisible] = useState(false);

    useEffect(() => {
        if (!isCopySuccessIconVisible) {
            return;
        }

        const resetCopySuccessIconTimeout = setTimeout(() => {
            setIsCopySuccessIconVisible(false);
        }, 3_000);

        return () => {
            clearTimeout(resetCopySuccessIconTimeout);
        };
    }, [isCopySuccessIconVisible]);

    const icalURL = createICalURL({
        scheduleType: scheduleTypeState.use(),
        scheduleIds: scheduleIdsState.use(),
        hiddenSubjects: hiddenSubjectsState.use(),
    });

    return (
        <Modal
            title={labels.exportCTA}
            onClose={() => updateQueryParams('pushState', isExportModalOpenState.createUpdate(false))}
        >
            <div class="flex flex-col items-center gap-4 text-center">
                <div class="flex w-full flex-col items-center justify-center gap-2 lg:flex-row">
                    <a
                        href={icalURL}
                        target="_blank"
                        download
                        class="bg-x-bg-tertiary border-x-bg-quaternary focus-visible:outline-x-cta-primary max-w-4/5 overflow-x-auto rounded-lg border-2 p-1 text-xs whitespace-nowrap hover:underline focus-visible:outline-2 md:text-sm lg:max-w-3/5"
                    >
                        {icalURL}
                    </a>
                    <div class="flex gap-2">
                        <Button
                            variant="tertiary"
                            class="h-12 w-12"
                            iconClass={isCopySuccessIconVisible ? 'fill-green-500' : ''}
                            icon={isCopySuccessIconVisible ? 'check' : 'copy'}
                            onClick={() =>
                                navigator.clipboard.writeText(icalURL).then(() => setIsCopySuccessIconVisible(true))
                            }
                        />
                        {window.navigator.canShare?.({
                            url: icalURL,
                        }) && (
                            <Button
                                variant="tertiary"
                                class="h-12 w-12"
                                icon="share"
                                title={labels.shareCTA}
                                onClick={() =>
                                    window.navigator.share({
                                        url: icalURL,
                                    })
                                }
                            />
                        )}
                    </div>
                </div>

                <a
                    href="https://support.google.com/calendar/answer/37100"
                    target="_blank"
                    title={labels.howToAddICalToGoogleCalendarLinkTitle}
                    class="text-x-cta-primary hover:underline"
                >
                    {labels.howToAddICalToGoogleCalendarLinkTitle}
                </a>
            </div>
        </Modal>
    );
};
