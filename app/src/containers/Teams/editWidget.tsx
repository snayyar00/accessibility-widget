import type React from 'react';
import AccessibilityMenu from './MenuPreview';
import CustomizeWidget from './CustomizeWidget';
import { useEffect, useState, useRef } from 'react';
import { CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { toast } from 'react-toastify';
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
  headerText: string;
  headerBg: string;
  headerControlsColor: string;
  footerText: string;
  footerBg: string;
  buttonText: string;
  buttonBg: string;
  menuBg: string;
  dropdownText: string;
  dropdownBg: string;
  widgetInnerText: string;
  fontSizeMenuBg: string;
  fontSizeMenuText: string;
  fontSizeMenuButton: string;
  customizationMenuInnerBg: string;
  widgetBtnColor: string;
  logoImage: string;
  accessibilityStatementLinkUrl: string;
  logoUrl: string;
  reportButtonsBgColor: string;
  reportButtonsTextColor: string;
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
  });
  const { data: userData } = useSelector((state: RootState) => state.user);
  const [buttonDisable, setButtonDisable] = useState(false);

  const [hasUserMadeChanges, setHasUserMadeChanges] = useState(false);
  const [selectedFont, setSelectedFont] = useState("'Times New Roman', serif");
  const [copyDomain, setCopyDomain] = useState('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyComplete, setCopyComplete] = useState(false);

  const DefaultColors: Colors = {
    headerText: '#FFFFFF',
    headerBg: '#0848ca',
    headerControlsColor: '#0848ca',
    footerText: '#000000',
    footerBg: '#FFFFFF',
    buttonText: '#000000',
    buttonBg: '#FFFFFF',
    menuBg: '#eff1f5',
    dropdownText: '#000000',
    dropdownBg: '#FFFFFF',
    widgetInnerText: '#000000',
    fontSizeMenuBg: '#FFFFFF',
    fontSizeMenuText: '#000000',
    fontSizeMenuButton: '#eff1f5',
    customizationMenuInnerBg: '#FFFFFF',
    widgetBtnColor: '#195AFF',
    logoImage: '',
    accessibilityStatementLinkUrl: 'https://www.webability.io/statement',
    logoUrl: 'https://webability.io',
    reportButtonsBgColor: '#0948c9',
    reportButtonsTextColor: '#FFFFFF',
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
  };

  const [colors, setColors] = useState({
    headerText: DefaultColors.headerText,
    headerBg: DefaultColors.headerBg,
    headerControlsColor: DefaultColors.headerControlsColor,
    footerText: DefaultColors.footerText,
    footerBg: DefaultColors.footerBg,
    buttonText: DefaultColors.buttonText,
    buttonBg: DefaultColors.buttonBg,
    menuBg: DefaultColors.menuBg,
    dropdownText: DefaultColors.dropdownText,
    dropdownBg: DefaultColors.dropdownBg,
    widgetInnerText: DefaultColors.widgetInnerText,
    fontSizeMenuBg: DefaultColors.fontSizeMenuBg,
    fontSizeMenuText: DefaultColors.fontSizeMenuText,
    fontSizeMenuButton: DefaultColors.fontSizeMenuButton,
    customizationMenuInnerBg: DefaultColors.customizationMenuInnerBg,
    widgetBtnColor: DefaultColors.widgetBtnColor,
    logoImage: DefaultColors.logoImage,
    accessibilityStatementLinkUrl: DefaultColors.accessibilityStatementLinkUrl,
    logoUrl: DefaultColors.logoUrl,
    reportButtonsBgColor: DefaultColors.reportButtonsBgColor,
    reportButtonsTextColor: DefaultColors.reportButtonsTextColor,
  });

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
    'footer-bg': DefaultColors.footerBg,
    'footer-text': DefaultColors.footerText,
    'header-text': DefaultColors.headerText,
    'header-bg': DefaultColors.headerBg,
    'header-controls-color': DefaultColors.headerControlsColor,
    'button-text': DefaultColors.buttonText,
    'bg-button': DefaultColors.buttonBg,
    'widget-background': DefaultColors.menuBg,
    'dropdown-text': DefaultColors.dropdownText,
    'bg-dropdown': DefaultColors.dropdownBg,
    'widget-text': DefaultColors.widgetInnerText,
    'font-size-bg': DefaultColors.fontSizeMenuBg,
    'font-size-buttons': DefaultColors.fontSizeMenuButton,
    'font-size-text': DefaultColors.fontSizeMenuText,
    'widget-btn-color': DefaultColors.widgetBtnColor,
    logoImage: DefaultColors.logoImage,
    accessibilityStatementLinkUrl: DefaultColors.accessibilityStatementLinkUrl,
    logoUrl: DefaultColors.logoUrl,
    reportButtonsBgColor: DefaultColors.reportButtonsBgColor,
    reportButtonsTextColor: DefaultColors.reportButtonsTextColor,
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
      'footer-bg': colors.footerBg,
      'footer-text': colors.footerText,
      'header-text': colors.headerText,
      'header-bg': colors.headerBg,
      'header-controls-color': colors.headerControlsColor,
      'button-text': colors.buttonText,
      'bg-button': colors.buttonBg,
      'widget-background': colors.menuBg,
      'dropdown-text': colors.dropdownText,
      'bg-dropdown': colors.dropdownBg,
      'widget-text': colors.widgetInnerText,
      'font-size-bg': colors.fontSizeMenuBg,
      'font-size-buttons': colors.fontSizeMenuButton,
      'font-size-text': colors.fontSizeMenuText,
      'widget-btn-color': colors.widgetBtnColor,
      logoImage: colors.logoImage,
      accessibilityStatementLinkUrl: colors.accessibilityStatementLinkUrl,
      logoUrl: colors.logoUrl,
      reportButtonsBgColor: colors.reportButtonsBgColor,
      reportButtonsTextColor: colors.reportButtonsTextColor,
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
    });
  }, [toggles, colors, selectedFont]);

  const resetAll = () => {
    if (isMounted.current) {
      setColors(DefaultColors);
      setToggles(DefaultToggles);
      setSelectedFont("'Times New Roman', serif");
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
      return;
    }
    setButtonDisable(true);
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
          return;
        }

        if (Object.keys(fetchedSettings).length == 0) {
          resetAll();
          return;
        }

        // Update selected font
        if (fetchedSettings?.widgetFont) {
          setSelectedFont(fetchedSettings?.widgetFont);
        }

        // Update colors using the corresponding keys.
        // (For any color key not returned, the default will be used.)
        setColors({
          headerText:
            fetchedSettings['header-text'] || DefaultColors.headerText,
          headerBg: fetchedSettings['header-bg'] || DefaultColors.headerBg,
          headerControlsColor:
            fetchedSettings['header-controls-color'] ||
            DefaultColors.headerControlsColor,
          footerText:
            fetchedSettings['footer-text'] || DefaultColors.footerText,
          footerBg: fetchedSettings['footer-bg'] || DefaultColors.footerBg,
          buttonText:
            fetchedSettings['button-text'] || DefaultColors.buttonText,
          buttonBg: fetchedSettings['bg-button'] || DefaultColors.buttonBg,
          menuBg: fetchedSettings['widget-background'] || DefaultColors.menuBg,
          widgetBtnColor:
            fetchedSettings['widget-btn-color'] || DefaultColors.widgetBtnColor,
          dropdownText:
            fetchedSettings['dropdown-text'] || DefaultColors.dropdownText,
          dropdownBg:
            fetchedSettings['bg-dropdown'] || DefaultColors.dropdownBg,
          widgetInnerText:
            fetchedSettings['widget-text'] || DefaultColors.widgetInnerText,
          fontSizeMenuBg:
            fetchedSettings['font-size-bg'] || DefaultColors.fontSizeMenuBg,
          fontSizeMenuButton:
            fetchedSettings['font-size-buttons'] ||
            DefaultColors.fontSizeMenuButton,
          fontSizeMenuText:
            fetchedSettings['font-size-text'] || DefaultColors.fontSizeMenuText,
          customizationMenuInnerBg: DefaultColors.customizationMenuInnerBg,
          logoImage:
            fetchedSettings['logoImage'] && fetchedSettings['logoImage'].length
              ? fetchedSettings['logoImage']
              : DefaultColors.logoImage,
          accessibilityStatementLinkUrl:
            fetchedSettings['accessibilityStatementLinkUrl'] ||
            DefaultColors.accessibilityStatementLinkUrl,
          logoUrl: fetchedSettings['logoUrl'] || DefaultColors.logoUrl,
          reportButtonsBgColor:
            fetchedSettings['reportButtonsBgColor'] ||
            DefaultColors.reportButtonsBgColor,
          reportButtonsTextColor:
            fetchedSettings['reportButtonsTextColor'] ||
            DefaultColors.reportButtonsTextColor,
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
        });
        // Set hasUserMadeChanges to false after initial fetch
        setHasUserMadeChanges(false);

        // Then after a small delay, enable changes tracking
        setTimeout(() => {
          setHasUserMadeChanges(true);
        }, 100);
      })
      .catch((error) => {
        setButtonDisable(false);
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

        // Update colors using the corresponding keys.
        setColors({
          headerText:
            fetchedSettings['header-text'] || DefaultColors.headerText,
          headerBg: fetchedSettings['header-bg'] || DefaultColors.headerBg,
          headerControlsColor:
            fetchedSettings['header-controls-color'] ||
            DefaultColors.headerControlsColor,
          footerText:
            fetchedSettings['footer-text'] || DefaultColors.footerText,
          footerBg: fetchedSettings['footer-bg'] || DefaultColors.footerBg,
          buttonText:
            fetchedSettings['button-text'] || DefaultColors.buttonText,
          buttonBg: fetchedSettings['bg-button'] || DefaultColors.buttonBg,
          menuBg: fetchedSettings['widget-background'] || DefaultColors.menuBg,
          widgetBtnColor:
            fetchedSettings['widget-btn-color'] || DefaultColors.widgetBtnColor,
          dropdownText:
            fetchedSettings['dropdown-text'] || DefaultColors.dropdownText,
          dropdownBg:
            fetchedSettings['bg-dropdown'] || DefaultColors.dropdownBg,
          widgetInnerText:
            fetchedSettings['widget-text'] || DefaultColors.widgetInnerText,
          fontSizeMenuBg:
            fetchedSettings['font-size-bg'] || DefaultColors.fontSizeMenuBg,
          fontSizeMenuButton:
            fetchedSettings['font-size-buttons'] ||
            DefaultColors.fontSizeMenuButton,
          fontSizeMenuText:
            fetchedSettings['font-size-text'] || DefaultColors.fontSizeMenuText,
          customizationMenuInnerBg: DefaultColors.customizationMenuInnerBg,
          logoImage:
            fetchedSettings['logoImage'] && fetchedSettings['logoImage'].length
              ? fetchedSettings['logoImage']
              : DefaultColors.logoImage,
          accessibilityStatementLinkUrl:
            fetchedSettings['accessibilityStatementLinkUrl'] ||
            DefaultColors.accessibilityStatementLinkUrl,
          logoUrl: fetchedSettings['logoUrl'] || DefaultColors.logoUrl,
          reportButtonsBgColor:
            fetchedSettings['reportButtonsBgColor'] ||
            DefaultColors.reportButtonsBgColor,
          reportButtonsTextColor:
            fetchedSettings['reportButtonsTextColor'] ||
            DefaultColors.reportButtonsTextColor,
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

      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="customize-widget-header mb-6">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              {selectedSite != SITE_SELECTOR_TEXT
                ? selectedSite + "'s Widget Customization"
                : 'Select a Domain to Customize from the Side Bar'}
            </h1>
          </header>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="widget-preview-section rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-4 text-xl font-semibold text-gray-800">
                Widget Preview
              </h2>
              <div className="border border-gray-100 p-4 rounded-md">
                <AccessibilityMenu
                  selectedFont={selectedFont}
                  colors={colors}
                  toggles={toggles}
                />
              </div>
            </div>
            <div className="widget-customization-section rounded-lg bg-white p-6 shadow-md">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Choose your settings
                </h2>
                {selectedSite != '' && selectedSite != SITE_SELECTOR_TEXT && (
                  <button
                    onClick={() => setIsCopyModalOpen(true)}
                    disabled={buttonDisable}
                    className="w-fit px-4 py-2 border border-transparent rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Copy Customization
                  </button>
                )}
              </div>

              <div className="border border-gray-100 p-4 rounded-md">
                <CustomizeWidget
                  toggles={toggles}
                  setToggles={setToggles}
                  colors={colors}
                  setColors={setColors}
                  font={fonts}
                  selectedFont={selectedFont}
                  setSelectedFont={setSelectedFont}
                  DefaultColors={DefaultColors}
                />
              </div>
            </div>
          </div>
          <div className="save-reset-buttons mt-8 flex flex-col justify-center w-full space-y-4">
            <button
              onClick={handleSave}
              disabled={buttonDisable}
              className="w-full px-4 py-2 border border-transparent rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save
            </button>
            <button
              disabled={buttonDisable}
              onClick={resetAll}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset
            </button>
          </div>
        </div>
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
