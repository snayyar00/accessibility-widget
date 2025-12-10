import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@apollo/client';
import { useSelector } from 'react-redux';
import { Redirect, useLocation } from 'react-router-dom';
import { RootState } from '@/config/store';
import { setAuthenticationCookie } from '@/utils/cookie';
import impersonateUserQuery from '@/queries/auth/impersonateUser';
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
});

type Payload = {
  email: string;
};

const Impersonate: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: 'Impersonate User' });
  const { data: userData } = useSelector((state: RootState) => state.user);
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

  // Only super admins can access this page
  if (!userData.is_super_admin) {
    return <Redirect to="/" />;
  }

  // Read email from query parameter and auto-submit if provided
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const email = searchParams.get('email');
    if (email) {
      setValue('email', email);
      // Auto-submit if email is provided in query
      onSubmit({ email });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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
      console.error('Impersonation error:', e);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Impersonate User
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the email address of the user you want to login as
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              User Email
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

