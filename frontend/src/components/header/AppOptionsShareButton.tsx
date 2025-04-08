import { scheduleIdsState } from '../../lib/appScheduleQuery';
import { labels } from '../../lib/intl/labels';
import { useURLCreator } from '../../lib/state/queryParamsState';
import { Button } from '../common/Button';

export const AppOptionsShareButton = () => {
    const currentScheduleIds = scheduleIdsState.use();

    const shareData = {
        url: useURLCreator()(),
    };

    if (currentScheduleIds.length === 0 || !navigator.canShare?.(shareData)) {
        return null;
    }

    return <Button icon="share" text={labels.shareCTA} onClick={() => navigator.share(shareData)} />;
};
