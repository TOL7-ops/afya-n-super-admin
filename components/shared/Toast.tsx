'use client';

import type { ToastState } from '@/types';

interface ToastProps {
  toast: ToastState;
}

export default function Toast({ toast }: ToastProps) {
  return (
    <div
      className={[
        'toast',
        toast.visible ? 'show' : '',
        toast.type ? toast.type : '',
      ]
        .filter(Boolean)
        .join(' ')}
      id="toast"
    >
      {toast.message}
    </div>
  );
}
