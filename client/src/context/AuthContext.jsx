import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

// A helper function to create an axios instance
export const api = axios.create({
 baseURL: import.meta.env.VITE_API_URL,
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
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  // Function to update total unread messages
  const updateTotalUnreadMessages = (count) => {
    setTotalUnreadMessages(count);
  };

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

  // Periodic refetch of notifications every 30 seconds to catch any missed ones
  useEffect(() => {
    if (user && token) {
      const interval = setInterval(() => {
        fetchNotifications(token);
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const connectSocket = (userId) => {
    const SOCKET_URL = import.meta.env.VITE_API_URL.replace('/api', '');
    const newSocket = io(SOCKET_URL);

    setSocket(newSocket);
    newSocket.emit('addUser', userId);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    newSocket.on('new_notification', (newNotification) => {
      console.log('Received new notification:', newNotification);
      // Play notification sound if enabled
      if (localStorage.getItem('notificationSound') !== 'false') {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
      }
      setNotifications((prevNotifications) => [newNotification, ...prevNotifications]);
    });

    newSocket.on('receiveMessage', (messageData) => {
      console.log('Received message:', messageData);
      // Update unread messages count
      setUnreadMessagesCount(prev => prev + 1);
      setTotalUnreadMessages(prev => prev + 1);
      // Play notification sound for messages if enabled
      if (localStorage.getItem('notificationSound') !== 'false') {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed for message:', e));
      }
      // Emit a custom event to notify MessagesPage of new message
      window.dispatchEvent(new CustomEvent('newMessageReceived', { detail: messageData }));
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
    setTotalUnreadMessages(0);
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
      unreadMessagesCount,
      totalUnreadMessages,
      updateTotalUnreadMessages
    }}>
      {children}
    </AuthContext.Provider>
  );
};