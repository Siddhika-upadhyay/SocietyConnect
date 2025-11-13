import React, { useContext } from 'react';
import { Box, Typography, Divider, IconButton, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // Import RouterLink
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
              {/* --- Make the username a clickable link --- */}
              <Link component={RouterLink} to={`/profile/${comment.author?.username}`} sx={{ fontWeight: 'bold' }}>
                {comment.author ? comment.author.username : 'User'}
              </Link>
              : {comment.text}
            </Typography>
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