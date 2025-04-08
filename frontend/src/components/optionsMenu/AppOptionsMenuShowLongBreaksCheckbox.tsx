import { labels } from '../../lib/labels';
import { showLongBreaksState } from '../../lib/useAppScheduleQuery';
import { AppOptionsMenuCheckbox } from './AppOptionsMenuCheckbox';

export const AppOptionsMenuShowLongBreaksCheckbox = () => (
    <AppOptionsMenuCheckbox
        label={labels.showLongBreaks}
        checked={showLongBreaksState.use()}
        onChecked={(newChecked) => showLongBreaksState.set(newChecked)}
    />
);
