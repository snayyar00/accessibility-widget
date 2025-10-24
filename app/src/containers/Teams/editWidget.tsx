import type React from 'react';
import CustomizeWidget from './CustomizeWidget';
import { useEffect, useState, useRef } from 'react';
import { CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { toast } from 'sonner';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import { head } from 'lodash';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { customizeWidgetTourSteps, tourKeys } from '@/constants/toursteps';
import { Settings } from 'lucide-react';
import CopyCustomizationModal from './copyCustomizationModal';
import { SITE_SELECTOR_TEXT } from '@/constants';
import { getAuthenticationCookie } from '@/utils/cookie';

export interface Colors {
  // Grouped color properties (customizable)
  colorGroup1: string; // Light: #232e72, Dark: #d0d5f8
  colorGroup2: string; // Light: #e0eceb, Dark: #465ce4
  colorGroup3: string; // Light: #111639, Dark: #232e72
  colorGroup4: string; // Light: #232e72, Dark: #111639
  colorGroup5: string; // Light: #465ce4, Dark: #e6f2f2
  colorGroup6: string; // Light: #ffffff, Dark: #333d7c

  // Keep existing properties for compatibility
  widgetBtnColor: string;
  logoImage: string;
  accessibilityStatementLinkUrl: string;
  logoUrl: string;
  footerText: string; // Custom footer branding text
}

export interface Toggles {
  language: boolean;
  darkMode: boolean;
  screenReader: boolean;
  readingGuide: boolean;
  stopAnimations: boolean;
  bigCursor: boolean;
  voiceNavigation: boolean;
  darkContrast: boolean;
  lightContrast: boolean;
  highContrast: boolean;
  highSaturation: boolean;
  lowSaturation: boolean;
  monochrome: boolean;
  highlightLinks: boolean;
  highlightTitle: boolean;
  dyslexiaFont: boolean;
  letterSpacing: boolean;
  lineHeight: boolean;
  fontWeight: boolean;
  motorImpaired: boolean;
  blind: boolean;
  dyslexia: boolean;
  visuallyImpaired: boolean;
  cognitiveAndLearning: boolean;
  seizureAndEpileptic: boolean;
  colorBlind: boolean;
  adhd: boolean;
  oversizeWidget: boolean;
  fontSize: boolean;
  textColor: boolean;
  titleColor: boolean;
  backgroundColor: boolean;
  pageStructure: boolean;
  keyboardNavigation: boolean;
  widgetPosition: boolean;
}

const AccessibilityWidgetPage: React.FC<any> = ({
  allDomains,
  selectedSite,
}: any) => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.customize_widget') });
  const [toggles, setToggles] = useState({
    language: true,
    darkMode: true,
    screenReader: true,
    readingGuide: true,
    stopAnimations: true,
    bigCursor: true,
    voiceNavigation: true,
    darkContrast: true,
    lightContrast: true,
    highContrast: true,
    highSaturation: true,
    lowSaturation: true,
    monochrome: true,
    highlightLinks: true,
    highlightTitle: true,
    dyslexiaFont: true,
    letterSpacing: true,
    lineHeight: true,
    fontWeight: true,
    motorImpaired: true,
    blind: true,
    dyslexia: true,
    visuallyImpaired: true,
    cognitiveAndLearning: true,
    seizureAndEpileptic: true,
    colorBlind: true,
    adhd: true,
    oversizeWidget: true,
    fontSize: true,
    textColor: true,
    titleColor: true,
    backgroundColor: true,
    pageStructure: true,
    keyboardNavigation: true,
    widgetPosition: true,
  });
  const { data: userData } = useSelector((state: RootState) => state.user);
  const [buttonDisable, setButtonDisable] = useState(false);

  const [hasUserMadeChanges, setHasUserMadeChanges] = useState(false);
  const [selectedFont, setSelectedFont] = useState("'Times New Roman', serif");
  const [copyDomain, setCopyDomain] = useState('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyComplete, setCopyComplete] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const DefaultLightColors: Colors = {
    // Grouped colors for light mode
    colorGroup1: '#232e72', // Main text, icons, buttons
    colorGroup2: '#e0eceb', // Header text and icons
    colorGroup3: '#111639', // Header background
    colorGroup4: '#232e72', // Footer background
    colorGroup5: '#465ce4', // Header button borders
    colorGroup6: '#ffffff', // White backgrounds

    // Existing properties
    widgetBtnColor: '#111639',
    logoImage: '',
    accessibilityStatementLinkUrl: 'https://www.webability.io/statement',
    logoUrl: 'https://webability.io',
    footerText: 'Webability',
  };

  const DefaultDarkColors: Colors = {
    // Grouped colors for dark mode
    colorGroup1: '#d0d5f8', // Light text and icons
    colorGroup2: '#465ce4', // Primary accent
    colorGroup3: '#232e72', // Mid-tone background
    colorGroup4: '#111639', // Dark backgrounds
    colorGroup5: '#e6f2f2', // Light accent text
    colorGroup6: '#333d7c', // Header background

    // Existing properties (same as light mode)
    widgetBtnColor: '#111639',
    logoImage: '',
    accessibilityStatementLinkUrl: 'https://www.webability.io/statement',
    logoUrl: 'https://webability.io',
    footerText: 'Webability',
  };
  const DefaultToggles = {
    language: true,
    darkMode: true,
    screenReader: true,
    readingGuide: true,
    stopAnimations: true,
    bigCursor: true,
    voiceNavigation: true,
    darkContrast: true,
    lightContrast: true,
    highContrast: true,
    highSaturation: true,
    lowSaturation: true,
    monochrome: true,
    highlightLinks: true,
    highlightTitle: true,
    dyslexiaFont: true,
    letterSpacing: true,
    lineHeight: true,
    fontWeight: true,
    motorImpaired: true,
    blind: true,
    dyslexia: true,
    visuallyImpaired: true,
    cognitiveAndLearning: true,
    seizureAndEpileptic: true,
    colorBlind: true,
    adhd: true,
    oversizeWidget: true,
    fontSize: true,
    textColor: true,
    titleColor: true,
    backgroundColor: true,
    pageStructure: true,
    keyboardNavigation: true,
    widgetPosition: true,
  };

  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  const [lightModeColors, setLightModeColors] = useState({
    ...DefaultLightColors,
  });

  const [darkModeColors, setDarkModeColors] = useState({
    ...DefaultDarkColors,
  });

  // Active colors based on selected mode
  const colors = colorMode === 'light' ? lightModeColors : darkModeColors;
  const setColors =
    colorMode === 'light' ? setLightModeColors : setDarkModeColors;

  const fonts = [
    "'Arial', sans-serif",
    "'Verdana', sans-serif",
    "'Helvetica', sans-serif",
    "'Tahoma', sans-serif",
    "'Trebuchet MS', sans-serif",
    "'Impact', sans-serif",
    "'Times New Roman', serif",
    "'Georgia', serif",
    "'Garamond', serif",
    "'Courier New', monospace",
    "'Lucida Console', monospace",
    "'Comic Sans MS', cursive",
  ];

  const [settings, setSettings] = useState({
    widgetFont: selectedFont,
    // Light mode grouped colors
    'light-mode-color-group-1': DefaultLightColors.colorGroup1,
    'light-mode-color-group-2': DefaultLightColors.colorGroup2,
    'light-mode-color-group-3': DefaultLightColors.colorGroup3,
    'light-mode-color-group-4': DefaultLightColors.colorGroup4,
    'light-mode-color-group-5': DefaultLightColors.colorGroup5,
    'light-mode-color-group-6': DefaultLightColors.colorGroup6,
    // Dark mode grouped colors
    'dark-mode-color-group-1': DefaultDarkColors.colorGroup1,
    'dark-mode-color-group-2': DefaultDarkColors.colorGroup2,
    'dark-mode-color-group-3': DefaultDarkColors.colorGroup3,
    'dark-mode-color-group-4': DefaultDarkColors.colorGroup4,
    'dark-mode-color-group-5': DefaultDarkColors.colorGroup5,
    'dark-mode-color-group-6': DefaultDarkColors.colorGroup6,
    // Common properties
    'widget-btn-color': DefaultLightColors.widgetBtnColor,
    logoImage: DefaultLightColors.logoImage,
    accessibilityStatementLinkUrl:
      DefaultLightColors.accessibilityStatementLinkUrl,
    logoUrl: DefaultLightColors.logoUrl,
    footerText: DefaultLightColors.footerText,
    toggleLanguage: DefaultToggles.language ? 1 : 0,
    toggledarkMode: DefaultToggles.darkMode ? 1 : 0,
    'togglescreen-reader': DefaultToggles.screenReader ? 1 : 0,
    'togglereadable-guide': DefaultToggles.readingGuide ? 1 : 0,
    'togglestop-animations': DefaultToggles.stopAnimations ? 1 : 0,
    'togglebig-cursor': DefaultToggles.bigCursor ? 1 : 0,
    'togglevoice-navigation': DefaultToggles.voiceNavigation ? 1 : 0,
    'toggledark-contrast': DefaultToggles.darkContrast ? 1 : 0,
    'togglelight-contrast': DefaultToggles.lightContrast ? 1 : 0,
    'togglehigh-contrast': DefaultToggles.highContrast ? 1 : 0,
    'togglehigh-saturation': DefaultToggles.highSaturation ? 1 : 0,
    'togglelow-saturation': DefaultToggles.lowSaturation ? 1 : 0,
    togglemonochrome: DefaultToggles.monochrome ? 1 : 0,
    'togglehighlight-links': DefaultToggles.highlightLinks ? 1 : 0,
    'togglehighlight-title': DefaultToggles.highlightTitle ? 1 : 0,
    'togglereadable-font': DefaultToggles.dyslexiaFont ? 1 : 0,
    'toggleletter-spacing': DefaultToggles.letterSpacing ? 1 : 0,
    'toggleline-height': DefaultToggles.lineHeight ? 1 : 0,
    'togglefont-weight': DefaultToggles.fontWeight ? 1 : 0,
    'togglemotor-impaired': DefaultToggles.motorImpaired ? 1 : 0,
    toggleblind: DefaultToggles.blind ? 1 : 0,
    'toggledyslexia-font': DefaultToggles.dyslexia ? 1 : 0,
    'togglevisually-impaired': DefaultToggles.visuallyImpaired ? 1 : 0,
    'togglecognitive-learning': DefaultToggles.cognitiveAndLearning ? 1 : 0,
    'toggleseizure-epileptic': DefaultToggles.seizureAndEpileptic ? 1 : 0,
    'togglecolor-blind': DefaultToggles.colorBlind ? 1 : 0,
    toggleadhd: DefaultToggles.adhd ? 1 : 0,
    'toggleoversize-widget': DefaultToggles.oversizeWidget ? 1 : 0,
    'togglefont-size': DefaultToggles.fontSize ? 1 : 0,
    'toggletext-color': DefaultToggles.textColor ? 1 : 0,
    'toggletitle-color': DefaultToggles.titleColor ? 1 : 0,
    'togglebackground-color': DefaultToggles.backgroundColor ? 1 : 0,
    'togglepage-structure': DefaultToggles.pageStructure ? 1 : 0,
    'togglekeyboard-navigation': DefaultToggles.keyboardNavigation ? 1 : 0,
    'togglewidget-position': DefaultToggles.widgetPosition ? 1 : 0,
  });

  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Customize widget tour completed!');
  };

  const isMounted = useRef(true);

  useEffect(() => {
    //console.log("isGenerating",isGenerating);
    return () => {
      isMounted.current = false;
    };
  }, []);
  useEffect(() => {
    setSettings({
      widgetFont: selectedFont,
      // Light mode grouped colors
      'light-mode-color-group-1': lightModeColors.colorGroup1,
      'light-mode-color-group-2': lightModeColors.colorGroup2,
      'light-mode-color-group-3': lightModeColors.colorGroup3,
      'light-mode-color-group-4': lightModeColors.colorGroup4,
      'light-mode-color-group-5': lightModeColors.colorGroup5,
      'light-mode-color-group-6': lightModeColors.colorGroup6,
      // Dark mode grouped colors
      'dark-mode-color-group-1': darkModeColors.colorGroup1,
      'dark-mode-color-group-2': darkModeColors.colorGroup2,
      'dark-mode-color-group-3': darkModeColors.colorGroup3,
      'dark-mode-color-group-4': darkModeColors.colorGroup4,
      'dark-mode-color-group-5': darkModeColors.colorGroup5,
      'dark-mode-color-group-6': darkModeColors.colorGroup6,
      // Common properties
      'widget-btn-color': lightModeColors.widgetBtnColor,
      logoImage: lightModeColors.logoImage,
      accessibilityStatementLinkUrl:
        lightModeColors.accessibilityStatementLinkUrl,
      logoUrl: lightModeColors.logoUrl,
      footerText: lightModeColors.footerText,
      toggleLanguage: toggles.language ? 1 : 0,
      toggledarkMode: toggles.darkMode ? 1 : 0,
      'togglescreen-reader': toggles.screenReader ? 1 : 0,
      'togglereadable-guide': toggles.readingGuide ? 1 : 0,
      'togglestop-animations': toggles.stopAnimations ? 1 : 0,
      'togglebig-cursor': toggles.bigCursor ? 1 : 0,
      'togglevoice-navigation': toggles.voiceNavigation ? 1 : 0,
      'toggledark-contrast': toggles.darkContrast ? 1 : 0,
      'togglelight-contrast': toggles.lightContrast ? 1 : 0,
      'togglehigh-contrast': toggles.highContrast ? 1 : 0,
      'togglehigh-saturation': toggles.highSaturation ? 1 : 0,
      'togglelow-saturation': toggles.lowSaturation ? 1 : 0,
      togglemonochrome: toggles.monochrome ? 1 : 0,
      'togglehighlight-links': toggles.highlightLinks ? 1 : 0,
      'togglehighlight-title': toggles.highlightTitle ? 1 : 0,
      'togglereadable-font': toggles.dyslexiaFont ? 1 : 0,
      'toggleletter-spacing': toggles.letterSpacing ? 1 : 0,
      'toggleline-height': toggles.lineHeight ? 1 : 0,
      'togglefont-weight': toggles.fontWeight ? 1 : 0,
      'togglemotor-impaired': toggles.motorImpaired ? 1 : 0,
      toggleblind: toggles.blind ? 1 : 0,
      'toggledyslexia-font': toggles.dyslexia ? 1 : 0,
      'togglevisually-impaired': toggles.visuallyImpaired ? 1 : 0,
      'togglecognitive-learning': toggles.cognitiveAndLearning ? 1 : 0,
      'toggleseizure-epileptic': toggles.seizureAndEpileptic ? 1 : 0,
      'togglecolor-blind': toggles.colorBlind ? 1 : 0,
      toggleadhd: toggles.adhd ? 1 : 0,
      'toggleoversize-widget': toggles.oversizeWidget ? 1 : 0,
      'togglefont-size': toggles.fontSize ? 1 : 0,
      'toggletext-color': toggles.textColor ? 1 : 0,
      'toggletitle-color': toggles.titleColor ? 1 : 0,
      'togglebackground-color': toggles.backgroundColor ? 1 : 0,
      'togglepage-structure': toggles.pageStructure ? 1 : 0,
      'togglekeyboard-navigation': toggles.keyboardNavigation ? 1 : 0,
      'togglewidget-position': toggles.widgetPosition ? 1 : 0,
    });
  }, [toggles, lightModeColors, darkModeColors, selectedFont]);

  const resetAll = async () => {
    if (isMounted.current) {
      // Reset all state values to defaults
      setLightModeColors(DefaultLightColors);
      setDarkModeColors(DefaultDarkColors);
      setToggles(DefaultToggles);
      setSelectedFont("'Times New Roman', serif");

      // Enable change tracking so the useEffect can update settings and trigger save
      setHasUserMadeChanges(true);
    } else {
      console.log('Component not mounted, skipping reset');
    }
  };

  const handleSave = async () => {
    if (selectedSite == '' || selectedSite == SITE_SELECTOR_TEXT) {
      toast.error('Please Select a Site from the Dropdown');
      return;
    }
    setButtonDisable(true);

    const url = `${process.env.REACT_APP_BACKEND_URL}/update-site-widget-settings`;
    const bodyData = {
      site_url: selectedSite,
      settings: JSON.stringify(settings),
      user_id: userData?.id,
    };

    const token = getAuthenticationCookie();

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bodyData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        response.json().then((data) => {
          setButtonDisable(false);
          toast.success(`Widget Settings Saved for ${selectedSite}`);
          setHasUserMadeChanges(false);
          setTimeout(() => {
            setHasUserMadeChanges(true);
          }, 100);
        });
      })
      .catch((error) => {
        setButtonDisable(false);
        toast.error(`Error While Saving Settings. Try Again Later !!`);
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  useEffect(() => {
    // Don't trigger saves before initial settings fetch or if no site is selected
    if (
      !hasUserMadeChanges ||
      !selectedSite ||
      selectedSite === SITE_SELECTOR_TEXT
    ) {
      return;
    }

    const timer = setTimeout(() => {
      handleSave();
    }, 1000);

    // Cleanup timeout on each settings change
    return () => clearTimeout(timer);
  }, [settings]); // Include all dependencies

  const getSettings = async () => {
    if (selectedSite == '' || selectedSite == SITE_SELECTOR_TEXT) {
      toast.error('Please Select a Site from the Side Bar');
      setIsLoadingSettings(false);
      return;
    }
    setButtonDisable(true);
    setIsLoadingSettings(true);
    const url = `${process.env.REACT_APP_BACKEND_URL}/get-site-widget-settings`;
    const bodyData = { site_url: selectedSite };

    const token = getAuthenticationCookie();

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bodyData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        if (isMounted.current) {
          setButtonDisable(false);
        }
        // Log the returned settings for debugging

        // If data.settings is a JSON string, parse it. Otherwise, use it directly.
        let fetchedSettings: any;
        try {
          fetchedSettings =
            typeof data.settings === 'string'
              ? JSON.parse(data.settings)
              : data.settings;
        } catch (e) {
          console.error('Failed to parse settings', e);
          setIsLoadingSettings(false);
          return;
        }

        if (Object.keys(fetchedSettings).length == 0) {
          resetAll();
          setIsLoadingSettings(false);
          return;
        }

        // Update selected font
        if (fetchedSettings?.widgetFont) {
          setSelectedFont(fetchedSettings?.widgetFont);
        }

        // Update colors using grouped structure
        // Load light mode grouped colors
        setLightModeColors({
          colorGroup1:
            fetchedSettings['light-mode-color-group-1'] ||
            DefaultLightColors.colorGroup1,
          colorGroup2:
            fetchedSettings['light-mode-color-group-2'] ||
            DefaultLightColors.colorGroup2,
          colorGroup3:
            fetchedSettings['light-mode-color-group-3'] ||
            DefaultLightColors.colorGroup3,
          colorGroup4:
            fetchedSettings['light-mode-color-group-4'] ||
            DefaultLightColors.colorGroup4,
          colorGroup5:
            fetchedSettings['light-mode-color-group-5'] ||
            DefaultLightColors.colorGroup5,
          colorGroup6:
            fetchedSettings['light-mode-color-group-6'] ||
            DefaultLightColors.colorGroup6,
          widgetBtnColor:
            fetchedSettings['widget-btn-color'] ||
            DefaultLightColors.widgetBtnColor,
          logoImage:
            fetchedSettings['logoImage'] && fetchedSettings['logoImage'].length
              ? fetchedSettings['logoImage']
              : DefaultLightColors.logoImage,
          accessibilityStatementLinkUrl:
            fetchedSettings['accessibilityStatementLinkUrl'] ||
            DefaultLightColors.accessibilityStatementLinkUrl,
          logoUrl: fetchedSettings['logoUrl'] || DefaultLightColors.logoUrl,
          footerText:
            fetchedSettings['footerText'] || DefaultLightColors.footerText,
        });

        // Load dark mode grouped colors
        setDarkModeColors({
          colorGroup1:
            fetchedSettings['dark-mode-color-group-1'] ||
            DefaultDarkColors.colorGroup1,
          colorGroup2:
            fetchedSettings['dark-mode-color-group-2'] ||
            DefaultDarkColors.colorGroup2,
          colorGroup3:
            fetchedSettings['dark-mode-color-group-3'] ||
            DefaultDarkColors.colorGroup3,
          colorGroup4:
            fetchedSettings['dark-mode-color-group-4'] ||
            DefaultDarkColors.colorGroup4,
          colorGroup5:
            fetchedSettings['dark-mode-color-group-5'] ||
            DefaultDarkColors.colorGroup5,
          colorGroup6:
            fetchedSettings['dark-mode-color-group-6'] ||
            DefaultDarkColors.colorGroup6,
          widgetBtnColor:
            fetchedSettings['widget-btn-color'] ||
            DefaultDarkColors.widgetBtnColor,
          logoImage:
            fetchedSettings['logoImage'] && fetchedSettings['logoImage'].length
              ? fetchedSettings['logoImage']
              : DefaultDarkColors.logoImage,
          accessibilityStatementLinkUrl:
            fetchedSettings['accessibilityStatementLinkUrl'] ||
            DefaultDarkColors.accessibilityStatementLinkUrl,
          logoUrl: fetchedSettings['logoUrl'] || DefaultDarkColors.logoUrl,
          footerText:
            fetchedSettings['footerText'] || DefaultDarkColors.footerText,
        });

        // Update toggles.
        // Note: The toggle values are stored as numbers (0 or 1); we convert them to booleans.
        setToggles({
          language: fetchedSettings['toggleLanguage'] === 1,
          darkMode: fetchedSettings['toggledarkMode'] === 1,
          screenReader: fetchedSettings['togglescreen-reader'] === 1,
          readingGuide: fetchedSettings['togglereadable-guide'] === 1,
          stopAnimations: fetchedSettings['togglestop-animations'] === 1,
          bigCursor: fetchedSettings['togglebig-cursor'] === 1,
          voiceNavigation: fetchedSettings['togglevoice-navigation'] === 1,
          darkContrast: fetchedSettings['toggledark-contrast'] === 1,
          lightContrast: fetchedSettings['togglelight-contrast'] === 1,
          highContrast: fetchedSettings['togglehigh-contrast'] === 1,
          highSaturation: fetchedSettings['togglehigh-saturation'] === 1,
          lowSaturation: fetchedSettings['togglelow-saturation'] === 1,
          monochrome: fetchedSettings['togglemonochrome'] === 1,
          highlightLinks: fetchedSettings['togglehighlight-links'] === 1,
          highlightTitle: fetchedSettings['togglehighlight-title'] === 1,
          dyslexiaFont: fetchedSettings['togglereadable-font'] === 1,
          letterSpacing: fetchedSettings['toggleletter-spacing'] === 1,
          lineHeight: fetchedSettings['toggleline-height'] === 1,
          fontWeight: fetchedSettings['togglefont-weight'] === 1,
          motorImpaired: fetchedSettings['togglemotor-impaired'] === 1,
          blind: fetchedSettings['toggleblind'] === 1,
          dyslexia: fetchedSettings['toggledyslexia-font'] === 1,
          visuallyImpaired: fetchedSettings['togglevisually-impaired'] === 1,
          cognitiveAndLearning:
            fetchedSettings['togglecognitive-learning'] === 1,
          seizureAndEpileptic: fetchedSettings['toggleseizure-epileptic'] === 1,
          colorBlind: fetchedSettings['togglecolor-blind'] === 1,
          adhd: fetchedSettings['toggleadhd'] === 1,
          oversizeWidget: fetchedSettings['toggleoversize-widget'] === 1,
          fontSize: fetchedSettings['togglefont-size'] === 1,
          textColor: fetchedSettings['toggletext-color'] === 1,
          titleColor: fetchedSettings['toggletitle-color'] === 1,
          backgroundColor: fetchedSettings['togglebackground-color'] === 1,
          pageStructure: fetchedSettings['togglepage-structure'] === 1,
          keyboardNavigation:
            fetchedSettings['togglekeyboard-navigation'] === 1,
          widgetPosition: fetchedSettings['togglewidget-position'] === 1,
        });
        // Set hasUserMadeChanges to false after initial fetch
        setHasUserMadeChanges(false);

        // Then after a small delay, enable changes tracking
        setTimeout(() => {
          setHasUserMadeChanges(true);
          setIsLoadingSettings(false);
        }, 100);
      })
      .catch((error) => {
        setButtonDisable(false);
        setIsLoadingSettings(false);
        toast.error(`Error While Fetching Settings. Try Again Later !!`);
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  const handleCopySettings = async () => {
    if (copyDomain == '' || copyDomain == SITE_SELECTOR_TEXT) {
      toast.error('Please Select a Domain to Copy Settings From');
      return;
    }
    if (selectedSite == '' || selectedSite == SITE_SELECTOR_TEXT) {
      toast.error('Please Select a Target Site');
      return;
    }

    setButtonDisable(true);

    // First, get settings from the copyDomain
    const url = `${process.env.REACT_APP_BACKEND_URL}/get-site-widget-settings`;
    const bodyData = { site_url: copyDomain };

    const token = getAuthenticationCookie();

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bodyData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        // Parse the fetched settings
        let fetchedSettings: any;
        try {
          fetchedSettings =
            typeof data.settings === 'string'
              ? JSON.parse(data.settings)
              : data.settings;
        } catch (e) {
          console.error('Failed to parse settings', e);
          setButtonDisable(false);
          toast.error('Failed to parse settings from source domain');
          return;
        }

        if (Object.keys(fetchedSettings).length == 0) {
          setButtonDisable(false);
          toast.error('No settings found for the selected domain');
          return;
        }

        // Update selected font
        if (fetchedSettings?.widgetFont) {
          setSelectedFont(fetchedSettings?.widgetFont);
        }

        // Update colors using grouped structure
        // Load light mode grouped colors
        setLightModeColors({
          colorGroup1:
            fetchedSettings['light-mode-color-group-1'] ||
            DefaultLightColors.colorGroup1,
          colorGroup2:
            fetchedSettings['light-mode-color-group-2'] ||
            DefaultLightColors.colorGroup2,
          colorGroup3:
            fetchedSettings['light-mode-color-group-3'] ||
            DefaultLightColors.colorGroup3,
          colorGroup4:
            fetchedSettings['light-mode-color-group-4'] ||
            DefaultLightColors.colorGroup4,
          colorGroup5:
            fetchedSettings['light-mode-color-group-5'] ||
            DefaultLightColors.colorGroup5,
          colorGroup6:
            fetchedSettings['light-mode-color-group-6'] ||
            DefaultLightColors.colorGroup6,
          widgetBtnColor:
            fetchedSettings['widget-btn-color'] ||
            DefaultLightColors.widgetBtnColor,
          logoImage:
            fetchedSettings['logoImage'] && fetchedSettings['logoImage'].length
              ? fetchedSettings['logoImage']
              : DefaultLightColors.logoImage,
          accessibilityStatementLinkUrl:
            fetchedSettings['accessibilityStatementLinkUrl'] ||
            DefaultLightColors.accessibilityStatementLinkUrl,
          logoUrl: fetchedSettings['logoUrl'] || DefaultLightColors.logoUrl,
          footerText:
            fetchedSettings['footerText'] || DefaultLightColors.footerText,
        });

        // Load dark mode grouped colors
        setDarkModeColors({
          colorGroup1:
            fetchedSettings['dark-mode-color-group-1'] ||
            DefaultDarkColors.colorGroup1,
          colorGroup2:
            fetchedSettings['dark-mode-color-group-2'] ||
            DefaultDarkColors.colorGroup2,
          colorGroup3:
            fetchedSettings['dark-mode-color-group-3'] ||
            DefaultDarkColors.colorGroup3,
          colorGroup4:
            fetchedSettings['dark-mode-color-group-4'] ||
            DefaultDarkColors.colorGroup4,
          colorGroup5:
            fetchedSettings['dark-mode-color-group-5'] ||
            DefaultDarkColors.colorGroup5,
          colorGroup6:
            fetchedSettings['dark-mode-color-group-6'] ||
            DefaultDarkColors.colorGroup6,
          widgetBtnColor:
            fetchedSettings['widget-btn-color'] ||
            DefaultDarkColors.widgetBtnColor,
          logoImage:
            fetchedSettings['logoImage'] && fetchedSettings['logoImage'].length
              ? fetchedSettings['logoImage']
              : DefaultDarkColors.logoImage,
          accessibilityStatementLinkUrl:
            fetchedSettings['accessibilityStatementLinkUrl'] ||
            DefaultDarkColors.accessibilityStatementLinkUrl,
          logoUrl: fetchedSettings['logoUrl'] || DefaultDarkColors.logoUrl,
          footerText:
            fetchedSettings['footerText'] || DefaultDarkColors.footerText,
        });

        // Update toggles.
        setToggles({
          language: fetchedSettings['toggleLanguage'] === 1,
          darkMode: fetchedSettings['toggledarkMode'] === 1,
          screenReader: fetchedSettings['togglescreen-reader'] === 1,
          readingGuide: fetchedSettings['togglereadable-guide'] === 1,
          stopAnimations: fetchedSettings['togglestop-animations'] === 1,
          bigCursor: fetchedSettings['togglebig-cursor'] === 1,
          voiceNavigation: fetchedSettings['togglevoice-navigation'] === 1,
          darkContrast: fetchedSettings['toggledark-contrast'] === 1,
          lightContrast: fetchedSettings['togglelight-contrast'] === 1,
          highContrast: fetchedSettings['togglehigh-contrast'] === 1,
          highSaturation: fetchedSettings['togglehigh-saturation'] === 1,
          lowSaturation: fetchedSettings['togglelow-saturation'] === 1,
          monochrome: fetchedSettings['togglemonochrome'] === 1,
          highlightLinks: fetchedSettings['togglehighlight-links'] === 1,
          highlightTitle: fetchedSettings['togglehighlight-title'] === 1,
          dyslexiaFont: fetchedSettings['togglereadable-font'] === 1,
          letterSpacing: fetchedSettings['toggleletter-spacing'] === 1,
          lineHeight: fetchedSettings['toggleline-height'] === 1,
          fontWeight: fetchedSettings['togglefont-weight'] === 1,
          motorImpaired: fetchedSettings['togglemotor-impaired'] === 1,
          blind: fetchedSettings['toggleblind'] === 1,
          dyslexia: fetchedSettings['toggledyslexia-font'] === 1,
          visuallyImpaired: fetchedSettings['togglevisually-impaired'] === 1,
          cognitiveAndLearning:
            fetchedSettings['togglecognitive-learning'] === 1,
          seizureAndEpileptic: fetchedSettings['toggleseizure-epileptic'] === 1,
          colorBlind: fetchedSettings['togglecolor-blind'] === 1,
          adhd: fetchedSettings['toggleadhd'] === 1,
          oversizeWidget: fetchedSettings['toggleoversize-widget'] === 1,
          fontSize: fetchedSettings['togglefont-size'] === 1,
          textColor: fetchedSettings['toggletext-color'] === 1,
          titleColor: fetchedSettings['toggletitle-color'] === 1,
          backgroundColor: fetchedSettings['togglebackground-color'] === 1,
          pageStructure: fetchedSettings['togglepage-structure'] === 1,
          keyboardNavigation:
            fetchedSettings['togglekeyboard-navigation'] === 1,
          widgetPosition: fetchedSettings['togglewidget-position'] === 1,
        });

        // Disable change tracking temporarily
        setHasUserMadeChanges(false);

        // Trigger the copy completion after state updates
        setTimeout(() => {
          setCopyComplete(true);
        }, 100); // Wait for state updates to complete
      })
      .catch((error) => {
        setButtonDisable(false);
        toast.error(
          `Error While Fetching Settings from ${copyDomain}. Try Again Later !!`,
        );
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  useEffect(() => {
    if (copyComplete) {
      // Wait for state updates to complete before saving
      setTimeout(() => {
        handleSave();
        setCopyComplete(false);
        toast.success(`Settings copied from ${copyDomain} to ${selectedSite}`);
      }, 100);
    }
  }, [copyComplete]); // Only depend on copyComplete

  useEffect(() => {
    if (selectedSite != '' && selectedSite != SITE_SELECTOR_TEXT) {
      getSettings();
    }
  }, [selectedSite]);

  return (
    <>
      <TourGuide
        steps={customizeWidgetTourSteps}
        tourKey={tourKeys.customizeWidget}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />

      <div>
        {/* Site Selector Header */}
        <div className="px-6 py-4 customize-widget-header">
          <div className="flex flex-col sm:flex-col md:flex-row items-start sm:items-start md:items-center justify-between gap-3 sm:gap-3 md:gap-0">
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedSite != SITE_SELECTOR_TEXT
                ? selectedSite + "'s Widget Customization"
                : 'Select a Domain to Customize from the Side Bar'}
            </h1>
            {selectedSite != '' && selectedSite != SITE_SELECTOR_TEXT && (
              <button
                onClick={() => setIsCopyModalOpen(true)}
                disabled={buttonDisable}
                className="px-4 py-2 border border-transparent rounded-md text-white bg-[#445AE7] hover:bg-[#3A4BC7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#445AE7] flex items-center gap-2 w-full sm:w-auto md:w-auto copy-customization-button"
              >
                <Settings size={16} />
                Copy Customization
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <CustomizeWidget
          toggles={toggles}
          setToggles={setToggles}
          colors={colors}
          setColors={setColors}
          colorMode={colorMode}
          setColorMode={setColorMode}
          font={fonts}
          selectedFont={selectedFont}
          setSelectedFont={setSelectedFont}
          DefaultColors={
            colorMode === 'light' ? DefaultLightColors : DefaultDarkColors
          }
          onSave={handleSave}
          onReset={resetAll}
          buttonDisable={buttonDisable}
        />
      </div>

      <CopyCustomizationModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        copyDomain={copyDomain}
        setCopyDomain={setCopyDomain}
        selectedSite={selectedSite}
        allDomains={allDomains}
        buttonDisable={buttonDisable}
        onCopySettings={handleCopySettings}
      />
    </>
  );
};

export default AccessibilityWidgetPage;
