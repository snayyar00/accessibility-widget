import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import ForgotPasswordForm from '@/components/Auth/ForgotPasswordForm';
import forgotpasswordQuery from '@/queries/auth/forgotPassword';
import { useMutation } from '@apollo/client';
import squareRadiusTop from '@/assets/images/svg/square-radius-top.svg';
import squareRadiusTopPrimary from '@/assets/images/svg/square-radius-top-primary.svg';
import squareRadiusTopPrimarySmall from '@/assets/images/svg/square-radius-top-primary-small.svg';
import squareGrid from '@/assets/images/svg/square-grid.svg';
import squareRadiusTopBig from '@/assets/images/svg/square-radius-top-big.svg';
import circleSmall from '@/assets/images/svg/circle-small.svg';
import useDocumentHeader from '@/hooks/useDocumentTitle';

const ForgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .required('Common.validation.require_email')
    .email('Common.validation.valid_email')
    .max(254, 'Common.validation.max_email_length'),
});

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.forgot_password') });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const { register, handleSubmit, errors } = useForm({
    resolver: yupResolver(ForgotPasswordSchema),
  });
  const [forgotPasswordMutation, { loading, error }] =
    useMutation(forgotpasswordQuery);

  async function onSubmit(data: { email: string }) {
    setIsSubmitted(false);
    try {
      await forgotPasswordMutation({ variables: data });
      setIsSubmitted(true);
    } catch (e) {
      console.log(e);
      setIsSubmitted(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Modern background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-blue-100/60" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-300/10 to-transparent rounded-full blur-3xl" />

      {/* Decorative elements */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-24 h-24 bg-blue-300/20 rounded-full blur-2xl animate-pulse delay-1000" />

      {/* Main card container */}
      <main className="relative w-full max-w-md mx-auto px-6 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
          {/* Card glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-blue-50/30 rounded-2xl" />

          {/* Content */}
          <div className="relative z-10">
            <ForgotPasswordForm
              onSubmit={handleSubmit(onSubmit)}
              register={register}
              errors={errors}
              isSubmitted={isSubmitted && !error}
              isSubmitting={loading}
              apiError={error?.graphQLErrors?.[0]?.extensions?.code}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
