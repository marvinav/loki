import { EVENT_CHANGE, STATUS_FAILED, TaskRunner } from '../task-runner.js';
import { TASK_TYPE_TESTS, TASK_TYPE_TARGET } from '../constants.js';
import { renderTask } from './render-task.js';
import type { Task } from './render-task.js';

interface TaskWithInstructions extends Task {
  error?: (Error & { instructions?: string }) | null;
}

const renderSilent = <TContext>(taskRunner: TaskRunner<TContext>): (() => void) => {
  const handleChange = (task: TaskWithInstructions): void => {
    if (
      task.status === STATUS_FAILED &&
      task.meta.type !== TASK_TYPE_TESTS &&
      task.meta.type !== TASK_TYPE_TARGET
    ) {
      console.error(renderTask(task));
      if (task.error?.instructions) {
        console.info(task.error.instructions);
      }
    }
  };

  taskRunner.on(EVENT_CHANGE, handleChange);

  const stopRendering = (): void => {
    taskRunner.removeListener(EVENT_CHANGE, handleChange);
  };

  return stopRendering;
};

export { renderSilent };
