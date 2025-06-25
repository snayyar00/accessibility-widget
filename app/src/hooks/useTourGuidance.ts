import { useLocation } from 'react-router-dom';

// Tour key mapping based on current route
const getTourKeyFromRoute = (pathname: string): string | null => {
  if (pathname === '/dashboard' || pathname === '/') {
    return 'dashboard_tour';
  } else if (pathname === '/add-domain') {
    return 'add_domain_unified_tour';
  } else if (pathname.includes('/installation')) {
    return 'installation_tour';
  } else if (pathname === '/scanner') {
    return 'accessibility_tour';
  } else if (pathname === '/problem-reports') {
    return 'reports_tour';
  } else if (pathname === '/customize-widget') {
    return 'customize_widget_tour';
  } else if (pathname === '/statement-generator') {
    return 'statement_generator_tour';
  }
  return null;
};

// All tour keys for reset functionality
const ALL_TOUR_KEYS = [
  'dashboard_tour_completed',
  'add_domain_unified_tour_completed', 
  'installation_tour_completed',
  'accessibility_tour_completed',
  'reports_tour_completed',
  'customize_widget_tour_completed',
  'statement_generator_tour_completed'
];

export const useTourGuidance = () => {
  const location = useLocation();
  
  // Get current page's tour key
  const getCurrentTourKey = (): string | null => {
    return getTourKeyFromRoute(location.pathname);
  };

  // Reset all tour statuses
  const resetAllTours = () => {
    ALL_TOUR_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
  };

  // Start current page tour by triggering a custom event
  const startCurrentPageTour = () => {
    const tourKey = getCurrentTourKey();
    if (tourKey) {
      // Dispatch custom event that TourGuide components can listen to
      const event = new CustomEvent('startTour', { 
        detail: { tourKey } 
      });
      window.dispatchEvent(event);
    }
  };

  // Main function to reset all tours and start current page tour
  const resetAndStartTour = () => {
    resetAllTours();
    // Small delay to ensure localStorage is cleared before starting tour
    setTimeout(() => {
      startCurrentPageTour();
    }, 100);
  };

  // Check if current page has a tour available
  const hasCurrentPageTour = (): boolean => {
    return getCurrentTourKey() !== null;
  };

  return {
    resetAndStartTour,
    hasCurrentPageTour,
    getCurrentTourKey
  };
}; 