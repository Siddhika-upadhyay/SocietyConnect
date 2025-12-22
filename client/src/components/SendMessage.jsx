import React, { useState, useContext, useEffect } from 'react';
import { Box, TextField, IconButton, Paper, Fab } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import { AuthContext, api } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import MediaUpload from './MediaUpload';
import VoiceRecorder from './VoiceRecorder';

function SendMessage({ receiverId, onMessageSent }) {
  const { user, socket } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [content, setContent] = useState('');
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let typingTimer;
    if (content && !isTyping) {
      setIsTyping(true);
      if (socket) {
        socket.emit('typing', { receiverId, isTyping: true });
      }
    }

    const handleStopTyping = () => {
      setIsTyping(false);
      if (socket) {
        socket.emit('typing', { receiverId, isTyping: false });
      }
    };

    if (content) {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(handleStopTyping, 1000);
    } else {
      handleStopTyping();
    }

    return () => clearTimeout(typingTimer);
  }, [content, socket, receiverId, isTyping]);

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


  const handleMediaUploaded = (mediaData) => {
    // Send media message
    const mediaMessage = {
      receiverId,
      content: mediaData.caption || '',
      messageType: mediaData.messageType,
      mediaUrl: mediaData.url,
      fileName: mediaData.fileName,
      fileSize: mediaData.size
    };

    api.post('/messages', mediaMessage).then((response) => {
      if (socket) {
        socket.emit('sendMessage', {
          receiverId,
          content: response.data.content,
          messageType: response.data.messageType,
          mediaUrl: response.data.mediaUrl,
          senderId: user.id
        });
      }
      onMessageSent(response.data);
    }).catch(err => console.error('Error sending media message:', err));
  };

  const handleVoiceCancel = () => {
    setShowVoiceRecorder(false);
  };

  const toggleVoiceRecording = () => {
    if (content.trim()) return; // Don't record if there's text
    setShowVoiceRecorder(!showVoiceRecorder);
  };


  // Voice recording handlers
  const handleVoiceRecorded = (voiceData) => {
    // Send voice message
    const voiceMessage = {
      receiverId,
      content: '',
      messageType: 'audio',
      mediaUrl: voiceData.url,
      duration: voiceData.duration
    };

    api.post('/messages', voiceMessage).then((response) => {
      if (socket) {
        socket.emit('sendMessage', {
          receiverId,
          content: '',
          messageType: 'audio',
          mediaUrl: response.data.mediaUrl,
          duration: response.data.duration,
          senderId: user.id
        });
      }
      onMessageSent(response.data);
    }).catch(err => console.error('Error sending voice message:', err));
    
    setShowVoiceRecorder(false);
  };

  return (
    <>
      <Paper sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider', 
        bgcolor: 'var(--background-card)',
        position: 'relative'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <IconButton
            sx={{ 
              color: 'var(--text-secondary)', 
              mb: 0.5,
              '&:hover': {
                bgcolor: 'var(--background-hover)'
              }
            }}
            onClick={() => setShowMediaUpload(true)}
          >
            <AttachFileIcon />
          </IconButton>
          
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{
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
          
          {/* WhatsApp-style Send/Mic Button */}
          {content.trim() ? (
            <IconButton
              sx={{ 
                color: 'white', 
                bgcolor: 'var(--primary)',
                mb: 0.5,
                '&:hover': {
                  bgcolor: 'var(--primary-dark)'
                },
                '&:active': {
                  transform: 'scale(0.95)'
                }
              }}
              onClick={handleSend}
            >
              <SendIcon />
            </IconButton>
          ) : (
            <Fab
              size="medium"
              sx={{
                bgcolor: 'var(--primary)',
                color: 'white',
                mb: 0.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                '&:hover': {
                  bgcolor: 'var(--primary-dark)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                },
                '&:active': {
                  transform: 'scale(0.95)'
                },
                transition: 'all 0.2s ease'
              }}
              onClick={toggleVoiceRecording}
            >
              <MicIcon />
            </Fab>
          )}
        </Box>
      </Paper>

      {showMediaUpload && (
        <MediaUpload
          onMediaUploaded={(data) => {
            handleMediaUploaded(data);
            setShowMediaUpload(false);
          }}
          onClose={() => setShowMediaUpload(false)}
        />
      )}

      {showVoiceRecorder && (
        <VoiceRecorder
          onVoiceRecorded={handleVoiceRecorded}
          onCancel={handleVoiceCancel}
        />
      )}
    </>
  );
}

export default SendMessage;
