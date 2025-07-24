import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { FaTrash, FaCheck, FaTimes, FaCog } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';
import deleteSite from '@/queries/sites/deleteSite';
import updateSite from '@/queries/sites/updateSite';
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
        setCodeCount(customerData.codeCount * 2);
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
        <h2 className="text-3xl font-semibold mb-6">Added Domains</h2>
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <table className="min-w-full bg-white rounded-lg shadow-md overflow-hidden">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Domain
                </th>
                <th className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Expires
                </th>
                <th className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
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
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="py-4 px-4 border-b border-gray-200">
                      {isEditing ? (
                        <input
                          type="text"
                          className="border p-2 rounded bg-gray-100 text-lg font-medium w-full"
                          value={tempDomain}
                          onChange={(e) => setTempDomain(e.target.value)}
                        />
                      ) : (
                        domain.url
                      )}
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${applyStatusClass(
                          domain.url,
                          domain.expiredAt,
                          domain.trial,
                          appSumoDomains,
                        )}`}
                      >
                        {domainStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200">
                      {domainStatus == 'Life Time'
                        ? null
                        : domain?.expiredAt
                        ? new Date(
                            Number.parseInt(domain.expiredAt),
                          ).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200">
                      {isEditing ? (
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => handleSave(domain.id)}
                            className="p-2 text-green-600 hover:text-green-800"
                            disabled={editLoading}
                          >
                            {editLoading ? (
                              <CircularProgress size={20} />
                            ) : (
                              <FaCheck />
                            )}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 text-red-600 hover:text-red-800"
                            disabled={editLoading}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        // Desktop action buttons (all in one row)
                        <div className="flex justify-end items-center space-x-2">
                          {domainStatus !== 'Active' &&
                            domainStatus !== 'Life Time' &&
                            domainStatus !== 'Expiring' && (
                              <>
                                {activePlan !== '' && tierPlan ? (
                                  <button
                                    disabled={billingLoading}
                                    onClick={() => handleSubscription(domain)}
                                    type="submit"
                                    // className="p-2 text-white text-center rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] transition duration-300 w-fit"
                                    className="p-2 bg-primary text-white rounded-md text-sm flex items-center justify-center hover:bg-[#1D4ED8] transition-colors duration-200"
                                  >
                                    {billingLoading
                                      ? 'Please Wait...'
                                      : 'Activate'}
                                  </button>
                                ) : appSumoCount < codeCount ? (
                                  <button
                                    onClick={() => {
                                      handleOpenActivateModal(domain);
                                    }}
                                    type="submit"
                                    className="p-2 bg-green text-white rounded-md text-sm flex items-center justify-center hover:bg-green-600 transition-colors duration-200"
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
                                    type="submit"
                                    // className="p-2 text-white text-center rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] transition duration-300 w-fit"
                                    className="p-2 bg-green text-white rounded-md text-sm flex items-center justify-center hover:bg-green-600 transition-colors duration-200"
                                  >
                                    Buy License
                                  </button>
                                )}
                              </>
                            )}
                          <button
                            onClick={() => handleEdit(domain)}
                            className="p-2 bg-[#2563EB] text-white rounded-md text-sm flex items-center justify-center hover:bg-[#1D4ED8] transition-colors duration-200"
                          >
                            <FaCog className="mr-2" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteSiteID(domain.id);
                              setDeleteSiteStatus(domainStatus);
                              setShowModal(true);
                            }}
                            className="p-2 bg-[#1E40AF] text-white rounded-md text-sm flex items-center justify-center hover:bg-[#1E3A8A] transition-colors duration-200"
                          >
                            <FaTrash className="mr-2" /> Delete
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
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-sm text-gray-600">
                    Expires:{' '}
                    {domain.expiredAt
                      ? new Date(
                          Number.parseInt(domain.expiredAt),
                        ).toLocaleDateString()
                      : 'N/A'}
                  </p>
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
