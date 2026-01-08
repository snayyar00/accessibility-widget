import React, { useState, useRef, useEffect } from 'react';
import { FaEnvelope, FaTimes, FaCheck, FaMagic } from 'react-icons/fa';
import { CircularProgress } from '@mui/material';
import { getErrorMessage } from '@/helpers/error.helper';

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
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const handleSendEmail = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      // Focus the input so screen reader can announce the error via aria-describedby
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
      return;
    }

    setEmailError('');
    setStatusAnnouncement('Sending email... Loading.');

    try {
      await onSubmit(email);

      if (showSuccessState) {
        setSendSuccess(true);
        setStatusAnnouncement(`${successTitle} ${successDescription}`);
      } else {
        setStatusAnnouncement('');
      }
      // If not showing success state, parent component handles the feedback
    } catch (error) {
      console.error('Error sending email:', error);
      // Extract the actual error message from GraphQL errors
      const errorMessage = getErrorMessage(error, 'Failed to send email. Please try again.');
      setStatusAnnouncement('');
      setEmailError(errorMessage);
      // Focus the input so screen reader can announce the error via aria-describedby
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
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
        setStatusAnnouncement('');
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

  // Handle escape key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the modal
    const getFocusableElements = (): HTMLElement[] => {
      if (!modalRef.current) return [];
      
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el) => {
        // Filter out elements that are not visible
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    };

    // Move focus to the first focusable element (or email input if available)
    const focusableElements = getFocusableElements();
    const firstFocusable = emailInputRef.current || focusableElements[0];
    
    if (firstFocusable) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        firstFocusable.focus();
      }, 100);
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        handleModalClose();
      }
    };

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      // Only trap focus if the active element is within the modal
      if (!modalRef.current?.contains(document.activeElement as Node)) {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // If Shift + Tab on first element, move to last element
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // If Tab on last element, move to first element
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      
      // Restore focus to previously focused element when modal closes
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, isLoading]);

  // Announce loading state when parent toggles isLoading
  useEffect(() => {
    if (isLoading) {
      setStatusAnnouncement('Sending email. Please wait.');
    }
  }, [isLoading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4"
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-auto overflow-hidden flex flex-col"
        style={{
          animation: 'slideUp 0.3s ease-out',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          maxHeight: 'calc(100vh - 16px)',
          maxWidth: 'calc(100vw - 16px)',
          minWidth: '280px',
        }}
      >
        {/* Modal Header */}
        <div
          className="p-4 sm:p-8 text-white relative overflow-hidden flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #3A4FD1 0%, #3D7A9E 100%)',
          }}
        >
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
          </div>

          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 flex-shrink-0">
                <FaEnvelope className="w-5 h-5 sm:w-7 sm:h-7" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="modal-title" className="text-base sm:text-xl font-bold mb-0.5 sm:mb-1 truncate">{title}</h2>
                <p id="modal-description" className="text-white text-xs sm:text-sm font-medium line-clamp-2" style={{ color: '#FFFFFF' }}>
                  {description}
                </p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={handleModalClose}
              disabled={isLoading}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl backdrop-blur-sm border flex items-center justify-center transition-all duration-200 disabled:opacity-50 hover:scale-105 flex-shrink-0"
              aria-label="Close"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <FaTimes 
                className="w-4 h-4 sm:w-5 sm:h-5" 
                aria-hidden="true"
                style={{ color: '#111827' }}
              />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 min-h-0">
          {/* Status announcement region - announces loading and success states */}
          <div
            role="status"
            aria-live="assertive"
            aria-atomic="true"
            className="sr-only"
            id="email-status-announcement"
          >
            {statusAnnouncement}
          </div>

          {!sendSuccess ? (
            <>
              <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4" style={{ color: '#374151' }}>
                Fields marked with an asterisk (*) are required.
              </p>
              <div className="mb-4 sm:mb-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-gray-800 mb-3"
                >
                  Email Address <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={emailInputRef}
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:outline-none transition-all duration-200 text-gray-800 font-medium email-input ${
                      emailError
                        ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 focus:border-[#445AE7] focus:ring-4 focus:ring-[#445AE7]/20'
                    }`}
                    disabled={isLoading}
                    required
                    aria-describedby={emailError ? 'email-error' : 'email-help'}
                    aria-invalid={!!emailError}
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
                    <FaEnvelope className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
                <p id="email-help" className="sr-only">
                  Enter the email address where you want to receive the toolkit.
                </p>
                {emailError && (
                  <p 
                    id="email-error" 
                    className="text-red-500 text-sm mt-2 font-medium flex items-center gap-1" 
                    role="alert"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <span className="w-1 h-1 bg-red-500 rounded-full" aria-hidden="true"></span>
                    {emailError}
                  </p>
                )}
              </div>

              {bulletPoints && bulletPoints.length > 0 && (
                <div
                  className="rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-8 border-2"
                  style={{
                    background:
                      'linear-gradient(135deg, #F8FBFF 0%, #E8F4FD 100%)',
                    borderColor: '#E1F0F7',
                  }}
                >
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-3 text-base">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#445AE7' }}
                    >
                      <FaMagic className="w-4 h-4 text-white" aria-hidden="true" />
                    </div>
                    What you'll receive:
                  </h3>
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
                ref={sendButtonRef}
                onClick={handleSendEmail}
                disabled={isLoading || !email.trim()}
                aria-busy={isLoading}
                aria-describedby={isLoading ? 'loading-announcement' : undefined}
                className="w-full py-3 sm:py-4 px-4 sm:px-6 text-white rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
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
                      aria-hidden="true"
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaEnvelope className="w-5 h-5" aria-hidden="true" />
                    Send Email
                  </>
                )}
              </button>
              {isLoading && (
                <div
                  id="loading-announcement"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="sr-only"
                >
                  Loading. Sending email.
                </div>
              )}
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
                <FaCheck className="w-10 h-10 text-white" aria-hidden="true" />
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
        
        #email::placeholder,
        .email-input::placeholder {
          color: #4B5563 !important; /* Gray-600 - 7:1 contrast ratio on white (WCAG AAA compliant, exceeds 4.5:1 requirement) */
          opacity: 1;
        }
        
        #email:focus::placeholder,
        .email-input:focus::placeholder {
          color: #4B5563 !important;
        }
      `}</style>
    </div>
  );
};

export default InstallationEmailModal;
