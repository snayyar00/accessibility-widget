import React from 'react';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';

type LogoProps = {
  className?: string;
};

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  const containerClass = ['mb-2 flex justify-center', className]
    .join(' ')
    .trim();

  return (
    <div className={containerClass}>
      {organization?.logo_url ? (
        <img
          width={198}
          height={47}
          src={organization.logo_url}
          alt={organization.name}
        />
      ) : (
        <LogoIcon aria-label="Webability logo" role="img" />
      )}
    </div>
  );
};

export default Logo;
