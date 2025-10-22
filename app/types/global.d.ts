// Global type declarations for the dashboard application

declare global {
  interface Window {
    submitAccessibilityIssue?: (issueDetails: string) => void;
    rewardful?: (
      command: string,
      callback?: (referral: string) => void,
    ) => void;
    Rewardful?: {
      referral?: string;
    };
  }
}

// This export statement is required to make this file a module
export {};
