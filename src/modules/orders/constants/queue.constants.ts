// Queue name shared by BullModule.registerQueue(), @InjectQueue(), and @Processor().
// All three must reference the same string — a single source of truth prevents
// silent mismatches where jobs are enqueued to one queue but consumed from another.
export const STOCK_NOTIFICATION_QUEUE = 'low-stock-notifications';

// Job name used by StockNotificationService.queue.add() and matched inside
// the @OnWorkerEvent / @Process handlers in StockNotificationProcessor.
export const NOTIFY_LOW_STOCK_JOB = 'notify-low-stock';
