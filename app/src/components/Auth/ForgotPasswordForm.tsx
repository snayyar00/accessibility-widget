import React from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import Logo from '@/components/Common/Logo';
import FormControl from '@/components/Common/FormControl';
import Input from '@/components/Common/Input/Input';
import ErrorText from '@/components/Common/ErrorText';
import Button from '@/components/Common/Button';
import GoBack from '@/components/Common/GoBack';
import { ReactHookFormType } from '@/typeReactHookForm';

type Props = ReactHookFormType & {
  isSubmitted: boolean;
  isSubmitting: boolean;
  apiError?: string;
};

const ForgotPasswordForm: React.FC<Props> = ({
  onSubmit,
  register,
  errors,
  isSubmitted,
  isSubmitting,
  apiError,
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
            {t('Common.title.forgot_password')}
          </h1>
          <p className="text-gray-600 text-base leading-relaxed max-w-sm mx-auto">
            {t('Forgot_password.description')}
          </p>
        </div>
      </div>

      {!isSubmitted ? (
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">
              {t('Common.label.your_email')}
            </label>
            <div className="relative">
              <Input
                type="email"
                placeholder={t('Common.placeholder.email')}
                name="email"
                ref={register}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-400"
              />
            </div>
            {errors?.email?.message && (
              <div className="mt-2">
                <ErrorText message={String(t(errors.email.message))} />
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
                  <span>{t('Common.text.please_wait')}</span>
                </div>
              ) : (
                t('Common.text.save')
              )}
            </Button>
          </div>

          {/* Error Message */}
          {apiError && (
            <div className="mt-4">
              <ErrorText
                message={String(t(`Forgot_password.error.${apiError}`))}
                position="center"
              />
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
      ) : (
        <div className="text-center space-y-6">
          {/* Success Message */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-green-800 font-medium">
              {t('Forgot_password.confirm')}
            </p>
          </div>

          {/* Back to Login */}
          <div className="pt-4">
            <Trans
              components={[
                <Link
                  to="/auth/signin"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                ></Link>,
              ]}
            >
              {t('Forgot_password.go_to')}
            </Trans>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordForm;
