import React from 'react';
import cn from 'classnames';

type ButtonColor = 'primary' | 'default';

type ButtonType = 'button' | 'submit';

type Props = {
  color?: ButtonColor;
  type?: ButtonType;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

const Button: React.FC<Props> = ({
  color = 'default',
  type = 'button',
  className = '',
  children,
  ...props
}) => (
  <button
    type={type}
    className={cn(
      'rounded-lg px-5 py-[10.5px] outline-none font-medium text-[16px] leading-[19px] text-center border border-solid border-light-primary cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      {
        'bg-white text-light-primary hover:bg-gray-50 hover:border-blue-600':
          color === 'default',
        'text-white border-blue-600 hover:shadow-lg transform hover:-translate-y-0.5':
          color === 'primary',
      },
      className,
    )}
    style={
      color === 'primary'
        ? {
            backgroundColor: '#0052CC',
            borderColor: '#0052CC',
          }
        : undefined
    }
    {...props}
  >
    {children}
  </button>
);
export default React.memo(Button);
