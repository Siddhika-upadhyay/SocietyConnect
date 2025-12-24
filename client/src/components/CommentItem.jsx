import React, { useContext } from 'react';
import { Box, Typography, IconButton, Link } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

function CommentItem({ comment, onCommentDeleted }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  if (!comment || comment.isDeleted) {
    return (
      <Box>
        <Typography
          variant="body2"
          sx={{
            fontStyle: 'italic',
            color: 'text.secondary',
            py: 1,
            px: 2,
            backgroundColor: 'action.hover',
            borderRadius: 1
          }}
        >
          [deleted comment]
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        py: 1.5,
        px: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        mb: 1
      }}
    >
      {/* Comment Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Link
            component={RouterLink}
            to={`/profile/${comment.author?.email}`}
            sx={{
              fontWeight: 'bold',
              color: theme === 'dark' ? 'primary.light' : 'primary.main',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {comment.author?.name || 'User'}
          </Link>
          <Typography variant="caption" color="text.secondary">
            {formatTime(comment.createdAt)}
          </Typography>
        </Box>

        {/* Delete Button */}
        {user && comment.author && user.id === comment.author._id && (
          <IconButton
            size="small"
            onClick={() => onCommentDeleted(comment._id)}
            sx={{ color: 'error.main' }}
          >
            <Delete fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Comment Text */}
      <Typography
        variant="body2"
        sx={{
          color: theme === 'dark' ? 'text.primary' : 'text.primary',
          lineHeight: 1.5
        }}
      >
        {comment.text}
      </Typography>
    </Box>
  );
}

export default CommentItem;
