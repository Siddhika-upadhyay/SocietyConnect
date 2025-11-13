import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Container, Box, Typography, CircularProgress } from '@mui/material';
import PostCard from '../components/PostCard';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { username } = useParams(); // Gets the username from the URL
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/users/${username}`, {
          headers: { 'x-auth-token': token }
        });
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
  }, [username, token]); // Re-fetch if the username in the URL changes

  if (loading) {
    return <Container maxWidth="md" sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Container>;
  }

  if (error) {
    return <Container maxWidth="md" sx={{ textAlign: 'center', mt: 8 }}><Typography variant="h5">{error}</Typography></Container>;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {profile.username}'s Profile
        </Typography>
        <Typography variant="h5" component="h2" color="text.secondary" gutterBottom>
          Posts
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {posts.length > 0 ? (
          posts.map((post) => (
            // We pass dummy functions for like/comment, as profile page is read-only
            <PostCard 
              key={post._id} 
              post={post}
              onCommentAdded={() => {}}
              onCommentDeleted={() => {}}
              onLikePost={() => {}}
            />
          ))
        ) : (
          <Typography>This user hasn't posted anything yet.</Typography>
        )}
      </Box>
    </Container>
  );
}

export default ProfilePage;