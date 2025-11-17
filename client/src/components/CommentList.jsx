import React, { useContext, useState } from 'react';
import { Box, Typography, Divider, IconButton, Link, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // Import RouterLink
import DeleteIcon from '@mui/icons-material/Delete';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

function CommentList({ comments, onCommentDeleted }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [showAllComments, setShowAllComments] = useState(false);

  if (!comments || comments.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>No comments yet.</Typography>;
  }

  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

  return (
    <Box sx={{ mt: 2 }}>
      {displayedComments.map((comment, index) => (
        <Box key={comment._id || index} sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant="body2"
              sx={{
                fontStyle: comment.isDeleted ? 'italic' : 'normal',
                color: theme === 'dark' ? '#ffffff' : (comment.isDeleted ? 'text.secondary' : 'text.primary')
              }}
            >
              {/* --- Make the name a clickable link --- */}
              <Link component={RouterLink} to={`/profile/${comment.author?.email}`} sx={{ fontWeight: 'bold', color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
                {comment.author ? comment.author.name : 'User'}
              </Link>
              : {comment.text}
            </Typography>
            {user && comment.author && user.id === comment.author._id && !comment.isDeleted && (
              <IconButton size="small" onClick={() => onCommentDeleted(comment._id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          {index < displayedComments.length - 1 && <Divider sx={{ my: 1 }} />}
        </Box>
      ))}
      {comments.length > 2 && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Button
            size="small"
            onClick={() => setShowAllComments(!showAllComments)}
            sx={{ color: theme === 'dark' ? '#ffffff' : 'primary.main' }}
          >
            {showAllComments ? 'Show Less' : `Show All ${comments.length} Comments`}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default CommentList;