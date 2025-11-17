import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Typography, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, Divider, IconButton } from '@mui/material';
import PostCard from '../components/PostCard';
import { AuthContext, api } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import io from 'socket.io-client';
import SettingsIcon from '@mui/icons-material/Settings';
import ThemeSelector from '../components/ThemeSelector';

const SOCKET_URL = import.meta.env.VITE_API_URL.replace('/api', '');


function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationSound, setNotificationSound] = useState(localStorage.getItem('notificationSound') !== 'false');
  const { email } = useParams();
  const { user } = useContext(AuthContext);
  const { theme, changeTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('post_updated', (updatedPost) => {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === updatedPost._id ? updatedPost : post
        )
      );
    });

    socket.on('post_deleted', (deletedPostId) => {
      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== deletedPostId));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/${email}`);
        setProfile(response.data.user);
        setPosts(response.data.posts);
        setError('');
      } catch (err) {
        setError('User not found.');
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [email]); // Re-fetch if the email in the URL changes

  const handleMessageClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (profile && user.id !== profile._id) {
      navigate(`/messages/${profile._id}`);
    }
  };

  const handleCommentAdded = async (postId, text) => {
    await api.post(`/posts/${postId}/comments`, { text });
  };

  const handleCommentDeleted = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      await api.delete(`/posts/comments/${commentId}`);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      await api.put(`/posts/${postId}/like`);
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handlePostUpdated = async (postId, updatedData) => {
    try {
      const formData = new FormData();
      formData.append('content', updatedData.content);
      formData.append('category', updatedData.category);
      if (updatedData.imageFile) {
        formData.append('image', updatedData.imageFile);
      }
      await api.put(`/posts/${postId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err) {
      console.error("Error updating post:", err);
    }
  };

  const handlePostDeleted = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await api.delete(`/posts/${postId}`);
      } catch (err) {
        console.error("Error deleting post:", err);
      }
    }
  };

  const handleNotificationSoundToggle = (event) => {
    const enabled = event.target.checked;
    setNotificationSound(enabled);
    localStorage.setItem('notificationSound', enabled.toString());
  };

  if (loading) {
    return <Container maxWidth="md" sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Container>;
  }

  if (error) {
    return <Container maxWidth="md" sx={{ textAlign: 'center', mt: 8 }}><Typography variant="h5">{error}</Typography></Container>;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
            {profile.name}'s Profile
          </Typography>
          {profile && user?.id === profile._id && (
            <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
              <SettingsIcon />
            </IconButton>
          )}
        </Box>
        {profile && user?.id !== profile._id && (
          <Button variant="contained" color="primary" onClick={handleMessageClick} sx={{ mb: 2 }}>
            Message
          </Button>
        )}
        <Typography variant="h5" component="h2" sx={{ color: theme === 'dark' ? '#b0b0b0' : 'text.secondary' }} gutterBottom>
          Posts
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onCommentAdded={handleCommentAdded}
              onCommentDeleted={handleCommentDeleted}
              onLikePost={handleLikePost}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
              showEditDelete={user?.id === profile?._id}
            />
          ))
        ) : (
          <Typography sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>This user hasn't posted anything yet.</Typography>
        )}
      </Box>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: 'var(--background-card)', color: theme === 'dark' ? '#ffffff' : 'var(--text-primary)' }}>
          Settings
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: 'var(--background-card)', color: theme === 'dark' ? '#ffffff' : 'var(--text-primary)' }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: theme === 'dark' ? '#ffffff' : 'var(--text-primary)' }}>
              Theme
            </Typography>
            <ThemeSelector />
            <Divider sx={{ my: 3, borderColor: theme === 'dark' ? '#b0b0b0' : 'var(--text-secondary)' }} />
            <Typography variant="h6" gutterBottom sx={{ color: theme === 'dark' ? '#ffffff' : 'var(--text-primary)' }}>
              Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSound}
                  onChange={handleNotificationSoundToggle}
                  color="primary"
                />
              }
              label="Enable notification sounds"
              sx={{ color: theme === 'dark' ? '#ffffff' : 'var(--text-primary)' }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: 'var(--background-card)' }}>
          <Button onClick={() => setSettingsOpen(false)} sx={{ color: theme === 'dark' ? '#ffffff' : 'var(--text-primary)' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ProfilePage;