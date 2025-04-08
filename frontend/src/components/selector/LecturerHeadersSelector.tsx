import { useMemo } from 'preact/hooks';
import { type ScheduleHeader, useHeadersAPI } from '../../lib/api/headers';
import { createStringQueryParamState, updateQueryParams, useURLCreator } from '../../lib/state/queryParamsState';
import { labels } from '../../lib/intl/labels';
import { scheduleIdsState } from '../../lib/appScheduleQuery';
import { selectorModalOpenState } from '../modals/ScheduleSelectorModal';
import { SearchInput } from '../common/SearchInput';
import { SelectorErrorAlert } from './SelectorErrorAlert';
import { SelectorLinkList, SelectorLinkListSkeleton } from './SelectorLinkList';

export const lecturerHeadersSelectorSearchState = createStringQueryParamState('select_lh_search');

const MAX_VISIBLE_HEADERS = 30;

export const LecturerHeadersSelector = () => {
    const query = useHeadersAPI('lecturer', '');

    const searchValueLowerCase = lecturerHeadersSelectorSearchState.use().toLowerCase();
    const createURL = useURLCreator();

    const links = useMemo(() => {
        const filteredLimitedHeaders: ScheduleHeader[] = [];

        for (const header of query.data ?? []) {
            if (!searchValueLowerCase || header.name.toLowerCase().includes(searchValueLowerCase)) {
                filteredLimitedHeaders.push(header);
            }

            if (filteredLimitedHeaders.length === MAX_VISIBLE_HEADERS) {
                break;
            }
        }

        return filteredLimitedHeaders.map((header) => ({
            label: header.name,
            href: createURL(
                lecturerHeadersSelectorSearchState.createUpdate(''),
                selectorModalOpenState.createUpdate(false),
                scheduleIdsState.createAddUpdate(header.id),
            ),
        }));
    }, [query.data, searchValueLowerCase, createURL]);

    return (
        <>
            <SearchInput
                value={searchValueLowerCase}
                focusOnRender
                onChange={(newValue) =>
                    updateQueryParams('replaceState', lecturerHeadersSelectorSearchState.createUpdate(newValue))
                }
            />
            {query.isLoading ? (
                <SelectorLinkListSkeleton />
            ) : !query.data && query.error ? (
                <SelectorErrorAlert error={query.error} />
            ) : (
                <>
                    <SelectorLinkList items={links} />
                    {links.length === MAX_VISIBLE_HEADERS && (
                        <p class="my-6 text-center text-lg font-bold">{labels.useSearchToSeeMoreLecturers}</p>
                    )}
                </>
            )}
        </>
    );
};
