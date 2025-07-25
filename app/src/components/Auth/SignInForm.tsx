import React from 'react';
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

  return (
    <div className="bg-white max-w-[300px] w-[300px] mt-16">
      <Logo />
      <form onSubmit={onSubmit} className="mb-[24px]">
        <div className="font-bold text-[26px] leading-9 text-sapphire-blue mb-[34px]">
          {t('Sign_in.text.heading')}
        </div>
        <div>
          <div className="mb-4 w-full block">
            <label className="font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block mb-[19px] uppercase">
              {t('Common.label.email')}
            </label>
            <FormControl>
              <Input
                type="email"
                placeholder={t('Common.placeholder.email')}
                name="email"
                ref={register}
              />
              {formErrors?.email?.message && (
                <ErrorText message={String(t(formErrors.email.message))} />
              )}
            </FormControl>
          </div>
          <div className="mb-4 w-full block">
            <label className="font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block mb-[19px] uppercase">
              {t('Common.label.password')}
            </label>
            <FormControl>
              <Input
                type="password"
                placeholder={t('Common.placeholder.password')}
                name="password"
                ref={register}
              />
              {formErrors?.password?.message && (
                <ErrorText message={String(t(formErrors.password.message))} />
              )}
            </FormControl>
          </div>
          <div className="flex items-center pt-3">
            <Checkbox type="checkbox" name="rembemer" id="rembemer" />
            <label
              htmlFor="rembemer"
              className="font-medium text-[16px] leading-[19px] text-sapphire-blue ml-[5px]"
            >
              {t('Common.label.remember_label')}
            </label>
          </div>
          <Button
            color="primary"
            type="submit"
            disabled={isSubmitting}
            className="w-full uppercase mt-8"
          >
            {isSubmitting
              ? t('Common.text.please_wait')
              : t('Sign_in.text.button_text')}
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

          {/* Regular forgot password link */}
          {!showForgotPasswordLink && (
            <div>
              <Link
                to="/auth/forgot-password"
                className="text-[14px] leading-[24px] text-light-primary text-center block mt-6"
              >
                {t('Sign_in.text.forgot_password')}
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
      <div className="mt-[60px] text-center text-[14px] leading-[24px] text-sapphire-blue">
        <Trans components={[<Link to="/auth/signup"></Link>]}>
          {t('Sign_in.text.not_have_account')}
        </Trans>
      </div>
    </div>
  );
};

export default SignInForm;
