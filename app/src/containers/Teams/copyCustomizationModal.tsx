import React from 'react';

interface CopyCustomizationModalProps {
  'isOpen': boolean;
  'onClose': () => void;
  'copyDomain': string;
  'setCopyDomain': (domain: string) => void;
  'selectedSite': string;
  'allDomains': any;
  'buttonDisable': boolean;
  'onCopySettings': () => void;
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
    <div className="fixed m-auto inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 m-auto p-5 border w-[50rem] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium mb-4">
            Copy Customization from Another Domain
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Select source domain:
            </label>
            <select
              className="w-full p-2 border rounded-md"
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
          </div>

          <div className="mb-6">
            <div className="bg-yellow-200 border-l-4 border-yellow-400 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">
                    This will overwrite your current unsaved changes for{' '}
                    <strong>{selectedSite}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border rounded-md transition-all duration-300 bg-white hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              disabled={!copyDomain || buttonDisable}
              className="px-4 py-2 border border-transparent rounded-md text-white bg-primary transition-all duration-300 hover:bg-sapphire-blue disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Copy Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyCustomizationModal;