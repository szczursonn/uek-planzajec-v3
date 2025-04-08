import clsx from 'clsx';
import { type ComponentChildren } from 'preact';
import { Icon } from '../common/Icon';

export const AppOptionsMenuCollapsibleSection = ({
    isOpen,
    onToggle,
    title,
    children,
}: {
    isOpen: boolean;
    onToggle: () => void;
    title: string;
    children?: ComponentChildren;
}) => {
    return (
        <div>
            <button
                class="bg-back-tertiary hover:bg-back-quaternary active:bg-back-quinary mb-1 flex w-full cursor-pointer items-center rounded-md px-2 py-1 transition-colors"
                type="button"
                title={title}
                onClick={onToggle}
            >
                <p class="text-lg font-semibold">{title}</p>
                <Icon
                    name="chevronDown"
                    class={clsx('mr-1 ml-auto h-4 w-4 transition-all duration-300', isOpen && 'rotate-180')}
                />
            </button>
            {isOpen && children}
        </div>
    );
};
