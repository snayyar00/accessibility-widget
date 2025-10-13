import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';

import FormControl from '@/components/Common/FormControl';
import Input from '@/components/Common/Input/Input';
import Checkbox from '@/components/Common/Input/InputCheckbox';
import Button from '@/components/Common/Button';
import ErrorText from '@/components/Common/ErrorText';
import Logo from '@/components/Common/Logo';
import { ReactHookFormType } from '@/typeReactHookForm';

type Props = ReactHookFormType & {
  isSubmitting: boolean;
  apiError?: string;
  customErrorMessage?: string;
  showForgotPasswordLink?: boolean;
};

const SignInForm: React.FC<Props> = ({
  onSubmit,
  register,
  formErrors,
  apiError,
  isSubmitting,
  customErrorMessage,
  showForgotPasswordLink,
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-white max-w-[400px] w-[400px] mt-16">
      <div className="text-center mb-8">
        <Logo />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Login to your account
        </h1>
      </div>

      <form onSubmit={onSubmit} className="mb-[24px]">
        <div>
          <div className="mb-4 w-full block">
            <FormControl>
              <Input
                type="email"
                placeholder="Email or Username"
                name="email"
                ref={register}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formErrors?.email?.message && (
                <ErrorText message={String(t(formErrors.email.message))} />
              )}
            </FormControl>
          </div>
          <div className="mb-4 w-full block">
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  name="password"
                  ref={register}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors?.password?.message && (
                <ErrorText message={String(t(formErrors.password.message))} />
              )}
            </FormControl>
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Checkbox type="checkbox" name="rembemer" id="rembemer" />
              <label
                htmlFor="rembemer"
                className="font-medium text-[14px] text-gray-700 ml-2"
              >
                Remember me
              </label>
            </div>
            <Link
              to="/auth/forgot-password"
              className="text-[14px] text-blue-600 hover:text-blue-800"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            color="primary"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isSubmitting ? t('Common.text.please_wait') : 'Login'}
          </Button>
          {showForgotPasswordLink && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-center">
              <Link
                to="/auth/forgot-password"
                className="text-[14px] leading-[24px] text-red-600 font-medium hover:text-red-800 underline"
              >
                {t('Sign_in.text.reset_password_to_unlock')}
              </Link>
            </div>
          )}
        </div>
      </form>

      {/* Show custom error message if provided, otherwise show default API error */}
      {customErrorMessage && (
        <ErrorText message={customErrorMessage} position="center" />
      )}
      {!customErrorMessage && apiError && (
        <ErrorText
          message={String(t(`Sign_in.error.${apiError}`))}
          position="center"
        />
      )}
      <div className="mt-8 text-center text-[14px] text-gray-600">
        New to WebAbility?{' '}
        <Link
          to="/auth/signup"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
};

export default SignInForm;
