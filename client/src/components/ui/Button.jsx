import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = React.forwardRef(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500 dark:bg-teal-500 dark:hover:bg-teal-600',
      secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
      outline: 'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-teal-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
      ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800',
    };

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs font-semibold gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
