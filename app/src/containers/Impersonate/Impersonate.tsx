import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useLazyQuery } from '@apollo/client';
import { Redirect, useLocation } from 'react-router-dom';
import { setAuthenticationCookie } from '@/utils/cookie';
import impersonateUserQuery from '@/queries/auth/impersonateUser';
import GET_PROFILE from '@/queries/auth/getProfile';
import { IS_LOCAL } from '@/config/env';
import Input from '@/components/Common/Input/Input';
import Button from '@/components/Common/Button';
import ErrorText from '@/components/Common/ErrorText';
import useDocumentHeader from '@/hooks/useDocumentTitle';

const ImpersonateSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  targetUserPassword: yup
    .string()
    .required('Target user password is required')
    .min(1, 'Password is required'),
});

type Payload = {
  email: string;
  targetUserPassword: string;
};

const Impersonate: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: 'Login User' });
  const location = useLocation();
  
  const {
    register,
    handleSubmit,
    errors: formErrors,
    setValue,
  } = useForm<Payload>({
    resolver: yupResolver(ImpersonateSchema),
  });

  const [impersonateMutation, { error, loading }] = useMutation(impersonateUserQuery);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Backend validation: Check super admin status from server
  const [validateSuperAdmin, { data: profileData, loading: validating, error: validationError }] = useLazyQuery(GET_PROFILE, {
    fetchPolicy: 'no-cache', // Always fetch fresh from backend
  });

  // Validate super admin status on component mount
  useEffect(() => {
    validateSuperAdmin();
  }, [validateSuperAdmin]);

  // Read email from query parameter (but don't auto-submit since password is required)
  // This hook must be called before any conditional returns (Rules of Hooks)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const email = searchParams.get('email');
    if (email) {
      setValue('email', email);
    }
  }, [location.search, setValue]);

  // Show loading while validating with backend
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating permissions...</p>
        </div>
      </div>
    );
  }

  // If validation error (e.g., not authenticated), redirect
  if (validationError) {
    return <Redirect to="/auth/signin" />;
  }

  // Backend validation: Check is_super_admin from server response (not Redux)
  // Response structure: { data: { profileUser: { is_super_admin: true/false } } }
  const isSuperAdmin = profileData?.profileUser?.is_super_admin;
  
  // If no profile data yet, still loading
  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isSuperAdmin) {
    return <Redirect to="/" />;
  }

  async function onSubmit(params: Payload) {
    setErrorMessage('');
    try {
      const { data } = await impersonateMutation({ variables: params });

      if (data?.impersonateUser.token && data?.impersonateUser.url) {
        const currentHost = window.location.hostname;
        const targetHost = new URL(data.impersonateUser.url).hostname;

        if (currentHost !== targetHost && !IS_LOCAL) {
          window.location.href = `${data.impersonateUser.url}/auth-redirect?token=${data.impersonateUser.token}`;
        } else {
          setAuthenticationCookie(data.impersonateUser.token);
          window.location.href = '/';
        }
      }
    } catch (e: any) {
      const errorMsg = e?.graphQLErrors?.[0]?.message || e?.message || 'Failed to impersonate user';
      setErrorMessage(errorMsg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Impersonate User
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              name="email"
              ref={register}
              placeholder="user@example.com"
              className="w-full"
            />
            {formErrors.email && (
              <ErrorText className="mt-1">{formErrors.email.message}</ErrorText>
            )}
          </div>

          <div>
            <label htmlFor="targetUserPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              id="targetUserPassword"
              type="text"
              name="targetUserPassword"
              ref={register}
              placeholder=""
              className="w-full font-mono text-sm"
            />
            {formErrors.targetUserPassword && (
              <ErrorText className="mt-1">{formErrors.targetUserPassword.message}</ErrorText>
            )}
          </div>

          {(error || errorMessage) && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">
                {errorMessage || error?.graphQLErrors?.[0]?.message || 'An error occurred'}
              </div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login as User'}
            </Button>
          </div>

          <div className="text-center">
            <a
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Back to Dashboard
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Impersonate;

