import { type ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { type MouseEventHandler } from 'preact/compat';
import { Icon, type IconName } from './Icon';
import { useStopBodyOverflow } from '../../lib/useStopBodyOverflow';

export const DropdownMenu = ({ children, trigger }: { children?: ComponentChildren; trigger?: ComponentChildren }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const dialogElement = dialogRef.current;
        const buttonElement = buttonRef.current;
        if (dialogElement === null || buttonElement === null || !isOpen) {
            return;
        }

        dialogElement.showModal();

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const updateMenuPosition = () => {
            const triggerBoundingBox = buttonElement.getBoundingClientRect();

            dialogElement.style.top = `${triggerBoundingBox.bottom}px`;
            dialogElement.style.left = `${Math.min(triggerBoundingBox.left, window.innerWidth - 224)}px`;
        };
        updateMenuPosition();

        document.addEventListener('keydown', handleEscapeKey);
        window.addEventListener('resize', updateMenuPosition);
        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            document.removeEventListener('keydown', handleEscapeKey);
            if (dialogElement.open) {
                dialogElement.close();
            }
        };
    }, [isOpen]);
    useStopBodyOverflow(isOpen);

    return (
        <>
            <button ref={buttonRef} type="button" onClick={() => setIsOpen((value) => !value)}>
                {trigger}
            </button>
            <dialog
                ref={dialogRef}
                onClick={() => setIsOpen(false)}
                class="border-back-quaternary bg-back-tertiary w-56 rounded-lg border-2 p-1 text-sm shadow-2xl/50 backdrop:bg-transparent"
            >
                {children}
            </dialog>
        </>
    );
};

export const DropdownMenuButton = ({
    text,
    title,
    icon,
    onClick,
}: {
    text: string;
    title?: string;
    icon: IconName;
    onClick?: MouseEventHandler<HTMLButtonElement>;
}) => {
    return (
        <button
            class="bg-back-tertiary hover:bg-back-quaternary active:bg-back-quinary flex w-full cursor-pointer items-center gap-2 rounded-lg border-transparent px-2 py-1.5 transition-colors"
            type="button"
            onClick={onClick}
            title={title || text}
        >
            <Icon name={icon} class="h-4 w-4 shrink-0" />
            <span>{text}</span>
        </button>
    );
};

export const DropdownMenuLink = ({
    text,
    icon,
    title,
    href,
    onClick,
}: {
    text: string;
    icon: IconName;
    title?: string;
    href: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
}) => {
    return (
        <a
            class="bg-back-tertiary hover:bg-back-quaternary active:bg-back-quinary flex w-full cursor-pointer items-center gap-2 rounded-lg border-transparent px-2 py-1.5 transition-colors"
            href={href}
            target="_blank"
            title={title || text}
            onClick={onClick}
        >
            <Icon name={icon} class="h-4 w-4 shrink-0" />
            <span>{text}</span>
        </a>
    );
};
