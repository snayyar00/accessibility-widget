import React, { useState, useEffect } from 'react';
import Joyride, {
  CallBackProps,
  STATUS,
  ACTIONS,
  Step,
  Placement,
} from 'react-joyride';

interface TourGuideProps {
  /** Array of tour steps to display */
  steps: Step[];
  /** Whether the tour should run automatically for new users */
  autoStart?: boolean;
  /** Unique key for localStorage to track completion */
  tourKey: string;
  /** Callback when tour is completed or skipped */
  onTourComplete?: () => void;
  /** Whether data/content is still loading */
  isLoading?: boolean;
  /** Custom styling for the tour */
  customStyles?: any;
  /** Custom locale for button text */
  customLocale?: any;
  /** Delay before starting tour (ms) */
  startDelay?: number;
  /** Current UI state to help filter relevant steps */
  currentState?: {
    isModalOpen?: boolean;
    isPaymentView?: boolean;
  };
  /** Initial step index to start the tour at */
  initialStepIndex?: number;
}

const TourGuide: React.FC<TourGuideProps> = ({
  steps,
  autoStart = true,
  tourKey,
  onTourComplete,
  isLoading = false,
  customStyles,
  customLocale,
  startDelay = 1000,
  currentState = {},
  initialStepIndex = 0,
}) => {
  const [runTour, setRunTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(initialStepIndex);
  const [waitingForModal, setWaitingForModal] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);

  // Check if user has completed this tour
  const isCompleted = localStorage.getItem(`${tourKey}_completed`) === 'true';
  const isNewUser = !isCompleted;

  // Listen for global tour start events
  useEffect(() => {
    const handleStartTour = (event: CustomEvent) => {
      if (event.detail.tourKey === tourKey) {
        // Reset completion status and start tour
        localStorage.removeItem(`${tourKey}_completed`);

        // Use startStep if provided, otherwise use initialStepIndex
        const stepIndex =
          event.detail.startStep !== undefined
            ? event.detail.startStep
            : initialStepIndex;
        setTourStepIndex(stepIndex);
        setRunTour(true);
      }
    };

    window.addEventListener('startTour', handleStartTour as EventListener);
    return () => {
      window.removeEventListener('startTour', handleStartTour as EventListener);
    };
  }, [tourKey, initialStepIndex]);

  // Default styles for the tour using theme colors
  const defaultStyles = {
    options: {
      primaryColor: '#0080FF', // Use theme primary color
      textColor: '#333',
      backgroundColor: '#fff',
      overlayColor: 'rgba(0, 0, 0, 0.4)',
      spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
      beaconSize: 36,
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: '8px',
      fontSize: '14px',
      // Keep tooltip within viewport width
      maxWidth: 'min(400px, calc(100vw - 24px))',
      width: 'auto',
      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
      boxSizing: 'border-box' as const,
    },
    tooltipContainer: {
      textAlign: 'left' as const,
      maxWidth: '100%',
      overflowWrap: 'anywhere' as const,
    },
    buttonNext: {
      backgroundColor: '#0080FF', // Use theme primary color
      fontSize: '14px',
      padding: '8px 16px',
      borderRadius: '6px',
    },
    buttonBack: {
      color: '#666',
      fontSize: '14px',
      padding: '8px 16px',
    },
    buttonSkip: {
      color: '#999',
      fontSize: '12px',
    },
    floater: {
      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
    },
  };

  // Dynamic locale based on tour progress
  const getDynamicLocale = () => {
    return {
      back: 'Previous',
      close: 'Close',
      last: 'Finish',
      next: 'Next',
      open: 'Open the dialog',
      skip: 'Skip tour',
    };
  };

  // Handle tour callback
  const handleTourCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    // Handle close button (X) click
    if (action === ACTIONS.CLOSE) {
      // Mark tour as completed and stop the tour
      localStorage.setItem(`${tourKey}_completed`, 'true');
      setRunTour(false);
      setWaitingForModal(false);
      setWaitingForPayment(false);

      // Call completion callback if provided
      if (onTourComplete) {
        onTourComplete();
      }
      return;
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Mark tour as completed (same behavior for both finish and skip)
      localStorage.setItem(`${tourKey}_completed`, 'true');
      setRunTour(false);
      setWaitingForModal(false);
      setWaitingForPayment(false);

      // Call completion callback if provided (same for both finish and skip)
      if (onTourComplete) {
        onTourComplete();
      }
      return;
    }

    if (type === 'step:after') {
      let nextIndex;

      // Check if user clicked the back button
      if (action === 'prev') {
        nextIndex = index - 1;
        // Don't go below 0
        if (nextIndex < 0) {
          nextIndex = 0;
        }
      } else {
        // Default behavior for next button
        nextIndex = index + 1;
      }

      // If we've reached the last step, finish the tour
      if (nextIndex >= steps.length) {
        localStorage.setItem(`${tourKey}_completed`, 'true');
        setRunTour(false);
        setWaitingForModal(false);
        setWaitingForPayment(false);

        if (onTourComplete) {
          onTourComplete();
        }
        return;
      }

      // Only apply special state-based logic if currentState is provided (add-domain tour) and moving forward
      if (
        action !== 'prev' &&
        currentState &&
        (currentState.hasOwnProperty('isModalOpen') ||
          currentState.hasOwnProperty('isPaymentView'))
      ) {
        // If we're at step 0 (banner) and next would be step 1 (modal), wait for modal to open
        if (index === 0 && !currentState.isModalOpen) {
          setWaitingForModal(true);
          setRunTour(false);
          return;
        }
        // If we're at step 4 (skip trial button) and next would be step 5 (coupon input), wait for payment view
        else if (index === 4 && !currentState.isPaymentView) {
          setWaitingForPayment(true);
          setRunTour(false);
          return;
        }
      }

      // Normal progression for all tours or when conditions are met
      setTourStepIndex(nextIndex);
    }
  };

  // Auto-restart tour when UI state changes
  useEffect(() => {
    if (waitingForModal && currentState.isModalOpen) {
      // Modal just opened, continue to step 1
      setWaitingForModal(false);
      setTimeout(() => {
        setRunTour(true);
        setTourStepIndex(1); // Start at step 1 (domain input)
      }, 500);
    }
  }, [waitingForModal, currentState.isModalOpen]);

  useEffect(() => {
    if (waitingForPayment && currentState.isPaymentView) {
      // Payment view opened, wait for coupon input to be available
      setWaitingForPayment(false);

      const checkAndStartPaymentTour = () => {
        const couponInput = document.querySelector('.coupon-input-section');
        const planSelection = document.querySelector('.plan-selection-area');

        if (couponInput && planSelection) {
          setRunTour(true);
          setTourStepIndex(5); // Start at step 5 (coupon input)
          console.log('Payment tour starting at step 5 - elements ready');
        } else {
          console.log('Payment elements not ready, retrying...', {
            couponInput: !!couponInput,
            planSelection: !!planSelection,
          });
          setTimeout(checkAndStartPaymentTour, 100);
        }
      };

      // Start checking immediately, no delay
      checkAndStartPaymentTour();
    }
  }, [waitingForPayment, currentState.isPaymentView]);

  // Start tour for new users
  useEffect(() => {
    if (autoStart && isNewUser && !isLoading && steps.length > 0) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        setRunTour(true);
      }, startDelay);

      return () => clearTimeout(timer);
    }
    return () => {};
  }, [autoStart, isNewUser, isLoading, steps.length, startDelay]);

  // Don't render if no steps provided or steps is empty
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      callback={handleTourCallback}
      continuous={true}
      run={runTour}
      stepIndex={Math.min(tourStepIndex, steps.length - 1)}
      steps={steps}
      showProgress={true}
      showSkipButton={true}
      styles={customStyles || defaultStyles}
      locale={customLocale || getDynamicLocale()}
    />
  );
};

export default TourGuide;
