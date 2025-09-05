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
} from 'react-icons/fa';
import { FaRegCopy } from 'react-icons/fa6';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { CircularProgress } from '@mui/material';

interface CodeProps {
  codeString: string;
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

export default function CodeContainer({ codeString }: CodeProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [position, setPosition] = useState('bottom-left');
  const [language, setLanguage] = useState('en');
  const [iconType, setIconType] = useState<'full' | 'compact'>('full');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [languageSearchTerm, setLanguageSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [sendWidgetInstallation, { loading: isSending }] = useMutation(
    SEND_WIDGET_INSTALLATION,
  );

  const selectedLanguage =
    languages.find((lang) => lang.code === language) || languages[0];

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

  const handleLanguageSelect = (lang: typeof languages[0]) => {
    setLanguage(lang.code);
    setIsLanguageDropdownOpen(false);
    setLanguageSearchTerm('');
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formattedCodeString = `<script src="https://widget.webability.io/widget.min.js" data-asw-position="${position}" data-asw-lang="${language}" data-asw-icon-type="${iconType}" defer></script>`;

  const validateEmail = (email: string) => {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return emailRegex.test(email);
  };

  const handleSendInstructions = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');

    try {
      const result = await sendWidgetInstallation({
        variables: {
          email,
          code: formattedCodeString,
          position,
          language,
          languageName: selectedLanguage.englishName,
        },
      });

      if (result.data?.sendWidgetInstallationInstructions?.success) {
        setSendSuccess(true);
        setTimeout(() => {
          setShowEmailModal(false);
          setSendSuccess(false);
          setEmail('');
        }, 2000);
      } else {
        setEmailError('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending widget installation instructions:', error);
      setEmailError('Failed to send email. Please try again.');
    }
  };

  const handleModalClose = () => {
    if (!isSending) {
      setShowEmailModal(false);
      setEmail('');
      setEmailError('');
      setSendSuccess(false);
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
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        handleModalClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSending]);

  const [showCustomization, setShowCustomization] = useState(false);

  return (
    <div className="w-full bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Customization Section - Hidden by default, matches Figma */}
      {showCustomization && (
        <div className="p-4 border-b border-gray-100 bg-gray-50">
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
            {/* Position Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Position
              </label>
              <div className="relative">
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 font-medium appearance-none"
                >
                  {positions.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FaChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="relative space-y-2" ref={dropdownRef}>
              <label className="block text-sm font-semibold text-gray-800">
                Language
              </label>
              <button
                type="button"
                onClick={() =>
                  setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white flex items-center justify-between hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {selectedLanguage.code.toUpperCase().slice(0, 2)}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {selectedLanguage.name}
                  </span>
                </div>
                <FaChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    isLanguageDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isLanguageDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search languages..."
                        value={languageSearchTerm}
                        onChange={(e) => setLanguageSearchTerm(e.target.value)}
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
                            <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
                              {lang.code.toUpperCase().slice(0, 2)}
                            </span>
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

            {/* Icon Type */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-800">
                Icon Type
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIconType('full')}
                  className={`w-34 p-3 border-2 rounded-lg transition-all ${
                    iconType === 'full'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 flex items-center justify-center">
                      <img
                        src="/images/svg/full_widget_icon.svg"
                        alt="Full Widget"
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (
                            e.currentTarget as HTMLImageElement
                          ).style.visibility = 'hidden';
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Full Widget
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIconType('compact')}
                  className={`w-34 p-3 border-2 rounded-lg transition-all ${
                    iconType === 'compact'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-28 sm:w-28 h-8 flex items-center justify-center">
                      <div className="w-28 sm:w-28 h-7 bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-xs font-medium whitespace-nowrap">
                          Site Accessibility
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 pt-3">
                      Compact Widget
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Installation Snippet - Matches Figma exactly */}
      <div className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            Installation snippet
          </h4>
          <p className="text-sm text-gray-500">
            Paste before closing {'</body>'} tag
          </p>
        </div>

        {/* Code Block with integrated Copy Button */}
        <div
          className="rounded-lg p-8 mb-4 relative min-h-[160px]"
          style={{ backgroundColor: '#DEE9EE' }}
        >
          <code
            className="text-sm lg:text-base font-mono break-all pb-16 block"
            style={{ color: '#153A4A' }}
          >
            {formattedCodeString}
          </code>

          {/* Copy Button in bottom left corner of the code box */}
          <button
            onClick={copyToClipboard}
            className={`absolute bottom-3 left-3 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-white font-medium text-sm transition-all duration-200 ${
              copySuccess
                ? 'bg-green-600 hover:bg-green-700'
                : 'hover:opacity-80'
            }`}
            style={{ backgroundColor: copySuccess ? undefined : '#205A76' }}
          >
            {copySuccess ? (
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
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#559EC1] hover:bg-[#e6f3fa] text-[#559EC1] rounded-lg font-medium transition-colors"
              >
                <FaEnvelope className="w-4 h-4" />
                Send Instructions
              </button>
            </>
          )}

          {/* Customize Button */}
          <button
            onClick={() => setShowCustomization(!showCustomization)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#559EC1] hover:bg-[#e6f3fa] text-[#559EC1] rounded-lg font-medium transition-colors"
          >
            <FaMagic className="w-4 h-4" />
            {showCustomization ? 'Hide Options' : 'Customize'}
          </button>
        </div>

        {/* Support Contact - Matches the image */}
        <div className="mt-6">
          <p className="text-sm mb-1" style={{ color: '#A1A1A1' }}>
            Need help for the next step?
          </p>
          <button
            className="text-sm font-medium hover:underline transition-all"
            style={{
              color: '#4488A9',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#336b85')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#4488A9')}
          >
            Contact Support
          </button>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div
            ref={modalRef}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300"
            style={{
              boxShadow:
                '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Modal Header */}
            <div
              className="p-8 text-white relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #559EC1 0%, #4A8BB5 100%)',
              }}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
              </div>

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                    <FaEnvelope className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">
                      Send Installation Instructions
                    </h3>
                    <p className="text-white/90 text-sm font-medium">
                      We'll email you the complete setup code
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleModalClose}
                  disabled={isSending}
                  className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-all duration-200 disabled:opacity-50 hover:scale-105"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              {!sendSuccess ? (
                <>
                  <div className="mb-6">
                    <label
                      htmlFor="email"
                      className="block text-sm font-bold text-gray-800 mb-3"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="Enter your email address"
                        className={`w-full px-5 py-4 border-2 rounded-xl focus:outline-none transition-all duration-200 text-gray-800 font-medium placeholder-gray-400 ${
                          emailError
                            ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-[#559EC1] focus:ring-4 focus:ring-[#559EC1]/20'
                        }`}
                        disabled={isSending}
                        style={{
                          backgroundColor: '#FAFBFC',
                        }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <FaEnvelope className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    {emailError && (
                      <p className="text-red-500 text-sm mt-2 font-medium flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div
                    className="rounded-2xl p-6 mb-8 border-2"
                    style={{
                      background:
                        'linear-gradient(135deg, #F8FBFF 0%, #E8F4FD 100%)',
                      borderColor: '#E1F0F7',
                    }}
                  >
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-3 text-base">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#559EC1' }}
                      >
                        <FaMagic className="w-4 h-4 text-white" />
                      </div>
                      What you'll receive:
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-3 font-medium">
                      <li className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#559EC1' }}
                        ></div>
                        Complete installation code
                      </li>
                      <li className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#559EC1' }}
                        ></div>
                        Step-by-step setup instructions
                      </li>
                      <li className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#559EC1' }}
                        ></div>
                        Configuration options
                      </li>
                      <li className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#559EC1' }}
                        ></div>
                        Troubleshooting tips
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleSendInstructions}
                    disabled={isSending || !email.trim()}
                    className="w-full py-4 px-6 text-white rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background:
                        isSending || !email.trim()
                          ? '#94A3B8'
                          : 'linear-gradient(135deg, #559EC1 0%, #4A8BB5 100%)',
                      boxShadow:
                        isSending || !email.trim()
                          ? 'none'
                          : '0 10px 25px -5px rgba(85, 158, 193, 0.4), 0 4px 6px -2px rgba(85, 158, 193, 0.1)',
                    }}
                  >
                    {isSending ? (
                      <>
                        <CircularProgress
                          size={20}
                          color={'inherit'}
                          className="w-5 h-5"
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaEnvelope className="w-5 h-5" />
                        Send Instructions
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-12">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                    style={{
                      background:
                        'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <FaCheck className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    Email Sent Successfully!
                  </h3>
                  <p className="text-gray-600 text-lg font-medium">
                    Check your inbox for installation instructions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
