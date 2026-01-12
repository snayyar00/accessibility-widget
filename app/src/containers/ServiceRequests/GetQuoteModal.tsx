import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiPlay, FiLink, FiPlus, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import createQuoteRequestMutation from '@/queries/serviceRequests/createQuoteRequest';

interface GetQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const focusableSelectors =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const GetQuoteModal: React.FC<GetQuoteModalProps> = ({ isOpen, onClose }) => {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [frequency, setFrequency] = useState('');
  const [links, setLinks] = useState(['']);

  const [createQuoteRequest, { loading }] = useMutation(createQuoteRequestMutation);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  const handleAddLink = () => {
    setLinks([...links, '']);
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before opening the modal
    lastActiveRef.current = document.activeElement as HTMLElement;

    const modal = modalRef.current;
    if (!modal) return;

    const getFocusableElements = () => {
      return Array.from(
        modal.querySelectorAll<HTMLElement>(focusableSelectors),
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        return (
          !el.hasAttribute('disabled') &&
          !el.getAttribute('aria-hidden') &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      });
    };

    // Focus the dialog first so screen readers announce the role and label
    // Then move focus to the first focusable element
    const focusables = getFocusableElements();
    const firstFocusable = focusables[0] || modal;
    
    // Small delay to ensure modal is fully rendered
    setTimeout(() => {
      // Focus the dialog first to trigger screen reader announcement
      modal.focus();
      
      // Then move focus to the first focusable element after a brief delay
      // This allows screen readers to announce the dialog before moving focus
      if (firstFocusable !== modal) {
        setTimeout(() => {
          firstFocusable.focus();
        }, 100);
      }
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const currentFocusables = getFocusableElements();
      if (currentFocusables.length === 0) {
        event.preventDefault();
        return;
      }

      const currentIndex = currentFocusables.indexOf(
        document.activeElement as HTMLElement,
      );

      let nextIndex = currentIndex;
      if (event.shiftKey) {
        // Shift + Tab: move to previous element, or wrap to last
        nextIndex =
          currentIndex <= 0
            ? currentFocusables.length - 1
            : currentIndex - 1;
      } else {
        // Tab: move to next element, or wrap to first
        nextIndex =
          currentIndex === currentFocusables.length - 1
            ? 0
            : currentIndex + 1;
      }

      event.preventDefault();
      currentFocusables[nextIndex].focus();
    };

    modal.addEventListener('keydown', handleKeyDown);

    return () => {
      modal.removeEventListener('keydown', handleKeyDown);
      // Return focus to the element that had focus before opening the modal
      const lastActive = lastActiveRef.current;
      if (lastActive && document.contains(lastActive)) {
        lastActive.focus();
      }
    };
  }, [isOpen]);

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
    <div 
      className="fixed top-0 left-0 w-full h-full bg-sapphire-blue/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      aria-hidden={!isOpen}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 transform animate-fadeIn focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
        aria-label="Tell us about your project"
        aria-describedby="quote-modal-description"
        tabIndex={-1}
      >
        <div className="p-5 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
            <div>
              <h2 id="quote-modal-title" className="text-2xl md:text-3xl font-bold" style={{ color: '#0052CC' }}>
                Tell us about your project
              </h2>
              <p id="quote-modal-description" className="text-gray-500 text-sm mt-0.5">We'll get back to you with a custom quote</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
              aria-label="Close modal"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>



          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Required Fields Instructions */}
            <p className="text-sm text-gray-600 mb-2" role="note" aria-live="polite">
              Fields marked with an asterisk (<span className="text-red-500">*</span>) are required.
            </p>
            
            {/* Project Name and Type - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="project-name" className="block text-gray-700 font-medium mb-1.5 text-sm">
                  Name your project <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="i.e., Company Name, Project Name"
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 placeholder:text-[#374151]"
                  style={{
                    '--focus-ring-color': 'rgba(0, 82, 204, 0.5)',
                    '--focus-border-color': '#0052CC',
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 82, 204, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#6b7280';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="project-type" className="block text-gray-700 font-medium mb-1.5 text-sm">
                  Project Type <span className="text-red-500" aria-label="required">*</span>
                </label>
                <div className="relative">
                  <select
                    id="project-type"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border-2 border-gray-500 rounded-lg appearance-none focus:outline-none focus:ring-2 transition-all duration-200 text-gray-700 font-medium bg-white"
                    style={{
                      '--focus-ring-color': 'rgba(0, 82, 204, 0.5)',
                      '--focus-border-color': '#0052CC',
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0052CC';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 82, 204, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#6b7280';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                    aria-required="true"
                  >
                    <option value="">Select project type</option>
                    <option value="file-accessibility">File Accessibility</option>
                    <option value="expert-audit">Expert Audit</option>
                    <option value="vpat">VPAT</option>
                    <option value="user-testing">User Testing</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none w-4 h-4" style={{ color: '#0052CC' }} />
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div>
              <label htmlFor="project-details" className="block text-gray-700 font-medium mb-1.5 text-sm">
                Project details <span className="text-red-500" aria-label="required">*</span>
              </label>
              <textarea
                id="project-details"
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                placeholder="Include relevant details like deadlines, instructions, questions..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 resize-none placeholder:text-[#374151]"
                style={{
                  '--focus-ring-color': 'rgba(0, 82, 204, 0.5)',
                  '--focus-border-color': '#0052CC',
                } as React.CSSProperties}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0052CC';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 82, 204, 0.5)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#6b7280';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
                aria-required="true"
              />
            </div>

            {/* Frequency */}
            <div>
              <label htmlFor="frequency" className="block text-gray-700 font-medium mb-1.5 text-sm">
                Frequency
              </label>
              <div className="relative">
                <select
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-500 rounded-lg appearance-none focus:outline-none focus:ring-2 transition-all duration-200 text-gray-700 font-medium bg-white"
                  style={{
                    '--focus-ring-color': 'rgba(0, 82, 204, 0.5)',
                    '--focus-border-color': '#0052CC',
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0052CC';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 82, 204, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#6b7280';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select frequency</option>
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
                  <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none w-4 h-4" style={{ color: '#0052CC' }} />
              </div>
            </div>

            {/* Project Links */}
            <div>
              <label htmlFor="project-link-0" className="block text-gray-700 font-medium mb-1.5 text-sm">
                Add your project's links <span className="text-red-500" aria-label="required">*</span>
              </label>
              {links.map((link, index) => (
                <div key={index} className="mb-2">
                  <div className="relative">
                    <FiLink className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#0052CC' }} aria-hidden="true" />
                    <input
                      id={index === 0 ? "project-link-0" : `project-link-${index}`}
                      type="url"
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      placeholder="https://"
                      className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-gray-500 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 placeholder:text-[#374151]"
                      style={{
                        '--focus-ring-color': 'rgba(0, 82, 204, 0.5)',
                        '--focus-border-color': '#0052CC',
                      } as React.CSSProperties}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#0052CC';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 82, 204, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#6b7280';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      required={index === 0}
                      aria-required={index === 0}
                      aria-label={index === 0 ? "Add your project's links" : `Project link ${index + 1}`}
                    />
                  </div>
                </div>
              ))}
              <p className="text-gray-500 text-xs mb-2">
                Add cloud storage links for files or website links for audits/testing.
              </p>
              <button
                type="button"
                onClick={handleAddLink}
                className="flex items-center gap-1.5 font-semibold transition-colors duration-200 text-sm"
                style={{ color: '#0052CC' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#003EB8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#0052CC';
                }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 82, 204, 0.1)' }}>
                  <FiPlus className="w-3.5 h-3.5" />
                </div>
                Add another link
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-all duration-300 font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              style={{
                backgroundColor: loading ? '#9ca3af' : '#0052CC',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#003EB8';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#0052CC';
                }
              }}
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

