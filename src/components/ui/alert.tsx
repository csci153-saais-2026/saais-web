import React from 'react'
import { clsx } from 'clsx'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'warning' | 'info'
  icon?: React.ReactNode
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'error', icon, children, ...props }, ref) => {
    const variants = {
      error: 'bg-[#FAE7E1] border-[#EFCFC5] text-[#9E2E1C]',
      warning: 'bg-[#FBF0D6] border-[#F6E2AE] text-[#8A6206]',
      info: 'bg-[#E4EDF4] border-[#C7DCED] text-[#2A4C6B]',
    }

    const defaultIcon = (
      <svg
        viewBox="0 0 24 24"
        className="w-[18px] h-[18px] shrink-0 mt-[2px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3.5l9.5 16.5H2.5z" />
        <path d="M12 9.5v4.5M12 17h.01" />
      </svg>
    )

    return (
      <div
        ref={ref}
        role="alert"
        className={clsx(
          'flex items-start gap-[11px] border rounded-[5px] p-[13px_16px] text-[13.5px] leading-[1.5]',
          variants[variant],
          className
        )}
        {...props}
      >
        {icon !== undefined ? icon : defaultIcon}
        <div className="grow">{children}</div>
      </div>
    )
  }
)

Alert.displayName = 'Alert'
