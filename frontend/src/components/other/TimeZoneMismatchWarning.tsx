import { useState } from 'preact/hooks';
import { TIME_ZONE } from '../../lib/date/timeZone';
import { labels } from '../../lib/intl/labels';
import { RoundIconButton } from '../common/RoundIconButton';

export const TimeZoneMismatchWarning = () => {
    const [isVisible, setIsVisible] = useState(TIME_ZONE.UEK !== TIME_ZONE.BROWSER);

    if (!isVisible) {
        return null;
    }

    return (
        <div class="bg-x-bg-tertiary border-x-warning fixed bottom-0 left-0 flex w-full items-center justify-between border-2 p-2">
            <span class="text-lg">{labels.timeZoneMismatchMessage}</span>
            <RoundIconButton class="h-8 p-1" icon="cross" onClick={() => setIsVisible(false)} />
        </div>
    );
};
