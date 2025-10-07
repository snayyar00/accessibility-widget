import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GetUserSitesDocument } from '@/generated/graphql';
import { MdSearch, MdExpandMore, MdExpandLess, MdBugReport, MdCheckCircle, MdWarning } from 'react-icons/md';
import { FaKeyboard, FaMapSigns, FaHeading, FaLink, FaImage, FaLanguage, FaVideo, FaPlay, FaEye, FaBrain } from 'react-icons/fa';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { getAuthenticationCookie } from '@/utils/cookie';

// Global scan tracker that persists across component unmounts
let activeScanPromise: Promise<any> | null = null;
let activeScanController: AbortController | null = null;

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
  onViewDetails: (category: any, event: React.MouseEvent) => void;
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
        y: 50, 
        opacity: 0, 
        scale: 0.9
      }}
      animate={{ 
        y: 0, 
        opacity: 1, 
        scale: 1,
        transition: {
          type: "spring",
          damping: 20,
          stiffness: 300,
          delay: index * 0.1,
          duration: 0.4
        }
      }}
      exit={{ 
        y: -50, 
        opacity: 0, 
        scale: 0.9,
        transition: {
          type: "spring",
          damping: 25,
          stiffness: 400,
          duration: 0.2,
          delay: 0 // Explicitly no delay for exit
        }
      }}
      className="relative h-full rounded-lg border border-gray-400 p-2 transition-all duration-300 ease-out shadow-lg"
      whileHover={{ 
        scale: 1.02,
        y: -5,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        transition: { type: "spring", stiffness: 400, damping: 25, duration: 0.2 }
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
      <div className={`relative rounded-lg p-6 h-full hover:shadow-sm transition-shadow duration-200 ${
        hasIssues ? 'bg-gray-100' : 'bg-green-50'
      }`}>
        {/* Icon and Title */}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
            category.color === 'blue' ? 'bg-blue-100' :
            category.color === 'green' ? 'bg-green-100' :
            category.color === 'orange' ? 'bg-orange-100' :
            category.color === 'purple' ? 'bg-purple-100' :
            category.color === 'red' ? 'bg-red-100' :
            category.color === 'teal' ? 'bg-teal-100' :
            'bg-gray-100'
          }`}>
            <category.icon className={`w-6 h-6 ${
              category.color === 'blue' ? 'text-blue-600' :
              category.color === 'green' ? 'text-green-600' :
              category.color === 'orange' ? 'text-orange-600' :
              category.color === 'purple' ? 'text-purple-600' :
              category.color === 'red' ? 'text-red-600' :
              category.color === 'teal' ? 'text-teal-600' :
              'text-gray-600'
            }`} />
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
              onClick={(event) => onViewDetails(category, event)}
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
  
  // Helper function to get cached scan data from localStorage (memoized to run only once)
  const getCachedScanData = React.useMemo(() => {
    try {
      const cached = localStorage.getItem('automation_scan_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 1 hour old
        if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          console.log('✅ Restoring cached scan data from localStorage:', {
            domain: parsed.domain,
            hasResults: !!parsed.apiResults,
            cacheAge: Math.floor((Date.now() - parsed.timestamp) / 1000) + 's'
          });
          return parsed;
        }
        // Remove expired cache
        console.log('⏰ Cache expired, removing...');
        localStorage.removeItem('automation_scan_cache');
      } else {
        console.log('ℹ️ No cached scan data found');
      }
    } catch (error) {
      console.error('❌ Error reading scan cache:', error);
    }
    return null;
  }, []); // Empty deps = runs only once on mount

  // Initialize state with cached data if available
  const cachedData = getCachedScanData;
  
  const [domain, setDomain] = useState(cachedData?.domain || '');
  const [isScanning, setIsScanning] = useState(cachedData?.isScanning || false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasScanned, setHasScanned] = useState(cachedData?.hasScanned || false);
  const [scanKey, setScanKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(cachedData?.loadingMessage || '');
  const [apiResults, setApiResults] = useState<any>(cachedData?.apiResults || null);
  const [scanCompleted, setScanCompleted] = useState(cachedData?.scanCompleted || false);
  const [aiSummary, setAiSummary] = useState<string>(cachedData?.aiSummary || '');
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [waitingForLoader, setWaitingForLoader] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [useCustomTests, setUseCustomTests] = useState(false);
  const [expandedSubcategories, setExpandedSubcategories] = useState<{ [key: string]: boolean }>({});
  const [selectedTests, setSelectedTests] = useState({
    // Basic Configuration
    headless: true,
    force_local: false,
    debug_mode: false,
    debug_save_screenshots: false,
    automated_checks: true,
    
    // Navigation & Interaction Tests
    run_tab_navigation: true,
    run_on_input: false,
    run_on_focus: false,
    
    // Content & Structure Tests
    detect_missing_labels: true,
    detect_missing_headings: true,
    detect_landmark_roles: true,
    detect_main_landmark_content: false,
    detect_heading_function: false,
    detect_character_shortcuts: false,
    detect_keystroke_timing: false,
    detect_focus_order: false,
    detect_visible_focus: false,
    detect_main_repeating_content: false,
    detect_missing_headings_visual: false,
    detect_heading_level_inconsistency: false,
    detect_language_violations: false,
    
    // Media & Content Tests
    detect_missing_captions: false,
    detect_missing_audio_descriptions: false,
    detect_missing_audio_transcripts: false,
    detect_link_function_violations: false,
    detect_redundant_entry: false,
    detect_authentication_cognitive: false,
    detect_css_positioning: false,
    detect_layout_tables: false,
    detect_page_title_violations: false,
    detect_frame_title_violations: false,
    detect_multiple_ways_violations: false,
    
    // Images & Visual Tests
    detect_image_function_violations: false,
    detect_text_alternative_violations: false,
    detect_images_of_text_violations: false,
    detect_captcha_violations: false,
    detect_ui_component_contrast: false,
    detect_ui_component_state_changes: false,
    detect_css_content_violations: false,
    
    // Tables & Semantics
    detect_table_semantics_violations: false,
    detect_table_headers_violations: false,
    detect_semantic_markup_violations: false,
    
    // Widget & Form Tests
    detect_native_widget_labels: false,
    detect_expected_input_clarity: false,
    detect_custom_widget_labels: true,
    detect_custom_widget_expected_input: false,
    detect_autocomplete_violations: false,
    
    // Color & Visual Design
    detect_color_meaning_violations: false,
    detect_contrast_ratio_violations: true,
    detect_aria_widget_role_violations: false,
    detect_sensory_instructions: false,
    detect_flashing_content: false,
    detect_text_spacing_violations: false,
    detect_reflow_violations: false,
    detect_orientation_violations: false,
    detect_resize_text_violations: false,
    
    // Navigation & Consistency
    detect_bypass_mechanisms: false,
    detect_consistent_navigation: false,
    detect_consistent_identification: false,
    detect_consistent_help: false,
    detect_high_contrast_mode: false,
    
    // AI-Enhanced Analysis
    use_llm_for_widget_labels: false,
    use_llm_for_expected_input: false,
    use_llm_for_custom_labels: false,
    use_llm_for_custom_expected_input: false,
    use_llm_for_color_analysis: false,
    use_llm_for_contrast_analysis: false,
    use_llm_for_widget_role_analysis: false,
    use_llm_for_instruction_analysis: false,
    use_llm_for_text_spacing: false,
    use_llm_for_orientation: false,
    use_llm_for_resize_text: false
  });

  // Default configuration with all tests enabled
  const getAllTestsConfig = () => ({
    // Basic Configuration
    headless: true,
    force_local: false,
    debug_mode: false,
    debug_save_screenshots: false,
    automated_checks: true,
    
    // Navigation & Interaction Tests
    run_tab_navigation: true,
    run_on_input: true,
    run_on_focus: true,
    
    // Content & Structure Tests
    detect_missing_labels: true,
    detect_missing_headings: true,
    detect_landmark_roles: true,
    detect_main_landmark_content: true,
    detect_heading_function: true,
    detect_character_shortcuts: true,
    detect_keystroke_timing: true,
    detect_focus_order: true,
    detect_visible_focus: true,
    detect_main_repeating_content: true,
    detect_missing_headings_visual: true,
    detect_heading_level_inconsistency: true,
    detect_language_violations: true,
    
    // Media & Content Tests
    detect_missing_captions: true,
    detect_missing_audio_descriptions: true,
    detect_missing_audio_transcripts: true,
    detect_link_function_violations: true,
    detect_redundant_entry: true,
    detect_authentication_cognitive: true,
    detect_css_positioning: true,
    detect_layout_tables: true,
    detect_page_title_violations: true,
    detect_frame_title_violations: true,
    detect_multiple_ways_violations: true,
    
    // Images & Visual Tests
    detect_image_function_violations: true,
    detect_text_alternative_violations: true,
    detect_images_of_text_violations: true,
    detect_captcha_violations: true,
    detect_ui_component_contrast: true,
    detect_ui_component_state_changes: true,
    detect_css_content_violations: true,
    
    // Tables & Semantics
    detect_table_semantics_violations: true,
    detect_table_headers_violations: true,
    detect_semantic_markup_violations: true,
    
    // Widget & Form Tests
    detect_native_widget_labels: true,
    detect_expected_input_clarity: true,
    detect_custom_widget_labels: true,
    detect_custom_widget_expected_input: true,
    detect_autocomplete_violations: true,
    
    // Color & Visual Design
    detect_color_meaning_violations: true,
    detect_contrast_ratio_violations: true,
    detect_aria_widget_role_violations: true,
    detect_sensory_instructions: true,
    detect_flashing_content: true,
    detect_text_spacing_violations: true,
    detect_reflow_violations: true,
    detect_orientation_violations: true,
    detect_resize_text_violations: true,
    
    // Navigation & Consistency
    detect_bypass_mechanisms: true,
    detect_consistent_navigation: true,
    detect_consistent_identification: true,
    detect_consistent_help: true,
    detect_high_contrast_mode: true,
    
    // AI-Enhanced Analysis
    use_llm_for_widget_labels: true,
    use_llm_for_expected_input: true,
    use_llm_for_custom_labels: true,
    use_llm_for_custom_expected_input: true,
    use_llm_for_color_analysis: true,
    use_llm_for_contrast_analysis: true,
    use_llm_for_widget_role_analysis: true,
    use_llm_for_instruction_analysis: true,
    use_llm_for_text_spacing: true,
    use_llm_for_orientation: true,
    use_llm_for_resize_text: true
  });

  // Helper functions for managing test selections
  const handleTestToggle = (testKey: string) => {
    setSelectedTests(prev => ({
      ...prev,
      [testKey]: !prev[testKey as keyof typeof prev]
    }));
  };

  const selectAllTests = () => {
    // Configuration fields that should not be affected by "Select All"
    const configFields = ['headless', 'force_local', 'debug_mode', 'debug_save_screenshots'];
    
    const allTrue = Object.keys(selectedTests).reduce((acc, key) => {
      // Keep configuration fields at their current values
      if (configFields.includes(key)) {
        acc[key] = selectedTests[key as keyof typeof selectedTests];
      } else {
        acc[key] = true;
      }
      return acc;
    }, {} as any);
    setSelectedTests(allTrue);
  };

  const selectNoneTests = () => {
    // Configuration fields that should not be affected by "Select None"
    const configFields = ['headless', 'force_local', 'debug_mode', 'debug_save_screenshots'];
    
    const allFalse = Object.keys(selectedTests).reduce((acc, key) => {
      // Keep configuration fields at their current values
      if (configFields.includes(key)) {
        acc[key] = selectedTests[key as keyof typeof selectedTests];
      } else {
        acc[key] = false;
      }
      return acc;
    }, {} as any);
    setSelectedTests(allFalse);
  };

  const handleCustomTestsToggle = () => {
    setUseCustomTests(!useCustomTests);
  };


  // Check if we have authentication token before making the query
  const hasAuthToken = React.useMemo(() => {
    // Check cookie for auth token (this is where the app stores authentication)
    const token = getAuthenticationCookie();
    return !!token;
  }, []);

  // Fetch user sites for domain selector (optional - only if authenticated)
  const { data: sitesData, loading: sitesLoading, error: sitesError } = useQuery(GetUserSitesDocument, {
    errorPolicy: 'all', // Return both data and errors
    notifyOnNetworkStatusChange: false,
    skip: !hasAuthToken, // Skip query if not authenticated to avoid unnecessary 500 errors
    fetchPolicy: 'cache-first', // Use cached data if available to reduce server load
  });

  // Silently handle any errors - this feature is optional
  React.useEffect(() => {
    if (sitesError && hasAuthToken) {
      // Only log in development if we expected the query to work (user is authenticated)
      if (process.env.NODE_ENV === 'development') {
        console.debug('Unable to fetch user sites (optional feature):', sitesError.message);
      }
    }
  }, [sitesError, hasAuthToken]);

  // Safety cleanup: ensure loader doesn't get stuck
  React.useEffect(() => {
    if (scanCompleted && apiResults && !waitingForLoader) {
      // If scan is completed and we have results, but loader is still showing
      const timeout = setTimeout(() => {
        if (isScanning && scanCompleted) {
          console.warn('Loader stuck, forcing close...');
          setIsScanning(false);
          setLoadingMessage('');
          setHasScanned(true);
        }
      }, 2000); // Give it 2 seconds grace period
      
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [scanCompleted, apiResults, waitingForLoader, isScanning]);

  // Save scan results AND scanning state to localStorage
  React.useEffect(() => {
    try {
      const cacheData = {
        domain,
        hasScanned: hasScanned || (apiResults && scanCompleted),
        apiResults,
        scanCompleted,
        aiSummary,
        isScanning: isScanning && !scanCompleted, // Don't save isScanning if scan is completed
        loadingMessage: scanCompleted ? '' : loadingMessage, // Clear message if completed
        timestamp: Date.now(),
      };
      localStorage.setItem('automation_scan_cache', JSON.stringify(cacheData));
      
      if (apiResults && scanCompleted) {
        console.log('✅ Scan results cached to localStorage', { domain, resultsCount: apiResults?.results?.length || 0 });
      } else if (isScanning) {
        console.log('💾 Saving scanning state to localStorage');
      }
    } catch (error) {
      console.error('❌ Error caching scan data:', error);
    }
  }, [apiResults, scanCompleted, domain, aiSummary, hasScanned, isScanning, loadingMessage]);

  // Sync state when scan completes (stop loading indicator)
  React.useEffect(() => {
    if (scanCompleted && apiResults) {
      console.log('🎯 Scan completed detected - stopping loader and showing results');
      setIsScanning(false);
      setLoadingMessage('');
      setHasScanned(true);
      setScanCompleted(true);
    }
  }, [scanCompleted, apiResults]);

  // Check for active scan on mount and resume if needed
  React.useEffect(() => {
    const checkActiveScans = async () => {
      // First check localStorage
      const cached = localStorage.getItem('automation_scan_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          console.log('📊 Checking localStorage on mount:', {
            hasResults: !!parsed.apiResults,
            isScanning: parsed.isScanning,
            scanCompleted: parsed.scanCompleted,
            domain: parsed.domain
          });
          
          // Restore domain if available
          if (parsed.domain) {
            setDomain(parsed.domain);
          }
          
          // If there's an active scan promise, wait for it
          if (activeScanPromise && parsed.isScanning && !parsed.scanCompleted) {
            console.log('🔄 Active scan detected, waiting for completion...');
            setIsScanning(true);
            setLoadingMessage('Resuming scan...');
            
            try {
              const results = await activeScanPromise;
              console.log('✅ Active scan completed, updating UI');
              setApiResults(results);
              setScanCompleted(true);
              setHasScanned(true);
              setIsScanning(false);
              setLoadingMessage('');
            } catch (error) {
              console.error('Active scan failed:', error);
              setIsScanning(false);
            }
          }
          // If we have results and it's marked complete, show them
          else if (parsed.apiResults && parsed.scanCompleted) {
            console.log('✅ Found completed results, updating UI');
            setApiResults(parsed.apiResults);
            setScanCompleted(true);
            setHasScanned(true);
            setIsScanning(false);
            setLoadingMessage('');
          }
        } catch (error) {
          console.error('Error checking cache:', error);
        }
      }
    };

    checkActiveScans();
  }, []); // Run once on mount

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
    setScanCompleted(false);
    setWaitingForLoader(false);
    setAiSummary(''); // Clear previous AI summary
    setScanKey(prev => prev + 1); // Force complete re-render of results

    const scanStartTime = Date.now();
    
    // Store the scan promise globally so it persists across component unmounts
    activeScanPromise = (async () => {
    try {
      console.log(`Starting scan for domain: ${domain}`);
      
      // Step 1: Start the analysis
      // Ensure URL has protocol
      const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      
      // Use your backend API endpoint with caching (or direct external API)
      const apiEndpoint = process.env.REACT_APP_BACKEND_URL 
        ? `${process.env.REACT_APP_BACKEND_URL}/automation-scan/analyze`
        : 'https://h80wkk4o40c4cs48cccsg0wk.webability.io/analyze';
      
      console.log('🔗 API Endpoint:', apiEndpoint);
      console.log('🔧 REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL || 'NOT SET - Using external API directly');
      
      const testsToRun = useCustomTests ? selectedTests : getAllTestsConfig();
      console.log('Request payload:', { url: fullUrl, options: testsToRun });
      console.log('Selected tests count:', Object.values(testsToRun).filter(Boolean).length);
      
      const analyzeResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: fullUrl,
          options: useCustomTests ? selectedTests : getAllTestsConfig()
        }),
        // Extended timeout for long-running accessibility scans (20 minutes)
        signal: AbortSignal.timeout(1200000)
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

      // Step 2: Poll for results with extended timeout for long scans
      const pollForResults = async (): Promise<any> => {
        const maxPollingTime = 25 * 60 * 1000; // 25 minutes maximum
        const startTime = Date.now();
        let pollCount = 0;
        
        while (Date.now() - startTime < maxPollingTime) {
          try {
            pollCount++;
            const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
            
            // Use your backend API endpoint with caching (or direct external API)
            const taskEndpoint = process.env.REACT_APP_BACKEND_URL
              ? `${process.env.REACT_APP_BACKEND_URL}/automation-scan/task/${taskId}`
              : `https://h80wkk4o40c4cs48cccsg0wk.webability.io/task/${taskId}`;
            
            const taskResponse = await fetch(taskEndpoint, {
              // 30 second timeout per polling request
              signal: AbortSignal.timeout(30000)
            });
            
            if (!taskResponse.ok) {
              throw new Error(`Task status request failed: ${taskResponse.statusText}`);
            }

            const taskData = await taskResponse.json();
            console.log(`Polling response (${pollCount}, ${elapsedMinutes}min):`, taskData);
            
            // Check if task is completed based on API documentation
            if (taskData.status === 'completed') {
              return taskData;
            } else if (taskData.status === 'failed') {
              // Check if it's a browser timeout - suggest retry with reduced scope
              if (taskData.error && taskData.error.includes('browser has been closed')) {
                throw new Error(`Browser timeout after ${elapsedMinutes} minutes. Try reducing scan scope or contact support. Error: ${taskData.error}`);
              }
              throw new Error(taskData.error || 'Task failed');
            }
            
            // Enhanced progress reporting
            if (taskData.progress) {
              const estimatedTotal = 15; // Estimated 15 minutes for full scan
              const remainingTime = Math.max(0, estimatedTotal - elapsedMinutes);
              setLoadingMessage(`${taskData.progress} - Elapsed: ${elapsedMinutes}min, Est. remaining: ${remainingTime}min`);
            } else {
              setLoadingMessage(`Scanning in progress... (${elapsedMinutes} minutes elapsed)`);
            }
            
            // Wait 10 seconds between polls for long scans (reduced frequency)
            await new Promise(resolve => setTimeout(resolve, 10000));
          } catch (error) {
            console.error('Error polling for results:', error);
            
            // If it's a timeout error and we're still within max time, continue
            if ((error as any)?.name === 'TimeoutError' && Date.now() - startTime < maxPollingTime) {
              console.log('Polling request timed out, retrying...');
              await new Promise(resolve => setTimeout(resolve, 15000)); // Wait longer on timeout
              continue;
            }
            
            // For other errors, wait and retry
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
        
        throw new Error(`Scan timed out after ${Math.floor(maxPollingTime / 60000)} minutes. The scan may still be running on the server.`);
      };

      // Get the final results
      const finalResults = await pollForResults();
      console.log('Final results:', finalResults);
      
      // Store API results and show immediately
      console.log('📝 Setting scan results:', {
        hasResults: !!finalResults,
        resultsLength: finalResults?.results?.length || 0
      });
      
      setApiResults(finalResults);
      setScanCompleted(true);
      setHasScanned(true); // Show results immediately
      setIsScanning(false); // Hide loading indicator
      setWaitingForLoader(false);
      setLoadingMessage('');
      
      console.log('✅ Scan completed! Showing results immediately.');
      
      // Force immediate localStorage save
      try {
        const immediateCache = {
          domain,
          hasScanned: true,
          apiResults: finalResults,
          scanCompleted: true,
          aiSummary: '',
          isScanning: false,
          loadingMessage: '',
          timestamp: Date.now(),
        };
        localStorage.setItem('automation_scan_cache', JSON.stringify(immediateCache));
        console.log('💾 Force saved completed scan to localStorage');
      } catch (saveError) {
        console.error('Error saving to localStorage:', saveError);
      }
      
      return finalResults; // Return results from promise
      
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
      
      // Ensure loader closes on error
      setIsScanning(false);
      setLoadingMessage('');
      setWaitingForLoader(false);
      
      throw error; // Re-throw for promise rejection
    }
    })(); // Execute the promise immediately
    
    // Wait for the scan to complete
    try {
      await activeScanPromise;
    } catch (error) {
      // Error already handled above
    } finally {
      activeScanPromise = null; // Clear the promise
    }
  };

  const generateAiSummary = async (category: any) => {
    setLoadingAiSummary(true);
    try {
      console.log('Starting AI summary generation for category:', category.category);
      
      // Collect all issues from the category
      const allIssues = category.subcategories
        .filter((sub: any) => sub.issues && sub.issues.length > 0)
        .flatMap((sub: any) => sub.issues);

      console.log('Found issues:', allIssues.length);

      if (allIssues.length === 0) {
        setAiSummary('Great news! No accessibility issues were found in this category. Your website is performing well in this area.');
        setLoadingAiSummary(false);
        return;
      }

      // Create a summary of issues for the AI
      const issuesSummary = allIssues.map((issue: any) => ({
        type: issue.issue_type || 'Unknown',
        description: getIssueDescription(issue),
        element: issue.selector || '',
        action: issue.action || ''
      }));

      const prompt = `You are an accessibility expert helping a website owner fix their accessibility issues. Provide a clear, actionable guide.

Category: ${category.category}
Issues found: ${allIssues.length}

Issues details:
${issuesSummary.map((issue: any, i: number) => `${i + 1}. ${issue.type}: ${issue.description}
   Element: ${issue.element}
   Action: ${issue.action}`).join('\n')}

Please provide a simple, practical guide in 2-3 paragraphs that:
1. Explains what these accessibility issues mean in everyday language
2. Why they matter for users (especially those with disabilities)
3. Step-by-step guidance on exactly which elements need to be changed
4. How to actually fix each issue with specific, actionable instructions

Format your response as:
- Start with "Here's what we found..."
- Then explain the issues simply
- End with clear fix instructions like "To fix this, you need to: [specific steps]"

Use simple language, avoid technical jargon, be encouraging and practical. Focus on WHAT to change and HOW to change it. Keep it under 250 words.`;

      console.log('Sending request to AI summary API...');
      console.log('Prompt length:', prompt.length);

      const response = await fetch('http://localhost:3001/api/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to generate AI summary: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setAiSummary(data.summary || 'Unable to generate summary at this time.');
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('Unable to generate AI summary at this time. Please review the technical details above for specific issues that need attention.');
    } finally {
      setLoadingAiSummary(false);
    }
  };

  const handleViewDetails = (category: any, event: React.MouseEvent) => {
    console.log('Opening modal for category:', category);
    console.log('Category subcategories:', category.subcategories);
    
    // Get button position relative to viewport
    const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;
    
    setButtonPosition({ x: buttonCenterX, y: buttonCenterY });
    setSelectedCategory(category);
    setShowAnalysis(true);
    setAiSummary(''); // Reset AI summary
    setExpandedSubcategories({}); // Reset expanded state
    
    // Don't auto-generate AI summary - user will click button to generate it
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setExpandedSubcategories(prev => ({
      ...prev,
      [subcategoryId]: !prev[subcategoryId]
    }));
  };

  // Helper function to extract description from various possible fields
  const getIssueDescription = (fix: any): string => {
    // Try multiple possible fields for description
    const possibleFields = [
      'description',
      'message', 
      'details',
      'error_message',
      'reason',
      'summary',
      'text',
      'content',
      'explanation'
    ];
    
    for (const field of possibleFields) {
      if (fix[field] && typeof fix[field] === 'string' && fix[field].trim()) {
        return fix[field].trim();
      }
    }
    
    // If no description found, try to construct one from available data
    if (fix.issue_type) {
      return `${fix.issue_type.replace(/_/g, ' ')} detected${fix.selector ? ` on element: ${fix.selector}` : ''}`;
    }
    
    return 'Issue detected - review element for accessibility compliance';
  };

  // Helper function to generate AI color suggestions for contrast issues
  const generateColorSuggestions = (issue: any) => {
    if (!issue.attributes) return [];

    // Return only the best suggestion: Black text on white background (highest contrast)
    return [{
      id: 1,
      name: 'Black text on White background',
      textColor: '#000000',
      bgColor: '#FFFFFF',
      contrast: '21:1',
      css: 'color: #000000; background-color: #FFFFFF;',
    }];
  };

  // Function to parse API results and convert to card format
  const parseApiResults = (apiData: any) => {
    // Handle polling response format
    const actualResults = apiData.result || apiData;
    
    console.log('Processing API results:', actualResults);
    console.log('Auto fixes found:', actualResults?.auto_fixes?.length || 0);
    console.log('Summary:', actualResults?.summary);
    
    if (!actualResults) return [];

    const autoFixes = actualResults.auto_fixes || [];
    const summary = actualResults.summary;
    
    // Group fixes by category
    const categoryMap: { [key: string]: any } = {};

    // Category mapping based on API documentation
    const categoryConfig: { [key: string]: { name: string; icon: any; color: string } } = {
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

    // Don't pre-initialize any categories - only create them based on actual results
    // This ensures we only show categories that were actually tested and have results

    // Now process actual issues and update categories that have problems
    autoFixes.forEach((fix: any) => {
      console.log('Processing fix object:', fix); // Debug: see the actual structure
      const category = fix.category || 'other';
      const issueType = fix.issue_type || 'unknown';
      
      const categoryInfo = categoryConfig[category] || { 
        name: category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), 
        icon: FaBrain, 
        color: 'gray' 
      };

      // If this category wasn't in our tested list, add it
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category: categoryInfo.name,
          subcategories: {},
          icon: categoryInfo.icon,
          color: categoryInfo.color
        };
      }

      // Convert subcategories to object format if it's still an array (from initialization)
      if (Array.isArray(categoryMap[category].subcategories)) {
        categoryMap[category].subcategories = {};
      }

      if (!categoryMap[category].subcategories[issueType]) {
        categoryMap[category].subcategories[issueType] = {
          id: issueType,
          name: issueType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          status: 'error',
          total_fixes: 0,
          auto_fixes: [],
          issues: [] // Add issues array for modal compatibility
        };
      }

      categoryMap[category].subcategories[issueType].total_fixes++;
      categoryMap[category].subcategories[issueType].auto_fixes.push(fix);
      categoryMap[category].subcategories[issueType].issues.push(fix); // Also add to issues array
    });

    // Add "passed" categories for tests that were run but had no issues
    // We can determine this from the API response summary or from the selected tests
    if (summary && summary.tests_run) {
      // If the API provides information about which tests were run
      Object.keys(summary.tests_run).forEach(testKey => {
        // Map test keys to categories
        const categoryMapping: { [key: string]: string } = {
          'run_tab_navigation': 'keyboard_navigation',
          'detect_missing_labels': 'forms',
          'detect_missing_headings': 'page_structure',
          'detect_landmark_roles': 'navigation',
          'detect_custom_widget_labels': 'aria_widgets',
          'detect_contrast_ratio_violations': 'visual_design',
          'detect_image_function_violations': 'images_media',
          'detect_missing_captions': 'multimedia',
          'detect_language_violations': 'internationalization',
          'detect_authentication_cognitive': 'authentication',
          'detect_reflow_violations': 'responsive_design'
        };

        const categoryKey = categoryMapping[testKey];
        if (categoryKey && !categoryMap[categoryKey]) {
          const categoryInfo = categoryConfig[categoryKey];
          if (categoryInfo) {
            categoryMap[categoryKey] = {
              category: categoryInfo.name,
              subcategories: [{
                id: `${categoryKey}_check`,
                name: `${categoryInfo.name} Check`,
                status: 'success',
                total_fixes: 0,
                auto_fixes: [],
                issues: []
              }],
              icon: categoryInfo.icon,
              color: categoryInfo.color
            };
          }
        }
      });
    } else {
      // Fallback: Use the selected tests to determine what was run
      const currentTests = useCustomTests ? selectedTests : getAllTestsConfig();
      const categoryMapping: { [key: string]: string } = {
        'run_tab_navigation': 'keyboard_navigation',
        'detect_missing_labels': 'forms',
        'detect_missing_headings': 'page_structure',
        'detect_landmark_roles': 'navigation',
        'detect_custom_widget_labels': 'aria_widgets',
        'detect_contrast_ratio_violations': 'visual_design',
        'detect_image_function_violations': 'images_media',
        'detect_missing_captions': 'multimedia',
        'detect_language_violations': 'internationalization',
        'detect_authentication_cognitive': 'authentication',
        'detect_reflow_violations': 'responsive_design'
      };

      Object.keys(currentTests).forEach(testKey => {
        if (currentTests[testKey as keyof typeof currentTests] === true) {
          const categoryKey = categoryMapping[testKey];
          if (categoryKey && !categoryMap[categoryKey]) {
            const categoryInfo = categoryConfig[categoryKey];
            if (categoryInfo) {
              categoryMap[categoryKey] = {
                category: categoryInfo.name,
                subcategories: [{
                  id: `${categoryKey}_check`,
                  name: `${categoryInfo.name} Check`,
                  status: 'success',
                  total_fixes: 0,
                  auto_fixes: [],
                  issues: []
                }],
                icon: categoryInfo.icon,
                color: categoryInfo.color
              };
            }
          }
        }
      });
    }

    // Convert to array format expected by the UI
    const categories = Object.values(categoryMap).map((category: any) => ({
      ...category,
      subcategories: Array.isArray(category.subcategories) 
        ? category.subcategories 
        : Object.values(category.subcategories)
    }));

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
              className="px-6 py-3 bg-gray-500 text-gray-300 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors duration-200 text-sm whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              {isScanning ? (loadingMessage || 'Scanning...') : 'Free Scan'}
            </button>
          </div>

          {/* Advanced Options Section */}
          <div className="mt-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomTests}
                onChange={handleCustomTestsToggle}
                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">Customize Test Selection</span>
                <span className="text-xs text-gray-500">
                  {useCustomTests 
                    ? `Custom selection (${Object.values(selectedTests).filter(Boolean).length} tests)` 
                    : 'All tests enabled by default (57 tests)'
                  }
                </span>
              </div>
            </label>

            {useCustomTests && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 bg-gray-50 rounded-lg p-6 border border-gray-200"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Test Configuration</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select which accessibility tests to run. More tests provide comprehensive analysis but take longer to complete.
                  </p>
                  
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={selectAllTests}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={selectNoneTests}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Select None
                    </button>
                  </div>
                </div>

                {/* Test Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Basic Configuration */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm border-b border-gray-300 pb-1">
                      Basic Configuration
                    </h4>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTests.automated_checks}
                        onChange={() => handleTestToggle('automated_checks')}
                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Automated Checks</span>
                    </label>
                  </div>
                  
                  {/* Navigation & Interaction */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm border-b border-gray-300 pb-1">
                      Navigation & Interaction
                    </h4>
                    {[
                      { key: 'run_tab_navigation', label: 'Tab Navigation' },
                      { key: 'run_on_input', label: 'Input Interaction' },
                      { key: 'run_on_focus', label: 'Focus Events' },
                      { key: 'detect_character_shortcuts', label: 'Character Shortcuts' },
                      { key: 'detect_keystroke_timing', label: 'Keystroke Timing' },
                      { key: 'detect_focus_order', label: 'Focus Order' },
                      { key: 'detect_visible_focus', label: 'Visible Focus' }
                    ].map(test => (
                      <label key={test.key} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests[test.key as keyof typeof selectedTests]}
                          onChange={() => handleTestToggle(test.key)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{test.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Content & Structure */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm border-b border-gray-300 pb-1">
                      Content & Structure
                    </h4>
                    {[
                      { key: 'detect_missing_labels', label: 'Missing Labels' },
                      { key: 'detect_missing_headings', label: 'Missing Headings' },
                      { key: 'detect_landmark_roles', label: 'Landmark Roles' },
                      { key: 'detect_main_landmark_content', label: 'Main Landmark Content' },
                      { key: 'detect_heading_function', label: 'Heading Function' },
                      { key: 'detect_main_repeating_content', label: 'Repeating Content' },
                      { key: 'detect_missing_headings_visual', label: 'Visual Headings' },
                      { key: 'detect_heading_level_inconsistency', label: 'Heading Level Issues' },
                      { key: 'detect_language_violations', label: 'Language Violations' }
                    ].map(test => (
                      <label key={test.key} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests[test.key as keyof typeof selectedTests]}
                          onChange={() => handleTestToggle(test.key)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{test.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Media & Content */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm border-b border-gray-300 pb-1">
                      Media & Content
                    </h4>
                    {[
                      { key: 'detect_missing_captions', label: 'Missing Captions' },
                      { key: 'detect_missing_audio_descriptions', label: 'Audio Descriptions' },
                      { key: 'detect_missing_audio_transcripts', label: 'Audio Transcripts' },
                      { key: 'detect_link_function_violations', label: 'Link Function' },
                      { key: 'detect_redundant_entry', label: 'Redundant Entry' },
                      { key: 'detect_authentication_cognitive', label: 'Authentication' },
                      { key: 'detect_css_positioning', label: 'CSS Positioning' },
                      { key: 'detect_layout_tables', label: 'Layout Tables' },
                      { key: 'detect_page_title_violations', label: 'Page Titles' },
                      { key: 'detect_frame_title_violations', label: 'Frame Titles' }
                    ].map(test => (
                      <label key={test.key} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests[test.key as keyof typeof selectedTests]}
                          onChange={() => handleTestToggle(test.key)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{test.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Images & Visual */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm border-b border-gray-300 pb-1">
                      Images & Visual
                    </h4>
                    {[
                      { key: 'detect_image_function_violations', label: 'Image Function' },
                      { key: 'detect_text_alternative_violations', label: 'Text Alternatives' },
                      { key: 'detect_images_of_text_violations', label: 'Images of Text' },
                      { key: 'detect_captcha_violations', label: 'CAPTCHA Issues' },
                      { key: 'detect_ui_component_contrast', label: 'UI Component Contrast' },
                      { key: 'detect_ui_component_state_changes', label: 'State Changes' },
                      { key: 'detect_css_content_violations', label: 'CSS Content' },
                      { key: 'detect_contrast_ratio_violations', label: 'Contrast Ratio' },
                      { key: 'detect_color_meaning_violations', label: 'Color Meaning' },
                      { key: 'detect_sensory_instructions', label: 'Sensory Instructions' }
                    ].map(test => (
                      <label key={test.key} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests[test.key as keyof typeof selectedTests]}
                          onChange={() => handleTestToggle(test.key)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{test.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Forms & Widgets */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm border-b border-gray-300 pb-1">
                      Forms & Widgets
                    </h4>
                    {[
                      { key: 'detect_native_widget_labels', label: 'Native Widget Labels' },
                      { key: 'detect_expected_input_clarity', label: 'Input Clarity' },
                      { key: 'detect_custom_widget_labels', label: 'Custom Widget Labels' },
                      { key: 'detect_custom_widget_expected_input', label: 'Custom Widget Input' },
                      { key: 'detect_autocomplete_violations', label: 'Autocomplete' },
                      { key: 'detect_aria_widget_role_violations', label: 'ARIA Widget Roles' },
                      { key: 'detect_table_semantics_violations', label: 'Table Semantics' },
                      { key: 'detect_table_headers_violations', label: 'Table Headers' },
                      { key: 'detect_semantic_markup_violations', label: 'Semantic Markup' }
                    ].map(test => (
                      <label key={test.key} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests[test.key as keyof typeof selectedTests]}
                          onChange={() => handleTestToggle(test.key)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{test.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* AI-Enhanced Analysis */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 text-sm border-b border-gray-300 pb-1">
                      AI-Enhanced Analysis
                    </h4>
                    {[
                      { key: 'use_llm_for_widget_labels', label: 'AI Widget Labels' },
                      { key: 'use_llm_for_expected_input', label: 'AI Expected Input' },
                      { key: 'use_llm_for_custom_labels', label: 'AI Custom Labels' },
                      { key: 'use_llm_for_custom_expected_input', label: 'AI Custom Input' },
                      { key: 'use_llm_for_color_analysis', label: 'AI Color Analysis' },
                      { key: 'use_llm_for_contrast_analysis', label: 'AI Contrast Analysis' },
                      { key: 'use_llm_for_widget_role_analysis', label: 'AI Widget Roles' },
                      { key: 'use_llm_for_instruction_analysis', label: 'AI Instructions' },
                      { key: 'use_llm_for_text_spacing', label: 'AI Text Spacing' },
                      { key: 'use_llm_for_orientation', label: 'AI Orientation' },
                      { key: 'use_llm_for_resize_text', label: 'AI Resize Text' }
                    ].map(test => (
                      <label key={test.key} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests[test.key as keyof typeof selectedTests]}
                          onChange={() => handleTestToggle(test.key)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Selected Tests Summary */}
                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Selected Tests: {Object.values(selectedTests).filter(Boolean).length} / {Object.keys(selectedTests).length}
                    </span>
                    <span className="text-xs text-gray-500">
                      Estimated scan time: {Object.values(selectedTests).filter(Boolean).length < 10 ? '2-5 min' : Object.values(selectedTests).filter(Boolean).length < 30 ? '5-15 min' : '15-25 min'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

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
            <AnimatePresence exitBeforeEnter={false}>
              <motion.div 
                key={scanKey} 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filteredIssues.map((category, index) => (
                  <IssueCard
                    key={`${scanKey}-${category.category}`}
                    category={category}
                    onViewDetails={handleViewDetails}
                    index={index}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
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
        <AnimatePresence>
          {showAnalysis && selectedCategory && (
            <motion.div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                initial={{ 
                  scale: 0,
                  opacity: 0,
                  x: buttonPosition.x - window.innerWidth / 2,
                  y: buttonPosition.y - window.innerHeight / 2,
                }}
                animate={{ 
                  scale: 1,
                  opacity: 1,
                  x: 0,
                  y: 0,
                }}
                exit={{ 
                  scale: 0,
                  opacity: 0,
                  x: buttonPosition.x - window.innerWidth / 2,
                  y: buttonPosition.y - window.innerHeight / 2,
                }}
                transition={{ 
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                  duration: 0.5
                }}
              >
                {/* Sticky Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
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

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  {selectedCategory.subcategories.map((subcategory: any) => {
                    const isExpanded = expandedSubcategories[subcategory.id];
                    
                    return (
                    <div key={subcategory.id} className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                      {/* Subcategory Header - Clickable */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleSubcategory(subcategory.id)}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="text-gray-600 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <MdExpandMore className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base">
                              {subcategory.name}
                            </h4>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {subcategory.total_fixes > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800">
                              {subcategory.total_fixes} issue{subcategory.total_fixes !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
                              ✓ Pass
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-gray-200"
                          >
                            <div className="p-4 bg-orange-50">
                              {/* Subcategory Details Header */}
                              <div className="mb-4 pb-3 border-b border-orange-200">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium text-gray-700">
                                      <span className="inline-block px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono text-gray-900">
                                        {subcategory.id}
                                      </span>
                                    </p>
                                  </div>
                                  {subcategory.issues && subcategory.issues.length > 0 && subcategory.issues[0].wcag_criterion && (
                                    <div className="text-right">
                                      <p className="text-xs text-gray-600 mb-1">WCAG Guideline</p>
                                      <span className="inline-block px-3 py-1 bg-blue-100 rounded border border-blue-300 text-sm font-semibold text-blue-800">
                                        {subcategory.issues[0].wcag_criterion}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                      {subcategory.issues && subcategory.issues.length > 0 ? (
                        <div className="space-y-3">
                          {subcategory.issues.map((fix: any, index: number) => {
                            const isContrastIssue = fix.category === 'contrast' || fix.issue_type?.includes('contrast');
                            const hasScreenshot = fix.screenshot_base64 && fix.screenshot_status === 'success';
                            const colorSuggestions = isContrastIssue ? generateColorSuggestions(fix) : [];

                            return (
                              <div key={index} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                {/* Issue Header */}
                                <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3 flex-1">
                                      <MdBugReport className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="font-semibold text-gray-900 text-sm">
                                          {fix.issue_type || 'Unknown Issue'}
                                        </p>
                                        {fix.wcag_criterion && (
                                          <p className="text-xs text-gray-600 mt-1">
                                            <span className="font-medium">WCAG:</span> {fix.wcag_criterion}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {fix.action && (
                                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded border border-yellow-300">
                                        {fix.action}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Issue Body */}
                                <div className="p-4">
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {getIssueDescription(fix)}
                                  </p>

                                    {/* Screenshot */}
                                    {hasScreenshot && (
                                      <div className="mt-3 border border-gray-300 rounded-lg p-2 bg-gray-50">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Element Screenshot:</p>
                                        <img
                                          src={`data:image/png;base64,${fix.screenshot_base64}`}
                                          alt="Element screenshot"
                                          className="rounded border border-gray-200 max-w-full h-auto"
                                          style={{ maxHeight: '200px' }}
                                        />
                                      </div>
                                    )}

                                    {/* AI Color Suggestions for Contrast Issues */}
                                    {isContrastIssue && colorSuggestions.length > 0 && (
                                      <div className="mt-4 border-t border-gray-200 pt-4">
                                        <div className="flex items-center space-x-2 mb-3">
                                          <FaBrain className="w-4 h-4 text-purple-600" />
                                          <h5 className="text-sm font-semibold text-gray-900">AI Color Suggestions</h5>
                                        </div>
                                        <div className="space-y-2">
                                          {colorSuggestions.map((suggestion) => (
                                            <div
                                              key={suggestion.id}
                                              className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3 flex-1">
                                                  <div className="flex items-center space-x-1">
                                                    <div
                                                      className="w-6 h-6 rounded border-2 border-gray-300"
                                                      style={{ backgroundColor: suggestion.textColor }}
                                                      title={`Text: ${suggestion.textColor}`}
                                                    />
                                                    <span className="text-xs text-gray-500">on</span>
                                                    <div
                                                      className="w-6 h-6 rounded border-2 border-gray-300"
                                                      style={{ backgroundColor: suggestion.bgColor }}
                                                      title={`Background: ${suggestion.bgColor}`}
                                                    />
                                                  </div>
                                                  <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">
                                                      {suggestion.name}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                      Contrast: <span className="font-semibold text-green-600">{suggestion.contrast}</span>
                                                    </p>
                                                  </div>
                                                </div>
                                                <button
                                                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-md"
                                                  title="Apply this color combination"
                                                >
                                                  Apply
                                                </button>
                                              </div>
                                              <div className="mt-2 bg-gray-100 rounded px-3 py-2 border border-gray-300">
                                                <code className="text-xs text-gray-900 font-mono font-semibold">
                                                  {suggestion.css}
                                                </code>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* HTML Context Section */}
                                    {(fix.html_context || fix.element_html || fix.html || fix.outerHTML) && (
                                      <div className="mt-4">
                                        <div className="mb-2">
                                          <p className="text-xs font-semibold text-gray-700 mb-1">HTML Context:</p>
                                        </div>
                                        <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                                          <pre className="text-xs text-gray-100 font-mono leading-relaxed whitespace-pre-wrap break-words">
                                            <code className="language-html">
                                              {fix.html_context || fix.element_html || fix.html || fix.outerHTML}
                                            </code>
                                          </pre>
                                        </div>
                                      </div>
                                    )}

                                    {/* Element Details */}
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="grid grid-cols-1 gap-2">
                                        <div className="flex items-start">
                                          <span className="text-xs font-semibold text-gray-600 w-32 flex-shrink-0">Element:</span>
                                          <span className="text-xs text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded flex-1 break-all">
                                            {fix.selector || 'N/A'}
                                          </span>
                                        </div>
                                        {fix.action && (
                                          <div className="flex items-start">
                                            <span className="text-xs font-semibold text-gray-600 w-32 flex-shrink-0">Action Required:</span>
                                            <span className="text-xs text-gray-800 capitalize">
                                              {fix.action}
                                            </span>
                                          </div>
                                        )}
                                        {fix.wcag_criterion && (
                                          <div className="flex items-start">
                                            <span className="text-xs font-semibold text-gray-600 w-32 flex-shrink-0">WCAG:</span>
                                            <span className="text-xs text-gray-800 font-medium">
                                              {fix.wcag_criterion}
                                            </span>
                                          </div>
                                        )}
                                        {fix.suggestion && (
                                          <div className="flex items-start">
                                            <span className="text-xs font-semibold text-gray-600 w-32 flex-shrink-0">Suggestion:</span>
                                            <span className="text-xs text-gray-700">
                                              {fix.suggestion}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <MdCheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No issues found for this test</p>
                        </div>
                      )}

                              {subcategory.timestamp && (
                                <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-orange-200">
                                  Tested: {new Date(subcategory.timestamp).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    );
                  })}
                  
                  {/* AI Summary Section */}
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">AI Summary & Fix Guide</h4>
                      </div>
                      {!aiSummary && !loadingAiSummary && (
                        <button
                          onClick={() => generateAiSummary(selectedCategory)}
                          className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
                          </svg>
                          <span>Generate AI Summary</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 mt-3">
                      {loadingAiSummary ? (
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200"></div>
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-gray-700">Generating personalized summary...</p>
                            <div className="flex items-center space-x-1 mt-1">
                              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              <span className="text-xs text-gray-500 ml-2">AI is analyzing your results</span>
                            </div>
                          </div>
                        </div>
                      ) : aiSummary ? (
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none">
                                <ReactMarkdown
                                  components={{
                                    strong: ({ children }: any) => (
                                      <strong className="font-bold text-gray-900">
                                        {children}
                                      </strong>
                                    ),
                                    em: ({ children }: any) => (
                                      <em className="italic text-gray-700">{children}</em>
                                    ),
                                    p: ({ children }: any) => (
                                      <p className="mb-3 last:mb-0 leading-relaxed">
                                        {children}
                                      </p>
                                    ),
                                    ul: ({ children }: any) => (
                                      <ul className="list-disc list-inside mb-3 space-y-1">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }: any) => (
                                      <ol className="list-decimal list-inside mb-3 space-y-1">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }: any) => (
                                      <li className="ml-2">{children}</li>
                                    ),
                                    h1: ({ children }: any) => (
                                      <h1 className="text-lg font-bold mb-2 text-gray-900">{children}</h1>
                                    ),
                                    h2: ({ children }: any) => (
                                      <h2 className="text-base font-bold mb-2 text-gray-900">{children}</h2>
                                    ),
                                    h3: ({ children }: any) => (
                                      <h3 className="text-sm font-bold mb-1 text-gray-900">{children}</h3>
                                    ),
                                    code: ({ children }: any) => (
                                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">
                                        {children}
                                      </code>
                                    ),
                                    a: ({ children, href }: any) => (
                                      <a href={href} className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">
                                        {children}
                                      </a>
                                    ),
                                  }}
                                >
                                  {aiSummary}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 italic border-t border-blue-200 pt-2 mt-3">
                            💡 This guide was generated by AI to help you understand and fix these accessibility issues
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <p className="text-sm text-gray-600 mb-2 font-medium">Get AI-powered fix guidance</p>
                          <p className="text-xs text-gray-500">Click the "Generate AI Summary" button above to get a step-by-step guide on how to fix these issues</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default AutomationScan;
