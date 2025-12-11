import React from 'react';
import classNames from 'classnames';

interface Props {
  message?: string;
  position?: string;
  id?: string;
  [key: string]: unknown;
}

const ErrorText: React.FC<Props> = ({ message = "", position = "left", id, ...props }) => (
  <p
    id={id}
    role="alert"
    aria-live="assertive"
    className={classNames('text-[12px] mt-[5px] mb-[7px] block', {
      'text-left': position === 'left',
      'text-center': position === 'center',
      'text-right': position === 'right'
    })}
    style={{ color: '#E7074F' }}
    {...props}
  >
    {message}
  </p>
)

export default ErrorText;
