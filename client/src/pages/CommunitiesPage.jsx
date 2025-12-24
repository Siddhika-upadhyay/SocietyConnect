import React, { useState, useEffect, useContext } from 'react';
import {
    Container, Box, Typography, TextField, InputAdornment,
    Grid, Button, CircularProgress
} from '@mui/material';
import { Search, Add } from '@mui/icons-material';
import { AuthContext, api } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import CommunityCard from '../components/CommunityCard';
import CreateCommunityModal from '../components/CreateCommunityModal';

function CommunitiesPage() {
    const { user } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);
    const [communities, setCommunities] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchCommunities();
    }, []);

    const fetchCommunities = async () => {
        try {
            let url = '/communities';
            if (searchQuery) {
                url += `?search=${encodeURIComponent(searchQuery)}`;
            }
            const response = await api.get(url);
            setCommunities(response.data);
        } catch (err) {
            console.error('Error fetching communities:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchCommunities();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleCommunityCreated = (newCommunity) => {
        setCommunities(prev => [newCommunity, ...prev]);
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{ color: theme === 'dark' ? '#fff' : 'inherit', fontWeight: 'bold' }}
                    >
                        Communities
                    </Typography>
                    {user && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setShowCreateModal(true)}
                        >
                            Create Community
                        </Button>
                    )}
                </Box>

                {/* Search Bar */}
                <TextField
                    fullWidth
                    placeholder="Search communities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: theme === 'dark' ? '#888' : 'inherit' }} />
                            </InputAdornment>
                        )
                    }}
                    sx={{
                        mb: 4,
                        '& .MuiOutlinedInput-root': {
                            color: theme === 'dark' ? '#fff' : 'inherit',
                            '& fieldset': {
                                borderColor: theme === 'dark' ? '#444' : 'inherit'
                            },
                            '&:hover fieldset': {
                                borderColor: theme === 'dark' ? '#666' : 'inherit'
                            }
                        }
                    }}
                />

                {/* Communities Grid */}
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : communities.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography sx={{ color: theme === 'dark' ? '#888' : 'text.secondary' }}>
                            {searchQuery ? 'No communities found matching your search.' : 'No communities yet. Be the first to create one!'}
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {communities.map((community) => (
                            <Grid item xs={12} sm={6} md={4} key={community._id}>
                                <CommunityCard community={community} />
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Create Community Modal */}
                <CreateCommunityModal
                    open={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCommunityCreated={handleCommunityCreated}
                />
            </Box>
        </Container>
    );
}

export default CommunitiesPage;
