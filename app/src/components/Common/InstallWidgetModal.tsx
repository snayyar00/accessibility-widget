import React, { useRef, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { baseColors } from '@/config/colors';

interface InstallWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueScan?: () => void;
  domain?: string;
}

const InstallWidgetModal: React.FC<InstallWidgetModalProps> = ({
  isOpen,
  onClose,
  onContinueScan,
  domain,
}) => {
  const history = useHistory();
  const modalRef = useRef<HTMLDivElement>(null);

  const handleInstallClick = () => {
    onClose();
    history.push('/installation');
  };

  const handleContinueScan = () => {
    onClose();
    if (onContinueScan) {
      onContinueScan();
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }

    return undefined;
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
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
                <FaExclamationTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Install Widget Required</h3>
                <p className="text-white/90 text-sm font-medium">
                  Your site has no protection
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-all duration-200 hover:scale-105"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8">
          <div className="mb-6">
            <p className="text-gray-700 text-base mb-4">
              {domain ? (
                <>
                  Your site <strong>{domain}</strong> is currently set to{' '}
                  <strong>"No protection"</strong>.
                </>
              ) : (
                <>
                  Your site is currently set to <strong>"No protection"</strong>.
                </>
              )}
            </p>
            <p className="text-gray-600 text-sm mb-4">
              To ensure your website is protected from accessibility lawsuits, we
              recommend installing the WebAbility widget before scanning.
            </p>
            <div
              className="rounded-lg p-4 mb-4"
              style={{
                backgroundColor: '#FEF3F2',
                border: '1px solid #EF4444',
              }}
            >
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> You can still proceed with the scan, but
                installing the widget will provide better protection and automated
                fixes.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
              style={{
                backgroundColor: '#EF4444',
              }}
            >
              Install Widget
            </button>
            <button
              onClick={handleContinueScan}
              className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 border-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: baseColors.grayBorder,
                color: baseColors.grayText,
              }}
            >
              Continue Scan
            </button>
          </div>
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

export default InstallWidgetModal;

