import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaSearch, FaCheck, FaMagic } from "react-icons/fa";
import { FaRegCopy } from "react-icons/fa6";

interface CodeProps {
  codeString: string;
}

const positions = [
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'center-left', label: 'Center Left' },
  { value: 'center-right', label: 'Center Right' }
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
  { code: 'ca', name: 'Català', englishName: 'Catalan' }
];

export default function CodeContainer({ codeString }: CodeProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [position, setPosition] = useState('bottom-left');
  const [language, setLanguage] = useState('en');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [languageSearchTerm, setLanguageSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLanguage = languages.find(lang => lang.code === language) || languages[0];

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
    lang.englishName.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(languageSearchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
        setLanguageSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = () => {
    const scriptWithOptions = `<script src="https://widget.webability.io/widget.min.js" data-asw-position="${position}" data-asw-lang="${language}" defer></script>`;
    navigator.clipboard.writeText(scriptWithOptions);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleLanguageSelect = (lang: typeof languages[0]) => {
    setLanguage(lang.code);
    setIsLanguageDropdownOpen(false);
    setLanguageSearchTerm('');
  };

  const formattedCodeString = `<script src="https://widget.webability.io/widget.min.js" data-asw-position="${position}" data-asw-lang="${language}" defer></script>`;

  return (
    <div className="min-h-[140px] max-h-[400px] flex flex-col bg-white rounded-lg border border-gray-300 overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-gray-300 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
            <FaMagic className="w-3 h-3 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Customize Your Widget</h3>
            <p className="text-xs text-gray-600">Choose position and language</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Position Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white text-gray-900 hover:border-gray-400 transition-colors"
              aria-label="Select widget position"
            >
              {positions.map((pos) => (
                <option key={pos.value} value={pos.value}>{pos.label}</option>
              ))}
            </select>
          </div>

          {/* Language Selector */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Language
            </label>
            <button
              type="button"
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white flex items-center justify-between hover:border-gray-400 transition-colors"
              aria-label="Select widget language"
              aria-expanded={isLanguageDropdownOpen}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {selectedLanguage.code.toUpperCase().slice(0, 2)}
                </span>
                <span className="text-gray-900 font-medium text-xs truncate">{selectedLanguage.name}</span>
              </div>
              <FaChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLanguageDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-hidden">
                {/* Search Input */}
                <div className="p-1.5 border-b border-gray-200">
                  <div className="relative">
                    <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={languageSearchTerm}
                      onChange={(e) => setLanguageSearchTerm(e.target.value)}
                      className="w-full pl-5 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="Search languages"
                    />
                  </div>
                </div>

                {/* Language List */}
                <div className="max-h-32 overflow-y-auto">
                  {filteredLanguages.length > 0 ? (
                    filteredLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang)}
                        className="w-full px-2 py-1.5 text-left hover:bg-blue-50 flex items-center justify-between group text-xs"
                        aria-label={`Select ${lang.englishName} language`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 bg-gray-200 group-hover:bg-primary group-hover:text-white rounded-full flex items-center justify-center text-xs font-medium transition-all">
                            {lang.code.toUpperCase().slice(0, 2)}
                          </span>
                          <span className="text-gray-900 font-medium truncate text-xs">{lang.name}</span>
                        </div>
                        {language === lang.code && (
                          <FaCheck className="w-3 h-3 text-primary" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-gray-500 text-xs">No languages found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Installation Snippet */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="p-2 bg-white flex-shrink-0">
          <h4 className="text-xs font-medium text-gray-900 mb-0.5 flex items-center gap-1">
            <span className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </span>
            Installation Snippet
          </h4>
          <p className="text-xs text-gray-600">
            Paste before closing {'</body>'} tag
          </p>
        </div>

        <div className="bg-gray-50 p-1.5 border-y border-gray-300 flex-1 min-h-0 flex flex-col">
          <div className="bg-white rounded border border-gray-300 p-2 hover:border-gray-400 transition-colors flex-1 min-h-0 flex items-center">
            <pre className="text-xs text-gray-800 font-mono whitespace-nowrap overflow-x-auto leading-tight w-full">
              {formattedCodeString}
            </pre>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-2 bg-white flex-shrink-0">
          <button
            onClick={copyToClipboard}
            className={`w-full py-1.5 px-3 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              copySuccess 
                ? 'bg-green-600 text-white' 
                : 'bg-primary hover:bg-blue-700 text-white'
            }`}
            aria-label={copySuccess ? 'Code copied successfully' : 'Copy installation code'}
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
          
          {copySuccess && (
            <p className="text-center text-xs text-green-600 mt-0.5 font-medium">
              Ready to paste!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}