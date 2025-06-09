import type React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import FormControl from '@/components/Common/FormControl';
import Input from '@/components/Common/Input/Input';
import ErrorText from '@/components/Common/ErrorText';
import Button from '@/components/Common/Button';
import Logo from '@/components/Common/Logo';
import type { ReactHookFormType } from '@/typeReactHookForm';
import SocialAuth from '@/containers/Auth/SocialAuth';
import { FaEye, FaEyeSlash, FaCheck } from 'react-icons/fa';
import ProgressIndicator from './ProgressIndicator';
import { useLazyQuery } from '@apollo/client';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import checkDomainQuery from '@/queries/allowedSites/checkDomain.js';
import checkEmailQuery from '@/queries/user/checkEmail.js';
import { CircularProgress } from '@mui/material';
import WebAbilityWidget from './TryWidgetBanner';
import PlanSetting from '@/containers/SiteDetail/PlanSetting';
import { toast } from 'react-toastify';
import AccessibilitySteps from './AccessibilitySteps';
import { parse } from 'tldts';
import { getRootDomain, isIpAddress, isValidRootDomainFormat } from '@/utils/domainUtils';

type CustomProps = ReactHookFormType & {
  isSubmitting: boolean;
  siteAdding: boolean;
  apiError?: string;
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
  const [siteImg, setSiteImg] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [scoreBackup, setScoreBackup] = useState<number>(0);
  const [accessibilityIssues, setAccessibilityIssues] = useState<any[]>([]);
  const [groupedIssues, setGroupedIssues] = useState<Record<string, any[]>>({});
  const [totalErrorCount, setTotalErrorCount] = useState<number>(0);

  // State for domain and email check
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [checkDomainExists] = useLazyQuery(checkDomainQuery, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.isDomainAlreadyAdded) {
        const sanitizedDomain = getRootDomain(formData.websiteUrl);
        const originalInputDetails = parse(formData.websiteUrl);
        
        if (originalInputDetails.domain === sanitizedDomain && originalInputDetails.subdomain && originalInputDetails.subdomain.toLowerCase() !== 'www') {
          toast.error(`The root domain '${sanitizedDomain}' is already registered. This covers subdomains like '${formData.websiteUrl}'. You don't need to add it separately.`);
        } else if (originalInputDetails.domain === sanitizedDomain && originalInputDetails.subdomain && originalInputDetails.subdomain.toLowerCase() === 'www') {
          toast.error(`The domain '${sanitizedDomain}' (derived from your input '${formData.websiteUrl}') is already registered.`);
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
      toast.error('There was an issue validating your domain. Please try again.');
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
    console.log('group code called');
    try {
      if (issues && typeof issues === 'object') {
        issues.errors = groupByCodeUtil(issues.errors);
        issues.warnings = groupByCodeUtil(issues.warnings);
        issues.notices = groupByCodeUtil(issues.notices);
        
        // Count total issues
        const errorCount = Array.isArray(issues.errors) ? issues.errors.length : Object.keys(issues.errors || {}).length;
        const warningCount = Array.isArray(issues.warnings) ? issues.warnings.length : Object.keys(issues.warnings || {}).length;
        const noticeCount = Array.isArray(issues.notices) ? issues.notices.length : Object.keys(issues.notices || {}).length;
        
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
  });

  useEffect(() => {
    if (data) {
      const result = data.getAccessibilityReport;

      if(result){
        setScore(result?.score);
        groupByCode(result?.htmlcs);
      }
      // setSiteImg(data.getAccessibilityReport?.siteImg);
      // setScoreBackup(data.getAccessibilityReport.score);
      
    }
  }, [data]);

  // UseEffect for step 2 analysis
  useEffect(() => {
    if (currentStep === 2 && formData.websiteUrl) {
      // Execute accessibility analysis when entering step 2
      getAccessibilityStatsQuery();
      // Don't automatically advance - we'll wait for the query to complete
    }else if(currentStep === 2){
      // If website URL is not provided, skip step 2
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  // Add a separate effect to monitor query completion
  useEffect(() => {
    // If we're on step 2 and data has loaded (analysis is complete)
    if (currentStep === 2 && data && !analysisLoading) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, data, analysisLoading]);

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
  const [activeTab, setActiveTab] = useState("overview")
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
            if (sanitizedDomain !== 'localhost' && !isIpAddress(sanitizedDomain) && !isValidRootDomainFormat(sanitizedDomain)) {
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

  // Step 1: Basic Information
  const renderStep1 = () => {
    return (
      <div className='sm:px-6 md:px-16'>
        <div className="mb-4 w-full block">
          <label className="text-left font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block mb-[19px] uppercase">
            {t('Common.label.your_name')}
          </label>
          <FormControl>
            <Input
              type="text"
              placeholder={t('Common.placeholder.name')}
              name="name"
              ref={register}
              value={formData.name}
              onChange={handleInputChange}
            />
            {formErrors?.name?.message && (
              <ErrorText message={String(t(formErrors.name.message))} />
            )}
          </FormControl>
        </div>
        <div className="mb-4 w-full block">
          <label className="text-left font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block mb-[19px] uppercase">
            {t('Common.label.email')}
          </label>
          <FormControl>
            <Input
              type="email"
              placeholder={t('Common.placeholder.email')}
              name="email"
              ref={register}
              value={formData.email}
              onChange={handleInputChange}
            />
            {formErrors?.email?.message && (
              <ErrorText message={String(t(formErrors.email.message))} />
            )}
          </FormControl>
        </div>
        <div className="mb-4 w-full block">
          <label className="text-left font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block mb-[19px] uppercase">
            {t('Common.label.website_url')}
          </label>
          <FormControl>
            <Input
              type="url"
              placeholder="example.com"
              name="websiteUrl"
              ref={register}
              value={formData.websiteUrl}
              onChange={handleInputChange}
            />
            {formErrors?.websiteUrl?.message && (
              <ErrorText message={String(t(formErrors.websiteUrl.message))} />
            )}
          </FormControl>
        </div>
        <div className="mb-4 w-full block">
          <label className="text-left font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block mb-[19px] uppercase">
            {t('Common.label.password')}
          </label>
          <FormControl className="relative">
            <Input
              type={passwordVisible ? 'text' : 'password'}
              placeholder={t('Common.placeholder.password')}
              name="password"
              ref={register}
              value={formData.password}
              onChange={handleInputChange}
              className="pr-10"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-3.5 text-gray-500"
            >
              {passwordVisible ? <FaEyeSlash /> : <FaEye />}
            </button>
            {formErrors?.password?.message && (
              <ErrorText message={String(t(formErrors.password.message))} />
            )}
          </FormControl>
        </div>
        <div className="mb-4 w-full block">
          <label className="text-left font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block mb-[19px] uppercase">
            {t('Common.label.confirm_password')}
          </label>
          <FormControl className="relative">
            <Input
              type={confirmPasswordVisible ? 'text' : 'password'}
              placeholder={t('Common.placeholder.confirm_password')}
              name="passwordConfirmation"
              ref={register}
              value={formData.passwordConfirmation}
              onChange={handleInputChange}
              className="pr-10"
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="absolute right-3 top-3.5 text-gray-500"
            >
              {confirmPasswordVisible ? <FaEyeSlash /> : <FaEye />}
            </button>
            {formErrors?.passwordConfirmation?.message && (
              <ErrorText
                message={String(t(formErrors.passwordConfirmation.message))}
              />
            )}
          </FormControl>
        </div>
        <Button
          color="primary"
          type="button"
          className="w-full uppercase mt-[34px]"
          onClick={handleNextStep}
          disabled={checkingDomain || checkingEmail}
        >
          {checkingDomain || checkingEmail ? (
            <span className="flex items-center justify-center">
              <CircularProgress size={30} color={'inherit'} className="mr-2 " />
              Please Wait
            </span>
          ) : (
            t('Common.text.continue')
          )}
        </Button>
      </div>
    );
  };

  // Step 2: Website Analysis
  const renderStep2 = () => {
    return (
      <div className="text-center flex flex-col items-center justify-center">
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

        <div className="flex flex-col items-center gap-2">
          <p className="text-blue-600 text-left font-medium flex items-center">
            Scanning for accessibility issues
          </p>

          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-blue-600 rounded-full animate-progress"></div>
          </div>
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
          {formData?.websiteUrl && <WebAbilityWidget errorCount={errorCount} />}

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
          {isSubmitting || siteAdding ? (<span className="flex items-center justify-center">
              <CircularProgress size={30} color={'inherit'} className="mr-2 " />
              Please Wait
            </span>) : submitText}
        </Button>
      )}

      {apiError && (
        <ErrorText
          message={String(t(`Sign_up.error.${apiError}`))}
          position="center"
        />
      )}

      {currentStep === 1 && (
        <>
          <div className="sm:px-6 mt-4 md:px-0 text-[14px] leading-6 text-sapphire-blue">
            <Trans
              components={[
                <Link to="##" key="terms"></Link>,
                <Link to="##" key="privacy"></Link>,
                <Link to="##" key="security"></Link>,
              ]}
            >
              {t('Sign_up.text.footer_desc')}
            </Trans>
          </div>
          <SocialAuth />
          <div className="text-[14px] leading-6 text-sapphire-blue mt-[30px] text-center">
            <Trans components={[<Link to="/auth/signin"></Link>]}>
              {t('Sign_up.text.have_account')}
            </Trans>
          </div>
        </>
      )}

      {currentStep === 3 && (
        <div className="text-[14px] leading-6 text-sapphire-blue mt-[30px] text-center">
          <Trans components={[<Link to="/auth/signin"></Link>]}>
            {t('Sign_up.text.have_account')}
          </Trans>
        </div>
      )}
    </div>
  );
};

export default SignUpForm;
