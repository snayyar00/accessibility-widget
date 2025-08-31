import React from 'react';
import { LeadTableProps, Lead, Email } from '../types';
import { HiMail, HiExternalLink, HiPlus, HiPaperAirplane } from 'react-icons/hi';
import { MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';

const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  selectedLeads,
  onSelectLead,
  onSelectAll,
  onFindEmail,
  onGenerateReport,
  onSaveLead
}) => {
  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;
  const someSelected = selectedLeads.length > 0 && selectedLeads.length < leads.length;

  const extractDomain = (website?: string): string => {
    if (!website) return '';
    try {
      return new URL(website).hostname.replace('www.', '');
    } catch {
      return website;
    }
  };

  const formatPhone = (phone?: string): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const renderEmailStatus = (lead: Lead) => {
    const domain = extractDomain(lead.website);
    
    if (!lead.website) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          No website
        </span>
      );
    }

    if (lead.emails && lead.emails.length > 0) {
      return (
        <div className="space-y-2">
          {lead.emails.map((email: Email, index: number) => (
            <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="font-medium text-sm text-green-900 mb-1">{email.email}</div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  {email.type}
                </span>
                <span className="text-xs text-green-700">
                  {email.confidence}% confidence
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <button
        onClick={() => onFindEmail(lead.id, domain)}
        disabled={lead.emailStatus === 'searching'}
        className="text-xs px-3 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        {lead.emailStatus === 'searching' ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
            Finding...
          </>
        ) : lead.emailStatus === 'not_found' ? (
          <>
            <HiMail className="w-3 h-3 mr-1" />
            Retry Email
          </>
        ) : (
          <>
            <HiMail className="w-3 h-3 mr-1" />
            Find Email
          </>
        )}
      </button>
    );
  };

  const renderWebsite = (website?: string) => {
    if (!website) return <span className="text-gray-600">—</span>;
    
    const domain = extractDomain(website);
    return (
      <a
        href={website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center text-sm"
      >
        {domain}
        <HiExternalLink className="w-3 h-3 ml-1" />
      </a>
    );
  };

  if (leads.length === 0) {
    return null;
  }

  const getCompanyInitials = (companyName: string) => {
    return companyName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-white border-b border-gray-200">
          <tr>
            <th className="w-12 px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Lead Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Company Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Job Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Location
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Industry
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {leads.map((lead, index) => (
            <tr key={lead.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
              {/* Checkbox */}
              <td className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={selectedLeads.includes(lead.id)}
                  onChange={(e) => onSelectLead(lead.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </td>

              {/* Lead Name */}
              <td className="px-4 py-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs font-medium text-gray-600">
                      {getCompanyInitials(lead.businessName)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{lead.businessName}</div>
                  </div>
                </div>
              </td>

              {/* Company Name */}
              <td className="px-4 py-4">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-100 rounded mr-2 flex items-center justify-center">
                    <span className="text-xs text-blue-600">🏢</span>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                      {lead.businessName}
                    </div>
                  </div>
                </div>
              </td>

              {/* Job Role */}
              <td className="px-4 py-4">
                <div className="text-sm text-gray-900">
                  {lead.category || 'Business Owner'}
                </div>
              </td>

              {/* Location */}
              <td className="px-4 py-4">
                <div className="text-sm text-gray-900">
                  {lead.address ? lead.address.split(',').slice(-2).join(',').trim() : 'Not specified'}
                </div>
              </td>

              {/* Industry */}
              <td className="px-4 py-4">
                <div className="text-sm text-gray-900">
                  {lead.category ? lead.category.charAt(0).toUpperCase() + lead.category.slice(1) : 'Business'}
                </div>
              </td>

              {/* Actions */}
              <td className="px-4 py-4">
                <div className="flex items-center space-x-2">
                  {lead.emails && lead.emails.length > 0 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Found
                    </span>
                  ) : lead.emailStatus === 'searching' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-xs text-gray-700">Finding...</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onFindEmail(lead.id, extractDomain(lead.website) || lead.businessName)}
                      className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-600 bg-white hover:bg-blue-50 transition-colors"
                    >
                      Get Email
                    </button>
                  )}
                  
                  {/* Action Buttons */}
                  <button 
                    className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                    title="Send email"
                  >
                    <HiPaperAirplane className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                    title="Copy"
                  >
                    <HiExternalLink className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onSaveLead(lead)}
                    className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                    title="Add to list"
                  >
                    <HiPlus className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="bg-white px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page <span className="font-medium">1</span> of <span className="font-medium">10</span>
          </div>
          <div className="flex items-center space-x-1">
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">1</button>
            <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">2</button>
            <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">3</button>
            <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">4</button>
            <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">5</button>
            <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">6</button>
            <span className="px-2 py-1 text-sm text-gray-700">...</span>
            <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">10</button>
            <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">»</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadTable;