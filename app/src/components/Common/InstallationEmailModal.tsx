import React, { useState, useRef, useEffect } from 'react';
import { FaEnvelope, FaTimes, FaCheck, FaMagic } from 'react-icons/fa';
import { CircularProgress } from '@mui/material';

interface BulletPoint {
  text: string;
}

interface InstallationEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  isLoading?: boolean;
  title?: string;
  description?: string;
  bulletPoints?: BulletPoint[];
  showSuccessState?: boolean; // Whether to show success inside modal or use external handling
  successTitle?: string;
  successDescription?: string;
}

const InstallationEmailModal: React.FC<InstallationEmailModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  title = 'Send via Email',
  description = "We'll email you the complete setup",
  bulletPoints = [
    { text: 'Complete documentation' },
    { text: 'Step-by-step instructions' },
    { text: 'Configuration options' },
    { text: 'Troubleshooting tips' },
  ],
  showSuccessState = true,
  successTitle = 'Email Sent Successfully!',
  successDescription = 'Check your inbox for the information.',
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const validateEmail = (email: string) => {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const handleSendEmail = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');

    try {
      await onSubmit(email);

      if (showSuccessState) {
        setSendSuccess(true);
      }
      // If not showing success state, parent component handles the feedback
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailError('Failed to send email. Please try again.');
    }
  };

  const handleModalClose = () => {
    if (!isLoading) {
      onClose();
      // Reset states after a delay to allow for smooth transition
      setTimeout(() => {
        setEmail('');
        setEmailError('');
        setSendSuccess(false);
      }, 300);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isLoading
      ) {
        handleModalClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }

    return undefined;
  }, [isOpen, isLoading]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        handleModalClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{
          animation: 'slideUp 0.3s ease-out',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Modal Header */}
        <div
          className="p-8 text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #445AE7 0%, #4A8BB5 100%)',
          }}
        >
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
          </div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                <FaEnvelope className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">{title}</h3>
                <p className="text-white/90 text-sm font-medium">
                  {description}
                </p>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              disabled={isLoading}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-all duration-200 disabled:opacity-50 hover:scale-105"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8">
          {!sendSuccess ? (
            <>
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-gray-800 mb-3"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="Enter your email address"
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:outline-none transition-all duration-200 text-gray-800 font-medium placeholder-gray-400 ${
                      emailError
                        ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 focus:border-[#445AE7] focus:ring-4 focus:ring-[#445AE7]/20'
                    }`}
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#FAFBFC',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email.trim() && !isLoading) {
                        handleSendEmail();
                      }
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <FaEnvelope className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                {emailError && (
                  <p className="text-red-500 text-sm mt-2 font-medium flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {emailError}
                  </p>
                )}
              </div>

              {bulletPoints && bulletPoints.length > 0 && (
                <div
                  className="rounded-2xl p-6 mb-8 border-2"
                  style={{
                    background:
                      'linear-gradient(135deg, #F8FBFF 0%, #E8F4FD 100%)',
                    borderColor: '#E1F0F7',
                  }}
                >
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-3 text-base">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#445AE7' }}
                    >
                      <FaMagic className="w-4 h-4 text-white" />
                    </div>
                    What you'll receive:
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-3 font-medium">
                    {bulletPoints.map((point, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#445AE7' }}
                        ></div>
                        {point.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleSendEmail}
                disabled={isLoading || !email.trim()}
                className="w-full py-4 px-6 text-white rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background:
                    isLoading || !email.trim()
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #445AE7 0%, #4A8BB5 100%)',
                  boxShadow:
                    isLoading || !email.trim()
                      ? 'none'
                      : '0 10px 25px -5px rgba(85, 158, 193, 0.4), 0 4px 6px -2px rgba(85, 158, 193, 0.1)',
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress
                      size={20}
                      color={'inherit'}
                      className="w-5 h-5"
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaEnvelope className="w-5 h-5" />
                    Send Email
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                style={{
                  background:
                    'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
                }}
              >
                <FaCheck className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                {successTitle}
              </h3>
              <p className="text-gray-600 text-lg font-medium">
                {successDescription}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default InstallationEmailModal;
