import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { MdWarning, MdDeleteForever, MdClose } from 'react-icons/md';

import { ReactHookFormType } from '@/typeReactHookForm';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Input from '../Common/Input/Input';
import ErrorText from '../Common/ErrorText';

type Props = ReactHookFormType & {
  closeModal?: () => void;
  isOpen: boolean;
  email?: string | null;
  isValid?: boolean;
  loading?: boolean;
  error?: any;
};

const DeleteAccountModal: React.FC<Props> = ({
  closeModal,
  isOpen,
  onSubmit,
  email,
  register,
  errors,
  isValid,
  loading,
  error,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Combined ref callback for email input
  const emailInputCallbackRef = useCallback(
    (element: HTMLInputElement | null) => {
      emailInputRef.current = element;
      register(element);
    },
    [register],
  );

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
      modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors),
    );
  };

  // Handle focus trapping
  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before the modal opened
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Set initial focus to the close button or email input
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Try to focus the close button first, otherwise the email input
      const closeButton = focusableElements.find(
        (el) => el === closeButtonRef.current,
      );
      const emailInput = focusableElements.find(
        (el) => el === emailInputRef.current,
      );
      (closeButton || emailInput || focusableElements[0])?.focus();
    }

    // Handle Tab key trapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the previous element when modal closes
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen}>
      <div ref={modalRef}>
      {/* Header with warning icon */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-[10px] relative">
        <div className="flex items-center gap-3">
          <div className="bg-red-400 bg-opacity-20 p-2 rounded-full">
            <MdWarning className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">{t('Profile.label.delete')}</h2>
        </div>
        <button
          ref={closeButtonRef}
          onClick={closeModal}
          className="absolute top-4 right-4 text-white hover:text-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-500 rounded"
          disabled={loading}
          aria-label="Close"
        >
          <MdClose className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onSubmit}>
        {/* Content */}
        <div className="p-8">
          {/* Warning message */}
          <div className="mb-8">
            <p className="text-gray-700 text-base leading-relaxed mb-4">
              Are you sure you want to delete your account? All of your data
              will be permanently removed. This action cannot be undone.
            </p>

            {/* Email confirmation prompt */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <label
                htmlFor="email"
                className="block text-sm text-gray-600 mb-2 font-medium"
              >
                <Trans
                  components={[<span className="text-red-600 font-bold" />]}
                  values={{ email }}
                >
                  {t('Profile.text.please_enter')}
                </Trans>
              </label>

              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  ref={emailInputCallbackRef}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Enter your email address"
                  autoComplete="email"
                  disabled={loading}
                  aria-describedby="email-error"
                  aria-required="true"
                  aria-invalid={!!errors?.email?.message || !!error}
                />
                <div
                  id="email-error"
                  className="mt-2 text-sm text-red-600"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  aria-relevant="additions text"
                >
                  {errors?.email?.message
                    ? String(t(errors.email.message))
                    : error
                      ? 'Failed to delete account. Please try again.'
                      : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('Common.text.no')}
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                !isValid || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <MdDeleteForever className="w-4 h-4" />
                  {t('Common.text.delete')}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      </div>
    </Modal>
  );
};
export default DeleteAccountModal;
