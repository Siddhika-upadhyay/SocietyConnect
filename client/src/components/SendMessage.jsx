import React, { useState, useContext, useEffect } from 'react';
import { Box, TextField, IconButton, Paper, Fab } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import { AuthContext, api } from '../context/AuthContext';
import MediaUpload from './MediaUpload';
import VoiceRecorder from './VoiceRecorder';

function SendMessage({ receiverId, onMessageSent }) {
  const { user, socket } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;

    try {
      const res = await api.post('/messages', {
        receiverId: receiverId, // 🔥 FIX: Use 'receiverId' instead of 'receiver'
        content: content.trim()
      });

      socket?.emit('sendMessage', {
        receiverId,
        content: res.data.content,
        senderId: user.id
      });

      onMessageSent(res.data);
      setContent('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Show user-friendly error message
      alert('Failed to send message. Please try again.');
    }
  };

  const handleMediaUploaded = (mediaData) => {
    if (!mediaData || !mediaData.mediaUrl) {
      console.error('Invalid media data received', mediaData);
      return;
    }

    try {
      const mediaMessage = {
        receiverId: receiverId, // 🔥 FIX: Use 'receiverId' instead of 'receiver'
        content: mediaData.caption || '',
        messageType: mediaData.messageType,
        mediaUrl: mediaData.mediaUrl,
        fileName: mediaData.fileName,
        fileSize: mediaData.size
      };

      api.post('/messages', mediaMessage).then((res) => {
        socket?.emit('sendMessage', {
          receiverId,
          messageType: res.data.messageType,
          mediaUrl: res.data.mediaUrl,
          senderId: user.id
        });
        onMessageSent(res.data);
      });
    } catch (error) {
      console.error('Error sending media message:', error);
      alert('Failed to send media message. Please try again.');
    }
  };

  const handleVoiceRecorded = (voiceData) => {
    try {
      const voiceMessage = {
        receiverId: receiverId, // 🔥 FIX: Use 'receiverId' instead of 'receiver'
        messageType: 'audio',
        mediaUrl: voiceData.mediaUrl,
        duration: voiceData.duration
      };

      api.post('/messages', voiceMessage).then((res) => {
        socket?.emit('sendMessage', {
          receiverId,
          messageType: 'audio',
          mediaUrl: res.data.mediaUrl,
          senderId: user.id
        });
        onMessageSent(res.data);
      });

      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message. Please try again.');
    }
  };

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => setShowMediaUpload(true)}>
            <AttachFileIcon />
          </IconButton>

          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message"
          />

          {content.trim() ? (
            <IconButton onClick={handleSend}>
              <SendIcon />
            </IconButton>
          ) : (
            <Fab size="small" onClick={() => setShowVoiceRecorder(true)}>
              <MicIcon />
            </Fab>
          )}
        </Box>
      </Paper>

      {showMediaUpload && (
        <MediaUpload
          onMediaUploaded={handleMediaUploaded}
          onClose={() => setShowMediaUpload(false)}
        />
      )}

      {showVoiceRecorder && (
        <VoiceRecorder
          onVoiceRecorded={handleVoiceRecorded}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}
    </>
  );
}

export default SendMessage;
