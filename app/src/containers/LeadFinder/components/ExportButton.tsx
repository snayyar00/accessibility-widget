import React from 'react';
import Button from '@/components/Common/Button';
import { ExportButtonProps, Lead, Email } from '../types';
import { HiDownload } from 'react-icons/hi';

const ExportButton: React.FC<ExportButtonProps> = ({ leads }) => {
  const exportToCSV = () => {
    if (leads.length === 0) {
      return;
    }

    // CSV headers
    const headers = [
      'Business Name',
      'Website',
      'Address', 
      'Phone',
      'Category',
      'Email',
      'Email Type',
      'Email Confidence',
      'Created At'
    ];

    // Convert leads to CSV rows
    const rows = leads.map(lead => {
      // If lead has multiple emails, create separate rows for each
      if (lead.emails && lead.emails.length > 0) {
        return lead.emails.map((email: Email) => [
          lead.businessName,
          lead.website || '',
          lead.address || '',
          lead.phone || '',
          lead.category || '',
          email.email,
          email.type,
          email.confidence.toString(),
          lead.createdAt || new Date().toISOString()
        ]);
      } else {
        // Lead without email
        return [[
          lead.businessName,
          lead.website || '',
          lead.address || '',
          lead.phone || '',
          lead.category || '',
          '',
          '',
          '',
          lead.createdAt || new Date().toISOString()
        ]];
      }
    }).flat();

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportToJSON = () => {
    if (leads.length === 0) {
      return;
    }

    const jsonContent = JSON.stringify(leads, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (leads.length === 0) {
    return null;
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={exportToCSV}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200"
      >
        <HiDownload className="w-4 h-4 mr-2" />
        Export CSV
      </button>
      
      <button
        onClick={exportToJSON}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200"
      >
        <HiDownload className="w-4 h-4 mr-2" />
        Export JSON
      </button>
    </div>
  );
};

export default ExportButton;