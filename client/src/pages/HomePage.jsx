import React, { useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { Container, Box, Chip, TextField, InputAdornment, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PostCard from '../components/PostCard';
import { AuthContext, api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SOCKET_URL = import.meta.env.VITE_API_URL.replace('/api', '');


function HomePage({ searchQuery: propSearchQuery }) {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    setSearchQuery(propSearchQuery || '');
  }, [propSearchQuery]);

  useEffect(() => {
    const fetchPosts = async () => {
      let url = '/posts';
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const response = await api.get(url);
      setPosts(response.data);
    };
    fetchPosts();

    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
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
            ? { ...post, commentCount: (post.commentCount || 0) + 1 } 
            : post
        )
      );
    });
    
    socket.on('comment_deleted', (data) => {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === data.postId
            ? {
                ...post,
                commentCount: Math.max(0, (post.commentCount || 0) - 1)
              }
            : post
        )
      );
    });

    // --- NEW: Socket listener for like/unlike updates ---
    socket.on('post_updated', (updatedPost) => {
      setPosts((prevPosts) => 
        prevPosts.map((post) => 
          post._id === updatedPost._id ? updatedPost : post
        )
      );
    });
    
    return () => socket.disconnect();
    
  }, [selectedCategory, searchQuery]);

  const authHeader = (contentType = 'application/json') => ({
    headers: { 'x-auth-token': token, 'Content-Type': contentType },
  });

  const handlePostCreated = async (content, imageFile, categoryId) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('category', categoryId);
    if (imageFile) formData.append('image', imageFile);
    await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  };


  const handleCommentAdded = async (commentData) => {
    // Nested comments are handled by the CommentList component
    console.log('Comment added:', commentData);
  };

  const handleCommentDeleted = async (commentId) => {
    // Nested comments are handled by the CommentList component
    console.log('Comment deleted:', commentId);
  };

  // --- NEW: Handler for liking a post ---
  const handleLikePost = async (postId) => {
    try {
      await api.put(`/posts/${postId}/like`);
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>


        <Typography variant="h5" sx={{ mb: 2 }}>Categories</Typography>
        <Box sx={{ mb: 4, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
              onLikePost={handleLikePost}
            />
          ))}
        </Box>
      </Box>
    </Container>
  );
}

export default HomePage;