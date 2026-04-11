import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import './NotificationTray.css';

export default function NotificationTray() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    
    // Connect to backend sockets
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    
    // Join a room specifically for this user if applicable, 
    // or listen to global broadcast for new complaints for authorities
    socket.on('connect', () => {
      console.log('Notification socket connected');
    });

    socket.on('status_updated', (data) => {
      const newNotif = {
        id: Date.now(),
        title: 'Status Updated',
        message: `Complaint #${data.id.substring(0,8)} status changed to ${data.status}`,
        time: new Date().toLocaleTimeString(),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('new_complaint', (data) => {
      if (user.role === 'authority' || user.role === 'admin') {
        const newNotif = {
          id: Date.now(),
          title: 'New Complaint',
          message: `Issue ${data.referenceNo} (${data.severity}) was reported.`,
          time: new Date().toLocaleTimeString(),
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const toggleOpen = () => setOpen(!open);
  
  const markRead = () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  return (
    <div className="notif-tray">
      <button className="notif-tray__btn" onClick={toggleOpen}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-tray__badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-tray__dropdown animate-fadeIn">
          <div className="notif-tray__header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm text-sm" onClick={markRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-tray__list">
            {notifications.length === 0 ? (
              <div className="notif-tray__empty">No new notifications</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-tray__item ${!n.read ? 'unread' : ''}`}>
                  <div className="notif-tray__item-header">
                    <strong>{n.title}</strong>
                    <span className="notif-tray__time">{n.time}</span>
                  </div>
                  <p>{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
