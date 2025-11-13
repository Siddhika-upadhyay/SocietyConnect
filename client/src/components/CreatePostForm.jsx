import React, { useState } from 'react';
import {
  Card, TextField, Button, Box, Input, Typography,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';

function CreatePostForm({ onPostCreated, categories }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || !selectedCategory) {
      alert("Please write some content and select a category.");
      return;
    }
    onPostCreated(content, imageFile, selectedCategory);
    
    setContent('');
    setImageFile(null);
    setSelectedCategory('');
    const fileInput = document.getElementById('post-image-input');
    if (fileInput) fileInput.value = null;
  };

  return (
    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #ddd' }}>
      <Box component="form" onSubmit={handleSubmit}>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="category-select-label">Category</InputLabel>
          <Select
            labelId="category-select-label"
            id="category-select"
            value={selectedCategory}
            label="Category"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <MenuItem key={cat._id} value={cat._id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <TextField
          label="What's on your mind?"
          multiline
          rows={3}
          variant="outlined"
          fullWidth
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
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