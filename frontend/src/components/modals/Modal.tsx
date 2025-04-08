import { type ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import clsx from 'clsx';
import { useStopBodyOverflow } from '../../lib/useStopBodyOverflow';
import { Icon } from '../common/Icon';

export const Modal = ({
    title,
    borderClass = 'border-back-tertiary',
    children,
    onClose,
}: {
    title?: string;
    borderClass?: string;
    children?: ComponentChildren;
    onClose: () => void;
}) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const dialogElement = dialogRef.current;
        if (!dialogElement) {
            return;
        }

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (event.target === dialogElement) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);
        dialogElement.addEventListener('click', handleClickOutside);
        return () => {
            dialogElement.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [onClose]);

    useEffect(() => {
        const dialogElement = dialogRef.current;
        if (!dialogElement) {
            return;
        }

        dialogElement.showModal();
        setTimeout(() => {
            dialogElement.classList.add('backdrop:bg-black/80', 'opacity-100');
        });

        return () => {
            dialogElement.close();
        };
    }, []);

    // Manual vertical positioning, to handle keyboards on mobile
    useEffect(() => {
        const dialogContentElement = dialogContentRef.current;
        const visualViewport = window.visualViewport;
        if (!dialogContentElement || !visualViewport) {
            return;
        }

        const handleResize = () => {
            dialogContentElement.style.top = `${visualViewport.height / 2}px`;
        };
        handleResize();

        visualViewport.addEventListener('resize', handleResize);
        return () => {
            visualViewport.removeEventListener('resize', handleResize);
        };
    }, []);

    useStopBodyOverflow();

    return (
        <dialog
            ref={dialogRef}
            onToggle={(event) => {
                const element = event.currentTarget;
                if (!element.open) {
                    setTimeout(() => {
                        // TODO: fix
                        // Mobile browsers add an invisible history entry after opening the modal, which fucks up react-managed open state
                        // This is a horrible way to handle this
                        if (element.isConnected) {
                            window.history.back();
                        }
                    }, 100);
                }
            }}
            class="relative h-full max-h-full w-full max-w-full bg-transparent opacity-0 outline-0 transition-all duration-100 backdrop:duration-250"
        >
            <div
                ref={dialogContentRef}
                class={clsx(
                    'bg-back-secondary absolute left-1/2 z-50 max-h-4/5 w-full max-w-full -translate-1/2 overflow-x-hidden overflow-y-auto rounded-lg border-2 shadow-2xl transition-all md:w-auto md:max-w-4/5',
                    borderClass,
                )}
            >
                {title ? (
                    <div class="border-b-back-quaternary flex items-center border-b-1 p-1 text-center font-semibold md:text-lg">
                        <div class="w-13"></div>
                        <span class="flex-1">{title}</span>
                        <button
                            class="hover:bg-back-tertiary active:bg-back-quaternary bg-back-secondary h-12 w-12 cursor-pointer rounded-full border-4 border-transparent py-2.5 text-white/75 transition-all"
                            type="button"
                            onClick={onClose}
                        >
                            <Icon name="cross" class="h-full w-full" />
                        </button>
                    </div>
                ) : (
                    <button
                        class="hover:bg-back-tertiary active:bg-back-quaternary bg-back-secondary absolute top-3 right-3 h-12 w-12 cursor-pointer rounded-full border-4 border-transparent py-2.5 text-white/75 transition-all"
                        type="button"
                        onClick={onClose}
                    >
                        <Icon name="cross" class="h-full w-full" />
                    </button>
                )}

                <div class="p-3 md:p-6">{children}</div>
            </div>
        </dialog>
    );
};
