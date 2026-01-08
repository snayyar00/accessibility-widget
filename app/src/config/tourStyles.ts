export const defaultTourStyles = {
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
    // Prevent overflow on small screens
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
