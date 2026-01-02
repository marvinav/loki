/* eslint-disable no-console */
import {
  EVENT_CHANGE,
  STATUS_FAILED,
  STATUS_SUCCEEDED,
} from '../task-runner.js';
import { renderTask } from './render-task.js';

const renderVerbose = (taskRunner) => {
  const handleChange = (task) => {
    const message = renderTask(task);
    switch (task.status) {
      case STATUS_FAILED:
        console.error(message);
        if (task.error && task.error.instructions) {
          console.info(task.error.instructions);
        }
        break;

      case STATUS_SUCCEEDED:
        console.log(message);
        break;

      default:
        console.info(message);
        break;
    }
  };
  taskRunner.on(EVENT_CHANGE, handleChange);
  const stopRendering = () =>
    taskRunner.removeListener(EVENT_CHANGE, handleChange);
  return stopRendering;
};

export { renderVerbose };
