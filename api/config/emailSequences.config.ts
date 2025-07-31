// Email sequence configuration
export interface EmailSequenceStep {
  day: number
  template: string
  subject: string
  description: string
}

export interface EmailSequence {
  name: string
  description: string
  steps: EmailSequenceStep[]
}

export const EMAIL_SEQUENCES: Record<string, EmailSequence> = {
  ONBOARDING: {
    name: 'User Onboarding',
    description: 'Welcome series for new users to learn about WebAbility features and accessibility',
    steps: [
      {
        day: 0,
        template: 'welcomeQuickStart.mjml',
        subject: "Welcome to WebAbility! Let's make your site accessible",
        description: 'Welcome & Quick Start guide',
      },
      {
        day: 1,
        template: 'day1FollowUp.mjml',
        subject: "{{#if hasActiveDomains}}Your WebAbility widget is live—what's next?{{else}}Finish setting up your WebAbility widget{{/if}}",
        description: 'Widget Live - Customization Guide',
      },
      {
        day: 2,
        template: 'day2AuditReport.mjml',
        subject: 'Your WebAbility compliance audit is ready',
        description: 'Site Audit Report',
      },
      {
        day: 3,
        template: 'day3FAQ.mjml',
        subject: 'Frequently Asked Questions - WebAbility',
        description: 'FAQ & Support',
      },
      {
        day: 7,
        template: 'day7ProductWalkthrough.mjml',
        subject: "Explore WebAbility's key features",
        description: 'Product Walkthrough',
      },
      {
        day: 14,
        template: 'day14AccessibilityFixes.mjml',
        subject: 'Quick wins: fix alt‑text, headings, contrast',
        description: 'Fixing Common Accessibility Issues',
      },
      {
        day: 28,
        template: 'day28Automation.mjml',
        subject: 'Maintain accessibility with regular audits',
        description: 'Automating Accessibility Maintenance',
      },
      {
        day: 42, // 6 weeks
        template: 'week6CustomerSuccess.mjml',
        subject: 'How is WebAbility working for you?',
        description: 'Customer Success Check-In',
      },
      {
        day: 70, // 10 weeks (2.5 months)
        template: 'week10SuccessStory.mjml',
        subject: 'Real stories from WebAbility users',
        description: 'Showcase Success Story',
      },
      {
        day: 90,
        template: 'day90Milestones.mjml',
        subject: 'Your WebAbility 90-day milestones',
        description: '90-Day Wrap-Up',
      },
    ],
  },
}

export default EMAIL_SEQUENCES
