/**
 * Priority constants for accessibility report queue
 * Higher values = higher priority (processed first)
 */
export const QUEUE_PRIORITY = {
  // High priority: User-initiated scans from frontend scanner page
  HIGH: 10,

  // Normal priority: Default for other operations
  NORMAL: 0,

  // Low priority: Automated background tasks (monthly reports, new domain reports)
  LOW: -10,
} as const

export type QueuePriority = (typeof QUEUE_PRIORITY)[keyof typeof QUEUE_PRIORITY]
