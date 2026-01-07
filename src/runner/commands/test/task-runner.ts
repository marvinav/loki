import { EventEmitter } from 'node:events';
import { eachOfLimit } from '../../../core/index.js';

const STATUS_NOT_STARTED = 'NOT_STARTED' as const;
const STATUS_RUNNING = 'RUNNING' as const;
const STATUS_SUCCEEDED = 'SUCCEEDED' as const;
const STATUS_FAILED = 'FAILED' as const;
const EVENT_CHANGE = 'change';
const EVENT_END = 'end';

type TaskStatus =
  | typeof STATUS_NOT_STARTED
  | typeof STATUS_RUNNING
  | typeof STATUS_SUCCEEDED
  | typeof STATUS_FAILED;

interface TaskMeta {
  type: string;
  target?: string;
  configuration?: string;
  id?: string;
  url?: string;
  kind?: string;
  story?: string;
}

interface TaskDefinition<TContext, TTaskData = unknown> {
  id?: string | number;
  meta: TaskMeta;
  task: TTaskData | ((context: TContext) => Promise<unknown> | TaskRunner<TContext>);
  enabled?: boolean;
}

interface InternalTask<TContext> {
  id: string | number;
  meta: TaskMeta;
  task: unknown;
  status: TaskStatus;
  error: Error | null;
  startedAt: number | null;
  completedAt: number | null;
  subTaskRunner?: TaskRunner<TContext> | null;
}

interface TaskState {
  id: string | number;
  meta: TaskMeta;
  status: TaskStatus;
  error: Error | null;
  startedAt: number | null;
  completedAt: number | null;
  tasks: TaskState[] | null;
}

interface TaskRunnerOptions<TContext> {
  concurrency?: number;
  batchSize?: number;
  batchExector?: (
    batch: InternalTask<TContext>[],
    context: TContext
  ) => (Promise<unknown> | TaskRunner<TContext>)[];
  batchBuilder?: <T>(array: T[], chunkSize: number) => T[][];
  exitOnError?: boolean;
}

class TaskRunnerError extends Error {
  errors: Error[];

  constructor(message: string, errors: Error[]) {
    super(message);
    this.name = 'TaskRunnerError';
    this.errors = errors;
  }
}

function getArrayChunks<T>(array: T[], chunkSize: number): T[][] {
  const numChunks = Math.ceil(array.length / chunkSize);
  return Array.from({ length: numChunks }, (_, index) => {
    const begin = index * chunkSize;
    return array.slice(begin, begin + chunkSize);
  });
}

class TaskRunner<TContext = Record<string, unknown>> extends EventEmitter {
  private batchExector: (
    batch: InternalTask<TContext>[],
    context: TContext
  ) => (Promise<unknown> | TaskRunner<TContext>)[];
  private batchSize: number;
  private batchBuilder: <T>(array: T[], chunkSize: number) => T[][];
  private concurrency: number;
  private exitOnError: boolean;
  tasks: InternalTask<TContext>[];

  constructor(
    tasks: TaskDefinition<TContext>[],
    options: TaskRunnerOptions<TContext> = {}
  ) {
    super();

    const defaultOptions = {
      concurrency: 1,
      batchSize: 1,
      batchExector: (
        batch: InternalTask<TContext>[],
        context: TContext
      ): (Promise<unknown> | TaskRunner<TContext>)[] =>
        batch.map((task) => {
          if (typeof task.task === 'function') {
            return (task.task as (context: TContext) => Promise<unknown> | TaskRunner<TContext>)(context);
          }
          return Promise.resolve(task.task);
        }),
      exitOnError: true,
    };

    const { batchExector, batchSize, batchBuilder, concurrency, exitOnError } = {
      ...defaultOptions,
      ...options,
    };

    this.batchExector = batchExector;
    this.batchSize = batchSize;
    this.batchBuilder = batchBuilder ?? getArrayChunks;
    this.concurrency = concurrency;
    this.exitOnError = exitOnError;

    if (!Array.isArray(tasks)) {
      throw new Error(
        `tasks argument must be an array, received ${typeof tasks}`
      );
    }

    this.tasks = tasks
      .filter(
        (task): task is TaskDefinition<TContext> =>
          task != null && task.enabled !== false && task.meta != null && task.task != null
      )
      .map(({ id, meta, task }, index) => ({
        id: id ?? index,
        meta,
        task,
        status: STATUS_NOT_STARTED as TaskStatus,
        error: null,
        startedAt: null,
        completedAt: null,
      }));
  }

  private mergeTaskState(
    index: number,
    state: Partial<InternalTask<TContext>>
  ): void {
    const task = this.tasks[index];
    if (!task) {
      throw new Error(`No task for index ${index}`);
    }
    const mergedTask = { ...task, ...state };
    this.tasks.splice(index, 1, mergedTask);
    this.emitChange(mergedTask);
  }

  getState(): TaskState[] {
    return this.tasks.map(
      ({ id, meta, status, startedAt, completedAt, error, subTaskRunner }) => ({
        id,
        meta,
        status,
        error,
        startedAt,
        completedAt,
        tasks: subTaskRunner ? subTaskRunner.getState() : null,
      })
    );
  }

  private emitChange(changedTask: InternalTask<TContext>): void {
    this.emit(EVENT_CHANGE, changedTask);
  }

  private createTaskIterator(
    context: TContext
  ): (batch: InternalTask<TContext>[]) => Promise<void> {
    return async (batch: InternalTask<TContext>[]): Promise<void> => {
      await Promise.all(
        this.batchExector(batch, context).map(async (work, i) => {
          const index = this.tasks.indexOf(batch[i]);
          try {
            const hasSubTasks = work instanceof TaskRunner;
            this.mergeTaskState(index, {
              status: STATUS_RUNNING,
              startedAt: Date.now(),
              subTaskRunner: hasSubTasks ? work : null,
            });

            if (hasSubTasks) {
              work.on(EVENT_CHANGE, (changedTask: InternalTask<TContext>) =>
                this.emitChange(changedTask)
              );
              await Promise.resolve(work.run(context));
            } else {
              await work;
            }

            this.mergeTaskState(index, {
              status: STATUS_SUCCEEDED,
              completedAt: Date.now(),
            });
          } catch (error) {
            this.mergeTaskState(index, {
              status: STATUS_FAILED,
              completedAt: Date.now(),
              error: error as Error,
            });
            if (this.exitOnError) {
              throw error;
            }
          }
        })
      );
    };
  }

  async run(context: TContext): Promise<void> {
    let caughtError: Error | undefined;

    try {
      const batches = this.batchBuilder(this.tasks, this.batchSize);
      await eachOfLimit(batches, this.concurrency, this.createTaskIterator(context));
    } catch (error) {
      // Errors might not be thrown due to exitOnError option,
      // so collect all errors by status instead, but keep reference
      // in case error is thrown by the task runner itself
      caughtError = error as Error;
    }

    this.emit(EVENT_END);

    const errors = this.tasks
      .filter((task) => task.status === STATUS_FAILED)
      .map((task) => task.error!)
      .reduce<Error[]>((acc, error) => {
        if (error instanceof TaskRunnerError) {
          return acc.concat(error.errors);
        }
        return acc.concat(error);
      }, []);

    if (errors.length !== 0) {
      throw new TaskRunnerError('Some tasks failed to run', errors);
    } else if (caughtError) {
      throw caughtError;
    }
  }
}

export {
  STATUS_NOT_STARTED,
  STATUS_RUNNING,
  STATUS_SUCCEEDED,
  STATUS_FAILED,
  EVENT_CHANGE,
  EVENT_END,
  TaskRunner,
  TaskRunnerError,
};

export type {
  TaskStatus,
  TaskMeta,
  TaskDefinition,
  InternalTask,
  TaskState,
  TaskRunnerOptions,
};
