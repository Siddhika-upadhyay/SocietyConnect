import React, { useState, useContext } from 'react';
import { Card, CardContent, Typography, Box, TextField, Button, Divider, CardMedia, Chip, IconButton, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // Import RouterLink
import CommentList from './CommentList';
import { AuthContext } from '../context/AuthContext';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

function PostCard({ post, onCommentAdded, onCommentDeleted, onLikePost }) {
  const [commentText, setCommentText] = useState('');
  const { user } = useContext(AuthContext);
  const isLiked = post.likes.includes(user.id);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onCommentAdded(post._id, commentText);
    setCommentText('');
  };

  return (
    <Card>
      {post.imageUrl && (
        <CardMedia component="img" sx={{ maxHeight: 400 }} image={post.imageUrl} alt="Post image" />
      )}
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Posted by: 
            {/* --- Make the username a clickable link --- */}
            <Link component={RouterLink} to={`/profile/${post.author?.username}`} sx={{ ml: 0.5 }}>
              {post.author ? post.author.username : 'Anonymous'}
            </Link>
          </Typography>
          {post.category && (
            <Chip label={post.category.name} size="small" variant="outlined" />
          )}
        </Box>
        
        <Typography variant="body1" sx={{ my: 1, whiteSpace: 'pre-wrap' }}>
          {post.content}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDate(post.createdAt)}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <IconButton onClick={() => onLikePost(post._id)} size="small" color="error">
            {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Comments
        </Typography>
        <CommentList comments={post.comments} onCommentDeleted={onCommentDeleted} />

        {user && onCommentAdded && ( // Check for onCommentAdded to make it optional
            <Box component="form" onSubmit={handleCommentSubmit} sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Write a comment..."
                    fullWidth
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                />
                <Button type="submit" variant="contained" size="small">
                    Add
                </Button>
            </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default PostCard;