import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = React.forwardRef(({ label, error, helperText, className, id, ...props }, ref) => {
  const inputId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={twMerge(
          clsx(
            'w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all',
            error
              ? 'border-rose-400 focus:ring-rose-500 dark:border-rose-600'
              : 'border-slate-300 dark:border-slate-700',
            className
          )
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

export const Select = React.forwardRef(({ label, error, children, className, id, ...props }, ref) => {
  const selectId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={twMerge(
          clsx(
            'w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all',
            error
              ? 'border-rose-400 focus:ring-rose-500 dark:border-rose-600'
              : 'border-slate-300 dark:border-slate-700',
            className
          )
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
});

export const Card = ({ children, className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6 transition-all',
          onClick && 'cursor-pointer hover:border-teal-500/50 hover:shadow-md',
          className
        )
      )}
    >
      {children}
    </div>
  );
};
