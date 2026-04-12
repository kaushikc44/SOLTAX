// SolTax AU - Button Component
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aus-green-500',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            // Variants
            'bg-aus-green-600 text-white hover:bg-aus-green-700': variant === 'primary',
            'bg-aus-gold-500 text-white hover:bg-aus-gold-600': variant === 'secondary',
            'border border-input bg-background hover:bg-accent text-foreground': variant === 'outline',
            'hover:bg-accent text-foreground': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
            // Sizes
            'h-9 px-3 text-sm rounded': size === 'sm',
            'h-11 px-5 text-base rounded-md': size === 'md',
            'h-13 px-8 text-lg rounded-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
