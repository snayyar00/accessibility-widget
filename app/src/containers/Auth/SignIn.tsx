import React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@apollo/client';
import { useHistory } from 'react-router-dom';

import SignInForm from '@/components/Auth/SignInForm';
import loginQuery from '@/queries/auth/login';
import AuthAdsArea from '@/components/Auth/AuthAds';
import useDocumentHeader from '@/hooks/useDocumentTitle';

const SignInSchema = yup.object().shape({
  email: yup.string()
    .required('Common.validation.require_email')
    .max(100, 'Common.validation.max_email')
    .email('Common.validation.valid_email'),
  password: yup.string()
    .required('Common.validation.require_password')
    .max(50, 'Common.validation.max_password'),
});

type Payload = {
  email: string;
  password: string;
}

const SignIn: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.sign_in') });
  const { register, handleSubmit, errors: formErrors } = useForm({
    resolver: yupResolver(SignInSchema),
  });
  const [loginMutation, { error, loading }] = useMutation(loginQuery);
  const history = useHistory();

  async function onSubmit(params: Payload) {
    try {
      const { data } = await loginMutation({ variables: params });
      if (data?.login) {
        history.push('/');
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
    
    if (message && (message.includes('ACCOUNT_LOCKED') || message.includes('ATTEMPTS_WARNING'))) {
      return message;
    }
    
    if (message && (message.includes('Too many') || message.includes('please try again'))) {
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
      return t('Common.validation.attempts_warning', { attempts: remainingAttempts });
    }
    
    // Handle rate limit messages - return the raw message
    if (errorCode?.includes('Too many') || errorCode?.includes('please try again')) {
      return errorCode;
    }
    
    return undefined;
  };

  const isAccountLocked = (errorCode: string | undefined) => {
    if (!errorCode) return false;
    return errorCode === 'ACCOUNT_LOCKED' || errorCode === 'ACCOUNT_LOCKED_AFTER_ATTEMPTS';
  };

  const currentErrorCode = getErrorCode();
  
  // Debug logging
  if (error?.graphQLErrors?.[0]) {
    console.log('GraphQL Error Message:', error.graphQLErrors[0].message);
    console.log('Extracted Error Code:', currentErrorCode);
    console.log('Custom Error Message:', getErrorMessage(currentErrorCode));
  }
  return (
    <div className="flex justify-center min-h-screen sm:flex-col sm:pt-[40px]">
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
      <div className="w-[55%] bg-primary overflow-hidden sm:hidden">
        <AuthAdsArea />
      </div>
    </div>
  );
}

export default SignIn;
