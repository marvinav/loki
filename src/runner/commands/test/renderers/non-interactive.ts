import {
  EVENT_CHANGE,
  STATUS_FAILED,
  STATUS_SUCCEEDED,
  TaskRunner,
} from '../task-runner.js';
import { TASK_TYPE_TESTS, TASK_TYPE_TARGET } from '../constants.js';
import { renderTask } from './render-task.js';
import type { Task } from './render-task.js';

interface TaskWithInstructions extends Task {
  error?: (Error & { instructions?: string }) | null;
}

const renderNonInteractive = <TContext>(taskRunner: TaskRunner<TContext>): (() => void) => {
  const handleChange = (task: TaskWithInstructions): void => {
    const message = renderTask(task);

    switch (task.status) {
      case STATUS_FAILED:
        console.error(message);
        if (task.error?.instructions) {
          console.info(task.error.instructions);
        }
        break;

      case STATUS_SUCCEEDED:
        if (
          task.meta.type !== TASK_TYPE_TESTS &&
          task.meta.type !== TASK_TYPE_TARGET
        ) {
          console.log(message);
        }
        break;
    }
  };

  taskRunner.on(EVENT_CHANGE, handleChange);

  const stopRendering = (): void => {
    taskRunner.removeListener(EVENT_CHANGE, handleChange);
  };

  return stopRendering;
};

export { renderNonInteractive };
