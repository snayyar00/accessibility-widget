import { RootState } from '@/config/store';
import { CircularProgress, Tooltip } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthenticationCookie } from '@/utils/cookie';

interface ConfirmDeleteSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (
    id: number,
    status: string,
    cancelReason?: string,
    otherReason?: string,
  ) => void;
  domainID: number;
  domainStatus: string;
  billingLoading: boolean;
  appSumoCount?: number;
}

const ConfirmDeleteSiteModal: React.FC<ConfirmDeleteSiteModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  domainID,
  domainStatus,
  billingLoading,
  appSumoCount = 0,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [showDiscountOffer, setShowDiscountOffer] = useState<boolean>(false);
  const [applyingDiscount, setApplyingDiscount] = useState<boolean>(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountApplied, setDiscountApplied] = useState<boolean>(false);
  const [copyTooltip, setCopyTooltip] = useState<string>('Copy code');
  const { data: userData } = useSelector((state: RootState) => state.user);

  const reasons = [
    { id: 'too_expensive', label: 'Too expensive' },
    { id: 'not_using', label: 'Not using the service' },
    { id: 'found_alternative', label: 'Found a better alternative' },
    { id: 'mistake', label: 'Added the site by mistake' },
    { id: 'other', label: 'Other' },
  ];

  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
      setOtherReason('');
      setShowDiscountOffer(false);
      setApplyingDiscount(false);
      setCouponCode('');
      setDiscountApplied(false);
      setCopyTooltip('Copy code');
    }
  }, [isOpen]);

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
    if (
      reason === 'too_expensive' &&
      domainStatus !== 'Life Time' &&
      (appSumoCount || 0) <= 1
    ) {
      setShowDiscountOffer(true);
    } else {
      setShowDiscountOffer(false);
    }
  };

  const handleDelete = () => {
    const feedbackText =
      selectedReason === 'other'
        ? otherReason
        : reasons.find((reason) => reason.id === selectedReason)?.label ||
          selectedReason;

    onDelete(domainID, domainStatus, feedbackText, otherReason);
  };

  const handleRedeemDiscount = async () => {
    setApplyingDiscount(true);

    try {
      const token = getAuthenticationCookie();

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/apply-retention-discount`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            domainId: domainID,
            email: userData?.email,
            status: domainStatus,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        if (data?.couponCode) {
          setCouponCode(data?.couponCode);
        } else {
          setDiscountApplied(true);
          setTimeout(() => {
            onClose();
          }, 10000);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('Failed to apply discount. Please try again.');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopyTooltip('Copied!');
      setTimeout(() => setCopyTooltip('Copy code'), 2000);
    } catch (error) {
      setCopyTooltip('Failed to copy');
      setTimeout(() => setCopyTooltip('Copy code'), 2000);
    }
  };

  if (!isOpen) return null;

  const isFormValid =
    selectedReason &&
    (selectedReason !== 'other' || otherReason.trim().length > 0);

  return (
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
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              Confirm Site Deletion
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">
            Please tell us why you're deleting this site:
          </h3>

          <div className="space-y-3">
            {reasons.map((reason) => (
              <div key={reason.id} className="group">
                <label
                  htmlFor={reason.id}
                  className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    selectedReason === reason.id
                      ? 'border-red-200 bg-red-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="radio"
                      id={reason.id}
                      name="deleteReason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={(e) => handleReasonChange(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                        selectedReason === reason.id
                          ? 'border-red-500 bg-red-500'
                          : 'border-gray-300 group-hover:border-gray-400'
                      }`}
                    >
                      {selectedReason === reason.id && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`ml-4 text-sm font-medium transition-colors duration-200 ${
                      selectedReason === reason.id
                        ? 'text-red-900'
                        : 'text-gray-700 group-hover:text-gray-900'
                    }`}
                  >
                    {reason.label}
                  </span>
                </label>
              </div>
            ))}
          </div>

          {selectedReason === 'other' && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Please specify your reason:
              </label>
              <textarea
                placeholder="Tell us more about why you're deleting this site..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none h-24 text-sm transition-all duration-200 hover:border-gray-300"
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {otherReason.length}/500 characters
                </p>
                {otherReason.length > 400 && (
                  <p className="text-xs text-orange-600 font-medium">
                    {500 - otherReason.length} characters remaining
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Discount Offer for "Too Expensive" */}
          {showDiscountOffer && (
            <div className="mt-6 p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200 rounded-2xl shadow-lg">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl">🎉</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-emerald-900 mb-3 leading-tight">
                    Wait! We have a special offer for you!
                  </h4>
                  <p className="text-emerald-800 mb-4 leading-relaxed">
                    We understand cost is a concern. How about a{' '}
                    <span className="font-bold bg-emerald-100 px-2 py-1 rounded-md text-emerald-900">
                      5% discount
                    </span>{' '}
                    on your next billing cycle?
                  </p>

                  {!couponCode && !discountApplied && (
                    <div className="flex">
                      <button
                        onClick={handleRedeemDiscount}
                        disabled={applyingDiscount}
                        className={`w-full px-6 py-3 rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-center shadow-sm hover:shadow-md ${
                          applyingDiscount
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 transform hover:scale-105'
                        }`}
                      >
                        {applyingDiscount ? (
                          <>
                            <CircularProgress
                              size={16}
                              sx={{ color: 'white', marginRight: 1 }}
                            />
                            Redeeming Discount...
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
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                              />
                            </svg>
                            Redeem Discount & Keep Site
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {couponCode && (
                    <>
                      <div className="bg-white p-4 rounded-xl border-2 border-dashed border-emerald-300 mb-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-emerald-800">
                            Your Discount Code:
                          </span>
                          <div className="flex items-center">
                            <code className="bg-gradient-to-r from-emerald-100 to-green-100 px-3 py-2 rounded-lg text-emerald-900 font-mono font-bold text-lg border border-emerald-200">
                              {couponCode}
                            </code>
                            <Tooltip title={copyTooltip} arrow>
                              <button
                                onClick={handleCopyCode}
                                className="ml-3 text-emerald-600 hover:text-emerald-800 transition-all duration-200 p-2 rounded-lg hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300"
                              >
                                <Copy size={18} />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                      <div className="bg-emerald-100 rounded-xl p-3 border border-emerald-200">
                        <p className="text-sm text-emerald-800 text-center font-medium">
                          🎯 Use this code at checkout to get your 5% discount!
                        </p>
                      </div>
                    </>
                  )}

                  {discountApplied && (
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-emerald-100 to-green-100 p-6 rounded-xl mb-4 border-2 border-emerald-200 shadow-sm">
                        <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg
                            className="w-8 h-8 text-white"
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
                        </div>
                        <p className="text-emerald-900 font-bold text-lg mb-2">
                          Discount Applied Successfully!
                        </p>
                        <p className="text-emerald-800 text-sm leading-relaxed">
                          Your 5% discount has been applied to your
                          subscription. Thank you for staying with us!
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                        <p className="text-sm text-emerald-700 font-medium">
                          ⏱️ This modal will close automatically in 10
                          seconds...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-gray-600 text-sm text-center">
            Click <strong className="text-gray-800">Cancel</strong> to return
            without making any changes.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300 hover:shadow-sm"
            disabled={billingLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className={`px-6 py-3 rounded-xl text-white transition-all duration-200 flex items-center font-medium shadow-sm hover:shadow-md ${
              isFormValid && !billingLoading
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transform hover:scale-105'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={billingLoading || !isFormValid}
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Site
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteSiteModal;
