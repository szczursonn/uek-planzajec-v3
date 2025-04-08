import clsx from 'clsx';

export const TextInput = ({
    class: className,
    autofocus,
    placeholder,
    value,
    onChange,
    onBlur,
    onEnterKeyPress,
}: {
    class?: string;
    autofocus?: boolean;
    placeholder?: string;
    value: string;
    onChange: (newValue: string) => void;
    onBlur?: () => void;
    onEnterKeyPress?: () => void;
}) => {
    return (
        <input
            type="text"
            placeholder={placeholder}
            class={clsx(
                'bg-back-tertiary border-back-quaternary focus-visible:outline-cta-primary-darker rounded-md border-2 p-2 focus-visible:outline-2',
                className,
            )}
            value={value}
            autofocus={autofocus}
            onChange={(event) => onChange(event.currentTarget.value)}
            onBlur={onBlur}
            onKeyPress={(event) => {
                if (event.key === 'Enter') {
                    onEnterKeyPress?.();
                }
            }}
        />
    );
};
