import React, { useState } from 'react';

interface Fix {
  selector?: string;
  issue_type?: string;
  wcag_criteria?: string;
  wcag?: string;
  action?: string;
  attributes?: any;
  impact?: string;
  description?: string;
  current_value?: string;
  confidence?: number;
  suggested_fix?: string;
  category?: string;
}

interface FixCardProps {
  fix: Fix;
  url: string;
  onRemove: () => void;
  onRestore: () => void;
  isUpdating: boolean;
}

const FixCard: React.FC<FixCardProps> = ({ fix, url, onRemove, onRestore, isUpdating }) => {
  const isDeleted = fix.action === 'deleted';
  
  // Determine card color based on impact
  const getImpactColor = (impact: string = 'minor') => {
    switch (impact.toLowerCase()) {
      case 'critical':
      case 'serious':
        return {
          bg: 'bg-white',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800',
          icon: 'text-red-600',
        };
      case 'major':
      case 'moderate':
        return {
          bg: 'bg-white',
          border: 'border-orange-200',
          badge: 'bg-orange-100 text-orange-800',
          icon: 'text-orange-600',
        };
      case 'minor':
      default:
        return {
          bg: 'bg-white',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: 'text-yellow-600',
        };
    }
  };

  const colors = getImpactColor(fix.impact);

  return (
    <div
      className={`fix-card rounded-xl border-2 p-4 md:p-5 transition-all ${
        isDeleted
          ? 'bg-gray-50 border-gray-300 opacity-60'
          : `${colors.bg} ${colors.border} shadow-sm`
      }`}
    >
      {/* Header with icon and title */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`flex-shrink-0 p-2 rounded-lg ${colors.icon} bg-white/50`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-sm md:text-base font-bold text-gray-900 break-words">
              {fix.issue_type?.replace(/_/g, ' ') || 'Accessibility Issue'}
            </h3>
            <span className={`badge px-2.5 py-1 rounded-full text-xs font-semibold ${colors.badge} shadow-sm`}>
              {fix.impact || 'minor'}
            </span>
          </div>
          {fix.wcag_criteria && (
            <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              WCAG: {fix.wcag_criteria || fix.wcag}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {fix.description && (
        <p className="text-xs md:text-sm text-gray-700 mb-3 break-words">
          {fix.description}
        </p>
      )}

      {/* Current and Fix sections */}
      <div className="space-y-3 mb-4">
        {fix.current_value && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              Current:
            </p>
            <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
              <code className="text-xs text-gray-800 break-all font-mono">{fix.current_value}</code>
            </div>
          </div>
        )}
        {fix.suggested_fix && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span>
              Fix:
            </p>
            <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-200 shadow-sm">
              <code className="text-xs text-gray-800 break-words font-mono">{fix.suggested_fix}</code>
            </div>
          </div>
        )}
      </div>

      {/* Selector */}
      {fix.selector && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Element Selector:</p>
          <div className="bg-gray-900 rounded-lg px-3 py-2 overflow-x-auto border border-gray-700 shadow-inner">
            <code className="text-xs text-green-400 font-mono whitespace-nowrap">{fix.selector}</code>
          </div>
        </div>
      )}

      {/* URL */}
      <div className="mb-4 pb-3 border-b border-gray-200">
        <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {url}
        </p>
      </div>

      {/* Action button */}
      <div className="flex justify-end">
        {isDeleted ? (
          <button
            onClick={onRestore}
            disabled={isUpdating}
            className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-green-500/30 hover:shadow-lg hover:shadow-green-500/40 disabled:shadow-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Restore
          </button>
        ) : (
          <button
            onClick={onRemove}
            disabled={isUpdating}
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default FixCard;
