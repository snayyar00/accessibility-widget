export const defaultTourStyles = {
  options: {
    primaryColor: '#0052CC', // Matches buttonNext backgroundColor for consistency
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
    backgroundColor: '#0052CC', // Contrast-compliant primary
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
