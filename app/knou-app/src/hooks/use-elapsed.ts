import { useEffect, useState } from 'react';

/** 경과시간 포맷팅 (M:SS 또는 H:MM:SS) */
export function useElapsed(startedAtMs: number | null): string {
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    if (startedAtMs === null) {
      setElapsed('0:00');
      return;
    }

    const update = () => {
      const now = Date.now();
      const diffMs = Math.max(0, now - startedAtMs);
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setElapsed(`${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      } else {
        setElapsed(`${minutes}:${String(seconds).padStart(2, '0')}`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAtMs]);

  return elapsed;
}
