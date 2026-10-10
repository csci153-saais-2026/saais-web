import React from 'react'
import { clsx } from 'clsx'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={clsx(
          'w-full bg-[#FFFFFF] border border-[#E1DBC6] rounded-[4px] p-[9px_12px] text-[14px] text-[#16200C] placeholder:text-[#8C8A76] focus:outline-none focus:border-[#2F4A12] transition-colors disabled:bg-[#F2EDDC] disabled:text-[#8C8A76] disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
