import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GetUserSitesDocument } from '@/generated/graphql';
import { MdSearch, MdExpandMore, MdExpandLess, MdBugReport, MdCheckCircle, MdWarning } from 'react-icons/md';
import { FaKeyboard, FaMapSigns, FaHeading, FaLink, FaImage, FaLanguage, FaVideo, FaPlay, FaEye, FaBrain } from 'react-icons/fa';

// Mock data based on your API structure
const mockIssuesData = [
  {
    category: "Keyboard",
    subcategories: [
      {
        id: "2.1",
        name: "Keyboard Navigation + Keyboard Traps",
        status: "success",
        total_fixes: 0,
        timestamp: "2025-09-09T22:47:33.751825",
        auto_fixes: []
      },
      {
        id: "2.3",
        name: "On Focus",
        status: "success",
        total_fixes: 0,
        timestamp: "2025-09-09T22:51:20.781164",
        auto_fixes: []
      },
      {
        id: "2.4",
        name: "On Input",
        status: "success",
        total_fixes: 0,
        timestamp: "2025-09-09T22:51:20.781164",
        auto_fixes: []
      }
    ],
    icon: FaKeyboard,
    color: "blue"
  },
  {
    category: "Landmarks",
    subcategories: [
      {
        id: "4.1",
        name: "Landmark Roles",
        status: "success",
        total_fixes: 2,
        timestamp: "2025-09-09T22:29:57.401309",
        auto_fixes: [
          {
            selector: "div#ctl01_ciUtilityNavigation_UtilityPlaceholder",
            action: "add",
            issue_type: "landmark_missing_unique_label",
            description: "Missing unique label for navigation landmark"
          },
          {
            selector: "div.container",
            action: "add", 
            issue_type: "landmark_missing_unique_label",
            description: "Missing unique label for navigation landmark"
          }
        ]
      },
      {
        id: "4.2",
        name: "Primary Content",
        status: "success",
        total_fixes: 0,
        timestamp: "2025-09-09T22:43:26.186012",
        auto_fixes: []
      }
    ],
    icon: FaMapSigns,
    color: "green"
  },
  {
    category: "Headings",
    subcategories: [
      {
        id: "5.1",
        name: "Heading Functions",
        status: "success",
        total_fixes: 6,
        timestamp: "2025-09-09T22:13:02.781401",
        auto_fixes: [
          {
            selector: "h1",
            action: "review",
            issue_type: "heading_function_violation",
            description: "Heading may not be functioning as expected"
          }
        ]
      },
      {
        id: "5.2",
        name: "No Missing Headings",
        status: "success",
        total_fixes: 2,
        timestamp: "2025-09-09T22:25:08.042298",
        auto_fixes: [
          {
            selector: "text containing '2025 training'",
            action: "add",
            issue_type: "visual_heading_not_coded",
            description: "Visual heading not properly coded"
          }
        ]
      }
    ],
    icon: FaHeading,
    color: "orange"
  },
  {
    category: "Links",
    subcategories: [
      {
        id: "7.1",
        name: "Link Function",
        status: "success",
        total_fixes: 5,
        timestamp: "2025-09-09T22:01:58.999397",
        auto_fixes: [
          {
            selector: "div > a.rwPopupButton",
            action: "add",
            issue_type: "missing_widget_role",
            description: "Anchor functions as button but missing ARIA role"
          }
        ]
      }
    ],
    icon: FaLink,
    color: "purple"
  },
  {
    category: "Images",
    subcategories: [
      {
        id: "14.1",
        name: "Image Function",
        status: "success",
        total_fixes: 9,
        timestamp: "2025-09-09T21:43:37.912814",
        auto_fixes: [
          {
            selector: "img",
            action: "update",
            issue_type: "decorative_should_be_meaningful",
            description: "Image should be meaningful rather than decorative"
          }
        ]
      }
    ],
    icon: FaImage,
    color: "red"
  },
  {
    category: "Contrast",
    subcategories: [
      {
        id: "24.1",
        name: "UI Components",
        status: "success",
        total_fixes: 4,
        timestamp: "2025-09-09T20:35:47.427097",
        auto_fixes: [
          {
            selector: "a.btn",
            action: "update",
            issue_type: "insufficient_ui_contrast",
            description: "Insufficient contrast ratio for UI component"
          }
        ]
      }
    ],
    icon: FaEye,
    color: "teal"
  }
];

interface IssueCardProps {
  category: any;
  isExpanded: boolean;
  onToggle: () => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ category, isExpanded, onToggle }) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const totalIssues = category.subcategories.reduce((sum: number, sub: any) => sum + sub.total_fixes, 0);
  const hasIssues = totalIssues > 0;

  const getStatusColor = () => {
    if (!hasIssues) return 'text-green-600';
    if (totalIssues <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (!hasIssues) return <MdCheckCircle className="w-5 h-5 text-green-600" />;
    if (totalIssues <= 3) return <MdWarning className="w-5 h-5 text-yellow-600" />;
    return <MdBugReport className="w-5 h-5 text-red-600" />;
  };

  const getCategoryColorClass = () => {
    const colors = {
      blue: 'border-blue-500 bg-blue-50',
      green: 'border-green-500 bg-green-50',
      orange: 'border-orange-500 bg-orange-50',
      purple: 'border-purple-500 bg-purple-50',
      red: 'border-red-500 bg-red-50',
      teal: 'border-teal-500 bg-teal-50'
    };
    return colors[category.color as keyof typeof colors] || 'border-gray-500 bg-gray-50';
  };

  return (
    <div className={`border-l-4 rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-md ${getCategoryColorClass()}`}>
      {/* Card Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${category.color}-100`}>
              <category.icon className={`w-5 h-5 text-${category.color}-600`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{category.category}</h3>
              <p className="text-sm text-gray-600">
                {category.subcategories.length} checks • {totalIssues} issues found
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <MdExpandMore className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="p-4 space-y-3">
            {category.subcategories.map((subcategory: any) => (
              <div key={subcategory.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        {subcategory.id} {subcategory.name}
                      </span>
                      {subcategory.total_fixes > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {subcategory.total_fixes} issues
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pass
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tested: {new Date(subcategory.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {subcategory.total_fixes > 0 && (
                    <button
                      onClick={() => {
                        setSelectedSubcategory(subcategory);
                        setShowAnalysis(true);
                      }}
                      className="ml-3 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors duration-200"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {showAnalysis && selectedSubcategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedSubcategory.id} {selectedSubcategory.name}
                </h3>
                <button
                  onClick={() => setShowAnalysis(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600">
                    Found {selectedSubcategory.total_fixes} issues that need attention
                  </p>
                </div>

                {selectedSubcategory.auto_fixes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Issues Found</h4>
                    <div className="space-y-3">
                      {selectedSubcategory.auto_fixes.map((fix: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <MdBugReport className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{fix.issue_type}</p>
                              <p className="text-sm text-gray-600 mt-1">{fix.description}</p>
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">
                                  <strong>Selector:</strong> {fix.selector}
                                </p>
                                <p className="text-xs text-gray-500">
                                  <strong>Action:</strong> {fix.action}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AutomationScan: React.FC = () => {
  const { t } = useTranslation();
  const [domain, setDomain] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [hasScanned, setHasScanned] = useState(false);

  // Fetch user sites for domain selector
  const { data: sitesData, loading: sitesLoading } = useQuery(GetUserSitesDocument);

  const handleStartScan = async () => {
    if (!domain.trim()) {
      alert('Please enter a domain to scan');
      return;
    }

    setIsScanning(true);

    try {
      // TODO: Implement actual automation scan logic here
      console.log(`Starting scan for domain: ${domain}`);
      
      // Simulate scan delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setHasScanned(true);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleCardExpansion = (categoryName: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const filteredIssues = mockIssuesData.filter(category =>
    category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.subcategories.some(sub => 
      sub.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(124.44deg, #E9F2FF 5.14%, #DFE1F9 94.18%)'
      }}
    >
      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">Scan your domain</h1>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Scanner</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Evaluate your website's accessibility in seconds. View a history of all accessibility scans. Download your reports.
            </p>
          </div>

          {/* Domain Input and Scan Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter your domain"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
                disabled={isScanning}
              />
            </div>
            <button
              onClick={handleStartScan}
              disabled={isScanning || !domain.trim()}
              className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 text-sm whitespace-nowrap"
            >
              {isScanning ? 'Scanning...' : 'Free Scan'}
            </button>
          </div>

          {/* Scanning Status */}
          {isScanning && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-900">
                  Scanning {domain}... This may take a few moments.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Comprehensive Analysis */}
          <div 
            className="rounded-lg p-6 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(99.22deg, #1A4F69 -1.44%, #164861 50.95%, #2779A0 103.34%)'
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* SVG placeholder - you can replace this with your SVG */}
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">Comprehensive Analysis</h3>
                <p className="text-white text-opacity-90 text-sm leading-relaxed">
                  Our scanner checks for WCAG 2.1 compliance across your entire site.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Reports */}
          <div 
            className="rounded-lg p-6 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(99.22deg, #1A4F69 -1.44%, #164861 50.95%, #2779A0 103.34%)'
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* SVG placeholder - you can replace this with your SVG */}
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">Detailed Reports</h3>
                <p className="text-white text-opacity-90 text-sm leading-relaxed">
                  Receive a full breakdown of accessibility issues and how to fix them.
                </p>
              </div>
            </div>
          </div>

          {/* Improve User Experience */}
          <div 
            className="rounded-lg p-6 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(99.22deg, #1A4F69 -1.44%, #164861 50.95%, #2779A0 103.34%)'
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* SVG placeholder - you can replace this with your SVG */}
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">Improve User Experience</h3>
                <p className="text-white text-opacity-90 text-sm leading-relaxed">
                  Make your website accessible to all users, regardless of abilities.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Issues Identified Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">Issues identified</h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MdSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Issue Cards or Empty State */}
          {hasScanned ? (
            <div className="space-y-4">
              {filteredIssues.map((category) => (
                <IssueCard
                  key={category.category}
                  category={category}
                  isExpanded={expandedCards[category.category] || false}
                  onToggle={() => toggleCardExpansion(category.category)}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 mb-6">
                {/* Empty state illustration matching the design */}
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Document base */}
                    <rect x="20" y="16" width="48" height="64" rx="4" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1"/>
                    {/* Header bar */}
                    <rect x="24" y="20" width="40" height="6" rx="3" fill="#2563EB"/>
                    {/* Content lines */}
                    <rect x="24" y="32" width="32" height="2" rx="1" fill="#E5E7EB"/>
                    <rect x="24" y="38" width="28" height="2" rx="1" fill="#E5E7EB"/>
                    <rect x="24" y="44" width="30" height="2" rx="1" fill="#E5E7EB"/>
                    <rect x="24" y="50" width="26" height="2" rx="1" fill="#E5E7EB"/>
                    <rect x="24" y="56" width="32" height="2" rx="1" fill="#E5E7EB"/>
                    <rect x="24" y="62" width="24" height="2" rx="1" fill="#E5E7EB"/>
                    {/* Accessibility icon circle */}
                    <circle cx="76" cy="68" r="12" fill="#2563EB"/>
                    <path d="M76 62c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 4c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2v-4c0-1.1-.9-2-2-2z" fill="white"/>
                  </svg>
                </div>
              </div>
              <p className="text-gray-500 text-base">You currently have no issues identified</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomationScan; 