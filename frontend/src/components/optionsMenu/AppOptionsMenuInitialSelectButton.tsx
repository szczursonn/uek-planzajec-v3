import { labels } from '../../lib/labels';
import { anchorClickPushStateHandler, useCreateURL } from '../../lib/queryParamState';
import { Button } from '../common/Button';
import { isSelectModalOpenState } from '../modals/SimpleSelectModal';

export const AppOptionsMenuInitialSelectButton = () => {
    const createURL = useCreateURL();

    return (
        <Button
            variant="tertiary"
            text={labels.selectScheduleCTA}
            href={createURL(isSelectModalOpenState.createUpdate(true))}
            onClick={anchorClickPushStateHandler}
        />
    );
};
