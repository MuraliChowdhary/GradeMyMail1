import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  fullWidth = false,
  ...props
}) => {
  const baseClasses = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'w-full',
    loading && 'opacity-75 cursor-not-allowed',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  ].filter(Boolean).join(' ');

  const LoadingSpinner = () => (
    <div className="loading-spinner" />
  );

  return (
    <button
      className={baseClasses}
      disabled={disabled || loading}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {icon && <span className="flex items-center">{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </div>
    </button>
  );
};

export default Button;