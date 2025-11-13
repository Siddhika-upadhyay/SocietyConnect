import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

// A helper function to create an axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    newSocket.emit('addUser', userId);
    newSocket.on('new_notification', (newNotification) => {
      setNotifications((prevNotifications) => [newNotification, ...prevNotifications]);
    });
  };

  const fetchNotifications = async (authToken) => {
    try {
      const res = await api.get('/notifications', {
        headers: { 'x-auth-token': authToken }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const login = async (username, password) => {
    const response = await api.post('/users/login', { username, password });
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
  };

  const register = async (username, password) => {
    // --- THIS IS THE LINE THAT WAS FIXED ---
    await api.post('/users/register', { username, password });
  };
  
  const markNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/mark-read');
      setNotifications((prev) => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
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
      markNotificationsAsRead 
    }}>
      {children}
    </AuthContext.Provider>
  );
};