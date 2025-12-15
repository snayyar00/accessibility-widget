import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReactHookFormType } from '@/typeReactHookForm';
import Input from '../Common/Input/Input';
import ErrorText from '../Common/ErrorText';
import Button from '../Common/Button';

type Props = ReactHookFormType & {
  loading?: boolean;
  apiError?: string;
  openPopupDeleteAccount: () => void;
};

const AccountForm: React.FC<Props> = ({
  onSubmit,
  register,
  loading,
  apiError,
  openPopupDeleteAccount,
  errors,
}) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
      <p className="text-xs text-gray-600 mb-4">
        Fields marked with an asterisk (*) are required.
      </p>
      <div className="space-y-3 md:space-y-4">
        <div className="block w-full">
          <label
            htmlFor="account-name"
            className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2"
          >
            {t('Common.label.your_name')}{' '}
            <span className="text-red-600" aria-label="required">*</span>
          </label>
          <Input
            id="account-name"
            name="name"
            ref={register}
            aria-label={t('Common.label.your_name')}
            aria-describedby={errors?.name?.message ? 'name-error' : undefined}
            aria-required="true"
            aria-invalid={!!errors?.name?.message}
          />
          {errors?.name?.message && (
            <div
              id="name-error"
              className="mt-2 text-sm text-red-600"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              aria-relevant="additions text"
            >
              {String(t(errors.name.message))}
            </div>
          )}
        </div>
        <div className="block w-full">
          <label
            htmlFor="account-email"
            className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2"
          >
            {t('Common.label.email')}{' '}
            <span className="text-red-600" aria-label="required">*</span>
          </label>
          <Input
            id="account-email"
            type="email"
            name="email"
            ref={register}
            disabled
            aria-label={t('Common.label.email')}
            aria-required="true"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 pt-3 md:pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={openPopupDeleteAccount}
          className="text-xs md:text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-200 flex items-center space-x-2"
        >
          <svg
            className="w-3 h-3 md:w-4 md:h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>{t('Profile.text.delete')}</span>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{t('Common.text.please_wait')}</span>
            </span>
          ) : (
            t('Common.text.save_and_update')
          )}
        </button>
      </div>
      {apiError && <ErrorText message={apiError} />}
    </form>
  );
};
export default AccountForm;
