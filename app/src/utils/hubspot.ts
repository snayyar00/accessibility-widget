/**
 * HubSpot Chat Widget Utilities
 * Provides functions to interact with the HubSpot chat widget
 */

// Extend the Window interface to include HubSpot chat methods
declare global {
  interface Window {
    HubSpotConversations?: {
      widget: {
        open: () => void;
        close: () => void;
        toggle: () => void;
        load: () => void;
        remove: () => void;
        refresh: () => void;
        status: () => {
          loaded: boolean;
          widgetOpen: boolean;
        };
      };
    };
    hsConversationsAPI?: {
      requestWidgetOpen: () => void;
      requestWidgetClose: () => void;
    };
  }
}

/**
 * Opens the HubSpot chat widget
 * Falls back to email if HubSpot is not available
 */
export const openHubSpotChat = (): void => {
  try {
    // Try the newer API first
    if (window.HubSpotConversations?.widget?.open) {
      console.log('Opening HubSpot chat widget');
      window.HubSpotConversations.widget.open();
      return;
    }

    // Fallback to older API
    if (window.hsConversationsAPI?.requestWidgetOpen) {
      console.log('Opening HubSpot chat widget (legacy API)');
      window.hsConversationsAPI.requestWidgetOpen();
      return;
    }

    // If HubSpot is not available, fallback to email
    console.warn('HubSpot chat widget not available, falling back to email');
    openSupportEmail();
  } catch (error) {
    console.error('Error opening HubSpot chat:', error);
    // Fallback to email on error
    openSupportEmail();
  }
};

/**
 * Opens the default email client with support email
 * Includes a pre-filled subject line for better user experience
 */
export const openSupportEmail = (): void => {
  const subject = encodeURIComponent('Support Request - WebAbility.io');
  const body = encodeURIComponent('Hello WebAbility.io Support Team,\n\nI need assistance with:\n\n[Please describe your issue here]\n\nThank you!');
  const mailtoUrl = `mailto:support@webability.io?subject=${subject}&body=${body}`;
  
  try {
    window.open(mailtoUrl, '_blank');
    console.log('Opened email client for support');
  } catch (error) {
    console.error('Error opening email client:', error);
    // Ultimate fallback - copy email to clipboard if possible
    if (navigator.clipboard) {
      navigator.clipboard.writeText('support@webability.io').then(() => {
        alert('Email client could not be opened. Support email (support@webability.io) has been copied to your clipboard.');
      }).catch(() => {
        alert('Please contact support at: support@webability.io');
      });
    } else {
      alert('Please contact support at: support@webability.io');
    }
  }
};

/**
 * Checks if HubSpot chat widget is loaded and available
 */
export const isHubSpotChatAvailable = (): boolean => {
  return !!(
    window.HubSpotConversations?.widget ||
    window.hsConversationsAPI
  );
};

/**
 * Waits for HubSpot chat widget to load with a timeout
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export const waitForHubSpotChat = (timeout: number = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkAvailability = () => {
      if (isHubSpotChatAvailable()) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime >= timeout) {
        resolve(false);
        return;
      }
      
      setTimeout(checkAvailability, 100);
    };
    
    checkAvailability();
  });
};
