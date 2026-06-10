import { ShinyButton } from '@/components/ui/shiny-button';
import { cn } from '@/lib/utils';

const sizeStyles = {
  sm: {
    button: 'h-[14px] w-[18px] rounded-[3px]',
    text: '[&>span:first-child]:text-[8px]',
  },
  md: {
    button: 'h-5 w-7 rounded-[4px]',
    text: '[&>span:first-child]:text-[10px]',
  },
} as const;

type AiBadgeProps = {
  size?: keyof typeof sizeStyles;
  className?: string;
};

export function AiBadge({ size = 'sm', className }: AiBadgeProps) {
  const styles = sizeStyles[size];

  return (
    <ShinyButton
      type="button"
      tabIndex={-1}
      aria-hidden
      initial={{ '--x': '100%', scale: 1 }}
      animate={{ '--x': '-100%', scale: 1 }}
      whileTap={{ scale: 1 }}
      className={cn(
        'pointer-events-none flex min-h-0 shrink-0 cursor-default items-center justify-center border-0 p-0 font-medium shadow-none hover:shadow-none',
        'bg-black [--primary:rgb(255_255_255)] dark:bg-white dark:[--primary:rgb(0_0_0)]',
        'dark:hover:shadow-none',
        '[&>span:first-child]:flex [&>span:first-child]:size-full [&>span:first-child]:items-center [&>span:first-child]:justify-center',
        '[&>span:first-child]:font-bold [&>span:first-child]:leading-none [&>span:first-child]:normal-case [&>span:first-child]:tracking-wide',
        '[&>span:first-child]:text-white [&>span:first-child]:dark:text-black',
        styles.button,
        styles.text,
        className,
      )}
    >
      AI
    </ShinyButton>
  );
}
