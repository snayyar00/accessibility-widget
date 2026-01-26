import React from 'react';

export interface SuggestedFix {
  selector?: string;
  issue_type?: string;
  wcag_criteria?: string;
  wcag?: string;
  action?: string;
  attributes?: Record<string, unknown>;
  impact?: string;
  description?: string;
  current_value?: string;
  confidence?: number;
  suggested_fix?: string;
  category?: string;
}

interface SuggestedFixCardProps {
  fix: SuggestedFix;
  url: string;
  onAccept: () => void;
  onReject: () => void;
  isUpdating: boolean;
}

const getImpactColor = (impact: string = 'minor') => {
  switch (impact.toLowerCase()) {
    case 'critical':
    case 'serious':
      return { border: '#ef4444', bgColor: '#ffffff', badge: { bg: '#fee2e2', text: '#991b1b' }, icon: { bg: '#fecaca', color: '#dc2626' }, labelColor: '#991b1b', accentColor: '#ef4444' };
    case 'major':
    case 'moderate':
      return { border: '#f59e0b', bgColor: '#ffffff', badge: { bg: '#fef3c7', text: '#92400e' }, icon: { bg: '#fde68a', color: '#d97706' }, labelColor: '#92400e', accentColor: '#f59e0b' };
    default:
      return { border: '#3b82f6', bgColor: '#ffffff', badge: { bg: '#dbeafe', text: '#1e40af' }, icon: { bg: '#bfdbfe', color: '#2563eb' }, labelColor: '#1e40af', accentColor: '#3b82f6' };
  }
};

const SuggestedFixCard: React.FC<SuggestedFixCardProps> = ({ fix, url, onAccept, onReject, isUpdating }) => {
  const colors = getImpactColor(fix.impact);

  return (
    <div
      className="fix-card rounded-xl border-2 p-3 sm:p-4 transition-all w-full max-w-full overflow-hidden shadow-md hover:shadow-xl border-dashed"
      style={{ backgroundColor: colors.bgColor, borderColor: colors.border }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 p-2 rounded-lg shadow-md" style={{ backgroundColor: colors.icon.bg }}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: colors.icon.color }}>
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Suggested</span>
            <h3 className="text-sm md:text-base font-bold text-gray-900 break-words">
              {fix.issue_type?.replace(/_/g, ' ') || 'Accessibility Issue'}
            </h3>
            <span className="badge px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm" style={{ backgroundColor: colors.badge.bg, color: colors.badge.text }}>
              {fix.impact || 'minor'}
            </span>
          </div>
          {(fix.wcag_criteria || fix.wcag) && (
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: colors.labelColor }}>
              WCAG {fix.wcag_criteria || fix.wcag}
            </p>
          )}
          {fix.category && (
            <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mt-1">{fix.category.replace(/_/g, ' ')}</p>
          )}
        </div>
      </div>

      {fix.description && (
        <div className="mb-3 p-3 rounded-lg border-l-4" style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderLeftColor: colors.accentColor }}>
          <p className="text-xs text-gray-800 leading-relaxed break-words">{fix.description}</p>
        </div>
      )}

      <div className="space-y-2 mb-3">
        {fix.current_value && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-1">Current:</p>
            <div className="bg-white rounded-lg px-2 py-2 border-2 overflow-x-auto" style={{ borderColor: colors.border + '40' }}>
              <code className="text-xs text-gray-800 break-words font-mono">{fix.current_value}</code>
            </div>
          </div>
        )}
        {fix.suggested_fix && (
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#16a34a' }}>Suggested Fix:</p>
            <div className="bg-green-50 rounded-lg px-2 py-2 border-2 border-green-200 overflow-x-auto">
              <code className="text-xs text-gray-800 break-words font-mono">{fix.suggested_fix}</code>
            </div>
          </div>
        )}
      </div>

      {fix.selector && (
        <div className="mb-3">
          <p className="text-xs font-bold text-gray-700 mb-1">Selector:</p>
          <div className="bg-gray-900 rounded-lg px-2 py-2 overflow-x-auto border-2 border-gray-700">
            <code className="text-xs font-mono break-words" style={{ color: '#34d399' }}>{fix.selector}</code>
          </div>
        </div>
      )}

      <div className="mb-3 pb-2 border-b-2" style={{ borderColor: colors.border + '30' }}>
        <p className="text-xs text-gray-600 truncate font-medium">{url}</p>
      </div>
    </div>
  );
};

export default SuggestedFixCard;
