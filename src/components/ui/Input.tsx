import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'minimal' | 'ghost';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  variant = 'default',
  icon,
  fullWidth = true,
  className = '',
  ...props
}) => {
  const inputClasses = [
    'input',
    `input-${variant}`,
    error && 'input-error',
    fullWidth && 'w-full',
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'input-container',
    fullWidth && 'w-full'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <label className="input-label">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="input-icon">
            {icon}
          </div>
        )}
        
        <input
          className={inputClasses}
          style={{ paddingLeft: icon ? 'var(--space-10)' : undefined }}
          {...props}
        />
      </div>
      
      {error && (
        <p className="input-error-text">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;