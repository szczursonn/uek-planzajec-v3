import clsx from 'clsx';

export const AppOptionsMenuCheckbox = ({
    label,
    title,
    checked,
    class: className,
    onChecked,
}: {
    label: string;
    title?: string;
    class?: string;
    checked: boolean;
    onChecked: (newChecked: boolean) => void;
}) => (
    <label
        class="hover:bg-back-tertiary flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors"
        title={title ?? label}
    >
        <input
            class={clsx('h-5 w-5 cursor-pointer', className)}
            type="checkbox"
            checked={checked}
            onChange={(event) => onChecked(event.currentTarget.checked)}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    onChecked(!event.currentTarget.checked);
                }
            }}
        />
        <span class="w-full truncate text-sm">{label}</span>
    </label>
);

export const AppOptionsMenuCheckboxSkeleton = ({ class: className }: { class?: string }) => (
    <div class={clsx('my-2 flex cursor-progress gap-2', className)}>
        <div class="bg-back-quaternary h-5 w-5 animate-pulse rounded" />
        <div class="bg-back-quaternary h-5 w-full animate-pulse rounded-md" />
    </div>
);
