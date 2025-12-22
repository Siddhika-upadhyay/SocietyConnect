import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  IconButton, 
  LinearProgress,
  TextField,
  Avatar
} from '@mui/material';
import { 
  CloudUpload, 
  Close, 
  Image, 
  VideoFile, 
  AudioFile, 
  Description,
  Send,
  Delete
} from '@mui/icons-material';
import { api } from '../context/AuthContext';

function MediaUpload({ onMediaUploaded, onClose }) {
  const [uploadState, setUploadState] = useState('selection'); // 'selection', 'preview', 'uploading'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef(null);

  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/quicktime', 'video/avi'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image />;
    if (type.startsWith('video/')) return <VideoFile />;
    if (type.startsWith('audio/')) return <AudioFile />;
    return <Description />;
  };

  const getFileType = (type) => {
    if (allowedTypes.image.includes(type)) return 'image';
    if (allowedTypes.video.includes(type)) return 'video';
    if (allowedTypes.audio.includes(type)) return 'audio';
    if (allowedTypes.document.includes(type)) return 'document';
    return 'file';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileType = getFileType(file.type);

    if (!Object.values(allowedTypes).flat().includes(file.type)) {
      alert('Unsupported file type');
      return;
    }

    // Create preview URL for images and videos
    let previewUrl = null;
    if (fileType === 'image' || fileType === 'video') {
      previewUrl = URL.createObjectURL(file);
    }

    setSelectedFile(file);
    setFilePreviewUrl(previewUrl);
    setUploadState('preview');
  };

  const handleCancel = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setCaption('');
    setUploadState('selection');
  };

  const handleSend = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post('/messages/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });


      const mediaData = {
        ...response.data,
        messageType: 'file',
        caption: caption.trim()
      };

      onMediaUploaded(mediaData);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
      setUploadState('preview'); // Go back to preview on error
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        p: 2
      }}
    >
      <Paper
        sx={{
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="h6">
            {uploadState === 'selection' && 'Select File'}
            {uploadState === 'preview' && 'Preview'}
            {uploadState === 'uploading' && 'Uploading...'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Selection State */}
        {uploadState === 'selection' && (
          <Box sx={{ p: 3 }}>
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragOver ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag & drop files here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                or click to browse
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supports: Images, Videos, Audio, Documents (max 10MB)
              </Typography>
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={onClose}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {/* Preview State */}
        {uploadState === 'preview' && selectedFile && (
          <Box sx={{ p: 3 }}>
            {/* File Preview */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              {selectedFile.type.startsWith('image/') && filePreviewUrl && (
                <img
                  src={filePreviewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    borderRadius: 8,
                    objectFit: 'cover'
                  }}
                />
              )}
              
              {selectedFile.type.startsWith('video/') && filePreviewUrl && (
                <video
                  src={filePreviewUrl}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    borderRadius: 8
                  }}
                  controls
                />
              )}

              {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 2,
                    bgcolor: 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  {getFileIcon(selectedFile.type)}
                </Box>
              )}

              {/* File Info */}
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatFileSize(selectedFile.size)}
              </Typography>
            </Box>

            {/* Caption Field */}
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              sx={{ mb: 3 }}
            />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Delete />}
                onClick={handleCancel}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSend}
                sx={{ flex: 2 }}
              >
                Send
              </Button>
            </Box>
          </Box>
        )}

        {/* Uploading State */}
        {uploadState === 'uploading' && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Uploading file...
            </Typography>
            
            {selectedFile && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>
            )}

            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                width: '100%',
                height: 8,
                borderRadius: 4,
                mb: 2
              }} 
            />
            <Typography variant="body2" color="text.secondary">
              {progress}%
            </Typography>
          </Box>
        )}
      </Paper>
    </Paper>
  );
}

export default MediaUpload;
