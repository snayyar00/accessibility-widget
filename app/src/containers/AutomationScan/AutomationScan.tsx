import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { GetUserSitesDocument } from '@/generated/graphql';
import { MdPlayArrow, MdStop, MdAutoMode } from 'react-icons/md';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { BiTestTube } from 'react-icons/bi';

type OptionType = { value: string; label: string };

interface TestOption {
  value: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const testOptions: TestOption[] = [
  {
    value: 'all',
    label: 'All Tests',
    description: 'Run comprehensive accessibility analysis with all available tests',
    icon: BiTestTube,
    color: 'text-blue-600',
  },
  {
    value: 'tab-navigation',
    label: 'Tab Navigation',
    description: 'Test keyboard navigation and focus management',
    icon: FaCheck,
    color: 'text-green-600',
  },
  {
    value: 'form-labels',
    label: 'Form Labels',
    description: 'Detect missing form input labels',
    icon: FaExclamationTriangle,
    color: 'text-orange-600',
  },
  {
    value: 'heading-structure',
    label: 'Heading Structure',
    description: 'Analyze page heading hierarchy',
    icon: FaCheck,
    color: 'text-purple-600',
  },
  {
    value: 'landmark-roles',
    label: 'Landmark Roles',
    description: 'Check ARIA landmark violations',
    icon: FaCheck,
    color: 'text-indigo-600',
  },
  {
    value: 'focus-visibility',
    label: 'Focus Visibility',
    description: 'Test visible focus indicators',
    icon: FaCheck,
    color: 'text-teal-600',
  },
  {
    value: 'language-detection',
    label: 'Language Detection',
    description: 'Detect missing or incorrect language attributes',
    icon: FaCheck,
    color: 'text-red-600',
  },
];

const AutomationScan: React.FC = () => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestOption>(testOptions[0]); // Default to "All Tests"
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [domain, setDomain] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user sites for domain selector
  const { data: sitesData, loading: sitesLoading } = useQuery(GetUserSitesDocument);

  // Combine options for existing sites
  const siteOptions = useMemo(
    () =>
      sitesData?.getUserSites?.map((domain: any) => ({
        value: domain.url,
        label: domain.url,
      })) || [],
    [sitesData],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTestSelection = (test: TestOption) => {
    setSelectedTest(test);
    setIsDropdownOpen(false);
  };

  const handleStartScan = async () => {
    const targetDomain = domain.trim() || selectedOption?.value?.trim();
    if (!targetDomain) {
      alert('Please enter a domain to scan');
      return;
    }

    setIsScanning(true);
    setScanResults(null);

    try {
      // TODO: Implement actual automation scan logic here
      // This would integrate with your accessibility testing MCP server
      console.log(`Starting ${selectedTest.label} scan for domain: ${targetDomain}`);
      
      // Simulate scan delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock results for now
      setScanResults({
        domain: targetDomain,
        testType: selectedTest.value,
        status: 'completed',
        issues: Math.floor(Math.random() * 10),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    setScanResults(null);
  };

  return (
    <div className="automation-scan-wrapper">
      <header className="accessibility-page-header text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Automation Scan</h1>
        <p className="text-xl text-gray-600">
          Run automated accessibility tests on your website. Select specific tests or run comprehensive analysis.
        </p>
      </header>

      <div className="w-full pl-6 pr-6 border-none shadow-none flex flex-col justify-center items-center">
        <div className="search-bar-container bg-white my-6 p-3 sm:p-4 rounded-xl w-full">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full">
            
            {/* Test Selection Dropdown */}
            <div className="relative w-full md:flex-1 min-w-0 md:min-w-[130px] md:max-w-[200px]">
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => !isScanning && setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isScanning}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-2 py-2 pr-6 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[38px] w-full flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-2">
                    <selectedTest.icon className={`w-3 h-3 ${selectedTest.color}`} />
                    <span className="text-xs font-medium truncate">
                      {selectedTest.label}
                    </span>
                  </div>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform pointer-events-none ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
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
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    {testOptions.map((test) => (
                      <button
                        key={test.value}
                        type="button"
                        onClick={() => handleTestSelection(test)}
                        className="w-full px-3 py-3 text-left hover:bg-gray-50 flex items-start space-x-3 border-b border-gray-100 last:border-b-0"
                      >
                        <test.icon className={`w-4 h-4 mt-0.5 ${test.color} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {test.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {test.description}
                          </div>
                        </div>
                        {selectedTest.value === test.value && (
                          <FaCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Domain Input */}
            <div className="w-full md:flex-1 min-w-0">
              <Select
                options={siteOptions}
                value={selectedOption}
                onChange={(selected: OptionType | null) => {
                  setSelectedOption(selected);
                  setDomain(selected?.value ?? '');
                }}
                onCreateOption={(inputValue: any) => {
                  const newOption = { value: inputValue, label: inputValue };
                  setSelectedOption(newOption);
                  setDomain(inputValue);
                }}
                placeholder="Add a new Domain"
                isSearchable
                isClearable
                formatCreateLabel={(inputValue: any) =>
                  `Enter a new domain: "${inputValue}"`
                }
                classNamePrefix="react-select"
                className="w-full min-w-0"
                styles={{
                  control: (provided: any, state: any) => ({
                    ...provided,
                    borderRadius: '6px',
                    border: state.isFocused
                      ? '1px solid #3b82f6'
                      : '1px solid #d1d5db',
                    minHeight: '38px',
                    boxShadow: state.isFocused
                      ? '0 0 0 2px rgba(59, 130, 246, 0.1)'
                      : 'none',
                    '&:hover': {
                      border: state.isFocused
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                    },
                  }),
                }}
                isDisabled={isScanning}
              />
            </div>

            {/* Scan Button */}
            <div className="w-full md:w-auto">
              <button
                type="button"
                onClick={isScanning ? handleStopScan : handleStartScan}
                disabled={!isScanning && !(domain.trim() || selectedOption?.value?.trim())}
                className={`w-full md:w-auto px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200 h-[38px] flex items-center justify-center space-x-2 min-w-[120px] ${
                  isScanning
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed'
                }`}
              >
                {isScanning ? (
                  <>
                    <MdStop className="w-4 h-4" />
                    <span>Stop Scan</span>
                  </>
                ) : (
                  <>
                    <MdPlayArrow className="w-4 h-4" />
                    <span>Scan Website</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Scanning Status */}
        {isScanning && (
          <div className="w-full max-w-6xl mx-auto mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Running {selectedTest.label} on {domain}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    This may take a few moments...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        {!isScanning && !scanResults && (
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-52 flex flex-col justify-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FaCheck className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Comprehensive Analysis
              </h3>
              <p className="text-gray-600 text-sm">
                Our automation scanner checks for WCAG 2.1 compliance across your entire site.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-52 flex flex-col justify-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    <circle cx="17" cy="17" r="3"/>
                    <path d="M15.5 16.5L17 18l2.5-2.5"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Detailed Reports
              </h3>
              <p className="text-gray-600 text-sm">
                Receive a full breakdown of accessibility issues and how to fix them.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-52 flex flex-col justify-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Improve User Experience
              </h3>
              <p className="text-gray-600 text-sm">
                Make your website accessible to all users, regardless of abilities.
              </p>
            </div>
          </div>
        )}

        {/* Scan Results */}
        {scanResults && (
          <div className="w-full max-w-6xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Automation Scan Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Domain</div>
                  <div className="text-sm font-medium text-gray-900">{scanResults.domain}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Test Type</div>
                  <div className="text-sm font-medium text-gray-900">
                    {testOptions.find(t => t.value === scanResults.testType)?.label}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Issues Found</div>
                  <div className={`text-lg font-bold ${
                    scanResults.issues === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {scanResults.issues}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div className="text-sm font-medium text-green-600">Completed</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Completed: {new Date(scanResults.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationScan; 