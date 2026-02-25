import React, { useState } from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { useMutation } from '@apollo/client';
import RESEND_VERIFICATION from '../../queries/auth/resendVerification';
import { toast } from 'sonner';

interface EmailVerificationBannerProps {
  email: string; // Make optional since we'll use the mutation
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  email,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Set up the mutation
  const [resendVerification, { error: resendError }] = useMutation(
    RESEND_VERIFICATION,
    {
      onCompleted: () => {
        setResendSuccess(true);
        toast.success('Verification email sent successfully!');
      },
      onError: (error) => {
        toast.error(
          error.message ||
            'Failed to send verification email. Please try again.',
        );
      },
    },
  );

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      await resendVerification();

      setResendSuccess(true);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="text-white w-full" style={{ backgroundColor: '#0052CC' }}>
      <div className="container mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2 lg:gap-0">
        <div className="flex items-center space-x-3">
          <FaExclamationTriangle className="text-white h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium max-w-full lg:max-w-none overflow-hidden text-ellipsis">
              Your email ({email}) is not verified.
            </p>
            {resendSuccess ? (
              <p className="text-sm text-green-300">
                Verification email sent! Please check your inbox.
              </p>
            ) : null}
            {resendError && (
              <p className="text-sm text-red-300">
                Error: {resendError.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-2 lg:mt-0">
          <button
            onClick={handleResend}
            disabled={isResending}
            className="px-2 py-1.5 bg-white hover:bg-gray-100 text-primary rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full lg:w-auto"
          >
            {isResending ? 'Sending...' : 'Resend verification email'}
          </button>

          <button
            onClick={handleDismiss}
            className="text-white hover:text-gray-200"
            aria-label="Dismiss"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
