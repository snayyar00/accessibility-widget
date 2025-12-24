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
import GET_USER_SITES from '@/queries/sites/getSites';
import { Site } from '@/generated/graphql';
import notFoundImage from '@/assets/images/not_found_image.png';
import Favicon from '@/components/Common/Favicon';

export interface Problem {
  id: number;
  site_id: number;
  issue_type: 'bug' | 'accessibility';
  site_url: string;
  description: string;
  reporter_email: string;
  created_at: string;
  fixed: boolean;
}

const ProblemReport: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.problem_reports') });
  const [problemArray, setProblemArray] = useState<Problem[]>([]);
  const { data, loading } = useSelector((state: RootState) => state.user);
  const [loader, setLoader] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'bug' | 'accessibility'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'solved'>(
    'active',
  );
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [domainSearchTerm, setDomainSearchTerm] = useState<string>('');
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);

  const isMounted = useRef(true);

  // Fetch user sites
  const { data: sitesData, loading: sitesLoading } =
    useQuery(GET_USER_SITES);

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

  // First filter by domain and issue type (without status filter)
  const issuesFilteredByDomainAndType = problemArray.filter((problem) => {
    const matchesType = filter === 'all' ? true : problem.issue_type === filter;
    const matchesDomain =
      selectedDomain === 'all' ? true : problem.site_url === selectedDomain;
    return matchesType && matchesDomain;
  });

  // Calculate counts for the tabs based on filtered data
  const activeIssuesCount = issuesFilteredByDomainAndType.filter(
    (problem) => !problem.fixed,
  ).length;
  const solvedIssuesCount = issuesFilteredByDomainAndType.filter(
    (problem) => problem.fixed,
  ).length;

  // Final filter that includes status filter for display
  const filteredProblems = issuesFilteredByDomainAndType.filter((problem) => {
    const matchesStatus =
      statusFilter === 'active' ? !problem.fixed : problem.fixed;
    return matchesStatus;
  });

  // Filter domains based on search term
  const filteredDomains =
    sitesData?.getUserSites?.sites?.filter((site: Site | null | undefined) =>
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
      const exactMatch = sitesData?.getUserSites?.sites?.find(
        (site: Site | null | undefined) => site?.url === value,
      );
      if (exactMatch) {
        setSelectedDomain(value);
      } else {
        // Allow custom domain filtering
        setSelectedDomain(value);
      }
    }
  };

  const handleToggleFixed = async (problemId: number) => {
    const token = getAuthenticationCookie();
    const url = `${process.env.REACT_APP_BACKEND_URL}/toggle-problem-report-fixed/${problemId}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Server error: ${errorText}`);
      }

      // Update the local state to reflect the change
      setProblemArray((prevArray) =>
        prevArray.map((problem) =>
          problem.id === problemId
            ? { ...problem, fixed: !problem.fixed }
            : problem,
        ),
      );
    } catch (error) {
      console.error('Error toggling fixed status:', error);
      // You might want to show a toast notification here
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

      <div className="relative">
        {/* Dotted pattern background */}
        <div className="absolute inset-0 bg-dotted-pattern opacity-20 -z-10"></div>

        <div className="relative z-0 pl-2 pb-2 sm:pb-4 md:pb-6 px-4 sm:px-6 lg:px-8">
          <div className="w-full">
            <header className="mb-1 sm:mb-2 text-left">
              <h1 className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl  text-gray-900">
                Issues
              </h1>
            </header>

            {/* Search/Filter Card */}
            <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="mb-3 sm:mb-4 pl-4 pt-4">
                <h2 className="text-2xl sm:text-xl md:text-2xl text-gray-900 mb-1 sm:mb-2">
                  Reported Problems
                </h2>
                <p className="text-base sm:text-sm md:text-base text-gray-500">
                  View and manage issues reported across your websites
                </p>
              </div>

              {!loader && (
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-center pl-2 pt-2 pb-4">
                  <div className="w-full lg:w-auto relative">
                    <select
                      className="w-full lg:w-auto text-xs sm:text-sm md:text-base inline-flex items-center justify-center pl-3 pr-8 py-2 sm:pl-4 sm:pr-10 sm:py-2 md:pl-5 md:pr-12 md:py-3 border border-transparent font-medium rounded-md text-white bg-[#3343AD] hover:bg-[#2a3699] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3343AD] transition-colors duration-200 appearance-none cursor-pointer"
                      value={filter}
                      onChange={(e) =>
                        setFilter(e.target.value as typeof filter)
                      }
                    >
                      <option value="all">All issue</option>
                      <option value="bug">Site Bugs</option>
                      <option value="accessibility">
                        Accessibility Issues
                      </option>
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white"
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
                    </div>
                  </div>

                  <div className="w-full lg:flex-1 relative">
                    <label
                      htmlFor="site-url-search"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Search by site URL
                    </label>
                    <div className="relative">
                      <input
                        id="site-url-search"
                        type="text"
                        className="w-full px-3 py-2 sm:px-4 sm:py-2 md:px-5 md:py-3 border border-gray-300 rounded-md text-xs sm:text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 pr-8 sm:pr-10"
                        placeholder="Search by site URL"
                        value={domainSearchTerm}
                        onChange={(e) =>
                          handleDomainInputChange(e.target.value)
                        }
                        onFocus={() => setIsDomainDropdownOpen(true)}
                        disabled={sitesLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                        onClick={() =>
                          setIsDomainDropdownOpen(!isDomainDropdownOpen)
                        }
                      >
                        <svg
                          className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform ${
                            isDomainDropdownOpen ? 'rotate-180' : ''
                          }`}
                          style={{ color: '#767676' }}
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
                          {filteredDomains.map((site: Site | null | undefined) => (
                            <div
                              key={site?.id}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center"
                              onClick={() =>
                                handleDomainSelect(site?.url || '')
                              }
                            >
                              <Favicon
                                domain={site?.url || ''}
                                size={16}
                                className="mr-2 flex-shrink-0"
                              />
                              <span className="truncate">{site?.url}</span>
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
              )}
            </div>

            {/* Issues Display Card */}
            <div className="bg-[#eaeffb] rounded-lg shadow-sm border border-[#A2ADF3] p-3 sm:p-4">
              {loader ? (
                <div className="flex justify-center py-12">
                  <CircularProgress
                    size={100}
                    sx={{ color: '#0080ff' }}
                    className="mx-auto my-auto"
                  />
                </div>
              ) : (
                <>
                  {/* Issue Summary Section with Filter */}
                  <div className="mb-3 border-b border-gray-200 pb-2 pl-4">
                    <div className="flex gap-8 mb-3">
                      {/* Active Issues Filter */}
                      <div
                        className="cursor-pointer transition-all duration-200"
                        style={{
                          color:
                            statusFilter === 'active'
                              ? '#1f2937'
                              : '#656D7D',
                        }}
                        onClick={() => setStatusFilter('active')}
                      >
                        <h3 className="text-base font-medium">Active issues</h3>
                        <p className="text-lg font-semibold mt-1">
                          {activeIssuesCount}
                        </p>
                      </div>

                      {/* Solved Issues Filter */}
                      <div
                        className="cursor-pointer transition-all duration-200"
                        style={{
                          color:
                            statusFilter === 'solved'
                              ? '#1f2937'
                              : '#656D7D',
                        }}
                        onClick={() => setStatusFilter('solved')}
                      >
                        <h3 className="text-base font-medium">Solved issues</h3>
                        <p className="text-lg font-semibold mt-1">
                          {solvedIssuesCount}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-center -ml-4 px-4">
                      <div className="w-full h-0.5 bg-[#7383ED] mt-2"></div>
                    </div>
                  </div>

                  {/* Scrollable Issues Container */}
                  <div className="max-h-80 sm:max-h-96 md:max-h-[28rem] lg:max-h-[32rem] overflow-y-auto pr-1 sm:pr-2 issues-scrollbar">
                    <div className="space-y-3 sm:space-y-4">
                      {filteredProblems.map((problem) => (
                        <div key={problem.id} className="problem-card">
                          <ProblemCard
                            problem={problem}
                            onToggleFixed={handleToggleFixed}
                          />
                        </div>
                      ))}
                    </div>

                    {problemArray.length === 0 && !loader && (
                      <div className="text-center py-12">
                        <div className="mx-auto mb-6">
                          <img
                            src={notFoundImage}
                            alt=""
                            role="presentation"
                            className="mx-auto h-32 w-auto"
                          />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No problem reports
                        </h3>
                        <p className="text-sm" style={{ color: '#676D7B' }}>
                          You haven't received any problem reports yet. They
                          will appear here when users report issues with your
                          websites.
                        </p>
                      </div>
                    )}

                    {filteredProblems.length === 0 && problemArray.length > 0 && (
                      <div className="text-center py-12">
                        <div className="mx-auto mb-6">
                          <img
                            src={notFoundImage}
                            alt=""
                            role="presentation"
                            className="mx-auto h-32 w-auto"
                          />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {statusFilter === 'active'
                            ? 'No active issues found'
                            : 'No solved issues found'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {statusFilter === 'active'
                            ? 'All issues have been marked as solved!'
                            : 'Issues will appear here once they are marked as solved.'}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProblemReport;
