import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { Bell, CheckCircle2, Award, Calendar, AlertTriangle, Sparkles, Info } from 'lucide-react';

const NotificationContext = createContext();

// Subtle Web Audio synthesizer for sleek chime
const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (e) {
    // Audio context may be restricted by browser policy before first interaction
  }
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Fetch notifications from backend API
  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get('/notifications');
      if (res.data?.notifications) {
        setNotifications(res.data.notifications);
        setUnseenCount(res.data.unread_count || 0);
      }
    } catch (err) {
      // Ignore if unauthenticated or endpoint silent
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // WebSocket Connection Management
  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = () => {
      // Determine WebSocket URL
      const host = window.location.hostname || 'localhost';
      const wsUrl = import.meta.env.VITE_WS_URL || `ws://${host}:8085`;

      try {
        if (socketRef.current) {
          socketRef.current.close();
        }

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setSocketConnected(true);

          // Authenticate / identify client on socket
          if (user?.id) {
            ws.send(JSON.stringify({
              type: 'identify',
              userId: user.id,
              role: user.role || 'participant'
            }));
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'notification' && message.data) {
              const newNotif = message.data;

              // Append notification to state without page refresh
              setNotifications((prev) => {
                // Prevent duplicate IDs
                if (prev.some((n) => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev];
              });

              // Increment unseen count
              setUnseenCount((prev) => prev + 1);

              // Play chime
              playNotificationSound();

              // Show dynamic instant toast banner
              toast.custom(
                (t) => (
                  <div
                    onClick={() => {
                      toast.dismiss(t.id);
                      setIsDrawerOpen(true);
                    }}
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'
                      } max-w-md w-full bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 dark:ring-white/10 border border-blue-500/30 p-4 cursor-pointer hover:border-blue-500 transition`}
                  >
                    <div className="flex-1 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-primary-blue flex items-center justify-center shrink-0 mt-0.5">
                        <Bell size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                            Notification
                          </p>
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">Just now</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
                          {newNotif.title}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-400 line-clamp-2 mt-0.5">
                          {newNotif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ),
                { duration: 4500 }
              );

              // Dispatch global event for other components (e.g. participant dashboard refresh)
              window.dispatchEvent(new CustomEvent('mavericks:notification', { detail: newNotif }));
            }

            // Attendance update or Event progress update broadcast
            if (message.type === 'attendance_update' || message.type === 'event_progress_update') {
              window.dispatchEvent(new CustomEvent('mavericks:refresh_data', { detail: message }));
            }
          } catch (e) {
            // Non-JSON message or ping
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setSocketConnected(false);
          // Auto reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setSocketConnected(false);
        };
      } catch (err) {
        setSocketConnected(false);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();
    fetchNotifications();

    // Polling fallback every 30s
    const pollInterval = setInterval(() => {
      fetchNotifications(true);
    }, 30000);

    return () => {
      isMounted = false;
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pollInterval);
    };
  }, [user?.id, user?.role, fetchNotifications]);

  // Open drawer and remove unseen count immediately
  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
    // Remove unseen count immediately
    setUnseenCount(0);

    // Call backend to mark all as read
    axios.post('/notifications/mark-read', {}).then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    }).catch(() => { });
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [isDrawerOpen, openDrawer, closeDrawer]);

  // Mark single notification as read
  const markAsRead = async (id) => {
    try {
      await axios.post('/notifications/mark-read', { id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      // Local state fallback
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await axios.post('/notifications/mark-read', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnseenCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnseenCount(0);
    }
  };

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      await axios.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification removed');
    } catch (err) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unseenCount,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications: fetchNotifications,
        socketConnected,
        loading
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
