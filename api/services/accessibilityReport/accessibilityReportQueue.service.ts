import { _fetchAccessibilityReportInternal } from './accessibilityReport.service'

// Configuration for queue concurrency
const QUEUE_CONFIG = {
  concurrencyLimit: 6,
  maxQueueSize: 100,
  taskTimeout: 30 * 60 * 1000, // 10 minutes in ms
}

interface QueueTask {
  id: string
  url: string
  useCache?: boolean
  fullSiteScan?: boolean
  resolve: (value: any) => void
  reject: (error: Error) => void
  createdAt: number
  priority: number
}

interface QueueStats {
  totalProcessed: number
  totalFailed: number
  averageProcessingTime: number
  currentQueueLength: number
  activeTasks: number
  uptime: number
}

class AccessibilityReportQueue {
  private readonly concurrencyLimit: number
  private readonly maxQueueSize: number
  private readonly taskTimeout: number

  private queue: QueueTask[] = []
  private activeTasks: Map<string, QueueTask> = new Map()
  private stats: QueueStats = {
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    currentQueueLength: 0,
    activeTasks: 0,
    uptime: Date.now(),
  }

  private processingTimes: number[] = []
  private isShuttingDown: boolean = false

  constructor(concurrencyLimit?: number) {
    this.concurrencyLimit = concurrencyLimit || QUEUE_CONFIG.concurrencyLimit
    this.maxQueueSize = QUEUE_CONFIG.maxQueueSize
    this.taskTimeout = QUEUE_CONFIG.taskTimeout
    console.log(`🚀 Accessibility Report Queue initialized with concurrency limit: ${this.concurrencyLimit}`)
  }

  async addTask(url: string, useCache?: boolean, fullSiteScan?: boolean, priority: number = 0): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        const error = new Error(`Queue is at maximum capacity (${this.maxQueueSize}). Please try again later.`)
        reject(error)
        return
      }

      if (this.isShuttingDown) {
        const error = new Error('Queue is shutting down. New tasks cannot be added.')
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

      console.log(`📊 Queue Status: ${this.activeTasks.size} reports processing, ${this.queue.length} reports pending`)

      this.processNext()
    })
  }

  private async processNext(): Promise<void> {
    if (this.activeTasks.size >= this.concurrencyLimit || this.queue.length === 0) {
      return
    }

    const task = this.queue.shift()
    if (!task) return

    if (Date.now() - task.createdAt > this.taskTimeout) {
      task.reject(new Error('Task timed out'))
      this.stats.totalFailed++
      this.updateStats()
      this.processNext()
      return
    }

    this.activeTasks.set(task.id, task)
    this.updateStats()

    const startTime = Date.now()

    try {
      const result = await _fetchAccessibilityReportInternal(task.url, task.useCache, task.fullSiteScan)
      const processingTime = Date.now() - startTime
      this.recordProcessingTime(processingTime)
      task.resolve(result)
      this.stats.totalProcessed++
    } catch (error) {
      task.reject(error as Error)
      this.stats.totalFailed++
    } finally {
      this.activeTasks.delete(task.id)
      this.updateStats()
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
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift()
    }
    this.stats.averageProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
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
    activeTasks: Array<{ id: string; url: string; priority: number; runningTime: number }>
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
        runningTime: now - task.createdAt,
      })),
    }
  }

  async shutdown(timeoutMs: number = 30000): Promise<void> {
    this.isShuttingDown = true
    const startTime = Date.now()
    while (this.activeTasks.size > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    const remainingTasks = this.queue.length
    if (remainingTasks > 0) {
      this.queue.forEach((task) => {
        task.reject(new Error('Queue is shutting down'))
      })
      this.queue = []
    }
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
    return !this.isShuttingDown && stats.activeTasks < this.concurrencyLimit * 2 && stats.currentQueueLength < this.maxQueueSize * 0.9
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

export { AccessibilityReportQueue, accessibilityReportQueue }
export type { QueueStats, QueueTask }
