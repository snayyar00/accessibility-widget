import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

import type { Profile } from '@/features/auth/user';
import updateProfileQuery from '@/queries/user/updateProfile';
import AccountForm from '@/components/Profile/AccountForm';
import AvatarIcon from '@/assets/images/avatar.jpg';
import InitialAvatar from '@/components/Common/InitialAvatar';
import DeleteAccount from './DeleteAccount';
import DOMPurify from 'dompurify';
import LinkifyIt from 'linkify-it';
import { Settings, ChevronDown } from 'lucide-react';

const linkify = new LinkifyIt();

const AccountSchema = yup.object().shape({
  name: yup
    .string()
    .required('Common.validation.require_name')
    .max(100, 'Common.validation.max_name')
    .transform((value) =>
      DOMPurify.sanitize(value || '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
    )
    .test('no-links', 'Common.validation.name_contains_links', (value) => {
      if (!value) return true;

      // Check if the name contains any URLs using linkify-it
      const matches = linkify.match(value);
      return !matches || matches.length === 0;
    }),
});

type Payload = {
  name: string;
  company: string;
  position: string;
};

type Props = {
  user: Profile;
};

const InformationSetting: React.FC<Props> = ({ user }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, errors, setValue, getValues, watch } =
    useForm({
      resolver: yupResolver(AccountSchema),
      defaultValues: user,
    });
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenModalDeleteAccount, setIsOpenModalDeleteAccount] =
    useState(false);

  const [updateProfileMutation, { error, loading }] =
    useMutation(updateProfileQuery);

  async function onSubmit(dataForm: Payload) {
    const { name, company, position } = dataForm;
    const params = {
      name: DOMPurify.sanitize(name || '', {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      }),
      company: DOMPurify.sanitize(company || '', {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      }),
      position: DOMPurify.sanitize(position || '', {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      }),
    };

    try {
      const { data } = await updateProfileMutation({ variables: params });
      if (data?.updateProfile) {
        toast.success(t('Common.status.update_success'));
      }
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="space-y-4">
      {/* User Profile Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
            <InitialAvatar
              name={user.name || 'User'}
              size={48}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full shadow-md"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
              {user.name}
            </h3>
            <p className="text-xs md:text-sm text-gray-600 truncate">
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="edit-profile-form"
          className="w-auto md:w-auto flex-shrink-0 px-3 md:px-4 py-2 text-white rounded-lg text-xs md:text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm focus:outline-none focus:ring-4 focus:ring-offset-2"
          style={{
            backgroundColor: '#0052CC',
          }}
        >
          <Settings className="w-3 h-3 md:w-4 md:h-4 text-white" />
          <span className="text-white">{t('Common.label.edit_profile')}</span>
          <ChevronDown
            className={cn(
              'w-3 h-3 md:w-4 md:h-4 transition-transform duration-300 text-white',
              {
                'rotate-180': isOpen,
              },
            )}
          />
        </button>
      </div>

      {/* Expandable Form Section */}
      <div
        id="edit-profile-form"
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          {
            'max-h-0 opacity-0': !isOpen,
            'max-h-[1000px] opacity-100': isOpen,
          },
        )}
        aria-hidden={!isOpen}
        style={!isOpen ? { display: 'none' } : { display: 'block' }}
      >
        <div className="bg-gray-50 rounded-lg p-4 md:p-6">
          <AccountForm
            onSubmit={handleSubmit(onSubmit)}
            register={register}
            loading={loading}
            errors={errors}
            apiError={error?.message}
            openPopupDeleteAccount={() => setIsOpenModalDeleteAccount(true)}
          />
        </div>
      </div>

      <DeleteAccount
        isOpen={isOpenModalDeleteAccount}
        closeModal={() => setIsOpenModalDeleteAccount(false)}
      />
    </div>
  );
};

export default InformationSetting;
