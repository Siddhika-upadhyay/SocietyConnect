import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Container, Box, Chip } from '@mui/material';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

function HomePage() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); 
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchPosts = async () => {
      let url = `${API_URL}/posts`;
      if (selectedCategory) {
        url += `?category=${selectedCategory}`;
      }
      const response = await axios.get(url);
      setPosts(response.data);
    };
    fetchPosts();

    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/categories`);
        setCategories(response.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    if (categories.length === 0) {
      fetchCategories();
    }

    const socket = io(SOCKET_URL);
    
    socket.on('post_created', (newPost) => {
      if (!selectedCategory || newPost.category._id === selectedCategory) {
        setPosts((prev) => [newPost, ...prev]);
      }
    });
    
    socket.on('comment_added', (data) => {
      setPosts((prevPosts) => 
        prevPosts.map((post) => 
          post._id === data.postId 
            ? { ...post, comments: [...post.comments, data.comment] } 
            : post
        )
      );
    });
    
    socket.on('comment_deleted', (data) => { /* ... */ });

    // --- NEW: Socket listener for like/unlike updates ---
    socket.on('post_updated', (updatedPost) => {
      setPosts((prevPosts) => 
        prevPosts.map((post) => 
          post._id === updatedPost._id ? updatedPost : post
        )
      );
    });
    
    return () => socket.disconnect();
    
  }, [token, navigate, selectedCategory]);

  const authHeader = (contentType = 'application/json') => ({
    headers: { 'x-auth-token': token, 'Content-Type': contentType },
  });

  const handlePostCreated = async (content, imageFile, categoryId) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('category', categoryId);
    if (imageFile) formData.append('image', imageFile);
    await axios.post(`${API_URL}/posts`, formData, authHeader('multipart/form-data'));
  };

  const handleCommentAdded = async (postId, text) => {
    await axios.post(`${API_URL}/posts/${postId}/comments`, { text }, authHeader());
  };

  const handleCommentDeleted = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      await axios.delete(`${API_URL}/posts/comments/${commentId}`, authHeader());
    }
  };

  // --- NEW: Handler for liking a post ---
  const handleLikePost = async (postId) => {
    try {
      await axios.put(`${API_URL}/posts/${postId}/like`, {}, authHeader());
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  return (
    <Container maxWidth="md">
      {user && (
        <>
            <Box sx={{ my: 4 }}>
                <CreatePostForm onPostCreated={handlePostCreated} categories={categories} />
            </Box>

            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="All Posts"
                onClick={() => setSelectedCategory(null)}
                color={!selectedCategory ? 'primary' : 'default'}
              />
              {categories.map((cat) => (
                <Chip
                  key={cat._id}
                  label={cat.name}
                  onClick={() => setSelectedCategory(cat._id)}
                  color={selectedCategory === cat._id ? 'primary' : 'default'}
                  variant="outlined"
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {posts.map((post) => (
                <PostCard 
                    key={post._id} 
                    post={post}
                    onCommentAdded={handleCommentAdded}
                    onCommentDeleted={handleCommentDeleted}
                    onLikePost={handleLikePost} // Pass the new handler
                />
                ))}
            </Box>
        </>
      )}
    </Container>
  );
}

export default HomePage;