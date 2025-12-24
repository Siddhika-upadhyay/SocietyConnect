import React, { useState, useRef } from 'react';
import { Box, TextField, Button } from '@mui/material';
import { Send } from '@mui/icons-material';
import { api } from '../context/AuthContext';

function ReplyForm({ postId, onCommentAdded, placeholder = "Write a comment..." }) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(`/posts/${postId}/comments`, {
        text: text.trim()
      });

      // Don't call onCommentAdded here - let socket event handle it to prevent duplicates
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        mt: 2
      }}
    >
      <TextField
        ref={textareaRef}
        multiline
        rows={1}
        fullWidth
        variant="outlined"
        size="small"
        value={text}
        onChange={handleTextChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={isSubmitting}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: 'background.paper'
          }
        }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button
          type="submit"
          variant="contained"
          size="small"
          startIcon={<Send fontSize="small" />}
          disabled={!text.trim() || isSubmitting}
          sx={{
            minWidth: 80,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '0.875rem'
          }}
        >
          {isSubmitting ? 'Posting...' : 'Comment'}
        </Button>
      </Box>
    </Box>
  );
}

export default ReplyForm;
