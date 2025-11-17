import React, { useState, useContext } from 'react';
import { Card, CardContent, Typography, Box, TextField, Button, Divider, CardMedia, Chip, IconButton, Link, Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // Import RouterLink and useNavigate
import CommentList from './CommentList';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function PostCard({ post, onCommentAdded, onCommentDeleted, onLikePost, onPostUpdated, onPostDeleted, showEditDelete = false }) {
  const [commentText, setCommentText] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const { user, api } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const isLiked = user && post.likes.includes(user.id);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!commentText.trim()) return;
    onCommentAdded(post._id, commentText);
    setCommentText('');
  };

  const handleLikeClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    onLikePost(post._id);
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEditClick = () => {
    setEditContent(post.content);
    setEditCategory(post.category._id);
    setEditImageFile(null);
    fetchCategories();
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (onPostDeleted) {
      onPostDeleted(post._id);
    }
    handleMenuClose();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (onPostUpdated) {
      await onPostUpdated(post._id, {
        content: editContent,
        category: editCategory,
        imageFile: editImageFile
      });
    }
    setEditDialogOpen(false);
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  return (
    <Card id={`post-${post._id}`}>
      {post.imageUrl && (
        <CardMedia component="img" sx={{ maxHeight: 400 }} image={post.imageUrl} alt="Post image" />
      )}
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)' }}>
            Posted by:
            {/* --- Make the name a clickable link --- */}
            <Link component={RouterLink} to={`/profile/${post.author?.email}`} sx={{ ml: 0.5, fontWeight: 500, color: 'var(--primary)' }}>
              {post.author ? post.author.name : 'Anonymous'}
            </Link>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {post.category && (
              <Chip label={post.category.name} size="small" variant="outlined" />
            )}
            {showEditDelete && (
              <>
                <IconButton size="small" onClick={handleMenuOpen} sx={{ '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' } }}>
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff',
                      color: theme === 'dark' ? '#fff' : 'inherit',
                      borderRadius: 2
                    }
                  }}
                >
                  <MenuItem sx={{ color: theme === 'dark' ? '#fff' : 'inherit' }} onClick={handleEditClick}>
                    <EditIcon sx={{ mr: 1 }} />
                    Edit
                  </MenuItem>
                  
                  <MenuItem sx={{ color: theme === 'dark' ? '#fff' : 'inherit' }} onClick={handleDeleteClick}>
                    <DeleteIcon sx={{ mr: 1 }} />
                    Delete
                  </MenuItem>
                </Menu>

              </>
            )}
          </Box>
        </Box>

        <Typography variant="body1" sx={{ my: 2, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-primary)' }}>
          {post.content}
        </Typography>
        <hr style={{ border: 'none', borderTop: '1px solid var(--text-secondary)', margin: '16px 0', opacity: 0.3 }} />
        <Typography variant="caption" sx={{ mb: 2, display: 'block', color: 'var(--text-secondary)' }}>
          {formatDate(post.createdAt)}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={handleLikeClick} size="small" color="error" sx={{ mr: 1 }}>
            {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
            {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600, color: 'var(--text-primary)' }}>
          Comments ({post.comments.length})
        </Typography>
        <CommentList comments={post.comments} onCommentDeleted={onCommentDeleted} />

        {onCommentAdded && ( // Always show comment form, but handle auth in submit
            <Box component="form" onSubmit={handleCommentSubmit} sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Write a comment..."
                    fullWidth
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'var(--background-card)',
                            color: 'var(--text-primary)',
                            '& fieldset': {
                                borderColor: 'var(--text-secondary)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'var(--primary)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'var(--primary)',
                            },
                        },
                        '& .MuiInputBase-input': {
                            color: 'var(--text-primary)',
                            '&::placeholder': {
                                color: 'var(--text-secondary)',
                                opacity: 1,
                            },
                        },
                    }}
                />
                <Button type="submit" variant="contained" size="small" sx={{ borderRadius: 2, px: 3, bgcolor: 'var(--primary)' }}>
                    Add
                </Button>
            </Box>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>Edit Post</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleEditSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Content"
              multiline
              rows={4}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              sx={{
                '& .MuiInputLabel-root': { color: theme === 'dark' ? '#ffffff' : 'inherit' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                  '&:hover fieldset': { borderColor: theme === 'dark' ? '#cccccc' : 'inherit' },
                  '&.Mui-focused fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                },
                '& .MuiOutlinedInput-input': { color: theme === 'dark' ? '#ffffff' : 'inherit' }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              select
              label="Category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: {
                      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
                      color: theme === 'dark' ? '#ffffff' : 'inherit',
                    }
                  }
                }
              }}
              sx={{
                '& .MuiInputLabel-root': { color: theme === 'dark' ? '#ffffff' : 'inherit' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                  '&:hover fieldset': { borderColor: theme === 'dark' ? '#cccccc' : 'inherit' },
                  '&.Mui-focused fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                },
                '& .MuiOutlinedInput-input': { color: theme === 'dark' ? '#ffffff' : 'inherit' },
                '& .MuiSelect-select': { color: theme === 'dark' ? '#ffffff' : 'inherit' }
              }}
            >
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id} sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
            <input
              accept="image/*"
              type="file"
              onChange={(e) => setEditImageFile(e.target.files[0])}
              style={{ marginTop: 16 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" sx={{ color: theme === 'dark' ? '#000000' : 'inherit', backgroundColor: theme === 'dark' ? '#ffffff' : 'inherit' }}>Update</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default PostCard;