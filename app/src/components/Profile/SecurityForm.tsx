import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReactHookFormType } from '@/typeReactHookForm';
import ErrorText from '../Common/ErrorText';
import Input from '../Common/Input/Input';
import Button from '../Common/Button';

type Props = ReactHookFormType & {
  apiError?: string;
  isSubmitting: boolean;
};

const SecurityForm: React.FC<Props> = ({
  onSubmit,
  register,
  formErrors,
  apiError,
  isSubmitting,
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
            htmlFor="current-password"
            className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2"
          >
            {t('Profile.text.current_password')}{' '}
            <span className="text-red-600" aria-label="required">*</span>
          </label>
          <Input
            id="current-password"
            type="password"
            name="currentPassword"
            ref={register}
            aria-label={t('Profile.text.current_password')}
            aria-required="true"
            aria-invalid={!!formErrors?.currentPassword?.message}
            aria-describedby="current-password-error"
          />
          <div
            id="current-password-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            aria-relevant="additions text"
          >
            {formErrors?.currentPassword?.message && (
              <ErrorText
                message={String(t(formErrors.currentPassword.message))}
              />
            )}
          </div>
        </div>
        <div className="block w-full">
          <label
            htmlFor="new-password"
            className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2"
          >
            {t('Profile.text.new_password')}{' '}
            <span className="text-red-600" aria-label="required">*</span>
          </label>
          <Input
            id="new-password"
            type="password"
            name="newPassword"
            ref={register}
            aria-label={t('Profile.text.new_password')}
            aria-required="true"
            aria-invalid={!!formErrors?.newPassword?.message}
            aria-describedby="new-password-error"
          />
          <div
            id="new-password-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            aria-relevant="additions text"
          >
            {formErrors?.newPassword?.message && (
              <ErrorText message={String(t(formErrors.newPassword.message))} />
            )}
          </div>
        </div>
        <div className="block w-full">
          <label
            htmlFor="confirm-password"
            className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2"
          >
            {t('Profile.text.confirm_new_password')}{' '}
            <span className="text-red-600" aria-label="required">*</span>
          </label>
          <Input
            id="confirm-password"
            type="password"
            name="confirmPassword"
            ref={register}
            aria-label={t('Profile.text.confirm_new_password')}
            aria-required="true"
            aria-invalid={!!formErrors?.confirmPassword?.message}
            aria-describedby="confirm-password-error"
          />
          <div
            id="confirm-password-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            aria-relevant="additions text"
          >
            {formErrors?.confirmPassword?.message && (
              <ErrorText
                message={String(t(formErrors.confirmPassword.message))}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center pt-3 md:pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-auto px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {isSubmitting ? (
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
            t('Profile.text.update_password')
          )}
        </button>
      </div>
      {apiError && (
        <ErrorText message={String(t(`Profile.error.password.${apiError}`))} />
      )}
    </form>
  );
};

export default SecurityForm;
