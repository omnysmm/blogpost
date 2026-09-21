import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes

export default function useInactivityLogout() {
  const { currentUser, logout } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Don't set timer for admin or when not logged in
    if (!currentUser || currentUser.role === 'admin') {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    };

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer(); // Start the timer

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [currentUser, logout]);
}