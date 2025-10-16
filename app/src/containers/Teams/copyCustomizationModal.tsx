import React from 'react';
import { AlertTriangle, Copy, X, Globe } from 'lucide-react';

interface CopyCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  copyDomain: string;
  setCopyDomain: (domain: string) => void;
  selectedSite: string;
  allDomains: any;
  buttonDisable: boolean;
  onCopySettings: () => void;
}

const CopyCustomizationModal: React.FC<CopyCustomizationModalProps> = ({
  isOpen,
  onClose,
  copyDomain,
  setCopyDomain,
  selectedSite,
  allDomains,
  buttonDisable,
  onCopySettings,
}) => {
  if (!isOpen) return null;

  const handleCancel = () => {
    onClose();
    setCopyDomain('');
  };

  const handleCopy = () => {
    onCopySettings();
    onClose();
    setCopyDomain('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto my-4 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Copy className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                Copy Customization
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                Import settings from another domain
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Domain Selection */}
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Select source domain
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white text-sm"
                value={copyDomain}
                onChange={(e) => setCopyDomain(e.target.value)}
              >
                <option value={''}>Choose a domain to copy from</option>
                {allDomains?.getUserSites
                  ?.filter((domain: any) => domain.url !== selectedSite)
                  .map((domain: any) => (
                    <option key={domain.id} value={domain.url}>
                      {domain.url}
                    </option>
                  ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-medium text-amber-800 mb-1">
                  Warning: Unsaved changes will be lost
                </h4>
                <p className="text-xs sm:text-sm text-amber-700 leading-relaxed">
                  This action will overwrite your current unsaved changes for{' '}
                  <span className="font-semibold break-all">
                    {selectedSite}
                  </span>
                  . Make sure to save any important customizations before
                  proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0">
                <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">i</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                  All customization settings including colors, fonts,
                  positioning, and widget behavior will be copied from the
                  selected domain to{' '}
                  <span className="font-semibold break-all">
                    {selectedSite}
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-row  sm:flex-col items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleCancel}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={!copyDomain || buttonDisable}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default CopyCustomizationModal;
