export const TASK_TYPE_TARGET = 'TARGET' as const;
export const TASK_TYPE_PREPARE = 'PREPARE' as const;
export const TASK_TYPE_START = 'START' as const;
export const TASK_TYPE_FETCH_STORIES = 'FETCH_STORIES' as const;
export const TASK_TYPE_TESTS = 'TESTS' as const;
export const TASK_TYPE_TEST = 'TEST' as const;
export const TASK_TYPE_STOP = 'STOP' as const;

export type TaskType =
  | typeof TASK_TYPE_TARGET
  | typeof TASK_TYPE_PREPARE
  | typeof TASK_TYPE_START
  | typeof TASK_TYPE_FETCH_STORIES
  | typeof TASK_TYPE_TESTS
  | typeof TASK_TYPE_TEST
  | typeof TASK_TYPE_STOP;
