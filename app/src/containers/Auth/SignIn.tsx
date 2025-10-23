import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@apollo/client';
import { useHistory } from 'react-router-dom';
import SignInForm from '@/components/Auth/SignInForm';
import loginQuery from '@/queries/auth/login';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { setAuthenticationCookie } from '@/utils/cookie';
import { LoginMutation, Mutation } from '@/generated/graphql';
import { IS_LOCAL } from '@/config/env';

const SignInSchema = yup.object().shape({
  email: yup
    .string()
    .required('Common.validation.require_email')
    .max(100, 'Common.validation.max_email')
    .email('Common.validation.valid_email'),
  password: yup
    .string()
    .required('Common.validation.require_password')
    .max(50, 'Common.validation.max_password'),
});

type Payload = {
  email: string;
  password: string;
};

const SignIn: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.sign_in') });
  const {
    register,
    handleSubmit,
    errors: formErrors,
  } = useForm({
    resolver: yupResolver(SignInSchema),
  });
  const [loginMutation, { error, loading }] =
    useMutation<LoginMutation>(loginQuery);

  const history = useHistory();

  // Check for Rewardful referral link and save to localStorage
  useEffect(() => {
    const checkAndSaveReferralLink = () => {
      // Check if Rewardful is available and has a referral
      const referralId = (window as any).Rewardful?.referral;

      if (referralId) {
        // Save to localStorage for persistence across sessions
        localStorage.setItem('rewardful_referral', referralId);
      } else {
        // Check if we have a stored referral from previous visit
        const storedReferral = localStorage.getItem('rewardful_referral');
        if (storedReferral) {
          // Set it in Rewardful if available
          if ((window as any).Rewardful) {
            (window as any).Rewardful.referral = storedReferral;
          }
        }
      }
    };

    // Check immediately
    checkAndSaveReferralLink();

    // Also check after a short delay in case Rewardful loads asynchronously
    const timeoutId = setTimeout(checkAndSaveReferralLink, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  async function onSubmit(params: Payload) {
    try {
      const { data } = await loginMutation({ variables: params });

      if (data?.login.token && data?.login.url) {
        const currentHost = window.location.hostname;
        const targetHost = new URL(data.login.url).hostname;

        if (currentHost !== targetHost && !IS_LOCAL) {
          window.location.href = `${data.login.url}/auth-redirect?token=${data.login.token}`;
        } else {
          setAuthenticationCookie(data.login.token);
          history.push('/');
        }
      }
    } catch (e) {
      console.log(e);
    }

    return false;
  }

  const getErrorCode = () => {
    if (!error?.graphQLErrors?.[0]) return undefined;

    const graphQLError = error.graphQLErrors[0];
    const message = graphQLError.message;

    if (
      message &&
      (message.includes('ACCOUNT_LOCKED') ||
        message.includes('ATTEMPTS_WARNING'))
    ) {
      return message;
    }

    if (
      message &&
      (message.includes('Too many') || message.includes('please try again'))
    ) {
      return message;
    }

    return graphQLError.extensions?.code;
  };

  const getErrorMessage = (errorCode: string | undefined) => {
    if (!errorCode) return undefined;

    if (errorCode === 'ACCOUNT_LOCKED') {
      return t('Common.validation.account_locked');
    }
    if (errorCode === 'ACCOUNT_LOCKED_AFTER_ATTEMPTS') {
      return t('Common.validation.account_locked_after_attempts');
    }
    if (errorCode?.startsWith('ATTEMPTS_WARNING:')) {
      const remainingAttempts = errorCode.split(':')[1];
      return t('Common.validation.attempts_warning', {
        attempts: remainingAttempts,
      });
    }

    // Handle rate limit messages - return the raw message
    if (
      errorCode?.includes('Too many') ||
      errorCode?.includes('please try again')
    ) {
      return errorCode;
    }

    return undefined;
  };

  const isAccountLocked = (errorCode: string | undefined) => {
    if (!errorCode) return false;
    return (
      errorCode === 'ACCOUNT_LOCKED' ||
      errorCode === 'ACCOUNT_LOCKED_AFTER_ATTEMPTS'
    );
  };

  const currentErrorCode = getErrorCode();

  // Debug logging
  if (error?.graphQLErrors?.[0]) {
    console.log('GraphQL Error Message:', error.graphQLErrors[0].message);
    console.log('Extracted Error Code:', currentErrorCode);
    console.log('Custom Error Message:', getErrorMessage(currentErrorCode));
  }
  return (
    <div className="flex min-h-screen sm:flex-col">
      <div className="w-[45%] flex justify-center items-center sm:w-full">
        <SignInForm
          onSubmit={handleSubmit(onSubmit)}
          register={register}
          formErrors={formErrors}
          apiError={currentErrorCode}
          isSubmitting={loading}
          customErrorMessage={getErrorMessage(currentErrorCode)}
          showForgotPasswordLink={isAccountLocked(currentErrorCode)}
        />
      </div>
      <div className="w-[55%] sm:hidden flex items-center justify-end p-5 relative">
        <img
          src="/images/auth/auth_image1.png"
          alt="Authentication"
          className="h-[95vh] object-contain ml-auto"
          style={{ maxWidth: '90%' }}
        />
      </div>
    </div>
  );
};

export default SignIn;
