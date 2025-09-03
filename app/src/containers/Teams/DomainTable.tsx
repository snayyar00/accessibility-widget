import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { FaTrash, FaCheck, FaTimes, FaCog } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';
import deleteSite from '@/queries/sites/deleteSite';
import updateSite from '@/queries/sites/updateSite';
import toggleSiteMonitoring from '@/queries/sites/toggleSiteMonitoring';
import isValidDomain from '@/utils/verifyDomain';
import ConfirmDeleteSiteModal from './DeleteWarningModal';
import { APP_SUMO_BUNDLE_NAMES } from '@/constants';
import getDomainStatus from '@/utils/getDomainStatus';
import applyStatusClass from '@/utils/applyStatusClass';
import ActivatePlanWarningModal from './ActivatePlanWarningModal';
import { getAuthenticationCookie } from '@/utils/cookie';

export interface Domain {
  id: number;
  url: string;
  expiredAt: string;
  status: string;
  trial: number;
  monitor_enabled?: boolean;
  monitor_priority?: number;
  last_monitor_check?: string;
  is_currently_down?: number;
  monitor_consecutive_fails?: number;
}

interface DomainTableProps {
  data: any;
  setReloadSites: (reload: boolean) => void;
  setPaymentView: (view: boolean) => void;
  openModal: () => void;
  setOptionalDomain: (domain: string) => void;
  customerData: any;
}

const DomainTable: React.FC<DomainTableProps> = ({
  data,
  setReloadSites,
  setPaymentView,
  openModal,
  setOptionalDomain,
  customerData,
}) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const { data: userData } = useSelector((state: RootState) => state.user);
  const [billingLoading, setBillingLoading] = useState(false);
  const [activePlan, setActivePlan] = useState('');
  const [isYearly, setIsYearly] = useState(false);
  const [planMetaData, setPlanMetaData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteSiteID, setDeleteSiteID] = useState(-1);
  const [deleteSiteStatus, setDeleteSiteStatus] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempDomain, setTempDomain] = useState('');
  const [expiryDays, setExpiryDays] = useState(-1);
  const selectedDomain = useRef<Domain | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  // Local state for monitoring toggles (temporary until DB is updated)
  const [monitoringStates, setMonitoringStates] = useState<{ [key: number]: boolean }>({});

  const [deleteSiteMutation] = useMutation(deleteSite, {
    onCompleted: (response) => {
      setReloadSites(true);
      if (response.deleteSite === 1) {
        toast.success('The domain was successfully deleted.');
      }
    },
    onError: () => {
      toast.error('There was an error while deleting the domain.');
    },
  });

  const [updateSiteMutation] = useMutation(updateSite, {
    onCompleted: (response) => {
      setReloadSites(true);
      if (response?.changeURL?.includes('Successfully')) {
        toast.success('The domain name was successfully updated.');
      }
    },
    onError: (error) => {
      toast.error(
        `There was an error while editing the domain name. ${error.message}`,
      );
    },
  });

  const [toggleMonitoringMutation] = useMutation(toggleSiteMonitoring, {
    onCompleted: () => {
      setReloadSites(true);
      toast.success('Monitoring settings updated successfully.');
    },
    onError: (error) => {
      toast.error(
        `Failed to update monitoring settings. ${error.message}`,
      );
    },
  });

  const handleDelete = async (
    id: number,
    status: string,
    cancelReason?: string,
    otherReason?: string,
  ) => {
    const index = domains.findIndex((domain) => domain.id === id);
    const foundUrl = domains[index].url;

    setBillingLoading(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/cancel-site-subscription`;
    const bodyData = {
      domainId: id,
      domainUrl: foundUrl,
      userId: userData.id,
      status: status,
      cancelReason: cancelReason,
      otherReason: otherReason,
    };

    const token = getAuthenticationCookie();

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          response.json().then(() => {
            toast.success('The domain was successfully removed');
            setBillingLoading(false);
            handleCloseModal();
            window.location.reload();
          });
        })
        .catch((error) => {
          setBillingLoading(false);
          handleCloseModal();
          toast.error('There has been a problem deleting the domain.');
          console.error('Error during fetch operation:', error);
        });
    } catch (error) {
      console.log('Delete error:', error);
    }
    setDomains(domains.filter((domain) => domain.id !== id));
  };

  const handleEdit = (domain: Domain) => {
    // toast.info('Warning: You can only edit up to 3 characters in the URL.', {
    //   position: 'top-center',
    // });
    setEditingId(domain.id);
    setTempDomain(domain.url);
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempDomain('');
  };

  const handleMonitoringToggle = async (siteId: number, currentValue: boolean) => {
    try {
      // Update local state immediately for visual feedback
      setMonitoringStates(prev => ({ ...prev, [siteId]: !currentValue }));
      
      await toggleMonitoringMutation({
        variables: { siteId, enabled: !currentValue },
      });
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      // Revert on error
      setMonitoringStates(prev => ({ ...prev, [siteId]: currentValue }));
    }
  };

  const handleSave = async (id: number) => {
    setEditLoading(true);

    if (!tempDomain) {
      toast.error('Domain name cannot be empty');
      setEditLoading(false);
      setEditingId(null);
      return;
    }

    const sanitizedDomain = tempDomain.replace(/^(https?:\/\/)?(www\.)?/, '');

    if (!isValidDomain(sanitizedDomain)) {
      toast.error('Please enter a valid domain name');
      setEditLoading(false);
      setEditingId(null);
      return;
    }

    // Duplicate check
    const isDuplicate = domains.some(
      (d) =>
        d.url.replace(/^(https?:\/\/)?(www\.)?/, '') === sanitizedDomain &&
        d.id !== id,
    );
    if (isDuplicate) {
      toast.error('This domain already exists');
      setEditLoading(false);
      setEditingId(null);
      return;
    }

    const response = await updateSiteMutation({
      variables: { siteId: editingId, url: sanitizedDomain },
    });
    if (response.errors) {
      toast.error(response.errors[0].message);
    } else {
      setReloadSites(true);
    }
    setEditLoading(false);
    setEditingId(null);
  };

  const [tierPlan, setTierPlan] = useState(false);
  const [appSumoDomains, setAppSumoDomain] = useState<string[]>([]);
  const [appSumoCount, setAppSumoCount] = useState(0);
  const [codeCount, setCodeCount] = useState(0);
  const [isStripeCustomer, setIsStripeCustomer] = useState(false);

  const handleSubscription = async (selectedDomain: Domain) => {
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
      domainId: selectedDomain.id,
      domainUrl: selectedDomain.url,
      userId: userData.id,
    };

    const token = getAuthenticationCookie();

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          response.json().then(() => {
            toast.success(
              'The domain was successfully added to your active plan',
            );
            setBillingLoading(false);
            window.location.reload();
          });
        })
        .catch((error) => {
          setBillingLoading(false);
          toast.error(
            'You have reached the maximum number of allowed domains for this plan',
          );
          console.error('Fetch operation error:', error);
        });
    } catch (error) {
      console.log('Subscription error:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCloseActivateModal = () => {
    setShowActivateModal(false);
  };

  const handleOpenActivateModal = (domain: Domain) => {
    setShowActivateModal(true);
    selectedDomain.current = domain;
  };

  useEffect(() => {
    if (data) {
      setDomains(data.getUserSites);
    }
  }, [data]);

  useEffect(() => {
    if (customerData) {
      if (customerData.submeta) {
        setPlanMetaData(customerData.submeta);
      }
      if (customerData.tierPlan && customerData.tierPlan == true) {
        setTierPlan(true);
      }
      if (customerData.subscriptions) {
        const appSumoDomains: any = [];
        let subs = JSON.parse(customerData.subscriptions);
        // console.log("subs = ",subs);
        ['monthly', 'yearly'].forEach((subscriptionType) => {
          // Loop over each subscription in the current type (monthly or yearly)
          subs[subscriptionType].forEach((subscription: any) => {
            const description = subscription.description;

            // Regex to extract domain name before '(' and promo codes
            const match = description?.match(/Plan for ([^(\s]+)\(/);

            if (match) {
              const domain = match[1]; // Extract domain name
              appSumoDomains.push(domain); // Save the domain name in the list
            }
          });
        });
        setAppSumoDomain(appSumoDomains);
        // setSubCount(subs.length);
      }
      if (customerData.isCustomer === true) {
        setActivePlan(customerData.plan_name);
        if (customerData.interval === 'yearly') {
          setIsYearly(true);
        }
      }
      if (customerData.expiry) {
        setExpiryDays(customerData.expiry);
      }
      if (customerData.appSumoCount) {
        setAppSumoCount(customerData.appSumoCount);
      }
      if (customerData.codeCount) {
        if(customerData.codeCount == 9999){
          setCodeCount(Infinity);
        }
        else{
          setCodeCount(customerData.codeCount * 2);
        }
      }
      if (customerData.isCustomer == true && customerData.card) {
        setIsStripeCustomer(true);
      }
    }
  }, [customerData]);

  return (
    <>
      <ConfirmDeleteSiteModal
        billingLoading={billingLoading}
        domainID={deleteSiteID}
        domainStatus={deleteSiteStatus}
        isOpen={showModal}
        onClose={handleCloseModal}
        onDelete={handleDelete}
        appSumoCount={customerData?.appSumoCount || 0}
      />

      <ActivatePlanWarningModal
        billingLoading={billingLoading}
        setBillingLoading={setBillingLoading}
        domain={selectedDomain.current}
        promoCode={appSumoCount <= codeCount ? [appSumoCount] : []}
        setReloadSites={setReloadSites}
        isOpen={showActivateModal}
        onClose={handleCloseActivateModal}
        isStripeCustomer={isStripeCustomer}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Domain Management</h2>
          <p className="text-gray-500 mt-2">Monitor and manage your website domains</p>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="py-5 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span>Domain</span>
                    </div>
                  </th>
                  <th className="py-5 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Plan</span>
                    </div>
                  </th>
                  <th className="py-5 px-6 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center space-x-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Monitor</span>
                    </div>
                  </th>
                  <th className="py-5 px-6 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center space-x-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Status</span>
                    </div>
                  </th>
                  <th className="py-5 px-6 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-end space-x-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                      <span>Actions</span>
                    </div>
                  </th>
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {domains.map((domain) => {
                const isEditing = editingId === domain.id;
                const domainStatus = getDomainStatus(
                  domain.url,
                  domain.expiredAt,
                  domain.trial,
                  appSumoDomains,
                );
                return (
                  <tr
                    key={domain.id}
                    className="group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-300"
                  >
                    <td className="py-5 px-6 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          aria-label="Edit domain URL"
                          className="border-2 border-gray-200 px-4 py-2 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          value={tempDomain}
                          onChange={(e) => setTempDomain(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                          {domain.url}
                        </div>
                      )}
                    </td>
                    <td className="py-5 px-6 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 ${applyStatusClass(
                          domain.url,
                          domain.expiredAt,
                          domain.trial,
                          appSumoDomains,
                        )}`}
                      >
                        <span className="relative flex h-2 w-2 mr-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            domainStatus === 'Life Time' ? 'bg-green-400' : 
                            domainStatus === 'Trial' ? 'bg-yellow-400' : 
                            'bg-blue-400'
                          }`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${
                            domainStatus === 'Life Time' ? 'bg-green-500' : 
                            domainStatus === 'Trial' ? 'bg-yellow-500' : 
                            'bg-blue-500'
                          }`}></span>
                        </span>
                        {domainStatus}
                        {domainStatus === 'Trial' && domain?.expiredAt && (
                          <span className="ml-1.5 opacity-75">
                            • {new Date(
                              Number.parseInt(domain.expiredAt),
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-5 px-6 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleMonitoringToggle(domain.id, monitoringStates[domain.id] ?? domain.monitor_enabled ?? false)}
                        role="switch"
                        aria-checked={(monitoringStates[domain.id] ?? domain.monitor_enabled) ?? false}
                        aria-label={`Toggle monitoring for ${domain.url}`}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                          (monitoringStates[domain.id] ?? domain.monitor_enabled)
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25'
                            : 'bg-gray-200 hover:bg-gray-300 focus:ring-gray-300'
                        }`}
                        disabled={isEditing}
                        title={(monitoringStates[domain.id] ?? domain.monitor_enabled) ? 'Monitoring is ON' : 'Monitoring is OFF'}
                      >
                        <span className="sr-only">
                          {(monitoringStates[domain.id] ?? domain.monitor_enabled) 
                            ? 'Monitoring is enabled' 
                            : 'Monitoring is disabled'}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                            (monitoringStates[domain.id] ?? domain.monitor_enabled)
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-5 px-6 whitespace-nowrap text-center">
                      {(monitoringStates[domain.id] ?? domain.monitor_enabled) ? (
                        domain.is_currently_down !== null && domain.is_currently_down !== undefined ? (
                          <div className="flex items-center justify-center">
                            {domain.is_currently_down === 0 ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200 shadow-sm">
                                <span className="relative flex h-2 w-2 mr-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Online
                              </span>
                            ) : domain.is_currently_down === 1 ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200 shadow-sm">
                                <span className="relative flex h-2 w-2 mr-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                Offline
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                                <svg className="animate-spin -ml-0.5 mr-2 h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Checking...
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                            <svg className="mr-2 h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Awaiting data
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400 italic">Monitor off</span>
                      )}
                    </td>
                    <td className="py-5 px-6 whitespace-nowrap text-right text-sm font-medium">
                      {isEditing ? (
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => handleSave(domain.id)}
                            className="inline-flex items-center p-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-4 focus:ring-green-500/20 transition-all duration-200 shadow-lg shadow-green-500/25"
                            disabled={editLoading}
                            title="Save changes"
                          >
                            {editLoading ? (
                              <CircularProgress size={16} />
                            ) : (
                              <FaCheck className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="inline-flex items-center p-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-500/20 transition-all duration-200 shadow-lg shadow-gray-500/25"
                            disabled={editLoading}
                            title="Cancel"
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end items-center gap-2">
                          {/* Conditionally show Activate/Buy button for non-active domains */}
                          {domainStatus === 'Trial' || domainStatus === 'Trial Expired' ? (
                            <>
                              {activePlan !== '' && tierPlan ? (
                                <button
                                  disabled={billingLoading}
                                  onClick={() => handleSubscription(domain)}
                                  type="button"
                                  aria-label={`Activate subscription for ${domain.url}`}
                                  className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg hover:from-green-100 hover:to-emerald-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {billingLoading ? 'Processing...' : 'Activate'}
                                </button>
                              ) : appSumoCount < codeCount ? (
                                <button
                                  onClick={() => handleOpenActivateModal(domain)}
                                  type="button"
                                  aria-label={`Open activation modal for ${domain.url}`}
                                  className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg hover:from-green-100 hover:to-emerald-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm"
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setPaymentView(true);
                                    openModal();
                                    setOptionalDomain(domain.url);
                                  }}
                                  type="button"
                                  aria-label={`Buy license for ${domain.url}`}
                                  className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg hover:from-green-100 hover:to-emerald-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm"
                                >
                                  Buy License
                                </button>
                              )}
                            </>
                          ) : null}
                          <button
                            onClick={() => handleEdit(domain)}
                            type="button"
                            aria-label={`Edit domain ${domain.url}`}
                            className="inline-flex items-center px-3 py-1.5 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200"
                            title="Edit domain"
                          >
                            <FaCog className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteSiteID(domain.id);
                              setDeleteSiteStatus(domainStatus);
                              setShowModal(true);
                            }}
                            type="button"
                            aria-label={`Delete domain ${domain.url}`}
                            className="inline-flex items-center px-3 py-1.5 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200"
                            title="Delete domain"
                          >
                            <FaTrash className="w-3.5 h-3.5 mr-1" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
        {/* Mobile Grid */}
        <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {domains.map((domain) => {
            const isEditing = editingId === domain.id;
            const domainStatus = getDomainStatus(
              domain.url,
              domain.expiredAt,
              domain.trial,
              appSumoDomains,
            );
            return (
              <div
                key={domain.id}
                className="bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-300 hover:scale-105"
              >
                <div className="p-4 border-b">
                  <div className="flex flex-wrap items-center justify-between">
                    {/* Container for the editable text */}
                    <div className="w-full md:w-auto flex-grow">
                      {isEditing ? (
                        <input
                          type="text"
                          className="border p-2 rounded bg-gray-100 text-lg font-medium w-full"
                          value={tempDomain}
                          onChange={(e) => setTempDomain(e.target.value)}
                        />
                      ) : (
                        <span className="text-lg font-medium">
                          {domain.url}
                        </span>
                      )}
                    </div>
                    {/* Status badge container */}
                    <div className="mt-2 md:mt-0">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${applyStatusClass(
                          domain.url,
                          domain.expiredAt,
                          domain.trial,
                          appSumoDomains,
                        )}`}
                      >
                        {domainStatus}
                        {domainStatus === 'Trial' && domain?.expiredAt && (
                          <span className="ml-1">
                            • {new Date(
                              Number.parseInt(domain.expiredAt),
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div className="p-4 bg-gray-50 flex justify-end items-center space-x-2">
                    <button
                      onClick={() => handleSave(domain.id)}
                      className="p-2 text-white text-center rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] transition duration-300 w-full"
                      disabled={editLoading}
                    >
                      {editLoading ? <CircularProgress size={18} /> : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-2 text-white text-center rounded-md bg-[#DC2626] hover:bg-[#B91C1C] transition duration-300 w-full"
                      disabled={editLoading}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Mobile actions split into two rows */}
                    <div className="p-4 bg-gray-50 flex justify-between items-center space-x-2 mb-2">
                      <button
                        onClick={() => handleEdit(domain)}
                        className="p-2 bg-[#2563EB] text-white rounded-md text-sm flex-1 flex items-center justify-center hover:bg-[#1D4ED8] transition-colors duration-200"
                      >
                        <FaCog className="mr-2" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteSiteID(domain.id);
                          setDeleteSiteStatus(domainStatus);
                          setShowModal(true);
                        }}
                        className="p-2 bg-[#1E40AF] text-white rounded-md text-sm flex-1 flex items-center justify-center hover:bg-[#1E3A8A] transition-colors duration-200"
                      >
                        <FaTrash className="mr-2" /> Delete
                      </button>
                    </div>
                    {domainStatus !== 'Active' &&
                      domainStatus != 'Life Time' &&
                      domainStatus !== 'Expiring' && (
                        <div className="p-4 bg-gray-100">
                          {activePlan !== '' && tierPlan ? (
                            <button
                              disabled={billingLoading}
                              onClick={() => handleSubscription(domain)}
                              type="submit"
                              className="p-2 bg-primary text-white rounded-md text-sm flex items-center justify-center hover:bg-[#1D4ED8] transition-colors duration-200"
                            >
                              {billingLoading ? 'Please Wait...' : 'Activate'}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setPaymentView(true);
                                openModal();
                                setOptionalDomain(domain.url);
                              }}
                              type="submit"
                              className="p-2 bg-green w-full text-white rounded-md text-sm flex items-center justify-center hover:bg-green-600 transition-colors duration-200"
                            >
                              Buy Plan
                            </button>
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default DomainTable;
