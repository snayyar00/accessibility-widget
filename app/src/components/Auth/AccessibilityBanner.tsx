import React from 'react';

const AccessibilityBanner: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-end justify-end pointer-events-none" style={{ overflow: 'hidden' }}>
      {/* Main content card - positioned at bottom-right, constrained to image boundaries */}
      <div className="relative z-10 pointer-events-auto" style={{ 
        marginRight: '5%',
        marginBottom: '8%',
        maxWidth: 'min(640px, calc(90% - 10%))',
        width: 'auto'
      }}>
        <div
          className="p-10 relative"
          style={{
            borderRadius: '16px',
            background: '#2F3451',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Learn more button - white, overlapping top-right corner, extends into background */}
          <button
            className="absolute -top-2 -right-2 bg-white rounded-lg px-6 py-3 font-medium hover:bg-blue-50 transition-all duration-200 cursor-pointer"
            style={{
              fontSize: '14px',
              color: '#445AE7',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
              fontFamily: 'inherit',
            }}
            onClick={(e) => {
              e.preventDefault();
              // Add navigation or action here if needed
            }}
          >
            Learn more
          </button>

          {/* Title - white text at top */}
          <h2 className="text-[34px] mb-5 pr-28 leading-[1.2]" style={{ color: '#FFF' }}>
            Accessibility for Everyone
          </h2>

          {/* Body text - smaller white text below title */}
          <p className="text-[15px] leading-[1.6]" style={{ color: 'rgba(255, 255, 255, 0.80)' }}>
            WebAbility creates inclusive digital experiences, making websites and apps accessible to everyone, regardless of ability. We remove barriers so all users can navigate and engage with ease.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityBanner;

