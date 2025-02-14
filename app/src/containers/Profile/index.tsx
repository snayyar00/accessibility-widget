import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';
import InformationSetting from './InformationSetting';
import PasswordSetting from './PasswordSetting';
import PlanSetting from './PlanSetting';
import BillingPortalLink from './BillingPortalLink';
import useDocumentHeader from '@/hooks/useDocumentTitle';


const Profile: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.profile') });
  const { data, loading } = useSelector((state: RootState) => state.user);

  return (
    <div>
      <h3 className="font-bold text-[26px] leading-9 text-sapphire-blue mb-8">{t('Profile.title')}</h3>
      {loading ? <div className='flex items-center justify-center h-screen w-screen'><CircularProgress size={150}/></div> : (
        <>
          <div className="bg-white border border-solid border-dark-grey shadow-xxl rounded-[10px] p-6 mb-[25px] sm:px-[10px] sm:py-6 pb-0">
            <h5 className="font-bold text-[22px] leading-[30px] text-sapphire-blue mb-1">
              {t('Profile.text.account')}
            </h5>
            <p className="text-[16px] leading-[26px] text-white-gray mb-[14px]">
              {t('Profile.text.desc')}
            </p>
            <InformationSetting user={data} />
            <PasswordSetting />
            <BillingPortalLink/>
          </div>
          {/* <PlanSetting /> */}
        </>
      )}
    </div>
  );
};

export default Profile;
