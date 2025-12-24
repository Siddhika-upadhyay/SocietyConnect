import React from 'react';
import { Box, Avatar, Badge, Typography } from '@mui/material';
import { Circle } from '@mui/icons-material';

function PresenceIndicator({ user, size = 'medium' }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'success.main';
      case 'away':
        return 'warning.main';
      case 'busy':
        return 'error.main';
      default:
        return 'text.disabled';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      default:
        return 'Offline';
    }
  };

  const avatarSize = {
    small: 32,
    medium: 40,
    large: 56
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={
          <Circle
            sx={{
              width: 12,
              height: 12,
              bgcolor: getStatusColor(user.status),
              border: '2px solid white',
              borderRadius: '50%'
            }}
          />
        }
      >
        <Avatar
          sx={{ width: avatarSize[size], height: avatarSize[size] }}
          src={user.avatar}
        >
          {user.name?.charAt(0).toUpperCase()}
        </Avatar>
      </Badge>
      <Box>
        <Typography variant="body1">{user.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {getStatusText(user.status)}
          {user.lastSeen && user.status !== 'online' && (
            <> • Last seen {new Date(user.lastSeen).toLocaleString()}</>
          )}
        </Typography>
      </Box>
    </Box>
  );
}

export default PresenceIndicator;
