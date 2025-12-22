import React, { useState, useContext } from 'react';
import { Box, Typography, IconButton, Link, Button } from '@mui/material';
import { Reply, Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import ReplyForm from './ReplyForm';

function CommentItem({ comment, postId, onReplyAdded, onCommentDeleted, level = 0 }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [localReplies, setLocalReplies] = useState(comment.replies || []);

  const maxDepth = 3;
  const indentLevel = Math.min(level, maxDepth - 1);

  const handleReplyAdded = (newReply) => {
    setLocalReplies(prev => [...prev, newReply]);
    onReplyAdded(newReply);
    setShowReplyForm(false);
  };

  const handleReplyDeleted = (replyId) => {
    setLocalReplies(prev => prev.filter(reply => reply._id !== replyId));
  };

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
      <Box sx={{ pl: (indentLevel + 1) * 2 }}>
        <Typography
          variant="body2"
          sx={{
            fontStyle: 'italic',
            color: 'text.secondary',
            py: 1,
            px: 2,
            backgroundColor: 'action.hover',
            borderRadius: 1,
            borderLeft: '3px solid',
            borderColor: 'divider'
          }}
        >
          [deleted comment]
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pl: (indentLevel + 1) * 2 }}>
      <Box
        sx={{
          py: 1.5,
          borderLeft: '3px solid',
          borderColor: level > 0 ? 'primary.light' : 'transparent',
          pl: 2,
          backgroundColor: level > 0 ? 'action.hover' : 'transparent',
          borderRadius: level > 0 ? '0 8px 8px 0' : 0
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
            {level > 0 && (
              <Typography variant="caption" color="text.secondary">
                (reply)
              </Typography>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {user && comment.author && user.id === comment.author._id && (
              <IconButton
                size="small"
                onClick={() => onCommentDeleted(comment._id)}
                sx={{ color: 'error.main' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
            {user && level < maxDepth - 1 && (
              <IconButton
                size="small"
                onClick={() => setShowReplyForm(!showReplyForm)}
                sx={{ color: 'text.secondary' }}
              >
                <Reply fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Comment Text */}
        <Typography
          variant="body2"
          sx={{
            color: theme === 'dark' ? 'text.primary' : 'text.primary',
            lineHeight: 1.5,
            mb: 1
          }}
        >
          {comment.text}
        </Typography>

        {/* Reply Actions */}
        {comment.replyCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Button
              size="small"
              startIcon={showReplies ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setShowReplies(!showReplies)}
              sx={{ color: 'text.secondary', textTransform: 'none' }}
            >
              {showReplies ? 'Hide' : 'Show'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </Button>
          </Box>
        )}

        {/* Reply Form */}
        {showReplyForm && (
          <ReplyForm
            postId={postId}
            parentId={comment._id}
            onReplyAdded={handleReplyAdded}
            onCancel={() => setShowReplyForm(false)}
            placeholder={`Reply to ${comment.author?.name || 'user'}...`}
          />
        )}

        {/* Nested Replies */}
        {showReplies && localReplies.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {localReplies.map((reply) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                postId={postId}
                level={level + 1}
                onReplyAdded={handleReplyAdded}
                onCommentDeleted={handleReplyDeleted}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default CommentItem;
