import React from 'react';

type InputType = 'text' | 'number' | 'email' | 'tel' | 'password';

type Props = {
  type?: InputType;
  defaultValue?: string | number;
  placeholder?: string;
  className?: string;
  [x: string]: unknown;
};

const Input = React.forwardRef(
  (
    {
      type = 'text',
      defaultValue = '',
      placeholder = '',
      className,
      ...props
    }: Props,
    ref: React.Ref<HTMLInputElement>,
  ) => (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={`bg-light-gray border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base w-full focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 hover:border-gray-300 placeholder:text-[#4B5563] ${className}`}
      {...props}
      ref={ref}
    />
  ),
);

Input.displayName = 'Input';

export default Input;
