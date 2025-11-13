import React, { useContext } from 'react';
import { Box, Typography, Divider, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { AuthContext } from '../context/AuthContext';

function CommentList({ comments, onCommentDeleted }) {
  const { user } = useContext(AuthContext);

  if (!comments || comments.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>No comments yet.</Typography>;
  }

  return (
    <Box sx={{ mt: 2 }}>
      {comments.map((comment, index) => (
        <Box key={comment._id || index} sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontStyle: comment.isDeleted ? 'italic' : 'normal', color: comment.isDeleted ? 'text.secondary' : 'text.primary' }}>
              <strong>{comment.author ? comment.author.username : 'User'}:</strong> {comment.text}
            </Typography>
            {/* Show delete button only if the user is the author and the comment isn't already deleted */}
            {user && comment.author && user.id === comment.author._id && !comment.isDeleted && (
              <IconButton size="small" onClick={() => onCommentDeleted(comment._id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          {index < comments.length - 1 && <Divider sx={{ my: 1 }} />}
        </Box>
      ))}
    </Box>
  );
}

export default CommentList;