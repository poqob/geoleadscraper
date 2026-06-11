export const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const setRandomInterval = (callback: () => void, ms: number) => {
  const minDelay = ms / 2.5;
  const maxDelay = ms * 1.5;
  const delay = Math.round(Math.random() * (maxDelay - minDelay)) + minDelay;

  setTimeout(() => {
    callback();
    setRandomInterval(callback, ms);
  }, delay);
};

export const randomize = (number: number) => {
  const range = {
    min: number / 2.5,
    max: number * 1.5,
  };

  const output = Math.round(Math.round(Math.random() * (range.max - range.min)) + range.min);

  return output;
};

export const clearRandomInterval = (interval: ReturnType<typeof setTimeout>) => {
  clearTimeout(interval);
};

export const randomInterval = (callback: () => void, delay: [number, number]) => {
  let timer: ReturnType<typeof setTimeout>;

  console.log('interval:start');

  const [minDelay = 500, maxDelay = 1000] = delay;

  const set = () => {
    const delay = Math.round(Math.random() * (maxDelay - minDelay) + minDelay);

    console.log(`interval:tick (${delay} ms)`);

    timer = setTimeout(() => {
      callback();
      set();
    }, delay);
  };

  set();

  // return a function to clear the interval
  const clear = () => {
    console.log('interval:clear');
    clearTimeout(timer);
  };

  return { clear };
};
