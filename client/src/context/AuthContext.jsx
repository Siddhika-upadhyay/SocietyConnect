import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

// A helper function to create an axios instance with the token
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// We'll add an interceptor to automatically include the auth token
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
  
  // --- NEW: Notification State ---
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // 1. Set user and token from local storage on initial load
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // 2. Fetch initial notifications
        fetchNotifications(storedToken);
        // 3. Establish socket connection
        connectSocket(parsedUser.id);
      }
    }

    // 4. Cleanup socket on component unmount
    return () => {
      if(socket) socket.disconnect();
    };
  }, []); // Runs once on app load

  const connectSocket = (userId) => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // 5. Tell the server who this user is
    newSocket.emit('addUser', userId);

    // 6. Listen for new notifications from the server
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
    
    // On login, fetch notifications and connect to socket
    fetchNotifications(token);
    connectSocket(user.id);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // On logout, disconnect socket and clear notifications
    if (socket) socket.disconnect();
    setSocket(null);
    setNotifications([]);
  };

  const register = async (username, password) => {
    await api.post('/users/register', { username, password });
  };
  
  // --- NEW: Function to mark notifications as read ---
  const markNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/mark-read');
      // Update the state locally to reflect the change
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
      notifications, // Provide notifications to the app
      markNotificationsAsRead // Provide the mark-as-read function
    }}>
      {children}
    </AuthContext.Provider>
  );
};