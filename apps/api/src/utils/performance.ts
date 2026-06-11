export const performance = {
  started: Date.now(),
  completed: Date.now(),
  start: (): void => {
    performance.started = Date.now();
  },
  complete: () => {
    performance.completed = Date.now();
    return performance.completed - performance.started;
  },
};
