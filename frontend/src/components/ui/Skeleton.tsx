'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 w-full rounded-[4px]',
    rect: 'h-10 w-full rounded-button',
    circle: 'h-8 w-8 rounded-full',
  }[variant];

  const inlineStyles: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-[#2F353B]/70 shrink-0 select-none',
        variantStyles,
        className
      )}
      style={inlineStyles}
      {...props}
    />
  );
}

export default Skeleton;
