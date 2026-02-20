import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { CircularProgress } from '@mui/material';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import { getAuthenticationCookie } from '@/utils/cookie';
import Favicon from '@/components/Common/Favicon';
import { useQuery } from '@apollo/client';
import GET_USER_SITES from '@/queries/sites/getSites';
import { Site } from '@/generated/graphql';
import Select, { components, type ClearIndicatorProps } from 'react-select';
import Modal from '@/components/Common/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import './DomainAnalyses.css';
import FixCard from './FixCard';
import SuggestedFixCard, { type SuggestedFix } from './SuggestedFixCard';

interface OptionType {
  value: string;
  label: string;
}

const AccessibleClearIndicator = (
  props: ClearIndicatorProps<OptionType, false>,
) => {
  const { innerProps, clearValue } = props;
  const { ref, ...restInnerProps } = innerProps;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      clearValue();
    }
  };

  return (
    <button
      type="button"
      {...restInnerProps}
      ref={ref as React.Ref<HTMLButtonElement>}
      onClick={(event) => {
        event.stopPropagation();
        clearValue();
      }}
      onKeyDown={handleKeyDown}
      className="flex items-center justify-center text-gray-400 hover:text-gray-600 p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
      aria-label="Clear selected domain"
    >
      <components.ClearIndicator {...props} />
    </button>
  );
};

export interface Analysis {
  id: string;
  url_hash: string;
  url: string | null;
  domain: string | null;
  allowed_site_id: number | null;
  score: number | null;
  issues_count: number;
  result_json: string;
  r2_key: string | null;
  version: number;
  previous_score: number | null;
  score_change: number | null;
  analyzed_at: number;
  synced_to_mysql: number;
}

const DomainAnalyses: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: 'Auto Fixes' });
  
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loader, setLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [selectedImpact, setSelectedImpact] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [updatingFixId, setUpdatingFixId] = useState<string | null>(null);
  // View state: 'domain-selection' | 'url-list' | 'fixes-view'
  const [currentView, setCurrentView] = useState<'domain-selection' | 'url-list' | 'fixes-view'>('domain-selection');
  // Slider state for fixes view
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [sliderUrl, setSliderUrl] = useState<string | null>(null);
  // Slider tabs: 'fixes' | 'page-html'
  const [sliderTab, setSliderTab] = useState<'fixes' | 'page-html'>('fixes');
  const [sliderFiltersExpanded, setSliderFiltersExpanded] = useState(true);
  // Page HTML from page_cache (view fixes)
  const [pageHtml, setPageHtml] = useState<{
    url: string | null;
    html: string | null;
    loading: boolean;
    error: string | null;
  }>({ url: null, html: null, loading: false, error: null });
  const [pageHtmlView, setPageHtmlView] = useState<'preview' | 'source' | 'suggested-fixes'>('preview');
  const [suggestedFixes, setSuggestedFixes] = useState<SuggestedFix[]>([]);
  const [suggestedFixesLoading, setSuggestedFixesLoading] = useState(false);
  const [suggestedFixesError, setSuggestedFixesError] = useState<string | null>(null);
  const [acceptingFixKey, setAcceptingFixKey] = useState<string | null>(null);
  // Modal state for suggested fixes
  const [suggestedFixesModal, setSuggestedFixesModal] = useState<{
    isOpen: boolean;
    url: string | null;
    analysisId: string | null;
  }>({
    isOpen: false,
    url: null,
    analysisId: null,
  });
  const [modalSuggestedFixes, setModalSuggestedFixes] = useState<SuggestedFix[]>([]);
  const [modalSuggestedFixesLoading, setModalSuggestedFixesLoading] = useState(false);
  const [modalSuggestedFixesError, setModalSuggestedFixesError] = useState<string | null>(null);
  const [currentFixIndex, setCurrentFixIndex] = useState<number>(0);
  const [swipingFix, setSwipingFix] = useState<{ index: number; direction: 'left' | 'right' } | null>(null);
  const [suggestedFixesModalAnnouncement, setSuggestedFixesModalAnnouncement] = useState<string>('');
  const prevModalLoadingRef = useRef(modalSuggestedFixesLoading);
  // Search state for URL list
  const [urlSearchQuery, setUrlSearchQuery] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'remove' | 'restore';
    analysisId: string;
    fixIndex: number;
  }>({
    isOpen: false,
    type: 'remove',
    analysisId: '',
    fixIndex: -1,
  });
  const isMounted = useRef(true);
  const sliderPanelRef = useRef<HTMLDivElement | null>(null);
  const sliderPreviousFocusRef = useRef<HTMLElement | null>(null);

  // Fetch user sites for domain selector
  const { data: sitesData, loading: sitesLoading } = useQuery(GET_USER_SITES);

  // Create site options for the dropdown
  const siteOptions = useMemo(() => {
    if (!sitesData?.getUserSites?.sites) return [];
    return sitesData.getUserSites.sites
      .map((site: Site | null | undefined) => ({
        value: site?.url || '',
        label: site?.url || '',
      }))
      .filter((opt: OptionType) => opt.value);
  }, [sitesData]);

  // Normalize domain: extract root domain from URLs
  const normalizeDomain = (input: string): string => {
    if (!input) return '';
    
    // Remove protocol
    let normalized = input.replace(/^https?:\/\//i, '');
    
    // Remove www.
    normalized = normalized.replace(/^www\./i, '');
    
    // Remove trailing slashes and paths
    normalized = normalized.replace(/\/.*$/, '');
    
    // Remove trailing spaces
    normalized = normalized.trim();
    
    return normalized.toLowerCase();
  };

  // Find matching domain in user's sites by root domain
  const findMatchingDomain = (input: string): OptionType | null => {
    const normalizedInput = normalizeDomain(input);
    if (!normalizedInput) return null;

    // Check if any site's root domain matches
    return siteOptions.find((option: OptionType) => {
      const normalizedOption = normalizeDomain(option.value);
      return normalizedOption === normalizedInput;
    }) || null;
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchPageHtml = useCallback(async (url: string, urlHash?: string | null) => {
    setPageHtml((prev) => ({ ...prev, url, html: null, loading: true, error: null }));
    const params = new URLSearchParams({ url });
    if (urlHash && urlHash.trim()) params.set('url_hash', urlHash.trim());
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/page-html?${params.toString()}`;
    const token = getAuthenticationCookie();
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (!isMounted.current) return;
      if (!response.ok) {
        setPageHtml({
          url,
          html: null,
          loading: false,
          error: data?.message || data?.error || `Request failed: ${response.status}`,
        });
        return;
      }
      setPageHtml({ url, html: data.html ?? null, loading: false, error: null });
    } catch (err) {
      if (!isMounted.current) return;
      setPageHtml({
        url,
        html: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load page HTML',
      });
    }
  }, []);

  const sliderAnalysis = useMemo(() => {
    if (!sliderUrl) return null;
    return analyses.find((a) => (a.url || a.domain || '') === sliderUrl) ?? null;
  }, [analyses, sliderUrl]);

  useEffect(() => {
    if (sliderTab !== 'page-html' || !sliderUrl) return;
    if (pageHtml.url === sliderUrl && (pageHtml.html != null || pageHtml.loading || pageHtml.error)) return;
    fetchPageHtml(sliderUrl, sliderAnalysis?.url_hash ?? null);
  }, [sliderTab, sliderUrl, sliderAnalysis?.url_hash, fetchPageHtml]);

  useEffect(() => {
    if (!sliderUrl) return;
    setSuggestedFixes([]);
    setSuggestedFixesError(null);
    setAcceptingFixKey(null);
  }, [sliderUrl]);

  // Adjust currentFixIndex when fixes list changes (safety check)
  useEffect(() => {
    if (modalSuggestedFixes.length > 0) {
      if (currentFixIndex >= modalSuggestedFixes.length) {
        setCurrentFixIndex(Math.max(0, modalSuggestedFixes.length - 1));
      }
    } else if (modalSuggestedFixes.length === 0) {
      setCurrentFixIndex(0);
    }
  }, [modalSuggestedFixes.length, currentFixIndex]);

  const existingFixesForSuggested = useMemo(() => {
    if (!sliderAnalysis) return [];
    try {
      const parsed = JSON.parse(sliderAnalysis.result_json);
      return Array.isArray(parsed?.analysis?.fixes) ? parsed.analysis.fixes : [];
    } catch {
      return [];
    }
  }, [sliderAnalysis]);

  const fetchSuggestedFixes = useCallback(async () => {
    if (!sliderUrl || !pageHtml.html || !sliderAnalysis) return;
    setSuggestedFixesLoading(true);
    setSuggestedFixesError(null);
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/suggested-fixes`;
    const token = getAuthenticationCookie();
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          url: sliderUrl,
          html: pageHtml.html,
          existingFixes: existingFixesForSuggested,
          ...(sliderAnalysis?.domain ? { domain: sliderAnalysis.domain } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? data?.error ?? 'Failed to fetch suggestions');
      setSuggestedFixes(Array.isArray(data.suggestedFixes) ? data.suggestedFixes : []);
    } catch (e) {
      // On any error, show "no fixes found" instead of technical error message
      setSuggestedFixes([]);
      setSuggestedFixesError(null);
    } finally {
      setSuggestedFixesLoading(false);
    }
  }, [sliderUrl, pageHtml.html, sliderAnalysis, existingFixesForSuggested]);

  const handleAcceptSuggestedFix = useCallback(
    async (fix: SuggestedFix, index: number) => {
      if (!sliderAnalysis) return;
      const key = `suggested-${index}-${fix.selector}-${fix.issue_type}`;
      setAcceptingFixKey(key);
      const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/add-fix`;
      const token = getAuthenticationCookie();
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ analysisId: sliderAnalysis.id, fix }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? data?.error ?? 'Failed to add fix');
        setAnalyses((prev) => prev.map((a) => (a.id === sliderAnalysis.id ? data : a)));
        setSuggestedFixes((prev) => prev.filter((_, i) => i !== index));
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to add fix');
      } finally {
        setAcceptingFixKey(null);
      }
    },
    [sliderAnalysis]
  );

  const handleRejectSuggestedFix = useCallback((index: number) => {
    setSuggestedFixes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCloseSuggestedFixesModal = useCallback(() => {
    setSuggestedFixesModal({ isOpen: false, url: null, analysisId: null });
    setModalSuggestedFixes([]);
    setModalSuggestedFixesError(null);
    setCurrentFixIndex(0);
    setSwipingFix(null);
  }, []);

  // Handler for opening suggested fixes modal from URL table
  const handleOpenSuggestedFixesModal = useCallback(async (url: string) => {
    const analysis = analyses.find((a) => (a.url || a.domain || '') === url);
    if (!analysis) {
      alert('Analysis not found for this URL');
      return;
    }

    setSuggestedFixesModal({ isOpen: true, url, analysisId: analysis.id });
    setModalSuggestedFixes([]);
    setModalSuggestedFixesLoading(true);
    setModalSuggestedFixesError(null);
    setCurrentFixIndex(0);

    // First fetch the HTML
    const params = new URLSearchParams({ url });
    if (analysis.url_hash) params.set('url_hash', analysis.url_hash);
    const htmlApiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/page-html?${params.toString()}`;
    const token = getAuthenticationCookie();

    try {
      const htmlRes = await fetch(htmlApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const htmlData = await htmlRes.json();
      if (!htmlRes.ok || !htmlData.html) {
        throw new Error('Failed to fetch page HTML');
      }

      // Get existing fixes
      let existingFixes: SuggestedFix[] = [];
      try {
        const parsed = JSON.parse(analysis.result_json);
        existingFixes = Array.isArray(parsed?.analysis?.fixes) ? parsed.analysis.fixes : [];
      } catch {
        existingFixes = [];
      }

      // Fetch suggested fixes (backend will also fetch scanner report issues where Affected Pages includes this URL and send with HTML to GPT)
      const fixesApiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/suggested-fixes`;
      const fixesRes = await fetch(fixesApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          url,
          html: htmlData.html,
          existingFixes,
          ...(analysis.domain ? { domain: analysis.domain } : {}),
        }),
      });
      const fixesData = await fixesRes.json();
      if (!fixesRes.ok) {
        throw new Error(fixesData?.message ?? fixesData?.error ?? 'Failed to fetch suggestions');
      }
      // Backend now returns 200 with empty array if no fixes found (not an error)
      const fixes = Array.isArray(fixesData.suggestedFixes) ? fixesData.suggestedFixes : [];
      setModalSuggestedFixes(fixes);
      setModalSuggestedFixesError(null);
      setCurrentFixIndex(0);
    } catch (e) {
      // On any error, show "no fixes found" instead of technical error message
      // Set empty array and clear error state so UI shows friendly "no fixes found" message
      setModalSuggestedFixes([]);
      setModalSuggestedFixesError(null);
      setCurrentFixIndex(0);
    } finally {
      setModalSuggestedFixesLoading(false);
    }
  }, [analyses, handleCloseSuggestedFixesModal]);

  // Announce Suggested Fixes modal loading and result to screen readers
  useEffect(() => {
    if (!suggestedFixesModal.isOpen) {
      setSuggestedFixesModalAnnouncement('');
      prevModalLoadingRef.current = modalSuggestedFixesLoading;
      return undefined;
    }
    const justFinishedLoading = prevModalLoadingRef.current === true && modalSuggestedFixesLoading === false;
    prevModalLoadingRef.current = modalSuggestedFixesLoading;

    if (modalSuggestedFixesLoading) {
      setSuggestedFixesModalAnnouncement(
        'Scanning and analyzing page. Our AI is scraping the HTML, analyzing accessibility issues, and generating fix suggestions.',
      );
      return undefined;
    }
    if (justFinishedLoading) {
      setSuggestedFixesModalAnnouncement('');
      const msg =
        modalSuggestedFixes.length === 0
          ? 'No fixes found. All fixes are already implemented.'
          : `${modalSuggestedFixes.length} suggested fix${modalSuggestedFixes.length === 1 ? '' : 'es'} found.`;
      const t = setTimeout(() => setSuggestedFixesModalAnnouncement(msg), 400);
      return () => clearTimeout(t);
    }
    setSuggestedFixesModalAnnouncement(
      modalSuggestedFixes.length === 0
        ? 'No fixes found. All fixes are already implemented.'
        : `${modalSuggestedFixes.length} suggested fix${modalSuggestedFixes.length === 1 ? '' : 'es'} found.`,
    );
    return undefined;
  }, [suggestedFixesModal.isOpen, modalSuggestedFixesLoading, modalSuggestedFixes.length]);

  // Note: We no longer auto-close when fixes list is empty
  // Instead, we show a "No fixes found" message and let the user close manually

  const handleModalAcceptFix = useCallback(
    async (fix: SuggestedFix, index: number) => {
      if (!suggestedFixesModal.analysisId) return;
      
      const key = `modal-suggested-${index}-${fix.selector}-${fix.issue_type}`;
      setAcceptingFixKey(key);
      
      // Start swipe animation to the right
      setSwipingFix({ index, direction: 'right' });
      
      // Wait for animation to complete before removing
      setTimeout(() => {
        // Remove fix from list after animation
        setModalSuggestedFixes((prev) => {
          const updated = prev.filter((_, i) => i !== index);
          // Calculate new index based on removal
          setCurrentFixIndex((prevIndex) => {
            if (index < prevIndex) {
              // Removed fix was before current, move back one
              return Math.max(0, prevIndex - 1);
            } else if (index === prevIndex) {
              // Removed fix was current, stay at same position (next fix moves up)
              // But if we're at or beyond the end, move to last item
              const remainingCount = updated.length;
              return prevIndex >= remainingCount ? Math.max(0, remainingCount - 1) : prevIndex;
            }
            // Removed fix was after current, no change needed
            return prevIndex;
          });
          return updated;
        });
        setSwipingFix(null);
      }, 400); // Match animation duration
      
      const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/add-fix`;
      const token = getAuthenticationCookie();
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ analysisId: suggestedFixesModal.analysisId, fix }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? data?.error ?? 'Failed to add fix');
        setAnalyses((prev) => prev.map((a) => (a.id === suggestedFixesModal.analysisId ? data : a)));
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to add fix');
        // On error, we could restore the fix, but for now we'll leave it removed
      } finally {
        setAcceptingFixKey(null);
      }
    },
    [suggestedFixesModal.analysisId]
  );

  const handleModalRejectFix = useCallback((index: number) => {
    // Start swipe animation to the left
    setSwipingFix({ index, direction: 'left' });
    
    // Wait for animation to complete before removing
    setTimeout(() => {
      // Remove fix from list after animation
      setModalSuggestedFixes((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        // Calculate new index based on removal
        setCurrentFixIndex((prevIndex) => {
          if (index < prevIndex) {
            // Removed fix was before current, move back one
            return Math.max(0, prevIndex - 1);
          } else if (index === prevIndex) {
            // Removed fix was current, stay at same position (next fix moves up)
            // But if we're at or beyond the end, move to last item
            const remainingCount = updated.length;
            return prevIndex >= remainingCount ? Math.max(0, remainingCount - 1) : prevIndex;
          }
          // Removed fix was after current, no change needed
          return prevIndex;
        });
        return updated;
      });
      setSwipingFix(null);
    }, 400); // Match animation duration
  }, []);


  const fetchAnalyses = async (domain: string) => {
    if (!domain) return;

    setHasSearched(true);
    setLoader(true);
    setError(null);
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses?url=${encodeURIComponent(domain)}`;
    const token = getAuthenticationCookie();

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();

      if (isMounted.current) {
        setAnalyses(data || []);
        setLoader(false);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
      if (isMounted.current) {
        setAnalyses([]);
        setLoader(false);
        setError(
          error instanceof Error ? error.message : 'Failed to fetch analyses'
        );
      }
    }
  };

  const handleDomainChange = (selected: OptionType | null) => {
    if (selected) {
      setSelectedOption(selected);
      setSelectedDomain(selected.value);
      setSelectedPage('all');
      setSelectedImpact('all');
      setSelectedCategory('all');
      // Don't automatically fetch - wait for button click
    } else {
      setSelectedOption(null);
      setSelectedDomain(null);
      setAnalyses([]);
      setHasSearched(false);
      setCurrentView('domain-selection'); // Go back to domain selection
    }
  };

  const handleFindAutoFixes = () => {
    if (selectedDomain) {
      setCurrentView('url-list'); // Show URL list after domain selection
      fetchAnalyses(selectedDomain);
    }
  };

  // Get unique URLs from analyses with metrics
  const urlList = useMemo(() => {
    const urlMap = new Map<string, {
      url: string;
      fixCount: number;
      activeFixCount: number;
      deletedFixCount: number;
      score: number | null;
      analyzedAt: number;
    }>();

    analyses.forEach((analysis) => {
      const url = analysis.url || analysis.domain || '';
      if (!url) return;

      try {
        const parsed = JSON.parse(analysis.result_json);
        const fixes = parsed?.analysis?.fixes || [];
        const activeFixes = fixes.filter((f: any) => f.action !== 'deleted');
        const deletedFixes = fixes.filter((f: any) => f.action === 'deleted');

        const existing = urlMap.get(url) || {
          url,
          fixCount: 0,
          activeFixCount: 0,
          deletedFixCount: 0,
          score: null,
          analyzedAt: 0,
        };

        existing.fixCount += fixes.length;
        existing.activeFixCount += activeFixes.length;
        existing.deletedFixCount += deletedFixes.length;
        if (analysis.score !== null && (existing.score === null || analysis.analyzed_at > existing.analyzedAt)) {
          existing.score = analysis.score;
        }
        if (analysis.analyzed_at > existing.analyzedAt) {
          existing.analyzedAt = analysis.analyzed_at;
        }

        urlMap.set(url, existing);
      } catch (error) {
        console.error('Error parsing analysis:', error);
      }
    });

    const list = Array.from(urlMap.values());
    const getPathDepth = (urlStr: string): number => {
      try {
        const url = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
        return url.pathname.split('/').filter(Boolean).length;
      } catch {
        return 0;
      }
    };
    return list.sort((a, b) => {
      const depthA = getPathDepth(a.url);
      const depthB = getPathDepth(b.url);
      if (depthA !== depthB) return depthA - depthB;
      return a.url.localeCompare(b.url, undefined, { sensitivity: 'base' });
    });
  }, [analyses]);

  // Filter URL list based on search query
  const filteredUrlList = useMemo(() => {
    if (!urlSearchQuery.trim()) return urlList;
    
    const query = urlSearchQuery.toLowerCase().trim();
    return urlList.filter((item) => {
      const url = item.url.toLowerCase();
      return url.includes(query);
    });
  }, [urlList, urlSearchQuery]);

  // Announce loading, error, and result state to screen readers (status live region)
  const [searchResultAnnouncement, setSearchResultAnnouncement] = useState<string>('');
  const prevLoaderRef = useRef(loader);

  useEffect(() => {
    if (currentView !== 'url-list') {
      setSearchResultAnnouncement('');
      prevLoaderRef.current = loader;
      return undefined;
    }

    const getResultMessage = (): string => {
      if (urlList.length === 0) {
        return 'No Pages Found. No pages have been analyzed for this domain yet.';
      }
      if (filteredUrlList.length === 0) {
        return `No Results Found. No pages match your search query "${urlSearchQuery}". Try a different search term.`;
      }
      const n = filteredUrlList.length;
      return `${n} page${n === 1 ? '' : 's'} found.`;
    };

    const justStartedLoading = prevLoaderRef.current === false && loader === true;
    const justFinishedLoading = prevLoaderRef.current === true && loader === false;
    prevLoaderRef.current = loader;

    // Loading: announce when loading starts so SR announces "Finding auto fixes, please wait"
    if (loader) {
      if (justStartedLoading) {
        setSearchResultAnnouncement('');
        const t = setTimeout(() => setSearchResultAnnouncement('Finding auto fixes, please wait.'), 200);
        return () => clearTimeout(t);
      }
      setSearchResultAnnouncement('Finding auto fixes, please wait.');
      return undefined;
    }

    // Error: announce when error is shown
    if (error) {
      setSearchResultAnnouncement(error);
      return undefined;
    }

    if (justFinishedLoading) {
      // Announce when Find completes: clear then set after delay so SR reliably announces the result
      setSearchResultAnnouncement('');
      const msg = getResultMessage();
      const t = setTimeout(() => setSearchResultAnnouncement(msg), 350);
      return () => clearTimeout(t);
    }

    setSearchResultAnnouncement(getResultMessage());
    return undefined;
  }, [currentView, urlList.length, filteredUrlList.length, urlSearchQuery, loader, error]);

  const handleUrlClick = (url: string) => {
    setSliderUrl(url);
    setSelectedPage(url);
    setIsSliderOpen(true);
  };

  const handleCloseSlider = () => {
    setIsSliderOpen(false);
    setSliderUrl(null);
    setSelectedPage('all');
    setSliderTab('fixes');
    setPageHtml({ url: null, html: null, loading: false, error: null });
    setPageHtmlView('preview');
    setSuggestedFixes([]);
    setSuggestedFixesLoading(false);
    setSuggestedFixesError(null);
    setAcceptingFixKey(null);
  };

  // Focus trap and Escape for Auto Fixes slider panel
  const sliderFocusableSelectors =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  useEffect(() => {
    if (!isSliderOpen) return;

    sliderPreviousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = sliderPanelRef.current;
    if (!panel) return;

    const getFocusable = (): HTMLElement[] =>
      Array.from(panel.querySelectorAll<HTMLElement>(sliderFocusableSelectors)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
      );

    const focusFirst = () => {
      const focusables = getFocusable();
      if (focusables.length > 0) focusables[0].focus();
      else panel.focus();
    };

    const t = setTimeout(focusFirst, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseSlider();
        const prev = sliderPreviousFocusRef.current;
        if (prev && typeof prev.focus === 'function') {
          setTimeout(() => prev.focus(), 0);
        }
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const current = document.activeElement as HTMLElement;
      const idx = focusables.indexOf(current);
      if (idx === -1) {
        e.preventDefault();
        focusFirst();
        return;
      }
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          focusables[focusables.length - 1].focus();
        }
      } else {
        if (idx >= focusables.length - 1) {
          e.preventDefault();
          focusables[0].focus();
        }
      }
    };

    panel.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t);
      panel.removeEventListener('keydown', handleKeyDown);
      const prev = sliderPreviousFocusRef.current;
      if (prev && document.contains(prev)) {
        try {
          prev.focus();
        } catch {
          // ignore if element no longer focusable
        }
      }
    };
  }, [isSliderOpen]);

  const handleBackToUrlList = () => {
    setCurrentView('url-list');
    setSelectedPage('all');
  };

  // Handle input change to detect pasted URLs and auto-select matching domains
  const handleInputChange = (inputValue: string, { action }: { action: string }) => {
    // Only process when user is typing/pasting, not when menu is opening/closing
    if (action === 'input-change' && inputValue) {
      // Check if input looks like a URL (contains protocol, www, or has a TLD pattern)
      const trimmedInput = inputValue.trim();
      const looksLikeUrl = /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i.test(trimmedInput);
      
      if (looksLikeUrl) {
        const matchingDomain = findMatchingDomain(trimmedInput);
        if (matchingDomain && (!selectedOption || selectedOption.value !== matchingDomain.value)) {
          // Use setTimeout to avoid conflicts with react-select's internal state
          setTimeout(() => {
            handleDomainChange(matchingDomain);
          }, 100);
        }
      }
    }
    return inputValue;
  };

  // Extract all fixes from all analyses
  const allFixes = useMemo(() => {
    const fixes: Array<{
      fix: any;
      url: string;
      analysisId: string;
      fixIndex: number;
    }> = [];

    analyses.forEach((analysis) => {
      try {
        const parsed = JSON.parse(analysis.result_json);
        const analysisFixes = parsed?.analysis?.fixes || [];
        analysisFixes.forEach((fix: any, index: number) => {
          fixes.push({
            fix,
            url: analysis.url || analysis.domain || '',
            analysisId: analysis.id,
            fixIndex: index,
          });
        });
      } catch (error) {
        console.error('Error parsing analysis:', error);
      }
    });

    return fixes;
  }, [analyses]);

  // Get fixes for the slider URL
  const sliderFixes = useMemo(() => {
    if (!sliderUrl) return [];
    return allFixes.filter(({ fix, url }) => {
      if (url !== sliderUrl) return false;
      // Apply filters
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return false;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return false;
      return true;
    });
  }, [allFixes, sliderUrl, filter, selectedImpact, selectedCategory]);

  // Get unique pages with counts (filtered by status, impact, category - but NOT page)
  const pages = useMemo(() => {
    const pageMap = new Map<string, number>();
    allFixes.forEach(({ fix, url }) => {
      // Apply all filters EXCEPT page filter
      if (filter === 'active' && fix.action === 'deleted') return;
      if (filter === 'deleted' && fix.action !== 'deleted') return;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return;
      
      const count = pageMap.get(url) || 0;
      pageMap.set(url, count + 1);
    });
    return Array.from(pageMap.entries()).map(([url, count]) => ({ url, count }));
  }, [allFixes, filter, selectedImpact, selectedCategory]);

  // Get unique impacts with counts (filtered by status, page, category - but NOT impact)
  // When slider is open, use sliderUrl instead of selectedPage
  const impacts = useMemo(() => {
    const impactMap = new Map<string, number>();
    const currentPage = isSliderOpen && sliderUrl ? sliderUrl : selectedPage;
    
    allFixes.forEach(({ fix, url }) => {
      // Apply all filters EXCEPT impact filter
      if (currentPage !== 'all' && url !== currentPage) return;
      if (filter === 'active' && fix.action === 'deleted') return;
      if (filter === 'deleted' && fix.action !== 'deleted') return;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return;
      
      const impact = fix.impact || 'minor';
      const count = impactMap.get(impact) || 0;
      impactMap.set(impact, count + 1);
    });
    return Array.from(impactMap.entries())
      .map(([impact, count]) => ({ impact, count }))
      .sort((a, b) => {
        const order = { serious: 0, moderate: 1, minor: 2 };
        return (order[a.impact as keyof typeof order] || 3) - (order[b.impact as keyof typeof order] || 3);
      });
  }, [allFixes, selectedPage, filter, selectedCategory, isSliderOpen, sliderUrl]);

  // Get unique categories with counts (filtered by status, page, impact - but NOT category)
  // When slider is open, use sliderUrl instead of selectedPage
  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    const currentPage = isSliderOpen && sliderUrl ? sliderUrl : selectedPage;
    
    allFixes.forEach(({ fix, url }) => {
      // Apply all filters EXCEPT category filter
      if (currentPage !== 'all' && url !== currentPage) return;
      if (filter === 'active' && fix.action === 'deleted') return;
      if (filter === 'deleted' && fix.action !== 'deleted') return;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return;
      
      const category = fix.category || 'other';
      const count = categoryMap.get(category) || 0;
      categoryMap.set(category, count + 1);
    });
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [allFixes, selectedPage, filter, selectedImpact, isSliderOpen, sliderUrl]);

  // Filter fixes based on selected page, status, impact, and category
  const filteredFixes = useMemo(() => {
    return allFixes.filter(({ fix, url }) => {
      // Filter by page
      if (selectedPage !== 'all' && url !== selectedPage) return false;
      
      // Filter by status
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      
      // Filter by impact
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return false;
      
      // Filter by category
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return false;
      
      return true;
    });
  }, [allFixes, selectedPage, filter, selectedImpact, selectedCategory]);

  // Calculate "All" counts for each filter type (excluding its own filter)
  const allPagesCount = useMemo(() => {
    return allFixes.filter(({ fix }) => {
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return false;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return false;
      return true;
    }).length;
  }, [allFixes, filter, selectedImpact, selectedCategory]);

  const allImpactsCount = useMemo(() => {
    const currentPage = isSliderOpen && sliderUrl ? sliderUrl : selectedPage;
    return allFixes.filter(({ fix, url }) => {
      if (currentPage !== 'all' && url !== currentPage) return false;
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      if (selectedCategory !== 'all' && (fix.category || 'other') !== selectedCategory) return false;
      return true;
    }).length;
  }, [allFixes, filter, selectedPage, selectedCategory, isSliderOpen, sliderUrl]);

  const allCategoriesCount = useMemo(() => {
    const currentPage = isSliderOpen && sliderUrl ? sliderUrl : selectedPage;
    return allFixes.filter(({ fix, url }) => {
      if (currentPage !== 'all' && url !== currentPage) return false;
      if (filter === 'active' && fix.action === 'deleted') return false;
      if (filter === 'deleted' && fix.action !== 'deleted') return false;
      if (selectedImpact !== 'all' && (fix.impact || 'minor') !== selectedImpact) return false;
      return true;
    }).length;
  }, [allFixes, filter, selectedPage, selectedImpact, isSliderOpen, sliderUrl]);

  // Handle fix action update
  const handleFixAction = async (analysisId: string, fixIndex: number, action: 'update' | 'deleted') => {
    const fixId = `${analysisId}-${fixIndex}`;
    setUpdatingFixId(fixId);
    setConfirmModal({ isOpen: false, type: 'remove', analysisId: '', fixIndex: -1 });

    try {
      const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/domain-analyses/fix-action`;
      const token = getAuthenticationCookie();

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          analysisId,
          fixIndex,
          action, // Changed from newAction to action
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update fix action');
      }

      const updatedAnalysis = await response.json();

      // Update local state
      setAnalyses((prev) =>
        prev.map((a) => (a.id === analysisId ? updatedAnalysis : a))
      );
    } catch (error) {
      console.error('Error updating fix action:', error);
      alert(error instanceof Error ? error.message : 'Failed to update fix. Please try again.');
    } finally {
      setUpdatingFixId(null);
    }
  };

  const handleRemoveClick = (analysisId: string, fixIndex: number) => {
    setConfirmModal({
      isOpen: true,
      type: 'remove',
      analysisId,
      fixIndex,
    });
  };

  const handleRestoreClick = (analysisId: string, fixIndex: number) => {
    setConfirmModal({
      isOpen: true,
      type: 'restore',
      analysisId,
      fixIndex,
    });
  };

  const handleConfirmAction = () => {
    const { analysisId, fixIndex, type } = confirmModal;
    if (type === 'remove') {
      handleFixAction(analysisId, fixIndex, 'deleted');
    } else {
      handleFixAction(analysisId, fixIndex, 'update');
    }
  };

  // Calculate summary statistics for URL list
  const urlListStats = useMemo(() => {
    const totalFixes = urlList.reduce((sum, item) => sum + item.fixCount, 0);
    const totalEnabled = urlList.reduce((sum, item) => sum + item.activeFixCount, 0);
    const totalDisabled = urlList.reduce((sum, item) => sum + item.deletedFixCount, 0);
    const avgScore = urlList.length > 0
      ? urlList.reduce((sum, item) => sum + (item.score || 0), 0) / urlList.filter(item => item.score !== null).length
      : null;
    
    return { totalFixes, totalEnabled, totalDisabled, avgScore };
  }, [urlList]);

  // Render URL List View
  const renderUrlListView = () => (
    <div className="w-full h-full flex flex-col md:overflow-hidden">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 w-full max-w-full border border-gray-100 flex flex-col flex-1 md:overflow-hidden md:min-h-0">
        {/* Screen reader announcement for search results (announced when Find completes or result changes) */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {searchResultAnnouncement}
        </div>
        {/* Enhanced Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <button
                onClick={() => {
                  setCurrentView('domain-selection');
                  setSelectedDomain(null);
                  setSelectedOption(null);
                  setAnalyses([]);
                  setHasSearched(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0 group"
                title="Back to domain selection"
                aria-label="Back to domain selection"
              >
                <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
      
                {selectedDomain && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Favicon domain={selectedDomain} size={18} className="flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-600 truncate font-medium">{selectedDomain}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          {urlList.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Total Pages Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Total Pages</span>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0, 82, 204, 0.1)' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#0052CC' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{urlList.length}</div>
              </div>

              {/* Total Fixes Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Total Fixes</span>
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{urlListStats.totalFixes}</div>
              </div>

              {/* Enabled Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Enabled</span>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{urlListStats.totalEnabled}</div>
              </div>

              {/* Disabled Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Disabled</span>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{urlListStats.totalDisabled}</div>
              </div>
            </div>
          )}

          {/* Enhanced Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search pages by URL..."
              value={urlSearchQuery}
              onChange={(e) => setUrlSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-12 py-3 md:py-3.5 border-2 rounded-xl text-sm md:text-base focus:outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-600"
              style={{ borderColor: '#6b7280' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0052CC';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#6b7280';
                e.target.style.boxShadow = 'none';
              }}
            />
            {urlSearchQuery && (
              <button
                onClick={() => setUrlSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-100 rounded-r-xl transition-colors"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {urlSearchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 text-xs text-gray-600 px-4">
                Showing {filteredUrlList.length} of {urlList.length} pages
              </div>
            )}
          </div>
        </div>

        {/* URL Table */}
        <div className="flex-1 flex flex-col md:overflow-hidden md:min-h-0">
          {loader ? (
            <div className="flex justify-center py-12">
              <CircularProgress size={40} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => selectedDomain && fetchAnalyses(selectedDomain)}
                className="px-4 py-2 text-white rounded transition-colors"
                style={{ backgroundColor: '#0052CC' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0041A3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0052CC'}
              >
                Retry
              </button>
            </div>
          ) : filteredUrlList.length > 0 ? (
            <>
              {/* Mobile/Tablet Card View - for sm (≤768px) */}
              <div className="w-full block md:hidden space-y-3 pb-6">
                {filteredUrlList.map((item) => {
                let fullUrl = item.url;
                try {
                  if (!item.url.startsWith('http://') && !item.url.startsWith('https://')) {
                    fullUrl = `https://${item.url}`;
                  }
                } catch {
                  fullUrl = item.url;
                }
                return (
                  <div
                    key={item.url}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 82, 204, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    onClick={() => handleUrlClick(item.url)}
                  >
                    {/* URL Section */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-start gap-2 group/link transition-colors"
                        style={{ color: '#0052CC' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#003d99'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#0052CC'}
                        aria-label={`${item.url} (opens in a new tab)`}
                      >
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#0052CC' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="text-sm break-all flex-1 font-medium leading-relaxed">{item.url}</span>
                        <svg className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                        <div className="text-xs text-gray-600 mb-1.5 font-medium">Auto-Fixes</div>
                        <div className="text-2xl font-bold text-gray-900">{item.fixCount}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                        <div className="text-xs text-green-700 mb-1.5 font-medium">Enabled</div>
                        <div className="text-2xl font-bold text-green-800">{item.activeFixCount}</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                        <div className="text-xs text-red-600 mb-1.5 font-medium">Disabled</div>
                        <div className="text-2xl font-bold text-red-700">{item.deletedFixCount}</div>
                      </div>
                    </div>

                    {/* Action Buttons - Column layout for sm (≤768px) */}
                    <div className="flex flex-col sm:flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUrlClick(item.url);
                        }}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-100 whitespace-nowrap"
                        style={{ backgroundColor: '#0052CC' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0041A3'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0052CC'}
                      >
                        View Fixes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSuggestedFixesModal(item.url);
                        }}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-100 whitespace-nowrap"
                        style={{ backgroundColor: '#047857' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#047857'}
                      >
                        View Suggested
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

              {/* Desktop Table View - for md (≥768px) */}
              <div className="hidden md:flex w-full flex-1 overflow-hidden min-h-0">
                <div className="rounded-xl border border-gray-200 overflow-hidden flex-1 flex flex-col min-w-0 min-h-0">
                  <div className="overflow-y-auto flex-1 min-h-0">
                    <table className="w-full border-collapse min-w-[600px] bg-white">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">URL</th>
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Auto-Fixes</th>
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Enabled</th>
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Disabled</th>
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUrlList.map((item) => {
                    let fullUrl = item.url;
                    try {
                      if (!item.url.startsWith('http://') && !item.url.startsWith('https://')) {
                        fullUrl = `https://${item.url}`;
                      }
                    } catch {
                      fullUrl = item.url;
                    }
                    return (
                      <tr
                        key={item.url}
                        className="border-b border-gray-100 transition-all duration-200 cursor-pointer group"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 82, 204, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => handleUrlClick(item.url)}
                      >
                        <td className="py-4 px-4 min-w-[200px] max-w-[400px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 min-w-0 group/link transition-colors"
                              style={{ color: '#0052CC' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#003d99'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#0052CC'}
                              aria-label={`${item.url} (opens in a new tab)`}
                            >
                              <span className="text-sm break-words break-all font-medium">{item.url}</span>
                              <svg className="w-4 h-4 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-base font-semibold text-gray-900">{item.fixCount}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-base font-semibold text-green-800">{item.activeFixCount}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-base font-semibold text-red-600">{item.deletedFixCount}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUrlClick(item.url);
                              }}
                              className="px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md transform hover:scale-105"
                              style={{ backgroundColor: '#0052CC' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0041A3'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0052CC'}
                            >
                              View Fixes
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSuggestedFixesModal(item.url);
                              }}
                              className="px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md transform hover:scale-105"
                              style={{ backgroundColor: '#047857' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#047857'}
                            >
                              View Suggested
                            </button>
                          </div>
                        </td>
                      </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : urlList.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="No Pages Found. No pages have been analyzed for this domain yet."
            >
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full blur-xl opacity-50" style={{ backgroundColor: 'rgba(0, 82, 204, 0.2)' }}></div>
              <div className="relative p-6 rounded-2xl shadow-lg" style={{ backgroundColor: 'rgba(0, 82, 204, 0.1)' }}>
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#0052CC' }} aria-hidden="true" focusable="false">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pages Found</h3>
              <p className="text-gray-600 text-center max-w-md">
                No pages have been analyzed for this domain yet.
              </p>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`No Results Found. No pages match your search query "${urlSearchQuery}". Try a different search term.`}
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gray-100 rounded-full blur-xl opacity-50"></div>
                <div className="relative p-6 bg-gray-50 rounded-2xl shadow-lg">
                  <svg className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600 text-center max-w-md">
                No pages match your search query "{urlSearchQuery}". Try a different search term.
              </p>
              <button
                onClick={() => setUrlSearchQuery('')}
                className="mt-4 px-4 py-2 text-sm font-medium transition-colors"
                style={{ color: '#0052CC' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#003d99'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#0052CC'}
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Domain Selection View
  const renderDomainSelectionView = () => (
    <div className="w-full px-2 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Page Header - Outside the card */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Auto Fixes
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            View and manage accessibility auto-fixes applied by the widget across your websites
          </p>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 w-full">
          {/* Card Header Section */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
              Select a Domain
            </h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              Choose a domain to view and manage auto-fixes applied by the accessibility widget.
            </p>
          </div>

          {/* Input Section */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-6">
            <div className="flex-1">
              <label
                htmlFor="domain-select-input-main"
                className="block text-sm sm:text-base font-medium text-gray-700 mb-1"
              >
                Select a Domain
              </label>
              <Select
                inputId="domain-select-input-main"
                options={siteOptions}
                value={selectedOption}
                onChange={handleDomainChange}
                onInputChange={handleInputChange}
                placeholder="Enter your Domain URL (e.g. example.com)"
                isSearchable
                isClearable
                isLoading={sitesLoading}
                components={{
                  ClearIndicator: AccessibleClearIndicator,
                }}
                formatOptionLabel={(option: OptionType) => (
                  <div className="flex items-center gap-2 min-w-0">
                    <Favicon domain={option.value} size={16} className="flex-shrink-0" />
                    <span className="truncate min-w-0">{option.label}</span>
                  </div>
                )}
                classNamePrefix="react-select"
                className="w-full min-w-0"
                styles={{
                  control: (provided: any, state: any) => ({
                    ...provided,
                    borderRadius: '8px',
                    border: state.isFocused
                      ? '2px solid #0052CC'
                      : '1px solid #6b7280',
                    minHeight: '44px',
                    boxShadow: state.isFocused
                      ? '0 0 0 3px rgba(0, 82, 204, 0.1)'
                      : 'none',
                    fontSize: '14px',
                    '@media (min-width: 640px)': {
                      fontSize: '16px',
                      minHeight: '48px',
                    },
                    '&:hover': {
                      border: state.isFocused
                        ? '2px solid #0052CC'
                        : '1px solid #4b5563',
                    },
                  }),
                  placeholder: (provided: any) => ({
                    ...provided,
                    color: '#4b5563',
                    fontSize: '14px',
                    '@media (min-width: 640px)': {
                      fontSize: '16px',
                    },
                  }),
                  indicatorSeparator: () => ({
                    display: 'none',
                  }),
                  dropdownIndicator: (provided: any) => ({
                    ...provided,
                    color: '#767676',
                    '&:hover': {
                      color: '#767676',
                    },
                  }),
                  clearIndicator: (provided: any) => ({
                    ...provided,
                    color: '#767676',
                    '&:hover': {
                      color: '#767676',
                    },
                  }),
                }}
              />
            </div>

            <button
              type="button"
              className="text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors duration-200 min-w-[120px] sm:min-w-[140px] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-100"
              style={{
                backgroundColor: loader || !selectedDomain ? '#4b5563' : '#0052CC',
                '--tw-ring-color': '#0052CC',
              } as React.CSSProperties & { '--tw-ring-color': string }}
              onClick={handleFindAutoFixes}
              disabled={loader || !selectedDomain}
              aria-label={loader ? "Finding auto fixes, please wait" : "Find auto fixes"}
            >
              {loader ? (
                <CircularProgress size={18} sx={{ color: 'white' }} aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              <span className="hidden sm:inline">Find Auto Fixes</span>
              <span className="sm:hidden">Find</span>
            </button>
          </div>
          
          {/* Screen reader announcement for loading state (when Find is clicked, view switches to url-list so main announcement is there) */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {loader ? 'Finding auto fixes, please wait.' : ''}
          </div>
        </div>

        {/* Information Section Below Domain Selector */}
        <div className="mt-8 sm:mt-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Feature Card 1 */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(0, 82, 204, 0.1)' }}>
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: '#0052CC' }}
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">View All Fixes</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                See all accessibility fixes automatically applied by the widget across your website pages
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-green-50 rounded-lg">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Manage Fixes</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Enable or disable specific auto-fixes based on your website's needs and preferences
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-purple-50 rounded-lg">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Track Progress</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Monitor accessibility improvements and track fixes across different pages and categories
              </p>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm">
              <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: '#0052CC' }}
                  aria-hidden="true"
                  focusable="false"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How it works
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                The accessibility widget automatically scans your website and applies fixes for common accessibility issues. 
                You can review, enable, or disable these fixes from this dashboard.
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm">
              <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Benefits
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Improve your website's accessibility compliance, enhance user experience, and ensure your site is 
                accessible to all users, including those using assistive technologies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="domain-analyses-container min-h-screen md:h-screen md:overflow-hidden">
      {/* Two-column layout: Sidebar + Main Content */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 p-6 h-full md:overflow-hidden">
        {/* Left Sidebar - Only show in fixes-view */}
        {currentView === 'fixes-view' && (
          <aside className="lg:w-96 w-full lg:flex-shrink-0 flex">
            <div className="rounded-xl border-2 p-6 sticky top-4 w-full" style={{ backgroundColor: '#e9ecfb', borderColor: '#A2ADF3' }}>
              {/* Domain Selector */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0, 82, 204, 0.1)' }}>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: '#0052CC' }}
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Select Website
                  </h2>
                </div>
                <div>
                <label
                  htmlFor="domain-select-input"
                  className="block text-xs font-medium text-gray-700 mb-2"
                >
                  Domain name
                </label>
                <Select
                  inputId="domain-select-input"
                  options={siteOptions}
                  value={selectedOption}
                  onChange={handleDomainChange}
                  onInputChange={handleInputChange}
                  placeholder="Select a domain or paste a URL"
                  isSearchable
                  isClearable
                  isLoading={sitesLoading}
                  formatOptionLabel={(option: OptionType) => (
                    <div className="flex items-center gap-2 min-w-0">
                      <Favicon domain={option.value} size={16} className="flex-shrink-0" />
                      <span className="truncate min-w-0">{option.label}</span>
                    </div>
                  )}
                  classNamePrefix="react-select"
                  className="w-full"
                  styles={{
                    control: (base: any) => ({
                      ...base,
                      maxWidth: '100%',
                      borderColor: '#6b7280',
                      '&:hover': {
                        borderColor: '#4b5563',
                      },
                    }),
                    placeholder: (base: any) => ({
                      ...base,
                      color: '#4b5563',
                    }),
                    menu: (base: any) => ({
                      ...base,
                      maxWidth: '100%',
                    }),
                  }}
                />
              </div>
            </div>

            {/* Pages Filter */}
            {pages.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <svg
                      className="w-4 h-4 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Pages
                  </h2>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedPage('all')}
                    className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedPage === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={selectedPage === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      All Pages
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        selectedPage === 'all'
                          ? 'text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      style={selectedPage === 'all' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                    >
                      {allPagesCount}
                    </span>
                  </button>
                  <div className="pages-list-scrollable max-h-[400px] overflow-y-auto pr-1">
                    <div className="space-y-1.5">
                      {pages.map(({ url, count }) => {
                        let pathname = '/';
                        try {
                          pathname = new URL(url).pathname || '/';
                        } catch {
                          pathname = url;
                        }
                        return (
                          <button
                            key={url}
                            onClick={() => setSelectedPage(url)}
                            className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              selectedPage === url
                                ? 'text-white shadow-md'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                            style={selectedPage === url ? { backgroundColor: '#0052CC' } : {}}
                          >
                            <span className="truncate flex-1 text-left">{pathname}</span>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ml-2 ${
                                selectedPage === url
                                  ? 'text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                              style={selectedPage === url ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Impact Filter */}
            {impacts.length > 0 && (
              <div className="mb-6" role="radiogroup" aria-labelledby="sidebar-impact-heading">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 id="sidebar-impact-heading" className="text-sm font-bold text-gray-900">
                    Impact
                  </h2>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedImpact === 'all'}
                    onClick={() => setSelectedImpact('all')}
                    className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedImpact === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={selectedImpact === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    <span>All Impacts</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        selectedImpact === 'all'
                          ? 'text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      style={selectedImpact === 'all' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                    >
                      {allImpactsCount}
                    </span>
                  </button>
                  {impacts.map(({ impact, count }) => (
                    <button
                      key={impact}
                      type="button"
                      role="radio"
                      aria-checked={selectedImpact === impact}
                      onClick={() => setSelectedImpact(impact)}
                      className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedImpact === impact
                          ? 'text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                      style={selectedImpact === impact ? { backgroundColor: '#0052CC' } : {}}
                    >
                      <span className="capitalize">{impact}</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          selectedImpact === impact
                            ? 'text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                        style={selectedImpact === impact ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            {categories.length > 0 && (
              <div role="radiogroup" aria-labelledby="sidebar-category-heading">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h2 id="sidebar-category-heading" className="text-sm font-bold text-gray-900">
                    Category
                  </h2>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedCategory === 'all'}
                    onClick={() => setSelectedCategory('all')}
                    className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={selectedCategory === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    <span>All Categories</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        selectedCategory === 'all'
                          ? 'text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      style={selectedCategory === 'all' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                    >
                      {allCategoriesCount}
                    </span>
                  </button>
                  {categories.map(({ category, count }) => (
                    <button
                      key={category}
                      type="button"
                      role="radio"
                      aria-checked={selectedCategory === category}
                      onClick={() => setSelectedCategory(category)}
                      className={`page-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === category
                          ? 'text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                      style={selectedCategory === category ? { backgroundColor: '#0052CC' } : {}}
                    >
                      <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          selectedCategory === category
                            ? 'text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                        style={selectedCategory === category ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear All Filters Button */}
            {(selectedPage !== 'all' || filter !== 'all' || selectedImpact !== 'all' || selectedCategory !== 'all') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedPage('all');
                    setFilter('all');
                    setSelectedImpact('all');
                    setSelectedCategory('all');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </aside>
        )}

        {/* Main Content Area - use div to avoid duplicate main landmark (layout already has main) */}
        <div className="domain-analyses-content flex-1 min-w-0 flex md:overflow-hidden">
          {currentView === 'domain-selection' && renderDomainSelectionView()}
          {currentView === 'url-list' && renderUrlListView()}
          {currentView === 'fixes-view' && (
            <div className="bg-white rounded-xl border-2 p-4 sm:p-6 md:p-7 w-full max-w-full overflow-hidden" style={{ borderColor: '#A2ADF3' }}>
              {/* Header */}
              <div className="flex flex-col gap-4 mb-7 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToUrlList}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Back to pages"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div className="p-2.5 rounded-lg shadow-md" style={{ backgroundColor: '#0052CC' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                      Auto Fixes
                    </h1>
                    {selectedPage !== 'all' && (
                      <p className="text-sm text-gray-600 mt-1 truncate">{selectedPage}</p>
                    )}
                  </div>
                </div>
              
                {filteredFixes.length > 0 && (
                  <p className="text-sm text-gray-600 flex items-center gap-2 sm:ml-14">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#0052CC' }}></span>
                    {filteredFixes.length} auto-fix{filteredFixes.length !== 1 ? 'es' : ''} applied
                  </p>
                )}

              {/* Filter Buttons - radio group for status */}
              {allFixes.length > 0 && (
                <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="All Fixes">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filter === 'all'}
                    onClick={() => setFilter('all')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                    style={filter === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filter === 'active'}
                    onClick={() => setFilter('active')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'active'
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                    style={filter === 'active' ? { backgroundColor: '#15803d' } : {}}
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filter === 'deleted'}
                    onClick={() => setFilter('deleted')}
                    className={`filter-button px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'deleted'
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                    style={filter === 'deleted' ? { backgroundColor: '#dc2626' } : {}}
                  >
                    Disabled
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            {loader ? (
              <div className="flex justify-center py-12">
                <CircularProgress size={40} />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => selectedDomain && fetchAnalyses(selectedDomain)}
                  className="px-4 py-2 text-white rounded transition-colors"
                  style={{ backgroundColor: '#0052CC' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0041A3'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0052CC'}
                >
                  Retry
                </button>
              </div>
            ) : !hasSearched ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse" style={{ backgroundColor: 'rgba(0, 82, 204, 0.2)' }}></div>
                  <div className="relative p-6 rounded-2xl shadow-lg" style={{ backgroundColor: 'rgba(0, 82, 204, 0.1)' }}>
                    <svg
                      className="h-16 w-16"
                      style={{ color: '#0052CC' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Select a website from the left sidebar to view auto-fixes applied by the widget
                </p>
              </div>
            ) : filteredFixes.length > 0 ? (
              <div className="w-full overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
                  {filteredFixes.map(({ fix, url, analysisId, fixIndex }) => {
                    const fixId = `${analysisId}-${fixIndex}`;
                    return (
                      <FixCard
                        key={fixId}
                        fix={fix}
                        url={url}
                        onRemove={() => handleRemoveClick(analysisId, fixIndex)}
                        onRestore={() => handleRestoreClick(analysisId, fixIndex)}
                        isUpdating={updatingFixId === fixId}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-50"></div>
                  <div className="relative p-6 bg-green-50 rounded-2xl shadow-lg">
                    <svg
                      className="h-16 w-16 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filter === 'deleted'
                    ? 'No Disabled Auto-Fixes'
                    : filter === 'active'
                    ? 'No Enabled Auto-Fixes'
                    : 'All Clear!'}
                </h3>
                <p className="text-gray-600 text-center max-w-md">
                  {filter === 'deleted'
                    ? 'No disabled auto-fixes found for the selected filters'
                    : filter === 'active'
                    ? 'No enabled auto-fixes found for the selected filters'
                    : 'No auto-fixes found for this website. The widget has not applied any fixes yet.'}
                </p>
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      {/* Fixes Slider - Opens from Right */}
      {isSliderOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={handleCloseSlider}
          />

          {/* Slider Panel - focus trapped, role dialog for SR */}
          <div
            ref={sliderPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-fixes-slider-title"
            tabIndex={-1}
            className="fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out outline-none"
            style={{
              width: 'min(90vw, 1200px)',
              height: '100vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Slider Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0" style={{ borderColor: '#A2ADF3' }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2.5 rounded-lg shadow-md" style={{ backgroundColor: '#0052CC' }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 id="auto-fixes-slider-title" className="text-xl md:text-2xl font-bold text-gray-900">Auto Fixes</h2>
                  {sliderUrl && (
                    <p className="text-sm text-gray-600 mt-1 truncate">{sliderUrl}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSlider}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors ml-4 flex-shrink-0"
                aria-label="Close slider"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Slider Tabs: Fixes | Page HTML */}
            <div className="flex-shrink-0 flex border-b bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
              <button
                onClick={() => setSliderTab('fixes')}
                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  sliderTab === 'fixes'
                    ? 'text-gray-900 border-current'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={sliderTab === 'fixes' ? { borderColor: '#0052CC', color: '#0052CC' } : {}}
              >
                Fixes
              </button>
              {/* <button
                onClick={() => setSliderTab('page-html')}
                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  sliderTab === 'page-html'
                    ? 'text-gray-900 border-current'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={sliderTab === 'page-html' ? { borderColor: '#0052CC', color: '#0052CC' } : {}}
              >
                Page HTML
              </button> */}
            </div>

            {/* Filter Buttons - only when Fixes tab */}
            {sliderTab === 'fixes' && (
            <div className="flex-shrink-0 border-b overflow-hidden" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
              {/* Collapsible toggle - visible only in sm view (≤768px) */}
              <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-gray-200" style={{ borderColor: '#e5e7eb' }}>
                <span className="text-sm font-semibold text-gray-700">Filters</span>
                <button
                  type="button"
                  onClick={() => setSliderFiltersExpanded((v) => !v)}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  aria-expanded={sliderFiltersExpanded}
                  aria-controls="slider-filters-content"
                  id="slider-filters-toggle"
                  aria-label={sliderFiltersExpanded ? 'Collapse filters' : 'Expand filters'}
                >
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${sliderFiltersExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <div
                id="slider-filters-content"
                role="region"
                aria-labelledby="slider-filters-toggle"
                className={`px-4 sm:px-5 py-3.5 sm:max-h-[220px] sm:overflow-y-auto ${!sliderFiltersExpanded ? 'hidden' : ''} md:!block`}
              >
                {/* Status Filters Row - radio group for status */}
                <div className="flex flex-wrap items-center gap-2 mb-3" role="radiogroup" aria-label="All Fixes">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filter === 'all'}
                    onClick={() => setFilter('all')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'all'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={filter === 'all' ? { backgroundColor: '#0052CC' } : {}}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    All
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filter === 'active'}
                    onClick={() => setFilter('active')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'active'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={filter === 'active' ? { backgroundColor: '#15803d' } : {}}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Enabled
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filter === 'deleted'}
                    onClick={() => setFilter('deleted')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filter === 'deleted'
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    style={filter === 'deleted' ? { backgroundColor: '#dc2626' } : {}}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Disabled
                  </button>
                </div>

                {/* Impact & Category Filters Row */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Impact Filters - radiogroup so list/selection is announced */}
                  {impacts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-labelledby="slider-impact-label">
                      <span id="slider-impact-label" className="text-gray-600 font-semibold mr-1">Impact:</span>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedImpact === 'all'}
                        onClick={() => setSelectedImpact('all')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          selectedImpact === 'all'
                            ? 'text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                        }`}
                        style={selectedImpact === 'all' ? { backgroundColor: '#0052CC' } : {}}
                      >
                        All <span className={`ml-0.5 ${selectedImpact === 'all' ? 'opacity-80' : 'text-gray-500'}`}>({allImpactsCount})</span>
                      </button>
                      {impacts.map(({ impact, count }) => (
                        <button
                          key={impact}
                          type="button"
                          role="radio"
                          aria-checked={selectedImpact === impact}
                          onClick={() => setSelectedImpact(impact)}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all capitalize ${
                            selectedImpact === impact
                              ? 'text-white shadow-sm'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                          }`}
                          style={selectedImpact === impact ? { backgroundColor: '#0052CC' } : {}}
                        >
                          {impact} <span className={`ml-0.5 ${selectedImpact === impact ? 'opacity-80' : 'text-gray-500'}`}>({count})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Divider */}
                  {impacts.length > 0 && categories.length > 0 && (
                    <div className="h-4 w-px bg-gray-300" aria-hidden="true"></div>
                  )}

                  {/* Category Filters - radiogroup so list/selection is announced */}
                  {categories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-labelledby="slider-category-label">
                      <span id="slider-category-label" className="text-gray-600 font-semibold mr-1">Category:</span>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedCategory === 'all'}
                        onClick={() => setSelectedCategory('all')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          selectedCategory === 'all'
                            ? 'text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                        }`}
                        style={selectedCategory === 'all' ? { backgroundColor: '#0052CC' } : {}}
                      >
                        All <span className={`ml-0.5 ${selectedCategory === 'all' ? 'opacity-80' : 'text-gray-500'}`}>({allCategoriesCount})</span>
                      </button>
                      {categories.map(({ category, count }) => (
                        <button
                          key={category}
                          type="button"
                          role="radio"
                          aria-checked={selectedCategory === category}
                          onClick={() => setSelectedCategory(category)}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            selectedCategory === category
                              ? 'text-white shadow-sm'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                          }`}
                          style={selectedCategory === category ? { backgroundColor: '#0052CC' } : {}}
                        >
                          {category.replace(/_/g, ' ')} <span className={`ml-0.5 ${selectedCategory === category ? 'opacity-80' : 'text-gray-500'}`}>({count})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Results Count */}
                {sliderFixes.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-200">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#0052CC' }}></span>
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#0052CC' }}></span>
                      </span>
                      <span className="font-semibold text-gray-900">{sliderFixes.length} auto-fix{sliderFixes.length !== 1 ? 'es' : ''}</span>
                      <span className="text-gray-500">displayed</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Slider Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {sliderTab === 'page-html' ? (
                /* Page HTML tab */
                <>
                  {pageHtml.loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <CircularProgress size={40} />
                      <p className="text-gray-500 mt-4 text-sm">Loading page HTML…</p>
                    </div>
                  ) : pageHtml.error ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <p className="text-red-600 text-center mb-4">{pageHtml.error}</p>
                      <button
                        type="button"
                        onClick={() => sliderUrl && fetchPageHtml(sliderUrl, sliderAnalysis?.url_hash ?? null)}
                        className="px-4 py-2 text-white rounded-lg transition-colors font-medium"
                        style={{ backgroundColor: '#0052CC' }}
                      >
                        Retry
                      </button>
                    </div>
                  ) : pageHtml.html != null ? (
                    <div className="flex flex-col h-full min-h-0">
                      <div className="flex-shrink-0 flex items-center gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setPageHtmlView('preview')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            pageHtmlView === 'preview' ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                          }`}
                          style={pageHtmlView === 'preview' ? { backgroundColor: '#0052CC' } : {}}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageHtmlView('source')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            pageHtmlView === 'source' ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                          }`}
                          style={pageHtmlView === 'source' ? { backgroundColor: '#0052CC' } : {}}
                        >
                          Source
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageHtmlView('suggested-fixes')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            pageHtmlView === 'suggested-fixes' ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                          }`}
                          style={pageHtmlView === 'suggested-fixes' ? { backgroundColor: '#0052CC' } : {}}
                        >
                          Suggested Fixes
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
                        {pageHtmlView === 'suggested-fixes' ? (
                          <div className="w-full h-full min-h-[400px] p-4 overflow-y-auto">
                            {!sliderAnalysis ? (
                              <p className="text-gray-500 text-sm">No analysis for this URL. View fixes first.</p>
                            ) : (
                              <>
                                <div className="flex items-center justify-between gap-4 mb-4">
                                  <p className="text-sm text-gray-600">
                                    Get AI-suggested accessibility fixes for this page. Existing fixes are sent so duplicates are avoided.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={fetchSuggestedFixes}
                                    disabled={suggestedFixesLoading}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0 disabled:opacity-50"
                                    style={{ backgroundColor: '#0052CC' }}
                                  >
                                    {suggestedFixesLoading ? 'Loading…' : 'Get suggestions'}
                                  </button>
                                </div>
                                {suggestedFixes.length === 0 && !suggestedFixesLoading && (
                                  <p className="text-gray-500 text-sm">
                                    Click "Get suggestions" to fetch AI-generated fixes.
                                  </p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {suggestedFixes.map((fix, idx) => (
                                    <SuggestedFixCard
                                      key={`${fix.selector}-${fix.issue_type}-${idx}`}
                                      fix={fix}
                                      url={sliderUrl ?? ''}
                                      onAccept={() => handleAcceptSuggestedFix(fix, idx)}
                                      onReject={() => handleRejectSuggestedFix(idx)}
                                      isUpdating={acceptingFixKey === `suggested-${idx}-${fix.selector}-${fix.issue_type}`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        ) : pageHtmlView === 'preview' ? (
                          <iframe
                            title="Page preview"
                            srcDoc={pageHtml.html}
                            sandbox="allow-same-origin"
                            className="w-full h-full min-h-[400px] border-0"
                          />
                        ) : (
                          <pre className="w-full h-full min-h-[400px] p-4 overflow-auto text-xs font-mono text-gray-800 whitespace-pre-wrap break-all bg-gray-50">
                            {pageHtml.html}
                          </pre>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                      <p className="text-sm">No HTML available for this URL.</p>
                    </div>
                  )}
                </>
              ) : loader ? (
                <div className="flex justify-center py-12">
                  <CircularProgress size={40} />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={() => selectedDomain && fetchAnalyses(selectedDomain)}
                    className="px-4 py-2 text-white rounded transition-colors"
                    style={{ backgroundColor: '#0052CC' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0041A3'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0052CC'}
                  >
                    Retry
                  </button>
                </div>
              ) : sliderFixes.length > 0 ? (
                <div className="w-full overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full">
                    {sliderFixes.map(({ fix, url, analysisId, fixIndex }) => {
                      const fixId = `${analysisId}-${fixIndex}`;
                      return (
                        <FixCard
                          key={fixId}
                          fix={fix}
                          url={url}
                          onRemove={() => handleRemoveClick(analysisId, fixIndex)}
                          onRestore={() => handleRestoreClick(analysisId, fixIndex)}
                          isUpdating={updatingFixId === fixId}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-50"></div>
                    <div className="relative p-6 bg-green-50 rounded-2xl shadow-lg">
                      <svg
                        className="h-16 w-16 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {filter === 'deleted'
                      ? 'No Disabled Auto-Fixes'
                      : filter === 'active'
                      ? 'No Enabled Auto-Fixes'
                      : 'All Clear!'}
                  </h3>
                  <p className="text-gray-600 text-center max-w-md">
                    {filter === 'deleted'
                      ? 'No disabled auto-fixes found for the selected filters'
                      : filter === 'active'
                      ? 'No enabled auto-fixes found for the selected filters'
                      : 'No auto-fixes found for this page.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={confirmModal.isOpen} ariaLabelledBy="confirm-modal-title">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${
              confirmModal.type === 'remove' ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {confirmModal.type === 'remove' ? (
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h2 id="confirm-modal-title" className="text-xl font-bold text-gray-900">
              {confirmModal.type === 'remove' ? 'Disable Auto-Fix?' : 'Enable Auto-Fix?'}
            </h2>
          </div>

          <p className="text-gray-700 mb-6">
            {confirmModal.type === 'remove'
              ? 'Are you sure you want to disable this auto-fix? The widget will stop applying this fix to your website.'
              : 'Are you sure you want to enable this auto-fix? The widget will start applying this fix to your website.'}
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmModal({ isOpen: false, type: 'remove', analysisId: '', fixIndex: -1 })}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={updatingFixId !== null}
              className={`px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                confirmModal.type === 'remove'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {updatingFixId !== null
                ? confirmModal.type === 'remove'
                  ? 'Disabling...'
                  : 'Enabling...'
                : confirmModal.type === 'remove'
                ? 'Disable'
                : 'Enable'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Suggested Fixes Modal */}
      <Modal
        isOpen={suggestedFixesModal.isOpen}
        ariaLabelledBy="suggested-fixes-modal-title"
        ariaDescribedBy="suggested-fixes-modal-description"
      >
        <div className="p-4">
          {/* Screen reader announcement for loading and result */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {suggestedFixesModalAnnouncement}
          </div>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={handleCloseSuggestedFixesModal}
              className="transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
              style={{ color: '#6b7280' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#4b5563'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; }}
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {modalSuggestedFixesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              {/* Central Scanner Icon */}
              <motion.div
                className="relative mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Scanning rings */}
                {[0, 1, 2].map((ring) => (
                  <motion.div
                    key={ring}
                    className="absolute inset-0 rounded-full"
                    animate={{
                      scale: [1, 1.3 + ring * 0.2, 1],
                      opacity: [0.6, 0.2, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: ring * 0.3,
                      ease: 'easeInOut',
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-full border-2 border-blue-400"
                      style={{
                        borderStyle: ring === 0 ? 'solid' : 'dashed',
                        ...(ring === 1 && { borderDasharray: '8 4' }),
                        ...(ring === 2 && { borderDasharray: '4 8' }),
                      }}
                    />
                  </motion.div>
                ))}

                {/* Main Scanner Icon */}
                <motion.div
                  className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-2xl"
                  animate={{
                    boxShadow: [
                      '0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.2)',
                      '0 25px 35px -5px rgba(59, 130, 246, 0.5), 0 15px 15px -5px rgba(59, 130, 246, 0.3)',
                      '0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.2)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <motion.svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </motion.svg>
                </motion.div>

                {/* Data particles being extracted */}
                {[...Array(6)].map((_, i) => {
                  const angle = (i * Math.PI * 2) / 6;
                  const radius = 50;
                  return (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-blue-400 rounded-full"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        x: [
                          Math.cos(angle) * 0,
                          Math.cos(angle) * radius,
                          Math.cos(angle) * radius * 1.5,
                        ],
                        y: [
                          Math.sin(angle) * 0,
                          Math.sin(angle) * radius,
                          Math.sin(angle) * radius * 1.5,
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
              </motion.div>

              {/* Title and Description */}
              <motion.h3
                className="text-2xl font-bold text-gray-900 mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Scanning & Analyzing Page
              </motion.h3>
              <motion.p
                className="text-gray-600 text-center max-w-md mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Our AI is scraping the HTML, analyzing accessibility issues, and generating fix suggestions...
              </motion.p>

              {/* Progress Indicators */}
              <div className="w-full max-w-md space-y-4">
                {/* Scanning Steps */}
                <div className="space-y-2">
                  {['Extracting HTML elements', 'Analyzing accessibility patterns', 'Generating fix suggestions'].map((step, i) => (
                    <motion.div
                      key={step}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.2 }}
                    >
                      <motion.div
                        className="w-2 h-2 bg-blue-500 rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.5,
                        }}
                      />
                      <span className="text-sm text-gray-600">{step}</span>
                      <motion.span
                        className="ml-auto text-xs text-blue-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.5,
                        }}
                      >
                        {i === 0 ? '...' : i === 1 ? '...' : '...'}
                      </motion.span>
                    </motion.div>
                  ))}
                </div>

                {/* Progress Bar */}
                <motion.div
                  className="w-full h-2 bg-gray-200 rounded-full overflow-hidden relative mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: ['0%', '100%'] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-white opacity-40"
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      width: '40%',
                      transform: 'skewX(-25deg)',
                    }}
                  />
                </motion.div>
              </div>
            </div>
          ) : modalSuggestedFixes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center max-w-md"
              >
                {/* Animated Success Icon with Glow Effect */}
                <motion.div
                  className="relative mb-8 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: 0.2,
                    type: 'spring',
                    stiffness: 200,
                    damping: 15
                  }}
                >
                  {/* Outer glow rings */}
                  <motion.div
                    className="absolute w-32 h-32 bg-green-200 rounded-full opacity-30"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.1, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <motion.div
                    className="absolute w-24 h-24 bg-green-300 rounded-full opacity-40"
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.4, 0.2, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 0.3,
                    }}
                  />
                  
                  {/* Main icon container */}
                  <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <motion.svg
                      className="w-12 h-12 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  </div>
                </motion.div>

                {/* Title with fade-in - h2 for correct heading level in modal */}
                <motion.h2
                  className="text-3xl font-bold text-gray-900 mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  No Fixes Found
                </motion.h2>

                {/* Subtitle with fade-in */}
                <motion.p
                  className="text-lg text-gray-600 leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  All fixes are already implemented
                </motion.p>

                {/* Decorative elements */}
                <motion.div
                  className="mt-8 flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-green-400 rounded-full"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Card Container */}
              <div className="relative min-h-[400px] flex items-center justify-center overflow-hidden">
                <AnimatePresence>
                  {modalSuggestedFixes[currentFixIndex] && (
                    <motion.div
                      key={`fix-${modalSuggestedFixes[currentFixIndex]?.selector}-${modalSuggestedFixes[currentFixIndex]?.issue_type}-${currentFixIndex}`}
                      initial={{ opacity: 0, scale: 0.8, y: 50 }}
                      animate={
                        swipingFix && swipingFix.index === currentFixIndex
                          ? {
                              x: swipingFix.direction === 'right' ? 1000 : -1000,
                              opacity: 0,
                              rotate: swipingFix.direction === 'right' ? 15 : -15,
                            }
                          : { opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 }
                      }
                      exit={{ opacity: 0, scale: 0.8, y: -50 }}
                      transition={{ 
                        duration: 0.4,
                        ease: 'easeInOut'
                      }}
                      className="w-full"
                    >
                      <SuggestedFixCard
                        fix={modalSuggestedFixes[currentFixIndex]}
                        url={suggestedFixesModal.url ?? ''}
                        onAccept={() => {
                          const fix = modalSuggestedFixes[currentFixIndex];
                          const index = currentFixIndex;
                          handleModalAcceptFix(fix, index);
                        }}
                        onReject={() => {
                          const index = currentFixIndex;
                          handleModalRejectFix(index);
                        }}
                        isUpdating={
                          acceptingFixKey ===
                          `modal-suggested-${currentFixIndex}-${modalSuggestedFixes[currentFixIndex]?.selector}-${modalSuggestedFixes[currentFixIndex]?.issue_type}`
                        }
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Single Pair of Action Buttons - stacked in sm (≤768px), row from md up */}
              <motion.div
                className="flex flex-col md:flex-row items-center justify-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!modalSuggestedFixes[currentFixIndex]) return;
                    const index = currentFixIndex;
                    handleModalRejectFix(index);
                  }}
                  disabled={
                    acceptingFixKey ===
                    `modal-suggested-${currentFixIndex}-${modalSuggestedFixes[currentFixIndex]?.selector}-${modalSuggestedFixes[currentFixIndex]?.issue_type}`
                  }
                  className="px-6 py-3 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  style={{ backgroundColor: '#b91c1c' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#991b1b'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!modalSuggestedFixes[currentFixIndex]) return;
                    const fix = modalSuggestedFixes[currentFixIndex];
                    const index = currentFixIndex;
                    handleModalAcceptFix(fix, index);
                  }}
                  disabled={
                    acceptingFixKey ===
                    `modal-suggested-${currentFixIndex}-${modalSuggestedFixes[currentFixIndex]?.selector}-${modalSuggestedFixes[currentFixIndex]?.issue_type}`
                  }
                  className="px-6 py-3 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  style={{ backgroundColor: '#15803d' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#166534'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#15803d'; }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Accept
                </button>
              </motion.div>

              {/* Progress Dots */}
              {modalSuggestedFixes.length > 1 && (
                <motion.div
                  className="flex items-center justify-center gap-2 pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {modalSuggestedFixes.map((fix, idx) => (
                    <button
                      key={`dot-${fix.selector}-${fix.issue_type}-${idx}`}
                      onClick={() => {
                        if (idx >= 0 && idx < modalSuggestedFixes.length) {
                          setCurrentFixIndex(idx);
                        }
                      }}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentFixIndex
                          ? 'bg-blue-600 w-8'
                          : 'bg-gray-300 hover:bg-gray-400 w-2'
                      }`}
                      aria-label={`Go to fix ${idx + 1} of ${modalSuggestedFixes.length}`}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DomainAnalyses;
