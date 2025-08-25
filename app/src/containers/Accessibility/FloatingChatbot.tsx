import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Search, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import { useLazyQuery } from '@apollo/client';
import FETCH_REPORT_BY_R2_KEY from '@/queries/accessibility/fetchReportByR2Key';

// Tailwind styles object
const styles = {
  chatbotContainer: 'fixed bottom-24 right-5 z-[1000]',
  chatbotButton: 'bg-blue-600 hover:bg-blue-700 transition-all duration-200 text-white rounded-full p-4 w-[68px] h-[68px] flex items-center justify-center cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105',
  chatbotWindow: `
    fixed
    bottom-20
    right-6
    left-auto
    w-[96vw]
    max-w-sm
    h-[85vh]
    rounded-xl
    shadow-2xl
    flex
    flex-col
    border
    border-gray-200
    overflow-hidden
    bg-white
    sm:bottom-20
    sm:right-6
    sm:w-[400px]
    sm:rounded-xl
    md:w-[440px]
    md:h-[600px]
    lg:h-[650px]
  `,
  chatHeader: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center shadow-md',
  headerTitle: 'text-lg font-semibold flex items-center gap-1',
  headerClose: 'p-2 hover:bg-blue-850 rounded-full transition-colors cursor-pointer',
  messagesContainer: 'flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50',
  message: 'rounded-xl p-4 text-sm shadow-sm max-w-[85%] leading-relaxed',
  userMessage: 'ml-auto bg-blue-600 text-white',
  aiMessage: 'bg-white border border-gray-200 shadow-sm',
  inputForm: 'p-4 border-t border-gray-200 bg-white',
  inputContainer: 'flex items-center gap-3',
  inputField: 'flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all',
  sendButton: 'bg-blue-600 hover:bg-blue-700 transition-all duration-0 text-white rounded-xl w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md',
  sendIcon: 'w-5 h-5'
};

// Interfaces
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UserProgress {
  hasScanned: boolean;
  currentStep: string;
  issuesDiscussed: string[];
  lastScannedUrl: string | null;
  preferredPlatform: string | null;
  priority?: string;
}

interface FloatingChatbotProps {
  scanResults?: any;
  onScanStart?: () => void;
  onScanComplete?: (results: any) => void;
  isScanning?: boolean;
}

// Custom useChat hook (moved outside component)
const useChat = ({ initialMessages, onError, onFinish }: { 
  initialMessages: Message[]; 
  onError?: (error: any) => void; 
  onFinish?: (message: Message) => void;
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent, scanResults?: any, userProgress?: UserProgress) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Map your GraphQL data to match Next.js structure exactly
      const transformedData = scanResults ? {
        techStack: scanResults.techStack || null,
        scanResults: scanResults || null,
        userProgress: userProgress || {
          hasScanned: true,
          currentStep: 'fixing',
          issuesDiscussed: [],
          lastScannedUrl: scanResults.url || null,
          preferredPlatform: scanResults.techStack?.accessibilityContext?.platform || 'Unknown'
        },
        fullScanData: {
          url: scanResults.url,
          score: scanResults.score,
          techStack: scanResults.techStack,
          // Map scriptCheckResult to widgetInfo structure
          widgetInfo: { 
            result: scanResults.scriptCheckResult === 'Web Ability' ? 'WebAbility' : 'None detected'
          },
          baseScore: scanResults.score || 0,
          enhancedScore: scanResults.scriptCheckResult === 'Web Ability' ? 
            Math.min((scanResults.score || 0) + 45, 95) : (scanResults.score || 0),
          hasWebAbilityWidget: scanResults.scriptCheckResult === 'Web Ability',
          webAbilityBonus: scanResults.scriptCheckResult === 'Web Ability' ? 45 : 0,
          // Use your GraphQL structure for accessibility issues
          accessibilityIssues: scanResults.ByFunctions || scanResults.axe?.errors || scanResults.htmlcs?.errors || [],
          rawAccessibilityData: {
            ByFunctions: scanResults.ByFunctions || [],
            axe: scanResults.axe || null,
            htmlcs: scanResults.htmlcs || null
          },
          issueCounts: {
            total: scanResults.ByFunctions?.reduce((count: number, func: any) => count + (func.Errors?.length || 0), 0) || 0,
            critical: 0,
            serious: 0,
            moderate: 0
          },
          platform: scanResults.techStack?.accessibilityContext?.platform || 'Unknown',
          platformType: scanResults.techStack?.accessibilityContext?.platform_type || '',
          completeScanResults: scanResults,
          isLiveScanData: true,
          canPerformScans: true
        }
      } : {
        canPerformScans: true,
        isLiveScanData: false
      };

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          ...transformedData
        }),
      });

      const data = await response.text();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data || 'I\'m here to help with accessibility issues.',
      };

      setMessages(prev => [...prev, assistantMessage]);
      onFinish?.(assistantMessage);
    } catch (error) {
      onError?.(error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const append = async (message: Partial<Message>) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: message.role || 'assistant',
      content: message.content || '',
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setInput,
    append,
  };
};

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ scanResults = null, onScanStart, onScanComplete, isScanning }) => {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState('');
  const [showScanInput, setShowScanInput] = useState(false);
  
  // Holding hands state management
  const [userProgress, setUserProgress] = useState<UserProgress>({
    hasScanned: false,
    currentStep: 'welcome',
    issuesDiscussed: [],
    lastScannedUrl: null,
    preferredPlatform: null
  });

  const [suggestedWebsites, setSuggestedWebsites] = useState([
    'webability.io',
    'google.com', 
    'github.com'
  ]);

  // Generate welcome message based on scan results
  const generateWelcomeMessage = () => {
    if (scanResults?.techStack?.accessibilityContext?.platform) {
      const { platform, platform_type } = scanResults.techStack.accessibilityContext;
      const score = scanResults.score;
      
      return `👋 **Welcome back!** 

Your **${platform}** website scored **${score}%** last time.

Ready to improve further? Let's continue! 🚀`;
    }
    
    return `👋 **Hi! I'm your accessibility assistant.**

I'll help you scan and fix your website in minutes.

**What's your website URL?** 👇`;
  };

  // Initialize useChat with proper data
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, append } = useChat({
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: generateWelcomeMessage()
    }],
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Chat error:', error);
      }
    },
    onFinish: (message) => {
      // Message finished callback
    }
  });

  // Rest of your component code stays the same...
  // Auto-focus and guide user when chat opens
  useEffect(() => {
    if (isOpen && !userProgress.hasScanned) {
      setShowScanInput(true)
      setTimeout(() => {
        const scanInput = document.querySelector('input[placeholder*="Enter website URL"]') as HTMLInputElement;
        if (scanInput) {
          scanInput.focus();
        }
      }, 300);
    }
  }, [isOpen, userProgress.hasScanned])

  // Smart URL formatting and validation
  const formatUrl = (url: string) => {
    if (!url) return '';
    let formatted = url.trim().toLowerCase();
    formatted = formatted.replace(/^https?:\/\/(www\.)?/, '');
    formatted = formatted.replace(/\/$/, '');
    return formatted;
  };

  // Enhanced scan function with progress tracking (simplified for now)
  const handleScan = async (urlToScan: string) => {
    if (!urlToScan.trim()) return;
    
    if (isScanning) {
      return;
    }
    
    setUserProgress(prev => ({
      ...prev,
      hasScanned: true,
      currentStep: 'scanning',
      lastScannedUrl: urlToScan
    }))
    
    try {
      if (onScanStart) onScanStart();
      
      await append({
        role: 'assistant',
        content: `🔍 **Analyzing ${urlToScan}...**\n\n*Please wait while I check your website's accessibility.*`
      });

      // For now, simplified - you'll need to implement actual scanning
      const mockResults = {
        url: `https://${urlToScan}`,
        score: 75,
        scriptCheckResult: 'Web Ability',
        techStack: {
          accessibilityContext: {
            platform: 'WordPress',
            platform_type: 'CMS'
          }
        },
        ByFunctions: []
      };
      
      if (onScanComplete) {
        onScanComplete(mockResults);
      }
      
      setShowScanInput(false);
      setScanUrl('');
      
    } catch (error: any) {
      await append({
        role: 'assistant',
        content: `❌ **Couldn't scan ${urlToScan}**\n\n**Error:** ${error?.message || 'Unknown error'}`
      });
    }
  };

  // Override handleSubmit to check for scan commands
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is requesting a scan
    const scanPatterns = [
      /scan\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /analyze\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /check\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /test\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /^([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/i
    ];
    
    let scanDetected = false;
    for (const pattern of scanPatterns) {
      const match = input.match(pattern);
      if (match) {
        const url = match[1];
        setInput('');
        
        append({
          role: 'user',
          content: input
        });
        
        handleScan(url);
        scanDetected = true;
        break;
      }
    }
    
    // Only submit to AI if it's not a scan request
    if (!scanDetected) {
      handleSubmit(e, scanResults, userProgress);
    }
  };

  // Get current domain being discussed
  const getCurrentDomain = () => {
    if (scanResults?.url) {
      try {
        return new URL(scanResults.url).hostname.replace('www.', '');
      } catch {
        return scanResults.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      }
    }
    return null;
  };

  // Handle external issue submission
  const submitIssueForAnalysis = useCallback((issueDetails: string) => {
    setIsOpen(true);
    setInput(issueDetails);
    setPendingMessage(issueDetails);
    
    setTimeout(() => {
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.focus();
        submitButton.classList.add('animate-pulse');
        setTimeout(() => {
          submitButton.classList.remove('animate-pulse');
        }, 2000);
      }
    }, 300);
  }, [setInput]);

  // Expose global function
  useEffect(() => {
    (window as any).submitAccessibilityIssue = submitIssueForAnalysis;
    return () => {
      if ((window as any).submitAccessibilityIssue) {
        delete (window as any).submitAccessibilityIssue;
      }
    };
  }, [submitIssueForAnalysis]);

  // Auto-submit pending messages
  useEffect(() => {
    if (pendingMessage && isOpen && input) {
      const timer = setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
        handleChatSubmit(fakeEvent);
        setPendingMessage(null);
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    // Return undefined for all other code paths
    return undefined;
  }, [pendingMessage, isOpen, input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={styles.chatbotContainer}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.chatbotButton}
        aria-label={isOpen ? "Close AI Accessibility Assistant" : "Open AI Accessibility Assistant"}
      >
        {isOpen ? (
          <svg 
            className="w-7 h-7" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <>
            <svg 
              className="w-7 h-7" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
          </>
        )}
      </button>

      {isOpen && (
        <div className={styles.chatbotWindow}>
          <div className={styles.chatHeader}>
            <h3 className={styles.headerTitle}>
              <svg 
                className="w-5 h-5 text-blue-100"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Accessibility Helper
              {getCurrentDomain() && (
                <span className="text-xs bg-blue-500 px-2 py-1 rounded-full ml-2">
                  {getCurrentDomain()}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 mr-3">
              <button 
                onClick={() => setShowScanInput(!showScanInput)}
                className="p-2 hover:bg-blue-850 rounded-full transition-colors cursor-pointer"
                aria-label="Scan website"
                title="Scan a website"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className={styles.headerClose}
                aria-label="Close chat"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Scan Input Removed*/}

          <div className={styles.messagesContainer}>
            {messages.map((message: Message) => (
              <div 
                key={message.id} 
                className={`${styles.message} ${
                  message.role === 'user' ? styles.userMessage : styles.aiMessage
                }`}
              >
                <div className="font-semibold mb-2">
                  {message.role === 'user' ? 'You' : 'Assistant'}:
                </div>
                <div className="markdown-content prose prose-sm max-w-none">
                  <ReactMarkdown 
                    components={{
                      strong: ({ children }: any) => <strong className="font-bold text-gray-900">{children}</strong>,
                      em: ({ children }: any) => <em className="italic text-gray-700">{children}</em>,
                      p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }: any) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                      li: ({ children }: any) => <li className="mb-1">{children}</li>,
                      h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({ children }: any) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                      h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                      code: ({ children }: any) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono overflow-x-auto block">{children}</code>,
                      pre: ({ children }: any) => <pre className="bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto mb-2">{children}</pre>
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.aiMessage}`}>
                <div className="animate-pulse flex items-center space-x-2">
                  <div>Thinking</div>
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleChatSubmit} className={styles.inputForm}>
            <div className={styles.inputContainer}>
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Describe your accessibility issue..."
                className={styles.inputField}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className={styles.sendButton}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              >
                <svg 
                  className={styles.sendIcon}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 12h14m-7-7l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
            
            {pendingMessage && (
              <div className="text-xs text-blue-500 mt-2 text-center">
                Click send to get step-by-step help fixing this issue
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  )
}