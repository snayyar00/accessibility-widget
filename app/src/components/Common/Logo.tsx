import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';

const Logo: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className='mb-2'>
      <LogoIcon />
    </div>
  );
}

export default Logo;
