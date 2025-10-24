import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
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
  type: 'Widget' | 'App';
  date: string;
  title: string;
  description: string;
  link: string;
}

interface WhatsNewModalProps {
  autoShow?: boolean;
}

const newsData: NewsItem[] = [
  {
    id: '1',
    type: 'Widget',
    date: '2025.10.15',
    title: 'New Widget Interface is Here',
    description:
      'Our widget just got a major refresh faster, cleaner, and easier to use! Plus, check out our new Widget Customization Page to personalize colors, layout, and placement in just a few clicks.',
    link: '/widget-selection',
  },
  {
    id: '2',
    type: 'App',
    date: '2025.10.15',
    title: 'Experience Our Refreshed App Design',
    description:
      'The WebAbility App just got a modern upgrade! Enjoy improved navigation, a refined layout, and a smoother overall experience across all your devices',
    link: 'https://app.webability.io',
  },
  {
    id: '3',
    type: 'App',
    date: '2025.10.20',
    title: 'Earn Rewards by Referring Others',
    description:
      'We’ve integrated with Rewardful! Now you can easily share WebAbility and earn commissions for every referral that joins. Invite friends, grow your network, and get rewarded it’s that simple',
    link: 'https://webability.getrewardful.com/signup',
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
  const location = useLocation();
  const history = useHistory();
  const [isClosing, setIsClosing] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // Auto-show logic for when user logs in
  useEffect(() => {
    if (!autoShow) return;
    const latestDate = getLatestNewsDate();
    if (lastSeenDate === latestDate) return;

    const isOnDashboard =
      location.pathname === '/' || location.pathname === '/dashboard';
    let cleanup: (() => void) | undefined;

    // If dashboard tour is due (not completed) and we're on dashboard, wait for completion
    try {
      const dashboardTourCompleted =
        localStorage.getItem('dashboard_tour_completed') === 'true';
      if (isOnDashboard && !dashboardTourCompleted) {
        const handleTourCompleted = (e: Event) => {
          const detail = (e as CustomEvent).detail as { tourKey?: string };
          if (detail?.tourKey === 'dashboard_tour') {
            // Open modal shortly after tour finishes
            setTimeout(() => dispatch(openModal()), 800);
          }
        };
        window.addEventListener(
          'tourCompleted',
          handleTourCompleted as EventListener,
        );
        cleanup = () =>
          window.removeEventListener(
            'tourCompleted',
            handleTourCompleted as EventListener,
          );
        return cleanup;
      }
    } catch {}

    const timer = setTimeout(() => {
      dispatch(openModal());
    }, 1500);
    cleanup = () => clearTimeout(timer);
    return cleanup;
  }, [autoShow, lastSeenDate, dispatch, location.pathname]);

  // Launch animation effect
  useEffect(() => {
    if (isModalOpen && !isClosing) {
      // Small delay to ensure initial state is rendered before starting animation
      const startTimer = setTimeout(() => {
        setIsLaunching(true);
      }, 1000);

      // Reset launching state after animation completes
      const resetTimer = setTimeout(() => {
        setIsLaunching(false);
      }, 1220); // 10ms delay + 1200ms animation

      return () => {
        clearTimeout(startTimer);
        clearTimeout(resetTimer);
      };
    }
    return undefined;
  }, [isModalOpen, isClosing]);

  const handleClose = () => {
    setIsClosing(true);
    // Delay the actual close to allow animation to complete
    setTimeout(() => {
      const latestDate = getLatestNewsDate();
      dispatch(markUpdatesAsSeen(latestDate));
      setIsClosing(false);
    }, 300);
  };

  if (!isModalOpen && !isClosing) return null;

  // Determine if we should show the modal
  const shouldShowModal = isModalOpen || isClosing;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ease-out ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      data-modal="whats-new"
    >
      {/* Blurred Backdrop */}
      <div
        className={`absolute inset-0 backdrop-blur-sm transition-all duration-500 ease-out ${
          isClosing ? 'bg-black/0' : 'bg-black/30'
        }`}
        onClick={handleClose}
      />

      {/* Rocket Trail Effect */}
      {isLaunching && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-screen bg-gradient-to-b from-orange-400 via-yellow-400 to-transparent opacity-60 animate-pulse duration-[1200ms]" />
      )}

      {/* Rocket Particles */}
      {isLaunching && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 bg-yellow-400 rounded-full animate-bounce`}
              style={{
                left: `${20 + i * 10}%`,
                top: '0%',
                animationDelay: `${i * 0.15}s`,
                animationDuration: '1.2s',
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden border border-gray-100 transform transition-all ${
          isLaunching
            ? 'duration-[1200ms] ease-out scale-100 opacity-100'
            : isClosing
            ? 'duration-300 ease-in scale-95 opacity-0'
            : !isLaunching && !isClosing
            ? 'scale-100 opacity-100'
            : 'scale-0 opacity-0'
        }`}
      >
        {/* Header with blue background */}
        <div className="bg-[#465ce4] text-white p-6 relative overflow-hidden">
          {/* Subtle pattern overlay for better text clarity */}
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                What's <span className="text-blue-100 drop-shadow-sm">New</span>
              </h2>
              <p className="text-white/90 text-sm mt-1 font-medium drop-shadow-sm">
                Stay updated with our latest features
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white hover:text-white hover:bg-white/20 rounded-full transition-all duration-200 drop-shadow-sm"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          <div className="space-y-6">
            {newsData.map((item, index) => (
              <div key={item.id} className="relative group">
                {/* Card container with hover effects */}
                <div
                  className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 group-hover:transform group-hover:scale-[1.02] cursor-pointer"
                  onClick={() => {
                    if (item.link.startsWith('/')) {
                      handleClose();
                      history.push(item.link);
                    } else {
                      window.open(item.link, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (item.link.startsWith('/')) {
                        handleClose();
                        history.push(item.link);
                      } else {
                        window.open(item.link, '_blank', 'noopener,noreferrer');
                      }
                    }
                  }}
                  aria-label={`Click to learn more about ${item.title}`}
                >
                  {/* Date and Type Badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${
                        item.type === 'Widget'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">
                      {item.date}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-900 mb-3 leading-tight">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
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
