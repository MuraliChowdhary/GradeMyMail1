import React from 'react';

export interface StackProps {
  direction?: 'vertical' | 'horizontal';
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
  children: React.ReactNode;
}

const Stack: React.FC<StackProps> = ({
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  className = '',
  children,
}) => {
  const baseClasses = [
    'stack',
    `stack-${direction}`,
    `stack-spacing-${spacing}`,
    `stack-align-${align}`,
    `stack-justify-${justify}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
};

export default Stack;