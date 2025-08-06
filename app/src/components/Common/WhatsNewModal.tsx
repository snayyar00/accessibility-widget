import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  markUpdatesAsSeen,
  closeModal,
  openModal,
} from '@/features/whatsNew/whatsNewSlice';
import type { RootState } from '@/config/store';

interface NewsItem {
  id: string;
  type: 'Plugins' | 'App';
  date: string;
  title: string;
  description: string;
}

interface WhatsNewModalProps {
  autoShow?: boolean;
}

const newsData: NewsItem[] = [
  {
    id: '1',
    type: 'App',
    date: '2025.07.21',
    title: 'Notification Settings Added',
    description:
      'Customize alerts for reports, new domains, issues, and onboarding help.',
  },
  {
    id: '2',
    type: 'App',
    date: '2025.07.25',
    title: 'Prospect Report Launched',
    description:
      'View a short, easy-to-read version of the full prospect report.',
  },
  {
    id: '3',
    type: 'App',
    date: '2025.8.01',
    title: 'Proof of Effort Toolkit Added',
    description:
      'Download, view, or send a ZIP file containing all 3 accessibility PDFs.',
  },
];

// Helper function to get the latest news date
const getLatestNewsDate = (): string => {
  return newsData[0]?.date || '';
};

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ autoShow = false }) => {
  const dispatch = useDispatch();
  const { isModalOpen, lastSeenDate } = useSelector(
    (state: RootState) => state.whatsNew,
  );

  // Auto-show logic for when user logs in
  useEffect(() => {
    if (autoShow) {
      const latestDate = getLatestNewsDate();
      if (lastSeenDate !== latestDate) {
        // Simple delay to ensure the app is fully loaded, then open modal
        const timer = setTimeout(() => {
          dispatch(openModal());
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [autoShow, lastSeenDate, dispatch]);

  const handleClose = () => {
    const latestDate = getLatestNewsDate();
    dispatch(markUpdatesAsSeen(latestDate));
  };

  if (!isModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-modal="whats-new"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            News & <span className="text-blue-500">Updates</span>
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-6">
            {newsData.map((item, index) => (
              <div key={item.id} className="relative">
                {/* Date and Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                      item.type === 'Plugins'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {item.type}
                  </span>
                  <span className="text-sm text-gray-500">{item.date}</span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>

                {/* Divider (except for last item) */}
                {index < newsData.length - 1 && (
                  <div className="mt-6 border-b border-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
export { getLatestNewsDate };
