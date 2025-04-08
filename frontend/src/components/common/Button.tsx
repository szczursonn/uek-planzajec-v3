import { type MouseEventHandler } from 'preact/compat';
import clsx from 'clsx';
import { Icon, type IconName } from './Icon';

const VARIANT_CLASSES = {
    cta: 'border-2 border-cta-primary-darker bg-cta-primary-darkest',
    secondary: 'border-back-quaternary bg-back-secondary',
    tertiary: 'border-back-quinary bg-back-tertiary',
} as const;

const VARIANT_ENABLED_CLASSES = {
    cta: 'border-2 hover:bg-cta-primary-darker active:bg-cta-primary',
    secondary: 'border-2 hover:bg-back-tertiary active:bg-back-quaternary',
    tertiary: 'border-2 hover:bg-back-quaternary active:bg-back-quinary',
} as const;

const ICON_SIZE_CLASSES = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6',
} as const;

export type ButtonProps = (
    | {
          href: string;
          onClick?: MouseEventHandler<HTMLAnchorElement>;
      }
    | {
          href?: undefined;
          onClick?: MouseEventHandler<HTMLButtonElement>;
      }
) & {
    variant: keyof typeof VARIANT_CLASSES;
    class?: string;
    text?: string;
    title?: string;
    disabled?: boolean;
    autofocus?: boolean;
    icon?: IconName;
    iconClass?: string;
    iconSize?: keyof typeof ICON_SIZE_CLASSES;
};

export const Button = ({
    href,
    onClick,
    variant,
    class: className,
    text,
    title,
    disabled = false,
    autofocus,
    icon,
    iconClass,
    iconSize = 'small',
}: ButtonProps) => {
    const finalTitle = title || text;
    const finalClassName = clsx(
        'flex items-center justify-center gap-3 rounded-md py-1.5 px-4 transition-colors',
        VARIANT_CLASSES[variant],
        disabled
            ? 'cursor-default text-white/60'
            : [
                  'cursor-pointer hover:border-cta-primary-darker active:border-cta-primary focus-visible:outline-0 focus-visible:border-cta-primary',
                  VARIANT_ENABLED_CLASSES[variant],
              ],
        className,
    );

    const buttonInternals = (
        <>
            {icon && <Icon name={icon} class={clsx(ICON_SIZE_CLASSES[iconSize], iconClass, 'shrink-0')} />}
            {text && <span class="text-center">{text}</span>}
        </>
    );

    if (href === undefined) {
        return (
            <button
                type="button"
                class={finalClassName}
                title={finalTitle}
                disabled={disabled}
                autofocus={autofocus}
                onClick={onClick}
            >
                {buttonInternals}
            </button>
        );
    }

    if (disabled) {
        return (
            <span class={finalClassName} title={finalTitle}>
                {buttonInternals}
            </span>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            class={finalClassName}
            title={finalTitle}
            autofocus={autofocus}
            onClick={onClick}
        >
            {buttonInternals}
        </a>
    );
};
