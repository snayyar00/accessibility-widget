import React, { useEffect, useState, useRef } from 'react';
import ProblemCard from './ProblemCard';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { reportsTourSteps, tourKeys } from '@/constants/toursteps';
import { getAuthenticationCookie } from '@/utils/cookie';
import { useQuery } from '@apollo/client';
import { GetUserSitesDocument } from '@/generated/graphql';

export interface Problem {
  id: number;
  site_id: number;
  issue_type: 'bug' | 'accessibility';
  site_url: string;
  description: string;
  reporter_email: string;
  created_at: string;
}

const ProblemReport: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.problem_reports') });
  const [problemArray, setProblemArray] = useState<Problem[]>([]);
  const { data, loading } = useSelector((state: RootState) => state.user);
  const [loader, setLoader] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'bug' | 'accessibility'>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [domainSearchTerm, setDomainSearchTerm] = useState<string>('');
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);

  const isMounted = useRef(true);

  // Fetch user sites
  const { data: sitesData, loading: sitesLoading } =
    useQuery(GetUserSitesDocument);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Reports tour completed!');
  };

  const fetchProblemReports = async () => {
    setLoader(true);
    setError(null);
    const url = `${process.env.REACT_APP_BACKEND_URL}/get-problem-reports`;
    const bodyData = { user_id: data.id };

    const token = getAuthenticationCookie();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Server error: ${errorText}`);
      }

      const responseData = await response.json();

      if (isMounted.current) {
        setProblemArray(responseData || []);
        setLoader(false);
        setError(null);
      }
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
      if (isMounted.current) {
        setProblemArray([]);
        setLoader(false);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch problem reports',
        );
      }
    }
  };

  useEffect(() => {
    fetchProblemReports();
  }, [data.current_organization_id]);

  const filteredProblems = problemArray.filter((problem) => {
    const matchesType = filter === 'all' ? true : problem.issue_type === filter;
    const matchesDomain =
      selectedDomain === 'all' ? true : problem.site_url === selectedDomain;
    return matchesType && matchesDomain;
  });

  // Filter domains based on search term
  const filteredDomains =
    sitesData?.getUserSites?.filter((site) =>
      site?.url?.toLowerCase().includes(domainSearchTerm.toLowerCase()),
    ) || [];

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    setDomainSearchTerm(domain === 'all' ? '' : domain);
    setIsDomainDropdownOpen(false);
  };

  const handleDomainInputChange = (value: string) => {
    setDomainSearchTerm(value);
    setIsDomainDropdownOpen(true);

    // If user types something that doesn't match any domain, allow custom filtering
    if (value === '') {
      setSelectedDomain('all');
    } else {
      // Check if the typed value exactly matches a domain
      const exactMatch = sitesData?.getUserSites?.find(
        (site) => site?.url === value,
      );
      if (exactMatch) {
        setSelectedDomain(value);
      } else {
        // Allow custom domain filtering
        setSelectedDomain(value);
      }
    }
  };

  return (
    <>
      <TourGuide
        steps={reportsTourSteps}
        tourKey={tourKeys.reports}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />

      <div className="min-h-screen py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <header className="reports-page-header mb-8 sm:mb-12 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900">
              Reported Problems
            </h1>
            <p className="mt-3 max-w-md mx-auto text-sm sm:text-base md:text-lg text-gray-500 md:mt-5 md:max-w-3xl">
              View and manage issues reported across your websites
            </p>
          </header>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading problem reports
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="bg-red-50 px-2 py-1 text-sm font-medium text-red-800 hover:bg-red-100 rounded-md"
                      onClick={fetchProblemReports}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loader ? (
            <div className="flex justify-center">
              <CircularProgress
                size={100}
                sx={{ color: '#0080ff' }}
                className="mx-auto my-auto"
              />
            </div>
          ) : (
            <>
              <div className="mb-6 sm:mb-8 flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-center lg:justify-center">
                <div className="w-full lg:w-auto">
                  <select
                    className="w-full lg:w-auto text-sm sm:text-base inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-3 border border-transparent font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as typeof filter)}
                  >
                    <option value="all">All Problems</option>
                    <option value="bug">Site Bugs</option>
                    <option value="accessibility">Accessibility Issues</option>
                  </select>
                </div>

                <div className="w-full lg:flex-1 lg:max-w-md relative">
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-2 sm:px-5 sm:py-3 border border-gray-300 rounded-md text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-500 pr-10"
                      placeholder="Search or select domain..."
                      value={domainSearchTerm}
                      onChange={(e) => handleDomainInputChange(e.target.value)}
                      onFocus={() => setIsDomainDropdownOpen(true)}
                      disabled={sitesLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() =>
                        setIsDomainDropdownOpen(!isDomainDropdownOpen)
                      }
                    >
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          isDomainDropdownOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {isDomainDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="py-1">
                        {filteredDomains.map((site) => (
                          <div
                            key={site?.id}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleDomainSelect(site?.url || '')}
                          >
                            {site?.url}
                          </div>
                        ))}
                        {filteredDomains.length === 0 && domainSearchTerm && (
                          <div className="px-4 py-2 text-sm text-gray-500 italic">
                            No domains found matching "{domainSearchTerm}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="reports-grid-section grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredProblems.map((problem) => (
                  <div key={problem.id} className="problem-card">
                    <ProblemCard problem={problem} />
                  </div>
                ))}
              </div>

              {problemArray.length === 0 && !loader && !error && (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No problem reports
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't received any problem reports yet. They will
                    appear here when users report issues with your websites.
                  </p>
                </div>
              )}

              {filteredProblems.length === 0 && problemArray.length > 0 && (
                <p className="text-center text-gray-500 mt-8">
                  No problems found matching your criteria.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProblemReport;
