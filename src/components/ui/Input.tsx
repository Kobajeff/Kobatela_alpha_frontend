'use client';

import type { DetailedHTMLProps, InputHTMLAttributes } from 'react';

export type InputProps = DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  const classes = [
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <input className={classes} {...props} />;
}
