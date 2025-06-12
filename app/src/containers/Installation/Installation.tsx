import React, { useState } from 'react';
import accessibilityBannerImage from '../../assets/images/accessibilityBannerImage.png'
import CodeContainer from './CodeContainer';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import TourGuide from '@/components/Common/TourGuide';
import { Step, Placement } from 'react-joyride';
import { defaultTourStyles } from '@/config/tourStyles';

export default function Installation({ domain }: any) {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.installation') });
  function getCodeString(uniqueToken: string): string {
    return `<script src="https://widget.webability.io/widget.min.js" defer></script>`;
  }

  const [codeString] = useState(getCodeString(''));

  // Installation tour steps
  const installationTourSteps: Step[] = [
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

  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Installation tour completed!');
  };

  return (
    <>
      <TourGuide
        steps={installationTourSteps}
        tourKey="installation_tour"
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />
      
      <div className="flex flex-col items-center w-full px-4 py-4">
        <div className='installation-welcome-banner rounded-xl bg-[#B1D4DB] w-full p-4 flex items-center justify-between'>
          <div className='w-2/3 pr-4'>
            <h1 className='text-2xl sm:text-3xl text-sapphire-blue font-bold'>Install WebAbility Widget</h1>
            <p className='text-sm sm:text-base mt-2 font-medium'>Easily install the WebAbility widget on your website to enhance its accessibility in seconds!</p>
            
            <a 
              href="https://www.webability.io/installation" 
              className='installation-guide-link mt-3 inline-flex items-center px-3 py-1 bg-sapphire-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition duration-300 shadow-md'
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
              Installation Guide
            </a>
          </div>
          <img src={accessibilityBannerImage} className='w-1/3 max-h-32 object-contain' alt="Improved Accessibility with Webability.io" />
        </div>

        <CodeContainer codeString={codeString} />
      </div>
    </>
  )
}