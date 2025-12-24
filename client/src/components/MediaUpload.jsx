import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  LinearProgress,
  TextField,
  Alert,
  Chip
} from '@mui/material';
import {
  CloudUpload,
  Close,
  Image,
  VideoFile,
  AudioFile,
  Description,
  Send,
  Delete,
  Warning
} from '@mui/icons-material';
import { api } from '../context/AuthContext';

function MediaUpload({ onMediaUploaded, onClose }) {
  const [uploadState, setUploadState] = useState('selection'); // selection | preview | uploading
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  // 🔥 FIX: Enhanced file type validation with better coverage
  const allowedTypes = {
    image: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'
    ],
    video: [
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv',
      'video/webm', 'video/ogg', 'video/avi', 'video/mov'
    ],
    audio: [
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-wav'
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ]
  };

  // 🔥 FIX: File size limits (10MB for images, 50MB for videos, 25MB for others)
  const maxFileSizes = {
    image: 10 * 1024 * 1024, // 10MB
    video: 50 * 1024 * 1024, // 50MB
    audio: 25 * 1024 * 1024, // 25MB
    document: 25 * 1024 * 1024, // 25MB
    file: 25 * 1024 * 1024 // 25MB default
  };

  const getFileType = (type) => {
    if (allowedTypes.image.includes(type)) return 'image';
    if (allowedTypes.video.includes(type)) return 'video';
    if (allowedTypes.audio.includes(type)) return 'audio';
    if (allowedTypes.document.includes(type)) return 'file'; // 🔥 FIX: Return 'file' instead of 'document'
    return 'file';
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image />;
    if (type.startsWith('video/')) return <VideoFile />;
    if (type.startsWith('audio/')) return <AudioFile />;
    return <Description />;
  };

  const formatFileSize = (bytes) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const validateFile = (file) => {
    const fileType = getFileType(file.type);
    const maxSize = maxFileSizes[fileType] || maxFileSizes.file;

    // Check file type
    const allAllowedTypes = Object.values(allowedTypes).flat();
    if (!allAllowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Supported types: images, videos, audio, and documents.`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size for ${fileType} files is ${formatFileSize(maxSize)}.`
      };
    }

    return { valid: true };
  };

  const handleFileSelect = (files) => {
    if (!files || !files.length) return;

    setError('');
    const file = files[0];
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    const fileType = getFileType(file.type);

    // Generate preview for images and videos
    if (fileType === 'image' || fileType === 'video') {
      try {
        const previewUrl = URL.createObjectURL(file);
        setFilePreviewUrl(previewUrl);
      } catch (err) {
        console.error('Error creating preview URL:', err);
        setError('Failed to generate file preview');
        return;
      }
    }

    setSelectedFile(file);
    setUploadState('preview');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleCancel = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setSelectedFile(null);
    setCaption('');
    setError('');
    setUploadState('selection');
  };

  const handleSend = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadState('uploading');
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const percent = Math.round((e.loaded * 100) / e.total);
            setProgress(percent);
          }
        }
      });

      const mediaData = {
        ...res.data,
        messageType: getFileType(selectedFile.type),
        caption: caption.trim(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size
      };

      // IMPORTANT: send data first, then close modal
      onMediaUploaded(mediaData);
      onClose();

    } catch (err) {
      console.error('Upload failed:', err);
      const errorMessage = err.response?.data?.msg || err.message || 'Upload failed. Please try again.';
      setError(errorMessage);
      setUploadState('preview');
    } finally {
      setIsUploading(false);
    }
  };

  const allAllowedTypes = Object.values(allowedTypes).flat();

  return (
    <Paper
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000
      }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <Paper sx={{ 
        width: 500, 
        maxHeight: '90vh', 
        overflow: 'auto',
        border: dragActive ? '2px dashed' : 'none',
        borderColor: dragActive ? 'primary.main' : 'transparent'
      }}>
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {uploadState === 'selection' && 'Select File'}
            {uploadState === 'preview' && 'Preview'}
            {uploadState === 'uploading' && 'Uploading...'}
          </Typography>
          <IconButton onClick={onClose} disabled={isUploading}>
            <Close />
          </IconButton>
        </Box>

        {error && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Selection */}
        {uploadState === 'selection' && (
          <Box 
            sx={{ 
              p: 3, 
              textAlign: 'center',
              border: dragActive ? '2px dashed' : 'none',
              borderColor: 'primary.main',
              bgcolor: dragActive ? 'action.hover' : 'transparent'
            }}
          >
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {dragActive ? 'Drop your file here' : 'Select a file to upload'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Supports: Images (10MB), Videos (50MB), Audio (25MB), Documents (25MB)
            </Typography>

            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept={allAllowedTypes.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => fileInputRef.current.click()}
              sx={{ mt: 1 }}
            >
              Browse Files
            </Button>

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Or drag and drop files here
              </Typography>
            </Box>
          </Box>
        )}

        {/* Preview */}
        {uploadState === 'preview' && selectedFile && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 2, maxHeight: 300, overflow: 'hidden' }}>
              {filePreviewUrl ? (
                selectedFile.type.startsWith('video/') ? (
                  <video 
                    src={filePreviewUrl} 
                    controls 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: 300, 
                      borderRadius: 8 
                    }} 
                  />
                ) : (
                  <img 
                    src={filePreviewUrl} 
                    alt="preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: 300, 
                      borderRadius: 8,
                      objectFit: 'contain'
                    }} 
                  />
                )
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  py: 4,
                  bgcolor: 'grey.100',
                  borderRadius: 2
                }}>
                  {getFileIcon(selectedFile.type)}
                  <Typography variant="caption" sx={{ mt: 1 }}>
                    {selectedFile.type}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {selectedFile.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                <Chip 
                  label={getFileType(selectedFile.type)} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              sx={{ mb: 2 }}
              disabled={isUploading}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                startIcon={<Delete />} 
                onClick={handleCancel} 
                fullWidth
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                startIcon={<Send />}
                variant="contained"
                onClick={handleSend}
                fullWidth
                disabled={isUploading || !selectedFile}
              >
                Send
              </Button>
            </Box>
          </Box>
        )}

        {/* Uploading */}
        {uploadState === 'uploading' && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Uploading {selectedFile?.name}...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ mb: 2, height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary">
              {progress}% complete
            </Typography>
            {progress < 100 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Please don't close this window
              </Typography>
            )}
          </Box>
        )}
      </Paper>
    </Paper>
  );
}

export default MediaUpload;
