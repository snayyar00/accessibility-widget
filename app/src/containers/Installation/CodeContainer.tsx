import React, { useState, useRef, useEffect } from 'react';
import {
  FaChevronDown,
  FaSearch,
  FaCheck,
  FaMagic,
  FaExpand,
  FaCompress,
  FaEnvelope,
  FaTimes,
  FaSpinner,
  FaArrowsAlt,
} from 'react-icons/fa';
import { FaRegCopy } from 'react-icons/fa6';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import InstallationEmailModal from '@/components/Common/InstallationEmailModal';

interface CodeProps {
  codeString: string;
  shouldOpenCustomization?: boolean;
  onCustomizationOpened?: () => void;
}

const SEND_WIDGET_INSTALLATION = gql`
  mutation SendWidgetInstallationInstructions(
    $email: String!
    $code: String!
    $position: String!
    $language: String!
    $languageName: String!
  ) {
    sendWidgetInstallationInstructions(
      email: $email
      code: $code
      position: $position
      language: $language
      languageName: $languageName
    ) {
      success
      message
    }
  }
`;

const positions = [
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'center-left', label: 'Center Left' },
  { value: 'center-right', label: 'Center Right' },
];

const languages = [
  { code: 'auto', name: 'Auto', englishName: 'Auto (Browser Language)' },
  { code: 'en', name: 'English', englishName: 'English' },
  { code: 'ar', name: 'العربية', englishName: 'Arabic' },
  { code: 'bg', name: 'Български', englishName: 'Bulgarian' },
  { code: 'bn', name: 'বাংলা', englishName: 'Bengali' },
  { code: 'cs', name: 'Čeština', englishName: 'Czech' },
  { code: 'de', name: 'Deutsch', englishName: 'German' },
  { code: 'el', name: 'Ελληνικά', englishName: 'Greek' },
  { code: 'es', name: 'Español', englishName: 'Spanish' },
  { code: 'fi', name: 'Suomi', englishName: 'Finnish' },
  { code: 'fr', name: 'Français', englishName: 'French' },
  { code: 'he', name: 'עברית', englishName: 'Hebrew' },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi' },
  { code: 'hr', name: 'Hrvatski', englishName: 'Croatian' },
  { code: 'hu', name: 'Magyar', englishName: 'Hungarian' },
  { code: 'id', name: 'Bahasa Indonesia', englishName: 'Indonesian' },
  { code: 'it', name: 'Italiano', englishName: 'Italian' },
  { code: 'ja', name: '日本語', englishName: 'Japanese' },
  { code: 'ko', name: '한국어', englishName: 'Korean' },
  { code: 'lt', name: 'Lietuvių', englishName: 'Lithuanian' },
  { code: 'lv', name: 'Latviešu', englishName: 'Latvian' },
  { code: 'ms', name: 'Bahasa Melayu', englishName: 'Malay' },
  { code: 'nl', name: 'Nederlands', englishName: 'Dutch' },
  { code: 'no', name: 'Norsk', englishName: 'Norwegian' },
  { code: 'pl', name: 'Polski', englishName: 'Polish' },
  { code: 'pt', name: 'Português', englishName: 'Portuguese' },
  {
    code: 'pt-br',
    name: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
  },
  { code: 'ro', name: 'Română', englishName: 'Romanian' },
  { code: 'ru', name: 'Русский', englishName: 'Russian' },
  { code: 'sk', name: 'Slovenčina', englishName: 'Slovak' },
  { code: 'sl', name: 'Slovenščina', englishName: 'Slovenian' },
  { code: 'sr', name: 'Српски', englishName: 'Serbian' },
  { code: 'sv', name: 'Svenska', englishName: 'Swedish' },
  { code: 'th', name: 'ไทย', englishName: 'Thai' },
  { code: 'tr', name: 'Türkçe', englishName: 'Turkish' },
  { code: 'uk', name: 'Українська', englishName: 'Ukrainian' },
  { code: 'ur', name: 'اردو', englishName: 'Urdu' },
  { code: 'vi', name: 'Tiếng Việt', englishName: 'Vietnamese' },
  { code: 'zh', name: '中文 (简体)', englishName: 'Chinese (Simplified)' },
  { code: 'zh-tw', name: '中文 (繁體)', englishName: 'Chinese (Traditional)' },
  { code: 'da', name: 'Dansk', englishName: 'Danish' },
  { code: 'et', name: 'Eesti', englishName: 'Estonian' },
  { code: 'ca', name: 'Català', englishName: 'Catalan' },
];

const iconTypes = [
  {
    value: 'full',
    label: 'Full Widget',
    preview: () => (
      <div className="w-8 h-8 flex items-center justify-center">
        <img
          src="/images/svg/full_widget_icon.svg"
          alt="Full Widget Icon"
          width={32}
          height={32}
          className="object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
      </div>
    ),
  },
  {
    value: 'compact',
    label: 'Compact Widget',
    preview: () => (
      <div className="w-20 h-5 flex items-center justify-center">
        <div
          className="w-20 h-5 flex items-center justify-center"
          style={{ backgroundColor: '#195AFF' }}
        >
          <span className="text-white text-[8px] font whitespace-nowrap">
            Site Accessibility
          </span>
        </div>
      </div>
    ),
  },
  {
    value: 'hidden',
    label: 'Button Trigger',
    preview: () => (
      <div
        className="w-16 h-6 border-2 border-dashed rounded flex items-center justify-center"
        style={{ backgroundColor: '#195AFF', borderColor: '#195AFF' }}
      >
        <span className="text-white text-[8px] font-medium">Button</span>
      </div>
    ),
  },
];

const widgetSizes = [
  { value: 's', label: 'Small' },
  { value: 'm', label: 'Medium' },
  { value: 'l', label: 'Large' },
];

export default function CodeContainer({
  codeString,
  shouldOpenCustomization,
  onCustomizationOpened,
}: CodeProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [copySuccessNew, setCopySuccessNew] = useState(false);
  const [copySuccessGtm, setCopySuccessGtm] = useState(false);
  const [selectedScript, setSelectedScript] = useState<'old' | 'new' | 'gtm'>('new');
  const [position, setPosition] = useState('bottom-left');
  const [language, setLanguage] = useState('auto');
  const [iconType, setIconType] = useState<'full' | 'compact' | 'hidden'>(
    'full',
  );
  const [widgetSize, setWidgetSize] = useState<'s' | 'm' | 'l'>('m');
  const [offsetX, setOffsetX] = useState(20);
  const [offsetY, setOffsetY] = useState(20);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [languageSearchTerm, setLanguageSearchTerm] = useState('');
  const [isIconTypeDropdownOpen, setIsIconTypeDropdownOpen] = useState(false);
  const [isWidgetSizeDropdownOpen, setIsWidgetSizeDropdownOpen] =
    useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const iconTypeDropdownRef = useRef<HTMLDivElement>(null);
  const widgetSizeDropdownRef = useRef<HTMLDivElement>(null);

  const [sendWidgetInstallation, { loading: isSending }] = useMutation(
    SEND_WIDGET_INSTALLATION,
  );

  const selectedLanguage =
    languages.find((lang) => lang.code === language) || languages[0];

  const selectedIconType =
    iconTypes.find((type) => type.value === iconType) || iconTypes[0];
  const selectedWidgetSize =
    widgetSizes.find((size) => size.value === widgetSize) || widgetSizes[1];

  const filteredLanguages = languages.filter(
    (lang) =>
      lang.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
      lang.englishName
        .toLowerCase()
        .includes(languageSearchTerm.toLowerCase()) ||
      lang.code.toLowerCase().includes(languageSearchTerm.toLowerCase()),
  );

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formattedCodeString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.log('Failed to copy text: ', err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = formattedCodeString;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      } catch (fallbackErr) {
        console.log('Fallback copy failed: ', fallbackErr);
        alert('Failed to copy to clipboard. Please copy manually.');
      }
    }
  };

  const copyToClipboardNew = async () => {
    try {
      await navigator.clipboard.writeText(newFormattedCodeString);
      setCopySuccessNew(true);
      setTimeout(() => setCopySuccessNew(false), 3000);
    } catch (err) {
      console.log('Failed to copy text: ', err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = newFormattedCodeString;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        setCopySuccessNew(true);
        setTimeout(() => setCopySuccessNew(false), 3000);
      } catch (fallbackErr) {
        console.log('Fallback copy failed: ', fallbackErr);
        alert('Failed to copy to clipboard. Please copy manually.');
      }
    }
  };

  const copyToClipboardGtm = async () => {
    try {
      await navigator.clipboard.writeText(gtmFormattedCodeString);
      setCopySuccessGtm(true);
      setTimeout(() => setCopySuccessGtm(false), 3000);
    } catch (err) {
      console.log('Failed to copy text: ', err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = gtmFormattedCodeString;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        setCopySuccessGtm(true);
        setTimeout(() => setCopySuccessGtm(false), 3000);
      } catch (fallbackErr) {
        console.log('Fallback copy failed: ', fallbackErr);
        alert('Failed to copy to clipboard. Please copy manually.');
      }
    }
  };

  const handleLanguageSelect = (lang: typeof languages[0]) => {
    setLanguage(lang.code);
    setIsLanguageDropdownOpen(false);
    setLanguageSearchTerm('');
  };

  const handleIconTypeSelect = (type: typeof iconTypes[0]) => {
    setIconType(type.value as 'full' | 'compact' | 'hidden');
    setIsIconTypeDropdownOpen(false);
  };

  const handleWidgetSizeSelect = (size: typeof widgetSizes[0]) => {
    setWidgetSize(size.value as 's' | 'm' | 'l');
    setIsWidgetSizeDropdownOpen(false);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formattedCodeString =
    iconType === 'hidden'
      ? `<script src="https://widget.webability.io/widget.min.js" data-asw-position="${position}" data-asw-lang="${language}" data-asw-icon-type="hidden" defer></script>`
      : `<script src="https://widget.webability.io/widget.min.js" data-asw-position="${position}-x-${offsetX}-y-${offsetY}" data-asw-lang="${language}" data-asw-icon-type="${widgetSize}-${iconType}" defer></script>`;

  const newFormattedCodeString =
    iconType === 'hidden'
      ? `<script src="https://widget-v2.webability.io/widget.min.js" data-asw-position="${position}" data-asw-lang="${language}" data-asw-icon-type="hidden" defer></script>`
      : `<script src="https://widget-v2.webability.io/widget.min.js" data-asw-position="${position}-x-${offsetX}-y-${offsetY}" data-asw-lang="${language}" data-asw-icon-type="${widgetSize}-${iconType}" defer></script>`;

  const gtmFormattedCodeString =
    iconType === 'hidden'
      ? `<script>
  var s = document.createElement("script");
  s.src = "https://widget-v2.webability.io/widget.min.js";
  s.setAttribute("data-asw-position", "${position}");
  s.setAttribute("data-asw-lang", "${language}");
  s.setAttribute("data-asw-icon-type", "hidden");
  document.head.appendChild(s);
</script>`
      : `<script>
  var s = document.createElement("script");
  s.src = "https://widget-v2.webability.io/widget.min.js";
  s.setAttribute("data-asw-position", "${position}-x-${offsetX}-y-${offsetY}");
  s.setAttribute("data-asw-lang", "${language}");
  s.setAttribute("data-asw-icon-type", "${widgetSize}-${iconType}");
  document.head.appendChild(s);
</script>`;

  const handleSendInstructions = async (emailAddress: string) => {
    try {
      // Use the correct script based on user selection
      const codeToSend =
        selectedScript === 'new'
          ? newFormattedCodeString
          : selectedScript === 'gtm'
          ? gtmFormattedCodeString
          : formattedCodeString;

      const result = await sendWidgetInstallation({
        variables: {
          email: emailAddress,
          code: codeToSend,
          position,
          language,
          languageName: selectedLanguage.englishName,
        },
      });

      if (result.data?.sendWidgetInstallationInstructions?.success) {
        // Success is handled by the modal component
        // Close modal after a delay to show success state
        setTimeout(() => {
          setShowEmailModal(false);
        }, 2000);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending widget installation instructions:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleModalClose = () => {
    if (!isSending) {
      setShowEmailModal(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
        setLanguageSearchTerm('');
      }
      if (
        iconTypeDropdownRef.current &&
        !iconTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsIconTypeDropdownOpen(false);
      }
      if (
        widgetSizeDropdownRef.current &&
        !widgetSizeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWidgetSizeDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSending]);

  const [showCustomization, setShowCustomization] = useState(false);

  // Handle opening customization menu for tour
  useEffect(() => {
    if (shouldOpenCustomization && !showCustomization) {
      setShowCustomization(true);
      onCustomizationOpened?.();
    }
  }, [shouldOpenCustomization, showCustomization, onCustomizationOpened]);

  return (
    <div
      className="w-full bg-white rounded-2xl overflow-hidden border shadow-sm"
      style={{ borderColor: '#A2ADF3' }}
    >
      {/* Customization Section - Hidden by default, matches Figma */}
      {showCustomization && (
        <div className="p-4 border-b border-gray-100 bg-gray-50 widget-customization-options">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h- rounded-lg flex items-center justify-center">
              <FaMagic className="w-4 h-4" style={{ color: '#205A76' }} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Customize Your Widget
              </h3>
              <p className="text-sm text-gray-600">
                Choose position and language
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Position Selector - Matches Figma Design */}
            <div
              className="bg-gray-50 rounded-lg border border-gray-200 p-4"
              style={{ borderColor: '#A2ADF3' }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1">
                    Position
                  </h4>
                  <p className="text-xs text-gray-600">
                    Change the position of your widget
                  </p>
                </div>
                <div className="relative">
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full md:w-auto px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 font-medium appearance-none min-w-[120px]"
                    style={{ borderColor: '#A2ADF3' }}
                  >
                    {positions.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <FaChevronDown
                      className="w-3 h-3"
                      style={{ color: '#A2ADF3' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Language Selector - Matches Figma Design */}
            <div
              className="bg-gray-50 rounded-lg border border-gray-200 p-4 relative"
              style={{ borderColor: '#A2ADF3' }}
              ref={dropdownRef}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1">
                    Language
                  </h4>
                  <p className="text-xs text-gray-600">
                    Choose your preferred language
                  </p>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                    }
                    className="w-full md:w-auto px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white flex items-center justify-between hover:border-gray-300 transition-colors min-w-[180px]"
                    style={{ borderColor: '#A2ADF3' }}
                  >
                    <span className="text-gray-900 font-medium">
                      {selectedLanguage.name}
                    </span>
                    <FaChevronDown
                      className={`w-3 h-3 transition-transform ${
                        isLanguageDropdownOpen ? 'rotate-180' : ''
                      }`}
                      style={{ color: '#A2ADF3' }}
                    />
                  </button>

                  {isLanguageDropdownOpen && (
                    <div
                      className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-hidden min-w-[200px]"
                      style={{ borderColor: '#A2ADF3' }}
                    >
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search languages..."
                            value={languageSearchTerm}
                            onChange={(e) =>
                              setLanguageSearchTerm(e.target.value)
                            }
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {filteredLanguages.length > 0 ? (
                          filteredLanguages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => handleLanguageSelect(lang)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between text-sm border-b border-gray-50 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                {lang.code === 'auto' ? (
                                  <span className="w-6 h-6 bg-gray-200 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-blue-600 group-hover:text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm">
                                    <FaMagic className="w-4 h-4" />
                                  </span>
                                ) : (
                                  <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
                                    {lang.code.toUpperCase().slice(0, 2)}
                                  </span>
                                )}
                                <span className="text-gray-900 font-medium">
                                  {lang.name}
                                </span>
                              </div>
                              {language === lang.code && (
                                <FaCheck className="w-4 h-4 text-blue-500" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-sm">
                            No languages found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Icon Customization */}
          <div className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trigger Icon */}
              <div
                className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                style={{ borderColor: '#A2ADF3' }}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-1">
                      Trigger icon
                    </h4>
                    <p className="text-xs text-gray-600">
                      You can switch between our widget icon, non-intrusive text
                      icon, or hidden mode.
                    </p>
                  </div>
                  <div className="relative" ref={iconTypeDropdownRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setIsIconTypeDropdownOpen(!isIconTypeDropdownOpen)
                      }
                      className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white flex items-center hover:border-gray-300 transition-colors relative"
                      style={{ borderColor: '#A2ADF3' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 font-medium">
                          {selectedIconType.label}
                        </span>
                        {selectedIconType.preview()}
                      </div>
                      <FaChevronDown
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 transition-transform ${
                          isIconTypeDropdownOpen ? 'rotate-180' : ''
                        }`}
                        style={{ color: '#A2ADF3' }}
                      />
                    </button>

                    {isIconTypeDropdownOpen && (
                      <div
                        className="absolute z-50 right-0 left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-hidden"
                        style={{ borderColor: '#A2ADF3' }}
                      >
                        <div className="max-h-36 overflow-y-auto">
                          {iconTypes.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => handleIconTypeSelect(type)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between text-sm border-b border-gray-50 last:border-b-0"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-gray-900 font-medium">
                                  {type.label}
                                </span>
                                {type.preview()}
                              </div>
                              <div className="flex-shrink-0 ml-4">
                                {iconType === type.value && (
                                  <FaCheck className="w-4 h-4 text-blue-500" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trigger Size */}
              {iconType !== 'hidden' && (
                <div
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                  style={{ borderColor: '#A2ADF3' }}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1">
                        Trigger size
                      </h4>
                      <p className="text-xs text-gray-600">
                        Size of the trigger button on screen.
                      </p>
                    </div>
                    <div className="relative" ref={widgetSizeDropdownRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setIsWidgetSizeDropdownOpen(!isWidgetSizeDropdownOpen)
                        }
                        className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white flex items-center justify-between hover:border-gray-300 transition-colors"
                        style={{ borderColor: '#A2ADF3' }}
                      >
                        <span className="text-gray-900 font-medium">
                          {selectedWidgetSize.label}
                        </span>
                        <FaChevronDown
                          className={`w-3 h-3 transition-transform ${
                            isWidgetSizeDropdownOpen ? 'rotate-180' : ''
                          }`}
                          style={{ color: '#A2ADF3' }}
                        />
                      </button>

                      {isWidgetSizeDropdownOpen && (
                        <div
                          className="absolute z-50 right-0 left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-hidden"
                          style={{ borderColor: '#A2ADF3' }}
                        >
                          <div className="max-h-36 overflow-y-auto">
                            {widgetSizes.map((size) => (
                              <button
                                key={size.value}
                                onClick={() => handleWidgetSizeSelect(size)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between text-sm border-b border-gray-50 last:border-b-0"
                              >
                                <span className="text-gray-900 font-medium">
                                  {size.label}
                                </span>
                                {widgetSize === size.value && (
                                  <FaCheck className="w-4 h-4 text-blue-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden Widget Information */}
          {iconType === 'hidden' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h4 className="font-medium text-amber-800 mb-2 text-sm sm:text-base">
                    How Button Trigger Works
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-700 mb-3 leading-relaxed break-words">
                    With button trigger mode, no widget icon appears on your
                    site. Instead, you can make any existing button or element
                    activate the accessibility widget by adding this onclick
                    function:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs sm:text-sm overflow-x-auto mb-3">
                    <code className="block break-all">
                      onclick="document.querySelector('.asw-menu-btn')?.click()"
                    </code>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-700 leading-relaxed break-words">
                    Perfect for integrating with your existing navigation, help
                    buttons, or any custom UI elements while maintaining full
                    control over the user experience.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offset Controls - Hidden when icon type is hidden or customization is not shown */}
      {showCustomization && iconType !== 'hidden' && (
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-sm font-bold text-gray-800">Set offset</h4>
            <div className="relative group">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center cursor-help">
                <span className="text-white text-xs font-bold">?</span>
              </div>
              {/* Tooltip */}
              <div className="absolute top-1/2 left-full transform -translate-y-1/2 ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-lg">
                Adjust the widget position from the corner (in pixels)
                <div className="absolute top-1/2 right-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
              </div>
            </div>
          </div>

          {/* Offset Card */}
          <div
            className="bg-gray-50 rounded-lg border border-gray-200 p-4"
            style={{ borderColor: '#A2ADF3' }}
          >
            {/* Desktop Section */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-bold text-gray-800">Desktop</span>
              <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 1v6h10V5H5z"
                    clipRule="evenodd"
                  />
                  <path d="M6 12h8v1H6v-1z" />
                </svg>
              </div>
            </div>

            {/* Offset Inputs */}
            <div className="grid grid-cols-2 gap-4">
              {/* Horizontal Offset */}
              <div>
                <label className="block text-xs font-medium text-blue-600 mb-2">
                  Horizontal
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 pl-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
                    min="0"
                    max="100"
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3 8h14v1H3V8z" />
                      <path d="M3 11h14v1H3v-1z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Vertical Offset */}
              <div>
                <label className="block text-xs font-medium text-blue-600 mb-2">
                  Vertical
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 pl-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
                    min="0"
                    max="100"
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8 3v14h1V3H8z" />
                      <path d="M11 3v14h1V3h-1z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Installation Snippet - Matches Figma exactly */}
      <div className="p-4 installation-instructions">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            Installation snippet
          </h4>
          <p className="text-sm text-gray-500">
            Paste before closing {'</body>'} tag
          </p>
        </div>

        {/* Script Toggle Buttons */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <button
            onClick={() => setSelectedScript('new')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
              selectedScript === 'new'
                ? 'bg-[#445AE7] text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            New Widget Script
          </button>
          <button
            onClick={() => setSelectedScript('old')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
              selectedScript === 'old'
                ? 'bg-[#445AE7] text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Old Widget Script
          </button>
          <button
            onClick={() => setSelectedScript('gtm')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
              selectedScript === 'gtm'
                ? 'bg-[#445AE7] text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            GTM Script
          </button>
        </div>

        {/* Code Block with integrated Copy Button */}
        <div
          className="rounded-lg p-4 md:p-8 mb-4 relative min-h-[160px] installation-code-block overflow-x-auto max-w-full"
          style={{ backgroundColor: '#D0D5F9' }}
        >
          <code
            className="text-sm lg:text-base font-mono break-all pb-16 block whitespace-pre-wrap md:whitespace-pre"
            style={{ color: '#3343AD' }}
          >
            {selectedScript === 'new'
              ? newFormattedCodeString
              : selectedScript === 'gtm'
              ? gtmFormattedCodeString
              : formattedCodeString}
          </code>

          {/* Copy Button in bottom left corner of the code box */}
          <button
            onClick={
              selectedScript === 'new'
                ? copyToClipboardNew
                : selectedScript === 'gtm'
                ? copyToClipboardGtm
                : copyToClipboard
            }
            className={`absolute bottom-3 left-3 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-white font-medium text-sm transition-all duration-200 copy-code-button ${
              selectedScript === 'new'
                ? copySuccessNew
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'hover:opacity-80'
                : selectedScript === 'gtm'
                ? copySuccessGtm
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'hover:opacity-80'
                : copySuccess
                ? 'bg-green-600 hover:bg-green-700'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor:
                selectedScript === 'new'
                  ? copySuccessNew
                    ? undefined
                    : '#3343AD'
                  : selectedScript === 'gtm'
                  ? copySuccessGtm
                    ? undefined
                    : '#3343AD'
                  : copySuccess
                  ? undefined
                  : '#3343AD',
            }}
          >
            {selectedScript === 'new' ? (
              copySuccessNew ? (
                <>
                  <FaCheck className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <FaRegCopy className="w-3 h-3" />
                  Copy Snippet
                </>
              )
            ) : selectedScript === 'gtm' ? (
              copySuccessGtm ? (
                <>
                  <FaCheck className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <FaRegCopy className="w-3 h-3" />
                  Copy Snippet
                </>
              )
            ) : copySuccess ? (
              <>
                <FaCheck className="w-3 h-3" />
                Copied!
              </>
            ) : (
              <>
                <FaRegCopy className="w-3 h-3" />
                Copy Snippet
              </>
            )}
          </button>
        </div>

        {/* Additional Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3 mt-3">
          {/* Additional Actions - Hidden behind customization toggle */}
          {showCustomization && (
            <>
              <button
                onClick={() => setShowEmailModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#445AE7] hover:bg-[#e6f3fa] text-[#445AE7] rounded-lg font-medium transition-colors"
              >
                <FaEnvelope className="w-4 h-4" />
                Send Instructions
              </button>
            </>
          )}

          {/* Customize Button */}
          <button
            onClick={() => setShowCustomization(!showCustomization)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#445AE7] hover:bg-[#e6f3fa] text-[#445AE7] rounded-lg font-medium transition-colors customize-widget-button"
          >
            <FaMagic className="w-4 h-4" />
            {showCustomization ? 'Hide Options' : 'Customize Script'}
          </button>
        </div>

        {/* Support Contact - Matches the image */}
        <div className="mt-6">
          <p className="text-sm mb-1" style={{ color: '#A1A1A1' }}>
            Need help for the next step?
          </p>
          <a
            href="https://www.webability.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline transition-all cursor-pointer"
            style={{
              color: '#445AE7',
              textDecoration: 'none',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#3a4bc7')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#445AE7')}
          >
            Contact Support
          </a>
        </div>
      </div>

      {/* Email Modal */}
      <InstallationEmailModal
        isOpen={showEmailModal}
        onClose={handleModalClose}
        onSubmit={handleSendInstructions}
        isLoading={isSending}
        title="Send Installation Instructions"
        description="We'll email you the complete setup code"
        bulletPoints={[
          { text: 'Complete installation code' },
          { text: 'Step-by-step setup instructions' },
          { text: 'Configuration options' },
          { text: 'Troubleshooting tips' },
        ]}
        showSuccessState={true}
        successTitle="Email Sent Successfully!"
        successDescription="Check your inbox for installation instructions."
      />
    </div>
  );
}
