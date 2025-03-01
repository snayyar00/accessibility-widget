import React, { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { FaTrash, FaCheck, FaTimes, FaCog } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import {
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import deleteSite from '@/queries/sites/deleteSite';
import updateSite from '@/queries/sites/updateSite';
import isValidDomain from '@/utils/verifyDomain';
import ConfirmDeleteSiteModal from './DeleteWarningModal';
import { APP_SUMO_BUNDLE_NAMES } from '@/constants';

interface Domain {
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
}

const DomainTable: React.FC<DomainTableProps> = ({
  data,
  setReloadSites,
  setPaymentView,
  openModal,
  setOptionalDomain,
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
  const [expiryDays,setExpiryDays] = useState(-1);

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

  const handleDelete = async (id: number, status: string) => {
    const index = domains.findIndex((domain) => domain.id === id);
    const foundUrl = domains[index].url;

    if (status !== 'Active') {
      toast.error('Cannot delete a trial site');
      return;
    }

    setBillingLoading(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/cancel-site-subscription`;
    const bodyData = {
      domainId: id,
      domainUrl: foundUrl,
      userId: userData.id,
      status: status,
    };

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    toast.info('Warning: You can only edit up to 3 characters in the URL.', {
      position: 'top-center',
    });
    setEditingId(domain.id);
    setTempDomain(domain.url);
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempDomain('');
  };

  function getEditDistance(str1: string, str2: string) {
    const len1 = str1.length;
    const len2 = str2.length;
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    const matrix = Array(len2 + 1)
      .fill(null)
      .map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len2; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    return matrix[len2][len1];
  }

  const handleSave = async (id: number) => {
    setEditLoading(true);
    const oldDomain = domains.find((domain) => domain.id === id)?.url || '';
    if (getEditDistance(oldDomain, tempDomain) > 3) {
      toast.error('You cannot edit more than 3 characters');
      setEditLoading(false);
      setEditingId(null);
      return;
    }
    if (!isValidDomain(tempDomain)) {
      toast.error('You must enter a valid domain name!');
      setEditLoading(false);
      setEditingId(null);
      return;
    }
    const sanitizedDomain = tempDomain.replace(/^(https?:\/\/)?(www\.)?/, '');

    const response = await updateSiteMutation({
      variables: { siteId: editingId, url: sanitizedDomain },
    });
    if (response.errors) {
      toast.error(response.errors[0].message);
    } else {
      setDomains(
        domains.map((d) => (d.id === id ? { ...d, url: sanitizedDomain } : d)),
      );
    }
    setEditLoading(false);
    setEditingId(null);
  };

  const applyStatusClass = (status: string, trial: number): string => {
    if (!status) {
      return 'bg-yellow-200 text-yellow-800';
    }
    if (trial) {
      return 'bg-yellow-200 text-yellow-800';
    }
    const currentTime = new Date().getTime();
    const timeDifference = new Date(parseInt(status)).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return 'bg-green-200 text-green-600';
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      return 'bg-red-200 text-red-600';
    }
    return 'bg-yellow-200 text-yellow-800';
  };

  const getDomainStatus = (status: string, trial: number): string => {
    if (!status) {
      return 'Trial Expired';
    }
    if (trial) {
      return 'Trial';
    }
    const currentTime = new Date().getTime();
    const timeDifference = new Date(parseInt(status)).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return 'Active';
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      return trial === 1 ? 'Trial' : 'Expiring';
    }
    return 'Expired';
  };

  const customerCheck = async () => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/check-customer`;
    const bodyData = { email: userData.email, userId: userData.id };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        response.json().then((data) => {
          if (data.submeta) {
            setPlanMetaData(data.submeta);
          }
          if (data.isCustomer === true) {
            setActivePlan(data.plan_name);
            if (data.interval === 'yearly') {
              setIsYearly(true);
            }
          }
          if(data.expiry){
            setExpiryDays(data.expiry);
          }
        });
      })
      .catch((error) => {
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  const handleSubscription = async (selectedDomain: Domain) => {
    setBillingLoading(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/create-subscription`;
    const bodyData = {
      email: userData.email,
      returnURL: window.location.href,
      planName: activePlan.toLowerCase(),
      billingInterval: !isYearly || APP_SUMO_BUNDLE_NAMES.includes(activePlan.toLowerCase()) ? "MONTHLY" : "YEARLY",
      domainId: selectedDomain.id,
      domainUrl: selectedDomain.url,
      userId: userData.id,
    };


    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  useEffect(() => {
    if (data) {
      setDomains(data.getUserSites);
    }
  }, [data]);

  useEffect(() => {
    customerCheck();
  }, []);

  return (
    <>
      {/* {activePlan && planMetaData ? (
        <Card
          sx={{ borderRadius: 5 }}
          className="max-w-5xl mx-auto my-6 shadow-md hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-secondary/10 rounded-xl"
        >
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-primary">
                  Subscription Details
                </h2>
                <p className="text-muted-foreground mt-1">
                  You are subscribed to the{' '}
                  <span className="font-bold text-black uppercase">
                    {activePlan}{expiryDays > 0 ? (`(Trial)`):(null)}
                  </span>
                </p>
                {expiryDays > 0 ? ( <h2 className="text-lg font-semibold text-primary">
                  Days Remaining: {expiryDays} Days
                </h2>):(null)}
              </div>
            </div>
            <div className="h-px bg-border my-4" />
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
                  <span className="font-medium">No Domains Added to Plan</span>
                )}
              </div>
            </div>
            <div className="mt-4 p-4 bg-[#f5f7fb] rounded-lg hover:bg-secondary/30 transition-colors duration-300">
              <h4 className="text-md font-semibold text-secondary-foreground mb-2">
                Upgrade your plan
              </h4>
              <p className="text-sm text-secondary-foreground/80">
                Need more domains? Upgrade now for additional features and
                increased limits.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : <div className='flex justify-center mt-5'>
        <CircularProgress
          size={100}
          sx={{ color: 'primary' }}
          className="m-auto"
        />
      </div>
      } */}

      <ConfirmDeleteSiteModal
        billingLoading={billingLoading}
        domainID={deleteSiteID}
        domainStatus={deleteSiteStatus}
        isOpen={showModal}
        onClose={handleCloseModal}
        onDelete={handleDelete}
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
                  domain.expiredAt,
                  domain.trial,
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
                          domain.expiredAt,
                          domain.trial,
                        )}`}
                      >
                        {domainStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 border-b border-gray-200">
                      {domain?.expiredAt
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
                            domainStatus !== 'Expiring' && (
                              <>
                                {activePlan !== '' ? (
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
                                    Buy Plan
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
              domain.expiredAt,
              domain.trial,
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
                          domain.expiredAt,
                          domain.trial,
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
                    {domainStatus !== 'Active' && domainStatus !== 'Expiring' && (
                      <div className="p-4 bg-gray-100">
                        {activePlan !== '' ? (
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
