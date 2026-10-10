'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // Required for accessibility / aria-label
  tooltip?: string;
  variant?: 'ghost' | 'subtle' | 'outline' | 'navyGhost';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      tooltip,
      variant = 'ghost',
      size = 'md',
      active = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'w-7 h-7 min-w-[28px] min-h-[28px] text-xs',
      md: 'w-9 h-9 min-w-[36px] min-h-[36px] text-sm', // standard 36px hit area
      lg: 'w-10 h-10 min-w-[40px] min-h-[40px] text-base',
    }[size];

    const variantClasses = {
      ghost: cn(
        'text-text-secondary hover:text-text-primary hover:bg-white/10 active:bg-white/15',
        active && 'bg-white/15 text-text-primary'
      ),
      navyGhost: cn(
        'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20',
        active && 'bg-white/20 text-white'
      ),
      subtle: cn(
        'bg-[#2A3036] text-text-secondary hover:text-text-primary hover:bg-[#343B42]',
        active && 'bg-orbit-blue text-white'
      ),
      outline: cn(
        'border border-panel-border text-text-secondary hover:text-text-primary hover:bg-[#2A3036]',
        active && 'border-orbit-blue text-orbit-blue bg-orbit-blue/10'
      ),
    }[variant];

    const buttonElement = (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-button transition-colors duration-150',
          'cursor-pointer select-none',
          // Visible focus ring
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue focus-visible:ring-offset-1 focus-visible:ring-offset-panel',
          // Disabled state
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );

    if (tooltip && !disabled) {
      return <Tooltip content={tooltip}>{buttonElement}</Tooltip>;
    }

    return buttonElement;
  }
);

IconButton.displayName = 'IconButton';
export default IconButton;
