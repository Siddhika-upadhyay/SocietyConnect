import React, { useState, useContext } from 'react';
import {
  Card, TextField, Button, Box, Input, Typography,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { ThemeContext } from '../context/ThemeContext';

function CreatePostForm({ onPostCreated, categories }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const { theme } = useContext(ThemeContext);

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
        
                  <FormControl
            fullWidth
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': {
                color: theme === 'dark' ? '#ffffff' : 'inherit',
              },
              '& .MuiOutlinedInput-root': {
                color: theme === 'dark' ? '#ffffff' : 'inherit',
                '& fieldset': {
                  borderColor: theme === 'dark' ? '#ffffff55' : 'inherit',
                },
                '&:hover fieldset': {
                  borderColor: theme === 'dark' ? '#bbbbbb' : 'inherit',
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme === 'dark' ? '#ffffff' : 'inherit',
                },
              },
            }}
          >
            <InputLabel id="category-select-label">
              Category
            </InputLabel>

            <Select
              labelId="category-select-label"
              id="category-select"
              value={selectedCategory}
              label="Category"
              onChange={(e) => setSelectedCategory(e.target.value)}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: theme === 'dark' ? '#111' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000',
                  }
                }
              }}
            >
              {categories.map((cat) => (
                <MenuItem
                  key={cat._id}
                  value={cat._id}
                  sx={{
                    bgcolor: theme === 'dark' ? '#111' : 'transparent',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
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
            sx={{
              '& .MuiInputLabel-root': {
                color: theme === 'dark' ? '#ffffff' : 'inherit'
              },
              '& .MuiOutlinedInput-root': {
                color: theme === 'dark' ? '#ffffff' : 'inherit',
                '& fieldset': {
                  borderColor: theme === 'dark' ? '#ffffff55' : 'inherit'
                },
                '&:hover fieldset': {
                  borderColor: theme === 'dark' ? '#bbbbbb' : 'inherit'
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme === 'dark' ? '#ffffff' : 'inherit'
                }
              }
            }}
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
          {imageFile && <Typography variant="body2" sx={{ color: theme === 'dark' ? '#f3f1f1ff' : 'text.secondary' }}>{imageFile.name}</Typography>}
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