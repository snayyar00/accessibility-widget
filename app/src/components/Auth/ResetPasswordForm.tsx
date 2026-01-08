import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import GoBack from '@/components/Common/GoBack';
import Logo from '@/components/Common/Logo';
import FormControl from '@/components/Common/FormControl';
import ErrorText from '@/components/Common/ErrorText';
import Input from '@/components/Common/Input/Input';
import Button from '@/components/Common/Button';
import Badge from '@/components/Common/Badge';
import { ReactHookFormType } from '@/typeReactHookForm';

type Props = ReactHookFormType & {
  isSubmitting?: boolean;
  apiError?: string;
};

const ResetPasswordForm: React.FC<Props> = ({
  onSubmit,
  register,
  errors,
  apiError,
  isSubmitting,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            {t('Common.title.reset_password')}
          </h1>
          <p className="text-gray-600 text-base leading-relaxed max-w-sm mx-auto">
            {t('Reset_password.description')}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <p className="text-xs text-gray-600 mb-4">
          Fields marked with an asterisk (*) are required.
        </p>
        {/* Password Input */}
        <div className="space-y-2">
          <label htmlFor="reset-password" className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">
            {t('Common.label.password')} <span className="text-red-600" aria-label="required">*</span>
          </label>
          <div className="relative">
            <Input
              type="password"
              id="reset-password"
              placeholder={t('Common.placeholder.password')}
              name="password"
              ref={register}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={errors?.password ? 'true' : 'false'}
              aria-describedby={errors?.password ? 'reset-password-error' : undefined}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder:text-[#4B5563]"
            />
          </div>
          {errors?.password?.message && (
            <div className="mt-2">
              <ErrorText id="reset-password-error" message={String(t(errors.password.message))} />
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-2">
          <label htmlFor="reset-password-confirmation" className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">
            {t('Common.label.confirm_password')} <span className="text-red-600" aria-label="required">*</span>
          </label>
          <div className="relative">
            <Input
              type="password"
              id="reset-password-confirmation"
              placeholder={t('Common.placeholder.confirm_password')}
              name="passwordConfirmation"
              ref={register}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={errors?.passwordConfirmation ? 'true' : 'false'}
              aria-describedby={errors?.passwordConfirmation ? 'reset-password-confirmation-error' : undefined}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder:text-[#4B5563]"
            />
          </div>
          {errors?.passwordConfirmation?.message && (
            <div className="mt-2">
              <ErrorText
                id="reset-password-confirmation-error"
                message={String(t(errors.passwordConfirmation.message))}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            color="primary"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{t('Reset_password.please_wait')}</span>
              </div>
            ) : (
              t('Common.title.reset_password')
            )}
          </Button>
        </div>

        {/* Error Message */}
        {apiError && (
          <div className="mt-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 font-medium">{apiError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Support Link */}
        <div className="pt-6 text-center">
          <p className="text-sm text-gray-600">
            <Trans
              i18nKey="Forgot_password.footer"
              components={[
                <a
                  href="mailto:support@webability.com"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                ></a>,
              ]}
            />
          </p>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
