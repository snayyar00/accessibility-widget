import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { MdEmail, MdDelete, MdAdd, MdSend, MdUpload, MdSave } from 'react-icons/md';
import { SEND_BULK_EMAIL } from '@/queries/bulkEmail/sendBulkEmail';
import { SAVE_BULK_EMAIL_RECIPIENTS } from '@/queries/bulkEmail/saveBulkEmailRecipients';
import Input from '@/components/Common/Input/Input';
import Button from '@/components/Common/Button';
import useDocumentHeader from '@/hooks/useDocumentTitle';

export interface CsvRecipient {
  username: string;
  email: string;
}

/** Parse a single CSV line handling quoted fields (e.g. "name","email") */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/** Parse CSV text: expects header row with name/email (or username/email), then data rows */
function parseCsv(csvText: string): CsvRecipient[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const nameCol = header.findIndex((h) => h === 'name' || h === 'username' || h === 'fullname');
  const emailCol = header.findIndex((h) => h === 'email' || h === 'emailaddress');
  const fallbackNameCol = nameCol >= 0 ? nameCol : 0;
  const fallbackEmailCol = emailCol >= 0 ? emailCol : (header.length > 1 ? 1 : 0);
  const recipients: CsvRecipient[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const username = (cells[fallbackNameCol] ?? '').trim();
    const email = (cells[fallbackEmailCol] ?? '').trim();
    if (email && emailRegex.test(email)) {
      recipients.push({ username: username || email, email });
    }
  }
  return recipients;
}

const BulkEmail: React.FC = () => {
  useDocumentHeader({ title: 'Bulk Email Sender' });
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [csvRecipients, setCsvRecipients] = useState<CsvRecipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subject = 'Free accessibility check of your homepage — reply to confirm your spot';
  const htmlContent = ''; // Content is in the bulkEmail.mjml template

  const [sendBulkEmailMutation] = useMutation(SEND_BULK_EMAIL, {
    onCompleted: (data) => {
      if (data?.sendBulkEmail?.success) {
        toast.success(
          `Email sent successfully to ${data.sendBulkEmail.sentCount} recipient(s)!`,
        );
        setRecipients(['']);
      } else {
        toast.error(data?.sendBulkEmail?.message || 'Failed to send emails');
      }
      setIsSending(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send bulk email');
      setIsSending(false);
    },
  });

  const [saveBulkEmailRecipientsMutation] = useMutation(SAVE_BULK_EMAIL_RECIPIENTS, {
    onCompleted: (data) => {
      if (data?.saveBulkEmailRecipients?.success) {
        toast.success(data.saveBulkEmailRecipients.message);
      } else {
        toast.error(data?.saveBulkEmailRecipients?.message || 'Failed to save recipients');
      }
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save recipients');
      setIsSaving(false);
    },
  });

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error('No valid name/email rows found. CSV should have a header with "name" and "email" (or "username") columns.');
        return;
      }
      setCsvRecipients(parsed);
      toast.success(`Loaded ${parsed.length} recipient(s) from CSV`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleSaveToDatabase = async () => {
    if (csvRecipients.length === 0) {
      toast.error('No recipients to save. Upload a CSV first.');
      return;
    }
    setIsSaving(true);
    try {
      await saveBulkEmailRecipientsMutation({
        variables: { recipients: csvRecipients },
      });
    } catch {
      setIsSaving(false);
    }
  };

  const handleUseCsvForSending = () => {
    if (csvRecipients.length === 0) return;
    setRecipients(csvRecipients.map((r) => r.email));
    toast.success(`Using ${csvRecipients.length} email(s) from CSV for sending`);
  };

  const handleRemoveCsvRow = (index: number) => {
    setCsvRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const handleRemoveRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const handlePasteEmails = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emailList = pastedText
      .split(/[\n,;]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0 && email.includes('@'));

    if (emailList.length > 0) {
      setRecipients(emailList);
      toast.success(`Added ${emailList.length} email(s) from clipboard`);
    }
  };

  const validateEmails = (emails: string[]): string[] => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.filter((email) => email.trim() && emailRegex.test(email.trim()));
  };

  const handleSend = async () => {
    const validRecipients = validateEmails(recipients);
    if (validRecipients.length === 0) {
      toast.error('Please add at least one valid email address');
      return;
    }
    setIsSending(true);
    try {
      await sendBulkEmailMutation({
        variables: {
          input: {
            recipients: validRecipients,
            subject: subject.trim(),
            htmlContent: htmlContent.trim(),
          },
        },
      });
    } catch {
      setIsSending(false);
    }
  };

  const validRecipientsCount = validateEmails(recipients).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bulk Email Sender
            </h1>
            <p className="text-gray-600">
              Send the free accessibility check offer to multiple recipients
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/bulk-email/send" className="text-blue-600 hover:underline">
              Send to recipients from DB
            </Link>
            <span className="text-gray-400">|</span>
            <Link to="/bulk-email/sent" className="text-blue-600 hover:underline">
              View sent emails
            </Link>
          </div>
        </div>

        {/* CSV Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Upload CSV</h2>
          <p className="text-sm text-gray-600">
            CSV should have a header row with columns like <strong>name</strong> (or username) and <strong>email</strong>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              className="hidden"
              aria-label="Choose CSV file"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <MdUpload className="w-5 h-5" />
              Choose CSV file
            </Button>
            {csvRecipients.length > 0 && (
              <>
                <Button
                  type="button"
                  color="primary"
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MdSave className="w-5 h-5" />
                  )}
                  Save to database ({csvRecipients.length})
                </Button>
                <Button
                  type="button"
                  onClick={handleUseCsvForSending}
                  className="flex items-center gap-2"
                >
                  Use these for sending
                </Button>
              </>
            )}
          </div>

          {csvRecipients.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-2 w-10" aria-label="Remove row" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {csvRecipients.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">{row.username}</td>
                        <td className="px-4 py-2 text-gray-700">{row.email}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveCsvRow(index)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            aria-label="Remove row"
                          >
                            <MdDelete className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
                {csvRecipients.length} recipient(s) from CSV
              </p>
            </div>
          )}
        </div>

        {/* Manual Recipients Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <label className="block text-sm font-medium text-gray-700">
            Recipients ({validRecipientsCount} valid)
          </label>
          <div className="space-y-3">
            {recipients.map((recipient, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipient}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleRecipientChange(index, e.target.value)
                  }
                  className="flex-1"
                />
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove recipient"
                  >
                    <MdDelete className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAddRecipient}
                className="flex items-center gap-2"
              >
                <MdAdd className="w-4 h-4" />
                Add Recipient
              </Button>
              <div className="flex-1">
                <textarea
                  placeholder="Or paste multiple emails (one per line, or comma/semicolon separated)"
                  onPaste={handlePasteEmails}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              color="primary"
              onClick={handleSend}
              disabled={isSending || validRecipientsCount === 0}
              className="flex items-center gap-2 min-w-[140px] justify-center"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MdSend className="w-4 h-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <MdEmail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Upload a CSV with <strong>name</strong> and <strong>email</strong> columns, or add/paste emails below</li>
                <li>Review the table, then click &quot;Save to database&quot; to store recipients in the database</li>
                <li>Use &quot;Use these for sending&quot; to fill the send list from CSV, or add emails manually</li>
                <li>Click &quot;Send Email&quot; to send to all valid recipients</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEmail;
