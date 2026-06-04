'use client';

import { useState, useCallback, useRef } from 'react';
import type { ToastType, ToastState } from '@/types';

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: '',
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = '') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  }, []);

  return { toast, showToast };
}
