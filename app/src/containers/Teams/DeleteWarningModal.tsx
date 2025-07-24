import { RootState } from '@/config/store';
import { CircularProgress, Tooltip } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Copy } from 'lucide-react';
import { toast } from 'react-toastify';
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
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={billingLoading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg mx-4 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Confirm Site Deletion
        </h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Please tell us why you're deleting this site:
          </h3>

          <div className="space-y-3">
            {reasons.map((reason) => (
              <div key={reason.id} className="flex items-start">
                <input
                  type="radio"
                  id={reason.id}
                  name="deleteReason"
                  value={reason.id}
                  checked={selectedReason === reason.id}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <label
                  htmlFor={reason.id}
                  className="ml-3 text-sm text-gray-700 cursor-pointer"
                >
                  {reason.label}
                </label>
              </div>
            ))}
          </div>

          {selectedReason === 'other' && (
            <div className="mt-4">
              <textarea
                placeholder="Please specify your reason..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 resize-none h-20 text-sm"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {otherReason.length}/500 characters
              </p>
            </div>
          )}

          {/* Discount Offer for "Too Expensive" */}
          {showDiscountOffer && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-center">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-green-800 mb-2">
                    🎉 Wait! We have a special offer for you!
                  </h4>
                  <p className="text-green-700 mb-3">
                    We understand cost is a concern. How about a{' '}
                    <strong>5% discount</strong> on your next billing cycle?
                  </p>

                  {!couponCode && !discountApplied && (
                    <div className="flex">
                      <button
                        onClick={handleRedeemDiscount}
                        disabled={applyingDiscount}
                        className={`w-full px-4 py-2 rounded-md transition-colors duration-200 text-sm flex items-center justify-center ${
                          applyingDiscount
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
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
                          'Redeem Discount & Keep Site'
                        )}
                      </button>
                    </div>
                  )}

                  {couponCode && (
                    <>
                      <div className="bg-white p-3 rounded-md border-2 border-dashed border-green-300 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Discount Code:
                          </span>
                          <div className="flex items-center">
                            <code className="bg-gray-100 px-2 py-1 rounded text-green-700 font-mono font-bold">
                              {couponCode}
                            </code>
                            <Tooltip title={copyTooltip} arrow>
                              <button
                                onClick={handleCopyCode}
                                className="ml-2 text-green-600 hover:text-green-800 transition-colors duration-200 p-1 rounded hover:bg-green-50"
                              >
                                <Copy size={16} />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-green-700 text-center">
                        Use this code at checkout to get your 5% discount!
                      </p>
                    </>
                  )}

                  {discountApplied && (
                    <div className="text-center">
                      <div className="bg-green-100 p-3 rounded-md mb-3">
                        <p className="text-green-800 font-semibold">
                          ✅ Discount Applied Successfully!
                        </p>
                        <p className="text-green-700 text-sm mt-1">
                          Your 5% discount has been applied to your
                          subscription.
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        This modal will close automatically in 10 seconds...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-700 mb-4 text-sm">
          Click <strong>Cancel</strong> to return without making any changes.
        </p>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-200"
            disabled={billingLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className={`px-6 py-2 rounded-md text-white transition-colors duration-200 flex items-center ${
              isFormValid && !billingLoading
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={billingLoading || !isFormValid}
          >
            {billingLoading ? (
              <>
                <CircularProgress
                  className="-ml-1 mr-5"
                  size={25}
                  sx={{ color: 'white' }}
                />
                Processing...
              </>
            ) : (
              'Delete Site'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteSiteModal;
