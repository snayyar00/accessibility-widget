import React from 'react';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';

const Logo: React.FC = () => {
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  return (
    <div className="mb-2 flex justify-center">
      {organization?.logo_url ? (
        <img
          width={198}
          height={47}
          src={organization.logo_url}
          alt={organization.name}
        />
      ) : (
        <LogoIcon />
      )}
    </div>
  );
};

export default Logo;
