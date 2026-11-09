import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
