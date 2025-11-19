import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { getAuthenticationCookie } from '@/utils/cookie';
import { FaUpload, FaSpinner, FaCheckCircle, FaTimesCircle, FaSearch, FaCheck } from 'react-icons/fa';

interface CodeResult {
  code: string;
  success: boolean;
  email?: string;
  error?: string;
  paymentLink?: string;
}

interface ApiResponse {
  message: string;
  total: number;
  successful: number;
  failed: number;
  results: CodeResult[];
}

interface CodeLookupResult {
  code: string;
  found: boolean;
  email?: string;
  userId?: number;
  error?: string;
  paymentLink?: string;
}

interface LookupResponse {
  message: string;
  total: number;
  found: number;
  notFound: number;
  results: CodeLookupResult[];
}

const BillingLinks: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [manualCodesText, setManualCodesText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [lookupResults, setLookupResults] = useState<LookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  };

  const handleSubmit = async () => {
    if (inputMode === 'csv' && !file) {
      toast.error('Please select a CSV file');
      return;
    }

    if (inputMode === 'manual') {
      if (!lookupResults || lookupResults.found === 0) {
        toast.error('Please lookup codes first');
        return;
      }
    }

    setLoading(true);
    setResults(null);

    const token = getAuthenticationCookie();

    try {
      let response: Response;

      if (inputMode === 'csv' && file) {
        const formData = new FormData();
        formData.append('csvFile', file);
        response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/send-billing-links`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });
      } else {
        // Manual mode - should not reach here if lookup is done first
        toast.error('Please lookup codes first');
        setLoading(false);
        return;
      }

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process codes');
      }

      setResults(data);
      toast.success(`Processed ${data.total} codes: ${data.successful} successful, ${data.failed} failed`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'An error occurred while processing the codes');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setManualCodesText('');
    setLookupResults(null);
    setShowConfirmation(false);
  };

  const handleLookupCodes = async () => {
    if (!manualCodesText.trim()) {
      toast.error('Please enter at least one code');
      return;
    }

    // Parse codes from text (space, comma, or newline separated)
    const codes = manualCodesText
      .split(/[\s,\n]+/)
      .map((code) => code.trim())
      .filter((code) => code.length > 0);

    if (codes.length === 0) {
      toast.error('No valid codes found');
      return;
    }

    setLookupLoading(true);
    setLookupResults(null);
    setShowConfirmation(false);

    const token = getAuthenticationCookie();

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/lookup-billing-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ codes }),
      });

      const data: LookupResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to lookup codes');
      }

      setLookupResults(data);
      toast.success(`Looked up ${data.total} codes: ${data.found} found, ${data.notFound} not found`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'An error occurred while looking up codes');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleConfirmSend = async () => {
    if (!lookupResults) return;

    const codesToSend = lookupResults.results
      .filter((r) => r.found && r.email && r.paymentLink)
      .map((r) => r.code);

    if (codesToSend.length === 0) {
      toast.error('No valid codes to send');
      return;
    }

    setLoading(true);
    setResults(null);

    const token = getAuthenticationCookie();

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/send-billing-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ codes: codesToSend }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send billing links');
      }

      setResults(data);
      setLookupResults(null);
      setShowConfirmation(false);
      toast.success(`Processed ${data.total} codes: ${data.successful} successful, ${data.failed} failed`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'An error occurred while sending billing links');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Send Billing Links</h1>
        <p className="text-gray-600 mb-6">
          Upload a CSV file with revoked codes or enter codes manually to send $30 billing links to users.
        </p>

        {!results && (
          <div className="space-y-6">
            {/* Input Mode Toggle */}
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => {
                  setInputMode('csv');
                  setFile(null);
                  setManualCodesText('');
                  setLookupResults(null);
                  setShowConfirmation(false);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  inputMode === 'csv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Upload CSV
              </button>
              <button
                onClick={() => {
                  setInputMode('manual');
                  setFile(null);
                  setLookupResults(null);
                  setShowConfirmation(false);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  inputMode === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Enter Codes Manually
              </button>
            </div>

            {/* CSV Upload Section */}
            {inputMode === 'csv' && (
              <div className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    Select CSV File
                  </label>
                  {file && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">
                        Selected: <span className="font-semibold">{file.name}</span>
                      </p>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="flex gap-4">
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaUpload />
                          Process CSV
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Manual Code Entry Section */}
            {inputMode === 'manual' && !showConfirmation && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Enter Codes</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter multiple codes separated by spaces, commas, or new lines. Example: <code className="bg-gray-200 px-2 py-1 rounded">NEHDU9WW 5S4RACDX 3UCMCQOZ</code>
                  </p>
                  <textarea
                    value={manualCodesText}
                    onChange={(e) => setManualCodesText(e.target.value)}
                    placeholder="Enter codes separated by spaces, commas, or new lines..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] font-mono text-sm"
                    disabled={lookupLoading}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleLookupCodes}
                    disabled={lookupLoading || !manualCodesText.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {lookupLoading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Looking up...
                      </>
                    ) : (
                      <>
                        <FaSearch />
                        Lookup Codes
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={lookupLoading}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* Lookup Results Preview */}
                {lookupResults && (
                  <div className="mt-6">
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Lookup Results</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Codes</p>
                          <p className="text-2xl font-bold">{lookupResults.total}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Found</p>
                          <p className="text-2xl font-bold text-green-600">{lookupResults.found}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Not Found</p>
                          <p className="text-2xl font-bold text-red-600">{lookupResults.notFound}</p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              Code
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              Payment Link
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              Error
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {lookupResults.results.map((result, index) => (
                            <tr key={index} className={result.found ? 'bg-green-50' : 'bg-red-50'}>
                              <td className="px-4 py-3 text-sm font-mono">{result.code}</td>
                              <td className="px-4 py-3 text-sm">
                                {result.found ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <FaCheckCircle />
                                    Found
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-red-600">
                                    <FaTimesCircle />
                                    Not Found
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">{result.email || '-'}</td>
                              <td className="px-4 py-3 text-sm">
                                {result.paymentLink ? (
                                  <a
                                    href={result.paymentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline break-all"
                                  >
                                    {result.paymentLink.substring(0, 50)}...
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-red-600">{result.error || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {lookupResults.found > 0 && (
                      <div className="mt-6 flex gap-4">
                        <button
                          onClick={() => setShowConfirmation(true)}
                          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FaCheck />
                          Confirm & Send Billing Links ({lookupResults.found})
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Confirmation Step */}
            {inputMode === 'manual' && showConfirmation && lookupResults && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-yellow-800">Confirm Sending Billing Links</h3>
                  <p className="text-gray-700 mb-4">
                    You are about to send billing links to <strong>{lookupResults.found} user(s)</strong>. 
                    This will send emails with payment links to the following users:
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
                    <ul className="space-y-2">
                      {lookupResults.results
                        .filter((r) => r.found && r.email)
                        .map((result, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <FaCheckCircle className="text-green-600" />
                            <span className="font-mono">{result.code}</span>
                            <span className="text-gray-500">→</span>
                            <span className="font-medium">{result.email}</span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleConfirmSend}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          Confirm & Send
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowConfirmation(false)}
                      disabled={loading}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="mt-6">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Processing Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Codes</p>
                  <p className="text-2xl font-bold">{results.total}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{results.successful}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Payment Link
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.results.map((result, index) => (
                    <tr key={index} className={result.success ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-4 py-3 text-sm font-mono">{result.code}</td>
                      <td className="px-4 py-3 text-sm">
                        {result.success ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <FaCheckCircle />
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <FaTimesCircle />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{result.email || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {result.paymentLink ? (
                          <a
                            href={result.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {result.paymentLink.substring(0, 50)}...
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600">{result.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Process More Codes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingLinks;

