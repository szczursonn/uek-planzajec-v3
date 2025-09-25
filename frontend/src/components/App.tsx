import { useState } from 'preact/hooks';
import { AppScheduleQueryProvider } from '../lib/appScheduleQuery';
import { SchedulePeriodProvider } from '../lib/schedulePeriod';
import { AppHeader } from './header/AppHeader';
import { AppMainView } from './main/AppMainView';
import { SubjectDetailsModalHost } from './modals/SubjectDetailsModal';
import { ExportModalHost } from './modals/ExportModal';
import { ScheduleSelectorModalHost } from './modals/ScheduleSelectorModal';
import { TimeZoneMismatchWarning } from './other/TimeZoneMismatchWarning';

export const App = () => {
    const [isOptionsDrawerOpen, setIsOptionsDrawerOpen] = useState(false);

    return (
        <>
            <SchedulePeriodProvider>
                <AppScheduleQueryProvider>
                    <AppHeader
                        isOptionsDrawerOpen={isOptionsDrawerOpen}
                        onToggleOptionsDrawer={() => setIsOptionsDrawerOpen((val) => !val)}
                    />
                    <AppMainView isOptionsDrawerOpen={isOptionsDrawerOpen} />
                    <SubjectDetailsModalHost />
                    <ExportModalHost />
                </AppScheduleQueryProvider>
                <ScheduleSelectorModalHost />
            </SchedulePeriodProvider>
            <TimeZoneMismatchWarning />
        </>
    );
};
