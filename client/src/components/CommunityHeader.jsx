import React, { useContext } from 'react';
import { Box, Typography, Button, Avatar, Chip } from '@mui/material';
import { People, Person } from '@mui/icons-material';
import { ThemeContext } from '../context/ThemeContext';

function CommunityHeader({ community, isMember, onJoinLeave, isLoading }) {
    const { theme } = useContext(ThemeContext);

    if (!community) return null;

    return (
        <Box
            sx={{
                bgcolor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                borderRadius: 2,
                p: 3,
                mb: 3
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                <Avatar
                    sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        fontSize: '2rem'
                    }}
                    src={community.avatar}
                >
                    {community.name?.charAt(0).toUpperCase()}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography
                            variant="h4"
                            sx={{ color: theme === 'dark' ? '#fff' : 'inherit', fontWeight: 'bold' }}
                        >
                            {community.name}
                        </Typography>
                        <Chip
                            icon={<People sx={{ fontSize: 16 }} />}
                            label={`${community.memberCount || community.members?.length || 0} members`}
                            size="small"
                            variant="outlined"
                        />
                    </Box>

                    <Typography
                        variant="body1"
                        sx={{ color: theme === 'dark' ? '#b0b0b0' : 'text.secondary', mb: 2 }}
                    >
                        {community.description || 'No description available'}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                            variant={isMember ? 'outlined' : 'contained'}
                            color={isMember ? 'secondary' : 'primary'}
                            onClick={onJoinLeave}
                            disabled={isLoading}
                            startIcon={<Person />}
                        >
                            {isLoading ? 'Loading...' : isMember ? 'Leave Community' : 'Join Community'}
                        </Button>

                        {community.creator && (
                            <Typography variant="body2" sx={{ color: theme === 'dark' ? '#888' : 'text.secondary' }}>
                                Created by {community.creator.name}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export default CommunityHeader;
