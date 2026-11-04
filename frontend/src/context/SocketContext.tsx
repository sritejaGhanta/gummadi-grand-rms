import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  lastEvent: { type: string; data: any } | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  lastEvent: null,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshProfile } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any } | null>(null);

  useEffect(() => {
    const s = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setConnected(true);
      if (user?.role?.name) {
        s.emit('joinRoleRoom', user.role.name);
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    // Global listeners
    const events = [
      'order:created',
      'kitchen:new_order',
      'order:item_status_changed',
      'order:item_ready',
      'menu:availability_updated',
      'table:status_updated',
      'billing:requested',
      'billing:paid',
      'settings:updated',
    ];

    events.forEach((evt) => {
      s.on(evt, (data) => {
        setLastEvent({ type: evt, data });
      });
    });

    s.on('auth:permissions_updated', () => {
      refreshProfile();
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.role?.name]);

  return (
    <SocketContext.Provider value={{ socket, connected, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
