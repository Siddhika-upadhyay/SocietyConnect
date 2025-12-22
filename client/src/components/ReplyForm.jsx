import React, { useState, useRef } from 'react';
import { Box, TextField, Button, IconButton } from '@mui/material';
import { Send, Cancel } from '@mui/icons-material';
import { api } from '../context/AuthContext';

function ReplyForm({ postId, parentId, onReplyAdded, onCancel, placeholder = "Write a reply..." }) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(`/posts/${postId}/comments`, {
        text: text.trim(),
        parentId
      });

      onReplyAdded(response.data);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      alert('Failed to add reply. Please try again.');
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
        mt: 2,
        pl: 3,
        borderLeft: '2px solid',
        borderColor: 'divider',
        position: 'relative'
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
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
        <IconButton
          type="button"
          size="small"
          onClick={onCancel}
          disabled={isSubmitting}
          sx={{ color: 'text.secondary' }}
        >
          <Cancel fontSize="small" />
        </IconButton>
        
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
          {isSubmitting ? 'Sending...' : 'Reply'}
        </Button>
      </Box>
    </Box>
  );
}

export default ReplyForm;
