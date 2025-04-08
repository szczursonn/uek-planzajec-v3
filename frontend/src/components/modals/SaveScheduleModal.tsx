import { useState } from 'preact/hooks';
import { createBooleanQueryParamState, updateQueryParams } from '../../lib/queryParamState';
import {
    hiddenSubjectsAndTypesState,
    scheduleIdsState,
    scheduleTypeState,
    useAppScheduleQuery,
} from '../../lib/useAppScheduleQuery';
import { Modal } from './Modal';
import { labels } from '../../lib/labels';
import { TextInput } from '../common/TextInput';
import { Button } from '../common/Button';
import { savedSchedulesState } from '../../lib/useSavedSchedules';

export const isSaveScheduleModalOpenState = createBooleanQueryParamState('save', false);

export const SaveScheduleModalHost = () => (isSaveScheduleModalOpenState.use() ? <SaveScheduleModal /> : <></>);

const SaveScheduleModal = () => {
    const query = useAppScheduleQuery();
    const scheduleIds = scheduleIdsState.use();
    const savedSchedules = savedSchedulesState.use();

    const placeholder = (query.data?.headers.map((header) => header.name) ?? scheduleIds).join(', ');

    const [newSavedScheduleName, setNewSavedScheduleName] = useState(placeholder);
    const newSavedScheduleNameTrimmed = newSavedScheduleName.trim();

    const addSavedSchedule = () => {
        savedSchedulesState.set([
            ...savedSchedules,
            {
                name: newSavedScheduleNameTrimmed,
                type: scheduleTypeState.get(),
                ids: scheduleIdsState.get(),
                hiddenSubjectsAndTypes: hiddenSubjectsAndTypesState.get(),
            },
        ]);
        updateQueryParams('pushState', isSaveScheduleModalOpenState.createUpdate(false));
    };

    const disabled =
        !newSavedScheduleNameTrimmed ||
        !!savedSchedules.find((savedSchedule) => savedSchedule.name === newSavedScheduleNameTrimmed);

    return (
        <Modal
            title={labels.saveCTA}
            onClose={() => updateQueryParams('pushState', isSaveScheduleModalOpenState.createUpdate(false))}
        >
            <div class="flex flex-col gap-4 text-center md:min-w-100">
                <TextInput
                    autofocus
                    placeholder={placeholder}
                    value={newSavedScheduleName}
                    onChange={setNewSavedScheduleName}
                    onEnterKeyPress={disabled ? undefined : addSavedSchedule}
                />
                <Button
                    variant="cta"
                    class="col-span-full"
                    text={labels.saveCTA}
                    disabled={disabled}
                    icon="plus"
                    onClick={addSavedSchedule}
                />
            </div>
        </Modal>
    );
};
