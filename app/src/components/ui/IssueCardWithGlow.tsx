import React from 'react';
import { GlowingEffect } from './glowing-effect';

interface IssueCardProps {
  category: any;
  onViewDetails: (category: any) => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ category, onViewDetails }) => {
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
    <div className="relative h-full rounded-lg border border-gray-200 p-2">
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
      />
      <div className="relative bg-white rounded-lg p-6 h-full hover:shadow-sm transition-shadow duration-200">
        {/* Icon and Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
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
              View Details →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueCard;
