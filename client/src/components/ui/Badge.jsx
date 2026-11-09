import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Badge = ({ children, variant = 'default', className }) => {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide';

  const variants = {
    default: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    primary: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  };

  return <span className={twMerge(clsx(base, variants[variant], className))}>{children}</span>;
};
