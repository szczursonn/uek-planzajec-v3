import { labels } from '../../lib/intl/labels';
import { showPWAPrompt, usePWAPromptAvailability } from '../../lib/pwaPrompt';
import { Button } from '../common/Button';
import { AppOptionsDrawerSection } from './AppOptionsDrawerSection';

export const AppOptionsDrawerPWAPrompt = () => {
    const isPWAPromptAvailable = usePWAPromptAvailability();

    if (!isPWAPromptAvailable) {
        return <></>;
    }

    return (
        <AppOptionsDrawerSection title={labels.installPWAHeader}>
            <Button class="text-sm" text={labels.installPWAPrompt} icon="plus" onClick={showPWAPrompt} />
        </AppOptionsDrawerSection>
    );
};
