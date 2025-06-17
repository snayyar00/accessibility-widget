import React from 'react'
import { Step, Placement } from "react-joyride"

// Dashboard Tour Steps
export const dashboardTourSteps: Step[] = [
  {
    target: '.dashboard-welcome-banner',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to WebAbility Dashboard! 🎉</h3>
        <p>This is your central hub for managing accessibility compliance. Let's take a quick tour to get you started!</p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  {
    target: '.get-compliant-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Get Compliant 🚀</h3>
        <p>Click here to add new domains and start making your websites accessible. This is where you'll manage all your sites.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.app-sumo-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Get Started with your App Sumo Sites 🚀</h3>
        <p>Click here to add new domains and redeem your App Sumo sites.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.analytics-cards',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Analytics Overview 📊</h3>
        <p>Here you can see key metrics including impressions, unique visitors, and widget interactions. These help you understand your accessibility widget's impact.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.analytics-dashboard',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Detailed Analytics 📈</h3>
        <p>Dive deeper into your accessibility data with detailed charts and insights. Track your progress over time and see how your accessibility improvements are performing.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
];

// Add Domain Tour Steps (Unified Tour)
export const addDomainTourSteps: Step[] = [
  // Step 1: Banner (always available)
  {
    target: '.add-domain-banner',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to Domain Management! 🎉</h3>
        <p>Let's add your first domain to start making your website accessible. Click the "Get Compliant Now" button to begin!</p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  // Step 2: Domain input (only show if modal is open)
  {
    target: '.domain-input-field',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Enter Your Domain 🌐</h3>
        <p>Type your website's domain name here (e.g., example.com). This is the website you want to make accessible.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  // Step 3: Trial options
  {
    target: '.trial-buttons-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Trial Option 🎯</h3>
        <p>You have three options: 30-day trial with card, 15-day trial without card, or skip trial and buy directly. Choose what works best for you!</p>
      </div>
    ),
    placement: 'top' as Placement,
    disableBeacon: true,
  },
  // Step 4: AppSumo notice
  {
    target: '.appsumo-notice',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">AppSumo Customers 💰</h3>
        <p>If you have an AppSumo coupon, click "Skip trial & buy" and you'll be able to enter your coupon code in the next step!</p>
      </div>
    ),
    placement: 'top' as Placement,
    disableBeacon: true,
  },
  // Step 5: Skip trial button
  {
    target: '.skip-trial-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Skip Trial & Buy 🚀</h3>
        <p>Click this button to proceed directly to plan selection. Perfect for AppSumo customers or if you're ready to purchase immediately!</p>
      </div>
    ),
    placement: 'top' as Placement,
    disableBeacon: true,
  },
  // Step 6: Coupon input (only show if payment view is active)
  {
    target: '.coupon-input-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Enter Your Coupon Code 🎫</h3>
        <p>If you have an AppSumo coupon or any discount code, enter it here and click "Apply Coupon" to get your discount!</p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  // Step 7: Plan selection
  {
    target: '.plan-selection-area',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Plan 📋</h3>
        <p>Select the plan that best fits your needs. The pricing will automatically adjust based on any coupons you've applied.</p>
      </div>
    ),
    placement: 'top' as Placement,
    disableBeacon: true,
    floaterProps: {
      disableFlip: true,
      offset: 20,
      styles: {
        floater: {
          filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.5))'
        }
      }
    },
  },
  // Step 8: Final checkout
  {
    target: '.checkout-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Complete Your Purchase 💳</h3>
        <p>Click "Checkout" to proceed to Stripe's secure payment page. After payment, you'll return here with your domain activated!</p>
      </div>
    ),
    placement: 'top' as Placement,
    disableBeacon: true,
  },
];

// Installation Tour Steps
export const installationTourSteps: Step[] = [
  {
    target: '.installation-welcome-banner',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to Widget Installation! 🎉</h3>
        <p>This page will help you install the WebAbility widget on your website. Let's walk through the process step by step!</p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  {
    target: '.installation-guide-link',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Installation Guide 📖</h3>
        <p>Click here to access our comprehensive installation guide with platform-specific instructions for WordPress, Shopify, and more!</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.widget-customization-options',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Customize Your Widget ⚙️</h3>
        <p>Choose where the accessibility widget appears on your site and select the language. These settings will be reflected in your installation code.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.installation-instructions',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Installation Instructions 📋</h3>
        <p>For best results, paste the installation code right before the closing &lt;/body&gt; tag on your website. This ensures optimal performance.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.installation-code-block',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Your Installation Code 💻</h3>
        <p>This is your personalized installation code. It includes your selected position and language settings. Copy this code to install on your website.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.copy-code-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Copy to Clipboard 📋</h3>
        <p>Click this button to copy the installation code to your clipboard. Then paste it into your website's HTML before the closing &lt;/body&gt; tag.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.expand-code-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Expand Code View 🔍</h3>
        <p>Use this button to expand or compress the code view for better readability when working with longer code snippets.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
];

// Accessibility Scanner Tour Steps
export const accessibilityTourSteps: Step[] = [
  {
    target: '.accessibility-page-header',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to Accessibility Scanner! 🎉</h3>
        <p>This powerful tool helps you evaluate your website's accessibility compliance in seconds. Let's explore how to use it!</p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  {
    target: '.search-bar-container',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Enter Your Domain 🌐</h3>
        <p>Type any website domain here to scan for accessibility issues. You can test your own site or any other website for WCAG compliance.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.search-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Start Free Scan 🚀</h3>
        <p>Click this button to begin the accessibility analysis. Our AI-powered scanner will check for WCAG 2.1 compliance issues across the website.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.accessibility-card:first-child',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Compliance Status 📊</h3>
        <p>This card shows whether the website meets accessibility standards. Green indicates compliance, while red shows non-compliance with WCAG guidelines.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.accessibility-score-card',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Accessibility Score 📈</h3>
        <p>The accessibility score shows the percentage of compliance with WCAG 2.1 AA standards. Higher scores indicate better accessibility.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.lawsuit-risk-card',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Lawsuit Risk Assessment ⚖️</h3>
        <p>This gauge shows the legal risk level based on accessibility violations. Low risk means better protection from accessibility lawsuits.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.webability-toggle-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">See WebAbility Results 🔄</h3>
        <p>Toggle this switch to see how your accessibility score would improve with WebAbility widget installed on your website.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.accessibility-issues-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Detailed Issue Analysis 🔍</h3>
        <p>This section provides a comprehensive breakdown of accessibility issues found, categorized by type and severity level.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.print-report-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Generate Report 📄</h3>
        <p>Click here to generate a printable accessibility report that you can share with your team or use for compliance documentation.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
];

// Problem Reports Tour Steps
export const reportsTourSteps: Step[] = [
  {
    target: '.reports-page-header',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to Problem Reports! 🎉</h3>
        <p>This page helps you manage and track issues reported across all your websites. Let's explore the features available!</p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  {
    target: '.reports-filter-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Filter Reports 🔍</h3>
        <p>Use this filter to view specific types of problems. You can filter by all problems, site bugs, or accessibility issues to focus on what needs attention.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.reports-search-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Search by Site URL 🌐</h3>
        <p>Enter a website URL here to find all problems reported for that specific site. This helps you quickly locate issues for particular domains.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
];

// Widget Customization Tour Steps
export const customizeWidgetTourSteps: Step[] = [
  {
    target: '.customize-widget-header',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to Widget Customization! 🎨</h3>
        <p>This powerful interface lets you fully customize your accessibility widget's appearance and features. Let's explore all the customization options available!</p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  {
    target: '.domain-selection-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Your Domain 🌐</h3>
        <p>First, choose which website you want to customize the widget for. Each domain can have its own unique widget settings and appearance.</p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.widget-preview-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Live Widget Preview 👀</h3>
        <p className="mb-3">Watch your changes come to life in real-time! This preview shows exactly how your accessibility widget will look and function on your website. Here's what you can see:</p>
        <ul className="text-sm space-y-2">
          <li><strong>🎨 Header Section:</strong> Widget title with customizable background, text colors, and control buttons</li>
          <li><strong>🔧 Accessibility Features:</strong> All enabled accessibility tools like screen reader, contrast options, and font adjustments</li>
          <li><strong>🎯 Interactive Elements:</strong> Buttons, dropdowns, and toggles that respond to your customization changes</li>
          <li><strong>📱 Real-time Updates:</strong> Colors, fonts, and features update instantly as you make changes</li>
          <li><strong>🖼️ Logo Display:</strong> Your custom logo appears exactly as it will on your website</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">Try making changes in the customization panel to see them reflected here!</p>
      </div>
    ),
    placement: 'right' as Placement,
  },
  {
    target: '.widget-customization-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Customization Controls ⚙️</h3>
        <p className="mb-3">This panel contains all the tools you need to personalize your widget. Here's what you can customize:</p>
        <ul className="text-sm space-y-2">
          <li><strong>🎨 Color Customization:</strong> Match your brand colors by customizing header, footer, button, and menu colors</li>
          <li><strong>📸 Logo Upload:</strong> Add your company logo via file upload or URL to maintain brand consistency</li>
          <li><strong>🔗 Logo & Statement Links:</strong> Set custom URLs for your logo and accessibility statement links</li>
          <li><strong>📝 Typography:</strong> Choose from web-safe fonts to match your site's typography</li>
          <li><strong>🔧 Feature Toggles:</strong> Enable/disable specific accessibility features based on your needs</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">Scroll through this panel to explore all customization options!</p>
      </div>
    ),
    placement: 'right' as Placement,
  },
  {
    target: '.save-reset-buttons',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Save Your Changes 💾</h3>
        <p>Your Changes get saved automatically. However you can manually save your customizations as well! You can also reset everything back to default settings if you want to start over.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
];

// Export all tour steps as a combined object for easy access
export const allTourSteps = {
  dashboard: dashboardTourSteps,
  addDomain: addDomainTourSteps,
  installation: installationTourSteps,
  accessibility: accessibilityTourSteps,
  reports: reportsTourSteps,
  customizeWidget: customizeWidgetTourSteps,
};

// Tour keys mapping for localStorage management
export const tourKeys = {
  dashboard: 'dashboard_tour',
  addDomain: 'add_domain_unified_tour',
  installation: 'installation_tour',
  accessibility: 'accessibility_tour',
  reports: 'reports_tour',
  customizeWidget: 'customize_widget_tour',
} as const;

// Helper function to get tour steps by key
export const getTourStepsByKey = (key: keyof typeof allTourSteps): Step[] => {
  return allTourSteps[key] || [];
};

// Helper function to get tour key by route path
export const getTourKeyByRoute = (pathname: string): keyof typeof tourKeys | null => {
  if (pathname === '/dashboard' || pathname === '/') {
    return 'dashboard';
  } else if (pathname === '/add-domain') {
    return 'addDomain';
  } else if (pathname.includes('/installation')) {
    return 'installation';
  } else if (pathname === '/accessibility-test') {
    return 'accessibility';
  } else if (pathname === '/problem-reports') {
    return 'reports';
  } else if (pathname === '/customize-widget') {
    return 'customizeWidget';
  }
  return null;
};