import type React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ApolloError } from '@apollo/client';
import FormControl from '@/components/Common/FormControl';
import Input from '@/components/Common/Input/Input';
import ErrorText from '@/components/Common/ErrorText';
import Button from '@/components/Common/Button';
import Logo from '@/components/Common/Logo';
import type { ReactHookFormType } from '@/typeReactHookForm';
import { FaEye, FaEyeSlash, FaCheck } from 'react-icons/fa';
import ProgressIndicator from './ProgressIndicator';
import { useLazyQuery } from '@apollo/client';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import checkDomainQuery from '@/queries/allowedSites/checkDomain.js';
import checkEmailQuery from '@/queries/user/checkEmail';
import { CircularProgress } from '@mui/material';
import WebAbilityWidget from './TryWidgetBanner';
import { toast } from 'sonner';
import AccessibilitySteps from './AccessibilitySteps';
import { parse } from 'tldts';
import {
  getRootDomain,
  isIpAddress,
  isValidRootDomainFormat,
} from '@/utils/domainUtils';
import AccessibilityFacts from './AccessibilityFacts';
import {
  extractValidationErrors,
  getLocalizedErrors,
} from '@/utils/errorHandler';
import { getAuthenticationCookie } from '@/utils/cookie';

type CustomProps = ReactHookFormType & {
  isSubmitting: boolean;
  siteAdding: boolean;
  apiError?: ApolloError;
  submitText?: string;
};

const SignUpForm: React.FC<CustomProps> = ({
  onSubmit,
  register,
  formErrors,
  apiError,
  isSubmitting,
  siteAdding,
  submitText = 'Submit',
  trigger,
}) => {
  const { t } = useTranslation();

  // State to manage password visibility
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  // State to manage the current step
  const [currentStep, setCurrentStep] = useState(1);

  // State to store form data across steps
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    websiteUrl: '',
    password: '',
    passwordConfirmation: '',
  });

  // Accessibility analysis states
  const [score, setScore] = useState<number>(0);
  const [totalErrorCount, setTotalErrorCount] = useState<number>(0);
  const [scriptCheckResult, setScriptCheckResult] = useState<string>('');

  // State for domain and email check
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [analysisTimeout, setAnalysisTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  // State for accessibility facts rotation
  const [showFacts, setShowFacts] = useState(false);
  const [showLogoAnimation, setShowLogoAnimation] = useState(true);
  const [checkDomainExists] = useLazyQuery(checkDomainQuery, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.isDomainAlreadyAdded) {
        const sanitizedDomain = getRootDomain(formData.websiteUrl);
        const originalInputDetails = parse(formData.websiteUrl);

        if (
          originalInputDetails.domain === sanitizedDomain &&
          originalInputDetails.subdomain &&
          originalInputDetails.subdomain.toLowerCase() !== 'www'
        ) {
          toast.error(
            `The root domain '${sanitizedDomain}' is already registered. This covers subdomains like '${formData.websiteUrl}'. You don't need to add it separately.`,
          );
        } else if (
          originalInputDetails.domain === sanitizedDomain &&
          originalInputDetails.subdomain &&
          originalInputDetails.subdomain.toLowerCase() === 'www'
        ) {
          toast.error(
            `The domain '${sanitizedDomain}' (derived from your input '${formData.websiteUrl}') is already registered.`,
          );
        } else {
          toast.error(`The domain '${sanitizedDomain}' is already in use.`);
        }
        setCheckingDomain(false);
      } else {
        // Domain is available, proceed to check email
        checkEmailAvailability();
      }
    },
    onError: (error) => {
      console.error('Error checking domain:', error);
      toast.error(
        'There was an issue validating your domain. Please try again.',
      );
      setCheckingDomain(false);
      // If there's an error checking the domain, still proceed to check email
      checkEmailAvailability();
    },
  });

  const [checkEmailExists] = useLazyQuery(checkEmailQuery, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.isEmailAlreadyRegistered) {
        toast.error(
          'This email is already registered. Please use a different email or sign in.',
        );
        setCheckingEmail(false);
        setCheckingDomain(false);
      } else {
        // Email is available, proceed to next step
        setCurrentStep((prev) => prev + 1);
        setCheckingEmail(false);
        setCheckingDomain(false);
      }
    },
    onError: (error) => {
      console.error('Error checking email:', error);
      // If there's an error checking the email, still proceed
      setCurrentStep((prev) => prev + 1);
      setCheckingEmail(false);
      setCheckingDomain(false);
    },
  });

  // Function to check email availability
  const checkEmailAvailability = () => {
    setCheckingEmail(true);
    checkEmailExists({
      variables: {
        email: formData.email,
      },
    });
  };

  // Function to group accessibility issues by code
  const groupByCodeUtil = (issues: any) => {
    const groupedByCode: any = {};
    if (Array.isArray(issues)) {
      issues.forEach((warning) => {
        const { code } = warning;
        if (!groupedByCode[code]) {
          groupedByCode[code] = [];
        }
        groupedByCode[code].push(warning);
      });
    }
    return groupedByCode;
  };

  const groupByCode = (issues: any) => {
    try {
      if (issues && typeof issues === 'object') {
        issues.errors = groupByCodeUtil(issues.errors);
        issues.warnings = groupByCodeUtil(issues.warnings);
        issues.notices = groupByCodeUtil(issues.notices);

        // Count total issues
        const errorCount = Array.isArray(issues.errors)
          ? issues.errors.length
          : Object.keys(issues.errors || {}).length;
        const warningCount = Array.isArray(issues.warnings)
          ? issues.warnings.length
          : Object.keys(issues.warnings || {}).length;
        const noticeCount = Array.isArray(issues.notices)
          ? issues.notices.length
          : Object.keys(issues.notices || {}).length;

        const totalCount = errorCount + warningCount + noticeCount;
        setTotalErrorCount(totalCount);
      }
    } catch (error) {
      setTotalErrorCount(119);
    }
  };

  const [
    getAccessibilityStatsQuery,
    { data, loading: analysisLoading, error: analysisError },
  ] = useLazyQuery(getAccessibilityStats, {
    variables: { url: formData.websiteUrl },
    errorPolicy: 'all',
    onCompleted: (data) => {
      // Clear timeout immediately when results arrive
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
        setAnalysisTimeout(null);
      }
    },
    onError: async (error) => {
      console.error('Accessibility analysis failed:', error);

      // Script check has already run and completed by now
      // If no script check result somehow, use default error count
      if (!scriptCheckResult) {
        setTotalErrorCount(119);
      }

      // Clear timeout if it exists
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
        setAnalysisTimeout(null);
      }

      // Skip to step 3 (keep websiteUrl)
      setCurrentStep(3);
    },
  });

  useEffect(() => {
    if (data) {
      const result = data.getAccessibilityReport;

      if (result) {
        setScore(result?.score);
        groupByCode(result?.htmlcs);
      }
    }
  }, [data]);

  // UseEffect for step 2 analysis
  useEffect(() => {
    if (currentStep === 2 && formData.websiteUrl) {
      // Start both accessibility analysis and script check simultaneously
      getAccessibilityStatsQuery();

      // Start script check at the same time (it's faster)
      checkScript(formData.websiteUrl)
        .then((scriptResult) => {
          setScriptCheckResult(scriptResult);
          // Set error count immediately based on script check result
          setErrorCountBasedOnResults(scriptResult, false);
        })
        .catch((error) => {
          console.error('Script check failed:', error);
          setScriptCheckResult('false');
          setErrorCountBasedOnResults('false', false);
        });

      // Set a timeout (2 minutes) for the analysis
      const timeout = setTimeout(() => {
        // Script check has already completed by now, just skip to step 3
        setCurrentStep(3);
      }, 120000);

      setAnalysisTimeout(timeout);
    } else if (currentStep === 2) {
      // If website URL is not provided, skip step 2
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  // Add a separate effect to monitor query completion
  useEffect(() => {
    // If we're on step 2 and data has loaded (analysis is complete)
    if (currentStep === 2 && data && !analysisLoading) {
      // Clear timeout since analysis completed successfully
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
        setAnalysisTimeout(null);
      }

      // If script check found WebAbility, keep the low error count
      // Otherwise, the real accessibility data from groupByCode will be used
      if (scriptCheckResult === 'Web Ability') {
        setTotalErrorCount(5);
      }

      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, data, analysisLoading, analysisTimeout, scriptCheckResult]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
      }
    };
  }, [analysisTimeout]);

  // Function to toggle password visibility
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  // Function to handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const [activeTab, setActiveTab] = useState('overview');
  // Function to handle step navigation
  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Validate all form fields in step 1
      const isValid = trigger
        ? await trigger()
        : !Object.keys(formErrors || {}).length;

      // Only proceed if validation passes
      if (isValid) {
        // Always check email first
        if (formData.email) {
          setCheckingDomain(true);

          // If website URL is provided, check domain first, then email
          if (formData.websiteUrl) {
            // Validate domain format first
            const sanitizedDomain = getRootDomain(formData.websiteUrl);
            if (
              sanitizedDomain !== 'localhost' &&
              !isIpAddress(sanitizedDomain) &&
              !isValidRootDomainFormat(sanitizedDomain)
            ) {
              toast.error('You must enter a valid domain name!');
              setCheckingDomain(false);
              return;
            }

            checkDomainExists({
              variables: {
                url: sanitizedDomain,
              },
            });
          } else {
            // No website URL provided, just check email
            checkEmailAvailability();
          }
        } else {
          // No email provided (should not happen due to validation)
          toast.error('Email is required.');
        }
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // Effect to show facts after 30 seconds
  useEffect(() => {
    if (currentStep === 2) {
      // Show facts and hide logo animation after 30 seconds
      const showFactsTimeout = setTimeout(() => {
        setShowLogoAnimation(false); // Fade out logo animation
        setTimeout(() => {
          setShowFacts(true); // Fade in facts after logo fades out
        }, 400); // Small delay for smooth transition
      }, 30000);

      return () => {
        clearTimeout(showFactsTimeout);
      };
    } else {
      // Reset when leaving step 2
      setShowFacts(false);
      setShowLogoAnimation(true);
      return; // Explicit return for consistency
    }
  }, [currentStep]);

  // Step 1: Basic Information
  const renderStep1 = () => {
    return (
      <div className="w-full px-8 py-8">
        {/* Welcome Message */}
        <div className="text-left mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h2>
          <p className="text-gray-600">
            Let's get started with your information
          </p>
        </div>

        <p className="text-xs text-gray-600 mb-4 text-left">
          Fields marked with an asterisk (*) are required.
        </p>
        <div className="space-y-6">
          {/* Name Field */}
          <div className="group">
            <label htmlFor="signup-name" className="block text-left text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide transition-colors">
              {t('Common.label.your_name')} <span className="text-red-600" aria-label="required">*</span>
            </label>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400 transition-colors"
                    style={{ '--focus-color': '#0052CC' } as React.CSSProperties}
                    onFocus={(e) => { e.currentTarget.style.color = '#0052CC'; }}
                    onBlur={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <Input
                  type="text"
                  id="signup-name"
                  placeholder="Enter your full name"
                  name="name"
                  ref={register}
                  value={formData.name}
                  onChange={handleInputChange}
                  aria-label="Your Name"
                  aria-required="true"
                  aria-invalid={formErrors?.name ? 'true' : 'false'}
                  aria-describedby={formErrors?.name ? 'signup-name-error' : undefined}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder:text-[#4B5563]"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 82, 204, 0.1)';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {formErrors?.name?.message && (
                <ErrorText id="signup-name-error" message={String(t(formErrors.name.message))} />
              )}
            </FormControl>
          </div>

          {/* Email Field */}
          <div className="group">
            <label htmlFor="signup-email" className="block text-left text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide transition-colors">
              {t('Common.label.email')} <span className="text-red-600" aria-label="required">*</span>
            </label>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400 transition-colors"
                    style={{ '--focus-color': '#0052CC' } as React.CSSProperties}
                    onFocus={(e) => { e.currentTarget.style.color = '#0052CC'; }}
                    onBlur={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <Input
                  type="email"
                  id="signup-email"
                  placeholder="yourname@yourbusiness.com"
                  name="email"
                  ref={register}
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  aria-label="Email"
                  aria-required="true"
                  aria-invalid={formErrors?.email ? 'true' : 'false'}
                  aria-describedby={formErrors?.email ? 'signup-email-error' : undefined}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder:text-[#4A5568]"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 82, 204, 0.1)';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {formErrors?.email?.message && (
                <ErrorText id="signup-email-error" message={String(t(formErrors.email.message))} />
              )}
            </FormControl>
          </div>

          {/* Website URL Field */}
          <div className="group">
            <label htmlFor="signup-website-url" className="block text-left text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide transition-colors">
              {t('Common.label.website_url')}{' '}
              <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400 transition-colors"
                    style={{ '--focus-color': '#0052CC' } as React.CSSProperties}
                    onFocus={(e) => { e.currentTarget.style.color = '#0052CC'; }}
                    onBlur={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                    />
                  </svg>
                </div>
                <Input
                  type="url"
                  id="signup-website-url"
                  placeholder="example.com"
                  name="websiteUrl"
                  ref={register}
                  value={formData.websiteUrl}
                  onChange={handleInputChange}
                  aria-label="Website URL"
                  aria-invalid={formErrors?.websiteUrl ? 'true' : 'false'}
                  aria-describedby={formErrors?.websiteUrl ? 'signup-website-url-error' : undefined}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder:text-[#4B5563]"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 82, 204, 0.1)';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {formErrors?.websiteUrl?.message && (
                <ErrorText id="signup-website-url-error" message={String(t(formErrors.websiteUrl.message))} />
              )}
            </FormControl>
          </div>

          {/* Password Field */}
          <div className="group">
            <label htmlFor="signup-password" className="block text-left text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide transition-colors">
              {t('Common.label.password')} <span className="text-red-600" aria-label="required">*</span>
            </label>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400 transition-colors"
                    style={{ '--focus-color': '#0052CC' } as React.CSSProperties}
                    onFocus={(e) => { e.currentTarget.style.color = '#0052CC'; }}
                    onBlur={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <Input
                  type={passwordVisible ? 'text' : 'password'}
                  id="signup-password"
                  placeholder="Create a strong password"
                  name="password"
                  ref={register}
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  aria-label="Password"
                  aria-required="true"
                  aria-invalid={formErrors?.password ? 'true' : 'false'}
                  aria-describedby={formErrors?.password ? 'signup-password-error' : undefined}
                  className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder:text-[#4B5563]"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 82, 204, 0.1)';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                  style={{ color: '#6C7586' }}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                >
                  {passwordVisible ? (
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors?.password?.message && (
                <ErrorText id="signup-password-error" message={String(t(formErrors.password.message))} />
              )}
            </FormControl>
          </div>

          {/* Confirm Password Field */}
          <div className="group">
            <label htmlFor="signup-confirm-password" className="block text-left text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide transition-colors">
              {t('Common.label.confirm_password')} <span className="text-red-600" aria-label="required">*</span>
            </label>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400 transition-colors"
                    style={{ '--focus-color': '#0052CC' } as React.CSSProperties}
                    onFocus={(e) => { e.currentTarget.style.color = '#0052CC'; }}
                    onBlur={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <Input
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  id="signup-confirm-password"
                  placeholder="Confirm your password"
                  name="passwordConfirmation"
                  ref={register}
                  value={formData.passwordConfirmation}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  aria-label="Confirm password"
                  aria-required="true"
                  aria-invalid={formErrors?.passwordConfirmation ? 'true' : 'false'}
                  aria-describedby={formErrors?.passwordConfirmation ? 'signup-confirm-password-error' : undefined}
                  className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder:text-[#4B5563]"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 82, 204, 0.1)';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                  style={{ color: '#6C7586' }}
                  aria-label={confirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {confirmPasswordVisible ? (
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div 
                id="signup-confirm-password-error" 
                role="alert" 
                aria-live="assertive" 
                aria-atomic="true"
                className="min-h-[20px]"
              >
                {formErrors?.passwordConfirmation?.message ? (
                  <span className="text-[12px] mt-[5px] mb-[7px] block text-left" style={{ color: '#E7074F' }}>
                    {String(t(formErrors.passwordConfirmation.message))}
                  </span>
                ) : null}
              </div>
            </FormControl>
          </div>
        </div>

        {/* Continue Button */}
        <div className="mt-10">
          <Button
            color="primary"
            type="button"
            className="w-full text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ backgroundColor: '#0052CC' }}
            onClick={handleNextStep}
            disabled={checkingDomain || checkingEmail}
          >
            {checkingDomain || checkingEmail ? (
              <span className="flex items-center justify-center">
                <CircularProgress
                  size={24}
                  color={'inherit'}
                  className="mr-3"
                />
                <span className="text-lg">Please Wait...</span>
              </span>
            ) : (
              <span className="text-lg font-semibold">Continue</span>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Function to handle skipping the analysis
  const handleSkipAnalysis = () => {
    // Clear the analysis timeout
    if (analysisTimeout) {
      clearTimeout(analysisTimeout);
      setAnalysisTimeout(null);
    }

    // Set a default error count for skipped analysis
    setTotalErrorCount(119);
    setScriptCheckResult('false');

    // Move to next step
    setCurrentStep(3);
  };

  // Step 2: Website Analysis
  const renderStep2 = () => {
    return (
      <div className="text-center flex flex-col items-center justify-center min-h-[600px] relative">
        {/* Logo Animation Section - Fade out after 30 seconds */}
        {showLogoAnimation && (
          <div
            className={`transition-all duration-500 ease-in-out ${
              showLogoAnimation ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Enhanced image container with throbbing animation */}
            <div className="mb-8 relative">
              {/* Main image container with rectangular border matching the logo image */}
              <div className="relative w-64 h-64 mx-auto flex items-center justify-center z-10">
                {/* Outer animated rectangular border */}
                <div className="absolute inset-0 border-[3px] border-light-primary rounded-md animate-breathe"></div>

                {/* Inner rectangular border - static */}
                <div className="absolute inset-4 border-[3px] border-light-white-gray rounded-md"></div>

                {/* Logo container */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* Logo */}
                  <div className="relative z-10">
                    <Logo />
                  </div>
                </div>
              </div>

              {/* Subtle scanning effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-md">
                <div className="w-full h-0.5 bg-blue-400/10 animate-scan"></div>
              </div>
            </div>

            {/* Enhanced loading spinner */}
            <div className="flex justify-center mb-6">
              <CircularProgress />
            </div>

            <div className="flex flex-col items-center gap-2 mb-8">
              <p className="text-left font-medium flex items-center" style={{ color: '#0052CC' }}>
                Scanning for accessibility issues
              </p>

              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full animate-progress" style={{ backgroundColor: '#0052CC' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Accessibility Facts Section - Show after logo fades out */}
        {showFacts && (
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fadeIn">
            {/* Still show scanning status when facts are visible */}
            <div className="flex justify-center mb-6">
              <CircularProgress />
            </div>

            <div className="flex flex-col items-center gap-2 mb-8">
              <p className="text-left font-medium flex items-center" style={{ color: '#0052CC' }}>
                Scanning for accessibility issues
              </p>

              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full animate-progress" style={{ backgroundColor: '#0052CC' }}></div>
              </div>
            </div>

            <AccessibilityFacts isVisible={showFacts} />
          </div>
        )}

        {/* Skip Button */}
        <div className="mt-8">
          <Button
            color="default"
            type="button"
            className="px-8 py-3 text-gray-600 hover:text-gray-800 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            onClick={handleSkipAnalysis}
          >
            Skip Analysis
          </Button>
        </div>
      </div>
    );
  };

  // Step 3: Results and Account Creation
  const renderStep3 = () => {
    // Use totalErrorCount if available, otherwise use a default
    const errorCount = totalErrorCount > 0 ? totalErrorCount : 119;

    return (
      <div>
        <div className="mb-6">
          {formData?.websiteUrl && formData?.websiteUrl.trim() !== '' && (
            <WebAbilityWidget errorCount={errorCount} />
          )}

          <AccessibilitySteps />
        </div>
      </div>
    );
  };

  const steps = [
    { id: 1, title: t('Step 1'), description: t('Getting to Know You') },
    { id: 2, title: t('Step 2'), description: t('Website Analysis') },
    { id: 3, title: t('Step 3'), description: t('Finalize your results') },
  ];

  // Function to check script installation
  const checkScript = async (url: string): Promise<string> => {
    const token = getAuthenticationCookie();

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/check-script`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ siteUrl: url }),
        },
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Script check failed:', error);
      return 'false'; // Default to no widget detected on error
    }
  };

  // Function to set error count based on script check and accessibility data
  const setErrorCountBasedOnResults = (
    scriptResult: string,
    hasAccessibilityData: boolean,
  ) => {
    if (scriptResult === 'Web Ability') {
      // WebAbility widget already installed - lowest error count
      setTotalErrorCount(5);
    } else if (scriptResult !== 'false') {
      // No widget detected - lower error count
      setTotalErrorCount(85);
    } else {
      // Other widget detected or default case
      if (hasAccessibilityData) {
        // Use real accessibility data if available
        return; // Don't override real data
      } else {
        // Use default template count
        setTotalErrorCount(119);
      }
    }
  };

  return (
    <div className="bg-white w-full text-center mt-10">
      <div className="flex mb-8 justify-center items-center">
        <Logo />
      </div>

      <ProgressIndicator steps={steps} currentStep={currentStep} />

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {currentStep === 3 && (
        <Button
          color="primary"
          type="submit"
          className="w-full sm:max-w-4xl md:max-w-5xl uppercase mt-[34px]"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting || siteAdding ? (
            <span className="flex items-center justify-center">
              <CircularProgress size={30} color={'inherit'} className="mr-2 " />
              Please Wait
            </span>
          ) : (
            submitText
          )}
        </Button>
      )}

      {apiError && (
        <div className="mt-4">
          {(() => {
            const validationErrors = extractValidationErrors(apiError);
            const localizedErrors = getLocalizedErrors(
              validationErrors,
              t,
              'Sign_up',
            );

            return localizedErrors.map((errorMessage, index) => (
              <ErrorText key={index} message={errorMessage} position="center" />
            ));
          })()}
        </div>
      )}

      {currentStep === 1 && (
        <>
          <div className="sm:px-6 mt-4 md:px-0 text-[14px] leading-6 text-sapphire-blue">
            <Trans
              components={[
                <a href="https://www.webability.io/terms-of-use" key="terms" className="underline" style={{ color: '#0052CC' }} target="_blank" rel="noopener noreferrer"></a>,
                <a href="https://www.webability.io/privacy-policy" key="privacy" className="underline" style={{ color: '#0052CC' }} target="_blank" rel="noopener noreferrer"></a>,
                <Link to="##" key="security" className="underline" style={{ color: '#0052CC' }}></Link>,
              ]}
            >
              {t('Sign_up.text.footer_desc')}
            </Trans>
          </div>
          <div className="text-[14px] leading-6 text-sapphire-blue mt-[30px] text-center pb-8">
            <Trans components={[<Link to="/auth/signin" className="underline" style={{ color: '#0052CC' }}></Link>]}>
              {t('Sign_up.text.have_account')}
            </Trans>
          </div>
        </>
      )}

      {currentStep === 3 && (
        <div className="text-[14px] leading-6 text-sapphire-blue mt-[30px] text-center pb-8">
          <Trans components={[<Link to="/auth/signin" className="underline" style={{ color: '#0052CC' }}></Link>]}>
            {t('Sign_up.text.have_account')}
          </Trans>
        </div>
      )}
    </div>
  );
};

export default SignUpForm;
