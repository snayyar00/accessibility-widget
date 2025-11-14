import React, { useState } from 'react';
import { FiX, FiPlay, FiLink, FiPlus, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import createQuoteRequestMutation from '@/queries/serviceRequests/createQuoteRequest';

interface GetQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GetQuoteModal: React.FC<GetQuoteModalProps> = ({ isOpen, onClose }) => {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [frequency, setFrequency] = useState('');
  const [links, setLinks] = useState(['']);

  const [createQuoteRequest, { loading }] = useMutation(createQuoteRequestMutation);

  const handleAddLink = () => {
    setLinks([...links, '']);
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data } = await createQuoteRequest({
        variables: {
          input: {
            projectName,
            projectType,
            projectDetails,
            frequency: frequency || null,
            projectLinks: links.filter(link => link.trim() !== ''),
          },
        },
      });

      if (data?.createQuoteRequest?.success) {
        toast.success(data.createQuoteRequest.message);
        // Reset form
        setProjectName('');
        setProjectType('');
        setProjectDetails('');
        setFrequency('');
        setLinks(['']);
        onClose();
      }
    } catch (error: any) {
      console.error('Error submitting quote request:', error);
      toast.error(error?.message || 'Failed to submit quote request. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-sapphire-blue/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100 transform animate-fadeIn">
        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-gray-100">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#445AE7] to-[#667eea] bg-clip-text text-transparent">
                Tell us about your project
              </h2>
              <p className="text-gray-500 mt-1">We'll get back to you with a custom quote</p>
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
            {/* Project Name */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Name your project <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="i.e., Company Name, Project Type, Project Name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200"
                required
              />
            </div>

            {/* Project Type */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Project Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200 text-gray-700 font-medium bg-white"
                  required
                >
                  <option value="">Please select a project type</option>
                  <option value="file-accessibility">File Accessibility</option>
                  <option value="expert-audit">Expert Audit</option>
                  <option value="vpat">VPAT</option>
                  <option value="user-testing">User Testing</option>
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#445AE7] pointer-events-none" />
              </div>
            </div>

            {/* Project Details */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Project details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                placeholder="Include any relevant details like deadlines, specific instructions, questions, etc..."
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200 resize-y"
                required
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Frequency
              </label>
              <div className="relative">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200 text-gray-700 font-medium bg-white"
                >
                  <option value="">Select frequency</option>
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#445AE7] pointer-events-none" />
              </div>
            </div>

            {/* Project Links */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Add your project's links <span className="text-red-500">*</span>
              </label>
              {links.map((link, index) => (
                <div key={index} className="mb-3">
                  <div className="relative">
                    <FiLink className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#445AE7]" />
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      placeholder="https://"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#445AE7]/50 focus:border-[#445AE7] transition-all duration-200"
                      required={index === 0}
                    />
                  </div>
                </div>
              ))}
              <p className="text-gray-500 text-sm mb-3">
                For files or media projects, you can add cloud storage links to the resources. 
                For audits and testing projects, add links to your websites.
              </p>
              <button
                type="button"
                onClick={handleAddLink}
                className="flex items-center gap-2 text-[#445AE7] hover:text-[#667eea] font-semibold transition-colors duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-[#445AE7]/10 flex items-center justify-center">
                  <FiPlus className="w-4 h-4" />
                </div>
                Add another link
              </button>
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
                  Get a Quote
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

export default GetQuoteModal;

