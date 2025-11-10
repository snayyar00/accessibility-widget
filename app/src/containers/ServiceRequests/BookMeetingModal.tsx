import React, { useState } from 'react';
import { FiX, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import createMeetingRequestMutation from '@/queries/serviceRequests/createMeetingRequest';

interface BookMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookMeetingModal: React.FC<BookMeetingModalProps> = ({ isOpen, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+92');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [service, setService] = useState('');
  const [message, setMessage] = useState('');

  const [createMeetingRequest, { loading }] = useMutation(createMeetingRequestMutation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data } = await createMeetingRequest({
        variables: {
          input: {
            fullName,
            email,
            countryCode,
            phoneNumber,
            requestedService: service,
            message,
          },
        },
      });

      if (data?.createMeetingRequest?.success) {
        toast.success(data.createMeetingRequest.message);
        // Reset form
        setFullName('');
        setEmail('');
        setCountryCode('+92');
        setPhoneNumber('');
        setService('');
        setMessage('');
        onClose();
      }
    } catch (error: any) {
      console.error('Error submitting meeting request:', error);
      toast.error(error?.message || 'Failed to submit meeting request. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-sapphire-blue/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 transform animate-fadeIn">
        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-gray-100">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#445AE7] to-[#667eea] bg-clip-text text-transparent">
                Let us know how we can help you!
              </h2>
              <p className="text-gray-500 mt-1">Schedule a meeting with our team</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
              aria-label="Close modal"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200"
                required
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Phone number <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-40">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200 font-medium bg-white"
                  >
                    <option value="+1">USA (+1)</option>
                    <option value="+44">UK (+44)</option>
                    <option value="+92">Pakistan (+92)</option>
                    <option value="+91">India (+91)</option>
                    <option value="+61">Australia (+61)</option>
                    <option value="+86">China (+86)</option>
                  </select>
                  <FiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#445AE7] pointer-events-none" />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="3104601270"
                  className="w-full sm:flex-grow px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Requested Service */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Requested service <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200 text-gray-700 font-medium bg-white"
                  required
                >
                  <option value="">Select a service</option>
                  <option value="file-accessibility">File Accessibility</option>
                  <option value="expert-audit">Expert Audit</option>
                  <option value="vpat">VPAT</option>
                  <option value="user-testing">User Testing</option>
                  <option value="consultation">General Consultation</option>
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#445AE7] pointer-events-none" />
              </div>
            </div>

            {/* How can we help */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                How can we help? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your accessibility needs..."
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200 resize-y"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#445AE7] to-[#667eea] text-white rounded-xl hover:from-[#3347d1] hover:to-[#5468ea] transition-all duration-300 font-bold shadow-lg hover:shadow-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                <>
                  Book a meeting
                  <FiChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookMeetingModal;

