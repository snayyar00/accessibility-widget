import React from 'react';
import { useDispatch } from 'react-redux';
import { FaCheckCircle } from 'react-icons/fa';
import { closeModal } from '@/features/report/reportSlice';
import Modal from './Modal';

interface ReportSuccessModalProps {
  isOpen: boolean;
  reportData?: {
    url?: string;
  };
}

const ReportSuccessModal: React.FC<ReportSuccessModalProps> = ({
  isOpen,
  reportData,
}) => {
  const dispatch = useDispatch();

  const handleOpenReport = () => {
    if (reportData?.url) {
      const newTab = window.open(reportData.url, '_blank');
      if (newTab) newTab.focus();
    }
    dispatch(closeModal());
  };

  const handleClose = () => {
    dispatch(closeModal());
  };

  return (
    <Modal isOpen={isOpen}>
      <div className="p-8 text-center relative">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-5 h-5 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="mb-6">
          <FaCheckCircle size={64} color="green" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Report Generated Successfully!
          </h2>
          <p className="text-gray-600">
            Your accessibility report is ready to view.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleOpenReport}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Open Report
          </button>
          <button
            onClick={handleClose}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportSuccessModal;
