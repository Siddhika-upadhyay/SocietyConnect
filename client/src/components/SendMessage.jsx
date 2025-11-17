import React, { useState, useContext } from 'react';
import { Box, TextField, IconButton, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { AuthContext, api } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

function SendMessage({ receiverId, onMessageSent }) {
  const { user, socket } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [content, setContent] = useState('');

  const handleSend = async () => {
    if (!content.trim()) return;

    try {
      const response = await api.post('/messages', {
        receiverId,
        content: content.trim()
      });

      const newMessage = response.data;

      // Emit via socket for real-time
      if (socket) {
        socket.emit('sendMessage', {
          receiverId,
          content: newMessage.content,
          senderId: user.id
        });
      }

      onMessageSent(newMessage);
      setContent('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'var(--background-card)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{
            mr: 1,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'var(--background)',
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
            '& .MuiInputBase-input::placeholder': {
              color: 'var(--text-secondary)',
            },
          }}
        />
        <IconButton
          sx={{ color: 'var(--primary)' }}
          onClick={handleSend}
          disabled={!content.trim()}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}

export default SendMessage;
