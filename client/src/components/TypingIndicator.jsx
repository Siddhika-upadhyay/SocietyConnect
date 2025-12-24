import React from 'react';
import { Box, Typography } from '@mui/material';

function TypingIndicator({ users = [] }) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0]} is typing...`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing...`;
    } else {
      return `${users[0]} and ${users.length - 1} others are typing...`;
    }
  };

  return (
    <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Box
          sx={{
            width: 4,
            height: 4,
            bgcolor: 'primary.main',
            borderRadius: '50%',
            animation: 'bounce 1.4s infinite ease-in-out both'
          }}
        />
        <Box
          sx={{
            width: 4,
            height: 4,
            bgcolor: 'primary.main',
            borderRadius: '50%',
            animation: 'bounce 1.4s infinite ease-in-out both',
            animationDelay: '0.16s'
          }}
        />
        <Box
          sx={{
            width: 4,
            height: 4,
            bgcolor: 'primary.main',
            borderRadius: '50%',
            animation: 'bounce 1.4s infinite ease-in-out both',
            animationDelay: '0.32s'
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {getTypingText()}
      </Typography>
      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </Box>
  );
}

export default TypingIndicator;
