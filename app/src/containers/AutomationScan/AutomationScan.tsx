import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GetUserSitesDocument } from '@/generated/graphql';
import { MdSearch, MdExpandMore, MdExpandLess, MdBugReport, MdCheckCircle, MdWarning } from 'react-icons/md';
import { FaKeyboard, FaMapSigns, FaHeading, FaLink, FaImage, FaLanguage, FaVideo, FaPlay, FaEye, FaBrain } from 'react-icons/fa';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { motion } from 'framer-motion';

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
  onViewDetails: (category: any) => void;
  index: number;
}

const IssueCard: React.FC<IssueCardProps> = ({ category, onViewDetails, index }) => {
  const totalIssues = category.subcategories.reduce((sum: number, sub: any) => sum + sub.total_fixes, 0);
  const hasIssues = totalIssues > 0;

  const getStatusColor = () => {
    if (!hasIssues) return 'text-green-600';
    if (totalIssues <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = () => {
    if (!hasIssues) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
          ✓ Pass
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
        {totalIssues} Issues
      </span>
    );
  };

  return (
    <motion.div 
      initial={{ 
        y: -800, 
        opacity: 0, 
        scale: 0.8,
        rotateX: -15 
      }}
      animate={{ 
        y: 0, 
        opacity: 1, 
        scale: 1,
        rotateX: 0 
      }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 60,
        delay: index * 0.15,
        duration: 1.2
      }}
      className="relative h-full rounded-lg border border-gray-300 p-2 transition-all duration-300 ease-out"
      style={{ transformStyle: "preserve-3d" }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
    >
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={3}
      />
      <div className="relative bg-gray-100 rounded-lg p-6 h-full hover:shadow-sm transition-shadow duration-200">
        {/* Icon and Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <category.icon className="w-6 h-6 text-gray-600" />
          </div>
          {getStatusBadge()}
        </div>

        {/* Category Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.category}</h3>
        
        {/* Description */}
        <p className="text-sm text-gray-600 mb-4">
          {category.subcategories.length} accessibility checks performed
        </p>

        {/* Issue Count */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            <span className={getStatusColor()}>{totalIssues}</span>
            <span className="text-sm font-normal text-gray-500 ml-1">
              {totalIssues === 1 ? 'issue' : 'issues'}
            </span>
          </div>
          
          {hasIssues && (
            <button
              onClick={() => onViewDetails(category)}
              className="px-3 py-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors duration-200"
            >
              <span className="hover:scale-110 transition-transform duration-200 ease-out transform inline-block">
                View Details →
              </span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AutomationScan: React.FC = () => {
  const { t } = useTranslation();
  const [domain, setDomain] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasScanned, setHasScanned] = useState(false); // Will be set to true after scanning completes
  const [scanKey, setScanKey] = useState(0); // Key to trigger re-animation on new scans
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [apiResults, setApiResults] = useState<any>(null);

  // Fetch user sites for domain selector (optional - handle errors gracefully)
  const { data: sitesData, loading: sitesLoading, error: sitesError } = useQuery(GetUserSitesDocument, {
    errorPolicy: 'ignore', // Don't throw errors, just return undefined data
    notifyOnNetworkStatusChange: false
  });

  // Log any GraphQL errors for debugging
  if (sitesError) {
    console.warn('Sites query failed (non-critical):', sitesError);
  }

  const handleStartScan = async () => {
    if (!domain.trim()) {
      alert('Please enter a domain to scan');
      return;
    }

    // Reset animation state for new scan
    setHasScanned(false);
    setIsScanning(true);
    setLoadingMessage('Running tests...');
    setApiResults(null);

    try {
      console.log(`Starting scan for domain: ${domain}`);
      
      // Step 1: Start the analysis
      // Ensure URL has protocol
      const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      console.log('Making API request to:', 'https://h80wkk4o40c4cs48cccsg0wk.webability.io/analyze');
      console.log('Request payload:', { url: fullUrl });
      
      const analyzeResponse = await fetch('https://h80wkk4o40c4cs48cccsg0wk.webability.io/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: fullUrl,
           options: {
            detect_custom_widget_labels: true
          }
          //  { headless: false,
          //   force_local: true,
          //   debug_mode: true,
          //   debug_save_screenshots: true,
            
          //   run_tab_navigation: true,
          //   run_on_input: true,
          //   run_on_focus: true,
          //   detect_missing_labels: true,
          //   detect_missing_headings: true,
          //   detect_landmark_roles: true,
          //   detect_main_landmark_content: true,
          //   detect_heading_function: true,
          //   detect_character_shortcuts: true,
          //   detect_keystroke_timing: true,
          //   detect_focus_order: true,
          //   detect_visible_focus: true,
          //   detect_main_repeating_content: true,
          //   detect_missing_headings_visual: true,
          //   detect_heading_level_inconsistency: true,
          //   detect_language_violations: true,
          //   detect_missing_captions: true,
          //   detect_missing_audio_descriptions: true,
          //   detect_missing_audio_transcripts: true,
          //   detect_link_function_violations: true,
          //   detect_redundant_entry: true,
          //   detect_authentication_cognitive: true,
          //   detect_css_positioning: true,
          //   detect_layout_tables: true,
          //   detect_page_title_violations: true,
          //   detect_frame_title_violations: true,
          //   detect_multiple_ways_violations: true,
          //   detect_image_function_violations: true,
          //   detect_text_alternative_violations: true,
          //   detect_images_of_text_violations: true,
          //   detect_captcha_violations: true,
          //   detect_ui_component_contrast: true,
          //   detect_ui_component_state_changes: true,
          //   detect_css_content_violations: true,
          //   detect_table_semantics_violations: true,
          //   detect_table_headers_violations: true,
          //   detect_semantic_markup_violations: true,
          //   detect_native_widget_labels: true,
          //   detect_expected_input_clarity: true,
          //   detect_custom_widget_labels: true,
          //   detect_custom_widget_expected_input: true,
          //   detect_autocomplete_violations: true,
          //   detect_color_meaning_violations: true,
          //   detect_contrast_ratio_violations: true,
          //   detect_aria_widget_role_violations: true,
          //   detect_sensory_instructions: true,
          //   detect_flashing_content: true,
          //   detect_text_spacing_violations: true,
          //   detect_reflow_violations: true,
          //   detect_orientation_violations: true,
          //   detect_resize_text_violations: true,
          //   detect_bypass_mechanisms: true,
          //   detect_consistent_navigation: true,
          //   detect_consistent_identification: true,
          //   detect_consistent_help: true,
          //   detect_high_contrast_mode: true,
            
          //   use_llm_for_widget_labels: true,
          //   use_llm_for_expected_input: true,
          //   use_llm_for_custom_labels: true,
          //   use_llm_for_custom_expected_input: true,
          //   use_llm_for_color_analysis: true,
          //   use_llm_for_contrast_analysis: true,
          //   use_llm_for_widget_role_analysis: true,
          //   use_llm_for_instruction_analysis: true,
          //   use_llm_for_text_spacing: true,
          //   use_llm_for_orientation: true,
          //   use_llm_for_resize_text: true
          // }
        })
      });

      console.log('Response status:', analyzeResponse.status);
      console.log('Response headers:', Object.fromEntries(analyzeResponse.headers.entries()));

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Analysis request failed: ${analyzeResponse.status} ${analyzeResponse.statusText}. Response: ${errorText}`);
      }

      const analyzeData = await analyzeResponse.json();
      console.log('Analysis response:', analyzeData);
      const taskId = analyzeData.task_id;

      if (!taskId) {
        throw new Error('No task ID received from analysis endpoint');
      }

      console.log(`Task ID received: ${taskId}`);
      setLoadingMessage('Getting responses...');

      // Step 2: Poll for results every 5 seconds
      const pollForResults = async (): Promise<any> => {
        while (true) {
          try {
            const taskResponse = await fetch(`https://h80wkk4o40c4cs48cccsg0wk.webability.io/task/${taskId}`);
            
            if (!taskResponse.ok) {
              throw new Error(`Task status request failed: ${taskResponse.statusText}`);
            }

            const taskData = await taskResponse.json();
            console.log('Polling response:', taskData);
            
            // Check if task is completed based on API documentation
            if (taskData.status === 'completed') {
              return taskData;
            } else if (taskData.status === 'failed') {
              throw new Error(taskData.error || 'Task failed');
            }
            
            // Show progress if available
            if (taskData.progress) {
              setLoadingMessage(taskData.progress);
            }
            
            // Wait 5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
          } catch (error) {
            console.error('Error polling for results:', error);
            // Continue polling even if one request fails
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      };

      // Get the final results
      const finalResults = await pollForResults();
      console.log('Final results:', finalResults);
      
      // Store API results and trigger animation
      setApiResults(finalResults);
      setScanKey(prev => prev + 1);
      setHasScanned(true);
      
    } catch (error) {
      console.error('Scan failed:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check for common network issues
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Network error: Unable to connect to the API. Please check your internet connection and try again.';
      } else if (errorMessage.includes('CORS')) {
        errorMessage = 'CORS error: The API server may not be configured to accept requests from this domain.';
      }
      
      alert(`Scan failed: ${errorMessage}`);
    } finally {
      setIsScanning(false);
      setLoadingMessage('');
    }
  };

  const handleViewDetails = (category: any) => {
    console.log('Opening modal for category:', category);
    console.log('Category subcategories:', category.subcategories);
    setSelectedCategory(category);
    setShowAnalysis(true);
  };

  // Function to parse API results and convert to card format
  const parseApiResults = (apiData: any) => {
    // Handle polling response format
    const actualResults = apiData.result || apiData;
    
    if (!actualResults || !actualResults.auto_fixes) return [];

    const autoFixes = actualResults.auto_fixes;
    const summary = actualResults.summary;
    
    // Group fixes by category
    const categoryMap: { [key: string]: any } = {};

    // Category mapping based on API documentation
    const categoryConfig = {
      'keyboard_navigation': { name: 'Keyboard', icon: FaKeyboard, color: 'blue' },
      'forms': { name: 'Forms', icon: FaKeyboard, color: 'blue' },
      'visual_design': { name: 'Visual', icon: FaEye, color: 'teal' },
      'images_media': { name: 'Images', icon: FaImage, color: 'pink' },
      'aria_widgets': { name: 'ARIA Widgets', icon: FaBrain, color: 'purple' },
      'page_structure': { name: 'Headings', icon: FaHeading, color: 'purple' },
      'navigation': { name: 'Navigation', icon: FaMapSigns, color: 'green' },
      'internationalization': { name: 'Language', icon: FaLanguage, color: 'indigo' },
      'multimedia': { name: 'Media', icon: FaVideo, color: 'red' },
      'authentication': { name: 'Authentication', icon: FaBrain, color: 'yellow' },
      'responsive_design': { name: 'Responsive', icon: FaEye, color: 'teal' }
    };

    // Group auto_fixes by category and issue_type
    autoFixes.forEach((fix: any) => {
      const category = fix.category || 'other';
      const issueType = fix.issue_type || 'unknown';
      
      const categoryInfo = categoryConfig[category] || { 
        name: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
        icon: FaBrain, 
        color: 'gray' 
      };

      if (!categoryMap[category]) {
        categoryMap[category] = {
          category: categoryInfo.name,
          subcategories: {},
          icon: categoryInfo.icon,
          color: categoryInfo.color
        };
      }

      if (!categoryMap[category].subcategories[issueType]) {
        categoryMap[category].subcategories[issueType] = {
          id: issueType,
          name: issueType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          status: 'error',
          total_fixes: 0,
          issues: []
        };
      }

      categoryMap[category].subcategories[issueType].total_fixes++;
      categoryMap[category].subcategories[issueType].issues.push(fix);
    });

    // Convert to array format expected by the UI
    const categories = Object.values(categoryMap).map((category: any) => ({
      ...category,
      subcategories: Object.values(category.subcategories)
    })).filter((category: any) => category.subcategories.length > 0);

    return categories;
  };

  // Use API results if available, otherwise fall back to mock data
  const issuesData = apiResults ? parseApiResults(apiResults) : mockIssuesData;
  
  const filteredIssues = issuesData.filter((category: any) =>
    category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.subcategories.some((sub: any) => 
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
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {isScanning ? (loadingMessage || 'Scanning...') : 'Free Scan'}
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
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.75 26.25L9.75 21.75M17.25 26.25L17.25 12.75M24.75 26.25V20.25" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M32.25 8.25C32.25 10.7353 30.2353 12.75 27.75 12.75C25.2647 12.75 23.25 10.7353 23.25 8.25C23.25 5.76472 25.2647 3.75 27.75 3.75C30.2353 3.75 32.25 5.76472 32.25 8.25Z" stroke="white" strokeWidth="2"/>
                    <path d="M32.2433 16.5C32.2433 16.5 32.25 17.0093 32.25 18C32.25 24.7176 32.25 28.0763 30.1631 30.1632C28.0763 32.25 24.7175 32.25 18 32.25C11.2825 32.25 7.92373 32.25 5.83686 30.1632C3.75 28.0763 3.75 24.7176 3.75 18C3.75 11.2825 3.75 7.92377 5.83686 5.83691C7.92373 3.75005 11.2825 3.75005 18 3.75005L19.5 3.75" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 53 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.917 23C13.917 17.3431 13.917 14.5147 15.7842 12.7574C17.6514 11 20.6566 11 26.667 11H27.8261C32.7179 11 35.1638 11 36.8624 12.1968C37.3491 12.5396 37.7811 12.9463 38.1454 13.4043C39.417 15.003 39.417 17.305 39.417 21.9091V25.7273C39.417 30.172 39.417 32.3944 38.7136 34.1694C37.5828 37.0229 35.1913 39.2737 32.1595 40.338C30.2736 41 27.9123 41 23.1897 41C20.4911 41 19.1418 41 18.0642 40.6217C16.3317 40.0135 14.9651 38.7274 14.3189 37.0968C13.917 36.0825 13.917 34.8126 13.917 32.2727V23Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M39.417 26C39.417 28.7614 37.1784 31 34.417 31C33.4183 31 32.2409 30.825 31.2699 31.0852C30.4072 31.3164 29.7333 31.9902 29.5022 32.853C29.242 33.8239 29.417 35.0013 29.417 36C29.417 38.7614 27.1784 41 24.417 41" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.667 18.5H31.167" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.667 24.5H25.167" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 53 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="9.33301" y="9" width="34" height="34" rx="17" stroke="white" strokeWidth="2"/>
                    <path d="M26.3333 17.5479C25.5508 17.5479 24.8811 17.2722 24.3244 16.721C23.7676 16.1697 23.4887 15.5062 23.4878 14.7305C23.4868 13.9548 23.7657 13.2917 24.3244 12.7414C24.883 12.1911 25.5527 11.915 26.3333 11.9131C27.1139 11.9112 27.784 12.1873 28.3436 12.7414C28.9032 13.2955 29.1816 13.9585 29.1787 14.7305C29.1759 15.5025 28.8975 16.1659 28.3436 16.721C27.7897 17.276 27.1196 17.5516 26.3333 17.5479ZM23.4129 40.087C22.6685 40.087 22.065 39.4863 22.065 38.7454V23.009C22.065 22.311 21.5272 21.7313 20.8298 21.6579C19.8071 21.5503 18.7724 21.4129 17.7257 21.2457C16.7235 21.0857 15.7544 20.8983 14.8183 20.6837C14.1001 20.5191 13.6729 19.7938 13.8525 19.0824L13.9063 18.8693C14.0897 18.1428 14.8348 17.7089 15.5688 17.8743C17.0247 18.2025 18.5499 18.4519 20.1443 18.6227C22.231 18.8462 24.294 18.9575 26.3333 18.9566C28.3725 18.9556 30.4355 18.8439 32.5222 18.6213C34.1166 18.4512 35.6418 18.2022 37.0977 17.8743C37.8317 17.7089 38.5768 18.1428 38.7602 18.8693L38.814 19.0824C38.9937 19.7938 38.5664 20.5191 37.8482 20.6837C36.9122 20.8983 35.943 21.0857 34.9409 21.2457C33.8941 21.4129 32.8594 21.5503 31.8367 21.6579C31.1394 21.7313 30.6015 22.311 30.6015 23.009V38.7454C30.6015 39.4863 29.998 40.087 29.2536 40.087H29.1039C28.3595 40.087 27.756 39.4863 27.756 38.7454V32.9764C27.756 32.2355 27.1525 31.6348 26.4081 31.6348H26.2584C25.514 31.6348 24.9105 32.2355 24.9105 32.9764V38.7454C24.9105 39.4863 24.3071 40.087 23.5627 40.087H23.4129Z" fill="white"/>
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
            <div key={scanKey} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIssues.map((category, index) => (
                <IssueCard
                  key={`${scanKey}-${category.category}`}
                  category={category}
                  onViewDetails={handleViewDetails}
                  index={index}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16">
              <div className="mx-auto mb-6 flex justify-center">
                <svg width="130" height="182" viewBox="0 0 130 182" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="1" width="129" height="179" rx="7.5" fill="#F9FBFB" stroke="#A5BACC"/>
                  <rect x="16" y="12.5" width="98" height="28" rx="4" fill="#559EC1"/>
                  <rect x="24" y="23.5" width="40" height="6" rx="3" fill="white"/>
                  <rect x="16.5" y="53" width="42" height="31" rx="3.5" fill="#F9FBFB" stroke="#A5BACC"/>
                  <rect x="16.5" y="95" width="42" height="31" rx="3.5" fill="#F9FBFB" stroke="#A5BACC"/>
                  <rect x="16.5" y="137" width="42" height="31" rx="3.5" fill="#F9FBFB" stroke="#A5BACC"/>
                  <rect x="71.5" y="53" width="42" height="31" rx="3.5" fill="#F9FBFB" stroke="#A5BACC"/>
                  <rect x="71.5" y="95" width="42" height="31" rx="3.5" fill="#F9FBFB" stroke="#A5BACC"/>
                  <rect x="25.5" y="65.5" width="24" height="6" rx="3" fill="#C7D0D3"/>
                  <rect x="25.5" y="107.5" width="24" height="6" rx="3" fill="#C7D0D3"/>
                  <rect x="25.5" y="149.5" width="24" height="6" rx="3" fill="#C7D0D3"/>
                  <rect x="80.5" y="65.5" width="24" height="6" rx="3" fill="#C7D0D3"/>
                  <rect x="80.5" y="107.5" width="24" height="6" rx="3" fill="#C7D0D3"/>
                  <g filter="url(#filter0_d_4084_5597)">
                    <g clipPath="url(#clip0_4084_5597)">
                      <rect x="68.5" y="130.5" width="43" height="43" rx="21.5" fill="#559EC1"/>
                      <path d="M90 145.25C89.3751 145.25 88.8403 145.03 88.3957 144.59C87.951 144.149 87.7283 143.62 87.7276 143C87.7268 142.381 87.9495 141.851 88.3957 141.412C88.8418 140.972 89.3766 140.752 90 140.75C90.6234 140.749 91.1586 140.969 91.6055 141.412C92.0524 141.854 92.2747 142.384 92.2724 143C92.2702 143.617 92.0478 144.146 91.6055 144.59C91.1631 145.033 90.6279 145.253 90 145.25ZM87.6678 163.25C87.0733 163.25 86.5913 162.77 86.5913 162.179V149.611C86.5913 149.054 86.1618 148.591 85.6049 148.532C84.7881 148.446 83.9618 148.337 83.1259 148.203C82.3255 148.075 81.5516 147.926 80.804 147.754C80.2305 147.623 79.8893 147.044 80.0327 146.476L80.0757 146.305C80.2222 145.725 80.8172 145.379 81.4034 145.511C82.5661 145.773 83.7841 145.972 85.0575 146.108C86.7239 146.287 88.3714 146.376 90 146.375C91.6286 146.374 93.2761 146.285 94.9425 146.107C96.2159 145.971 97.4339 145.773 98.5966 145.511C99.1828 145.379 99.7778 145.725 99.9243 146.305L99.9673 146.476C100.111 147.044 99.7695 147.623 99.196 147.754C98.4484 147.926 97.6745 148.075 96.8741 148.203C96.0382 148.337 95.2119 148.446 94.3951 148.532C93.8382 148.591 93.4087 149.054 93.4087 149.611V162.179C93.4087 162.77 92.9267 163.25 92.3322 163.25H92.2126C91.6181 163.25 91.1362 162.77 91.1362 162.179V157.571C91.1362 156.98 90.6543 156.5 90.0598 156.5H89.9402C89.3457 156.5 88.8638 156.98 88.8638 157.571V162.179C88.8638 162.77 88.3819 163.25 87.7874 163.25H87.6678Z" fill="white"/>
                      <circle cx="89" cy="151" r="30" stroke="#F9FBFB"/>
                    </g>
                  </g>
                  <defs>
                    <filter id="filter0_d_4084_5597" x="64.5" y="130.5" width="51" height="51" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                      <feOffset dy="4"/>
                      <feGaussianBlur stdDeviation="2"/>
                      <feComposite in2="hardAlpha" operator="out"/>
                      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
                      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_4084_5597"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_4084_5597" result="shape"/>
                    </filter>
                    <clipPath id="clip0_4084_5597">
                      <rect x="68.5" y="130.5" width="43" height="43" rx="21.5" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <p className="text-gray-500 text-base">You currently have no previous scan histories</p>
            </div>
          )}
        </div>

        {/* Analysis Modal */}
        {showAnalysis && selectedCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedCategory.category} Issues
                  </h3>
                  <button
                    onClick={() => setShowAnalysis(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-6">
                  {selectedCategory.subcategories.map((subcategory: any) => (
                    <div key={subcategory.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          {subcategory.id} {subcategory.name}
                        </h4>
                        {subcategory.total_fixes > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                            {subcategory.total_fixes} issues
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                            ✓ Pass
                          </span>
                        )}
                      </div>

                      {subcategory.issues && subcategory.issues.length > 0 ? (
                        <div className="space-y-3">
                          {subcategory.issues.map((fix: any, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-start space-x-3">
                                <MdBugReport className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm">
                                    {fix.issue_type || 'Unknown Issue'}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {fix.description || 'No description available'}
                                  </p>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-xs text-gray-500">
                                      <strong>Element:</strong> {fix.selector || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      <strong>Action Required:</strong> {fix.action || 'Review'}
                                    </p>
                                    {fix.wcag_criterion && (
                                      <p className="text-xs text-gray-500">
                                        <strong>WCAG:</strong> {fix.wcag_criterion}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <MdCheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No issues found for this test</p>
                        </div>
                      )}

                      {subcategory.timestamp && (
                        <p className="text-xs text-gray-500 mt-3">
                          Tested: {new Date(subcategory.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
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
