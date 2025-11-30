'use client';

import type { DetailedHTMLProps, SelectHTMLAttributes } from 'react';

export type SelectProps = DetailedHTMLProps<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  const classes = [
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <select className={classes} {...props} />;
}
