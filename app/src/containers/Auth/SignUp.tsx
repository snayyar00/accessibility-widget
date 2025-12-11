import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { useHistory } from 'react-router-dom';

import SignUpForm from '@/components/Auth/SignUpForm';
import AuthAdsArea from '@/components/Auth/AuthAds';
import AccessibilityBanner from '@/components/Auth/AccessibilityBanner';
import registerQuery from '@/queries/auth/register';
import getQueryParam from '@/utils/getQueryParam';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import zxcvbn from 'zxcvbn';
import {
  getRootDomain,
  isIpAddress,
  isValidRootDomainFormat,
} from '@/utils/domainUtils';
import addSite from '@/queries/allowedSites/addSite.js';
import isValidDomain from '@/utils/verifyDomain';
import DOMPurify from 'dompurify';
import LinkifyIt from 'linkify-it';
import { setAuthenticationCookie } from '@/utils/cookie';
import { IS_LOCAL } from '@/config/env';

const linkify = new LinkifyIt();

const SignUpSchema = yup.object().shape({
  name: yup
    .string()
    .required('Common.validation.require_name')
    .max(100, 'Common.validation.max_name')
    .test('no-links', 'Common.validation.name_contains_links', (value) => {
      if (!value) return true;

      const matches = linkify.match(value);
      return !matches || matches.length === 0;
    })
    .transform((value) =>
      DOMPurify.sanitize(value || '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
    ),
  email: yup
    .string()
    .required('Common.validation.require_email')
    .max(100, 'Common.validation.max_email')
    .transform((value) =>
      DOMPurify.sanitize(value || '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
    )
    .email('Common.validation.valid_email')
    .max(254, 'Common.validation.max_email_length')
    .test(
      'no-plus-sign',
      'Common.validation.no_plus_in_email',
      (value: string | null | undefined) => !value?.includes('+'),
    ),
  websiteUrl: yup
    .string()
    .transform((value) => {
      if (!value) return undefined;
      let sanitized = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
      return sanitized
        .replace(/^https?:\/\//, '') // Remove http:// or https://
        .replace(/\/+$/, ''); // Remove trailing slashes
    })
    .nullable()
    .notRequired() // Make it optional
    .max(100, 'Common.validation.max_url') // Max domain length
    .test('valid-domain', 'Common.validation.valid_url', (value) => {
      // Skip validation if field is empty or undefined
      if (!value) return true;

      if (!isValidDomain(value)) {
        return false;
      }

      const sanitizedDomain = getRootDomain(value);
      if (
        sanitizedDomain !== 'localhost' &&
        !isIpAddress(sanitizedDomain) &&
        !isValidRootDomainFormat(sanitizedDomain)
      ) {
        return false;
      } else {
        return true;
      }
    }),
  password: yup
    .string()
    .required('Common.validation.require_password')
    .min(8, 'Common.validation.min_password')
    .max(50, 'Common.validation.max_password')
    .test(
      'strong-password',
      'Common.validation.weak_password',
      (value: any) => {
        const passwordStrength = zxcvbn(value);
        return passwordStrength.score >= 3; // Ensure password is at least "strong"
      },
    ),
  passwordConfirmation: yup
    .string()
    .required('Common.validation.require_password_confirm')
    .max(50, 'Common.validation.max_password')
    .oneOf([yup.ref('password'), ''], 'Common.validation.password_match'),
});

type SignUpPayload = {
  email?: string;
  password?: string;
  name?: string;
  websiteUrl?: string;
  paymentMethodToken: string | null;
  planName: string | null;
  billingType: 'MONTHLY' | 'YEARLY';
};

const SignUp: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.sign_up') });
  const {
    register,
    handleSubmit,
    errors: formErrors,
    trigger,
  } = useForm({
    resolver: yupResolver(SignUpSchema),
    shouldUnregister: false,
    mode: 'onBlur', // Validate fields on blur
    criteriaMode: 'all', // Show all validation errors
  });
  const [registerMutation, { error, loading }] = useMutation(registerQuery);
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [formData, setFormData] = useState({});
  const history = useHistory();
  const query = getQueryParam();
  const planName = query.get('plan');

  const [addSiteMutation, { error: addSiteError, loading: addSiteLoading }] =
    useMutation(addSite, {
      onCompleted: () => {
        // setReloadSites(true);
        toast.success('Domain added successfully!');
      },
      onError: () => {
        // setReloadSites(true);
        toast.error('Could not add domain. Please try again later.');
      },
    });

  async function signup(params: SignUpPayload) {
    try {
      // Get referral code from Rewardful or localStorage
      const referralCode =
        window.Rewardful?.referral ||
        localStorage.getItem('referralCode') ||
        null;

      const variables: any = {
        email: params.email,
        password: params.password,
        name: params.name,
      };

      // Add referral code if present
      if (referralCode) {
        variables.referralCode = referralCode;
      }

      const { data } = await registerMutation({ variables });

      if (data?.register?.token && data?.register?.url) {
        const currentHost = window.location.hostname;
        const targetHost = new URL(data.register.url).hostname;

        if (currentHost !== targetHost && !IS_LOCAL) {
          // Need to redirect to different domain
          window.location.href = `${data.register.url}/auth-redirect?token=${data.register.token}`;
          return true;
        } else {
          // Same domain, just set cookie and continue
          setAuthenticationCookie(data.register.token);
          toast.success('Account created successfully!');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error during registration:', error);
      toast.error('Failed to create account. Please try again.');
      return false;
    }
  }

  async function addSiteAfterSignup(websiteUrl: string) {
    try {
      // Process the URL to get the root domain
      const sanitizedDomain = getRootDomain(websiteUrl);

      // Add the sanitized domain to the user's account
      const response = await addSiteMutation({
        variables: {
          url: sanitizedDomain,
        },
      });

      if (!response.errors) {
        // Redirect to add-domain page after successful site addition
        history.push('/add-domain');
        return true;
      } else {
        toast.error(
          'There was an issue adding your domain. Redirecting to dashboard...',
        );
        history.push('/');
        return false;
      }
    } catch (error) {
      console.error('Error adding site:', error);
      toast.error(
        'There was an issue adding your domain. Redirecting to dashboard...',
      );
      history.push('/');
      return false;
    }
  }

  async function onSubmit(params: SignUpPayload) {
    if (planName) {
      setShowStripeForm(true);
      setFormData(params);
    } else {
      try {
        // First, wait for registration to complete
        const registrationSuccess = await signup(params);

        // Only proceed with site addition if registration was successful
        if (registrationSuccess) {
          // If websiteUrl exists, add the site
          if (params.websiteUrl && params.websiteUrl.trim() !== '') {
            await addSiteAfterSignup(params.websiteUrl);
          } else {
            // If no website URL, just redirect to dashboard
            history.push('/');
          }
        }
      } catch (error) {
        console.error('Error in signup process:', error);
        toast.error('An unexpected error occurred. Please try again.');
      }
    }
  }

  return (
    <div className="flex h-screen sm:flex-col overflow-hidden">
      <div className="w-[80%] flex justify-end items-start sm:w-full lg:pl-16 overflow-y-auto pt-8 no-scrollbar">
        <SignUpForm
          onSubmit={handleSubmit(onSubmit)}
          register={register}
          formErrors={formErrors}
          trigger={trigger}
          apiError={error}
          isSubmitting={loading}
          siteAdding={addSiteLoading}
          submitText={String(
            planName ? t('Sign_up.text.next') : 'Finish Sign Up',
          )}
        />
      </div>
      <div className="w-[55%] sm:hidden flex items-center justify-end p-5 relative overflow-hidden">
        <img
          src="/images/auth/auth_image1.png"
          alt="Authentication"
          className="h-[95vh] object-contain ml-auto"
          style={{ maxWidth: '90%' }}
        />
        <AccessibilityBanner />
      </div>
    </div>
  );
};

export default SignUp;
