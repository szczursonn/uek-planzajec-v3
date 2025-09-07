import { labels } from '../../lib/intl/labels';
import { highlightOnlineOnlyDaysState, showLongBreaksState } from '../../lib/scheduleViewConfig';
import { AppOptionsDrawerSection } from './AppOptionsDrawerSection';

export const AppOptionsDrawerOtherSettingsSection = () => {
    const currentShowLongBreaks = showLongBreaksState.use();
    const currentHighlightOnlineOnlyDays = highlightOnlineOnlyDaysState.use();

    return (
        <AppOptionsDrawerSection title={labels.settings}>
            <AppOptionsDrawerOtherSettingsSectionCheckbox
                label={labels.showLongBreaks}
                checked={currentShowLongBreaks}
                onToggle={() => showLongBreaksState.set(!currentShowLongBreaks)}
            />
            <AppOptionsDrawerOtherSettingsSectionCheckbox
                label={labels.highlightOnlineOnlyDays}
                checked={currentHighlightOnlineOnlyDays}
                onToggle={() => highlightOnlineOnlyDaysState.set(!currentHighlightOnlineOnlyDays)}
            />
        </AppOptionsDrawerSection>
    );
};

const AppOptionsDrawerOtherSettingsSectionCheckbox = ({
    label,
    checked,
    onToggle,
}: {
    label: string;
    checked: boolean;
    onToggle: () => void;
}) => (
    <label
        class="hover:bg-x-bg-tertiary accent-x-bg-quinary flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors"
        title={labels.toggleXCTA(label)}
    >
        <input
            class="h-5 w-5 cursor-pointer"
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    onToggle();
                }
            }}
        />
        <span class="w-full truncate text-sm">{label}</span>
    </label>
);
