import React, { useContext } from 'react';
import { Card, CardContent, Typography, Avatar, Box, Chip } from '@mui/material';
import { People } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

function CommunityCard({ community }) {
    const { theme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/community/${community._id}`);
    };

    return (
        <Card
            onClick={handleClick}
            sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                },
                bgcolor: theme === 'dark' ? '#1e1e1e' : '#fff'
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                        sx={{ width: 50, height: 50, bgcolor: 'primary.main' }}
                        src={community.avatar}
                    >
                        {community.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant="h6"
                            sx={{ color: theme === 'dark' ? '#fff' : 'inherit' }}
                        >
                            {community.name}
                        </Typography>
                        <Chip
                            icon={<People sx={{ fontSize: 14 }} />}
                            label={`${community.memberCount || 0} members`}
                            size="small"
                            sx={{ mt: 0.5 }}
                        />
                    </Box>
                </Box>

                <Typography
                    variant="body2"
                    sx={{
                        color: theme === 'dark' ? '#b0b0b0' : 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                    }}
                >
                    {community.description || 'No description'}
                </Typography>
            </CardContent>
        </Card>
    );
}

export default CommunityCard;
