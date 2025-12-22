


import React, { useEffect, useRef, useContext } from 'react';
import { Box, Paper, Typography, Avatar, IconButton } from '@mui/material';
import { Download, Image, VideoFile, Description, OpenInNew } from '@mui/icons-material';
import { AuthContext, api } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import AudioPlayer from './AudioPlayer';

// FileMessage component to handle file viewing and downloading
function FileMessage({ message, isOwn }) {
  const getFileType = (fileName) => {
    if (!fileName) return 'unknown';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return 'audio';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'document';
    return 'file';
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = message.mediaUrl;
    link.download = message.fileName || 'file';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


 const handlePreview = () => {
  fetch(message.mediaUrl)
    .then((res) => {
      if (!res.ok) throw new Error('Preview blocked');
      window.open(message.mediaUrl, '_blank');
    })
    .catch(() => {
      console.warn('Preview failed, downloading instead');
      handleDownload();
    });
};


  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fileType = getFileType(message.fileName);
  const isPreviewable = fileType === 'image' || fileType === 'video' || fileType === 'pdf';

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1,
      minWidth: 200,
      maxWidth: 300
    }}>
      <Box sx={{ 
        width: 40, 
        height: 40, 
        borderRadius: 1, 
        bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'grey.200',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Description color={isOwn ? 'inherit' : 'primary'} />
      </Box>
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            wordBreak: 'break-all',
            fontWeight: 500,
            color: isOwn ? 'white' : 'inherit'
          }}
        >
          {message.fileName || 'File'}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: isOwn ? 'rgba(255,255,255,0.7)' : 'text.secondary' 
          }}
        >
          {formatFileSize(message.fileSize)}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {isPreviewable && (
          <IconButton
            size="small"
            onClick={handlePreview}
            sx={{ 
              color: isOwn ? 'white' : 'primary.main',
              bgcolor: isOwn ? 'rgba(255,255,255,0.1)' : 'transparent',
              '&:hover': {
                bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'action.hover'
              }
            }}
          >
            <OpenInNew fontSize="small" />
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={handleDownload}
          sx={{ 
            color: isOwn ? 'white' : 'primary.main',
            bgcolor: isOwn ? 'rgba(255,255,255,0.1)' : 'transparent',
            '&:hover': {
              bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'action.hover'
            }
          }}
        >
          <Download fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

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

    const timeoutId = setTimeout(markMessagesAsRead, 1000);

    return () => clearTimeout(timeoutId);
  }, [messages, user]);


  const renderMessageContent = (message) => {
    const isMine = message.sender._id === user.id;
    
    switch (message.messageType) {
      case 'image':
        return (
          <Box>
            <img
              src={message.mediaUrl}
              alt="Shared image"
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => window.open(message.mediaUrl, '_blank')}
            />
            {message.content && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {message.content}
              </Typography>
            )}
          </Box>
        );

      case 'video':
        return (
          <Box>
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                borderRadius: '8px'
              }}
            >
              <source src={message.mediaUrl} />
            </video>
            {message.content && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {message.content}
              </Typography>
            )}
          </Box>
        );


      case 'audio':
        return (
          <AudioPlayer 
            audioUrl={message.mediaUrl}
            duration={message.duration}
            isOwn={isMine}
          />
        );


      case 'file':
        return (
          <FileMessage message={message} isOwn={isMine} />
        );

      default:
        return (
          <Typography variant="body1">{message.content}</Typography>
        );
    }
  };

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
            <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '70%' }}>
              {!isMine && (
                <Avatar
                  sx={{ width: 32, height: 32, mr: 1, mt: 0.5 }}
                  src={message.sender.avatar}
                >
                  {message.sender.name?.charAt(0).toUpperCase()}
                </Avatar>
              )}
              <Paper
                sx={{
                  p: 1.5,
                  flex: 1,
                  bgcolor: isMine ? 'var(--primary)' : 'var(--background-card)',
                  color: isMine
                    ? theme === 'light' ? 'black' : 'white'
                    : 'var(--text-primary)',
                  borderRadius: 2,
                }}
              >
                {!isMine && (
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 0.5 }}>
                    {message.sender.name}
                  </Typography>
                )}
                {renderMessageContent(message)}
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
          </Box>
        );
      })}

      <div ref={messagesEndRef} />
    </Box>
  );
}

export default MessageList;
