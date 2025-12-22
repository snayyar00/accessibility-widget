import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import getSites from '@/queries/sites/getSites';
import { FaTrash, FaCheck, FaTimes, FaPencilAlt, FaCog } from 'react-icons/fa';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { CircularProgress, Tooltip, Chip } from '@mui/material';
import deleteSite from '@/queries/sites/deleteSite';
import updateSite from '@/queries/sites/updateSite';
import toggleSiteMonitoring from '@/queries/sites/toggleSiteMonitoring';
import isValidDomain from '@/utils/verifyDomain';
import { getRootDomain } from '@/utils/domainUtils';
import ConfirmDeleteSiteModal from './DeleteWarningModal';
import { APP_SUMO_BUNDLE_NAMES } from '@/constants';
import getDomainStatus from '@/utils/getDomainStatus';
import applyStatusClass from '@/utils/applyStatusClass';
import ActivatePlanWarningModal from './ActivatePlanWarningModal';
import { getAuthenticationCookie } from '@/utils/cookie';
import { RED_BG } from '@/utils/applyStatusClass';
import MobileDomainCard from './MobileDomainCard';
import notFoundImage from '@/assets/images/not_found_image.png';
import { Site } from '@/generated/graphql';
import PurchaseActionButton from '@/components/Common/PurchaseActionButton';
import Pagination from '@/components/Common/Pagination';

interface DomainTableProps {
  data: any;
  setReloadSites: (reload: boolean) => void;
  setPaymentView: (view: boolean) => void;
  openModal: () => void;
  setOptionalDomain: (domain: string) => void;
  customerData: any;
  refetchSites?: () => void;
  totalCount?: number;
}

const DomainTable: React.FC<DomainTableProps> = ({
  data,
  setReloadSites,
  setPaymentView,
  openModal,
  setOptionalDomain,
  customerData,
  refetchSites,
  totalCount,
}) => {
  const [domains, setDomains] = useState<Site[]>([]);
  const [paginationLimit] = useState(20);
  const [paginationOffset, setPaginationOffset] = useState(0);
  
  // Search and filter states (must be before useQuery)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'disabled'>('all');
  const previousTabRef = useRef<'all' | 'active' | 'disabled'>('all');
  const previousSearchRef = useRef<string>('');
  
  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination offset when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== previousSearchRef.current) {
      setPaginationOffset(0);
    }
  }, [debouncedSearchTerm]);

  // Reset offset when tab or search changes - compute synchronously to prevent race condition
  const currentOffset = useMemo(() => {
    if (activeTab !== previousTabRef.current) {
      previousTabRef.current = activeTab;
      return 0;
    }
    if (debouncedSearchTerm !== previousSearchRef.current) {
      previousSearchRef.current = debouncedSearchTerm;
      return 0;
    }
    return paginationOffset;
  }, [activeTab, paginationOffset, debouncedSearchTerm]);
  
  // Separate paginated query for DomainTable
  const getFilterValue = () => activeTab === 'all' ? 'all' : activeTab === 'active' ? 'active' : 'disabled';
  const { data: paginatedData, refetch: refetchPaginated } = useQuery(getSites, {
    variables: { 
      limit: paginationLimit, 
      offset: currentOffset,
      filter: getFilterValue(),
      search: debouncedSearchTerm || undefined
    },
    skip: false,
  });
  const { data: userData } = useSelector((state: RootState) => state.user);
  const organization = useSelector((state: RootState) => state.organization.data);
  const [billingLoading, setBillingLoading] = useState(false);
  const [activePlan, setActivePlan] = useState('');
  const [isYearly, setIsYearly] = useState(false);
  const [planMetaData, setPlanMetaData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteSiteID, setDeleteSiteID] = useState(-1);
  const [deleteSiteStatus, setDeleteSiteStatus] = useState('');
  const [isCancel, setIsCancel] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempDomain, setTempDomain] = useState('');
  const [expiryDays, setExpiryDays] = useState(-1);
  const selectedDomain = useRef<Site | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  // Local state for monitoring toggles (temporary until DB is updated)
  const [monitoringStates, setMonitoringStates] = useState<{
    [key: number]: boolean;
  }>({});
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  
  // State to track which domain's actions are visible
  const [openActionsMenuId, setOpenActionsMenuId] = useState<number | null>(null);

  const [deleteSiteMutation] = useMutation(deleteSite, {
    onCompleted: async (response) => {
      setReloadSites(true);
      if (response.deleteSite === 1) {
        toast.success('The domain was successfully deleted.');
      }
      // Refetch both paginated data for the table and total count for pagination
      if (refetchSites) {
        refetchSites();
      }
      if (refetchPaginated) {
        await refetchPaginated({ 
          limit: paginationLimit, 
          offset: paginationOffset,
          filter: getFilterValue(),
          search: debouncedSearchTerm || undefined
        });
      }
    },
    onError: () => {
      toast.error('There was an error while deleting the domain.');
    },
  });

  const [updateSiteMutation] = useMutation(updateSite, {
    onCompleted: async (response) => {
      setReloadSites(true);
      if (response?.changeURL?.includes('Successfully')) {
        toast.success('The domain name was successfully updated.');
      }
      // Refetch both paginated data for the table and total count for pagination
      if (refetchSites) {
        refetchSites();
      }
      if (refetchPaginated) {
        await refetchPaginated({ 
          limit: paginationLimit, 
          offset: paginationOffset,
          filter: getFilterValue(),
          search: debouncedSearchTerm || undefined
        });
      }
    },
    onError: (error) => {
      toast.error(
        `There was an error while editing the domain name. ${error.message}`,
      );
    },
  });

  const [toggleMonitoringMutation] = useMutation(toggleSiteMonitoring, {
    onCompleted: async () => {
      setReloadSites(true);
      toast.success('Monitoring settings updated successfully.');
      // Refetch both paginated data for the table and total count for pagination
      if (refetchSites) {
        refetchSites();
      }
      if (refetchPaginated) {
        await refetchPaginated({ 
          limit: paginationLimit, 
          offset: paginationOffset,
          filter: getFilterValue(),
          search: debouncedSearchTerm || undefined
        });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update monitoring settings. ${error.message}`);
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
      isCancel: isCancel,
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

  const handleEdit = (domain: Site) => {
    // toast.info('Warning: You can only edit up to 3 characters in the URL.', {
    //   position: 'top-center',
    // });
    setEditingId(domain.id ?? null);
    setTempDomain(domain.url ?? '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempDomain('');
  };

  const handleMonitoringToggle = async (
    siteId: number,
    currentValue: boolean,
  ) => {
    try {
      // Update local state immediately for visual feedback
      setMonitoringStates((prev) => ({ ...prev, [siteId]: !currentValue }));

      await toggleMonitoringMutation({
        variables: { siteId, enabled: !currentValue },
      });
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      // Revert on error
      setMonitoringStates((prev) => ({ ...prev, [siteId]: currentValue }));
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

    // Use getRootDomain to extract and validate the root domain
    const rootDomain = getRootDomain(tempDomain);

    if (!rootDomain) {
      toast.error('Please enter a valid domain name');
      setEditLoading(false);
      setEditingId(null);
      return;
    }

    // Additional validation using the existing isValidDomain function
    if (!isValidDomain(rootDomain)) {
      toast.error('Please enter a valid domain name');
      setEditLoading(false);
      setEditingId(null);
      return;
    }

    // Duplicate check using root domain comparison
    const isDuplicate = domains.some((d) => {
      const existingRootDomain = getRootDomain(d.url ?? '');
      return existingRootDomain === rootDomain && d.id !== id;
    });
    if (isDuplicate) {
      toast.error('This domain already exists');
      setEditLoading(false);
      setEditingId(null);
      return;
    }

    const response = await updateSiteMutation({
      variables: { siteId: editingId, url: rootDomain },
    });
    if (response.errors) {
      toast.error(response.errors[0].message);
    }
    // Refetch is handled in updateSiteMutation's onCompleted handler
    setEditLoading(false);
    setEditingId(null);
  };

  const [tierPlan, setTierPlan] = useState(false);
  const [appSumoDomains, setAppSumoDomain] = useState<string[]>([]);
  const [appSumoCount, setAppSumoCount] = useState(0);
  const [codeCount, setCodeCount] = useState(0);
  const [isStripeCustomer, setIsStripeCustomer] = useState(false);
  const isAppSumoOrg =
    organization?.id === (process.env.REACT_APP_CURRENT_ORG || '1');

  const handleSubscription = async (selectedDomain: Site) => {
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

  const handleOpenActivateModal = (domain: Site) => {
    setShowActivateModal(true);
    selectedDomain.current = domain;
  };

  const handleCancelSubscription = (domainId: number, domainStatus: string) => {
    setShowModal(true);
    setDeleteSiteID(domainId);
    setDeleteSiteStatus(domainStatus);
    setIsCancel(true);
  };

  useEffect(() => {
    // Use paginated data if available, otherwise fall back to props data
    const dataSource = paginatedData || data;
    if (dataSource) {
      // Handle both old structure (array) and new structure (PaginatedSites)
      const sites = dataSource.getUserSites?.sites || dataSource.getUserSites || [];
      setDomains(sites);
    }
  }, [paginatedData, data]);

  // No local filtering needed - backend handles search and filtering
  const filteredDomains = domains;
  
  // The useEffect hook that was here has been removed to avoid redundant re-renders.
  // The `currentOffset` computed with `useMemo` already handles resetting the offset
  // for the GraphQL query when the active tab changes.

  // Announce result counts to assistive tech when search/filter changes
  useEffect(() => {
    const term = debouncedSearchTerm.trim();
    const tabLabel =
      activeTab === 'active'
        ? 'Active sites'
        : activeTab === 'disabled'
        ? 'Trial sites'
        : 'All sites';

    const count = filteredDomains.length;
    const resultsText =
      count === 0
        ? 'No sites found'
        : `${count} ${count === 1 ? 'site' : 'sites'} found`;

    const message = term
      ? `${resultsText} in ${tabLabel} for "${term}"`
      : `${resultsText} in ${tabLabel}`;

    setLiveAnnouncement(message);
  }, [filteredDomains.length, debouncedSearchTerm, activeTab]);

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
        if (customerData.codeCount == 9999) {
          setCodeCount(Infinity);
        } else {
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
        isCancel={isCancel}
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

      <div
        className="min-h-screen bg-[#eaecfb] rounded-2xl border"
        style={{ borderColor: '#A2ADF3', borderWidth: '1px' }}
      >
        {/* Header Section */}
        <div className="bg-[#eaecfb] rounded-2xl border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full">
            {/* Navigation Tabs and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
              {/* Navigation Tabs - Left */}
              <div className="flex items-center space-x-8 my-sites-tabs">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`font-normal text-base pb-2 transition-colors ${
                    activeTab === 'all'
                      ? 'text-black'
                      : 'text-[#646C7B] hover:text-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`font-normal text-base pb-2 transition-colors ${
                    activeTab === 'active'
                      ? 'text-black'
                      : 'text-[#646C7B] hover:text-gray-600'
                  }`}
                >
                  Active sites
                </button>
                <button
                  onClick={() => setActiveTab('disabled')}
                  className={`font-normal text-base pb-2 transition-colors ${
                    activeTab === 'disabled'
                      ? 'text-black'
                      : 'text-[#646C7B] hover:text-gray-600'
                  }`}
                >
                  Trial sites
                </button>
              </div>

              {/* Blue line below tabs */}

              {/* Search Bar - Right */}
              <div className="relative w-full md:w-80 md:max-w-md my-sites-search">
              <div
                className="sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                {liveAnnouncement}
              </div>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4"
                    style={{ color: '#8D95A3' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-[#4A5568]"
                  style={{ border: '1px solid #A2ADF3' }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-start px-4 sm:px-6 lg:px-8">
          <div className="h-0.5 bg-[#7383ED] w-full -mt-8"></div>
        </div>

        {/* Main Content */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:pr-12">
          {/* Empty State - Desktop Only */}
          <div className="hidden lg:block">
            {filteredDomains.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                {/* Empty State Image */}
                <div className="mb-6">
                  <img
                    src={notFoundImage}
                    alt="No sites found"
                    className="w-32 h-32 object-contain"
                  />
                </div>

                {/* Empty State Message */}
                <div
                  className="text-center mb-6"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    You currently have no sites in this list
                  </h3>
                  <p className="text-sm text-[#656C79]">
                    {activeTab === 'all'
                      ? 'Add your first domain to get started with accessibility monitoring.'
                      : activeTab === 'active'
                      ? 'No Active sites found. Add your first domain or switch to All to view all your domains.'
                      : 'No Trial sites found. Switch to All or Active sites to view your domains.'}
                  </p>
                </div>

                {/* Add New Domain Button */}
                {(activeTab === 'all' || activeTab === 'active') && (
                  <button
                    onClick={() => {
                      openModal();
                    }}
                    aria-label="Add new domain"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-4 transition-all duration-200 shadow-sm"
                  >
                    Add new domain
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Table - Desktop Only */}
                <div className="hidden lg:block">
                  <table className="w-full pr-8 my-sites-table-headers" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <caption className="sr-only">Experience WebAbility PRO free for 7 days</caption>
                    <thead>
                      <tr className="text-sm font-medium text-gray-700 mb-4 pr-8" style={{ display: 'flex', alignItems: 'center', padding: '0 2rem 0 1.5rem' }}>
                        <th scope="col" className="flex-shrink-0 mr-2 w-6" style={{ display: 'block', padding: 0, border: 'none', fontWeight: 'inherit' }}>
                          {/* Empty space for favicon alignment */}
                        </th>
                        <th scope="col" className="flex-1 min-w-0 mr-2" style={{ display: 'block', padding: 0, border: 'none', fontWeight: 'inherit' }}>
                          <span className="uppercase flex items-center" style={{ color: '#445AE7' }}>
                            Domain
                          </span>
                        </th>
                        <th scope="col" className="flex-shrink-0 mr-4 w-32" style={{ display: 'block', padding: 0, border: 'none', fontWeight: 'inherit' }}>
                          <Tooltip
                            title="Domain ownership status and workspace sharing"
                            placement="top"
                          >
                            <span
                              className="uppercase cursor-help flex items-center"
                              style={{ color: '#445AE7' }}
                            >
                              Ownership
                            </span>
                          </Tooltip>
                        </th>
                        <th scope="col" className="flex-shrink-0 mr-16 w-16" style={{ display: 'block', padding: 0, border: 'none', fontWeight: 'inherit' }}>
                          <span className="uppercase flex items-center" style={{ color: '#445AE7' }}>
                            Plan
                          </span>
                        </th>
                        <th scope="col" className="flex-shrink-0 mr-8 w-20" style={{ display: 'block', padding: 0, border: 'none', fontWeight: 'inherit' }}>
                          <span className="uppercase flex items-center" style={{ color: '#445AE7' }}>
                            Monitor
                          </span>
                        </th>
                        <th scope="col" className="flex-shrink-0 mr-3 w-24" style={{ display: 'block', padding: 0, border: 'none', fontWeight: 'inherit' }}>
                          <span className="uppercase flex items-center" style={{ color: '#445AE7' }}>
                            Status
                          </span>
                        </th>
                        <th scope="col" className="flex-shrink-0 w-56" style={{ display: 'block', padding: 0, border: 'none', fontWeight: 'inherit' }}>
                          <span className="uppercase flex items-center" style={{ color: '#445AE7' }}>
                            Actions
                          </span>
                        </th>
                      </tr>
                      <tr aria-hidden="true" style={{ display: 'block' }}>
                        <td colSpan={7} style={{ padding: 0, border: 'none', borderBottom: '1px solid #e5e7eb', marginBottom: '1rem', height: '1px' }}></td>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                  {filteredDomains.map((domain) => {
                    const isEditing = editingId === domain.id;
                    const domainStatus = getDomainStatus(
                      domain.url ?? '',
                      domain.expiredAt ?? '',
                      domain.trial ?? 0,
                      appSumoDomains,
                    );

                    // Generate favicon URL
                    const getFaviconUrl = (url: string) => {
                      const domainName = url
                        .replace(/^https?:\/\//, '')
                        .replace(/^www\./, '');
                      return `https://www.google.com/s2/favicons?domain=${domainName}&sz=32`;
                    };

                    // Generate last updated date (mock data for now)
                    const getLastUpdated = () => {
                      return new Date().toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    };

                    // Generate traffic data (mock data for now)
                    const getTraffic = () => {
                      return '572K';
                    };

                    return (
                      <tr
                        key={domain.id}
                        className="bg-white border p-6 pr-8 hover:shadow-md transition-shadow rounded-lg min-h-[80px] my-sites-domain-row"
                        style={{ borderColor: '#A2ADF3', display: 'flex' }}
                      >
                        {/* Favicon */}
                        <td className="flex-shrink-0 mr-2" style={{ display: 'block', padding: 0, border: 'none' }}>
                            <img
                              src={getFaviconUrl(domain.url ?? '')}
                              alt={`${domain.url} favicon`}
                              className="w-6 h-6 rounded"
                              onError={(e) => {
                                // Fallback to a default icon if favicon fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                        </td>

                        {/* Domain Name */}
                        <td className="flex-1 min-w-0 mr-2" style={{ display: 'block', padding: 0, border: 'none' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                aria-label="Edit domain URL"
                                className="border-2 border-gray-200 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                value={tempDomain}
                                onChange={(e) => setTempDomain(e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {domain.url ??
                                  ''
                                    .replace(/^https?:\/\//, '')
                                    .replace(/^www\./, '')}
                              </div>
                            )}
                        </td>

                        {/* Ownership */}
                        <td className="flex-shrink-0 mr-4 w-32" style={{ display: 'block', padding: 0, border: 'none' }}>
                            <div className="flex flex-nowrap gap-1">
                              {!domain.is_owner &&
                                !domain?.workspaces?.length && (
                                  <Chip
                                    variant="outlined"
                                    color="info"
                                    size="small"
                                    label={domain.user_email || 'Shared'}
                                    sx={{ fontSize: '0.65rem', height: '20px' }}
                                  />
                                )}

                              {!!domain?.workspaces?.length && (
                                <Chip
                                  variant="outlined"
                                  color="primary"
                                  size="small"
                                  label="Workspace"
                                  sx={{ fontSize: '0.65rem', height: '20px' }}
                                />
                              )}

                              {domain.is_owner && (
                                <Chip
                                  variant="outlined"
                                  color="success"
                                  size="small"
                                  label="Owner"
                                  sx={{ fontSize: '0.65rem', height: '20px' }}
                                />
                              )}
                            </div>
                        </td>

                        {/* Plan Status */}
                        <td className="flex-shrink-0 mr-16 w-16 my-sites-plan-status" style={{ display: 'block', padding: 0, border: 'none' }}>
                            <Tooltip
                              title={
                                domainStatus === 'Life Time'
                                  ? 'Lifetime license - Never expires'
                                  : domainStatus === 'Active'
                                  ? 'Subscription is active'
                                  : domainStatus === 'Trial'
                                  ? `Trial period ends on ${
                                      domain?.expiredAt
                                        ? new Date(
                                            Number.parseInt(domain.expiredAt),
                                          ).toLocaleDateString()
                                        : 'N/A'
                                    }`
                                  : domainStatus === 'Trial Expired'
                                  ? 'Trial period has ended - Please activate'
                                  : domainStatus === 'Expiring'
                                  ? 'Subscription is expiring soon'
                                  : 'Subscription has expired'
                              }
                              placement="top"
                            >
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium cursor-help whitespace-nowrap ${applyStatusClass(
                                  domain.url ?? '',
                                  domain.expiredAt ?? '',
                                  domain.trial ?? 0,
                                  appSumoDomains,
                                )}`}
                              >
                                <span className="relative flex h-1.5 w-1.5 mr-1.5">
                                  <span
                                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                      domainStatus === 'Life Time'
                                        ? 'bg-green-400'
                                        : domainStatus === 'Trial'
                                        ? 'bg-yellow-400'
                                        : 'bg-blue-400'
                                    }`}
                                  ></span>
                                  <span
                                    className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                      domainStatus === 'Life Time'
                                        ? 'bg-green-500'
                                        : domainStatus === 'Trial'
                                        ? 'bg-yellow-500'
                                        : 'bg-blue-500'
                                    }`}
                                  ></span>
                                </span>
                                {domainStatus}
                              </span>
                            </Tooltip>
                        </td>

                        {/* Monitor Toggle */}
                        <td className="flex-shrink-0 mr-8 w-20 my-sites-monitor-toggle" style={{ display: 'block', padding: 0, border: 'none' }}>
                            {(userData.isAdminOrOwnerOrSuper ||
                              domain.is_owner) && (
                              <Tooltip
                                title={
                                  monitoringStates[domain.id ?? 0] ??
                                  domain.monitor_enabled
                                    ? 'Click to disable monitoring'
                                    : 'Click to enable monitoring'
                                }
                                placement="top"
                              >
                                <button
                                  onClick={() =>
                                    handleMonitoringToggle(
                                      domain.id ?? 0,
                                      monitoringStates[domain.id ?? 0] ??
                                        domain.monitor_enabled ??
                                        false,
                                    )
                                  }
                                  role="switch"
                                  aria-checked={
                                    monitoringStates[domain.id ?? 0] ??
                                    domain.monitor_enabled ??
                                    false
                                  }
                                  aria-label={`Toggle monitoring for ${domain.url}`}
                                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                    monitoringStates[domain.id ?? 0] ??
                                    domain.monitor_enabled
                                      ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                                      : 'focus:ring-gray-300'
                                  }`}
                                  style={
                                    monitoringStates[domain.id ?? 0] ??
                                    domain.monitor_enabled
                                      ? {}
                                      : { backgroundColor: '#E5E7EB' }
                                  }
                                  disabled={isEditing}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`inline-block h-3 w-3 transform rounded-full shadow transition-all duration-300 ${
                                      monitoringStates[domain.id ?? 0] ??
                                      domain.monitor_enabled
                                        ? 'translate-x-3 bg-white'
                                        : 'translate-x-0.5'
                                    }`}
                                    style={
                                      monitoringStates[domain.id ?? 0] ??
                                      domain.monitor_enabled
                                        ? {}
                                        : { 
                                            backgroundColor: '#374151'
                                          }
                                    }
                                  />
                                </button>
                              </Tooltip>
                            )}
                        </td>

                        {/* Status Indicator */}
                        <td className="flex-shrink-0 mr-3 w-24 my-sites-status-indicator" style={{ display: 'block', padding: 0, border: 'none' }}>
                            {monitoringStates[domain.id ?? 0] ??
                            domain.monitor_enabled ? (
                              domain.is_currently_down !== null &&
                              domain.is_currently_down !== undefined ? (
                                <>
                                  {domain.is_currently_down === 0 ? (
                                    <Tooltip
                                      title={`Website is responding normally${
                                        domain.last_monitor_check
                                          ? ` - Last checked: ${new Date(
                                              domain.last_monitor_check,
                                            ).toLocaleString()}`
                                          : ''
                                      }`}
                                      placement="top"
                                    >
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 cursor-help border border-green-400" style={{ backgroundColor: '#178841', color: '#FFFFFF' }}>
                                        <span className="relative flex h-2 w-2 mr-2">
                                          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                        <span className="font-medium tracking-wide" style={{ color: '#FFFFFF' }}>
                                          ONLINE
                                        </span>
                                      </span>
                                    </Tooltip>
                                  ) : domain.is_currently_down === 1 ? (
                                    <Tooltip
                                      title={`Website is not responding${
                                        domain.last_monitor_check
                                          ? ` - Last checked: ${new Date(
                                              domain.last_monitor_check,
                                            ).toLocaleString()}`
                                          : ''
                                      }`}
                                      placement="top"
                                    >
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-help border border-red-400">
                                        <span className="relative flex h-2 w-2 mr-2">
                                          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                        <span className="text-white font-medium tracking-wide">
                                          OFFLINE
                                        </span>
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip
                                      title="Status check in progress"
                                      placement="top"
                                    >
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-help border border-blue-400">
                                        <svg
                                          className="animate-spin -ml-0.5 mr-2 h-3 w-3 text-white"
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
                                        <span className="text-white font-medium tracking-wide">
                                          CHECKING...
                                        </span>
                                      </span>
                                    </Tooltip>
                                  )}
                                </>
                              ) : (
                                <Tooltip
                                  title="Waiting for first monitoring check"
                                  placement="top"
                                >
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-help border border-gray-400">
                                    <svg
                                      className="mr-2 h-3 w-3 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span className="text-white font-medium tracking-wide">
                                      AWAITING DATA
                                    </span>
                                  </span>
                                </Tooltip>
                              )
                            ) : (
                              <Tooltip
                                title="Monitoring is disabled for this domain"
                                placement="top"
                              >
                                <span className="text-xs text-gray-400 italic cursor-help">
                                  Monitor off
                                </span>
                              </Tooltip>
                            )}
                        </td>

                        {/* Actions Menu */}
                        <td className="flex-shrink-0 w-56 flex items-center space-x-1 my-sites-actions" style={{ display: 'flex', padding: 0, border: 'none' }}>
                            {isEditing ? (
                              <>
                                <Tooltip title="Save changes" placement="top">
                                  <button
                                    onClick={() => handleSave(domain.id ?? 0)}
                                    className="inline-flex items-center p-1 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                    disabled={editLoading}
                                  >
                                    {editLoading ? (
                                      <CircularProgress size={12} />
                                    ) : (
                                      <FaCheck className="w-3 h-3" />
                                    )}
                                  </button>
                                </Tooltip>
                                <Tooltip title="Cancel editing" placement="top">
                                  <button
                                    onClick={handleCancel}
                                    className="inline-flex items-center p-1 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all duration-200"
                                    disabled={editLoading}
                                  >
                                    <FaTimes className="w-3 h-3" />
                                  </button>
                                </Tooltip>
                              </>
                            ) : (
                              <>
                                <Tooltip title="Domain actions" placement="top">
                                  <button
                                    onClick={() =>
                                      setOpenActionsMenuId(
                                        openActionsMenuId === domain.id
                                          ? null
                                          : domain.id ?? null,
                                      )
                                    }
                                    className="p-1 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200"
                                    style={{ color: '#8D95A3' }}
                                    aria-label={`Actions for domain ${domain.url}`}
                                  >
                                    <FaCog className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                                {openActionsMenuId === domain.id && (
                                  <>
                                    {/* Conditionally show Activate/Buy button for non-active domains */}
                                    {domain.is_owner &&
                                      (domainStatus === 'Trial' ||
                                        domainStatus === 'Trial Expired') && (
                                        <PurchaseActionButton
                                          isAppSumoOrg={isAppSumoOrg}
                                          activePlan={activePlan}
                                          tierPlan={tierPlan}
                                          appSumoCount={appSumoCount}
                                          codeCount={codeCount}
                                          billingLoading={billingLoading}
                                          onActivateSubscription={() =>
                                            handleSubscription(domain)
                                          }
                                          onOpenActivateModal={() =>
                                            handleOpenActivateModal(domain)
                                          }
                                          onBuyLicense={() => {
                                            setPaymentView(true);
                                            openModal();
                                            setOptionalDomain(domain.url ?? '');
                                          }}
                                          className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                          useTooltip
                                        />
                                      )}
                                    {(userData.isAdminOrOwnerOrSuper ||
                                      domain.is_owner) && (
                                      <Tooltip title="Edit domain" placement="top">
                                        <button
                                          onClick={() => handleEdit(domain)}
                                          className="p-1 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200"
                                          style={{ color: '#8D95A3' }}
                                          aria-label={`Edit domain ${domain.url}`}
                                        >
                                          <FaPencilAlt className="w-4 h-4" />
                                        </button>
                                      </Tooltip>
                                    )}
                                    {domain.is_owner && (
                                      <Tooltip
                                        title="Delete domain"
                                        placement="top"
                                      >
                                        <button
                                          onClick={() => {
                                            setDeleteSiteID(domain.id ?? 0);
                                            setDeleteSiteStatus(domainStatus);
                                            setShowModal(true);
                                            setIsCancel(false);
                                          }}
                                          className="p-1 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200"
                                          style={{ color: '#8D95A3' }}
                                          aria-label={`Delete domain ${domain.url}`}
                                        >
                                          <FaTrash className="w-4 h-4" />
                                        </button>
                                      </Tooltip>
                                    )}
                                    {/* Cancel Button for Active/Life Time domains */}
                                    {domain.is_owner && (
                                      <>
                                        {(domainStatus === 'Active' ||
                                          domainStatus === 'Life Time') && (
                                          <Tooltip
                                            title={
                                              'Cancel Subscription for this domain'
                                            }
                                            placement="top"
                                          >
                                            <button
                                              type="button"
                                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer whitespace-nowrap ${RED_BG}`}
                                              onClick={() =>
                                                handleCancelSubscription(
                                                  domain.id ?? 0,
                                                  domainStatus,
                                                )
                                              }
                                            >
                                              <FaTimes className="w-3 h-3 text-red-500 mr-1 flex-shrink-0" />
                                              Cancel Subscription
                                            </button>
                                          </Tooltip>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3 px-4 sm:px-6 lg:px-8">
          {filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              {/* Empty State Image */}
              <div className="mb-6">
                <img
                  src={notFoundImage}
                  alt="No sites found"
                  className="w-32 h-32 object-contain"
                />
              </div>

              {/* Empty State Message */}
              <div
                className="text-center mb-6"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  You currently have no sites in this list
                </h3>
                <p className="text-sm text-[#656C79]">
                  {activeTab === 'all'
                    ? 'Add your first domain to get started with accessibility monitoring.'
                    : activeTab === 'active'
                    ? 'No Active sites found. Add your first domain or switch to All to view all your domains.'
                    : 'No Trial sites found. Switch to All or Active sites to view your domains.'}
                </p>
              </div>

              {/* Add New Domain Button */}
              {(activeTab === 'all' || activeTab === 'active') && (
                <button
                  onClick={() => {
                    openModal();
                    setIsCancel(false);
                  }}
                  aria-label="Add new domain"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-4 transition-all duration-200 shadow-sm"
                >
                  Add new domain
                </button>
              )}
            </div>
          ) : (
            filteredDomains.map((domain) => {
              const isEditing = editingId === domain.id;
              const domainStatus = getDomainStatus(
                domain.url ?? '',
                domain.expiredAt ?? '',
                domain.trial ?? 0,
                appSumoDomains,
              );

              return (
                <MobileDomainCard
                  key={domain.id}
                  domain={domain}
                  isEditing={isEditing}
                  tempDomain={tempDomain}
                  setTempDomain={setTempDomain}
                  domainStatus={domainStatus}
                  monitoringStates={monitoringStates}
                  editLoading={editLoading}
                  billingLoading={billingLoading}
                  activePlan={activePlan}
                  tierPlan={tierPlan}
                  appSumoCount={appSumoCount}
                  codeCount={codeCount}
                  appSumoDomains={appSumoDomains}
                  userData={userData}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onSave={handleSave}
                  onDelete={(id, status) => {
                    setDeleteSiteID(id);
                    setDeleteSiteStatus(status);
                    setShowModal(true);
                  }}
                  onMonitoringToggle={handleMonitoringToggle}
                  onSubscription={handleSubscription}
                  onOpenActivateModal={handleOpenActivateModal}
                  onPaymentView={() => {
                    setPaymentView(true);
                    openModal();
                    setOptionalDomain(domain.url ?? '');
                  }}
                  onCancelSubscription={handleCancelSubscription}
                />
              );
            })
          )}
        </div>

        {/* Pagination */}
        {(() => {
          const displayTotal = paginatedData?.getUserSites?.total || totalCount || domains.length;
          return displayTotal > paginationLimit ? (
            <div className="px-4 sm:px-6 lg:px-8 py-4 w-full overflow-hidden">
              <Pagination
                total={displayTotal}
                size={paginationLimit}
                onPageChange={(offset: number) => {
                  setPaginationOffset(offset);
                  refetchPaginated({ 
                    limit: paginationLimit, 
                    offset,
                    filter: getFilterValue(),
                    search: debouncedSearchTerm || undefined
                  });
                }}
              />
            </div>
          ) : null;
        })()}
      </div>
    </>
  );
};

export default DomainTable;
