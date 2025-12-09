import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { parse } from 'tldts';
import BannerImage from '@/assets/images/WebAbility Hero3.png';
import SingleBannerImage from '@/assets/images/WebAbilityBanner.png';
import MySiteImage from '@/assets/images/my_site.png';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import { useMutation } from '@apollo/client';
import addSite from '@/queries/sites/addSite';
import { toast } from 'sonner';
import {
  getRootDomain,
  isValidRootDomainFormat,
  isIpAddress,
} from '@/utils/domainUtils';
import PlanSetting from '../SiteDetail/PlanSetting';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import useOrganizationName from '@/hooks/useOrganizationName';
import classNames from 'classnames';
import { APP_SUMO_BUNDLE_NAMES } from '@/constants';
import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  LinearProgress,
  Tab,
  Tabs,
} from '@mui/material';
import { FaCheckCircle, FaClock, FaCreditCard, FaUsers } from 'react-icons/fa';
import { handleBilling } from '../Profile/BillingPortalLink';
import { BarChart } from 'recharts';
import { MdBarChart } from 'react-icons/md';
import { FaCalendarDays } from 'react-icons/fa6';
import { useLocation } from 'react-router-dom';
import { getAuthenticationCookie } from '@/utils/cookie';

interface ModalProps {
  isOpen: boolean;
  paymentView: boolean;
  onClose: () => void;
  children: React.ReactNode;
  optionalDomain: any;
  isStripeCustomer: boolean;
  domainCount: number;
  closeModal: () => void;
}

interface DomainFormData {
  domainName: string;
}

const Modal: React.FC<ModalProps> = ({
  isStripeCustomer,
  isOpen,
  onClose,
  children,
  paymentView,
  optionalDomain,
  domainCount,
  closeModal,
}) => {
  if (!isOpen) return null;

  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50">
      <div className="modal-perfect-center w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar modal-container p-4">
        {/* Content */}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
};

export type TDomain = {
  id: string;
  url: string;
  __typename: string;
  trial?: number;
};

const TrialBannerAndModal: React.FC<any> = ({
  allDomains,
  setReloadSites,
  isModalOpen,
  closeModal,
  openModal,
  paymentView,
  setPaymentView,
  optionalDomain,
  customerData,
}: any) => {
  const { data: userData, loading: userLoading } = useSelector(
    (state: RootState) => state.user,
  );
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );
  const organizationName = useOrganizationName();
  const [isStripeCustomer, setIsStripeCustomer] = useState(false);
  const [activePlan, setActivePlan] = useState('');
  const [isYearly, setIsYearly] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [domainName, setDomainName] = useState(
    optionalDomain ? optionalDomain : '',
  );
  const [addedDomain, setAddedDomain] = useState<TDomain>({
    id: '',
    url: '',
    __typename: '',
  });
  const [domainCount, setDomainCount] = useState(0);
  const [cardTrial, setCardTrial] = useState(false);
  const [trialPlan, setTrialPlan] = useState(false);
  const [planMetaData, setPlanMetaData] = useState<any>({});
  const [expiryDays, setExpiryDays] = useState(-1);
  const [noPlan, setNoPlan] = useState(false);
  const [portalClick, setPortalClick] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const { search } = useLocation();
  const trialReload = useRef(false);
  const isMountedRef = useRef(true);

  const showPaymentModal = async () => {
    const sanitizedDomain = getRootDomain(formData.domainName);
    const lowerDomain = formData.domainName.toLowerCase().trim();
    const isUsComSubdomain = lowerDomain.endsWith('.us.com') && lowerDomain !== 'us.com';
    // For *.us.com subdomains, preserve the full domain; otherwise use root domain
    const effectiveDomain = isUsComSubdomain 
      ? lowerDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split(/[\/?#]/)[0]
      : sanitizedDomain;
    const isUsComDomain = sanitizedDomain === 'us.com' || formData.domainName.toLowerCase().endsWith('.us.com');
    if (
      sanitizedDomain !== 'localhost' &&
      !isIpAddress(sanitizedDomain) &&
      !isValidRootDomainFormat(sanitizedDomain) &&
      !isUsComDomain
    ) {
      toast.error('You must enter a valid domain name!');
      return;
    }
    const response = await addSiteMutation({
      variables: { url: effectiveDomain },
    });
    if (response.errors) {
      try {
        const originalInputDetails = parse(formData.domainName);
        if (
          originalInputDetails.domain === sanitizedDomain &&
          originalInputDetails.subdomain &&
          originalInputDetails.subdomain.toLowerCase() !== 'www'
        ) {
          toast.error(
            `The root domain '${sanitizedDomain}' is already registered. This covers subdomains like '${formData.domainName}'. You don't need to add it separately.`,
          );
        } else if (
          originalInputDetails.domain === sanitizedDomain &&
          originalInputDetails.subdomain &&
          originalInputDetails.subdomain.toLowerCase() === 'www'
        ) {
          toast.error(
            `The domain '${sanitizedDomain}' (derived from your input '${formData.domainName}') is already registered.`,
          );
        } else {
          toast.error(`The domain '${sanitizedDomain}' is already in use.`);
        }
      } catch (parseError) {
        console.error('Error parsing domain name:', parseError);
        toast.error(`The domain '${sanitizedDomain}' is already in use.`);
      }
    } else {
      toast.success(`The domain was successfully added. Please Wait`);

      // Quick Fix not permanent
      if (window.location.pathname == '/dashboard') {
        window.location.href = '/add-domain';
      }
      setDomainName(effectiveDomain);
      setBillingLoading(true);
    }
  };

  // useEffect(() => {
  //   const params = new URLSearchParams(search);
  //   if (params.get('open-modal') === 'true') {
  //     openModal();
  //     params.delete('open-modal');
  //     const newSearch = params.toString();
  //     const newUrl =
  //       window.location.pathname + (newSearch ? '?' + newSearch : '');
  //     window.history.replaceState(null, '', newUrl);
  //   }
  // }, [search]);

  const [subMonthlyCount, setSubMonthlyCount] = useState(0);
  const [subYearlyCount, setSubYearlyCount] = useState(0);

  const [trialMonthlyCount, setTrialMonthlyCount] = useState(0);
  const [trialYearlyCount, setTrialYearlyCount] = useState(0);

  const [tierPlan, setTierPlan] = useState(false);
  const [appSumoCount, setAppSumoCount] = useState(0);
  const [appSumoActive, setAppSumoActive] = useState(0);

  useEffect(() => {
    if (customerData) {
      if (customerData.isCustomer == true) {
        // console.log(customerData);
        if (customerData.tierPlan && customerData.tierPlan == true) {
          setTierPlan(true);
        }
        if (customerData.subscriptions) {
          try {
            const subs = JSON.parse(customerData.subscriptions);
            // console.log("subs = ",subs);
            setSubMonthlyCount(subs.monthly.length);
            setSubYearlyCount(subs.yearly.length);
            // setSubCount(subs.length);
          } catch (parseError) {
            console.error('Error parsing subscriptions:', parseError);
            setSubMonthlyCount(0);
            setSubYearlyCount(0);
          }
        }

        if (customerData.trial_subs) {
          try {
            const trials = JSON.parse(customerData.trial_subs);
            // console.log("trials =",trials);
            setTrialMonthlyCount(
              (prevCount) => prevCount + trials.monthly.length,
            );
            setTrialYearlyCount(trials.yearly.length);
            // setTrialsCount(trials.length);
          } catch (parseError) {
            console.error('Error parsing trial subscriptions:', parseError);
          }
        }

        setIsStripeCustomer(true);
        setActivePlan(customerData.plan_name);
        if (customerData.plan_name == '') {
          setNoPlan(true);
        }

        if (customerData.interval == 'yearly') {
          setIsYearly(true);
        }
        if (customerData.expiry) {
          setTrialPlan(true);
          setExpiryDays(customerData.expiry);
        }
        if (customerData.submeta) {
          setPlanMetaData(customerData.submeta);
        }
        if (customerData.appSumoCount) {
          setAppSumoActive(customerData.appSumoCount);
        }
        if (customerData.codeCount) {
          setAppSumoCount(customerData.codeCount * 2);
        }

        if (customerData.infinityToken) {
          setAppSumoCount(Infinity);
        }
      } else {
        setNoPlan(true);
      }
    }
  }, [customerData]);

  let maxSites = appSumoCount * 2 || 2;

  const handleSubscription = useCallback(async () => {
    setBillingLoading(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/create-subscription`;
    const bodyData = {
      email: userData.email,
      returnURL: window.location.href,
      planName: activePlan.toLowerCase(),
      billingInterval:
        !isYearly || APP_SUMO_BUNDLE_NAMES.includes(activePlan.toLowerCase())
          ? 'MONTHLY'
          : 'YEARLY',
      domainId: addedDomain.id,
      domainUrl: addedDomain.url,
      userId: userData.id,
    };
    const token = getAuthenticationCookie();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      if (isMountedRef.current) {
        toast.success('The domain was successfully added to your active plan');
        setBillingLoading(false);
        closeModal();
        setPaymentView(false);
        window.location.reload();
      }
    } catch (error) {
      // Handle error
      if (isMountedRef.current) {
        toast.error(
          'You have reached the maximum number of allowed domains for this plan',
        );
        console.error('There was a problem with the fetch operation:', error);
        setBillingLoading(false);
        setPaymentView(false);
        closeModal();
      }
    }
  }, [activePlan, isYearly, addedDomain, userData, closeModal, setPaymentView]);

  const handleSubscriptionAndRedirect = useCallback(async () => {
    try {
      await handleSubscription();
      if (isMountedRef.current) {
        window.location.href = '/add-domain';
      }
    } catch (error) {
      console.error('Error handling subscription:', error);
      if (isMountedRef.current) {
        toast.error('There was an error processing your subscription');
      }
    }
  }, [handleSubscription]);

  useEffect(() => {
    if (addedDomain?.url !== '' && paymentView !== true) {
      if (activePlan !== '' && tierPlan) {
        handleSubscriptionAndRedirect();
      } else {
        setPaymentView(true);
      }
    }
  }, [
    addedDomain,
    paymentView,
    activePlan,
    tierPlan,
    handleSubscriptionAndRedirect,
  ]);

  useEffect(() => {
    if (allDomains) {
      if (domainName) {
        const newdomain = allDomains.getUserSites.filter(
          (site: any) => site.url == domainName,
        )[0];
        setDomainCount(allDomains.getUserSites.length);
        if (newdomain) {
          setAddedDomain(newdomain);
        }
      }
      let trialSites = 0;
      for (let site of allDomains?.getUserSites) {
        if (site?.trial == 1) {
          trialSites++;
        }
      }

      setTrialMonthlyCount(trialSites);
    }
  }, [allDomains]);

  useEffect(() => {
    if (allDomains) {
      const newdomain = allDomains.getUserSites.filter(
        (site: any) => site.url == optionalDomain,
      )[0];
      setDomainCount(allDomains.getUserSites.length);
      if (newdomain) {
        setAddedDomain(newdomain);
      }
    }
  }, [optionalDomain]);

  const upgradeAppSumo = async () => {
    if (promoCode.length <= 2) {
      toast.error('Invalid promo');
      return;
    }
    setPortalClick(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/upgrade-appsumo-subscription`;
    const bodyData = {
      email: userData.email,
      planName: activePlan.toLowerCase(),
      userId: userData.id,
      promoCode: promoCode,
    };

    const token = getAuthenticationCookie();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      toast.success('Your Plan has been updated');
      setTimeout(() => {
        setPortalClick(false);
        window.location.reload();
      }, 2000);
    } catch (error) {
      // Handle error
      toast.error(
        'There was an error updating your plan, please try again later',
      );
      console.error('There was a problem with the fetch operation:', error);
      setPortalClick(false);
    }
  };

  useEffect(() => {
    if (cardTrial == true) {
      showPaymentModal();
    }
  }, [cardTrial]);

  // Cleanup effect to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [formData, setFormData] = useState<DomainFormData>({ domainName: '' });

  const [addSiteMutation, { error: addSiteError, loading: addSiteLoading }] =
    useMutation(addSite, {
      onCompleted: () => {
        setReloadSites(true);
      },
      onError: () => {
        setReloadSites(true);
      },
    });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const sanitizedDomain = getRootDomain(formData.domainName);
    const lowerDomain = formData.domainName.toLowerCase().trim();
    const isUsComSubdomain = lowerDomain.endsWith('.us.com') && lowerDomain !== 'us.com';
    // For *.us.com subdomains, preserve the full domain; otherwise use root domain
    const effectiveDomain = isUsComSubdomain 
      ? lowerDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split(/[\/?#]/)[0]
      : sanitizedDomain;
    const isUsComDomain = sanitizedDomain === 'us.com' || lowerDomain.endsWith('.us.com');
    // Only bypass validation for *.us.com subdomains, validate all other domains normally
    if (
      sanitizedDomain !== 'localhost' &&
      !isIpAddress(sanitizedDomain) &&
      !isValidRootDomainFormat(sanitizedDomain) &&
      !isUsComDomain
    ) {
      toast.error('You must enter a valid domain name!');
      return;
    }

    try {
      const response = await addSiteMutation({
        variables: { url: effectiveDomain },
      });

      if (response.errors) {
        try {
          const originalInputDetails = parse(formData.domainName);
          if (
            originalInputDetails.domain === sanitizedDomain &&
            originalInputDetails.subdomain &&
            originalInputDetails.subdomain.toLowerCase() !== 'www'
          ) {
            toast.error(
              `The root domain '${sanitizedDomain}' is already registered. This covers subdomains like '${formData.domainName}'. You don't need to add it separately.`,
            );
          } else if (
            originalInputDetails.domain === sanitizedDomain &&
            originalInputDetails.subdomain &&
            originalInputDetails.subdomain.toLowerCase() === 'www'
          ) {
            toast.error(
              `The domain '${sanitizedDomain}' (derived from your input '${formData.domainName}') is already registered.`,
            );
          } else {
            toast.error(`The domain '${sanitizedDomain}' is already in use.`);
          }
        } catch (parseError) {
          console.error('Error parsing domain name:', parseError);
          toast.error(`The domain '${sanitizedDomain}' is already in use.`);
        }
      } else {
        toast.success('The domain was added successfully. Please Wait');
        if (trialReload.current == true) {
          window.location.reload();
        }
        // window.location.href = '/add-domain';
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('There was an error adding the domain. Please try again.');
    }
  };

  const [tabValue, setTabValue] = useState('monthly');

  // Sample data - replace with your actual data
  const subscriptionData = {
    monthly: {
      active: subMonthlyCount,
      trial: trialMonthlyCount,
    },
    yearly: {
      active: subYearlyCount,
      trial: trialYearlyCount,
    },
  };

  const totalActive =
    subscriptionData.monthly.active +
    subscriptionData.yearly.active +
    subscriptionData.monthly.trial +
    subscriptionData.yearly.trial;

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };
  return (
    <>
      <div>
        <Modal
          isStripeCustomer={isStripeCustomer}
          isOpen={isModalOpen}
          onClose={closeModal}
          paymentView={paymentView}
          optionalDomain={optionalDomain}
          domainCount={domainCount}
          closeModal={closeModal}
        >
          {paymentView ? (
            <PlanSetting
              key={domainName}
              domain={addedDomain}
              setReloadSites={setReloadSites}
              cardTrial={cardTrial}
              customerData={customerData}
            />
          ) : (
            <div className="px-4 md:px-6 lg:px-8 py-3 md:py-4 flex flex-col bg-white rounded-lg shadow-lg sm:min-h-screen sm:max-h-screen md:min-h-0 sm:overflow-y-auto no-scrollbar relative w-full">
              {/* Close button - visible on all screen sizes */}
              <button
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl hover:bg-gray-100 transition-colors duration-200 p-1 rounded-full z-10"
                onClick={closeModal}
              >
                ×
              </button>
              <div className="flex flex-col gap-3 sm:flex-none md:flex-1 sm:overflow-visible md:overflow-hidden">
                {/* Logo Section */}
                <div className="flex justify-center mb-4">
                  {organization?.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name || 'Organization logo'}
                      className="h-7 sm:h-7 md:h-10 lg:h-12 object-contain"
                      style={{ maxWidth: '100%', maxHeight: '48px' }}
                    />
                  ) : (
                    <LogoIcon className="w-26 h-7 sm:w-26 sm:h-7 md:w-40 md:h-10 lg:w-48 lg:h-12" />
                  )}
                </div>

                <div className="space-y-2 lg:pt-4">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                    Make your business accessible today!
                  </h1>
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                    Streamline web accessibility with {organizationName}Widget, the #1
                    web accessibility, WCAG and ADA compliance solution.
                  </p>
                </div>

                {/* Domain Input Section */}
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">
                    Your Domain
                  </h2>
                  <div className="relative">
                    <input
                      type="text"
                      id="domainName"
                      name="domainName"
                      placeholder="example.com"
                      value={formData.domainName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-3 text-base border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 placeholder-gray-400 bg-gray-50 hover:bg-white focus:bg-white"
                      form="bannerForm"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Please add only the root domain. We will manage the
                    subdomains on our end.
                  </p>
                </div>

                <div className="sm:flex-none md:flex-1 sm:overflow-visible md:overflow-y-auto sm:overflow-y-auto no-scrollbar">
                  <form
                    id="bannerForm"
                    onSubmit={handleSubmit}
                    className="space-y-3"
                  >
                    {/* Trial Options */}
                    <div className="space-y-3">
                      <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3">
                        Choose Your Trial Option
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                        <button
                          type="button"
                          className="group relative p-3 md:p-4 text-left border-2 border-blue-300 rounded-xl bg-gradient-to-br from-blue-50 to-white hover:from-blue-100 hover:to-blue-50 transition-all duration-300 hover:border-blue-400 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => {
                            if (
                              !formData.domainName ||
                              formData.domainName.trim() === ''
                            ) {
                              toast.error('Please enter a domain name first!');
                              return;
                            }
                            setCardTrial(true);
                          }}
                          disabled={
                            addSiteLoading ||
                            billingLoading ||
                            !formData.domainName
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                30 Day Trial
                              </h4>
                              <p className="text-xs text-gray-600">
                                Requires credit card
                              </p>
                            </div>
                          </div>
                          {addSiteLoading || billingLoading ? (
                            <div className="mt-2 text-center">
                              <div className="inline-flex items-center text-blue-600 text-xs">
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-600"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Please Wait...
                              </div>
                            </div>
                          ) : null}
                        </button>

                        <button
                          disabled={
                            addSiteLoading ||
                            billingLoading ||
                            !formData.domainName
                          }
                          type="submit"
                          onClick={() => {
                            if (
                              !formData.domainName ||
                              formData.domainName.trim() === ''
                            ) {
                              toast.error('Please enter a domain name first!');
                              return;
                            }
                            trialReload.current = true;
                          }}
                          className="group relative p-3 md:p-4 text-left border-2 border-blue-300 rounded-xl bg-gradient-to-br from-blue-50 to-white hover:from-blue-100 hover:to-blue-50 transition-all duration-300 hover:border-blue-400 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                15 Day Trial
                              </h4>
                              <p className="text-xs text-gray-600">
                                No credit card required
                              </p>
                            </div>
                          </div>
                          {addSiteLoading || billingLoading ? (
                            <div className="mt-2 text-center">
                              <div className="inline-flex items-center text-blue-600 text-xs">
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-600"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Please Wait...
                              </div>
                            </div>
                          ) : null}
                        </button>
                      </div>
                    </div>

                    {/* Skip Trial Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        className="w-full py-2 md:py-3 px-3 md:px-4 text-white text-sm md:text-base font-semibold text-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        onClick={() => {
                          if (
                            !formData.domainName ||
                            formData.domainName.trim() === ''
                          ) {
                            toast.error('Please enter a domain name first!');
                            return;
                          }
                          showPaymentModal();
                        }}
                        disabled={
                          addSiteLoading ||
                          billingLoading ||
                          !formData.domainName
                        }
                      >
                        {addSiteLoading || billingLoading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Please Wait...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            Skip trial & buy
                          </div>
                        )}
                      </button>
                    </div>

                    {/* AppSumo User Notice */}
                    <div className="relative mt-3 p-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg shadow-md border border-yellow-300 overflow-hidden">
                      {/* Background decoration */}
                      <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 bg-yellow-300 rounded-full opacity-20"></div>
                      <div className="absolute top-0 right-0 w-10 h-10 -mr-5 -mt-5 bg-yellow-200 rounded-full opacity-30"></div>

                      <div className="relative z-10">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center shadow-md">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-gray-900 mb-1">
                              🎉 AppSumo Customers
                            </h3>
                            <p className="text-gray-800 text-xs leading-relaxed">
                              Click "Skip trial & buy" to enter your coupon
                              code.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
      <>
        {/* Mobile View (visible on small screens only) */}
        <div className="hidden">
          <div
            className="text-white rounded-lg flex flex-col w-full overflow-hidden relative bg-no-repeat bg-cover bg-center min-h-[160px] sm:min-h-[180px]"
            style={{
              backgroundImage: `url(${MySiteImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Background Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-blue-600/20"></div>

            {/* Text & Button Section */}
            <div className="flex flex-col p-4 flex-1 relative z-10">
              <div className="flex justify-between items-center">
                <h1 className="text-lg font-semibold">
                  Experience {organizationName} PRO free for 7 days
                </h1>
              </div>
              <button
                className="mt-auto py-3 px-6 text-black font-semibold rounded-xl hover:bg-gray-200 transition duration-300 shadow-lg w-full"
                style={{
                  backgroundColor: '#BDC3E4',
                  border: '1px solid #A2ADF3',
                }}
                onClick={openModal}
              >
                <span className="font-medium">Add a domain</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop / Large Screen View (old design) */}
        <div className="flex flex-col lg:flex-row lg:space-x-6 py-4 h-full w-full">
          {noPlan ? (
            <div className="w-full mb-6 flex">
              <div
                className="add-domain-banner w-full grid grid-cols-1 lg:grid-cols-12 text-white rounded-xl overflow-hidden relative bg-no-repeat bg-cover bg-center min-h-[200px] md:min-h-[220px] lg:min-h-[240px]"
                style={{
                  backgroundImage: `url(${MySiteImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                }}
              >
                {/* Background Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-blue-600/20"></div>

                {/* Content */}
                <div className="col-span-full pt-4 px-4 lg:px-6 flex flex-col justify-center relative z-10">
                  <h1 className="text-2xl lg:text-3xl xxl:text-4xl mb-12  leading-tight">
                    Experience {organizationName} PRO free for 7 days
                  </h1>

                  {/* Action Buttons */}
                  <div className="flex gap-4 mb-2">
                    <button
                      className="py-3 px-6 text-black font-semibold rounded-xl hover:bg-gray-200 transition duration-300 shadow-lg"
                      style={{
                        backgroundColor: '#BDC3E4',
                        border: '1px solid #A2ADF3',
                      }}
                      onClick={openModal}
                    >
                      Add a domain
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Left Side (Accessibility Banner) */}
              <div className="w-full lg:w-1/2 mb-6 lg:mb-0 flex">
                <div
                  className="w-full grid grid-cols-1 lg:grid-cols-12 text-white rounded-xl overflow-hidden relative bg-no-repeat bg-cover bg-center min-h-[180px] md:min-h-[200px] lg:min-h-[220px]"
                  style={{
                    backgroundImage: `url(${MySiteImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {/* Background Overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-blue-600/20"></div>

                  {/* Content */}
                  <div className="col-span-full pt-2 px-4 flex flex-col justify-center relative z-10">
                    <h1 className="text-2xl mb-4 xxl:text-4xl">
                      Experience {organizationName} PRO free for 7 days
                    </h1>
                  </div>

                  {/* Full-Width Button */}
                  <div className="col-span-full mb-4 flex justify-start items-center relative z-10">
                    <button
                      className="py-3 px-6 text-black font-semibold rounded-xl hover:bg-gray-200 transition duration-300 shadow-lg mx-4 w-auto"
                      style={{
                        backgroundColor: '#BDC3E4',
                        border: '1px solid #A2ADF3',
                      }}
                      onClick={openModal}
                    >
                      <span className="font-medium">Add a domain</span>
                    </button>
                  </div>
                </div>
              </div>

              {!tierPlan ? (
                <div className="w-full lg:w-1/2 flex">
                  {activePlan && planMetaData ? (
                    <Card className="w-full shadow-md hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-gray-100 !rounded-xl overflow-hidden">
                      <CardHeader
                        title={
                          <div className="flex justify-between items-center">
                            <div className="text-2xl font-semibold text-primary flex items-center gap-2">
                              <MdBarChart className="text-primary h-6 w-6" />
                              {appSumoCount == Infinity
                                ? 'Agency Unlimited Plan'
                                : appSumoCount >= 50
                                ? 'Agency Starter Plan'
                                : appSumoCount >= 100
                                ? 'Agency Growth Plan'
                                : 'Subscription Details'}
                              {/* Subscription Details */}
                            </div>

                            {appSumoCount ? null : (
                              <button
                                disabled={portalClick}
                                onClick={() => {
                                  handleBilling(
                                    setPortalClick,
                                    userData?.email,
                                  );
                                }}
                                className="my-2 rounded-lg px-5 py-[10.5px] outline-none font-medium text-[16px] leading-[19px] text-center border border-solid cursor-pointer border-light-primary bg-primary text-white"
                              >
                                {portalClick ? (
                                  <CircularProgress
                                    sx={{ color: 'white' }}
                                    size={20}
                                    className="m-auto"
                                  />
                                ) : (
                                  'Handle Billing'
                                )}
                              </button>
                            )}
                          </div>
                        }
                        className="pb-2 px-6 pt-6"
                      />

                      <CardContent className="p-6">
                        <Card className="flex items-center justify-between mb-6  p-4 bg-white rounded-lg">
                          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-3 w-full text-left px-5">
                            {/* card 1 */}
                            <div className="w-full md:w-auto text-center md:text-left">
                              <div className="bg-blue-50 p-3 rounded-full flex justify-center">
                                <FaUsers className="h-6 w-6 text-sapphire-blue" />
                              </div>
                              <div>
                                <p className="text-sm text-sapphire-blue">
                                  Total Active Sites
                                </p>
                                <p className="text-2xl font-bold text-sapphire-blue text-center">
                                  {totalActive}
                                </p>
                              </div>
                            </div>

                            {/* card 2 */}
                            {appSumoCount > 0 && (
                              <div className="w-full md:w-auto text-center md:text-left">
                                <div className="bg-blue-50 p-3 rounded-full flex justify-center">
                                  <FaUsers className="h-6 w-6 text-[#ffbc00]" />
                                </div>
                                <div>
                                  <p className="text-sm text-[#ffbc00]">
                                    {appSumoCount == Infinity
                                      ? 'Infinite Sites'
                                      : maxSites >= 50
                                      ? 'Agency Sites'
                                      : 'App Sumo Sites'}
                                  </p>
                                  <p className="text-2xl font-bold text-[#ffbc00] text-center">
                                    {appSumoActive}/
                                    {appSumoCount == Infinity
                                      ? '∞'
                                      : appSumoCount}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                        <div className="w-full">
                          <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            variant="fullWidth"
                            className="mb-4"
                            TabIndicatorProps={{
                              style: { display: 'none' },
                            }}
                            sx={{
                              '& .MuiTabs-flexContainer': {
                                borderRadius: '0.5rem',
                                backgroundColor: 'rgb(243 244 246)',
                                padding: '0.25rem',
                              },
                              '& .Mui-selected': {
                                backgroundColor: 'white',
                                borderRadius: '0.375rem',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                color: '#242f57',
                              },
                              '& .MuiTab-root': {
                                textTransform: 'none',
                                minHeight: '2.5rem',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                              },
                            }}
                          >
                            <Tab
                              value="monthly"
                              label={
                                <div className="flex items-center gap-1">
                                  <FaCalendarDays className="h-4 w-4" />
                                  <span>Monthly Billing</span>
                                </div>
                              }
                            />
                            <Tab
                              value="yearly"
                              label={
                                <div className="flex items-center gap-1">
                                  <FaCalendarDays className="h-4 w-4" />
                                  <span>Yearly Billing</span>
                                </div>
                              }
                            />
                          </Tabs>

                          <div
                            className={
                              tabValue === 'monthly' ? 'block' : 'hidden'
                            }
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Fixed height cards */}
                              <Card className="bg-white rounded-lg h-[120px] flex flex-col">
                                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-medium flex items-center gap-1 text-sapphire-blue">
                                      <FaCreditCard className="h-4 w-4 text-sapphire-blue" />
                                      Active Sites
                                    </h3>
                                    <Chip
                                      label={subscriptionData.monthly.active}
                                      size="small"
                                      className="bg-blue-100 text-blue-800 min-w-[32px] h-[24px]"
                                    />
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2 mt-auto mb-2">
                                    <div
                                      className="bg-primary h-2 rounded-full"
                                      style={{
                                        width: `${
                                          (subscriptionData.monthly.active /
                                            totalActive) *
                                          100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white rounded-lg h-[120px] flex flex-col">
                                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-medium flex items-center gap-1 text-sapphire-blue">
                                      <FaClock className="h-4 w-4 text-amber-500" />
                                      Trial Sites
                                    </h3>
                                    <Chip
                                      label={subscriptionData.monthly.trial}
                                      size="small"
                                      variant="outlined"
                                      className="bg-light-primary text-amber-700 border-amber-200 min-w-[32px] h-[24px]"
                                    />
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2 mt-auto mb-2">
                                    <div
                                      className="bg-primary h-2 rounded-full"
                                      style={{
                                        width: `${
                                          (subscriptionData.monthly.trial /
                                            totalActive) *
                                          100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          <div
                            className={
                              tabValue === 'yearly' ? 'block' : 'hidden'
                            }
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Fixed height cards */}
                              <Card className="bg-white rounded-lg h-[120px] flex flex-col">
                                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-medium flex items-center gap-1 text-sapphire-blue">
                                      <FaCreditCard className="h-4 w-4 text-sapphire-blue" />
                                      Active Sites
                                    </h3>
                                    <Chip
                                      label={subscriptionData.yearly.active}
                                      size="small"
                                      className="bg-blue-100 text-blue-800 min-w-[32px] h-[24px]"
                                    />
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2 mt-auto mb-2">
                                    <div
                                      className="bg-primary h-2 rounded-full"
                                      style={{
                                        width: `${
                                          (subscriptionData.yearly.active /
                                            totalActive) *
                                          100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white rounded-lg h-[120px] flex flex-col">
                                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-medium flex items-center gap-1 text-sapphire-blue">
                                      <FaClock className="h-4 w-4 text-amber-500" />
                                      Trial Sites
                                    </h3>
                                    <Chip
                                      label={subscriptionData.yearly.trial}
                                      size="small"
                                      variant="outlined"
                                      className="bg-light-primary text-amber-700 border-amber-200 min-w-[32px] h-[24px]"
                                    />
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2 mt-auto mb-2">
                                    <div
                                      className="bg-primary h-2 rounded-full"
                                      style={{
                                        width: `${
                                          (subscriptionData.yearly.trial /
                                            totalActive) *
                                          100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex justify-center items-center w-full rounded-xl bg-background">
                      <CircularProgress size={100} className="m-auto" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full lg:w-1/2 flex">
                  {activePlan && planMetaData ? (
                    <Card className="w-full shadow-md hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-secondary/10 !rounded-xl flex flex-col overflow-hidden">
                      <CardContent className="p-6 flex flex-col flex-grow">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                          <div>
                            <h2 className="text-2xl font-semibold text-primary">
                              Subscription Details
                            </h2>
                            <p className="text-muted-foreground mt-1">
                              You are subscribed to the{' '}
                              <span className="font-bold text-black uppercase">
                                {activePlan}
                                {expiryDays > 0 ? ` (Trial)` : null}
                              </span>
                            </p>

                            {expiryDays > 0 && (
                              <h2 className="text-lg font-semibold text-primary">
                                Days Remaining: {expiryDays} Days
                              </h2>
                            )}

                            <button
                              disabled={portalClick}
                              onClick={() => {
                                handleBilling(setPortalClick, userData?.email);
                              }}
                              className="my-2 rounded-lg px-5 py-[10.5px] outline-none font-medium text-[16px] leading-[19px] text-center border border-solid cursor-pointer border-light-primary bg-primary text-white"
                            >
                              {portalClick ? (
                                <CircularProgress
                                  sx={{ color: 'white' }}
                                  size={20}
                                  className="m-auto"
                                />
                              ) : (
                                'Handle Billing'
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-medium mb-2 text-primary">
                            Domain Usage
                          </h3>
                          <LinearProgress
                            value={
                              (Number(planMetaData.usedDomains) /
                                Number(planMetaData.maxDomains)) *
                              100
                            }
                            variant="determinate"
                            className="h-2 mb-2"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            {planMetaData.usedDomains ? (
                              <>
                                <span className="font-medium">
                                  {planMetaData.usedDomains} used
                                </span>
                                <span>{planMetaData.maxDomains} total</span>
                              </>
                            ) : (
                              <span className="font-medium">
                                No Domains Added to Plan
                              </span>
                            )}
                          </div>
                        </div>
                        {APP_SUMO_BUNDLE_NAMES.slice(0, -1).includes(
                          activePlan.toLowerCase(),
                        ) ? (
                          <div className="flex my-4 items-center">
                            <input
                              type="text"
                              value={promoCode}
                              placeholder="Coupon Code"
                              onChange={(e) => setPromoCode(e.target.value)}
                              className="p-[10px] py-[11.6px] bg-light-gray border border-solid border-white-blue rounded-[10px] text-[16px] leading-[19px] text-white-gray w-full box-border"
                            />

                            <button
                              disabled={portalClick}
                              type="button"
                              onClick={upgradeAppSumo}
                              className=" bg-primary flex justify-center py-[10.9px] px-3 text-white rounded-lg w-40 mx-3"
                            >
                              {portalClick ? (
                                <CircularProgress
                                  sx={{ color: 'white' }}
                                  size={20}
                                />
                              ) : (
                                'Apply'
                              )}
                            </button>
                          </div>
                        ) : null}
                        <div className="mt-auto p-4 bg-[#f5f7fb] rounded-lg hover:bg-secondary/30 transition-colors duration-300">
                          <h4 className="text-md font-semibold text-secondary-foreground mb-2">
                            Upgrade your plan
                          </h4>
                          <p className="text-sm text-secondary-foreground/80">
                            {APP_SUMO_BUNDLE_NAMES.slice(0, -1).includes(
                              activePlan.toLowerCase(),
                            )
                              ? 'If you redeemed additional codes from App Sumo Enter the received promocodes above to upgrade your plan.'
                              : 'Need more domains? Upgrade now for additional features and increased limits.'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex justify-center items-center w-full rounded-xl bg-background">
                      <CircularProgress size={100} className="m-auto" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </>
    </>
  );
};

export default TrialBannerAndModal;
