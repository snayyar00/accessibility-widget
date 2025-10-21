import { _fetchAccessibilityReportInternal } from './accessibilityReport.service'

// Configuration for queue concurrency and scalability
const QUEUE_CONFIG = {
  // Concurrency: How many reports can process simultaneously
  concurrencyLimit: parseInt('6'),
  // Max queue size: Prevent memory issues from unbounded growth
  maxQueueSize: parseInt('1000'),
  // Warning threshold: Log warning when queue gets too long
  queueWarningThreshold: parseInt('50'),
  // Health check interval: How often to log queue health (ms)
  healthCheckInterval: parseInt('60000'), // 1 minute
  // Stale task detection: Warn if a task is processing for too long (for monitoring only, won't kill task)
  staleTaskWarningThreshold: parseInt('600000'), // 10 minutes
}

/**
 * Priority System:
 * - HIGH (10): User-initiated scans from frontend scanner page (processed first)
 * - NORMAL (0): Default priority for general operations
 * - LOW (-10): Automated background tasks (monthly reports, new domain reports)
 *
 * Tasks are processed in descending priority order (higher values first).
 * See: api/constants/queue-priority.constant.ts for priority constants.
 */

interface QueueTask {
  id: string
  url: string
  useCache?: boolean
  fullSiteScan?: boolean
  resolve: (value: any) => void
  reject: (error: Error) => void
  createdAt: number // When task was added to queue
  processingStartedAt?: number // When task started processing (for metrics)
  priority: number
}

interface QueueStats {
  totalProcessed: number
  totalFailed: number
  averageProcessingTime: number
  averageWaitTime: number
  currentQueueLength: number
  activeTasks: number
  uptime: number
  longestWaitTime: number
  longestProcessingTime: number
}

class AccessibilityReportQueue {
  private readonly concurrencyLimit: number
  private readonly maxQueueSize: number
  private readonly queueWarningThreshold: number
  private readonly healthCheckInterval: number
  private readonly staleTaskWarningThreshold: number

  private queue: QueueTask[] = []
  private activeTasks: Map<string, QueueTask> = new Map()
  private stats: QueueStats = {
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    averageWaitTime: 0,
    currentQueueLength: 0,
    activeTasks: 0,
    uptime: Date.now(),
    longestWaitTime: 0,
    longestProcessingTime: 0,
  }

  private processingTimes: number[] = []
  private waitTimes: number[] = []
  private isShuttingDown: boolean = false
  private healthCheckTimer: NodeJS.Timeout | null = null
  private lastWarningTime: number = 0

  constructor(concurrencyLimit?: number) {
    this.concurrencyLimit = concurrencyLimit || QUEUE_CONFIG.concurrencyLimit
    this.maxQueueSize = QUEUE_CONFIG.maxQueueSize
    this.queueWarningThreshold = QUEUE_CONFIG.queueWarningThreshold
    this.healthCheckInterval = QUEUE_CONFIG.healthCheckInterval
    this.staleTaskWarningThreshold = QUEUE_CONFIG.staleTaskWarningThreshold

    // Start health check monitoring
    this.startHealthCheck()
  }

  async addTask(options: { url: string; useCache?: boolean; fullSiteScan?: boolean; priority?: number }): Promise<any> {
    const { url, useCache, fullSiteScan, priority = 0 } = options

    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        const error = new Error(`Queue is at maximum capacity (${this.maxQueueSize}). Please try again later.`)
        console.error(`❌ Queue full: Rejected task for ${url}`)
        reject(error)
        return
      }

      if (this.isShuttingDown) {
        const error = new Error('Queue is shutting down. New tasks cannot be added.')
        console.warn(`⚠️ Shutdown in progress: Rejected task for ${url}`)
        reject(error)
        return
      }

      const task: QueueTask = {
        id: this.generateTaskId(),
        url,
        useCache,
        fullSiteScan,
        resolve,
        reject,
        createdAt: Date.now(),
        priority,
      }

      this.insertTaskByPriority(task)
      this.updateStats()

      const priorityLabel = priority > 0 ? 'HIGH' : priority < 0 ? 'LOW' : 'NORMAL'
      console.log(`📊 Queue Status: ${this.activeTasks.size}/${this.concurrencyLimit} processing, ${this.queue.length} pending [Priority: ${priorityLabel}] (${url})`)

      // Warn if queue is getting too long (throttle warnings to every 30 seconds)
      if (this.queue.length >= this.queueWarningThreshold) {
        const now = Date.now()
        if (now - this.lastWarningTime > 30000) {
          console.warn(`⚠️ Queue length (${this.queue.length}) exceeded warning threshold (${this.queueWarningThreshold})`)
          this.lastWarningTime = now
        }
      }

      this.processNext()
    })
  }

  private async processNext(): Promise<void> {
    // Check if we can process more tasks
    if (this.activeTasks.size >= this.concurrencyLimit || this.queue.length === 0) {
      return
    }

    const task = this.queue.shift()
    if (!task) return

    // Record when processing actually started
    task.processingStartedAt = Date.now()
    const waitTime = task.processingStartedAt - task.createdAt

    // Record wait time for metrics
    this.recordWaitTime(waitTime)

    // Log if task waited unusually long (for monitoring)
    const priorityLabel = task.priority > 0 ? 'HIGH' : task.priority < 0 ? 'LOW' : 'NORMAL'
    if (waitTime > 300000) {
      // 5 minutes
      console.warn(`⏱️ Task ${task.id} [Priority: ${priorityLabel}] waited ${Math.round(waitTime / 1000)}s in queue before processing (${task.url})`)
    }

    this.activeTasks.set(task.id, task)
    this.updateStats()

    const processingStartTime = Date.now()

    try {
      // No timeout here - _fetchAccessibilityReportInternal has comprehensive internal timeouts:
      // - Scanner polling: 5-10 minutes (maxPollingAttempts × pollingInterval)
      // - Screenshot capture: 30s × 3 retries = 90s max
      // - Widget detection: 30s × 3 retries = 90s max
      // - GraphQL layer: 180s timeout as final safeguard
      const result = await _fetchAccessibilityReportInternal(task.url, task.useCache, task.fullSiteScan)

      const processingTime = Date.now() - processingStartTime
      const totalTime = Date.now() - task.createdAt

      this.recordProcessingTime(processingTime)

      const priorityLabel = task.priority > 0 ? 'HIGH' : task.priority < 0 ? 'LOW' : 'NORMAL'
      console.log(`✅ Report completed [Priority: ${priorityLabel}] for ${task.url} - Wait: ${Math.round(waitTime / 1000)}s, Processing: ${Math.round(processingTime / 1000)}s, Total: ${Math.round(totalTime / 1000)}s`)

      task.resolve(result)
      this.stats.totalProcessed++
    } catch (error) {
      const processingTime = Date.now() - processingStartTime
      const totalTime = Date.now() - task.createdAt

      const priorityLabel = task.priority > 0 ? 'HIGH' : task.priority < 0 ? 'LOW' : 'NORMAL'
      console.error(`❌ Report failed [Priority: ${priorityLabel}] for ${task.url} after ${Math.round(processingTime / 1000)}s processing (${Math.round(totalTime / 1000)}s total):`, (error as Error).message)

      task.reject(error as Error)
      this.stats.totalFailed++
    } finally {
      this.activeTasks.delete(task.id)
      this.updateStats()

      // Process next task in queue
      this.processNext()
    }
  }

  private insertTaskByPriority(task: QueueTask): void {
    let insertIndex = this.queue.length
    for (let i = 0; i < this.queue.length; i++) {
      if (task.priority > this.queue[i].priority) {
        insertIndex = i
        break
      }
    }
    this.queue.splice(insertIndex, 0, task)
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private recordProcessingTime(time: number): void {
    this.processingTimes.push(time)
    // Keep last 100 samples for rolling average
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift()
    }
    this.stats.averageProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length

    // Track longest processing time
    if (time > this.stats.longestProcessingTime) {
      this.stats.longestProcessingTime = time
    }
  }

  private recordWaitTime(time: number): void {
    this.waitTimes.push(time)
    // Keep last 100 samples for rolling average
    if (this.waitTimes.length > 100) {
      this.waitTimes.shift()
    }
    this.stats.averageWaitTime = this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length

    // Track longest wait time
    if (time > this.stats.longestWaitTime) {
      this.stats.longestWaitTime = time
    }
  }

  private updateStats(): void {
    this.stats.currentQueueLength = this.queue.length
    this.stats.activeTasks = this.activeTasks.size
  }

  getStats(): QueueStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.uptime,
    }
  }

  getQueueInfo(): {
    stats: QueueStats
    queueTasks: Array<{ id: string; url: string; priority: number; waitTime: number }>
    activeTasks: Array<{ id: string; url: string; priority: number; processingTime: number; totalTime: number }>
  } {
    const now = Date.now()
    return {
      stats: this.getStats(),
      queueTasks: this.queue.map((task) => ({
        id: task.id,
        url: task.url,
        priority: task.priority,
        waitTime: now - task.createdAt,
      })),
      activeTasks: Array.from(this.activeTasks.values()).map((task) => ({
        id: task.id,
        url: task.url,
        priority: task.priority,
        processingTime: task.processingStartedAt ? now - task.processingStartedAt : 0,
        totalTime: now - task.createdAt,
      })),
    }
  }

  /**
   * Health check: Monitor for stale tasks and queue health
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.healthCheckInterval)
  }

  private performHealthCheck(): void {
    const now = Date.now()

    // Check for stale active tasks (processing for too long)
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.processingStartedAt) {
        const processingTime = now - task.processingStartedAt
        if (processingTime > this.staleTaskWarningThreshold) {
          console.warn(`⚠️ Stale task detected: ${taskId} has been processing for ${Math.round(processingTime / 1000)}s (${task.url})`)
          console.warn(`   This is monitoring only - task will complete or timeout via internal mechanisms`)
        }
      }
    }

    // Log queue health if there's activity
    if (this.queue.length > 0 || this.activeTasks.size > 0) {
      const stats = this.getStats()
      console.log(`📈 Queue Health Check:`)
      console.log(`   Active: ${stats.activeTasks}/${this.concurrencyLimit}`)
      console.log(`   Pending: ${stats.currentQueueLength}`)
      console.log(`   Avg Wait: ${Math.round(stats.averageWaitTime / 1000)}s`)
      console.log(`   Avg Processing: ${Math.round(stats.averageProcessingTime / 1000)}s`)
      console.log(`   Total Processed: ${stats.totalProcessed}, Failed: ${stats.totalFailed}`)
    }
  }

  async shutdown(timeoutMs: number = 30000): Promise<void> {
    console.log(`🛑 Shutting down queue... Waiting for ${this.activeTasks.size} active tasks to complete`)
    this.isShuttingDown = true

    // Stop health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }

    const startTime = Date.now()
    let lastLogTime = startTime

    while (this.activeTasks.size > 0 && Date.now() - startTime < timeoutMs) {
      // Log progress every 5 seconds
      const now = Date.now()
      if (now - lastLogTime > 5000) {
        console.log(`   Still waiting for ${this.activeTasks.size} tasks... (${Math.round((now - startTime) / 1000)}s elapsed)`)
        lastLogTime = now
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Report on remaining tasks
    if (this.activeTasks.size > 0) {
      console.warn(`⚠️ Shutdown timeout: ${this.activeTasks.size} tasks still processing after ${timeoutMs}ms`)
    } else {
      console.log(`✅ All active tasks completed`)
    }

    // Reject any pending tasks in queue
    const remainingTasks = this.queue.length
    if (remainingTasks > 0) {
      console.log(`   Rejecting ${remainingTasks} pending tasks in queue`)
      this.queue.forEach((task) => {
        task.reject(new Error('Queue is shutting down'))
      })
      this.queue = []
    }

    console.log(`🛑 Queue shutdown complete. Final stats:`)
    console.log(`   Total Processed: ${this.stats.totalProcessed}`)
    console.log(`   Total Failed: ${this.stats.totalFailed}`)
    console.log(`   Avg Processing Time: ${Math.round(this.stats.averageProcessingTime / 1000)}s`)
    console.log(`   Avg Wait Time: ${Math.round(this.stats.averageWaitTime / 1000)}s`)
  }

  clearQueue(): void {
    this.queue.forEach((task) => {
      task.reject(new Error('Queue cleared'))
    })
    this.queue = []
    this.updateStats()
  }

  isHealthy(): boolean {
    const stats = this.getStats()
    return (
      !this.isShuttingDown &&
      stats.currentQueueLength < this.maxQueueSize * 0.9 && // Queue not near capacity
      stats.activeTasks <= this.concurrencyLimit // Not over concurrent limit
    )
  }

  /**
   * Get detailed metrics for monitoring and debugging
   */
  getDetailedMetrics(): {
    health: 'healthy' | 'warning' | 'critical'
    stats: QueueStats
    capacity: {
      queueUsagePercent: number
      concurrencyUsagePercent: number
    }
    performance: {
      avgWaitSeconds: number
      avgProcessingSeconds: number
      longestWaitSeconds: number
      longestProcessingSeconds: number
      successRate: number
    }
  } {
    const stats = this.getStats()
    const queueUsagePercent = (stats.currentQueueLength / this.maxQueueSize) * 100
    const concurrencyUsagePercent = (stats.activeTasks / this.concurrencyLimit) * 100
    const totalAttempts = stats.totalProcessed + stats.totalFailed
    const successRate = totalAttempts > 0 ? (stats.totalProcessed / totalAttempts) * 100 : 100

    let health: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (queueUsagePercent > 90 || !this.isHealthy()) {
      health = 'critical'
    } else if (queueUsagePercent > 70 || concurrencyUsagePercent > 90) {
      health = 'warning'
    }

    return {
      health,
      stats,
      capacity: {
        queueUsagePercent: Math.round(queueUsagePercent * 10) / 10,
        concurrencyUsagePercent: Math.round(concurrencyUsagePercent * 10) / 10,
      },
      performance: {
        avgWaitSeconds: Math.round(stats.averageWaitTime / 100) / 10,
        avgProcessingSeconds: Math.round(stats.averageProcessingTime / 100) / 10,
        longestWaitSeconds: Math.round(stats.longestWaitTime / 100) / 10,
        longestProcessingSeconds: Math.round(stats.longestProcessingTime / 100) / 10,
        successRate: Math.round(successRate * 10) / 10,
      },
    }
  }
}

const accessibilityReportQueue = new AccessibilityReportQueue()

process.on('SIGINT', async () => {
  await accessibilityReportQueue.shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await accessibilityReportQueue.shutdown()
  process.exit(0)
})

export { accessibilityReportQueue, AccessibilityReportQueue }
export type { QueueStats, QueueTask }
