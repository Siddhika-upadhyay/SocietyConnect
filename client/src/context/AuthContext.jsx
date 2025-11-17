import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

// A helper function to create an axios instance
export const api = axios.create({
  baseURL: 'http://localhost:5001/api',
});

// Add an interceptor to automatically include the auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchNotifications(storedToken);
        connectSocket(parsedUser.id);
      }
    }
    return () => {
      if(socket) socket.disconnect();
    };
  }, []);

  const connectSocket = (userId) => {
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);
    newSocket.emit('addUser', userId);
    newSocket.on('new_notification', (newNotification) => {
      // Play notification sound if enabled
      if (localStorage.getItem('notificationSound') !== 'false') {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
      }
      setNotifications((prevNotifications) => [newNotification, ...prevNotifications]);
    });
    newSocket.on('receiveMessage', (messageData) => {
      // Update unread messages count
      setUnreadMessagesCount(prev => prev + 1);
      // Play notification sound for messages if enabled
      if (localStorage.getItem('notificationSound') !== 'false') {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
      }
      // Refresh conversations when new message arrives
      // This will be handled by the MessagesPage component
    });
  };

  const fetchNotifications = async (authToken) => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      if (err.response && err.response.status === 400) {
        // Token might be invalid, logout
        logout();
      }
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/users/login', { email, password });
    const { token, user } = response.data;
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    fetchNotifications(token);
    connectSocket(user.id);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socket) socket.disconnect();
    setSocket(null);
    setNotifications([]);
    setUnreadMessagesCount(0);
  };

  const register = async (name, email, password, phone) => {
    const response = await api.post('/users/register', { name, email, password, phone });
    // Auto-login after successful registration
    const { token, user } = response.data;
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    fetchNotifications(token);
    connectSocket(user.id);
  };
  
  const markNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/mark-read');
      setNotifications((prev) =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
      if (err.response && err.response.status === 400) {
        logout();
      }
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n =>
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };


  return (
    <AuthContext.Provider value={{
      user,
      token,
      register,
      login,
      logout,
      notifications,
      markNotificationsAsRead,
      markNotificationAsRead,
      unreadMessagesCount
    }}>
      {children}
    </AuthContext.Provider>
  );
};