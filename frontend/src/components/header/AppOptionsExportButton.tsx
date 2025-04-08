import { labels } from '../../lib/intl/labels';
import { anchorPushStateHandler, useURLCreator } from '../../lib/state/queryParamsState';
import { isExportModalOpenState } from '../modals/ExportModal';
import { Button } from '../common/Button';

export const AppOptionsExportButton = () => {
    const createDerivedURL = useURLCreator();

    return (
        <Button
            icon="export"
            text={labels.exportCTA}
            href={createDerivedURL(isExportModalOpenState.createUpdate(true))}
            onClick={anchorPushStateHandler}
        />
    );
};
