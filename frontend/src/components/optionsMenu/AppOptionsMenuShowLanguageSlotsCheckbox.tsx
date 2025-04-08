import { labels } from '../../lib/labels';
import { showLanguageSlotsState } from '../../lib/useAppScheduleQuery';
import { AppOptionsMenuCheckbox } from './AppOptionsMenuCheckbox';

export const AppOptionsMenuShowLanguageSlotsCheckbox = () => (
    <AppOptionsMenuCheckbox
        label={labels.showLanguageSlots}
        checked={showLanguageSlotsState.use()}
        onChecked={(newChecked) => showLanguageSlotsState.set(newChecked)}
    />
);
