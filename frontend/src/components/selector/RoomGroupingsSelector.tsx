import { useGroupingsAPI } from '../../lib/api/groupings';
import { useURLCreator } from '../../lib/state/queryParamsState';
import { selectorGroupingState } from '../modals/ScheduleSelectorModal';
import { SelectorErrorAlert } from './SelectorErrorAlert';
import { SelectorLinkList, SelectorLinkListSkeleton } from './SelectorLinkList';

export const RoomGroupingsSelector = () => {
    const query = useGroupingsAPI();
    const createURL = useURLCreator();

    if (query.isLoading) {
        return <SelectorLinkListSkeleton />;
    }

    if (!query.data && query.error) {
        return <SelectorErrorAlert error={query.error} />;
    }

    return (
        <SelectorLinkList
            items={
                query.data?.rooms.map((grouping) => ({
                    label: grouping,
                    href: createURL(selectorGroupingState.createUpdate(grouping)),
                })) ?? []
            }
        />
    );
};
