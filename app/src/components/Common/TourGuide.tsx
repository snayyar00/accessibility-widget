import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  /** Callback when tour step changes */
  onStepChange?: (data: CallBackProps) => void;
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
  onStepChange,
  isLoading = false,
  customStyles,
  customLocale,
  startDelay = 1000,
  currentState = {},
  initialStepIndex = 0,
}) => {
  const [runTour, setRunTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(initialStepIndex);
  const [effectiveSteps, setEffectiveSteps] = useState<Step[]>(steps);
  const [waitingForModal, setWaitingForModal] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

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
      primaryColor: '#006BD6', // Matches buttonNext backgroundColor for consistency
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
      backgroundColor: '#006BD6', // Contrast-compliant primary
      color: '#E4F2FF', // 4.53:1 contrast ratio on #006BD6 (WCAG AA compliant)
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
      color: '#595959', // Meets 7:1 contrast on white (WCAG AAA)
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

  // Shared completion handler to keep end-of-tour logic consistent
  const completeTour = useCallback(() => {
    localStorage.setItem(`${tourKey}_completed`, 'true');
    setRunTour(false);
    setWaitingForModal(false);
    setWaitingForPayment(false);

    // Notify listeners that this tour has completed
    try {
      const event = new CustomEvent('tourCompleted', { detail: { tourKey } });
      window.dispatchEvent(event);
    } catch {}

    if (onTourComplete) {
      onTourComplete();
    }
  }, [tourKey, onTourComplete]);

  // Handle tour callback
  const handleTourCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;
    const totalSteps = effectiveSteps.length;

    // Move focus to tooltip when step changes or tour starts
    if (type === 'step:after' || type === 'tour:start') {
      setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 150);
    }

    // Call step change callback if provided
    if (onStepChange) {
      onStepChange(data);
    }

    // Auto-skip steps when targets are missing so the tour keeps progressing
    if (type === 'error:target_not_found') {
      const nextIndex =
        action === ACTIONS.PREV ? Math.max(0, index - 1) : index + 1;

      if (nextIndex >= totalSteps) {
        completeTour();
        return;
      }

      setTourStepIndex(nextIndex);
      return;
    }

    // Handle close button (X) click
    if (action === ACTIONS.CLOSE) {
      completeTour();
      return;
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTour();
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
      if (nextIndex >= totalSteps) {
        completeTour();
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

  // Keep effective steps in sync and drop steps whose targets are missing for static tours
  const shouldFilterMissingTargets =
    !currentState ||
    (!currentState.hasOwnProperty('isModalOpen') &&
      !currentState.hasOwnProperty('isPaymentView'));

  useEffect(() => {
    const alignEffectiveSteps = () => {
      if (!shouldFilterMissingTargets) {
        setEffectiveSteps(steps);
        return;
      }

      const filtered = steps.filter(
        (step) => step.target === 'body' || !!document.querySelector(step.target as string),
      );

      // Fallback to original steps if everything filtered out to avoid empty tour
      setEffectiveSteps(filtered.length > 0 ? filtered : steps);
    };

    // Run immediately and also after small delay to allow DOM paint
    alignEffectiveSteps();
    const timer = setTimeout(alignEffectiveSteps, 300);

    return () => clearTimeout(timer);
  }, [steps, shouldFilterMissingTargets, isLoading, runTour]);

  // Reset index when effective steps change to stay in bounds
  useEffect(() => {
    if (tourStepIndex >= effectiveSteps.length) {
      setTourStepIndex(Math.max(0, effectiveSteps.length - 1));
    }
  }, [effectiveSteps.length, tourStepIndex]);

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

  // Get all focusable elements within the tour tooltip
  const getFocusableElements = useCallback(() => {
    const tooltip = document.querySelector('[data-testid="react-joyride-tooltip"]') || 
                    document.querySelector('.react-joyride__tooltip') ||
                    document.querySelector('[role="dialog"]');
    if (!tooltip) return [];
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    return Array.from(
      tooltip.querySelectorAll<HTMLElement>(selector),
    ).filter(
      (el) =>
        !el.hasAttribute('disabled') &&
        !el.getAttribute('aria-hidden') &&
        el.offsetParent !== null,
    );
  }, []);

  // Focus trap handler - only trap when focus is within tooltip
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!runTour) return;

      // Check if tooltip is actually visible
      const tooltip = document.querySelector('[data-testid="react-joyride-tooltip"]') || 
                      document.querySelector('.react-joyride__tooltip') ||
                      document.querySelector('[role="dialog"]');
      if (!tooltip) return;

      // Only trap if focus is within the tooltip
      const activeElement = document.activeElement;
      if (!tooltip.contains(activeElement)) return;

      // Handle Tab key for focus trapping
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (activeElement === firstElement || activeElement === tooltip) {
            e.preventDefault();
            e.stopPropagation();
            lastElement.focus();
          }
        } else {
          // Tab
          if (activeElement === lastElement) {
            e.preventDefault();
            e.stopPropagation();
            firstElement.focus();
          }
        }
      }
    },
    [runTour, getFocusableElements],
  );

  // Handle focus management when tour starts/stops
  useEffect(() => {
    if (runTour) {
      // Store the previously focused element
      previousActiveElementRef.current =
        document.activeElement as HTMLElement;

      // Focus the tooltip when it appears (with delay to ensure it's rendered)
      const focusTimer = setTimeout(() => {
        const tooltip = document.querySelector('[data-testid="react-joyride-tooltip"]') || 
                        document.querySelector('.react-joyride__tooltip') ||
                        document.querySelector('[role="dialog"]');
        if (tooltip) {
          const focusableElements = getFocusableElements();
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else if (tooltip instanceof HTMLElement) {
            tooltip.setAttribute('tabindex', '-1');
            tooltip.focus();
          }
        }
      }, 300);

      // Add event listeners with a small delay to not interfere with tour initialization
      const listenerTimer = setTimeout(() => {
        document.addEventListener('keydown', handleKeyDown, true);
      }, 100);

      return () => {
        clearTimeout(focusTimer);
        clearTimeout(listenerTimer);
        document.removeEventListener('keydown', handleKeyDown, true);
        // Restore focus to previously focused element
        if (previousActiveElementRef.current) {
          previousActiveElementRef.current.focus();
        }
      };
    }
    return () => {};
  }, [runTour, handleKeyDown, getFocusableElements]);

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
      stepIndex={Math.min(tourStepIndex, effectiveSteps.length - 1)}
      steps={effectiveSteps}
      showProgress={true}
      showSkipButton={true}
      styles={customStyles || defaultStyles}
      locale={customLocale || getDynamicLocale()}
    />
  );
};

export default TourGuide;
