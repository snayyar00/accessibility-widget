import React from 'react';
import { FaCheck, FaTimes, FaPencilAlt, FaTrash } from 'react-icons/fa';
import { Tooltip, CircularProgress } from '@mui/material';
import { Domain } from './DomainTable';
import applyStatusClass from '@/utils/applyStatusClass';

interface MobileDomainCardProps {
  domain: Domain;
  isEditing: boolean;
  tempDomain: string;
  setTempDomain: (value: string) => void;
  domainStatus: string;
  monitoringStates: { [key: number]: boolean };
  editLoading: boolean;
  billingLoading: boolean;
  activePlan: string;
  tierPlan: boolean;
  appSumoCount: number;
  codeCount: number;
  appSumoDomains: string[];
  onEdit: (domain: Domain) => void;
  onCancel: () => void;
  onSave: (id: number) => void;
  onDelete: (id: number, status: string) => void;
  onMonitoringToggle: (siteId: number, currentValue: boolean) => void;
  onSubscription: (domain: Domain) => void;
  onOpenActivateModal: (domain: Domain) => void;
  onPaymentView: () => void;
}

const MobileDomainCard: React.FC<MobileDomainCardProps> = ({
  domain,
  isEditing,
  tempDomain,
  setTempDomain,
  domainStatus,
  monitoringStates,
  editLoading,
  billingLoading,
  activePlan,
  tierPlan,
  appSumoCount,
  codeCount,
  appSumoDomains,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onMonitoringToggle,
  onSubscription,
  onOpenActivateModal,
  onPaymentView,
}) => {
  // Generate favicon URL
  const getFaviconUrl = (url: string) => {
    const domainName = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${domainName}&sz=32`;
  };

  // Generate last updated date (mock data for now)
  const getLastUpdated = () => {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Generate traffic data (mock data for now)
  const getTraffic = () => {
    return '572K';
  };

  return (
    <div
      className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
      style={{ borderColor: '#A2ADF3' }}
    >
      {/* Main Row */}
      <div className="flex items-center mb-3">
        {/* Favicon */}
        <div className="flex-shrink-0 mr-3">
          <img
            src={getFaviconUrl(domain.url)}
            alt={`${domain.url} favicon`}
            className="w-6 h-6 rounded"
            onError={(e) => {
              // Fallback to a default icon if favicon fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Domain Name */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              aria-label="Edit domain URL"
              className="border-2 border-gray-200 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={tempDomain}
              onChange={(e) => setTempDomain(e.target.value)}
              autoFocus
            />
          ) : (
            <div className="text-sm font-medium text-gray-900 truncate">
              {domain.url}
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <div className="flex-shrink-0 ml-2">
          {isEditing ? (
            <div className="flex items-center space-x-1">
              <Tooltip title="Save changes" placement="top">
                <button
                  onClick={() => onSave(domain.id)}
                  className="inline-flex items-center p-1 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <CircularProgress size={12} />
                  ) : (
                    <FaCheck className="w-3 h-3" />
                  )}
                </button>
              </Tooltip>
              <Tooltip title="Cancel editing" placement="top">
                <button
                  onClick={onCancel}
                  className="inline-flex items-center p-1 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all duration-200"
                  disabled={editLoading}
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </Tooltip>
            </div>
          ) : (
            <Tooltip title="Edit domain" placement="top">
              <button
                onClick={() => onEdit(domain)}
                className="text-gray-400 hover:text-gray-600 p-1 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200"
                aria-label={`Edit domain ${domain.url}`}
              >
                <FaPencilAlt className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Column Layout for Mobile */}
      <div className="space-y-3 mt-3 pt-3 border-t border-gray-100">
        {/* Plan Status */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Plan:</span>
          <Tooltip
            title={
              domainStatus === 'Life Time'
                ? 'Lifetime license - Never expires'
                : domainStatus === 'Active'
                ? 'Subscription is active'
                : domainStatus === 'Trial'
                ? `Trial period ends on ${
                    domain?.expiredAt
                      ? new Date(
                          Number.parseInt(domain.expiredAt),
                        ).toLocaleDateString()
                      : 'N/A'
                  }`
                : domainStatus === 'Trial Expired'
                ? 'Trial period has ended - Please activate'
                : domainStatus === 'Expiring'
                ? 'Subscription is expiring soon'
                : 'Subscription has expired'
            }
            placement="top"
          >
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium cursor-help ${applyStatusClass(
                domain.url,
                domain.expiredAt,
                domain.trial,
                appSumoDomains,
              )}`}
            >
              <span className="relative flex h-1.5 w-1.5 mr-1.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    domainStatus === 'Life Time'
                      ? 'bg-green-400'
                      : domainStatus === 'Trial'
                      ? 'bg-yellow-400'
                      : 'bg-blue-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    domainStatus === 'Life Time'
                      ? 'bg-green-500'
                      : domainStatus === 'Trial'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }`}
                ></span>
              </span>
              {domainStatus}
            </span>
          </Tooltip>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Status:</span>
          {monitoringStates[domain.id] ?? domain.monitor_enabled ? (
            domain.is_currently_down !== null &&
            domain.is_currently_down !== undefined ? (
              <>
                {domain.is_currently_down === 0 ? (
                  <Tooltip
                    title={`Website is responding normally${
                      domain.last_monitor_check
                        ? ` - Last checked: ${new Date(
                            domain.last_monitor_check,
                          ).toLocaleString()}`
                        : ''
                    }`}
                    placement="top"
                  >
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-help border border-green-400">
                      <span className="relative flex h-2 w-2 mr-2">
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      <span className="text-white font-medium tracking-wide">
                        ONLINE
                      </span>
                    </span>
                  </Tooltip>
                ) : domain.is_currently_down === 1 ? (
                  <Tooltip
                    title={`Website is not responding${
                      domain.last_monitor_check
                        ? ` - Last checked: ${new Date(
                            domain.last_monitor_check,
                          ).toLocaleString()}`
                        : ''
                    }`}
                    placement="top"
                  >
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200 cursor-help">
                      <span className="relative flex h-1.5 w-1.5 mr-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                      </span>
                      Offline
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Status check in progress" placement="top">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 cursor-help">
                      <svg
                        className="animate-spin -ml-0.5 mr-1.5 h-2.5 w-2.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Checking...
                    </span>
                  </Tooltip>
                )}
              </>
            ) : (
              <Tooltip
                title="Waiting for first monitoring check"
                placement="top"
              >
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 cursor-help">
                  <svg
                    className="mr-1.5 h-2.5 w-2.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Awaiting data
                </span>
              </Tooltip>
            )
          ) : (
            <Tooltip
              title="Monitoring is disabled for this domain"
              placement="top"
            >
              <span className="text-xs text-gray-400 italic cursor-help">
                Monitor off
              </span>
            </Tooltip>
          )}
        </div>

        {/* Activate/Buy Button (if applicable) */}
        {domainStatus === 'Trial' || domainStatus === 'Trial Expired' ? (
          <div className="flex items-center space-x-2">
            {activePlan !== '' && tierPlan ? (
              <Tooltip title="Activate subscription" placement="top">
                <button
                  disabled={billingLoading}
                  onClick={() => onSubscription(domain)}
                  className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {billingLoading ? 'Processing...' : 'Activate'}
                </button>
              </Tooltip>
            ) : appSumoCount < codeCount ? (
              <Tooltip title="Activate with promo code" placement="top">
                <button
                  onClick={() => onOpenActivateModal(domain)}
                  className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm"
                >
                  Activate
                </button>
              </Tooltip>
            ) : (
              <Tooltip title="Buy license" placement="top">
                <button
                  onClick={onPaymentView}
                  className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm"
                >
                  Buy License
                </button>
              </Tooltip>
            )}
          </div>
        ) : null}

        {/* Monitor Toggle and Delete Button in Same Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Monitor:</span>
            <Tooltip
              title={
                monitoringStates[domain.id] ?? domain.monitor_enabled
                  ? 'Click to disable monitoring'
                  : 'Click to enable monitoring'
              }
              placement="top"
            >
              <button
                onClick={() =>
                  onMonitoringToggle(
                    domain.id,
                    monitoringStates[domain.id] ??
                      domain.monitor_enabled ??
                      false,
                  )
                }
                role="switch"
                aria-checked={
                  monitoringStates[domain.id] ?? domain.monitor_enabled ?? false
                }
                aria-label={`Toggle monitoring for ${domain.url}`}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  monitoringStates[domain.id] ?? domain.monitor_enabled
                    ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                    : 'bg-gray-200 hover:bg-gray-300 focus:ring-gray-300'
                }`}
                disabled={isEditing}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-all duration-300 ${
                    monitoringStates[domain.id] ?? domain.monitor_enabled
                      ? 'translate-x-3'
                      : 'translate-x-0.5'
                  }`}
                />
              </button>
            </Tooltip>
          </div>

          {/* Delete Button */}
          <Tooltip title="Delete domain" placement="top">
            <button
              onClick={() => onDelete(domain.id, domainStatus)}
              className="text-red-400 hover:text-red-600 p-1 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 transition-all duration-200"
              aria-label={`Delete domain ${domain.url}`}
            >
              <FaTrash className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default MobileDomainCard;
