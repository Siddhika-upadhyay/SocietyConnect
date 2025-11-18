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

  // Mark messages as read
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (messages.length > 0 && user) {
        const unreadMessages = messages.filter(
          msg => msg.receiver && msg.receiver._id === user.id && !msg.read
        );

        if (unreadMessages.length > 0) {
          console.log('Marking messages as read:', unreadMessages.length);
          for (const message of unreadMessages) {
            try {
              await api.put(`/messages/${message._id}/read`);
            } catch (err) {
              console.error('Error marking message as read:', err);
            }
          }
        }
      }
    };

    // Add a small delay to ensure messages are rendered before marking as read
    const timeoutId = setTimeout(markMessagesAsRead, 1000);

    return () => clearTimeout(timeoutId);
  }, [messages, user]);

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
      {messages.map((message) => {
        const isMine = message.sender._id === user.id;

        return (
          <Box
            key={message._id}
            sx={{
              display: 'flex',
              justifyContent: isMine ? 'flex-end' : 'flex-start',
              mb: 1,
            }}
          >
            <Paper
              sx={{
                p: 1.5,
                maxWidth: '70%',
                bgcolor: isMine ? 'var(--primary)' : 'var(--background-card)',
                color: isMine
                  ? theme === 'light' ? 'black' : 'white'
                  : 'var(--text-primary)',
                borderRadius: 2,
              }}
            >
              <Typography variant="body1">{message.content}</Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  color: isMine
                    ? 'rgba(255,255,255,0.7)'
                    : 'var(--text-secondary)',
                }}
              >
                {new Date(message.timestamp).toLocaleTimeString()}
              </Typography>
            </Paper>
          </Box>
        );
      })}

      <div ref={messagesEndRef} />
    </Box>
  );
}

export default MessageList;
