import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Domain } from './DomainTable';
import { plans } from '@/constants';
import { useLazyQuery } from '@apollo/client';
import getSitePlanQuery from '@/queries/sitePlans/getSitePlan';
import { getAuthenticationCookie } from '@/utils/cookie';

interface ActivatePlanWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingLoading: boolean;
  setBillingLoading: (value: boolean) => void;
  domain: Domain | null;
  promoCode: number[];
  setReloadSites: (value: boolean) => void;
  isStripeCustomer: boolean;
}

const ActivatePlanWarningModal: React.FC<ActivatePlanWarningModalProps> = ({
  isOpen,
  onClose,
  billingLoading,
  setBillingLoading,
  domain,
  promoCode,
  setReloadSites,
  isStripeCustomer,
}) => {
  const { data: userData } = useSelector((state: RootState) => state.user);
  const [fetchSitePlan] = useLazyQuery(getSitePlanQuery);

  const handleDirectSubscription = async (domain: Domain | null) => {
    if (!domain) return;

    setBillingLoading(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/create-subscription`;
    const result = plans[0].id.replace(/\d+/g, '');

    let bodyData: any = {
      email: userData.email,
      returnURL: window.location.href,
      planName: result,
      billingInterval: 'MONTHLY',
      domainId: domain.id,
      domainUrl: domain.url,
      userId: userData.id,
      promoCode: promoCode,
      cardTrial: false,
    };

    if (!isStripeCustomer) {
      url = `${process.env.REACT_APP_BACKEND_URL}/create-checkout-session`;

      // Get Rewardful referral ID if available
      const referralId = window.Rewardful?.referral || null;

      bodyData = {
        email: userData.email,
        returnUrl: window.location.href,
        planName: result,
        billingInterval: 'MONTHLY',
        domainId: domain.id,
        domain: domain.url,
        userId: userData.id,
        promoCode: promoCode,
        cardTrial: false,
      };

      // Add referral ID if present
      if (referralId) {
        bodyData.referral = referralId;
      }
    }

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
          response.json().then((data) => {
            setBillingLoading(false);
            if (data.error) {
              toast.error(`An Error Occured: ${data.error}`);
              console.log(data);
            } else {
              toast.success(
                'The domain was successfully added to your active plan',
              );
              setReloadSites(true);
              fetchSitePlan({
                variables: { siteId: domain.id },
              });
              window.location.reload();
            }
          });
        })
        .catch((error) => {
          toast.error(`An Error Occured: ${error.message}`);
          console.error('There was a problem with the fetch operation:', error);
          setBillingLoading(false);
        });
    } catch (error) {
      console.log('error', error);
    }
  };

  if (!isOpen) return null;

  return (
    domain && (
      <>
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={billingLoading ? undefined : onClose}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 border border-gray-100 transform transition-all duration-300 hover:shadow-3xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow:
                '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Header with Icon */}
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                  Confirm Site Activation
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Ready to activate your accessibility plan
                </p>
              </div>
            </div>

            {/* Domain Information */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
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
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {domain.url}
                  </p>
                  <p className="text-xs text-gray-500">
                    Domain to be activated
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <p className="text-gray-700 leading-relaxed">
                Click{' '}
                <span className="font-semibold text-green-600">Activate</span>{' '}
                to activate the accessibility plan for this domain. This will
                enable comprehensive accessibility monitoring and reporting
                features.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300"
                disabled={billingLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDirectSubscription(domain)}
                className={`px-6 py-3 rounded-xl text-white transition-all duration-200 flex items-center font-medium shadow-lg hover:shadow-xl ${
                  !billingLoading
                    ? 'bg-gradient-to-r from-green-500 to-green-600 transform hover:scale-105'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={billingLoading}
              >
                {billingLoading ? (
                  <>
                    <CircularProgress
                      className="-ml-1 mr-3"
                      size={20}
                      sx={{ color: 'white' }}
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  );
};

export default ActivatePlanWarningModal;
