'use client';

import type { HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  const classes = ['rounded-lg border border-slate-200 bg-white shadow-sm', className]
    .filter(Boolean)
    .join(' ');
  return <div className={classes} {...props} />;
}

export function CardHeader({ className, ...props }: CardProps) {
  const classes = ['border-b border-slate-200 p-4', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
}

export function CardTitle({ className, ...props }: CardProps) {
  const classes = ['text-lg font-semibold text-slate-800', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
}

export function CardContent({ className, ...props }: CardProps) {
  const classes = ['p-4', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  const classes = ['border-t border-slate-200 p-4', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
}
