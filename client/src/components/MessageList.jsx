import React, { useEffect, useRef, useContext } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { AuthContext, api } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

function MessageList({ messages, currentUser }) {
  const messagesEndRef = useRef(null);
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (messages.length > 0 && user) {
        // Find unread messages from the other user
        const unreadMessages = messages.filter(msg =>
          msg.receiver._id === user.id && !msg.read
        );

        // Mark each unread message as read
        for (const message of unreadMessages) {
          try {
            await api.put(`/messages/${message._id}/read`);
          } catch (err) {
            console.error('Error marking message as read:', err);
          }
        }
      }
    };

    markMessagesAsRead();
  }, [messages, user]);

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
      {messages.map((message) => (
        <Box
          key={message._id}
          sx={{
            display: 'flex',
            justifyContent: message.sender._id === currentUser.id ? 'flex-end' : 'flex-start',
            mb: 1
          }}
        >
          <Paper
            sx={{
              p: 1.5,
              maxWidth: '70%',
             bgcolor: message.sender._id === currentUser.id
      ? 'var(--primary)'
      : 'var(--background-card)',
    color:
      message.sender._id === currentUser.id
        ? (theme === 'light' ? 'black' : 'white')
        : 'var(--text-primary)',
              borderRadius: 2
            }}
          >
            <Typography variant="body1" sx={{ color: 'inherit' }}>{message.content}</Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: message.sender._id === currentUser.id ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </Typography>
          </Paper>
        </Box>
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
}

export default MessageList;
