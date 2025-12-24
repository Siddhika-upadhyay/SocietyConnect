import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Box, Typography, Chip, CircularProgress } from '@mui/material';
import io from 'socket.io-client';
import { AuthContext, api } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import CommunityHeader from '../components/CommunityHeader';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

function CommunityPage() {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);
    const [community, setCommunity] = useState(null);
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isMember, setIsMember] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        fetchCommunity();
        fetchCategories();
        fetchPosts();

        const socket = io(SOCKET_URL);

        socket.on('post_created', (newPost) => {
            // Only add if it belongs to this community
            if (newPost.community?._id === id) {
                setPosts((prev) => [newPost, ...prev]);
            }
        });

        socket.on('post_updated', (updatedPost) => {
            setPosts((prev) =>
                prev.map((post) => (post._id === updatedPost._id ? updatedPost : post))
            );
        });

        return () => socket.disconnect();
    }, [id]);

    const fetchCommunity = async () => {
        try {
            const response = await api.get(`/communities/${id}`);
            setCommunity(response.data);
            // Check if current user is a member
            if (user) {
                const memberIds = response.data.members.map(m => m._id || m);
                setIsMember(memberIds.includes(user.id));
            }
        } catch (err) {
            console.error('Error fetching community:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchPosts = async () => {
        try {
            let url = `/posts?communityId=${id}`;
            if (selectedCategory) {
                url += `&category=${selectedCategory}`;
            }
            const response = await api.get(url);
            setPosts(response.data);
        } catch (err) {
            console.error('Error fetching posts:', err);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPosts();
        }
    }, [selectedCategory, id]);

    const handleJoinLeave = async () => {
        setIsJoining(true);
        try {
            const response = await api.post(`/communities/${id}/join`);
            setCommunity(response.data);
            setIsMember(response.data.isMember);
        } catch (err) {
            console.error('Error toggling membership:', err);
        } finally {
            setIsJoining(false);
        }
    };

    const handlePostCreated = async (content, imageFile, categoryId) => {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('category', categoryId);
        formData.append('community', id); // Add community ID
        if (imageFile) formData.append('image', imageFile);

        await api.post('/posts', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    };

    const handleLikePost = async (postId) => {
        try {
            await api.put(`/posts/${postId}/like`);
        } catch (err) {
            console.error('Error liking post:', err);
        }
    };

    if (isLoading) {
        return (
            <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (!community) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Typography variant="h5">Community not found</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md">
            <Box sx={{ my: 4 }}>
                <CommunityHeader
                    community={community}
                    isMember={isMember}
                    onJoinLeave={handleJoinLeave}
                    isLoading={isJoining}
                />

                {/* Create Post Form - only show if user is a member */}
                {user && isMember && (
                    <Box sx={{ mb: 4 }}>
                        <CreatePostForm
                            onPostCreated={handlePostCreated}
                            categories={categories}
                        />
                    </Box>
                )}

                {/* Category Filter */}
                <Typography variant="h6" sx={{ mb: 2, color: theme === 'dark' ? '#fff' : 'inherit' }}>
                    Filter by Category
                </Typography>
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

                {/* Posts */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {posts.length === 0 ? (
                        <Typography sx={{ color: theme === 'dark' ? '#888' : 'text.secondary', textAlign: 'center', py: 4 }}>
                            No posts in this community yet. {isMember ? 'Be the first to post!' : 'Join to start posting!'}
                        </Typography>
                    ) : (
                        posts.map((post) => (
                            <PostCard
                                key={post._id}
                                post={post}
                                onLikePost={handleLikePost}
                            />
                        ))
                    )}
                </Box>
            </Box>
        </Container>
    );
}

export default CommunityPage;
