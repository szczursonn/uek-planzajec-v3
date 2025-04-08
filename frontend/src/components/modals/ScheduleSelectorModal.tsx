import clsx from 'clsx';
import { scheduleIdsState, scheduleTypeState } from '../../lib/appScheduleQuery';
import { labels } from '../../lib/intl/labels';
import {
    updateQueryParams,
    createBooleanQueryParamState,
    createStringQueryParamState,
} from '../../lib/state/queryParamsState';
import { Modal } from './Modal';
import { GroupGroupingsSelector, groupGroupingsSelectorSearchState } from '../selector/GroupGroupingsSelector';
import {
    GroupHeadersSelector,
    groupHeadersSelectorGroupLanguageLevelState,
    groupHeadersSelectorGroupLanguageState,
    groupHeadersSelectorGroupModeState,
    groupHeadersSelectorGroupSemesterState,
    groupHeadersSelectorGroupStageState,
    groupHeadersSelectorSearchState,
} from '../selector/GroupHeadersSelector';
import { LecturerHeadersSelector, lecturerHeadersSelectorSearchState } from '../selector/LecturerHeadersSelector';
import { RoomGroupingsSelector } from '../selector/RoomGroupingsSelector';
import { roomHeadersSelectorSearchState, RoomHeadersSelector } from '../selector/RoomHeadersSelector';
import { RoundIconButton } from '../common/RoundIconButton';
import { SCHEDULE_TYPES } from '../../lib/api/common';

export const selectorModalOpenState = createBooleanQueryParamState('select', false);
export const selectorGroupingState = createStringQueryParamState('select_grouping');

export const ScheduleSelectorModalHost = () => (selectorModalOpenState.use() ? <ScheduleSelectorModal /> : null);

const ScheduleSelectorModal = () => {
    const currentScheduleType = scheduleTypeState.use();
    const currentSelectedGrouping = selectorGroupingState.use();
    const isSelectingInitialSchedule = scheduleIdsState.use().length === 0;

    return (
        <Modal
            title={[labels.selectScheduleCTAs[currentScheduleType], currentSelectedGrouping]
                .filter(Boolean)
                .join(' - ')}
            width="large"
            height="full"
            onClose={() =>
                updateQueryParams(
                    'pushState',
                    selectorModalOpenState.createUpdate(false),
                    selectorGroupingState.createUpdate(''),
                    groupGroupingsSelectorSearchState.createUpdate(''),
                    groupHeadersSelectorSearchState.createUpdate(''),
                    groupHeadersSelectorGroupModeState.createUpdate(''),
                    groupHeadersSelectorGroupStageState.createUpdate(''),
                    groupHeadersSelectorGroupSemesterState.createUpdate(null),
                    groupHeadersSelectorGroupLanguageState.createUpdate(''),
                    groupHeadersSelectorGroupLanguageLevelState.createUpdate(''),
                    lecturerHeadersSelectorSearchState.createUpdate(''),
                    roomHeadersSelectorSearchState.createUpdate(''),
                )
            }
        >
            <div class="flex min-h-full flex-col gap-4">
                {currentSelectedGrouping && window.history.length > 1 && (
                    <RoundIconButton
                        class="h-8 w-8 p-1"
                        icon="arrowLeft"
                        title={labels.goBackCTA}
                        onClick={() => window.history.back()}
                    />
                )}
                {!currentSelectedGrouping && isSelectingInitialSchedule && (
                    <div class="flex text-center">
                        {SCHEDULE_TYPES.map((scheduleType) => (
                            <button
                                key={scheduleType}
                                class={clsx(
                                    'outline-x-cta-primary w-full rounded-t p-3 text-sm transition-colors focus-visible:outline-2 sm:text-base lg:p-2',
                                    scheduleType === currentScheduleType
                                        ? 'border-b-x-cta-darker text-x-cta-primary bg-x-bg-tertiary border-b-4 font-semibold'
                                        : 'border-b-x-bg-quaternary hover:border-b-x-bg-quinary hover:bg-x-bg-tertiary cursor-pointer border-b-2 hover:border-b-4',
                                )}
                                disabled={scheduleType === currentScheduleType}
                                type="button"
                                onClick={() =>
                                    updateQueryParams('pushState', scheduleTypeState.createUpdate(scheduleType))
                                }
                            >
                                {labels.scheduleTypeNames[scheduleType]}
                            </button>
                        ))}
                    </div>
                )}

                {currentScheduleType === 'group' &&
                    (currentSelectedGrouping ? <GroupHeadersSelector /> : <GroupGroupingsSelector />)}
                {currentScheduleType === 'lecturer' && <LecturerHeadersSelector />}
                {currentScheduleType === 'room' &&
                    (currentSelectedGrouping ? <RoomHeadersSelector /> : <RoomGroupingsSelector />)}
            </div>
        </Modal>
    );
};
