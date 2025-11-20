import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';
import InformationSetting from './InformationSetting';
import PasswordSetting from './PasswordSetting';
import BillingPortalLink from './BillingPortalLink';
import LicenseOwnerInfo from '../LicenseOwnerInfo';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import useOrganizationName from '@/hooks/useOrganizationName';
import { User, Lock, CreditCard, FileText } from 'lucide-react';

const Profile: React.FC = () => {
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  const { t } = useTranslation();
  const organizationName = useOrganizationName();

  const domain = organization?.domain || organizationName;

  useDocumentHeader({ title: t('Common.title.profile', { domain }) });

  const { data, loading } = useSelector((state: RootState) => state.user);

  return (
    <div className="w-full max-w-full px-4 md:px-6 lg:px-8 py-4 md:py-8 overflow-x-hidden">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t('Profile.title')}
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <CircularProgress size={60} />
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6 max-w-full min-w-0">
          {/* Account Information Card */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-[#a3aef1] overflow-hidden max-w-full min-w-0">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    {t('Profile.text.account')}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    {t('Profile.text.desc')}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <InformationSetting user={data} />
            </div>
          </div>

          {/* Password Settings Card */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-[#a3aef1] overflow-hidden max-w-full min-w-0">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Lock className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    Security
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    Update your password and security settings
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <PasswordSetting />
            </div>
          </div>

          {/* Billing Portal Card */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-[#a3aef1] overflow-hidden max-w-full min-w-0">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    Billing
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    Manage your subscriptions and payment methods
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <BillingPortalLink />
            </div>
          </div>

          {/* License Owner Information Card */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-[#a3aef1] overflow-hidden max-w-full min-w-0">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    {t('Common.license_owner.title') ||
                      'License Owner Information'}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    {t('Common.license_owner.description') ||
                      'This information is used in the accessibility statement and for sending account notifications based on your preferences in account settings.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <LicenseOwnerInfo />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
