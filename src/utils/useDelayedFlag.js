import { useEffect, useState } from 'react';

// Returns true only after `flag` has stayed true for `delay` ms, so quick loads don't flash a loader.
export default function useDelayedFlag(flag, delay = 200) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!flag) {
      return undefined;
    }

    const timer = setTimeout(() => setVisible(true), delay);
    return () => {
      clearTimeout(timer);
      setVisible(false);
    };
  }, [flag, delay]);

  return flag && visible;
}
