import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socketInstance = null;

export function useSocket(onEvent) {
  const { token, user } = useAuthStore();
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    if (!token) return;

    socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

    socketInstance.on('connect', () => {
      socketInstance.emit('join', { userId: user?._id || user?.id || null, token });
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connect_error:', err.message || err);
    });

    const events = [
      'new_message', 'message_sent', 'reminder_due',
      'lead_inactive', 'agent_status_changed', 'agent_typing',
    ];

    events.forEach((ev) => {
      socketInstance.on(ev, (data) => cbRef.current?.(ev, data));
    });

    return () => {
      socketInstance?.disconnect();
      socketInstance = null;
    };
  }, [token]);

  return socketInstance;
}

export function getSocket() { return socketInstance; }
