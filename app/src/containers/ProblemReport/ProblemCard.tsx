import React, { useState } from 'react';
import { Problem } from './ProblemReport';
import Favicon from '@/components/Common/Favicon';
import './ProblemCard.css';

const ProblemCard: React.FC<{ problem: Problem }> = ({ problem }) => {
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

  return (
    <div
      className={`bg-white border border-[#7383ED] rounded-lg p-3 sm:p-4 md:p-5 transition-all duration-300 ease-in-out ${
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
          <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
            {problem.site_url}
          </span>
        </div>

        {/* Status icon */}
        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
          <svg
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 mb-2 sm:mb-3">
        {getTimeAgo(problem.created_at)}
      </div>

      {/* Issue description */}
      <p
        className={`text-xs sm:text-sm text-gray-700 leading-relaxed transition-all duration-300 ease-in-out ${
          isExpanded ? 'line-clamp-none' : 'line-clamp-3 sm:line-clamp-4'
        }`}
      >
        {problem.description}
      </p>
    </div>
  );
};

export default ProblemCard;
