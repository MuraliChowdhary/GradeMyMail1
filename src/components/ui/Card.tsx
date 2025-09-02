import React from 'react';

export interface CardProps {
  variant?: 'default' | 'compact' | 'spacious' | 'minimal' | 'elevated';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
  border?: boolean;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  className = '',
  children,
  onClick,
  hover = true,
  border = true,
  ...props
}) => {
  const baseClasses = [
    'card',
    `card-${variant}`,
    onClick && 'card-clickable',
    hover && 'card-hover',
    !border && 'card-borderless',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={baseClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;