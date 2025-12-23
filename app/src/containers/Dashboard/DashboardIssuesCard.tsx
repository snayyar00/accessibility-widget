import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { baseColors } from '@/config/colors';
import { AlertTriangle, Bug, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { getAuthenticationCookie } from '@/utils/cookie';

// Constants
const DESCRIPTION_MAX_LENGTH = 80;
const ISSUES_LIST_MAX_HEIGHT = 384; // 96 * 4 (max-h-96 in pixels)

const ISSUE_TYPE_COLORS = {
  bug: {
    primary: '#EF4444',
    background: '#FEF3F2',
  },
  accessibility: {
    primary: '#F59E0B',
    background: '#FFFBEB',
  },
  success: {
    primary: '#22c55e',
    background: '#F0FDF4',
  },
} as const;

const CARD_STYLES = {
  base: {
    backgroundColor: baseColors.white,
    border: 'none',
    padding: 'clamp(1rem, 3vw, 1.5rem)',
    width: '100%',
    boxSizing: 'border-box' as const,
    boxShadow: '0 20px 40px rgba(51, 67, 173, 0.2), 0 8px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(51, 67, 173, 0.05)',
  },
  hover: {
    transform: 'perspective(1000px) translateZ(8px) translateY(-4px)',
    boxShadow: '0 24px 48px rgba(51, 67, 173, 0.3), 0 12px 24px rgba(0, 0, 0, 0.2)',
  },
  default: {
    transform: 'perspective(1000px) translateZ(0)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Types
interface DashboardIssuesCardProps {
  siteUrl?: string;
}

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

interface IssueCounts {
  bug: number;
  accessibility: number;
  total: number;
}

// Utility functions
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const problemDate = new Date(dateString);
  const diffInHours = Math.floor(
    (now.getTime() - problemDate.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} weeks ago`;
};

const truncateDescription = (description: string, maxLength: number): string => {
  if (description.length <= maxLength) return description;
  return `${description.substring(0, maxLength)}...`;
};

const getIssueTypeConfig = (issueType: 'bug' | 'accessibility') => {
  return ISSUE_TYPE_COLORS[issueType];
};

// Sub-components
interface IssueItemProps {
  issue: Problem;
}

const IssueItem: React.FC<IssueItemProps> = ({ issue }) => {
  const isBug = issue.issue_type === 'bug';
  const typeConfig = getIssueTypeConfig(issue.issue_type);
  const IconComponent = isBug ? Bug : AlertTriangle;
  const truncatedDescription = truncateDescription(issue.description, DESCRIPTION_MAX_LENGTH);

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg transition-all hover:shadow-sm"
      style={{
        backgroundColor: typeConfig.background,
        borderLeft: `3px solid ${typeConfig.primary}`,
      }}
      role="listitem"
      aria-label={`${issue.issue_type} issue: ${issue.description}`}
    >
      <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
        <IconComponent
          className="w-4 h-4"
          style={{ color: typeConfig.primary }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-semibold uppercase px-2 py-0.5 rounded"
            style={{
              backgroundColor: typeConfig.primary,
              color: '#fff',
            }}
            aria-label={`Issue type: ${issue.issue_type}`}
          >
            {isBug ? 'Bug' : 'Accessibility'}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: baseColors.grayBorder,
              color: baseColors.grayText,
            }}
            aria-label={`Reported ${getTimeAgo(issue.created_at)}`}
          >
            {getTimeAgo(issue.created_at)}
          </span>
        </div>
        <p
          className="text-sm"
          style={{ color: baseColors.grayText }}
          title={issue.description}
        >
          {truncatedDescription}
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: baseColors.grayMuted }}
          aria-label={`Reported by ${issue.reporter_email}`}
        >
          Reported by: {issue.reporter_email}
        </p>
      </div>
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading problem reports...' }) => (
  <div
    className="rounded-xl w-full overflow-hidden"
    style={CARD_STYLES.base}
    role="status"
    aria-live="polite"
  >
    <div className="text-center py-4">
      <p style={{ color: baseColors.grayMuted }}>{message}</p>
    </div>
  </div>
);

interface ErrorStateProps {
  error: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => (
  <div
    className="rounded-xl w-full overflow-hidden"
    style={CARD_STYLES.base}
    role="alert"
    aria-live="assertive"
  >
    <div className="text-center py-4">
      <AlertCircleIcon className="w-8 h-8 mx-auto mb-2" style={{ color: ISSUE_TYPE_COLORS.bug.primary }} />
      <p style={{ color: baseColors.grayMuted }} className="text-sm">
        {error}
      </p>
    </div>
  </div>
);

// Main component
const DashboardIssuesCard: React.FC<DashboardIssuesCardProps> = ({ siteUrl }) => {
  const [problemArray, setProblemArray] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: userData } = useSelector((state: RootState) => state.user);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch problem reports
  useEffect(() => {
    if (!siteUrl || !userData?.id) {
      setLoading(false);
      return;
    }

    const fetchProblemReports = async () => {
      setLoading(true);
      setError(null);

      const url = `${process.env.REACT_APP_BACKEND_URL}/get-problem-reports`;
      const bodyData = { user_id: userData.id };
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
          // Filter by selected site URL and only show active (not fixed) issues
          const filtered = (responseData || []).filter(
            (problem: Problem) => problem.site_url === siteUrl && !problem.fixed
          );
          setProblemArray(filtered);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('There was a problem with the fetch operation:', err);
        if (isMounted.current) {
          setProblemArray([]);
          setLoading(false);
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to fetch problem reports',
          );
        }
      }
    };

    fetchProblemReports();
  }, [siteUrl, userData?.id, userData?.current_organization_id]);

  // Count issues by type
  const issueCounts = useMemo<IssueCounts>(() => {
    const counts: IssueCounts = {
      bug: 0,
      accessibility: 0,
      total: problemArray.length,
    };

    problemArray.forEach((problem) => {
      if (problem.issue_type === 'bug') {
        counts.bug++;
      } else if (problem.issue_type === 'accessibility') {
        counts.accessibility++;
      }
    });

    return counts;
  }, [problemArray]);

  // Get icon and background color based on issue counts
  const getStatusConfig = useCallback(() => {
    if (issueCounts.total === 0) {
      return {
        icon: AlertCircleIcon,
        color: ISSUE_TYPE_COLORS.success.primary,
        background: ISSUE_TYPE_COLORS.success.background,
      };
    }

    if (issueCounts.bug > 0) {
      return {
        icon: Bug,
        color: ISSUE_TYPE_COLORS.bug.primary,
        background: ISSUE_TYPE_COLORS.bug.background,
      };
    }

    return {
      icon: AlertTriangle,
      color: ISSUE_TYPE_COLORS.accessibility.primary,
      background: ISSUE_TYPE_COLORS.accessibility.background,
    };
  }, [issueCounts]);

  // Get total issues color
  const getTotalIssuesColor = useCallback(() => {
    if (issueCounts.total === 0) return ISSUE_TYPE_COLORS.success.primary;
    if (issueCounts.bug > 0) return ISSUE_TYPE_COLORS.bug.primary;
    return ISSUE_TYPE_COLORS.accessibility.primary;
  }, [issueCounts]);

  // Event handlers
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    Object.assign(target.style, CARD_STYLES.hover);
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    Object.assign(target.style, CARD_STYLES.default);
  }, []);

  // Early returns
  if (!siteUrl) {
    return null;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className="rounded-xl w-full overflow-hidden cursor-pointer stat-card-3d"
      style={{
        ...CARD_STYLES.base,
        ...CARD_STYLES.default,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="region"
      aria-label="Problem reports for selected site"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: statusConfig.background }}
            aria-hidden="true"
          >
            <StatusIcon
              className="w-6 h-6"
              style={{ color: statusConfig.color }}
            />
          </div>
          <div>
            <h2
              className="text-lg sm:text-xl font-bold"
              style={{ color: baseColors.grayText }}
            >
              Problem Reports
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: baseColors.grayMuted }}>
              Active issues for this site
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4" role="group" aria-label="Issue statistics">
        <div className="text-center">
          <div
            className="text-2xl sm:text-3xl font-bold mb-1"
            style={{ color: ISSUE_TYPE_COLORS.bug.primary }}
            aria-label={`${issueCounts.bug} site bugs`}
          >
            {issueCounts.bug}
          </div>
          <div className="text-xs sm:text-sm" style={{ color: baseColors.grayMuted }}>
            Site Bugs
          </div>
        </div>
        <div className="text-center">
          <div
            className="text-2xl sm:text-3xl font-bold mb-1"
            style={{ color: ISSUE_TYPE_COLORS.accessibility.primary }}
            aria-label={`${issueCounts.accessibility} accessibility issues`}
          >
            {issueCounts.accessibility}
          </div>
          <div className="text-xs sm:text-sm" style={{ color: baseColors.grayMuted }}>
            Accessibility
          </div>
        </div>
      </div>

      {/* Total Issues */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: baseColors.grayBorder }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: baseColors.grayText }}>
            Total Active Issues
          </span>
          <span
            className="text-lg font-bold"
            style={{ color: getTotalIssuesColor() }}
            aria-label={`Total: ${issueCounts.total} active issues`}
          >
            {issueCounts.total}
          </span>
        </div>
      </div>

      {/* All Issues Section */}
      {problemArray.length > 0 ? (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: baseColors.grayBorder }}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold" style={{ color: baseColors.grayText }}>
              All Issues
            </h3>
          </div>
          <div
            className="space-y-2 overflow-y-auto"
            style={{ maxHeight: `${ISSUES_LIST_MAX_HEIGHT}px` }}
            role="list"
            aria-label="List of problem reports"
          >
            {problemArray.map((issue) => (
              <IssueItem key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t text-center" style={{ borderColor: baseColors.grayBorder }}>
          <p className="text-sm" style={{ color: baseColors.grayMuted }}>
            No active problem reports. Great job! 🎉
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardIssuesCard;
