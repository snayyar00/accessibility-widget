import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@apollo/client';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import cn from 'classnames';

import SecurityForm from '@/components/Profile/SecurityForm';
import changePasswordQuery from '@/queries/auth/changePassword';
import { setAuthenticationCookie } from '@/utils/cookie';
import { Settings, ChevronDown } from 'lucide-react';

const PasswordSchema = yup.object().shape({
  currentPassword: yup
    .string()
    .required('Common.validation.require_current_password')
    .max(50, 'Common.validation.max_password'),
  newPassword: yup
    .string()
    .required('Common.validation.require_new_password')
    .min(6, 'Common.validation.min_password')
    .max(50, 'Common.validation.max_password'),
  confirmPassword: yup
    .string()
    .max(50, 'Common.validation.max_password')
    .oneOf([yup.ref('newPassword'), ''], 'Common.validation.password_match'),
});

type Payload = {
  currentPassword: string;
  newPassword: string;
};

const PasswordSetting: React.FC = () => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    errors: formErrors,
  } = useForm({
    resolver: yupResolver(PasswordSchema),
  });
  const [changePasswordMutation, { error, loading }] =
    useMutation(changePasswordQuery);
  const [isOpen, setIsOpen] = useState(false);

  async function onSubmit(params: Payload) {
    const { data } = await changePasswordMutation({ variables: params });

    if (data?.changePassword?.token) {
      console.log(data?.changePassword?.token);
      setAuthenticationCookie(data?.changePassword?.token);

      toast.success('Common.status.change_password_success');
    }
  }

  return (
    <div className="space-y-4">
      {/* Password Section Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-3 md:space-y-0 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div className="flex-1 w-full md:w-auto">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            {t('Profile.text.change_password')}
          </h3>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {t('Profile.text.change_password_desc')}
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-auto md:w-auto flex-shrink-0 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm"
        >
          <Settings className="w-3 h-3 md:w-4 md:h-4 text-white" />
          <span className="text-white">
            {t('Profile.text.update_password')}
          </span>
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
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          {
            'max-h-0 opacity-0': !isOpen,
            'max-h-[1000px] opacity-100': isOpen,
          },
        )}
      >
        <div className="bg-gray-50 rounded-lg p-4 md:p-6">
          <SecurityForm
            onSubmit={handleSubmit(onSubmit)}
            register={register}
            formErrors={formErrors}
            apiError={error?.graphQLErrors?.[0]?.extensions?.code}
            isSubmitting={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default PasswordSetting;
