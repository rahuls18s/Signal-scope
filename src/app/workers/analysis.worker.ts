/// <reference lib="webworker" />
addEventListener('message', ({ data }: MessageEvent<{ values: number[]; threshold: number }>) => {
  const started = performance.now();
  const count = data.values.reduce((total, value) => total + Number(value >= data.threshold), 0);
  postMessage({ count, duration: performance.now() - started });
});
