import React from 'react'
import { clsx } from 'clsx'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-[8px] transition-colors cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      primary: 'bg-[#2F4A12] text-[#FBF8EF] hover:bg-[#1D2F0A]',
      secondary: 'bg-[#FFFFFF] text-[#16200C] border border-[#E1DBC6] hover:border-[#2F4A12] hover:bg-[#FAFAF7]',
      gold: 'bg-[#E0A82E] text-[#16200C] hover:bg-[#B0761A] hover:text-[#FBF8EF]',
      danger: 'bg-[#9E2E1C] text-[#FFFFFF] hover:bg-[#7D2214]',
    }

    const sizes = {
      sm: 'text-[13px] px-3 py-1.5',
      md: 'text-[14.5px] px-4 py-2.5',
      lg: 'text-[15px] px-5 py-3',
    }

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
