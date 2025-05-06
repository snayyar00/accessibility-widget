import type React from 'react';
import AccessibilityMenu from './MenuPreview';
import CustomizeWidget from './CustomizeWidget';
import { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { toast } from 'react-toastify';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';

export interface Colors {
  headerText: string;
  headerBg: string;
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
  widgetBtnColor:string;
  logoImage: string;
  accessibilityStatementLinkUrl: string;
}

export interface Toggles {
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

const AccessibilityWidgetPage: React.FC<any> = ({ allDomains }: any) => {
   const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.customize_widget') });
  const [toggles, setToggles] = useState({
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


  const DefaultColors: Colors = {
    headerText: '#FFFFFF',
    headerBg: '#0848ca',
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
    widgetBtnColor:'#195AFF',
    logoImage: "",
    accessibilityStatementLinkUrl:"https://www.webability.io/statement",
  };
  const DefaultToggles = {
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
    widgetBtnColor:DefaultColors.widgetBtnColor,
    logoImage: DefaultColors.logoImage,
    accessibilityStatementLinkUrl: DefaultColors.accessibilityStatementLinkUrl,
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

  const [selectedFont, setSelectedFont] = useState("'Times New Roman', serif");

  const [settings, setSettings] = useState({
    'widgetFont': selectedFont,
    'footer-bg': DefaultColors.footerBg,
    'footer-text': DefaultColors.footerText,
    'header-text': DefaultColors.headerText,
    'header-bg': DefaultColors.headerBg,
    'button-text': DefaultColors.buttonText,
    'bg-button': DefaultColors.buttonBg,
    'widget-background': DefaultColors.menuBg,
    'dropdown-text': DefaultColors.dropdownText,
    'bg-dropdown': DefaultColors.dropdownBg,
    'widget-text': DefaultColors.widgetInnerText,
    'font-size-bg': DefaultColors.fontSizeMenuBg,
    'font-size-buttons': DefaultColors.fontSizeMenuButton,
    'font-size-text': DefaultColors.fontSizeMenuText,
    'widget-btn-color':DefaultColors.widgetBtnColor,
    'logoImage': DefaultColors.logoImage,
    'accessibilityStatementLinkUrl': DefaultColors.accessibilityStatementLinkUrl,
    'toggledarkMode': DefaultToggles.darkMode ? 1 : 0,
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
    'togglemonochrome': DefaultToggles.monochrome ? 1 : 0,
    'togglehighlight-links': DefaultToggles.highlightLinks ? 1 : 0,
    'togglehighlight-title': DefaultToggles.highlightTitle ? 1 : 0,
    'togglereadable-font': DefaultToggles.dyslexiaFont ? 1 : 0,
    'toggleletter-spacing': DefaultToggles.letterSpacing ? 1 : 0,
    'toggleline-height': DefaultToggles.lineHeight ? 1 : 0,
    'togglefont-weight': DefaultToggles.fontWeight ? 1 : 0,
    'togglemotor-impaired': DefaultToggles.motorImpaired ? 1 : 0,
    'toggleblind': DefaultToggles.blind ? 1 : 0,
    'toggledyslexia-font': DefaultToggles.dyslexia ? 1 : 0,
    'togglevisually-impaired': DefaultToggles.visuallyImpaired ? 1 : 0,
    'togglecognitive-learning': DefaultToggles.cognitiveAndLearning ? 1 : 0,
    'toggleseizure-epileptic': DefaultToggles.seizureAndEpileptic ? 1 : 0,
    'togglecolor-blind': DefaultToggles.colorBlind ? 1 : 0,
    'toggleadhd': DefaultToggles.adhd ? 1 : 0,
  });

  const [selectedSite, setSelectedSite] = useState('');

  useEffect(() => {
    setSettings({
      'widgetFont': selectedFont,
      'footer-bg': colors.footerBg,
      'footer-text': colors.footerText,
      'header-text': colors.headerText,
      'header-bg': colors.headerBg,
      'button-text': colors.buttonText,
      'bg-button': colors.buttonBg,
      'widget-background': colors.menuBg,
      'dropdown-text': colors.dropdownText,
      'bg-dropdown': colors.dropdownBg,
      'widget-text': colors.widgetInnerText,
      'font-size-bg': colors.fontSizeMenuBg,
      'font-size-buttons': colors.fontSizeMenuButton,
      'font-size-text': colors.fontSizeMenuText,
      'widget-btn-color':colors.widgetBtnColor,
      'logoImage': colors.logoImage,
      'accessibilityStatementLinkUrl': colors.accessibilityStatementLinkUrl,
      'toggledarkMode': toggles.darkMode ? 1 : 0,
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
      'togglemonochrome': toggles.monochrome ? 1 : 0,
      'togglehighlight-links': toggles.highlightLinks ? 1 : 0,
      'togglehighlight-title': toggles.highlightTitle ? 1 : 0,
      'togglereadable-font': toggles.dyslexiaFont ? 1 : 0,
      'toggleletter-spacing': toggles.letterSpacing ? 1 : 0,
      'toggleline-height': toggles.lineHeight ? 1 : 0,
      'togglefont-weight': toggles.fontWeight ? 1 : 0,
      'togglemotor-impaired': toggles.motorImpaired ? 1 : 0,
      'toggleblind': toggles.blind ? 1 : 0,
      'toggledyslexia-font': toggles.dyslexia ? 1 : 0,
      'togglevisually-impaired': toggles.visuallyImpaired ? 1 : 0,
      'togglecognitive-learning': toggles.cognitiveAndLearning ? 1 : 0,
      'toggleseizure-epileptic': toggles.seizureAndEpileptic ? 1 : 0,
      'togglecolor-blind': toggles.colorBlind ? 1 : 0,
      'toggleadhd': toggles.adhd ? 1 : 0,
    });
  }, [toggles, colors, selectedFont]);

  const resetAll = () => {
    setColors(DefaultColors);
    setToggles(DefaultToggles);
    setSelectedFont("'Times New Roman', serif");
  };

  const handleSave = async () => {
    if(selectedSite == '' || selectedSite == 'Choose your Domain')
    {
      toast.error("Please Select a Site from the Dropdown");
      return;
    }
    setButtonDisable(true);
    const url = `${process.env.REACT_APP_BACKEND_URL}/update-site-widget-settings`;
    const bodyData = {
      site_url: selectedSite,
      settings: JSON.stringify(settings),
      user_id: userData?.id,
    };
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        });
      })
      .catch((error) => {
        setButtonDisable(false);
        toast.error(`Error While Saving Settings. Try Again Later !!`);
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  const getSettings = async () => {
    setButtonDisable(true);
    const url = `${process.env.REACT_APP_BACKEND_URL}/get-site-widget-settings`;
    const bodyData = { site_url: selectedSite };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        setButtonDisable(false);
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

        if(Object.keys(fetchedSettings).length == 0){
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
          footerText:
            fetchedSettings['footer-text'] || DefaultColors.footerText,
          footerBg: fetchedSettings['footer-bg'] || DefaultColors.footerBg,
          buttonText:
            fetchedSettings['button-text'] || DefaultColors.buttonText,
          buttonBg: fetchedSettings['bg-button'] || DefaultColors.buttonBg,
          menuBg: fetchedSettings['widget-background'] || DefaultColors.menuBg,
          widgetBtnColor:fetchedSettings['widget-btn-color'] || DefaultColors.widgetBtnColor,
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
            fetchedSettings['logoImage'].length ? fetchedSettings['logoImage'] : DefaultColors.logoImage,
          accessibilityStatementLinkUrl:
            fetchedSettings['accessibilityStatementLinkUrl'] || DefaultColors.accessibilityStatementLinkUrl,
        });

        // Update toggles.
        // Note: The toggle values are stored as numbers (0 or 1); we convert them to booleans.
        setToggles({
          darkMode: fetchedSettings.toggledarkMode === 1,
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
          monochrome: fetchedSettings.togglemonochrome === 1,
          highlightLinks: fetchedSettings['togglehighlight-links'] === 1,
          highlightTitle: fetchedSettings['togglehighlight-title'] === 1,
          dyslexiaFont: fetchedSettings['togglereadable-font'] === 1,
          letterSpacing: fetchedSettings['toggleletter-spacing'] === 1,
          lineHeight: fetchedSettings['toggleline-height'] === 1,
          fontWeight: fetchedSettings['togglefont-weight'] === 1,
          motorImpaired: fetchedSettings['togglemotor-impaired'] === 1,
          blind: fetchedSettings.toggleblind === 1,
          dyslexia: fetchedSettings['toggledyslexia-font'] === 1,
          visuallyImpaired: fetchedSettings['togglevisually-impaired'] === 1,
          cognitiveAndLearning:
            fetchedSettings['togglecognitive-learning'] === 1,
          seizureAndEpileptic: fetchedSettings['toggleseizure-epileptic'] === 1,
          colorBlind: fetchedSettings['togglecolor-blind'] === 1,
          adhd: fetchedSettings.toggleadhd === 1,
        });
      })
      .catch((error) => {
        setButtonDisable(false);
        toast.error(`Error While Fetching Settings. Try Again Later !!`);
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  useEffect(() => {
    if (selectedSite != '') {
      getSettings();
    }
  }, [selectedSite]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900 sm:text-4xl">
          Accessibility Widget Customization
        </h1>
        {allDomains?.getUserSites ? (
          <div className="bg-white my-6 p-3 sm:p-4 rounded-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Select Domain
            </h2>
            <select
              className="w-full p-2 border rounded mb-3 sm:mb-4 text-sm sm:text-base"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value={''}>Choose your domain</option>
              {allDomains?.getUserSites.map((domain: any) => (
                <option key={domain.id} value={domain.url}>
                  {domain.url}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex justify-center mb-8">
            <CircularProgress
              size={44}
              sx={{ color: 'primary' }}
              className="ml-2 my-auto"
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
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
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              Choose your settings
            </h2>
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
        <div className="mt-8 flex flex-col justify-center w-full space-y-4">
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
  );
};

export default AccessibilityWidgetPage;
