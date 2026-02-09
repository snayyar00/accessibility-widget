import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MdSend, MdCheckBox, MdCheckBoxOutlineBlank, MdSearch } from 'react-icons/md';
import { GET_BULK_EMAIL_RECIPIENTS } from '@/queries/bulkEmail/getBulkEmailRecipients';
import { SEND_BULK_EMAIL_TO_RECIPIENTS } from '@/queries/bulkEmail/sendBulkEmailToRecipients';
import Button from '@/components/Common/Button';
import Input from '@/components/Common/Input/Input';
import useDocumentHeader from '@/hooks/useDocumentTitle';

const DEFAULT_SUBJECT = 'Free accessibility check of your homepage , reply to confirm your spot';
const DEFAULT_HTML = ''; // Content is in the bulkEmail.mjml template

interface Recipient {
  id: number;
  username: string;
  email: string;
  emailSent: boolean;
  createdAt: string | null;
  sentAt: string | null;
}

const BulkEmailSend: React.FC = () => {
  useDocumentHeader({ title: 'Send Email to Recipients' });
  const [filterSent, setFilterSent] = useState<boolean | null>(false); // false = not sent, null = all
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const filter = useMemo(() => {
    const f: { emailSent?: boolean; search?: string } = {};
    if (filterSent !== null) f.emailSent = filterSent;
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [filterSent, search]);

  const { data, loading, refetch } = useQuery(GET_BULK_EMAIL_RECIPIENTS, {
    variables: { filter: filter || null },
    fetchPolicy: 'cache-and-network',
  });

  const [sendMutation] = useMutation(SEND_BULK_EMAIL_TO_RECIPIENTS, {
    onCompleted: (d) => {
      if (d?.sendBulkEmailToRecipients?.success) {
        toast.success(d.sendBulkEmailToRecipients.message);
        setSelectedIds(new Set());
        setConfirmOpen(false);
        refetch();
      } else {
        toast.error(d?.sendBulkEmailToRecipients?.message || 'Failed to send');
      }
      setIsSending(false);
    },
    onError: (e) => {
      toast.error(e.message || 'Failed to send emails');
      setIsSending(false);
    },
  });

  const recipients: Recipient[] = data?.bulkEmailRecipients ?? [];
  const allIds = recipients.map((r) => r.id);
  const selectedCount = selectedIds.size;
  const isAllSelected = recipients.length > 0 && allIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmSend = () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one recipient');
      return;
    }
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setIsSending(true);
    try {
      await sendMutation({
        variables: {
          recipientIds: Array.from(selectedIds),
          subject: DEFAULT_SUBJECT,
          htmlContent: DEFAULT_HTML,
        },
      });
    } catch {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Send Email to Recipients</h1>
            <p className="text-gray-600 text-sm mt-1">
              Select recipients from the database and send the free accessibility check offer.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/bulk-email"
              className="text-sm text-blue-600 hover:underline"
            >
              Upload CSV
            </Link>
            <span className="text-gray-400">|</span>
            <Link
              to="/bulk-email/sent"
              className="text-sm text-blue-600 hover:underline"
            >
              View sent
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <button
                type="button"
                onClick={() => setFilterSent(false)}
                className={`px-3 py-1.5 rounded-lg text-sm ${filterSent === false ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Not sent
              </button>
              <button
                type="button"
                onClick={() => setFilterSent(null)}
                className={`px-3 py-1.5 rounded-lg text-sm ${filterSent === null ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                All
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                disabled={recipients.length === 0}
              >
                {isAllSelected ? (
                  <MdCheckBox className="w-5 h-5 text-blue-600" />
                ) : (
                  <MdCheckBoxOutlineBlank className="w-5 h-5 text-gray-400" />
                )}
                Select all ({recipients.length})
              </button>
              {selectedCount > 0 && (
                <span className="text-sm text-gray-500">
                  {selectedCount} selected
                </span>
              )}
            </div>
            <Button
              type="button"
              color="primary"
              onClick={handleConfirmSend}
              disabled={selectedCount === 0 || isSending}
              className="flex items-center gap-2"
            >
              <MdSend className="w-5 h-5" />
              Send email to selected ({selectedCount})
            </Button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : recipients.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No recipients found. Upload a CSV on the Bulk Email page to add recipients.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-3 py-2" aria-label="Select" />
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {recipients.map((r) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-gray-50 ${r.emailSent ? 'opacity-90' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleSelect(r.id)}
                            className="p-1 rounded hover:bg-gray-100"
                            aria-label={selectedIds.has(r.id) ? 'Unselect' : 'Select'}
                          >
                            {selectedIds.has(r.id) ? (
                              <MdCheckBox className="w-5 h-5 text-blue-600" />
                            ) : (
                              <MdCheckBoxOutlineBlank className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-gray-900">{r.username}</td>
                        <td className="px-4 py-2 text-gray-700">{r.email}</td>
                        <td className="px-4 py-2">
                          {r.emailSent ? (
                            <span className="text-green-600 text-xs">Sent</span>
                          ) : (
                            <span className="text-amber-600 text-xs">Not sent</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm send</h3>
              <p className="text-gray-600 text-sm mb-4">
                Send the free accessibility check offer to <strong>{selectedCount}</strong> selected recipient(s)?
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isSending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  color="primary"
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex items-center gap-2"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MdSend className="w-5 h-5" />
                  )}
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkEmailSend;
