import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@apollo/client';
import { useSelector } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';

import { IS_LOCAL } from '@/config/env';
import { RootState } from '@/config/store';
import { setAuthenticationCookie } from '@/utils/cookie';
import FormControl from '@/components/Common/FormControl';
import Input from '@/components/Common/Input/Input';
import Checkbox from '@/components/Common/Input/InputCheckbox';
import Button from '@/components/Common/Button';
import ErrorText from '@/components/Common/ErrorText';
import Logo from '@/components/Common/Logo';
import { ReactHookFormType } from '@/typeReactHookForm';
import loginWithGoogleQuery from '@/queries/auth/loginWithGoogle';

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
  const history = useHistory();
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [loginWithGoogleMutation] = useMutation(loginWithGoogleQuery);
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );
  const organizationName = organization?.name || 'WebAbility';
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_KEY;

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    const credential = credentialResponse.credential;
    setGoogleError(null);
    if (!credential) {
      setGoogleError('No credential received from Google. Please try again.');
      return;
    }
    
    // Basic validation: credential should be a JWT-like string
    if (typeof credential !== 'string' || credential.length < 100) {
      setGoogleError('Invalid credential format. Please try again.');
      return;
    }
    
    try {
      const { data } = await loginWithGoogleMutation({ variables: { idToken: credential } });
      if (data?.loginWithGoogle?.token && data?.loginWithGoogle?.url) {
        // Validate URL before redirecting
        try {
          const targetUrl = new URL(data.loginWithGoogle.url);
          if (targetUrl.protocol !== 'https:' && !IS_LOCAL) {
            setGoogleError('Invalid redirect URL. Please contact support.');
            return;
          }
        } catch {
          setGoogleError('Invalid redirect URL. Please contact support.');
          return;
        }
        
        setAuthenticationCookie(data.loginWithGoogle.token);
        const currentHost = window.location.hostname;
        const targetHost = new URL(data.loginWithGoogle.url).hostname;
        if (currentHost !== targetHost && !IS_LOCAL) {
          // Use fragment (#) instead of query (?) - fragment is never sent to server (avoids logs, referrers)
          window.location.href = `${data.loginWithGoogle.url}/auth-redirect#token=${encodeURIComponent(data.loginWithGoogle.token)}`;
        } else {
          history.push('/');
        }
      } else {
        setGoogleError('Invalid response from server. Please try again.');
      }
    } catch (e: unknown) {
      const graphQLError = (e as { graphQLErrors?: Array<{ message?: string; extensions?: { code?: string } }> })?.graphQLErrors?.[0];
      const errorCode = graphQLError?.extensions?.code;
      const errorMessage = graphQLError?.message;
      
      // User-friendly error messages
      let displayMessage = 'Google sign-in failed. Please try again.';
      if (errorCode === 'UNAUTHENTICATED') {
        displayMessage = errorMessage || 'Authentication failed. Please try again.';
      } else if (errorMessage) {
        // Use server message if available, but sanitize it
        displayMessage = errorMessage.length > 200 ? 'An error occurred. Please try again.' : errorMessage;
      }
      
      setGoogleError(displayMessage);
      console.error('Google sign-in failed:', e);
    }
  };

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
          <p className="text-xs text-gray-600 mb-4">
            Fields marked with an asterisk (*) are required.
          </p>
          <div className="mb-4 w-full block">
            <FormControl>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-600" aria-label="required">*</span>
              </label>
              <Input
                type="email"
                id="email"
                placeholder="Email"
                name="email"
                ref={register}
                autoComplete="username"
                aria-required="true"
                className="w-full p-3 border border-gray-300 rounded-lg"
                onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                  e.currentTarget.style.borderColor = '#0052CC';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 82, 204, 0.2)';
                }}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                aria-invalid={formErrors?.email ? 'true' : 'false'}
                aria-describedby={formErrors?.email ? 'email-error' : undefined}
              />
              {formErrors?.email?.message && (
                <ErrorText id="email-error" message={String(t(formErrors.email.message))} />
              )}
            </FormControl>
          </div>
          <div className="mb-4 w-full block">
            <FormControl>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-600" aria-label="required">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Password"
                  name="password"
                  ref={register}
                  autoComplete="current-password"
                  aria-required="true"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  aria-invalid={formErrors?.password ? 'true' : 'false'}
                  aria-describedby={formErrors?.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  style={{ color: '#6C7586' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: '#6C7586' }}
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
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: '#6C7586' }}
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
                <ErrorText id="password-error" message={String(t(formErrors.password.message))} />
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
              className="text-[14px] underline"
              style={{ color: '#0052CC' }}
            >
              Forgot password?
            </Link>
          </div>
          <Button
            color="primary"
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-medium py-3 px-4 rounded-lg transition-colors"
            style={{ backgroundColor: '#0052CC' }}
          >
            {isSubmitting ? t('Common.text.please_wait') : 'Login'}
          </Button>
          {googleClientId && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-white text-sm text-gray-600">Or</span>
                </div>
              </div>
              <div className="flex justify-center flex-col items-center gap-2">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    setGoogleError('Google sign-in was cancelled or failed.');
                  }}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  width={352}
                />
                {googleError && (
                  <ErrorText message={googleError} position="center" />
                )}
              </div>
            </>
          )}
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
        New to {organizationName}?{' '}
        <Link
          to="/auth/signup"
          className="font-medium underline"
          style={{ color: '#0052CC' }}
        >
          Sign up
        </Link>
      </div>
    </div>
  );
};

export default SignInForm;
