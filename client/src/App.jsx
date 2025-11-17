import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import AdminPage from './pages/AdminPage';
import Navbar from './components/Navbar';
import { AuthContext, api } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';

function App() {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const handlePostCreated = async (content, imageFile, categoryId) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('category', categoryId);
    if (imageFile) formData.append('image', imageFile);
    await api.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div data-theme={theme}>
      <Router>
        <Navbar
          onPostCreated={handlePostCreated}
          categories={categories}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
        <Routes>
          <Route path="/" element={<HomePage searchQuery={searchQuery} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile/:email" element={<ProfilePage />} />
          <Route path="/messages/:userId?" element={<MessagesPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
