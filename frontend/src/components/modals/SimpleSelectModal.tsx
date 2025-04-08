import { useMemo, useState } from 'preact/hooks';
import {
    anchorClickPushStateHandler,
    createBooleanQueryParamState,
    createStringQueryParamState,
    createUpdateFromURL,
    updateQueryParams,
    useCreateURL,
} from '../../lib/queryParamState';
import { SCHEDULE_TYPES, scheduleIdSchema, scheduleTypeSchema } from '../../lib/uek';
import { scheduleIdsState, scheduleTypeState } from '../../lib/useAppScheduleQuery';
import { labels } from '../../lib/labels';
import { Modal } from './Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';

export const isSelectModalOpenState = createBooleanQueryParamState('selectSimple', false);
const textInputValueState = createStringQueryParamState('selectSimple_id');

export const SimpleSelectModalHost = () => (isSelectModalOpenState.use() ? <SimpleSelectModal /> : <></>);

const SimpleSelectModal = () => {
    const scheduleIds = scheduleIdsState.use();
    const scheduleType = scheduleTypeState.use();
    const createURL = useCreateURL();

    const [textInputValue, setInputValue] = useState(textInputValueState.get);

    const afterAddURL = useMemo(() => {
        const newScheduleId = scheduleIdSchema.safeParse(parseInt(textInputValue.trim())).data;
        if (newScheduleId === undefined) {
            return null;
        }

        return createURL(
            scheduleIdsState.createUpdate([...scheduleIds, newScheduleId]),
            textInputValueState.createUpdate(''),
            isSelectModalOpenState.createUpdate(false),
        );
    }, [createURL, scheduleIds, textInputValue]);

    return (
        <Modal
            title={
                scheduleIds.length > 0 ? labels.byScheduleType[scheduleType].addAnotherCTA : labels.selectScheduleCTA
            }
            onClose={() =>
                updateQueryParams(
                    'pushState',
                    isSelectModalOpenState.createUpdate(false),
                    textInputValueState.createUpdate(''),
                )
            }
        >
            <div class="grid grid-cols-5 gap-3 text-center md:gap-4">
                <select
                    class="bg-back-tertiary border-back-quaternary outline-cta-primary-darker col-span-2 rounded-md border-2 p-2 transition-colors focus-visible:outline-2 disabled:text-white/70"
                    value={scheduleType}
                    disabled={scheduleIds.length > 0}
                    onChange={(event) =>
                        updateQueryParams(
                            'replaceState',
                            scheduleTypeState.createUpdate(scheduleTypeSchema.parse(event.currentTarget.value)),
                        )
                    }
                >
                    {SCHEDULE_TYPES.map((type) => (
                        <option key={type} value={type} label={labels.byScheduleType[type].name} />
                    ))}
                </select>
                <TextInput
                    autofocus
                    class="col-span-3"
                    value={textInputValue}
                    placeholder={labels.scheduleIdPlaceholder}
                    onChange={setInputValue}
                    onBlur={() => {
                        const trimmedValue = textInputValue.trim();
                        setInputValue(trimmedValue);
                        if (isSelectModalOpenState.get()) {
                            updateQueryParams('replaceState', textInputValueState.createUpdate(trimmedValue));
                        }
                    }}
                    onEnterKeyPress={
                        afterAddURL
                            ? () => {
                                  const trimmedValue = textInputValue.trim();
                                  updateQueryParams('replaceState', textInputValueState.createUpdate(trimmedValue));
                                  updateQueryParams('pushState', createUpdateFromURL(afterAddURL));
                              }
                            : undefined
                    }
                />
                <Button
                    variant="cta"
                    class="col-span-full"
                    text={labels.addCTA}
                    icon="plus"
                    disabled={!afterAddURL}
                    href={afterAddURL ?? ''}
                    onClick={anchorClickPushStateHandler}
                />
            </div>
        </Modal>
    );
};
