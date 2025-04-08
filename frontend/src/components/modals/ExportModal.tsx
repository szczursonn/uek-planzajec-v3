import { useEffect, useState } from 'preact/hooks';
import { labels } from '../../lib/labels';
import { Modal } from './Modal';
import { Button } from '../common/Button';
import { createICalURL } from '../../lib/uek';
import { createBooleanQueryParamState, updateQueryParams } from '../../lib/queryParamState';
import { hiddenSubjectsAndTypesState, scheduleIdsState, scheduleTypeState } from '../../lib/useAppScheduleQuery';

export const isExportModalOpenState = createBooleanQueryParamState('export', false);

export const ExportModalHost = () => (isExportModalOpenState.use() ? <ExportModal /> : <></>);

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

    const icalURL = createICalURL(scheduleTypeState.use(), scheduleIdsState.use(), hiddenSubjectsAndTypesState.use());

    return (
        <Modal
            title={labels.addURLToGoogleCalendarMessage}
            onClose={() => updateQueryParams('pushState', isExportModalOpenState.createUpdate(false))}
        >
            <div class="flex max-w-250 flex-col items-center gap-4 text-center">
                <div class="flex w-full flex-col items-center justify-center gap-2 lg:flex-row">
                    <a
                        href={icalURL}
                        target="_blank"
                        download
                        class="bg-back-tertiary border-back-quaternary focus-visible:outline-cta-primary max-w-4/5 overflow-x-auto rounded-lg border-2 p-1 text-xs whitespace-nowrap hover:underline focus-visible:outline-2 md:text-sm lg:max-w-3/5"
                    >
                        {icalURL}
                    </a>
                    <div class="flex gap-2">
                        <Button
                            variant="tertiary"
                            class="h-12 w-12"
                            iconClass={isCopySuccessIconVisible ? 'fill-green-500' : ''}
                            icon={isCopySuccessIconVisible ? 'check' : 'copy'}
                            iconSize="medium"
                            title={labels.copyCTA}
                            onClick={() =>
                                navigator.clipboard.writeText(icalURL).then(() => setIsCopySuccessIconVisible(true))
                            }
                        />
                        <Button
                            variant="tertiary"
                            class="h-12 w-12"
                            icon="share"
                            iconSize="medium"
                            title={labels.shareCTA}
                            onClick={() =>
                                window.navigator.share({
                                    url: icalURL,
                                })
                            }
                        />
                    </div>
                </div>

                <a
                    href="https://support.google.com/calendar/answer/37100"
                    target="_blank"
                    title={labels.howToAddICalToGoogleCalendarMessage}
                    class="text-cta-primary hover:underline"
                >
                    {labels.howToAddICalToGoogleCalendarMessage}
                </a>
            </div>
        </Modal>
    );
};
