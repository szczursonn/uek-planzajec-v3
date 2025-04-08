import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import clsx from 'clsx';
import { RoundIconButton } from '../common/RoundIconButton';

const MODAL_WIDTH_CLASS = {
    medium: 'lg:w-200',
    large: 'lg:w-300',
} as const;

const MODAL_HEIGHT_CLASS = {
    auto: 'lg:h-auto',
    full: 'lg:h-full',
} as const;

export const Modal = ({
    title,
    width = 'medium',
    height = 'auto',
    children,
    onClose,
}: {
    title: string;
    width?: keyof typeof MODAL_WIDTH_CLASS;
    height?: keyof typeof MODAL_HEIGHT_CLASS;
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

        const originalScrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${originalScrollY}px`;
        document.body.style.overflow = 'hidden';

        dialogElement.showModal();
        requestAnimationFrame(() => {
            dialogElement.classList.add('backdrop:bg-black/80', 'opacity-100');
        });

        return () => {
            dialogElement.close();
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.overflow = '';
            window.scrollTo({
                top: originalScrollY,
                behavior: 'instant',
            });
        };
    }, []);

    // Manual vertical positioning, to handle keyboards on mobile
    useEffect(() => {
        const dialogContentElement = dialogContentRef.current;
        const visualViewport = window.visualViewport;
        if (!dialogContentElement || !visualViewport) {
            return;
        }

        const updateModalVerticalPosition = () => {
            dialogContentElement.style.top = `${visualViewport.height / 2}px`;
        };
        updateModalVerticalPosition();

        visualViewport.addEventListener('resize', updateModalVerticalPosition);
        return () => {
            visualViewport.removeEventListener('resize', updateModalVerticalPosition);
        };
    }, []);

    return (
        <dialog
            ref={dialogRef}
            closedby="none"
            class="relative h-full max-h-full w-full max-w-full bg-transparent opacity-0 outline-0 transition-all duration-100 backdrop:duration-250"
        >
            <div
                ref={dialogContentRef}
                class={clsx(
                    'bg-x-bg-secondary border-x-bg-tertiary shadow-x-bg-primary fixed left-1/2 flex h-full w-full max-w-full -translate-1/2 flex-col border-2 shadow-2xl transition-all lg:max-h-[calc(100%-8rem)] lg:rounded-lg',
                    MODAL_WIDTH_CLASS[width],
                    MODAL_HEIGHT_CLASS[height],
                )}
            >
                <div class="border-b-x-bg-quaternary flex items-center border-b-1 px-3 py-1 text-center text-sm font-semibold lg:text-lg">
                    <div class="w-10" />
                    <span class="mx-2 flex-1 truncate">{title}</span>
                    <RoundIconButton class="w-10 p-2" icon="cross" onClick={onClose} />
                </div>

                <div class="h-full overflow-y-auto p-3 lg:p-6">{children}</div>
            </div>
        </dialog>
    );
};
