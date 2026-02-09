import React from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_BULK_EMAIL_RECIPIENTS } from '@/queries/bulkEmail/getBulkEmailRecipients';
import useDocumentHeader from '@/hooks/useDocumentTitle';

interface SentRecipient {
  id: number;
  username: string;
  email: string;
  emailSent: boolean;
  createdAt: string | null;
  sentAt: string | null;
}

const BulkEmailSent: React.FC = () => {
  useDocumentHeader({ title: 'Sent Emails' });

  const { data, loading } = useQuery(GET_BULK_EMAIL_RECIPIENTS, {
    variables: { filter: { emailSent: true } },
    fetchPolicy: 'cache-and-network',
  });

  const recipients: SentRecipient[] = data?.bulkEmailRecipients ?? [];

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sent Emails</h1>
            <p className="text-gray-600 text-sm mt-1">
              Recipients who have been sent the free accessibility check offer.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/bulk-email" className="text-sm text-blue-600 hover:underline">
              Upload CSV
            </Link>
            <span className="text-gray-400">|</span>
            <Link to="/bulk-email/send" className="text-sm text-blue-600 hover:underline">
              Send to recipients
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="max-h-[60vh] overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : recipients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No emails sent yet. Go to &quot;Send to recipients&quot; to send the free accessibility check offer.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Sent at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {recipients.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{r.username}</td>
                      <td className="px-4 py-3 text-gray-700">{r.email}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(r.sentAt ?? r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {recipients.length > 0 && (
            <p className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
              {recipients.length} recipient(s) sent
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkEmailSent;
