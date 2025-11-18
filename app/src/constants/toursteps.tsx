import React from 'react';
import { Step, Placement } from 'react-joyride';

// Dashboard Tour Steps - Function to generate steps with organization name
export const getDashboardTourSteps = (organizationName: string = 'WebAbility'): Step[] => [
  {
    target: '.dashboard-welcome-banner',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Welcome to {organizationName} Dashboard! 🎉
        </h3>
        <p>
          This is your central hub for managing accessibility compliance. Let's
          take a quick tour to get you started!
        </p>
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
        <p>
          Click here to add new domains and start making your websites
          accessible. This is where you'll manage all your sites.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.app-sumo-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Get Started with your App Sumo Sites 🚀
        </h3>
        <p>Click here to add new domains and redeem your App Sumo sites.</p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.analytics-metrics-card',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Key Metrics Overview 📊</h3>
        <p>
          Here you can see your most important metrics: impressions, unique
          visitors, and widget interactions. These help you understand your
          accessibility widget's impact on your website.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.analytics-dashboard',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Analytics Dashboard 📈</h3>
        <p>
          View detailed engagement and impression trends over time. Use the time
          range selector to switch between weekly, monthly, and yearly views.
          This is your complete analytics dashboard where you can track
          engagement rates, impressions, and detailed accessibility metrics.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Tour Complete! 🎉</h3>
        <p>
          You're all set! You now know how to navigate your {organizationName}
          dashboard. Start by adding domains, monitor your analytics, and make
          your websites accessible to everyone. Need help? Check out our
          documentation or contact support.
        </p>
      </div>
    ),
    placement: 'center' as Placement,
    disableBeacon: true,
  },
];

// Backward compatibility - export default steps
export const dashboardTourSteps = getDashboardTourSteps();

// Add Domain Tour Steps (Unified Tour)
export const addDomainTourSteps: Step[] = [
  // Step 1: Banner (always available)
  {
    target: '.add-domain-banner',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Welcome to Domain Management! 🎉
        </h3>
        <p>
          Let's add your first domain to start making your website accessible.
          Click the "Get Compliant Now" button to begin!
        </p>
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
        <p>
          Type your website's domain name here (e.g., example.com). This is the
          website you want to make accessible.
        </p>
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
        <h3 className="text-lg font-semibold mb-2">
          Choose Your Trial Option 🎯
        </h3>
        <p>
          You have three options: 30-day trial with card, 15-day trial without
          card, or skip trial and buy directly. Choose what works best for you!
        </p>
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
        <p>
          If you have an AppSumo coupon, click "Skip trial & buy" and you'll be
          able to enter your coupon code in the next step!
        </p>
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
        <p>
          Click this button to proceed directly to plan selection. Perfect for
          AppSumo customers or if you're ready to purchase immediately!
        </p>
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
        <h3 className="text-lg font-semibold mb-2">
          Enter Your Coupon Code 🎫
        </h3>
        <p>
          If you have an AppSumo coupon or any discount code, enter it here and
          click "Apply Coupon" to get your discount!
        </p>
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
        <p>
          Select the plan that best fits your needs. The pricing will
          automatically adjust based on any coupons you've applied.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
    disableBeacon: true,
    floaterProps: {
      disableFlip: true,
      offset: 20,
      styles: {
        floater: {
          filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.5))',
        },
      },
    },
  },
  // Step 8: Final checkout
  {
    target: '.checkout-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Complete Your Purchase 💳
        </h3>
        <p>
          Click "Checkout" to proceed to Stripe's secure payment page. After
          payment, you'll return here with your domain activated!
        </p>
      </div>
    ),
    placement: 'top' as Placement,
    disableBeacon: true,
  },
];

// Installation Tour Steps - Function to generate steps with organization name
export const getInstallationTourSteps = (organizationName: string = 'WebAbility'): Step[] => [
  {
    target: '.installation-welcome-banner',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Welcome to Widget Installation! 🎉
        </h3>
        <p>
          This page will help you install the {organizationName} widget on your website.
          Let's walk through the process step by step!
        </p>
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
        <p>
          Click here to access our comprehensive installation guide with
          platform-specific instructions for WordPress, Shopify, and more!
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.customize-widget-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Customize Your Widget ⚙️</h3>
        <p>
          This button opens customization options where you can choose where the
          accessibility widget appears on your site and select the language.
          These settings will be reflected in your installation code.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.widget-customization-options',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Widget Settings ⚙️</h3>
        <p>
          Here you can customize your widget's position, language, and icon
          type. These settings will automatically update your installation code
          below.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
    hideCloseButton: false,
  },
  {
    target: '.installation-instructions',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Installation Instructions 📋
        </h3>
        <p>
          For best results, paste the installation code right before the closing
          &lt;/body&gt; tag on your website. This ensures optimal performance.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.installation-code-block',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Your Installation Code 💻
        </h3>
        <p>
          This is your personalized installation code. It includes your selected
          position and language settings. Copy this code to install on your
          website.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.copy-code-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Copy to Clipboard 📋</h3>
        <p>
          Click this button to copy the installation code to your clipboard.
          Then paste it into your website's HTML before the closing
          &lt;/body&gt; tag.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Tour Complete! 🎉</h3>
        <p>
          You're all set! You now know how to install the {organizationName} widget on
          your website. The customization options allow you to tailor the widget
          to your needs, and the installation code is ready to be added to your
          website. Need help? Check out our documentation or contact support.
        </p>
      </div>
    ),
    placement: 'center' as Placement,
    disableBeacon: true,
  },
];

// Backward compatibility - export default steps
export const installationTourSteps = getInstallationTourSteps();

// Accessibility Scanner Tour Steps
export const accessibilityTourSteps: Step[] = [
  {
    target: '.accessibility-page-header',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Welcome to Accessibility Scanner! 🎉
        </h3>
        <p>
          This powerful tool helps you evaluate your website's accessibility
          compliance in seconds. Let's explore how to use it!
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  {
    target: '.search-bar-container',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Select Or Enter Your Domain 🌐
        </h3>
        <p>
          Type any website domain here to scan for accessibility issues. You can
          test your own website by selecting it from the dropdown or any other
          website for WCAG compliance.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.scan-type-selector',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Scan Speed ⚡</h3>
        <p>
          Select between "Faster (Use saved data)" for quick results using
          cached data, or "Slower (Do full scan)" for a fresh, comprehensive
          analysis. Choose based on your needs!
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.full-site-scan-checkbox',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Full Site Scan Option 🔍</h3>
        <p>
          Enable this checkbox to scan your entire website, including all linked
          pages, for comprehensive accessibility analysis. When unchecked, only
          the homepage will be scanned.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.search-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Start Free Scan 🚀</h3>
        <p>
          Click this button to begin the accessibility analysis. Our AI-powered
          scanner will check for WCAG 2.1 compliance issues across the website.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.accessibility-issues-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Audit History Table 🔍</h3>
        <p>
          This section provides a table of audit reports for the selected
          domain, organized by the date and time of the scan. It includes
          information on the compliance status and accessibility score for each
          report, allowing for easy tracking and review of the domain's
          accessibility performance over time.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.print-report-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          View or Download Report 📄
        </h3>
        <p>
          Click the View button for the respective row to open the report in a
          new tab. Click the Download button to save the accessibility report as
          a PDF, which you can then share with your team or use for compliance
          documentation.
        </p>
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
        <h3 className="text-lg font-semibold mb-2">
          Welcome to Problem Reports! 🎉
        </h3>
        <p>
          This page helps you manage and track issues reported across all your
          websites. Let's explore the features available!
        </p>
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
        <p>
          Use this filter to view specific types of problems. You can filter by
          all problems, site bugs, or accessibility issues to focus on what
          needs attention.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.reports-search-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Search by Site URL 🌐</h3>
        <p>
          Enter a website URL here to find all problems reported for that
          specific site. This helps you quickly locate issues for particular
          domains.
        </p>
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
        <h3 className="text-lg font-semibold mb-2">
          Welcome to Widget Customization! 🎨
        </h3>
        <p>
          This powerful interface lets you fully customize your accessibility
          widget's appearance and features. Let's explore the main customization
          options available to make your widget perfectly match your brand!
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  {
    target: '.appearance-tab',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Appearance Tab 🎨</h3>
        <p className="mb-3">
          In the Appearance tab, customize all visual aspects of your widget:
        </p>
        <ul className="text-sm space-y-2">
          <li>🎯 Widget Button Color - Main accessibility icon</li>
          <li>🌓 Light/Dark Mode Colors - Separate color schemes</li>
          <li>📊 Header & Footer - Background and text colors</li>
          <li>🔘 Buttons & Icons - Interactive elements</li>
          <li>🖼️ Logo Upload - Add your branding</li>
          <li>🔤 Font Selection - Typography options</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          Each color has a reset button to restore defaults!
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.preference-tab',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Preference Tab ⚙️</h3>
        <p className="mb-3">
          Click the Preference tab to control which accessibility features
          appear in your widget:
        </p>
        <ul className="text-sm space-y-2">
          <li>♿ Accessibility Profiles - Motor, Visual, Cognitive</li>
          <li>📝 Content Adjustments - Font, spacing, weight</li>
          <li>🎨 Color Adjustments - Contrast, saturation</li>
          <li>🛠️ Tools - Screen reader, dark mode, guides</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          Toggle features on/off to customize functionality!
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.copy-customization-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Copy Customization 📋</h3>
        <p className="mb-3">
          Have multiple domains? Use this button to copy all your customization
          settings from one domain to another. This saves you time and ensures
          consistency across your websites.
        </p>
        <p className="text-sm text-gray-600">
          <strong>💡 Pro Tip:</strong> All appearance and preference settings
          will be copied, including colors, logos, fonts, and feature toggles!
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Tour Complete! 🎉</h3>
        <p className="mb-3">
          You're all set to customize your accessibility widget! Quick recap:
        </p>
        <ul className="text-sm space-y-2">
          <li>
            ✅ Use the Appearance tab to customize colors, logos, and fonts
          </li>
          <li>✅ Use the Preference tab to enable/disable features</li>
          <li>
            ✅ Use Copy Customization to duplicate settings across domains
          </li>
          <li>✅ Changes auto-save after 1 second</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          Need help? Check our documentation or contact support anytime!
        </p>
      </div>
    ),
    placement: 'center' as Placement,
    disableBeacon: true,
  },
];

// Statement Generator Tour Steps
export const statementGeneratorTourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Welcome to AI Accessibility Statement Generator! 🎉
        </h3>
        <p className="mb-3">
          Create professional, WCAG 2.1 AA compliant accessibility statements in
          42+ languages using our advanced AI engine.
        </p>
        <p className="text-sm text-gray-600">
          Let's take a tour to understand all the powerful features!
        </p>
      </div>
    ),
    placement: 'center' as Placement,
    disableBeacon: true,
  },
  {
    target: '.company-form-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Company Information Form 📝
        </h3>
        <p className="mb-3">
          Fill in your company details here. All fields marked with * are
          required to generate a comprehensive accessibility statement.
        </p>
        <ul className="text-sm space-y-1">
          <li>✅ Company Name</li>
          <li>✅ Website URL</li>
          <li>✅ Contact Email</li>
          <li>✅ Industry</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Toggle "Optional Information" to add phone, addresses, and widget
          branding.
        </p>
      </div>
    ),
    placement: 'left' as Placement,
  },
  {
    target: '.language-dropdown-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Language 🌐</h3>
        <p className="mb-3">
          Select from 42+ available languages! The AI will translate your entire
          statement professionally while maintaining legal accuracy and
          technical terminology.
        </p>
        <p className="text-sm text-gray-600">
          💡 <strong>Tip:</strong> Use the search feature to quickly find your
          language.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.generate-button-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Generate AI Statement 🚀</h3>
        <p className="mb-3">
          Click "Generate" to create your professional accessibility statement.
          Our AI will generate industry-standard, legally compliant content
          based on your information.
        </p>
        <p className="text-sm text-gray-600">
          ⏱️ Takes 10-30 seconds depending on the selected language.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.statement-preview-section',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Preview & Format Selection 📄
        </h3>
        <p className="mb-3">
          Your generated statement appears here with three format options:
        </p>
        <ul className="text-sm space-y-1">
          <li>
            📝 <strong>Markdown</strong> - For GitHub, GitLab, CMS
          </li>
          <li>
            💻 <strong>HTML</strong> - Ready for web embedding
          </li>
          <li>
            📄 <strong>Plain Text</strong> - For emails & documents
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Switch formats anytime and use Copy or Download buttons below the
          preview! You can also enhance your statement with additional
          professional features.
        </p>
      </div>
    ),
    placement: 'right' as Placement,
  },
];

// My Sites Tour Steps
export const mySitesTourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to My Sites! 🎉</h3>
        <p>
          This is your command center for managing all your website domains.
          Here you can add new sites, monitor their status, manage
          subscriptions, and keep track of all your accessibility initiatives.
          Let's explore the features!
        </p>
      </div>
    ),
    placement: 'center' as Placement,
    disableBeacon: true,
  },
  {
    target: '.add-domain-banner',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Add New Domains 🌐</h3>
        <p>
          Click the "Get Compliant Now" button to add a new website domain. You
          can add as many domains as your subscription plan allows. Each domain
          will be monitored for accessibility compliance.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.my-sites-tabs',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Site Status Tabs 📑</h3>
        <p className="mb-2">
          Switch between viewing different categories of your sites:
        </p>
        <ul className="text-sm space-y-1">
          <li>
            <strong>All:</strong> Display all domains (default view)
          </li>
          <li>
            <strong>Active sites:</strong> Domains with active subscriptions
          </li>
          <li>
            <strong>Trial sites:</strong> Domains with expired or inactive
            subscriptions
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Use these tabs to organize and manage your domains efficiently.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.my-sites-search',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Search Your Sites 🔍</h3>
        <p>
          Use the search bar to quickly find specific domains. Just start typing
          any part of the domain name, and the list will filter in real-time to
          show matching results.
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.my-sites-table-headers',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Domain Table Columns 📊</h3>
        <p className="mb-2">Your domains are organized with these columns:</p>
        <ul className="text-sm space-y-1">
          <li>
            <strong>Domain:</strong> Your website URL
          </li>
          <li>
            <strong>Plan:</strong> Subscription status (Active, Trial, etc.)
          </li>
          <li>
            <strong>Monitor:</strong> Toggle uptime monitoring on/off
          </li>
          <li>
            <strong>Status:</strong> Current uptime status (Online/Offline)
          </li>
          <li>
            <strong>Actions:</strong> Edit, delete, or activate domains
          </li>
        </ul>
      </div>
    ),
    placement: 'bottom' as Placement,
  },
  {
    target: '.my-sites-domain-row',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Domain Row Details 📝</h3>
        <p>
          Each row represents one of your domains. You can see the domain name,
          its favicon, subscription plan status, monitoring settings, and
          current uptime status all at a glance.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.my-sites-plan-status',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Plan Status Badge 🎯</h3>
        <p className="mb-2">
          This badge shows your domain's current subscription status:
        </p>
        <ul className="text-sm space-y-1">
          <li>
            <strong>Active:</strong> Subscription is active and running
          </li>
          <li>
            <strong>Life Time:</strong> Permanent license (never expires)
          </li>
          <li>
            <strong>Trial:</strong> In trial period
          </li>
          <li>
            <strong>Trial Expired:</strong> Trial ended, needs activation
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Hover over the badge to see more details!
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.my-sites-monitor-toggle',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Monitoring Toggle Switch 🔄
        </h3>
        <p>
          Toggle uptime monitoring on or off for each domain. When enabled,
          we'll continuously check if your website is online and alert you
          immediately if it goes down.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          💡 <strong>Pro Tip:</strong> Enable monitoring for critical sites to
          receive instant downtime alerts!
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.my-sites-status-indicator',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Uptime Status Indicator 📡
        </h3>
        <p className="mb-2">This shows your website's current uptime status:</p>
        <ul className="text-sm space-y-1">
          <li>
            <strong>Online:</strong> Website is responding normally
          </li>
          <li>
            <strong>Offline:</strong> Website is not responding
          </li>
          <li>
            <strong>Checking:</strong> Status check in progress
          </li>
          <li>
            <strong>Monitor off:</strong> Monitoring is disabled
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Hover to see last check time and additional details.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.my-sites-actions',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Action Buttons ⚙️</h3>
        <p className="mb-2">Use these buttons to manage your domains:</p>
        <ul className="text-sm space-y-1">
          <li>
            <strong>Settings Icon:</strong> Edit the domain URL
          </li>
          <li>
            <strong>Trash Icon:</strong> Delete the domain
          </li>
          <li>
            <strong>Activate/Buy:</strong> For trial domains, activate your
            subscription or purchase a plan
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Hover over each button for a helpful tooltip!
        </p>
      </div>
    ),
    placement: 'left' as Placement,
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Tour Complete! 🎉</h3>
        <p className="mb-3">
          You're all set to manage your domains! Here's a quick recap:
        </p>
        <ul className="text-sm space-y-2">
          <li>✅ Add new domains with "Get Compliant Now" button</li>
          <li>✅ Switch between All, Active, and Trial sites tabs</li>
          <li>✅ Search to find specific domains quickly</li>
          <li>✅ Monitor website uptime with toggle switches</li>
          <li>✅ Check subscription status at a glance</li>
          <li>✅ Edit, delete, or activate domains with action buttons</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          💡 <strong>Need help?</strong> Check our documentation or contact
          support anytime!
        </p>
      </div>
    ),
    placement: 'center' as Placement,
    disableBeacon: true,
  },
];

// Proof of Effort Toolkit Tour Steps
export const proofOfEffortTourSteps: Step[] = [
  {
    target: '.poe-title',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Welcome to the Proof of Effort Toolkit 🎉
        </h3>
        <p>
          This toolkit compiles key documentation that demonstrates your
          accessibility efforts. If your website's accessibility is ever
          challenged, you'll have the evidence needed to respond with
          confidence. Let's take a quick tour!
        </p>
      </div>
    ),
    placement: 'bottom' as Placement,
    disableBeacon: true,
  },
  {
    target: '.poe-left-panel',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Document Viewer Panel 📖</h3>
        <p>
          This is your document viewer. When you select a document from the
          right panel, it will appear here for preview. You can navigate between
          documents using the arrow buttons.
        </p>
      </div>
    ),
    placement: 'right' as Placement,
  },
  {
    target: '.poe-send-email-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Send via Email ✉️</h3>
        <p>
          Need to share the toolkit with your legal team or stakeholders? Click
          here to send all documents as a zip file to any email address. Perfect
          for quick sharing!
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.poe-right-panel',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Document Library Panel 📁
        </h3>
        <p>
          This panel shows all available documents in your toolkit. Each card
          displays the document name and creation date. Use the menu button
          (three dots) on each card to view or download individual documents.
        </p>
      </div>
    ),
    placement: 'left' as Placement,
  },
  {
    target: '.poe-documents-list',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Your Documents 📄</h3>
        <p>
          Your toolkit includes three essential documents: an intro guide
          explaining the toolkit, your latest monthly audit report showing
          accessibility compliance, and your accessibility statement
          demonstrating your commitment.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.poe-document-card',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Document Card 🗂️</h3>
        <p>
          Each document card shows the document name and creation date. Click
          the three dots menu button to view or download individual documents.
        </p>
      </div>
    ),
    placement: 'left' as Placement,
  },
  {
    target: '.poe-document-dropdown',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Document Actions Menu ⚙️</h3>
        <p>
          Click this menu button to access document actions. You can preview the
          document in the viewer panel or download it directly to your device.
        </p>
      </div>
    ),
    placement: 'left' as Placement,
  },
  {
    target: '.poe-download-zip-button',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Download Complete Toolkit 📦
        </h3>
        <p>
          Download all documents together as a single zip file. This is perfect
          for keeping a local backup or sharing with your team. All PDFs are
          generated fresh with the latest data.
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
  {
    target: '.poe-documents-count',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Document Count 🔢</h3>
        <p>
          This shows the total number of documents included in your toolkit.
          You're all set to demonstrate your accessibility efforts! 🎊
        </p>
      </div>
    ),
    placement: 'top' as Placement,
  },
];

// Export all tour steps as a combined object for easy access
export const allTourSteps = {
  dashboard: dashboardTourSteps,
  addDomain: addDomainTourSteps,
  mySites: mySitesTourSteps,
  installation: installationTourSteps,
  accessibility: accessibilityTourSteps,
  reports: reportsTourSteps,
  customizeWidget: customizeWidgetTourSteps,
  statementGenerator: statementGeneratorTourSteps,
  proofOfEffort: proofOfEffortTourSteps,
};

// Tour keys mapping for localStorage management
export const tourKeys = {
  dashboard: 'dashboard_tour',
  addDomain: 'add_domain_unified_tour',
  mySites: 'my_sites_tour',
  installation: 'installation_tour',
  accessibility: 'accessibility_tour',
  reports: 'reports_tour',
  customizeWidget: 'customize_widget_tour',
  statementGenerator: 'statement_generator_tour',
  proofOfEffort: 'proof_of_effort_tour',
} as const;

// Helper function to get tour steps by key
export const getTourStepsByKey = (key: keyof typeof allTourSteps): Step[] => {
  return allTourSteps[key] || [];
};

// Helper function to get tour key by route path
export const getTourKeyByRoute = (
  pathname: string,
): keyof typeof tourKeys | null => {
  if (pathname === '/dashboard' || pathname === '/') {
    return 'dashboard';
  } else if (pathname === '/add-domain') {
    return 'mySites'; // Updated to use mySites tour for the main page
  } else if (pathname.includes('/installation')) {
    return 'installation';
  } else if (pathname === '/scanner') {
    return 'accessibility';
  } else if (pathname === '/problem-reports') {
    return 'reports';
  } else if (pathname === '/customize-widget') {
    return 'customizeWidget';
  } else if (pathname === '/statement-generator') {
    return 'statementGenerator';
  } else if (pathname === '/proof-of-effort-toolkit') {
    return 'proofOfEffort';
  }
  return null;
};
