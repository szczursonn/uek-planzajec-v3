import { type MouseEventHandler } from 'preact/compat';
import clsx from 'clsx';
import { Icon, type IconName } from './Icon';

type RoundIconButtonProps = (
    | {
          href: string;
          onClick?: MouseEventHandler<HTMLAnchorElement>;
      }
    | {
          href?: undefined;
          onClick?: MouseEventHandler<HTMLButtonElement>;
      }
) & {
    class?: string;
    title?: string;
    icon: IconName;
};

export const RoundIconButton = ({ href, onClick, class: className, title, icon }: RoundIconButtonProps) => {
    const finalClassName = clsx(
        'outline-x-cta-primary hover:bg-x-bg-tertiary block aspect-square cursor-pointer rounded-full border-2 border-transparent transition-all hover:scale-110 hover:opacity-80 focus-visible:outline-2 active:scale-115 active:opacity-60',
        className,
    );
    const internals = <Icon name={icon} class="h-full w-full shrink-0" />;

    if (href === undefined) {
        return (
            <button class={finalClassName} type="button" title={title} onClick={onClick}>
                {internals}
            </button>
        );
    }

    return (
        <a class={finalClassName} href={href} target="_blank" title={title} onClick={onClick}>
            {internals}
        </a>
    );
};
