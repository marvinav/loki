import { TASK_TYPE_TEST } from '../constants.js';
import {
  STATUS_NOT_STARTED,
  STATUS_RUNNING,
  STATUS_SUCCEEDED,
  STATUS_FAILED,
} from '../task-runner.js';

const STATUS_NAMES = {
  [STATUS_NOT_STARTED]: 'WAIT',
  [STATUS_RUNNING]: 'RUNS',
  [STATUS_SUCCEEDED]: 'PASS',
  [STATUS_FAILED]: 'FAIL',
};

const getDescription = (task) => {
  switch (task.meta.type) {
    case TASK_TYPE_TEST:
      return `${task.meta.target}/${task.meta.configuration}/${task.meta.kind}/${task.meta.story}`;
    default:
      return task.id;
  }
};

const renderTask = (task) => {
  const status = STATUS_NAMES[task.status];
  const description = getDescription(task);
  const error = task.error ? `: ${task.error.message}` : '';
  return `${status} ${description}${error}`;
};

export { renderTask };
