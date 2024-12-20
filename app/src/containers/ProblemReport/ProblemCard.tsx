import React, { useState } from 'react';
import { Problem } from './ProblemReport';
import { FaBug, FaUniversalAccess } from 'react-icons/fa';
import { HiOutlineGlobeAlt } from 'react-icons/hi';
import { MdEmail } from 'react-icons/md';
import "./ProblemCard.css"

const ProblemCard: React.FC<{ problem: Problem }> = ({ problem }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={`bg-white overflow-hidden shadow-md sm:shadow-lg rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 ${isExpanded ? 'hover:shadow-2xl' : 'hover:shadow-xl'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={()=>setIsExpanded(!isExpanded)}
    >
      <div className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center mb-3 sm:mb-4">
          {problem.issue_type === 'bug' ? (
            <FaBug color='red' className="text-red-500 text-xl sm:text-2xl mr-2 sm:mr-3 flex-shrink-0" />
          ) : (
            <FaUniversalAccess color='blue' className="text-blue-500 text-xl sm:text-2xl mr-2 sm:mr-3 flex-shrink-0" />
          )}
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 capitalize">{problem.issue_type}</h2>
        </div>
        <div className="flex items-center text-gray-600 mb-2 sm:mb-3">
          <HiOutlineGlobeAlt className="mr-2 flex-shrink-0" />
          <a href={`https://${problem.site_url}`} target="_blank" rel="noopener noreferrer" className="text-sm sm:text-base text-indigo-600 hover:text-indigo-800 transition-colors duration-200 truncate">
            {problem.site_url}
          </a>
        </div>
        <p className={`text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 transition-all duration-300 ease-in-out ${isExpanded ? 'line-clamp-none' : 'line-clamp-3'}`}>
          {problem.description}
        </p>
        <div className="flex items-center text-gray-600">
          <MdEmail className="mr-2 flex-shrink-0" />
          <span className="text-sm sm:text-base truncate">{problem.reporter_email}</span>
        </div>
      </div>
    </div>
  );
};

export default ProblemCard;