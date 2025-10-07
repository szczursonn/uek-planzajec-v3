import { type MouseEventHandler } from 'preact';
import clsx from 'clsx';
import { Icon, type IconName } from './Icon';

const VARIANT_CLASSES = {
    cta: 'border-2 border-x-cta-darker bg-x-cta-darker',
    secondary: 'border-2 border-x-bg-quaternary bg-x-bg-secondary',
    tertiary: 'border-2 border-x-bg-quinary bg-x-bg-tertiary',
} as const;

const VARIANT_ENABLED_CLASSES = {
    cta: 'hover:bg-x-cta-primary hover:border-x-cta-darker',
    secondary: 'hover:bg-x-bg-tertiary active:bg-x-bg-quaternary',
    tertiary: 'hover:bg-x-bg-quaternary active:bg-x-bg-quinary',
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
    variant?: keyof typeof VARIANT_CLASSES;
    class?: string;
    text?: string;
    title?: string;
    disabled?: boolean;
    icon?: IconName;
    iconClass?: string;
};

export const Button = ({
    href,
    onClick,
    variant = 'secondary',
    class: className,
    text,
    title,
    disabled = false,
    icon,
    iconClass,
}: ButtonProps) => {
    const finalTitle = title || text;
    const finalClassName = clsx(
        'flex items-center justify-center gap-3 w-full rounded-md py-1.5 px-3 lg:px-4 transition-colors',
        VARIANT_CLASSES[variant],
        disabled
            ? 'cursor-default text-white/60'
            : [
                  'cursor-pointer hover:border-cta-primary-darker active:border-cta-primary focus-visible:outline-0 focus-visible:border-x-cta-primary',
                  VARIANT_ENABLED_CLASSES[variant],
              ],
        className,
    );

    const buttonInternals = (
        <>
            {icon && <Icon name={icon} class={clsx('h-4 w-4 shrink-0 md:h-3 md:w-3 lg:h-4 lg:w-4', iconClass)} />}
            {text && <span class="text-center">{text}</span>}
        </>
    );

    if (href === undefined) {
        return (
            <button type="button" class={finalClassName} title={finalTitle} disabled={disabled} onClick={onClick}>
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
        <a href={href} target="_blank" class={finalClassName} title={finalTitle} onClick={onClick}>
            {buttonInternals}
        </a>
    );
};
