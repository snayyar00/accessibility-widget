import { Switch } from '@mui/material';
import type React from 'react';
import { Colors, Toggles } from './editWidget';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/new_logo.svg';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { uploadWidgetLogo, deleteWidgetLogo } from '@/utils/uploadLogo';
import {
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Link,
  HelpCircle,
} from 'lucide-react';
import ColorPicker from '@/components/Common/ColorPicker';
import applyMenuColor from './applyMenuColor';

interface CustomizeWidgetProps {
  colors: Colors;
  setColors: React.Dispatch<React.SetStateAction<Colors>>;
  colorMode: 'light' | 'dark';
  setColorMode: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  toggles: Toggles;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
  font: string[];
  selectedFont: string;
  setSelectedFont: React.Dispatch<React.SetStateAction<string>>;
  DefaultColors: Colors;
  onSave: () => void;
  onReset: () => void;
  buttonDisable: boolean;
  selectedSite?: string;
}

const CustomizeWidget: React.FC<CustomizeWidgetProps> = ({
  colors,
  setColors,
  colorMode,
  setColorMode,
  toggles,
  setToggles,
  font,
  setSelectedFont,
  selectedFont,
  DefaultColors,
  onSave,
  onReset,
  buttonDisable,
  selectedSite,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'preference'>(
    'appearance',
  );
  const [livePreview, setLivePreview] = useState(false);
  const [position, setPosition] = useState('bottom-left');
  const [desktopOffset, setDesktopOffset] = useState({
    horizontal: 24,
    vertical: 24,
  });
  const [mobileOffset, setMobileOffset] = useState({
    horizontal: 4,
    vertical: 4,
  });
  const [linkedOffsets, setLinkedOffsets] = useState(true);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    accessibilityProfiles: true,
    contentAdjustments: false,
    colorAdjustments: false,
    tools: false,
  });
  const widgetIframeRef = useRef<HTMLIFrameElement>(null);

  const updateColor = (key: keyof Colors) => (color: string) => {
    setColors((prev) => ({ ...prev, [key]: color }));
  };

  // Helper function to query elements in both light DOM and Shadow DOM
  const queryInWidget = (
    iframeDoc: Document,
    selector: string,
  ): Element | null => {
    // First try to find in light DOM
    let element = iframeDoc.querySelector(selector);
    if (element) return element;

    // Then try to find in Shadow DOM
    const shadowHost = iframeDoc.getElementById('asw-shadow-host');
    if (shadowHost && shadowHost.shadowRoot) {
      element = shadowHost.shadowRoot.querySelector(selector);
      if (element) return element;
    }

    // Also check all shadow roots in the document
    const allElements = iframeDoc.querySelectorAll('*');
    for (let el of allElements) {
      if (el.shadowRoot) {
        element = el.shadowRoot.querySelector(selector);
        if (element) return element;
      }
    }

    return null;
  };

  // Helper function to query all elements in both light DOM and Shadow DOM
  const queryAllInWidget = (
    iframeDoc: Document,
    selector: string,
  ): Element[] => {
    const results: Element[] = [];

    // First check light DOM
    const lightElements = iframeDoc.querySelectorAll(selector);
    results.push(...lightElements);

    // Then check Shadow DOM
    const shadowHost = iframeDoc.getElementById('asw-shadow-host');
    if (shadowHost && shadowHost.shadowRoot) {
      const shadowElements = shadowHost.shadowRoot.querySelectorAll(selector);
      results.push(...shadowElements);
    }

    // Also check all shadow roots in the document
    const allElements = iframeDoc.querySelectorAll('*');
    for (let el of allElements) {
      if (el.shadowRoot) {
        const shadowElements = el.shadowRoot.querySelectorAll(selector);
        results.push(...shadowElements);
      }
    }

    return results;
  };

  // Function to apply logo to widget
  const applyLogoToWidget = (iframeDoc: Document, logoImage: string) => {
    // Find the specific logo container div using Shadow DOM aware query
    const logoContainer = queryInWidget(
      iframeDoc,
      '.asw-footer-logo',
    ) as HTMLElement;

    if (!logoContainer) return;

    // Find the dynamic SVG container
    const dynamicSvgContainer = logoContainer.querySelector(
      '#dynamic-svg',
    ) as HTMLElement;

    if (logoImage) {
      if (dynamicSvgContainer) {
        // Clear the existing SVG content
        dynamicSvgContainer.innerHTML = '';

        // Create a new img element to replace the SVG
        const logoImg = iframeDoc.createElement('img');
        logoImg.src = logoImage;
        logoImg.style.maxWidth = '198px';
        logoImg.style.maxHeight = '47px';
        logoImg.style.objectFit = 'contain';
        logoImg.style.display = 'block';
        logoImg.style.width = '100%';
        logoImg.style.height = '100%';
        logoImg.alt = 'Widget Logo';
        logoImg.className = 'widget-logo';

        // Insert the new logo image into the dynamic SVG container
        dynamicSvgContainer.appendChild(logoImg);

        // Ensure the logo container is visible
        logoContainer.style.display = 'block';
        logoContainer.style.visibility = 'visible';
        logoContainer.style.opacity = '1';
      }
    } else {
      // If no logo image provided, ensure the default logo is still visible
      if (dynamicSvgContainer) {
        // Keep the existing SVG but make sure it's visible
        logoContainer.style.display = 'block';
        logoContainer.style.visibility = 'visible';
        logoContainer.style.opacity = '1';
      }
    }
  };

  // Function to apply footer text to widget
  const applyFooterTextToWidget = (iframeDoc: Document, text: string) => {
    if (!text) return;

    // Find the footer text element using Shadow DOM aware query
    const footerTextElement = queryInWidget(
      iframeDoc,
      '.footer-main-title',
    ) as HTMLElement;

    if (footerTextElement) {
      // Update the text content
      footerTextElement.textContent = text;
    }
  };

  // Function to apply font to widget
  const applyFontToWidget = (iframeDoc: Document, fontFamily: string) => {
    if (!iframeDoc) return;

    // Remove existing custom font style if present
    const existingStyle = iframeDoc.getElementById('custom-widget-font-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Skip if font is set to 'auto' (use website default)
    if (fontFamily === 'auto') {
      return;
    }

    // Create and inject a style tag with maximum specificity selectors
    // Using the same approach as color application for consistency
    const styleElement = iframeDoc.createElement('style');
    styleElement.id = 'custom-widget-font-style';
    styleElement.textContent = `
      /* Maximum specificity selectors to override widget's default fonts */
      .asw-container .asw-menu *,
      .asw-container .asw-widget *,
      .asw-container .asw-panel *,
      
      /* Specific widget elements with high specificity */
      .asw-container .asw-menu .asw-menu-title,
      .asw-container .asw-menu .asw-menu-header,
      .asw-container .asw-menu .asw-menu-content,
      .asw-container .asw-menu .asw-footer,
      .asw-container .asw-menu .asw-btn,
      .asw-container .asw-menu .asw-card-title,
      .asw-container .asw-menu .asw-color-title,
      .asw-container .asw-menu .asw-report-issue-btn,
      .asw-container .asw-menu .asw-selected-lang,
      .asw-container .asw-menu .asw-language-option,
      .asw-container .asw-menu .asw-language-name,
      .asw-container .asw-menu .asw-custom-dropdown-item,
      .asw-container .asw-menu .asw-custom-dropdown-toggle,
      .asw-container .asw-menu .asw-accessprofiles-dropdown-toggle,
      .asw-container .asw-menu .asw-oversize-widget-container,
      .asw-container .asw-menu .asw-header-lang-selector,
      .asw-container .asw-menu .asw-font-size-btn,
      .asw-container .asw-menu .asw-adjust-font,
      .asw-container .asw-menu .asw-structure-item,
      .asw-container .asw-menu .asw-structure-section,
      .asw-container .asw-menu .asw-color-btn,
      .asw-container .asw-menu .asw-filter,
      .asw-container .asw-menu .font-size-text,
      .asw-container .asw-menu .asw-form-text,
      
      /* Form elements with high specificity */
      .asw-container .asw-menu #report-problem-form,
      .asw-container .asw-menu #report-problem-form *,
      .asw-container .asw-menu #report-problem-form label,
      .asw-container .asw-menu #report-problem-form textarea,
      .asw-container .asw-menu #report-problem-form select,
      .asw-container .asw-menu #report-problem-form input,
      
      /* Buttons and interactive elements with high specificity */
      .asw-container .asw-menu button.asw-btn,
      .asw-container .asw-menu button.asw-report-issue-btn,
      .asw-container .asw-menu .asw-cancel-btn,
      .asw-container .asw-menu .submit-button,
      .asw-container .asw-menu .cancel-button,
      .asw-container .asw-menu .issue-type-button,
      .asw-container .asw-menu .asw-info-button,
      
      /* Profile grid with high specificity */
      .asw-container .asw-menu .profile-grid,
      .asw-container .asw-menu .profile-grid *,
      .asw-container .asw-menu .profile-grid .asw-btn,
      
      /* Language selector with high specificity */
      .asw-container .asw-menu .asw-header-lang-selector *,
      .asw-container .asw-menu .asw-lang-dropdown-content,
      .asw-container .asw-menu .asw-lang-dropdown-content *,
      
      /* Color sections with high specificity */
      .asw-container .asw-menu .asw-color-section,
      .asw-container .asw-menu .asw-color-section *,
      
      /* Translate elements with high specificity */
      .asw-container .asw-menu .asw-translate,
      .asw-container .asw-menu span.asw-translate,
      
      /* Modal elements with high specificity */
      .asw-container .asw-menu .asw-confirmation-modal,
      .asw-container .asw-menu .asw-confirmation-modal *,
      .asw-container .asw-menu .asw-modal-title,
      .asw-container .asw-menu .asw-modal-text,
      .asw-container .asw-menu .asw-modal-btn-primary,
      .asw-container .asw-menu .asw-modal-btn-secondary,
      
      /* Additional specific selectors for problematic elements */
      .asw-container .asw-menu .asw-oversize-widget-container .asw-selected-lang,
      .asw-container .asw-menu .asw-accessprofiles-dropdown-toggle .asw-selected-lang,
      .asw-container .asw-menu .asw-header-lang-selector .asw-selected-lang,
      .asw-container .asw-menu .asw-lang-dropdown-content .asw-language-option,
      .asw-container .asw-menu .asw-lang-dropdown-content .asw-language-name,
      
      /* Universal selector as fallback with maximum specificity */
      .asw-container .asw-menu *:not(svg):not(path):not(circle):not(rect):not(line):not(polyline):not(polygon) {
        font-family: ${fontFamily} !important;
      }
    `;

    // Append the style to the iframe's head
    const head = iframeDoc.head || iframeDoc.getElementsByTagName('head')[0];
    if (head) {
      head.appendChild(styleElement);
    }

    // Also apply font directly to existing elements as a backup using Shadow DOM aware queries
    const applyFontToElements = () => {
      const elements = queryAllInWidget(
        iframeDoc,
        '.asw-container .asw-menu *:not(svg):not(path):not(circle):not(rect):not(line):not(polyline):not(polygon)',
      );
      elements.forEach((element: any) => {
        if (element.style) {
          element.style.setProperty('font-family', fontFamily, 'important');
        }
      });
    };

    // Apply font to existing elements immediately
    applyFontToElements();

    // Set up a MutationObserver to apply font to dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node: any) => {
            if (node.nodeType === 1) {
              // Element node
              const elements = node.querySelectorAll
                ? node.querySelectorAll(
                    '*:not(svg):not(path):not(circle):not(rect):not(line):not(polyline):not(polygon)',
                  )
                : [node];

              elements.forEach((element: any) => {
                if (element.style && element.closest('.asw-container')) {
                  element.style.setProperty(
                    'font-family',
                    fontFamily,
                    'important',
                  );
                }
              });
            }
          });
        }
      });
    });

    // Start observing the widget container for changes using Shadow DOM aware query
    const widgetContainer = queryInWidget(iframeDoc, '.asw-container');
    if (widgetContainer) {
      observer.observe(widgetContainer, {
        childList: true,
        subtree: true,
      });
    }
  };

  const resetColor = (key: keyof Colors) => () => {
    setColors((prev) => ({ ...prev, [key]: DefaultColors[key] }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleFeatures = [
    { key: 'language', label: 'Toggle Language' },
    { key: 'darkMode', label: 'Toggle Dark Mode' },
    { key: 'screenReader', label: 'Toggle Screen Reader' },
    { key: 'readingGuide', label: 'Toggle Reading Guide' },
    { key: 'stopAnimations', label: 'Toggle Stop Animations' },
    { key: 'bigCursor', label: 'Toggle Big Cursor' },
    { key: 'voiceNavigation', label: 'Toggle Voice Navigation' },
    { key: 'darkContrast', label: 'Toggle Dark Contrast' },
    { key: 'lightContrast', label: 'Toggle Light Contrast' },
    { key: 'highContrast', label: 'Toggle High Contrast' },
    { key: 'highSaturation', label: 'Toggle High Saturation' },
    { key: 'lowSaturation', label: 'Toggle Low Saturation' },
    { key: 'monochrome', label: 'Toggle Monochrome' },
    { key: 'highlightLinks', label: 'Toggle Highlight Links' },
    { key: 'highlightTitle', label: 'Toggle Highlight title' },
    { key: 'dyslexiaFont', label: 'Toggle Dyslexia Font' },
    { key: 'letterSpacing', label: 'Toggle Letter Spacing' },
    { key: 'lineHeight', label: 'Toggle Line Height' },
    { key: 'fontWeight', label: 'Toggle Font Weight' },
    { key: 'motorImpaired', label: 'Toggle Motor Impaired' },
    { key: 'blind', label: 'Toggle Blind' },
    { key: 'dyslexia', label: 'Toggle Dyslexia' },
    { key: 'visuallyImpaired', label: 'Toggle Visually Impaired' },
    { key: 'cognitiveAndLearning', label: 'Toggle Cognitive & Learning' },
    { key: 'seizureAndEpileptic', label: 'Toggle Seizure & Epileptic' },
    { key: 'colorBlind', label: 'Toggle Color Blind' },
    { key: 'adhd', label: 'Toggle ADHD' },
  ];

  const colorPickers = [
    {
      key: 'colorGroup1',
      label:
        colorMode === 'light' ? 'Primary Text & Icons' : 'Light Text & Icons',
      description:
        colorMode === 'light'
          ? 'Main text, icons, buttons, and interactive elements'
          : 'Light colored text, icons, input text, and numbered buttons',
    },
    {
      key: 'colorGroup2',
      label:
        colorMode === 'light' ? 'Header Text & Icons' : 'Primary Accent Color',
      description:
        colorMode === 'light'
          ? 'Text and icons in the header section'
          : 'Toggle icon, buttons, hover states, selected items, and borders',
    },
    {
      key: 'colorGroup3',
      label:
        colorMode === 'light' ? 'Header Background' : 'Mid-tone Background',
      description:
        colorMode === 'light'
          ? 'Background color of the header section'
          : 'Background for textbox elements in report form',
    },
    {
      key: 'colorGroup4',
      label: colorMode === 'light' ? 'Footer Background' : 'Dark Backgrounds',
      description:
        colorMode === 'light'
          ? 'Background color of the footer section'
          : 'Main widget background, dropdown backgrounds, and card backgrounds',
    },
    {
      key: 'colorGroup5',
      label:
        colorMode === 'light' ? 'Header Button Borders' : 'Light Accent Text',
      description:
        colorMode === 'light'
          ? 'Border color of header buttons'
          : 'Light colored text for buttons and header text',
    },
    {
      key: 'colorGroup6',
      label: colorMode === 'light' ? 'White Backgrounds' : 'Header Background',
      description:
        colorMode === 'light'
          ? 'White backgrounds for widget panel and dropdowns'
          : 'Background color of the header section',
    },
  ];

  const fileInputRef = useRef<HTMLInputElement>(null); // Create a ref for the file input
  const urlInputRef = useRef<HTMLInputElement>(null); // Create a ref for the URL input

  const handleReset = () => {
    setColors((prevColors) => ({
      ...prevColors, // Keep all the previous state values
      logoImage: '', // Reset the logoImage to an empty string
    }));

    // Clear the file input using the ref
    if (fileInputRef.current) {
      (fileInputRef.current as any).value = ''; // Clear the file input field
    }

    // Clear the URL input field using the ref
    if (urlInputRef.current) {
      (urlInputRef.current as any).value = ''; // Clear the URL input field
    }
    setIsFileInput(true);
    setIsUrlInput(true);
  };
  const [isFileInput, setIsFileInput] = useState(true);
  const [isUrlInput, setIsUrlInput] = useState(true);
  const [logoInput, setLogoInput] = useState('');
  const [accessibilityStatementLinkUrl, setAccessibilityStatementLinkUrl] =
    useState(colors.accessibilityStatementLinkUrl);
  const [logoUrl, setLogoUrl] = useState(colors.logoUrl);
  const [footerText, setFooterText] = useState(colors.footerText);

  useEffect(() => {
    setAccessibilityStatementLinkUrl(colors.accessibilityStatementLinkUrl);
    setLogoUrl(colors.logoUrl);
    setFooterText(colors.footerText);
  }, [colors.accessibilityStatementLinkUrl, colors.logoUrl, colors.footerText]);
  const isBase64 = (str: any) => {
    const regex = /^data:image\/(png|jpg|jpeg|gif|bmp);base64,/;
    return regex.test(str);
  };

  // Function to validate URL
  const isValidUrl = (str: any) => {
    const regex =
      /^(http:\/\/|https:\/\/)([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)(\/[a-zA-Z0-9\-._~:?#\[\]@!$&'()*+,;=]*)?$/;
    return regex.test(str);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only PNG, SVG, or WebP images are allowed.');
        e.target.value = ''; // Reset the input field to remove the file name
        return; // Prevent the file from being processed if the type is invalid
      }

      // Validate file size (should not exceed 75 KB)
      if (file.size > 76800) {
        toast.error('File size should not exceed 75 KB.');
        e.target.value = ''; // Reset the input field to remove the file name
        return; // Prevent the file from being processed if the size is too large
      }

      // Show loading state
      toast.loading('Uploading logo...', { id: 'logo-upload' });

      try {
        // Require an explicit selected site
        if (!selectedSite) {
          toast.error('Please select a site before uploading a logo.', { id: 'logo-upload' });
          return;
        }
        const siteUrl = selectedSite;
        
        
        
        // Upload to R2
        const result = await uploadWidgetLogo(file, siteUrl);
        
        if (result.success && result.logoUrl) {
          const cleanUrl = result.logoUrl.replace(/\/$/, '')
          // Update both logoInput and colors.logoImage with the R2 URL
          setLogoInput(cleanUrl);
          setColors((prev) => ({
            ...prev,
            logoImage: cleanUrl!, // Update with R2 URL
          }));
          
          
          
          toast.success('Logo uploaded successfully!', { id: 'logo-upload' });
          
          // Set the input states to reflect the upload
          setIsUrlInput(false);
          setIsFileInput(false); // Disable file input since we have a logo now
        } else {
          toast.error(result.error || 'Failed to upload logo', { id: 'logo-upload' });
          e.target.value = ''; // Reset the input field
        }
      } catch (error) {
        console.error('Error uploading logo:', error);
        toast.error('Failed to upload logo', { id: 'logo-upload' });
        e.target.value = ''; // Reset the input field
      }
    }
  };

  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  // Helper function to get selector-to-color mapping based on color groups
  const getColorMapping = (isDarkMode: boolean) => {
    if (isDarkMode) {
      // Dark mode color group mappings
      return {
        // Color group 1: #d0d5f8 - Light text and icons
        'all-icons-and-text': colors.colorGroup1 || '#d0d5f8',
        'report-issue-input-text': colors.colorGroup1 || '#d0d5f8',
        'header-icons': colors.colorGroup1 || '#d0d5f8',
        'numbered-buttons': colors.colorGroup1 || '#d0d5f8',

        // Color group 2: #465ce4 - Primary accent
        'toggle-icon-color': colors.colorGroup2 || '#465ce4',
        'report-issue-button-background': colors.colorGroup2 || '#465ce4',
        'selected-items': colors.colorGroup2 || '#465ce4',
        'footer-background': colors.colorGroup2 || '#465ce4',
        'all-hover-states': colors.colorGroup2 || '#465ce4',
        'selected-language': colors.colorGroup2 || '#465ce4',
        'header-buttons-border': colors.colorGroup2 || '#465ce4',
        'all-border-lines': colors.colorGroup2 || '#465ce4',

        // Color group 3: #232e72 - Mid-tone background
        'report-issue-textbox-background': colors.colorGroup3 || '#232e72',

        // Color group 4: #111639 - Dark backgrounds
        'report-issue-card-dropdown-background':
          colors.colorGroup4 || '#111639',
        'widget-background': colors.colorGroup4 || '#111639',
        'dropdown-backgrounds': colors.colorGroup4 || '#111639',

        // Color group 5: #e6f2f2 - Light accent text
        'report-issue-buttons': colors.colorGroup5 || '#e6f2f2',
        'header-text': colors.colorGroup5 || '#e6f2f2',

        // Color group 6: #333d7c - Header background
        'header-background': colors.colorGroup6 || '#333d7c',

        // Static colors (not customizable)
        'progress-bars': '#ffffff',
        'toggle-bg-unchecked': '#c3c3c3',
        'toggle-bg-checked': '#c3c3c3',
        'card-titles': '#ffffff',
        'report-issue-text': '#ffffff',
      };
    } else {
      // Light mode color group mappings
      return {
        // Color group 1: #232e72 - Primary text, icons, buttons
        'all-icons-and-text': colors.colorGroup1 || '#232e72',
        'toggle-icon-color': colors.colorGroup1 || '#232e72',
        'selected-items': colors.colorGroup1 || '#232e72',
        'card-titles': colors.colorGroup1 || '#232e72',
        'all-hover-states': colors.colorGroup1 || '#232e72',
        'selected-language': colors.colorGroup1 || '#232e72',
        'numbered-buttons': colors.colorGroup1 || '#232e72',
        'report-issue-text': colors.colorGroup1 || '#232e72',
        'report-issue-input-text': colors.colorGroup1 || '#232e72',
        'report-issue-button-background': colors.colorGroup1 || '#232e72',

        // Color group 2: #e0eceb - Header text and icons
        'header-text': colors.colorGroup2 || '#e0eceb',
        'header-icons': colors.colorGroup2 || '#e0eceb',

        // Color group 3: #111639 - Header background
        'header-background': colors.colorGroup3 || '#111639',

        // Color group 4: #232e72 - Footer background (same as group1)
        'footer-background': colors.colorGroup4 || '#232e72',

        // Color group 5: #465ce4 - Header button borders
        'header-buttons-border': colors.colorGroup5 || '#465ce4',

        // Color group 6: #ffffff - White backgrounds
        'widget-background': colors.colorGroup6 || '#ffffff',
        'dropdown-backgrounds': colors.colorGroup6 || '#ffffff',
        'report-issue-textbox-background': colors.colorGroup6 || '#ffffff',
        'report-issue-card-dropdown-background':
          colors.colorGroup6 || '#ffffff',

        // Static colors (not customizable)
        'progress-bars': '#ffffff',
        'report-issue-buttons': '#ffffff',
        'toggle-bg-unchecked': '#c3c3c3',
        'toggle-bg-checked': '#c3c3c3',
        'all-border-lines': '#d7d7d7',
      };
    }
  };

  // Helper function to apply toggle visibility to widget elements
  const applyToggleVisibility = (iframeDoc: Document, toggles: Toggles) => {
    // Helper to find and hide/show profile buttons by text content
    const toggleProfileByName = (name: string, isVisible: boolean) => {
      const profileButtons = queryAllInWidget(
        iframeDoc,
        '.profile-grid .asw-btn',
      );
      profileButtons.forEach((btn: Element) => {
        const text = btn.textContent?.trim();
        if (text?.includes(name)) {
          (btn as HTMLElement).style.display = isVisible ? '' : 'none';
        }
      });
    };

    // Helper to find and hide/show tool/feature buttons by text content
    const toggleButtonByName = (name: string, isVisible: boolean) => {
      const buttons = queryAllInWidget(
        iframeDoc,
        '.asw-btn:not(.profile-grid .asw-btn)',
      );
      buttons.forEach((btn: Element) => {
        const text = btn.textContent?.trim();
        if (text?.includes(name)) {
          (btn as HTMLElement).style.display = isVisible ? '' : 'none';
        }
      });
    };

    // Helper to find and hide/show color adjustment buttons by text content
    const toggleColorButtonByName = (name: string, isVisible: boolean) => {
      const colorButtons = queryAllInWidget(iframeDoc, '.asw-filter');
      colorButtons.forEach((btn: Element) => {
        const text = btn.textContent?.trim();
        if (text?.includes(name)) {
          (btn as HTMLElement).style.display = isVisible ? '' : 'none';
        }
      });
    };

    // Apply toggles for header elements
    const headerLangSelector = queryInWidget(
      iframeDoc,
      '.asw-header-lang-selector',
    );
    if (headerLangSelector) {
      (headerLangSelector as HTMLElement).style.display = toggles.language
        ? ''
        : 'none';
    }

    const oversizeWidget = queryInWidget(
      iframeDoc,
      '.asw-oversize-widget-container',
    );
    if (oversizeWidget) {
      (oversizeWidget as HTMLElement).style.display = toggles.oversizeWidget
        ? ''
        : 'none';
    }

    // Apply toggles for accessibility profiles
    toggleProfileByName('Motor', toggles.motorImpaired);
    toggleProfileByName('Blind', toggles.blind);
    toggleProfileByName('Color Blind', toggles.colorBlind);
    toggleProfileByName('Dyslexia', toggles.dyslexia);
    toggleProfileByName('Visually', toggles.visuallyImpaired);
    toggleProfileByName('Cognitive', toggles.cognitiveAndLearning);
    toggleProfileByName('Seizure', toggles.seizureAndEpileptic);
    toggleProfileByName('ADHD', toggles.adhd);

    // Apply toggles for tools
    toggleButtonByName('Screen Reader', toggles.screenReader);
    toggleButtonByName('Reading Guide', toggles.readingGuide);
    toggleButtonByName('Stop Animation', toggles.stopAnimations);
    toggleButtonByName('Big Cursor', toggles.bigCursor);
    toggleButtonByName('Voice', toggles.voiceNavigation);
    toggleButtonByName('Keyboard', toggles.keyboardNavigation);
    toggleButtonByName('Page Structure', toggles.pageStructure);
    toggleButtonByName('Dark Mode', toggles.darkMode);

    // Widget Position - specific dropdown element
    const widgetPositionDropdown = queryInWidget(
      iframeDoc,
      '#widget-position-dropdown-toggle',
    );
    if (widgetPositionDropdown) {
      (widgetPositionDropdown as HTMLElement).style.display =
        toggles.widgetPosition ? '' : 'none';
    }

    // Also hide the parent card if it exists
    const widgetPositionCard = widgetPositionDropdown?.closest('.asw-card');
    if (widgetPositionCard) {
      (widgetPositionCard as HTMLElement).style.display = toggles.widgetPosition
        ? ''
        : 'none';
    }

    // Apply toggles for content adjustments
    const adjustFont = queryInWidget(iframeDoc, '.asw-adjust-font');
    if (adjustFont) {
      (adjustFont as HTMLElement).style.display = toggles.fontSize
        ? ''
        : 'none';
    }

    toggleButtonByName(
      'Highlight',
      toggles.highlightLinks || toggles.highlightTitle,
    );
    toggleButtonByName('Dyslexia Font', toggles.dyslexiaFont);
    toggleButtonByName('Letter Spacing', toggles.letterSpacing);
    toggleButtonByName('Line Height', toggles.lineHeight);
    toggleButtonByName('Font Weight', toggles.fontWeight);

    // Apply toggles for color adjustments
    toggleColorButtonByName(
      'Contrast',
      toggles.darkContrast || toggles.lightContrast || toggles.highContrast,
    );
    toggleColorButtonByName(
      'Saturation',
      toggles.highSaturation || toggles.lowSaturation,
    );
    toggleColorButtonByName('Monochrome', toggles.monochrome);

    // Apply toggles for color sections
    const colorSections = queryAllInWidget(iframeDoc, '.asw-color-section');
    colorSections.forEach((section: Element) => {
      const titleText = section
        .querySelector('.asw-color-title')
        ?.textContent?.trim();
      if (titleText?.includes('Text Color')) {
        (section as HTMLElement).style.display = toggles.textColor
          ? ''
          : 'none';
      } else if (titleText?.includes('Title Color')) {
        (section as HTMLElement).style.display = toggles.titleColor
          ? ''
          : 'none';
      } else if (titleText?.includes('Background')) {
        (section as HTMLElement).style.display = toggles.backgroundColor
          ? ''
          : 'none';
      }
    });
  };

  // Generate widget HTML for iframe
  const generateWidgetHTML = () => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Preview</title>
  <style>
    /* Hide all scrollbars */
    * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    
    *::-webkit-scrollbar {
      display: none !important;
    }
    
    html, body {
      overflow: visible !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    
    html::-webkit-scrollbar,
    body::-webkit-scrollbar {
      display: none !important;
    }
    
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #ebeffd;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .container {
      text-align: center;
    }
    .preview-btn {
      padding: 12px 24px;
      background: #4285F4;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
      transition: all 0.2s;
    }
    .preview-btn:hover:not(:disabled) {
      background: #3367D6;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
    }
    .preview-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      box-shadow: none;
    }
    .info-text {
      margin-bottom: 20px;
      color: #666;
      font-size: 14px;
    }
    
    /* Simple solution - just hide scrollbars */
    .asw-widget,
    .asw-menu,
    .asw-panel,
    .asw-container {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    
    .asw-widget::-webkit-scrollbar,
    .asw-menu::-webkit-scrollbar,
    .asw-panel::-webkit-scrollbar,
    .asw-container::-webkit-scrollbar {
      display: none !important;
    }
    
  </style>
</head>
<body>
  <div class="container">
    <button id="widgetBtn" class="preview-btn" onclick="openWidget()" disabled>Loading...</button>
  </div>
  
  <script src="${process.env.REACT_APP_WIDGET_URL}" 
          data-asw-position="bottom-left" 
          data-asw-lang="auto" 
          data-asw-icon-type="hidden" 
          defer></script>
  
  <script>
    // Shadow DOM helper functions
    function queryInWidget(selector) {
      // First try to find in light DOM
      let element = document.querySelector(selector);
      if (element) return element;
      
      // Then try to find in Shadow DOM
      const shadowHost = document.getElementById('asw-shadow-host');
      if (shadowHost && shadowHost.shadowRoot) {
        element = shadowHost.shadowRoot.querySelector(selector);
        if (element) return element;
      }
      
      // Also check all shadow roots in the document
      const allElements = document.querySelectorAll('*');
      for (let el of allElements) {
        if (el.shadowRoot) {
          element = el.shadowRoot.querySelector(selector);
          if (element) return element;
        }
      }
      
      return null;
    }
    
    function queryAllInWidget(selector) {
      const results = [];
      
      // First check light DOM
      const lightElements = document.querySelectorAll(selector);
      results.push(...lightElements);
      
      // Then check Shadow DOM
      const shadowHost = document.getElementById('asw-shadow-host');
      if (shadowHost && shadowHost.shadowRoot) {
        const shadowElements = shadowHost.shadowRoot.querySelectorAll(selector);
        results.push(...shadowElements);
      }
      
      // Also check all shadow roots in the document
      const allElements = document.querySelectorAll('*');
      for (let el of allElements) {
        if (el.shadowRoot) {
          const shadowElements = el.shadowRoot.querySelectorAll(selector);
          results.push(...shadowElements);
        }
      }
      
      return results;
    }
    
    // Check when widget is loaded and enable the button
    function checkWidgetLoaded() {
      const checkInterval = setInterval(() => {
        const widgetBtn = queryInWidget('.asw-menu-btn');
        const previewBtn = document.getElementById('widgetBtn');
        
        if (widgetBtn && previewBtn) {
          clearInterval(checkInterval);
          previewBtn.disabled = false;
          previewBtn.textContent = 'Open Accessibility Widget';
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        const previewBtn = document.getElementById('widgetBtn');
        if (previewBtn && previewBtn.disabled) {
          previewBtn.textContent = 'Widget failed to load';
        }
      }, 10000);
    }
    
    // Start checking when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkWidgetLoaded);
    } else {
      checkWidgetLoaded();
    }
    
    function openWidget() {
      // Wait for widget to be fully loaded
      const checkWidget = setInterval(() => {
        const widgetBtn = queryInWidget('.asw-menu-btn');
        if (widgetBtn) {
          clearInterval(checkWidget);
          widgetBtn.click();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => clearInterval(checkWidget), 5000);
    }
    
    // Function to find dark mode toggle with multiple possible selectors
    function findDarkModeToggle() {
      const selectors = [
        '[data-asw-action="dark-mode"]',
        '.asw-dark-mode-toggle',
        '.asw-header-toggle-switch input',
        '.asw-header-toggle-switch',
        '[aria-label*="dark" i]',
        '[aria-label*="theme" i]',
        '.asw-menu .asw-header-toggle-switch input[type="checkbox"]'
      ];
      
      for (const selector of selectors) {
        const element = queryInWidget(selector);
        if (element) {
          return element;
        }
      }
      
      return null;
    }
    
    // Function to check if dark mode is active
    function isDarkModeActive() {
      // Check document for dark mode class
      if (document.body.classList.contains('asw-dark-mode') || 
          document.body.classList.contains('dark-mode')) {
        return true;
      }
      
      // Check toggle state
      const toggle = findDarkModeToggle();
      if (toggle) {
        // If it's an input checkbox
        if (toggle.tagName === 'INPUT' && toggle.type === 'checkbox') {
          return toggle.checked;
        }
        // If it has active class
        if (toggle.classList.contains('active') || toggle.classList.contains('checked')) {
          return true;
        }
      }
      
      return false;
    }
    
    // Listen for theme updates from parent window
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'THEME_UPDATE_FROM_PARENT') {
        const newTheme = event.data.theme;
        const darkModeToggle = findDarkModeToggle();
        
        if (darkModeToggle) {
          const currentlyDark = isDarkModeActive();
          const shouldBeDark = newTheme === 'dark';
          
          // Only click if state needs to change
          if (currentlyDark !== shouldBeDark) {
            darkModeToggle.click();
          }
        }
      }
    });
    
    // Monitor widget's dark mode toggle and notify parent
    function setupThemeSync() {
      const darkModeToggle = findDarkModeToggle();
      
      if (darkModeToggle) {
        // Create a MutationObserver to watch for class changes on body/document
        const bodyObserver = new MutationObserver(() => {
          const isDark = isDarkModeActive();
          window.parent.postMessage({
            type: 'THEME_CHANGED_IN_WIDGET',
            theme: isDark ? 'dark' : 'light'
          }, '*');
        });
        
        // Observe body for class changes
        bodyObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ['class']
        });
        
        // If toggle is an input, listen for change events
        if (darkModeToggle.tagName === 'INPUT') {
          darkModeToggle.addEventListener('change', () => {
            setTimeout(() => {
              const isDark = isDarkModeActive();
              window.parent.postMessage({
                type: 'THEME_CHANGED_IN_WIDGET',
                theme: isDark ? 'dark' : 'light'
              }, '*');
            }, 150);
          });
        }
        
        // Also listen for direct clicks on toggle or its parent
        const clickTarget = darkModeToggle.closest('.asw-header-toggle-switch') || darkModeToggle;
        clickTarget.addEventListener('click', () => {
          setTimeout(() => {
            const isDark = isDarkModeActive();
            window.parent.postMessage({
              type: 'THEME_CHANGED_IN_WIDGET',
              theme: isDark ? 'dark' : 'light'
            }, '*');
          }, 150);
        });
      }
    }
    
    // Wait for widget menu to be available before setting up sync
    function waitForWidgetMenu(callback, maxAttempts = 50) {
      let attempts = 0;
      const checkMenu = setInterval(() => {
        attempts++;
        const menu = queryInWidget('.asw-menu');
        
        if (menu) {
          clearInterval(checkMenu);
          callback();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkMenu);
        }
      }, 100);
    }
    
    // Auto-open widget when iframe loads
    window.addEventListener('load', () => {
      setTimeout(() => {
        openWidget();
        // Wait for widget menu to be rendered before setting up sync
        waitForWidgetMenu(() => {
          setupThemeSync();
          // Request initial theme state from parent
          window.parent.postMessage({
            type: 'REQUEST_THEME_STATE'
          }, '*');
        });
      }, 1000);
    });
  </script>
</body>
</html>
    `;
  };

  // Handle iframe loading
  useEffect(() => {
    if (livePreview && widgetIframeRef.current) {
      const iframe = widgetIframeRef.current;
      const html = generateWidgetHTML();

      // Write HTML to iframe
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        // Function to adjust iframe height based on content
        const adjustIframeHeight = () => {
          try {
            const iframeDoc =
              iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              // Wait for widget to load
              const checkWidget = setInterval(() => {
                const widget = queryInWidget(
                  iframeDoc,
                  '.asw-widget, .asw-menu',
                );
                if (widget) {
                  clearInterval(checkWidget);

                  // Get the actual height of the widget content
                  const widgetHeight = widget.scrollHeight;
                  const bodyHeight = iframeDoc.body.scrollHeight;
                  const documentHeight = iframeDoc.documentElement.scrollHeight;

                  // Use the maximum height to ensure full content is visible
                  const contentHeight = Math.max(
                    widgetHeight,
                    bodyHeight,
                    documentHeight,
                  );

                  // Set iframe height to content height plus some padding
                  iframe.style.height = `${contentHeight + 40}px`;
                }
              }, 100);

              // Clear interval after 5 seconds
              setTimeout(() => clearInterval(checkWidget), 5000);
            }
          } catch (error) {
            console.log('Could not adjust iframe height:', error);
          }
        };

        // Adjust height after a delay to ensure content is loaded
        setTimeout(adjustIframeHeight, 2000);
      }
    }
  }, [livePreview]);

  // Apply colors to widget inside iframe
  useEffect(() => {
    if (!livePreview || !widgetIframeRef.current) return;

    const applyColorsToIframe = () => {
      const iframe = widgetIframeRef.current;
      if (!iframe) return;

      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Wait for the widget to be loaded inside the iframe
      const checkWidget = setInterval(() => {
        const $menu = queryInWidget(iframeDoc, '.asw-menu') as HTMLElement;
        const container = queryInWidget(
          iframeDoc,
          '.asw-container',
        ) as HTMLElement;

        if ($menu && container) {
          clearInterval(checkWidget);

          // Apply toggle visibility settings
          applyToggleVisibility(iframeDoc, toggles);

          // Apply colors based on dark mode setting
          const isDarkMode = colorMode === 'dark';

          // Get the color mapping based on the current mode
          const colorMapping = getColorMapping(isDarkMode);

          // Apply all colors using the grouped color mapping
          Object.entries(colorMapping).forEach(([section, color]) => {
            applyMenuColor(section, color, $menu, container, iframeDoc);
          });

          // Apply logo to widget if it exists
          applyLogoToWidget(iframeDoc, colors.logoImage);

          // Apply footer text to widget
          applyFooterTextToWidget(iframeDoc, colors.footerText);

          // Apply font to widget with additional delay to ensure widget CSS is loaded
          setTimeout(() => {
            applyFontToWidget(iframeDoc, selectedFont);
          }, 500);
        }
      }, 100);

      // Clear the interval after 10 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkWidget), 10000);
    };

    // Small delay to ensure iframe content is loaded
    const timer = setTimeout(applyColorsToIframe, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [livePreview, colors, colorMode, toggles, colors.logoImage, selectedFont]);

  // Track if theme just changed to trigger color reapplication
  const [themeJustChanged, setThemeJustChanged] = useState(false);

  // Listen for theme changes from widget iframe
  useEffect(() => {
    if (!livePreview) return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      // Handle theme change from widget
      if (event.data.type === 'THEME_CHANGED_IN_WIDGET') {
        const newTheme = event.data.theme as 'light' | 'dark';

        // Only update if theme actually changed to avoid infinite loops
        if (newTheme !== colorMode) {
          setColorMode(newTheme);
          setThemeJustChanged(true);
          toast.success(`Theme switched to ${newTheme} mode`);
        }
      }

      // Handle initial theme state request from widget
      if (event.data.type === 'REQUEST_THEME_STATE') {
        const iframe = widgetIframeRef.current;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'THEME_UPDATE_FROM_PARENT',
              theme: colorMode,
            },
            '*',
          );
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [livePreview, colorMode, setColorMode]);

  // Re-apply colors when theme changes (after React updates with new colors)
  useEffect(() => {
    if (!livePreview || !widgetIframeRef.current || !themeJustChanged) return;

    const reapplyColors = () => {
      const iframe = widgetIframeRef.current;
      if (!iframe) return;

      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      const $menu = queryInWidget(iframeDoc, '.asw-menu') as HTMLElement;
      const container = queryInWidget(
        iframeDoc,
        '.asw-container',
      ) as HTMLElement;

      if ($menu && container) {
        const isDarkMode = colorMode === 'dark';
        const colorMapping = getColorMapping(isDarkMode);

        Object.entries(colorMapping).forEach(([section, color]) => {
          applyMenuColor(section, color, $menu, container, iframeDoc);
        });

        applyLogoToWidget(iframeDoc, colors.logoImage);

        // Apply footer text to widget
        applyFooterTextToWidget(iframeDoc, colors.footerText);

        // Reapply font with additional delay to ensure it overrides widget CSS
        setTimeout(() => {
          applyFontToWidget(iframeDoc, selectedFont);
        }, 300);
      }

      setThemeJustChanged(false);
    };

    // Wait for widget's theme transition to complete before reapplying colors
    const timer = setTimeout(reapplyColors, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [livePreview, themeJustChanged, colorMode, colors, selectedFont]);

  // Send theme updates to widget iframe when parent changes
  useEffect(() => {
    if (!livePreview || !widgetIframeRef.current) return;

    const sendThemeUpdate = () => {
      const iframe = widgetIframeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      // Send message to iframe to update its theme
      iframe.contentWindow.postMessage(
        {
          type: 'THEME_UPDATE_FROM_PARENT',
          theme: colorMode,
        },
        '*',
      );

      // Mark that theme changed to trigger color reapplication
      setThemeJustChanged(true);
    };

    // Wait a bit to ensure iframe is ready
    const timer = setTimeout(sendThemeUpdate, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [livePreview, colorMode]);

  return (
    <div>
      {/* Header */}
      <div className=" px-6 pb-4">
        {/* Tabs */}
        <div className="flex space-x-8 mt-4 widget-tabs-section">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors appearance-tab ${
              activeTab === 'appearance'
                ? 'border-[#4285F4] text-[#4285F4]'
                : 'border-transparent text-[#666666] hover:text-[#4A4A4A]'
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('preference')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors preference-tab ${
              activeTab === 'preference'
                ? 'border-[#4285F4] text-[#4285F4]'
                : 'border-transparent text-[#666666] hover:text-[#4A4A4A]'
            }`}
          >
            Preference
          </button>
        </div>
      </div>

      <div className="relative flex flex-col md:flex-row h-auto bg-[#ebeffd] border border-[#a3aef1] rounded-lg">
        {/* Left Side - Settings */}
        <div
          className={`${
            livePreview ? 'w-full md:w-[40%] xl:w-2/3' : 'w-full'
          } p-3 sm:p-4 md:p-6 transition-all duration-300 flex flex-col widget-customization-section overflow-y-auto`}
          style={{ height: '1000px' }}
        >
          <div className="space-y-6">
            {activeTab === 'preference' && (
              <>
                {/* Live Preview Section */}
                <div className="px-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-[#333333]">
                      Live preview
                    </h3>
                    <Switch
                      checked={livePreview}
                      onChange={(e) => setLivePreview(e.target.checked)}
                      color="primary"
                    />
                  </div>
                </div>

                {/* Toggle Features */}
                <h3 className="text-base md:text-lg font-semibold text-[#333333] mb-2 px-2">
                  Toggle Features
                </h3>
                <p className="text-xs sm:text-sm md:text-sm text-[#757575] mb-4 px-2">
                  Toggle which accessibility features you want to show or hide
                </p>
                <div className="bg-[#ebeffd] border border-[#a3aef1] rounded-lg p-2 sm:p-3 md:p-4 toggle-features-panel">
                  <div className="space-y-3">
                    {/* Language */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 sm:p-4 md:p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Language
                        </span>
                        <Switch
                          checked={Boolean(toggles.language)}
                          onChange={(e) =>
                            setToggles((prev) => ({
                              ...prev,
                              language: e.target.checked,
                            }))
                          }
                          color="primary"
                        />
                      </div>
                    </div>

                    {/* Oversize widget */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 sm:p-4 md:p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Oversize widget
                        </span>
                        <Switch
                          checked={Boolean(toggles.oversizeWidget)}
                          onChange={(e) =>
                            setToggles((prev) => ({
                              ...prev,
                              oversizeWidget: e.target.checked,
                            }))
                          }
                          color="primary"
                        />
                      </div>
                    </div>

                    {/* Accessibility Profiles */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 sm:p-4 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Accessibility Profiles
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(
                              toggles.motorImpaired ||
                                toggles.blind ||
                                toggles.colorBlind ||
                                toggles.dyslexia ||
                                toggles.visuallyImpaired ||
                                toggles.cognitiveAndLearning ||
                                toggles.seizureAndEpileptic ||
                                toggles.adhd,
                            )}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setToggles((prev) => ({
                                ...prev,
                                motorImpaired: checked,
                                blind: checked,
                                colorBlind: checked,
                                dyslexia: checked,
                                visuallyImpaired: checked,
                                cognitiveAndLearning: checked,
                                seizureAndEpileptic: checked,
                                adhd: checked,
                              }));
                            }}
                            color="primary"
                          />
                          <button
                            onClick={() =>
                              toggleSection('accessibilityProfiles')
                            }
                            className="p-1"
                          >
                            {expandedSections.accessibilityProfiles ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedSections.accessibilityProfiles && (
                        <div className="space-y-2 pl-4">
                          {[
                            { key: 'motorImpaired', label: 'Motor Impaired' },
                            { key: 'blind', label: 'Blind' },
                            { key: 'colorBlind', label: 'Color Blind' },
                            { key: 'dyslexia', label: 'Dyslexia' },
                            {
                              key: 'visuallyImpaired',
                              label: 'Visually Impaired',
                            },
                            {
                              key: 'cognitiveAndLearning',
                              label: 'Cognitive & Learning',
                            },
                            {
                              key: 'seizureAndEpileptic',
                              label: 'Seizure & Epileptic',
                            },
                            { key: 'adhd', label: 'ADHD' },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-[#4A4A4A]">
                                {label}
                              </span>
                              <Switch
                                checked={Boolean(toggles[key as keyof Toggles])}
                                onChange={(e) =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                color="primary"
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2 Content Adjustments */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 sm:p-4 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Content Adjustments
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(
                              toggles.fontSize ||
                                toggles.highlightTitle ||
                                toggles.highlightLinks ||
                                toggles.dyslexiaFont ||
                                toggles.letterSpacing ||
                                toggles.lineHeight ||
                                toggles.fontWeight,
                            )}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setToggles((prev) => ({
                                ...prev,
                                fontSize: checked,
                                highlightTitle: checked,
                                highlightLinks: checked,
                                dyslexiaFont: checked,
                                letterSpacing: checked,
                                lineHeight: checked,
                                fontWeight: checked,
                              }));
                            }}
                            color="primary"
                          />
                          <button
                            onClick={() => toggleSection('contentAdjustments')}
                            className="p-1"
                          >
                            {expandedSections.contentAdjustments ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedSections.contentAdjustments && (
                        <div className="space-y-2 pl-4">
                          {[
                            { key: 'fontSize', label: 'Font size' },
                            { key: 'highlightTitle', label: 'Highlight Title' },
                            { key: 'highlightLinks', label: 'Highlight Links' },
                            { key: 'dyslexiaFont', label: 'Dyslexia Font' },
                            { key: 'letterSpacing', label: 'Letter Spacing' },
                            { key: 'lineHeight', label: 'Line Height' },
                            { key: 'fontWeight', label: 'Font Weight' },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-[#4A4A4A]">
                                {label}
                              </span>
                              <Switch
                                checked={Boolean(toggles[key as keyof Toggles])}
                                onChange={(e) =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                color="primary"
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3 Color Adjustments */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 sm:p-4 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Color Adjustments
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(
                              toggles.darkContrast ||
                                toggles.lightContrast ||
                                toggles.highContrast ||
                                toggles.highSaturation ||
                                toggles.lowSaturation ||
                                toggles.monochrome ||
                                toggles.textColor ||
                                toggles.titleColor ||
                                toggles.backgroundColor,
                            )}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setToggles((prev) => ({
                                ...prev,
                                darkContrast: checked,
                                lightContrast: checked,
                                highContrast: checked,
                                highSaturation: checked,
                                lowSaturation: checked,
                                monochrome: checked,
                                textColor: checked,
                                titleColor: checked,
                                backgroundColor: checked,
                              }));
                            }}
                            color="primary"
                          />
                          <button
                            onClick={() => toggleSection('colorAdjustments')}
                            className="p-1"
                          >
                            {expandedSections.colorAdjustments ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedSections.colorAdjustments && (
                        <div className="space-y-2 pl-4">
                          {[
                            { key: 'darkContrast', label: 'Contrast' },
                            { key: 'highSaturation', label: 'Saturation' },
                            { key: 'monochrome', label: 'Monochrome' },
                            { key: 'textColor', label: 'Text Color' },
                            { key: 'titleColor', label: 'Title Color' },
                            {
                              key: 'backgroundColor',
                              label: 'Background Color',
                            },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-[#4A4A4A]">
                                {label}
                              </span>
                              <Switch
                                checked={Boolean(toggles[key as keyof Toggles])}
                                onChange={(e) =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                color="primary"
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4 Tools */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 sm:p-4 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Tools
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(
                              toggles.pageStructure ||
                                toggles.keyboardNavigation ||
                                toggles.darkMode ||
                                toggles.screenReader ||
                                toggles.readingGuide ||
                                toggles.stopAnimations ||
                                toggles.bigCursor ||
                                toggles.voiceNavigation,
                            )}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setToggles((prev) => ({
                                ...prev,
                                pageStructure: checked,
                                keyboardNavigation: checked,
                                darkMode: checked,
                                screenReader: checked,
                                readingGuide: checked,
                                stopAnimations: checked,
                                bigCursor: checked,
                                voiceNavigation: checked,
                              }));
                            }}
                            color="primary"
                          />
                          <button
                            onClick={() => toggleSection('tools')}
                            className="p-1"
                          >
                            {expandedSections.tools ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedSections.tools && (
                        <div className="space-y-2 pl-4">
                          {[
                            { key: 'pageStructure', label: 'Page Structure' },
                            {
                              key: 'keyboardNavigation',
                              label: 'Keyboard Navigation',
                            },
                            { key: 'darkMode', label: 'Dark Mode' },
                            { key: 'screenReader', label: 'Screen Reader' },
                            { key: 'readingGuide', label: 'Reading Guide' },
                            { key: 'stopAnimations', label: 'Stop Animations' },
                            { key: 'bigCursor', label: 'Big Cursor' },
                            {
                              key: 'voiceNavigation',
                              label: 'Voice Navigation',
                            },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-[#4A4A4A]">
                                {label}
                              </span>
                              <Switch
                                checked={Boolean(toggles[key as keyof Toggles])}
                                onChange={(e) =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                color="primary"
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Widget position */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 sm:p-4 md:p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Widget position
                        </span>
                        <Switch
                          checked={Boolean(toggles.widgetPosition)}
                          onChange={(e) =>
                            setToggles((prev) => ({
                              ...prev,
                              widgetPosition: e.target.checked,
                            }))
                          }
                          color="primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save and Reset Buttons */}
                  <div className="flex flex-row justify-end gap-4 mt-4 px-4 pb-6 mb-4 save-reset-buttons">
                    <button
                      onClick={onReset}
                      disabled={buttonDisable}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#445AE7] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      Reset
                    </button>
                    <button
                      onClick={onSave}
                      disabled={buttonDisable}
                      className="px-6 py-2 border border-transparent rounded-md text-white bg-[#445AE7] hover:bg-[#3A4BC7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#445AE7] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'appearance' && (
              <>
                {/* Live Preview Section */}
                <div className="px-2 live-preview-toggle">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-[#333333]">
                      Live preview
                    </h3>
                    <Switch
                      checked={livePreview}
                      onChange={(e) => setLivePreview(e.target.checked)}
                      color="primary"
                    />
                  </div>
                </div>

                {/* Color Customization Section */}
                <h3 className="text-base md:text-lg font-semibold text-[#333333] mb-2 px-2">
                  Color Customization
                </h3>
                <p className="text-xs sm:text-sm md:text-sm text-[#757575] mb-4 px-2">
                  Customize the appearance and colors of your accessibility
                  widget to match your brand
                </p>

                <div className="bg-[#ebeffd] border border-[#a3aef1] rounded-lg p-2 sm:p-3 md:p-4 color-customization-panel">
                  {/* Widget Button Color */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-3 sm:p-4 md:p-6 mb-4">
                    <ColorPicker
                      label="Widget Button Color"
                      description="Primary color for the main widget button"
                      value={colors.widgetBtnColor}
                      onChange={updateColor('widgetBtnColor')}
                      onReset={resetColor('widgetBtnColor')}
                    />
                  </div>

                  {/* Color Mode Toggle */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-4 sm:p-5 md:p-6 mb-4">
                    <div
                      className={`flex flex-col gap-3 sm:gap-4 md:gap-6 ${
                        livePreview
                          ? 'sm:flex-col md:flex-col md:items-start md:justify-between'
                          : 'sm:flex-col md:flex-row md:items-start md:justify-between'
                      }`}
                    >
                      {/* Title and Description Section */}
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl md:text-xl font-semibold text-[#1a1a1a] mb-1 sm:mb-2">
                          Choose Your Mode
                        </h3>
                        <p className="text-xs sm:text-sm md:text-sm text-[#666666] leading-relaxed">
                          Select between light and dark theme for your widget
                          interface
                        </p>
                      </div>

                      {/* Dropdown Section */}
                      <div className="flex-shrink-0 w-full sm:w-full md:w-auto md:min-w-[200px]">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 md:pl-3 flex items-center pointer-events-none">
                            {colorMode === 'light' ? (
                              <svg
                                className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 text-[#F59E0B]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                              </svg>
                            ) : (
                              <svg
                                className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 text-[#6B7280]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <select
                            value={colorMode}
                            onChange={(e) =>
                              setColorMode(e.target.value as 'light' | 'dark')
                            }
                            className="w-full pl-8 sm:pl-10 md:pl-10 pr-8 sm:pr-10 md:pr-10 py-2 sm:py-2.5 md:py-3 border border-[#D1D5DB] rounded-lg text-xs sm:text-sm md:text-sm focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] transition-colors duration-200 bg-white appearance-none cursor-pointer"
                          >
                            <option value="light">Light Mode</option>
                            <option value="dark">Dark Mode</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 md:pr-3 pointer-events-none">
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-[#9CA3AF]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Widget Color Adjustments */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-3 sm:p-4 md:p-6 mb-4">
                    <h3 className="text-lg font-semibold text-[#333333] mb-2">
                      Widget Color Adjustments
                      <span className="ml-2 text-sm font-normal text-[#757575]">
                        ({colorMode === 'light' ? 'Light' : 'Dark'} Mode)
                      </span>
                    </h3>
                    <p className="text-sm text-[#757575] mb-6">
                      Customize colors for {colorMode} mode. Changes are saved
                      separately for each mode.
                    </p>
                    <div className="space-y-4">
                      {colorPickers.map(({ key, label, description }) => {
                        const colorValue = colors[key as keyof typeof colors];
                        const defaultValue =
                          DefaultColors[key as keyof typeof DefaultColors];
                        return (
                          <ColorPicker
                            key={key}
                            label={label}
                            description={description}
                            value={colorValue || defaultValue || '#000000'}
                            onChange={updateColor(key as keyof Colors)}
                            onReset={resetColor(key as keyof Colors)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Upload Widget Logo */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-6 mb-4">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">
                        Upload Widget Logo
                      </h3>
                      <p className="text-sm text-[#666666] leading-relaxed">
                        <span className="font-medium text-[#445AE7]">
                          Optimal dimensions:
                        </span>{' '}
                        200 × 50 pixels for best display quality
                      </p>
                    </div>

                    {/* File Upload Area */}
                    <div className="mb-6">
                      <div
                        className="relative border-2 border-dashed border-[#E5E7EB] rounded-xl p-6 text-center hover:border-[#445AE7] hover:bg-[#F8FAFF] transition-all duration-200 cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          disabled={!isFileInput}
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-[#F3F4F6] rounded-lg flex items-center justify-center mb-3 group-hover:bg-[#445AE7]/10 transition-colors duration-200">
                            <svg
                              className="w-6 h-6 text-[#6B7280] group-hover:text-[#445AE7] transition-colors duration-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-[#374151] mb-1">
                            Choose file
                          </p>
                          <p className="text-xs text-[#9CA3AF]">
                            PNG, JPG, SVG up to 5MB
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* URL Input */}
                    <div className="mb-6">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-[#9CA3AF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Or enter image URL"
                          className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg text-sm focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] transition-colors duration-200 bg-white"
                          ref={urlInputRef}
                          disabled={!isUrlInput}
                          onChange={(e) => {
                            const url = e.target.value.trim();
                            if (url) {
                              setLogoInput(url);
                            }
                            setIsFileInput(false);
                          }}
                        />
                      </div>
                    </div>

                    {/* Displaying the logo */}
                    <div className="mb-4 max-w-xs">
                      {colors.logoImage && colors.logoImage.length > 0 ? (
                        <img
                          src={
                            colors.logoImage.length
                              ? colors.logoImage
                              : (LogoIcon as any)
                          }
                          alt="Logo Preview"
                          className="w-48 h-12 object-contain"
                        />
                      ) : (
                        <>
                          {organization?.logo_url ? (
                            <img
                              width={198}
                              height={47}
                              src={organization.logo_url}
                              alt={organization.name}
                              className="object-contain max-w-full"
                            />
                          ) : (
                            <LogoIcon className="w-48 h-16 object-contain" />
                          )}
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleReset}
                        className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all duration-200 focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] shadow-sm hover:shadow-md"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => {
                          if (isBase64(logoInput)) {
                            setColors((prev) => ({
                              ...prev,
                              logoImage: logoInput,
                            }));
                            setIsFileInput(true);
                            setIsUrlInput(false);
                          } else if (isValidUrl(logoInput)) {
                            setColors((prev) => ({
                              ...prev,
                              logoImage: logoInput,
                            }));
                            setIsUrlInput(true);
                            setIsFileInput(false);
                          } else {
                            toast.error('Please provide a valid Image or URL.');
                          }
                        }}
                        className="px-6 py-2.5 bg-[#445AE7] text-white rounded-lg text-sm font-medium hover:bg-[#3A4BC7] transition-all duration-200 focus:ring-2 focus:ring-[#445AE7]/20 focus:outline-none shadow-sm hover:shadow-md"
                      >
                        Set Logo
                      </button>
                    </div>
                  </div>

                  {/* Set Logo Link URL */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-6 mb-4">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">
                        Set Logo Link URL
                      </h3>
                      <p className="text-sm text-[#666666] leading-relaxed">
                        Define where users will be redirected when they click on
                        your widget logo
                      </p>
                    </div>

                    <div className="mb-6">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-[#9CA3AF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter Logo Link URL (e.g., https://yourwebsite.com)"
                          className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg text-sm focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] transition-colors duration-200 bg-white"
                          value={logoUrl}
                          onChange={(e) => {
                            const url = e.target.value.trim();
                            if (url) {
                              setColors((prev) => ({
                                ...prev,
                                logoUrl: url,
                              }));
                            }
                            setLogoUrl(url);
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setColors((prev) => ({
                          ...prev,
                          logoUrl: DefaultColors.logoUrl,
                        }));
                        setLogoUrl(DefaultColors.logoUrl);
                      }}
                      className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all duration-200 focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] shadow-sm hover:shadow-md"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Set Accessibility Statement Link URL */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-6 mb-4">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">
                        Set Accessibility Statement Link URL
                      </h3>
                      <p className="text-sm text-[#666666] leading-relaxed">
                        Provide a link to your organization's accessibility
                        compliance statement
                      </p>
                    </div>

                    <div className="mb-6">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-[#9CA3AF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter URL (e.g., https://yourwebsite.com/statement or /accessibility)"
                          className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg text-sm focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] transition-colors duration-200 bg-white"
                          value={accessibilityStatementLinkUrl}
                          onChange={(e) => {
                            const inputValue = e.target.value.trim();
                            let finalUrl = inputValue;
                            
                            // If the input is a relative path (starts with /) and we have a selected site
                            if (inputValue.startsWith('/') && selectedSite) {
                              // Remove any trailing slashes from the domain
                              let domain = selectedSite.replace(/\/$/, '');
                              
                              // Add protocol if not present
                              if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
                                domain = `https://${domain}`;
                              }
                              
                              // Combine domain with relative path
                              finalUrl = `${domain}${inputValue}`;
                            }
                            
                            if (finalUrl) {
                              setColors((prev) => ({
                                ...prev,
                                accessibilityStatementLinkUrl: finalUrl,
                              }));
                            }
                            setAccessibilityStatementLinkUrl(inputValue);
                          }}
                        />
                      </div>
                      {accessibilityStatementLinkUrl.startsWith('/') && selectedSite && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-700">
                            <span className="font-medium">Will be saved as: </span>
                            <span className="font-mono">
                              {(() => {
                                let domain = selectedSite.replace(/\/$/, '');
                                if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
                                  domain = `https://${domain}`;
                                }
                                return `${domain}${accessibilityStatementLinkUrl}`;
                              })()}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setColors((prev) => ({
                          ...prev,
                          accessibilityStatementLinkUrl:
                            DefaultColors.accessibilityStatementLinkUrl,
                        }));
                        setAccessibilityStatementLinkUrl(
                          DefaultColors.accessibilityStatementLinkUrl,
                        );
                      }}
                      className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all duration-200 focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] shadow-sm hover:shadow-md"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Select Widget Font */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-6 mb-4">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">
                        Select Widget Font
                      </h3>
                      <p className="text-sm text-[#666666] leading-relaxed">
                        Choose the font family that will be used throughout your
                        accessibility widget
                      </p>
                    </div>

                    <div className="mb-6">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-[#9CA3AF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10M12 21v-3m-4 0h8m-8 0H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v11a2 2 0 01-2 2h-2M9 7h6m-3 0v9"
                            />
                          </svg>
                        </div>
                        <select
                          className="w-full pl-10 pr-10 py-3 border border-[#D1D5DB] rounded-lg text-sm focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] transition-colors duration-200 bg-white appearance-none cursor-pointer"
                          value={selectedFont}
                          onChange={(e) => setSelectedFont(e.target.value)}
                        >
                          <option value="auto">
                            Auto (Use website default)
                          </option>
                          <option value="'Times New Roman', serif">
                            Times New Roman (serif)
                          </option>
                          {font.map((fonts) => (
                            <option key={fonts} value={fonts}>
                              {fonts.replace(/['"]/g, '')}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg
                            className="h-5 w-5 text-[#9CA3AF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedFont('auto');
                      }}
                      className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all duration-200 focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] shadow-sm hover:shadow-md"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Set Footer Text */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-6 mb-4">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">
                        Customize Footer Text
                      </h3>
                      <p className="text-sm text-[#666666] leading-relaxed">
                        Set custom branding text that will appear in the widget
                        footer
                      </p>
                    </div>

                    <div className="mb-6">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-[#9CA3AF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter footer text (e.g., Your Company Name)"
                          className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg text-sm focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] transition-colors duration-200 bg-white"
                          value={footerText}
                          onChange={(e) => {
                            const text = e.target.value;
                            setFooterText(text);
                            setColors((prev) => ({
                              ...prev,
                              footerText: text,
                            }));
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setColors((prev) => ({
                          ...prev,
                          footerText: DefaultColors.footerText,
                        }));
                        setFooterText(DefaultColors.footerText);
                      }}
                      className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all duration-200 focus:ring-2 focus:ring-[#445AE7]/20 focus:border-[#445AE7] shadow-sm hover:shadow-md"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Save and Reset Buttons */}
                  <div className="flex flex-row justify-end gap-4 mt-8 px-4 pb-6 mb-4 save-reset-buttons">
                    <button
                      onClick={onReset}
                      disabled={buttonDisable}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#445AE7] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      Reset
                    </button>
                    <button
                      onClick={onSave}
                      disabled={buttonDisable}
                      className="px-6 py-2 border border-transparent rounded-md text-white bg-[#445AE7] hover:bg-[#3A4BC7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#445AE7] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side - Widget Preview (Only visible when live preview is on) */}
        {livePreview && (
          <div className="w-full md:w-[60%] xl:w-1/3 p-3 sm:p-4 md:p-6 transition-all duration-300 widget-preview-section">
            <div
              className="rounded-lg shadow-sm flex flex-col overflow-visible min-h-fit"
              style={{ backgroundColor: '#ebeffd' }}
            >
              <iframe
                ref={widgetIframeRef}
                className="w-full border-0 rounded-lg no-scrollbar"
                title="Widget Live Preview"
                sandbox="allow-scripts allow-same-origin"
                style={{
                  backgroundColor: '#F8F9FA',
                  overflow: 'visible',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  height: 'auto',
                  minHeight: '900px',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizeWidget;
