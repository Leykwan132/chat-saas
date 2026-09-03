type TimerHandle = ReturnType<typeof setTimeout>;

export function createAvatarInactivityController(
  onCountdown: (seconds: number) => void,
  onTimeout: () => void,
) {
  let timer: TimerHandle | null = null;
  let seconds = 3;

  const stop = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  const tick = () => {
    timer = null;
    if (seconds === 0) {
      onTimeout();
      return;
    }
    onCountdown(seconds);
    seconds -= 1;
    timer = setTimeout(tick, 1_000);
  };

  return {
    start: () => {
      stop();
      seconds = 3;
      timer = setTimeout(tick, 5_000);
    },
    stop,
  };
}
