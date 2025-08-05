import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaSearch, FaCheck, FaMagic, FaExpand, FaCompress, FaEnvelope, FaTimes, FaSpinner } from "react-icons/fa";
import { FaRegCopy } from "react-icons/fa6";
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
  { code: 'pt-br', name: 'Português (Brasil)', englishName: 'Portuguese (Brazil)' },
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedCodeString);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleLanguageSelect = (lang: typeof languages[0]) => {
    setLanguage(lang.code);
    setIsLanguageDropdownOpen(false);
    setLanguageSearchTerm('');
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formattedCodeString = `<script src="https://widget.webability.io/widget.min.js" data-asw-position="${position}" data-asw-lang="${language}"defer></script>`;

  const validateEmail = (email: string) => {
    const emailRegex = new RegExp(`/^${email}$/`);

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

  return (
    <div className="min-h-[400px] max-w-4xl w-full flex flex-col bg-gradient-to-br from-white via-blue-50/30 to-white rounded-2xl overflow-hidden shadow-xl shadow-blue-500/10 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-blue-100/60 flex-shrink-0 bg-gradient-to-r from-white to-blue-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-blue-100">
            <FaMagic className="w-4 h-4 text-white drop-shadow-sm" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">
              Customize Your Widget
            </h3>
            <p className="text-sm text-gray-600 font-medium">
              Choose position and language
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Position Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800 tracking-wide">
              Position
            </label>
            <div className="relative">
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-blue-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-sm bg-white/80 text-gray-900 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm font-medium appearance-none"
                aria-label="Select widget position"
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
            <label className="block text-sm font-semibold text-gray-800 tracking-wide">
              Language
            </label>
            <button
              type="button"
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="w-full px-4 py-3 border border-blue-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-sm bg-white/80 flex items-center justify-between hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm"
              aria-label="Select widget language"
              aria-expanded={isLanguageDropdownOpen}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                  {selectedLanguage.code.toUpperCase().slice(0, 2)}
                </span>
                <span className="text-gray-900 font-semibold text-sm truncate">
                  {selectedLanguage.name}
                </span>
              </div>
              <FaChevronDown
                className={`w-4 h-4 text-gray-500 transition-all duration-300 ${
                  isLanguageDropdownOpen ? 'rotate-180 text-blue-500' : ''
                }`}
              />
            </button>

            {isLanguageDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md border border-blue-200/60 rounded-xl shadow-2xl shadow-blue-500/20 max-h-48 overflow-hidden ring-1 ring-blue-100/50">
                {/* Search Input */}
                <div className="p-3 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/50 to-white">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search languages..."
                      value={languageSearchTerm}
                      onChange={(e) => setLanguageSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-blue-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 bg-white/80 backdrop-blur-sm font-medium"
                      aria-label="Search languages"
                    />
                  </div>
                </div>

                {/* Language List */}
                <div className="max-h-36 overflow-y-auto">
                  {filteredLanguages.length > 0 ? (
                    filteredLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang)}
                        className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100/50 flex items-center justify-between group text-sm transition-all duration-200 border-b border-blue-50/50 last:border-b-0"
                        aria-label={`Select ${lang.englishName} language`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-gray-200 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-blue-600 group-hover:text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm">
                            {lang.code.toUpperCase().slice(0, 2)}
                          </span>
                          <span className="text-gray-900 font-semibold truncate text-sm group-hover:text-blue-900">
                            {lang.name}
                          </span>
                        </div>
                        {language === lang.code && (
                          <FaCheck className="w-4 h-4 text-blue-500 drop-shadow-sm" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-sm font-medium">
                      No languages found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Installation Snippet */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="p-4 bg-gradient-to-r from-white to-blue-50/30 flex-shrink-0">
          <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-5 h-5 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-sm ring-2 ring-green-100">
              <span className="text-white text-xs font-bold">✓</span>
            </span>
            Installation Snippet
          </h4>
          <p className="text-sm text-gray-600 font-medium">
            Paste before closing {'</body>'} tag
          </p>
        </div>

        <div
          className={`bg-gradient-to-br from-gray-50 to-blue-50/30 p-3 border-y border-blue-100/60 flex-1 min-h-[100px] ${
            isExpanded ? 'max-h-none' : 'max-h-[100px]'
          } flex flex-col`}
        >
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 hover:border-gray-600 hover:shadow-lg transition-all duration-300 flex-1 min-h-[80px] ${isExpanded ? 'max-h-none' : 'max-h-[80px]'} flex flex-col shadow-sm ring-1 ring-gray-800/50">
            {/* Code content */}
            <div
              className={`flex-1 min-h-[60px] ${
                isExpanded ? 'max-h-none' : 'max-h-[60px]'
              } bg-gray-800 rounded-lg p-3 w-full overflow-hidden relative`}
            >
              <pre
                className={`text-base text-gray-100 font-mono leading-relaxed w-full p-0 m-0 ${
                  isExpanded ? 'whitespace-pre-wrap' : 'overflow-x-hidden'
                }`}
              >
                <code
                  className={`block ${
                    isExpanded ? 'whitespace-pre-wrap' : 'whitespace-nowrap'
                  } text-gray-100`}
                >
                  {formattedCodeString}
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-gradient-to-r from-white to-blue-50/30 flex-shrink-0 border-t border-blue-100/60">
          <div className="flex flex-row gap-3 justify-center items-center">
            <button
              onClick={copyToClipboard}
              className={`py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg transform hover:scale-[1.02] active:scale-[0.98] ${
                copySuccess
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25 focus:ring-green-500 ring-2 ring-green-100'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25 focus:ring-blue-500'
              }`}
              aria-label={
                copySuccess
                  ? 'Code copied successfully'
                  : 'Copy installation code'
              }
            >
              {copySuccess ? (
                <>
                  <FaCheck className="w-4 h-4 drop-shadow-sm" />
                  Copied Successfully!
                </>
              ) : (
                <>
                  <FaRegCopy className="w-4 h-4 drop-shadow-sm" />
                  Copy Installation Code
                </>
              )}
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="py-4 px-6 bg-white border-2 border-blue-500 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              aria-label="Send installation instructions via email"
            >
              <FaEnvelope className="w-4 h-4" />
              Send Instructions
            </button>

            <div className="flex-1 flex justify-end">
              <button
                onClick={toggleExpand}
                className="py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 border border-blue-700 font-bold text-base flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
                aria-label={
                  isExpanded ? 'Collapse code view' : 'Expand code view'
                }
              >
                {isExpanded ? (
                  <>
                    <FaCompress className="w-4 h-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <FaExpand className="w-4 h-4" />
                    Expand
                  </>
                )}
              </button>
            </div>
          </div>

          {copySuccess && (
            <p className="text-center text-sm text-green-600 mt-2 font-bold animate-pulse">
              Ready to paste into your website!
            </p>
          )}
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              ref={modalRef}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-200"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <FaEnvelope className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        Send Installation Instructions
                      </h3>
                      <p className="text-purple-100 text-sm">
                        We'll email you the setup code
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleModalClose}
                    disabled={isSending}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {!sendSuccess ? (
                  <>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="Enter your email address"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                          emailError
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-300 focus:border-purple-500'
                        }`}
                        disabled={isSending}
                      />
                      {emailError && (
                        <p className="text-red-500 text-sm mt-1">
                          {emailError}
                        </p>
                      )}
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <FaMagic className="w-4 h-4 text-purple-500" />
                        What you'll receive:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Complete installation code</li>
                        <li>• Step-by-step setup instructions</li>
                        <li>• Configuration options</li>
                        <li>• Troubleshooting tips</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleSendInstructions}
                      disabled={isSending || !email.trim()}
                      className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <>
                          <CircularProgress
                            size={24}
                            color={'inherit'}
                            className="w-4 h-4"
                          />
                          Sending...
                        </>
                      ) : (
                        <>
                          <FaEnvelope className="w-4 h-4" />
                          Send Instructions
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      Email Sent Successfully!
                    </h3>
                    <p className="text-gray-600">
                      Check your inbox for installation instructions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
