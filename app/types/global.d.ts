// Global type declarations for the dashboard application

declare global {
  interface Window {
    submitAccessibilityIssue?: (issueDetails: string) => void;
  }
}

// This export statement is required to make this file a module
export {};