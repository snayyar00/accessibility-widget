import type React from 'react';
import AccessibilityMenu from './MenuPreview';
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
  // Widget script color properties
  allIconsAndText: string;
  toggleIconColor: string;
  toggleBgUnchecked: string;
  toggleBgChecked: string;
  reportIssueText: string;
  reportIssueInputText: string;
  reportIssueButtons: string;
  reportIssueButtonBackground: string;
  reportIssueTextboxBackground: string;
  reportIssueCardDropdownBackground: string;
  selectedItems: string;
  headerText: string;
  cardTitles: string;
  headerIcons: string;
  headerBackground: string;
  footerBackground: string;
  headerButtonsBorder: string;
  allBorderLines: string;
  numberedButtons: string;
  widgetBackground: string;
  dropdownBackgrounds: string;
  allHoverStates: string;
  selectedLanguage: string;
  progressBars: string;
  // Keep existing properties for compatibility
  widgetBtnColor: string;
  logoImage: string;
  accessibilityStatementLinkUrl: string;
  logoUrl: string;
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
    oversizeWidget: false,
    fontSize: false,
    textColor: false,
    titleColor: false,
    backgroundColor: false,
    pageStructure: false,
    keyboardNavigation: false,
    widgetPosition: false,
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
    // Light mode - Widget script color properties
    allIconsAndText: '#3b4581',
    toggleIconColor: '#232e72',
    toggleBgUnchecked: '#c3c3c3',
    toggleBgChecked: '#c3c3c3',
    reportIssueText: '#111639',
    reportIssueInputText: '#656565',
    reportIssueButtons: '#ffffff',
    reportIssueButtonBackground: '#465ce4',
    reportIssueTextboxBackground: '#ffffff',
    reportIssueCardDropdownBackground: '#ffffff',
    selectedItems: '#232e72',
    headerText: '#e0eceb',
    cardTitles: '#111639',
    headerIcons: '#cacff1',
    headerBackground: '#111639',
    footerBackground: '#232e72',
    headerButtonsBorder: '#465ce4',
    allBorderLines: '#d7d7d7',
    numberedButtons: '#232e72',
    widgetBackground: '#ffffff',
    dropdownBackgrounds: '#ffffff',
    allHoverStates: '#232e72',
    selectedLanguage: '#232e72',
    progressBars: '#ffffff',
    // Existing properties
    widgetBtnColor: '#195AFF',
    logoImage: '',
    accessibilityStatementLinkUrl: 'https://www.webability.io/statement',
    logoUrl: 'https://webability.io',
  };

  const DefaultDarkColors: Colors = {
    // Dark mode - Widget script color properties
    allIconsAndText: '#d0d5f8',
    toggleIconColor: '#465ce4',
    toggleBgUnchecked: '#c3c3c3',
    toggleBgChecked: '#c3c3c3',
    reportIssueText: '#ffffff',
    reportIssueInputText: '#d0d5f8',
    reportIssueButtons: '#e6f2f2',
    reportIssueButtonBackground: '#465ce4',
    reportIssueTextboxBackground: '#232e72',
    reportIssueCardDropdownBackground: '#111639',
    selectedItems: '#465ce4',
    headerText: '#e6f2f2',
    cardTitles: '#ffffff',
    headerIcons: '#d0d5f8',
    headerBackground: '#333d7c',
    footerBackground: '#465ce4',
    headerButtonsBorder: '#7382e7',
    allBorderLines: '#7484eb',
    numberedButtons: '#cacff1',
    widgetBackground: '#111639',
    dropdownBackgrounds: '#111639',
    allHoverStates: '#465ce4',
    selectedLanguage: '#465ce4',
    progressBars: '#ffffff',
    // Existing properties (same as light mode)
    widgetBtnColor: '#195AFF',
    logoImage: '',
    accessibilityStatementLinkUrl: 'https://www.webability.io/statement',
    logoUrl: 'https://webability.io',
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
    oversizeWidget: false,
    fontSize: false,
    textColor: false,
    titleColor: false,
    backgroundColor: false,
    pageStructure: false,
    keyboardNavigation: false,
    widgetPosition: false,
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
    // Light mode colors
    'light-mode-all-icons-and-text': DefaultLightColors.allIconsAndText,
    'light-mode-toggle-icon-color': DefaultLightColors.toggleIconColor,
    'light-mode-toggle-bg-unchecked': DefaultLightColors.toggleBgUnchecked,
    'light-mode-toggle-bg-checked': DefaultLightColors.toggleBgChecked,
    'light-mode-report-issue-text': DefaultLightColors.reportIssueText,
    'light-mode-report-issue-input-text':
      DefaultLightColors.reportIssueInputText,
    'light-mode-report-issue-buttons': DefaultLightColors.reportIssueButtons,
    'light-mode-report-issue-button-background':
      DefaultLightColors.reportIssueButtonBackground,
    'light-mode-report-issue-textbox-background':
      DefaultLightColors.reportIssueTextboxBackground,
    'light-mode-report-issue-card-dropdown-background':
      DefaultLightColors.reportIssueCardDropdownBackground,
    'light-mode-selected-items': DefaultLightColors.selectedItems,
    'light-mode-header-text': DefaultLightColors.headerText,
    'light-mode-card-titles': DefaultLightColors.cardTitles,
    'light-mode-header-icons': DefaultLightColors.headerIcons,
    'light-mode-header-background': DefaultLightColors.headerBackground,
    'light-mode-footer-background': DefaultLightColors.footerBackground,
    'light-mode-header-buttons-border': DefaultLightColors.headerButtonsBorder,
    'light-mode-all-border-lines': DefaultLightColors.allBorderLines,
    'light-mode-numbered-buttons': DefaultLightColors.numberedButtons,
    'light-mode-widget-background': DefaultLightColors.widgetBackground,
    'light-mode-dropdown-backgrounds': DefaultLightColors.dropdownBackgrounds,
    'light-mode-all-hover-states': DefaultLightColors.allHoverStates,
    'light-mode-selected-language': DefaultLightColors.selectedLanguage,
    'light-mode-progress-bars': DefaultLightColors.progressBars,
    // Dark mode colors
    'dark-mode-all-icons-and-text': DefaultDarkColors.allIconsAndText,
    'dark-mode-toggle-icon-color': DefaultDarkColors.toggleIconColor,
    'dark-mode-toggle-bg-unchecked': DefaultDarkColors.toggleBgUnchecked,
    'dark-mode-toggle-bg-checked': DefaultDarkColors.toggleBgChecked,
    'dark-mode-report-issue-text': DefaultDarkColors.reportIssueText,
    'dark-mode-report-issue-input-text': DefaultDarkColors.reportIssueInputText,
    'dark-mode-report-issue-buttons': DefaultDarkColors.reportIssueButtons,
    'dark-mode-report-issue-button-background':
      DefaultDarkColors.reportIssueButtonBackground,
    'dark-mode-report-issue-textbox-background':
      DefaultDarkColors.reportIssueTextboxBackground,
    'dark-mode-report-issue-card-dropdown-background':
      DefaultDarkColors.reportIssueCardDropdownBackground,
    'dark-mode-selected-items': DefaultDarkColors.selectedItems,
    'dark-mode-header-text': DefaultDarkColors.headerText,
    'dark-mode-card-titles': DefaultDarkColors.cardTitles,
    'dark-mode-header-icons': DefaultDarkColors.headerIcons,
    'dark-mode-header-background': DefaultDarkColors.headerBackground,
    'dark-mode-footer-background': DefaultDarkColors.footerBackground,
    'dark-mode-header-buttons-border': DefaultDarkColors.headerButtonsBorder,
    'dark-mode-all-border-lines': DefaultDarkColors.allBorderLines,
    'dark-mode-numbered-buttons': DefaultDarkColors.numberedButtons,
    'dark-mode-widget-background': DefaultDarkColors.widgetBackground,
    'dark-mode-dropdown-backgrounds': DefaultDarkColors.dropdownBackgrounds,
    'dark-mode-all-hover-states': DefaultDarkColors.allHoverStates,
    'dark-mode-selected-language': DefaultDarkColors.selectedLanguage,
    'dark-mode-progress-bars': DefaultDarkColors.progressBars,
    // Common properties
    'widget-btn-color': DefaultLightColors.widgetBtnColor,
    logoImage: DefaultLightColors.logoImage,
    accessibilityStatementLinkUrl:
      DefaultLightColors.accessibilityStatementLinkUrl,
    logoUrl: DefaultLightColors.logoUrl,
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
      // Light mode colors
      'light-mode-all-icons-and-text': lightModeColors.allIconsAndText,
      'light-mode-toggle-icon-color': lightModeColors.toggleIconColor,
      'light-mode-toggle-bg-unchecked': lightModeColors.toggleBgUnchecked,
      'light-mode-toggle-bg-checked': lightModeColors.toggleBgChecked,
      'light-mode-report-issue-text': lightModeColors.reportIssueText,
      'light-mode-report-issue-input-text':
        lightModeColors.reportIssueInputText,
      'light-mode-report-issue-buttons': lightModeColors.reportIssueButtons,
      'light-mode-report-issue-button-background':
        lightModeColors.reportIssueButtonBackground,
      'light-mode-report-issue-textbox-background':
        lightModeColors.reportIssueTextboxBackground,
      'light-mode-report-issue-card-dropdown-background':
        lightModeColors.reportIssueCardDropdownBackground,
      'light-mode-selected-items': lightModeColors.selectedItems,
      'light-mode-header-text': lightModeColors.headerText,
      'light-mode-card-titles': lightModeColors.cardTitles,
      'light-mode-header-icons': lightModeColors.headerIcons,
      'light-mode-header-background': lightModeColors.headerBackground,
      'light-mode-footer-background': lightModeColors.footerBackground,
      'light-mode-header-buttons-border': lightModeColors.headerButtonsBorder,
      'light-mode-all-border-lines': lightModeColors.allBorderLines,
      'light-mode-numbered-buttons': lightModeColors.numberedButtons,
      'light-mode-widget-background': lightModeColors.widgetBackground,
      'light-mode-dropdown-backgrounds': lightModeColors.dropdownBackgrounds,
      'light-mode-all-hover-states': lightModeColors.allHoverStates,
      'light-mode-selected-language': lightModeColors.selectedLanguage,
      'light-mode-progress-bars': lightModeColors.progressBars,
      // Dark mode colors
      'dark-mode-all-icons-and-text': darkModeColors.allIconsAndText,
      'dark-mode-toggle-icon-color': darkModeColors.toggleIconColor,
      'dark-mode-toggle-bg-unchecked': darkModeColors.toggleBgUnchecked,
      'dark-mode-toggle-bg-checked': darkModeColors.toggleBgChecked,
      'dark-mode-report-issue-text': darkModeColors.reportIssueText,
      'dark-mode-report-issue-input-text': darkModeColors.reportIssueInputText,
      'dark-mode-report-issue-buttons': darkModeColors.reportIssueButtons,
      'dark-mode-report-issue-button-background':
        darkModeColors.reportIssueButtonBackground,
      'dark-mode-report-issue-textbox-background':
        darkModeColors.reportIssueTextboxBackground,
      'dark-mode-report-issue-card-dropdown-background':
        darkModeColors.reportIssueCardDropdownBackground,
      'dark-mode-selected-items': darkModeColors.selectedItems,
      'dark-mode-header-text': darkModeColors.headerText,
      'dark-mode-card-titles': darkModeColors.cardTitles,
      'dark-mode-header-icons': darkModeColors.headerIcons,
      'dark-mode-header-background': darkModeColors.headerBackground,
      'dark-mode-footer-background': darkModeColors.footerBackground,
      'dark-mode-header-buttons-border': darkModeColors.headerButtonsBorder,
      'dark-mode-all-border-lines': darkModeColors.allBorderLines,
      'dark-mode-numbered-buttons': darkModeColors.numberedButtons,
      'dark-mode-widget-background': darkModeColors.widgetBackground,
      'dark-mode-dropdown-backgrounds': darkModeColors.dropdownBackgrounds,
      'dark-mode-all-hover-states': darkModeColors.allHoverStates,
      'dark-mode-selected-language': darkModeColors.selectedLanguage,
      'dark-mode-progress-bars': darkModeColors.progressBars,
      // Common properties
      'widget-btn-color': lightModeColors.widgetBtnColor,
      logoImage: lightModeColors.logoImage,
      accessibilityStatementLinkUrl:
        lightModeColors.accessibilityStatementLinkUrl,
      logoUrl: lightModeColors.logoUrl,
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

  const resetAll = () => {
    if (isMounted.current) {
      setHasUserMadeChanges(false);

      setLightModeColors(DefaultLightColors);
      setDarkModeColors(DefaultDarkColors);
      // Reset all toggles to true (turn everything on)
      const resetToggles = {
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
      setToggles(resetToggles);
      setSelectedFont("'Times New Roman', serif");

      // Re-enable auto-save after a short delay
      setTimeout(() => {
        setHasUserMadeChanges(true);
      }, 100);
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

        // Update colors using the corresponding keys.
        // Load light mode colors
        setLightModeColors({
          allIconsAndText:
            fetchedSettings['light-mode-all-icons-and-text'] ||
            DefaultLightColors.allIconsAndText,
          toggleIconColor:
            fetchedSettings['light-mode-toggle-icon-color'] ||
            DefaultLightColors.toggleIconColor,
          toggleBgUnchecked:
            fetchedSettings['light-mode-toggle-bg-unchecked'] ||
            DefaultLightColors.toggleBgUnchecked,
          toggleBgChecked:
            fetchedSettings['light-mode-toggle-bg-checked'] ||
            DefaultLightColors.toggleBgChecked,
          reportIssueText:
            fetchedSettings['light-mode-report-issue-text'] ||
            DefaultLightColors.reportIssueText,
          reportIssueInputText:
            fetchedSettings['light-mode-report-issue-input-text'] ||
            DefaultLightColors.reportIssueInputText,
          reportIssueButtons:
            fetchedSettings['light-mode-report-issue-buttons'] ||
            DefaultLightColors.reportIssueButtons,
          reportIssueButtonBackground:
            fetchedSettings['light-mode-report-issue-button-background'] ||
            DefaultLightColors.reportIssueButtonBackground,
          reportIssueTextboxBackground:
            fetchedSettings['light-mode-report-issue-textbox-background'] ||
            DefaultLightColors.reportIssueTextboxBackground,
          reportIssueCardDropdownBackground:
            fetchedSettings[
              'light-mode-report-issue-card-dropdown-background'
            ] || DefaultLightColors.reportIssueCardDropdownBackground,
          selectedItems:
            fetchedSettings['light-mode-selected-items'] ||
            DefaultLightColors.selectedItems,
          headerText:
            fetchedSettings['light-mode-header-text'] ||
            DefaultLightColors.headerText,
          cardTitles:
            fetchedSettings['light-mode-card-titles'] ||
            DefaultLightColors.cardTitles,
          headerIcons:
            fetchedSettings['light-mode-header-icons'] ||
            DefaultLightColors.headerIcons,
          headerBackground:
            fetchedSettings['light-mode-header-background'] ||
            DefaultLightColors.headerBackground,
          footerBackground:
            fetchedSettings['light-mode-footer-background'] ||
            DefaultLightColors.footerBackground,
          headerButtonsBorder:
            fetchedSettings['light-mode-header-buttons-border'] ||
            DefaultLightColors.headerButtonsBorder,
          allBorderLines:
            fetchedSettings['light-mode-all-border-lines'] ||
            DefaultLightColors.allBorderLines,
          numberedButtons:
            fetchedSettings['light-mode-numbered-buttons'] ||
            DefaultLightColors.numberedButtons,
          widgetBackground:
            fetchedSettings['light-mode-widget-background'] ||
            DefaultLightColors.widgetBackground,
          dropdownBackgrounds:
            fetchedSettings['light-mode-dropdown-backgrounds'] ||
            DefaultLightColors.dropdownBackgrounds,
          allHoverStates:
            fetchedSettings['light-mode-all-hover-states'] ||
            DefaultLightColors.allHoverStates,
          selectedLanguage:
            fetchedSettings['light-mode-selected-language'] ||
            DefaultLightColors.selectedLanguage,
          progressBars:
            fetchedSettings['light-mode-progress-bars'] ||
            DefaultLightColors.progressBars,
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
        });

        // Load dark mode colors
        setDarkModeColors({
          allIconsAndText:
            fetchedSettings['dark-mode-all-icons-and-text'] ||
            DefaultDarkColors.allIconsAndText,
          toggleIconColor:
            fetchedSettings['dark-mode-toggle-icon-color'] ||
            DefaultDarkColors.toggleIconColor,
          toggleBgUnchecked:
            fetchedSettings['dark-mode-toggle-bg-unchecked'] ||
            DefaultDarkColors.toggleBgUnchecked,
          toggleBgChecked:
            fetchedSettings['dark-mode-toggle-bg-checked'] ||
            DefaultDarkColors.toggleBgChecked,
          reportIssueText:
            fetchedSettings['dark-mode-report-issue-text'] ||
            DefaultDarkColors.reportIssueText,
          reportIssueInputText:
            fetchedSettings['dark-mode-report-issue-input-text'] ||
            DefaultDarkColors.reportIssueInputText,
          reportIssueButtons:
            fetchedSettings['dark-mode-report-issue-buttons'] ||
            DefaultDarkColors.reportIssueButtons,
          reportIssueButtonBackground:
            fetchedSettings['dark-mode-report-issue-button-background'] ||
            DefaultDarkColors.reportIssueButtonBackground,
          reportIssueTextboxBackground:
            fetchedSettings['dark-mode-report-issue-textbox-background'] ||
            DefaultDarkColors.reportIssueTextboxBackground,
          reportIssueCardDropdownBackground:
            fetchedSettings[
              'dark-mode-report-issue-card-dropdown-background'
            ] || DefaultDarkColors.reportIssueCardDropdownBackground,
          selectedItems:
            fetchedSettings['dark-mode-selected-items'] ||
            DefaultDarkColors.selectedItems,
          headerText:
            fetchedSettings['dark-mode-header-text'] ||
            DefaultDarkColors.headerText,
          cardTitles:
            fetchedSettings['dark-mode-card-titles'] ||
            DefaultDarkColors.cardTitles,
          headerIcons:
            fetchedSettings['dark-mode-header-icons'] ||
            DefaultDarkColors.headerIcons,
          headerBackground:
            fetchedSettings['dark-mode-header-background'] ||
            DefaultDarkColors.headerBackground,
          footerBackground:
            fetchedSettings['dark-mode-footer-background'] ||
            DefaultDarkColors.footerBackground,
          headerButtonsBorder:
            fetchedSettings['dark-mode-header-buttons-border'] ||
            DefaultDarkColors.headerButtonsBorder,
          allBorderLines:
            fetchedSettings['dark-mode-all-border-lines'] ||
            DefaultDarkColors.allBorderLines,
          numberedButtons:
            fetchedSettings['dark-mode-numbered-buttons'] ||
            DefaultDarkColors.numberedButtons,
          widgetBackground:
            fetchedSettings['dark-mode-widget-background'] ||
            DefaultDarkColors.widgetBackground,
          dropdownBackgrounds:
            fetchedSettings['dark-mode-dropdown-backgrounds'] ||
            DefaultDarkColors.dropdownBackgrounds,
          allHoverStates:
            fetchedSettings['dark-mode-all-hover-states'] ||
            DefaultDarkColors.allHoverStates,
          selectedLanguage:
            fetchedSettings['dark-mode-selected-language'] ||
            DefaultDarkColors.selectedLanguage,
          progressBars:
            fetchedSettings['dark-mode-progress-bars'] ||
            DefaultDarkColors.progressBars,
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

        // Update colors using the corresponding keys.
        // Load light mode colors
        setLightModeColors({
          allIconsAndText:
            fetchedSettings['light-mode-all-icons-and-text'] ||
            DefaultLightColors.allIconsAndText,
          toggleIconColor:
            fetchedSettings['light-mode-toggle-icon-color'] ||
            DefaultLightColors.toggleIconColor,
          toggleBgUnchecked:
            fetchedSettings['light-mode-toggle-bg-unchecked'] ||
            DefaultLightColors.toggleBgUnchecked,
          toggleBgChecked:
            fetchedSettings['light-mode-toggle-bg-checked'] ||
            DefaultLightColors.toggleBgChecked,
          reportIssueText:
            fetchedSettings['light-mode-report-issue-text'] ||
            DefaultLightColors.reportIssueText,
          reportIssueInputText:
            fetchedSettings['light-mode-report-issue-input-text'] ||
            DefaultLightColors.reportIssueInputText,
          reportIssueButtons:
            fetchedSettings['light-mode-report-issue-buttons'] ||
            DefaultLightColors.reportIssueButtons,
          reportIssueButtonBackground:
            fetchedSettings['light-mode-report-issue-button-background'] ||
            DefaultLightColors.reportIssueButtonBackground,
          reportIssueTextboxBackground:
            fetchedSettings['light-mode-report-issue-textbox-background'] ||
            DefaultLightColors.reportIssueTextboxBackground,
          reportIssueCardDropdownBackground:
            fetchedSettings[
              'light-mode-report-issue-card-dropdown-background'
            ] || DefaultLightColors.reportIssueCardDropdownBackground,
          selectedItems:
            fetchedSettings['light-mode-selected-items'] ||
            DefaultLightColors.selectedItems,
          headerText:
            fetchedSettings['light-mode-header-text'] ||
            DefaultLightColors.headerText,
          cardTitles:
            fetchedSettings['light-mode-card-titles'] ||
            DefaultLightColors.cardTitles,
          headerIcons:
            fetchedSettings['light-mode-header-icons'] ||
            DefaultLightColors.headerIcons,
          headerBackground:
            fetchedSettings['light-mode-header-background'] ||
            DefaultLightColors.headerBackground,
          footerBackground:
            fetchedSettings['light-mode-footer-background'] ||
            DefaultLightColors.footerBackground,
          headerButtonsBorder:
            fetchedSettings['light-mode-header-buttons-border'] ||
            DefaultLightColors.headerButtonsBorder,
          allBorderLines:
            fetchedSettings['light-mode-all-border-lines'] ||
            DefaultLightColors.allBorderLines,
          numberedButtons:
            fetchedSettings['light-mode-numbered-buttons'] ||
            DefaultLightColors.numberedButtons,
          widgetBackground:
            fetchedSettings['light-mode-widget-background'] ||
            DefaultLightColors.widgetBackground,
          dropdownBackgrounds:
            fetchedSettings['light-mode-dropdown-backgrounds'] ||
            DefaultLightColors.dropdownBackgrounds,
          allHoverStates:
            fetchedSettings['light-mode-all-hover-states'] ||
            DefaultLightColors.allHoverStates,
          selectedLanguage:
            fetchedSettings['light-mode-selected-language'] ||
            DefaultLightColors.selectedLanguage,
          progressBars:
            fetchedSettings['light-mode-progress-bars'] ||
            DefaultLightColors.progressBars,
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
        });

        // Load dark mode colors
        setDarkModeColors({
          allIconsAndText:
            fetchedSettings['dark-mode-all-icons-and-text'] ||
            DefaultDarkColors.allIconsAndText,
          toggleIconColor:
            fetchedSettings['dark-mode-toggle-icon-color'] ||
            DefaultDarkColors.toggleIconColor,
          toggleBgUnchecked:
            fetchedSettings['dark-mode-toggle-bg-unchecked'] ||
            DefaultDarkColors.toggleBgUnchecked,
          toggleBgChecked:
            fetchedSettings['dark-mode-toggle-bg-checked'] ||
            DefaultDarkColors.toggleBgChecked,
          reportIssueText:
            fetchedSettings['dark-mode-report-issue-text'] ||
            DefaultDarkColors.reportIssueText,
          reportIssueInputText:
            fetchedSettings['dark-mode-report-issue-input-text'] ||
            DefaultDarkColors.reportIssueInputText,
          reportIssueButtons:
            fetchedSettings['dark-mode-report-issue-buttons'] ||
            DefaultDarkColors.reportIssueButtons,
          reportIssueButtonBackground:
            fetchedSettings['dark-mode-report-issue-button-background'] ||
            DefaultDarkColors.reportIssueButtonBackground,
          reportIssueTextboxBackground:
            fetchedSettings['dark-mode-report-issue-textbox-background'] ||
            DefaultDarkColors.reportIssueTextboxBackground,
          reportIssueCardDropdownBackground:
            fetchedSettings[
              'dark-mode-report-issue-card-dropdown-background'
            ] || DefaultDarkColors.reportIssueCardDropdownBackground,
          selectedItems:
            fetchedSettings['dark-mode-selected-items'] ||
            DefaultDarkColors.selectedItems,
          headerText:
            fetchedSettings['dark-mode-header-text'] ||
            DefaultDarkColors.headerText,
          cardTitles:
            fetchedSettings['dark-mode-card-titles'] ||
            DefaultDarkColors.cardTitles,
          headerIcons:
            fetchedSettings['dark-mode-header-icons'] ||
            DefaultDarkColors.headerIcons,
          headerBackground:
            fetchedSettings['dark-mode-header-background'] ||
            DefaultDarkColors.headerBackground,
          footerBackground:
            fetchedSettings['dark-mode-footer-background'] ||
            DefaultDarkColors.footerBackground,
          headerButtonsBorder:
            fetchedSettings['dark-mode-header-buttons-border'] ||
            DefaultDarkColors.headerButtonsBorder,
          allBorderLines:
            fetchedSettings['dark-mode-all-border-lines'] ||
            DefaultDarkColors.allBorderLines,
          numberedButtons:
            fetchedSettings['dark-mode-numbered-buttons'] ||
            DefaultDarkColors.numberedButtons,
          widgetBackground:
            fetchedSettings['dark-mode-widget-background'] ||
            DefaultDarkColors.widgetBackground,
          dropdownBackgrounds:
            fetchedSettings['dark-mode-dropdown-backgrounds'] ||
            DefaultDarkColors.dropdownBackgrounds,
          allHoverStates:
            fetchedSettings['dark-mode-all-hover-states'] ||
            DefaultDarkColors.allHoverStates,
          selectedLanguage:
            fetchedSettings['dark-mode-selected-language'] ||
            DefaultDarkColors.selectedLanguage,
          progressBars:
            fetchedSettings['dark-mode-progress-bars'] ||
            DefaultDarkColors.progressBars,
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

      <div className="min-h-screen bg-gray-100">
        {/* Site Selector Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedSite != SITE_SELECTOR_TEXT
                ? selectedSite + "'s Widget Customization"
                : 'Select a Domain to Customize from the Side Bar'}
            </h1>
            {selectedSite != '' && selectedSite != SITE_SELECTOR_TEXT && (
              <button
                onClick={() => setIsCopyModalOpen(true)}
                disabled={buttonDisable}
                className="px-4 py-2 border border-transparent rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
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
        />

        {/* Loading indicator or Save/Reset Buttons */}
        {isLoadingSettings ? (
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex justify-center items-center gap-2">
              <CircularProgress size={20} />
              <span className="text-gray-600">Loading settings...</span>
            </div>
          </div>
        ) : (
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex gap-4 max-w-4xl mx-auto">
              <button
                onClick={handleSave}
                disabled={buttonDisable}
                className="flex-1 px-4 py-2 border border-transparent rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save
              </button>
              <button
                disabled={buttonDisable}
                onClick={resetAll}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Reset
              </button>
            </div>
          </div>
        )}
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
