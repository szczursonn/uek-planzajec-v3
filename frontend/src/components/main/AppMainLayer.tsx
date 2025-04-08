import { useState } from 'preact/hooks';
import { BREAKPOINT_QUERY } from '../../lib/consts';
import { createBooleanLocalStorageState } from '../../lib/localStorageState';
import { AppHeader } from './AppHeader';
import { AppOptionsMenu } from '../optionsMenu/AppOptionsMenu';
import { AppMainView } from './AppMainView';

const defaultDesktopAppOptionsMenuOpenState = createBooleanLocalStorageState('appOptionsMenuDesktopOpen', true);

const useIsAppOptionsMenuOpen = () => {
    const [isOpen, setIsOpen] = useState(() => {
        if (window.matchMedia(BREAKPOINT_QUERY.LARGE).matches) {
            return false;
        }

        return defaultDesktopAppOptionsMenuOpenState.get();
    });

    return [
        isOpen,
        (newValue: boolean) => {
            setIsOpen(newValue);
            defaultDesktopAppOptionsMenuOpenState.set(newValue);
        },
    ] as const;
};

export const AppMainLayer = () => {
    const [isAppOptionsMenuOpen, setIsAppOptionsMenuOpen] = useIsAppOptionsMenuOpen();

    return (
        <>
            <AppHeader
                isAppOptionsMenuOpen={isAppOptionsMenuOpen}
                onAppOptionsMenuButtonClick={() => setIsAppOptionsMenuOpen(!isAppOptionsMenuOpen)}
            />
            <AppOptionsMenu isOpen={isAppOptionsMenuOpen} />
            <AppMainView isAppOptionsMenuOpen={isAppOptionsMenuOpen} />
        </>
    );
};
