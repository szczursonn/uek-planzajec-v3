import { useHeadersAPI } from '../../lib/api/headers';
import { createStringQueryParamState, updateQueryParams, useURLCreator } from '../../lib/state/queryParamsState';
import { selectorGroupingState, selectorModalOpenState } from '../modals/ScheduleSelectorModal';
import { SearchInput } from '../common/SearchInput';
import { SelectorLinkList, SelectorLinkListSkeleton } from './SelectorLinkList';
import { SelectorErrorAlert } from './SelectorErrorAlert';
import { scheduleIdsState } from '../../lib/appScheduleQuery';

export const roomHeadersSelectorSearchState = createStringQueryParamState('select_rh_search');

export const RoomHeadersSelector = () => {
    const query = useHeadersAPI('room', selectorGroupingState.use());
    const searchValueLowerCase = roomHeadersSelectorSearchState.use().toLowerCase();
    const createURL = useURLCreator();

    return (
        <>
            <SearchInput
                value={searchValueLowerCase}
                focusOnRender
                onChange={(newValue) =>
                    updateQueryParams('replaceState', roomHeadersSelectorSearchState.createUpdate(newValue))
                }
            />
            {query.isLoading ? (
                <SelectorLinkListSkeleton />
            ) : !query.data && query.error ? (
                <SelectorErrorAlert error={query.error} />
            ) : (
                <SelectorLinkList
                    items={
                        query.data
                            ?.filter(
                                (header) =>
                                    !searchValueLowerCase || header.name.toLowerCase().includes(searchValueLowerCase),
                            )
                            .map((header) => ({
                                label: header.name,
                                href: createURL(
                                    selectorModalOpenState.createUpdate(false),
                                    selectorGroupingState.createUpdate(''),
                                    roomHeadersSelectorSearchState.createUpdate(''),
                                    scheduleIdsState.createAddUpdate(header.id),
                                ),
                            })) ?? []
                    }
                />
            )}
        </>
    );
};
