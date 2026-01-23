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
  
  // Determine card color based on impact with enhanced styling
  const getImpactColor = (impact: string = 'minor') => {
    switch (impact.toLowerCase()) {
      case 'critical':
      case 'serious':
        return {
          border: '#ef4444',
          bgColor: '#ffffff',
          badge: { bg: '#fee2e2', text: '#991b1b' },
          icon: { bg: '#fecaca', color: '#dc2626' },
          labelColor: '#991b1b',
          accentColor: '#ef4444',
        };
      case 'major':
      case 'moderate':
        return {
          border: '#f59e0b',
          bgColor: '#ffffff',
          badge: { bg: '#fef3c7', text: '#92400e' },
          icon: { bg: '#fde68a', color: '#d97706' },
          labelColor: '#92400e',
          accentColor: '#f59e0b',
        };
      case 'minor':
      default:
        return {
          border: '#3b82f6',
          bgColor: '#ffffff',
          badge: { bg: '#dbeafe', text: '#1e40af' },
          icon: { bg: '#bfdbfe', color: '#2563eb' },
          labelColor: '#1e40af',
          accentColor: '#3b82f6',
        };
    }
  };

  const colors = getImpactColor(fix.impact);

  return (
    <div
      className={`fix-card rounded-xl border-2 p-4 sm:p-5 md:p-6 transition-all w-full max-w-full overflow-hidden ${
        isDeleted
          ? 'bg-gray-50 border-gray-300 opacity-60'
          : 'shadow-md hover:shadow-xl'
      }`}
      style={
        !isDeleted
          ? {
              backgroundColor: colors.bgColor,
              borderColor: colors.border,
            }
          : undefined
      }
    >
      {/* Header with enhanced icon and title */}
      <div className="flex items-start gap-4 mb-5">
        <div
          className="flex-shrink-0 p-3 rounded-xl shadow-md"
          style={{
            backgroundColor: colors.icon.bg,
          }}
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ color: colors.icon.color }}
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
            <h3 className="text-base md:text-lg font-bold text-gray-900 break-words">
              {fix.issue_type?.replace(/_/g, ' ') || 'Accessibility Issue'}
            </h3>
            <span
              className="badge px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm"
              style={{
                backgroundColor: colors.badge.bg,
                color: colors.badge.text,
              }}
            >
              {fix.impact || 'minor'}
            </span>
          </div>
          {fix.wcag_criteria && (
            <p
              className="text-xs font-semibold flex items-center gap-1.5 mt-2"
              style={{ color: colors.labelColor }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              WCAG {fix.wcag_criteria || fix.wcag}
            </p>
          )}
          {fix.category && (
            <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mt-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {fix.category.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Description with enhanced styling */}
      {fix.description && (
        <div
          className="mb-5 p-4 rounded-lg border-l-4"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderLeftColor: colors.accentColor,
          }}
        >
          <p className="text-sm text-gray-800 leading-relaxed break-words">
            {fix.description}
          </p>
        </div>
      )}

      {/* Current and Fix sections with enhanced design */}
      <div className="space-y-4 mb-5">
        {fix.current_value && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.accentColor }}
              ></span>
              Current Code:
            </p>
            <div className="bg-white rounded-lg px-3 sm:px-4 py-3 border-2 shadow-sm overflow-x-auto" style={{ borderColor: colors.border + '40' }}>
              <code className="text-xs text-gray-800 break-words sm:break-all font-mono leading-relaxed">
                {fix.current_value}
              </code>
            </div>
          </div>
        )}
        {fix.suggested_fix && (
          <div>
            <p className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: '#16a34a' }}>
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Suggested Fix:
            </p>
            <div className="bg-green-50 rounded-lg px-3 sm:px-4 py-3 border-2 border-green-200 shadow-sm overflow-x-auto">
              <code className="text-xs text-gray-800 break-words font-mono leading-relaxed">
                {fix.suggested_fix}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Selector with code block styling */}
      {fix.selector && (
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Element Selector:
          </p>
          <div className="bg-gray-900 rounded-lg px-3 sm:px-4 py-3 overflow-x-auto border-2 border-gray-700">
            <code className="text-xs sm:text-sm font-mono break-words sm:whitespace-nowrap" style={{ color: '#34d399' }}>
              {fix.selector}
            </code>
          </div>
        </div>
      )}

      {/* URL with enhanced styling */}
      <div className="mb-5 pb-4 border-b-2" style={{ borderColor: colors.border + '30' }}>
        <div className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2.5 min-w-0">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: colors.accentColor }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-xs text-gray-600 truncate font-medium min-w-0 flex-1">{url}</p>
        </div>
      </div>

      {/* Action button with enhanced styling */}
      <div className="flex justify-end pt-2">
        {isDeleted ? (
          <button
            onClick={onRestore}
            disabled={isUpdating}
            className="px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-500/40 hover:shadow-xl hover:shadow-green-500/50 disabled:shadow-none transform hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Enable Auto-Fix
          </button>
        ) : (
          <button
            onClick={onRemove}
            disabled={isUpdating}
            className="px-5 py-2.5 bg-white border-2 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
            style={{
              borderColor: colors.border,
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Disable Auto-Fix
          </button>
        )}
      </div>
    </div>
  );
};

export default FixCard;
