import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { MdEmail, MdDelete, MdAdd, MdSend } from 'react-icons/md';
import { SEND_BULK_EMAIL } from '@/queries/bulkEmail/sendBulkEmail';
import Input from '@/components/Common/Input/Input';
import Button from '@/components/Common/Button';
import FormControl from '@/components/Common/FormControl';
import useDocumentHeader from '@/hooks/useDocumentTitle';

const BulkEmail: React.FC = () => {
  useDocumentHeader({ title: 'Bulk Email Sender' });
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [isSending, setIsSending] = useState(false);

  // Hardcoded email content
  const subject = 'Introducing the WebAbility Agency Franchise Program';
  const htmlContent = `<p>We're excited to introduce the <strong>WebAbility Agency Franchise Program</strong> — a powerful opportunity for agencies like yours to offer world-class accessibility widgets directly to your clients.</p>

<p>As a WebAbility Agency Partner, you can:</p>
<ul>
  <li>Sell accessibility plans from your own branded website</li>
  <li>Earn 50% commission on every plan sold</li>
  <li>Expand your service offerings with zero technical complexity</li>
</ul>

<p>Getting started is simple. Just connect your branded subdomain to our server following the steps in the guide below:</p>

<p>👉 <a href="https://docs.google.com/document/d/1V9vO9iSIDR85wdp81yHJDC8kgWfPMu0jzLHTEGkk25M/edit?tab=t.0" style="color: #007bff;">Setup Guide</a></p>

<p>If you need help with your setup or have any questions, our team is ready to assist anytime — just reply to this email.</p>

<p>Let's grow together and make the web more accessible for everyone!</p>

<p>Best regards,<br>
WebAbility Team</p>`;

  const [sendBulkEmailMutation] = useMutation(SEND_BULK_EMAIL, {
    onCompleted: (data) => {
      if (data?.sendBulkEmail?.success) {
        toast.success(
          `Email sent successfully to ${data.sendBulkEmail.sentCount} recipient(s)!`,
        );
        // Reset form
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
    // Validate recipients
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
    } catch (error) {
      console.error('Error sending bulk email:', error);
      setIsSending(false);
    }
  };

  const validRecipientsCount = validateEmails(recipients).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bulk Email Sender
          </h1>
          <p className="text-gray-600">
            Send the Agency Franchise Program email to multiple recipients
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Recipients Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
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
          </div>

          {/* Send Button */}
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

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <MdEmail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Add recipient email addresses one by one, or paste multiple at once</li>
                <li>The email content is pre-configured with the Agency Franchise Program information</li>
                <li>Click "Send Email" to send to all valid recipients</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEmail;

