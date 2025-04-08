import { useEffect } from 'preact/hooks';

let claimCount = 0;

export const useStopBodyOverflow = (isActive: boolean = true) =>
    useEffect(() => {
        if (!isActive) {
            return;
        }

        if (claimCount === 0) {
            document.body.style.overflowY = 'hidden';
        }
        claimCount++;

        return () => {
            claimCount--;
            if (claimCount === 0) {
                document.body.style.overflowY = '';
            }
        };
    }, [isActive]);
