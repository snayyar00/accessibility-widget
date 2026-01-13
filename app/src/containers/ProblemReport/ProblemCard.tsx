import React, { useState } from 'react';
import { Problem } from './ProblemReport';
import Favicon from '@/components/Common/Favicon';
import './ProblemCard.css';

interface ProblemCardProps {
  problem: Problem;
  onToggleFixed?: (id: number) => void;
}

const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  onToggleFixed,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate time ago
  const getTimeAgo = (dateString: string) => {
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

  const handleToggleFixed = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking checkmark
    if (onToggleFixed) {
      onToggleFixed(problem.id);
    }
  };

  return (
    <div
      className={`bg-white border border-[#A2ADF3] rounded-lg p-3 sm:p-4 md:p-5 transition-all duration-300 ease-in-out ${
        isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header with logo, site URL, and status icon */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex items-center min-w-0 flex-1">
          {/* Domain favicon */}
          <div className="flex items-center mr-2 sm:mr-3 flex-shrink-0">
            <Favicon
              domain={problem.site_url}
              size={16}
              className="sm:w-5 sm:h-5 md:w-6 md:h-6"
            />
          </div>
          <span className="text-xl sm:text-sm font-medium text-gray-900 truncate">
            {problem.site_url}
          </span>
        </div>

        {/* Status icon - Checkmark */}
        <div
          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 cursor-pointer transition-all duration-200 hover:scale-110 ${
            problem.fixed
              ? 'bg-transparent'
              : 'border-gray-400 bg-white hover:border-gray-500'
          }`}
          style={problem.fixed ? { borderColor: '#0052CC' } : {}}
          onClick={handleToggleFixed}
          title={problem.fixed ? 'Mark as unfixed' : 'Mark as fixed'}
        >
          {problem.fixed ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: '#0052CC' }}
            >
              <path
                d="M7 12l3 3 7-7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-400"
            >
              <path
                d="M7 12l3 3 7-7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 mb-2 sm:mb-3">
        {getTimeAgo(problem.created_at)}
      </div>

      {/* Issue description */}
      <p
        className={`text-base sm:text-sm text-gray-700 leading-relaxed transition-all duration-300 ease-in-out ${
          isExpanded ? 'line-clamp-none' : 'line-clamp-3 sm:line-clamp-4'
        }`}
      >
        {problem.description}
      </p>
    </div>
  );
};

export default ProblemCard;
