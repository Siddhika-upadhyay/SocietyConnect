import React, { useState } from 'react';
import { Card, TextField, Button, Box, Input, Typography } from '@mui/material';

function CreatePostForm({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) return; // Prevent empty posts
    onPostCreated(content, imageFile);
    setContent('');
    setImageFile(null);
    // Clear the file input visually
    const fileInput = document.getElementById('post-image-input');
    if (fileInput) fileInput.value = null;
  };

  return (
    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #ddd' }}>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="What's on your mind?"
          multiline
          rows={3}
          variant="outlined"
          fullWidth
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
        {/* --- THIS IS THE STYLED BUTTON --- */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" component="label" size="small">
            Add Image
            <input 
              type="file" 
              id="post-image-input" 
              hidden 
              onChange={handleFileChange} 
              accept="image/*" 
            />
          </Button>
          {imageFile && <Typography variant="body2" color="text.secondary">{imageFile.name}</Typography>}
        </Box>
        {/* ---------------------------------- */}

        <Button
          type="submit"
          variant="contained"
          sx={{ mt: 2 }}
          fullWidth
        >
          Post
        </Button>
      </Box>
    </Card>
  );
}

export default CreatePostForm;