import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  LinearProgress,
  Button,
  Fab,
  Alert
} from '@mui/material';
import { 
  Mic, 
  Delete, 
  Stop, 
  PlayArrow, 
  Pause, 
  Send,
  Check,
  Refresh
} from '@mui/icons-material';
import { api } from '../context/AuthContext';

function VoiceRecorder({ onVoiceRecorded, onCancel }) {
  const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'recording', 'preview', 'uploading'
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);
  const [detectedMimeType, setDetectedMimeType] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const playbackTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      // Comprehensive cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      
      streamRef.current = stream;
      
      // Determine the best supported format
      const formats = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      
      let mimeType = '';
      for (const format of formats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }
      
      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      setDetectedMimeType(mimeType);

      // 🔥 FIX: Use detected mimeType in MediaRecorder constructor
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setRecordingState('preview');
        } catch (err) {
          console.error('Error creating audio blob:', err);
          setError('Failed to process recording');
          cancelRecording();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording failed. Please try again.');
        stopRecording();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone. Please check permissions.');
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        setRecordingState('preview');

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (err) {
        console.error('Error stopping recording:', err);
        setError('Error stopping recording');
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
        }
      } else {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            
            // Update playback progress
            playbackTimerRef.current = setInterval(() => {
              if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
                // Progress tracking can be added here if needed
              }
            }, 100);
          })
          .catch(err => {
            console.error('Audio playback failed:', err);
            setError('Audio playback failed');
            setIsPlaying(false);
          });
      }
    }
  };

  const cancelRecording = () => {
    // Comprehensive cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setAudioDuration(0);
    setIsPlaying(false);
    setError('');
    setRecordingState('idle');
    setDetectedMimeType('');
    
    if (onCancel) onCancel();
  };

  const sendRecording = async () => {
    if (!audioBlob) return;

    // Prevent multiple simultaneous uploads
    if (recordingState === 'uploading') return;

    setRecordingState('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      // 🔥 FIX: Use detected mimeType for file extension
      const extension = detectedMimeType.includes('webm') ? 'webm' : 
                      detectedMimeType.includes('mp4') ? 'mp4' :
                      detectedMimeType.includes('ogg') ? 'ogg' : 'wav';
      
      const voiceFile = new File([audioBlob], `voice_${Date.now()}.${extension}`, { type: detectedMimeType });
      formData.append('file', voiceFile);

      const response = await api.post('/messages/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      const voiceData = {
        ...response.data,
        messageType: 'audio',
        duration: recordingTime,
        mimeType: detectedMimeType
      };

      // 🔥 FIX: Ensure cleanup happens only once and properly
      cleanup();
      if (onVoiceRecorded) onVoiceRecorded(voiceData);
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Upload failed. Please try again.');
      setRecordingState('preview');
    }
  };

  const cleanup = () => {
    // Comprehensive cleanup function
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setAudioDuration(0);
    setIsPlaying(false);
    setUploadProgress(0);
    setError('');
    setRecordingState('idle');
    setDetectedMimeType('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'var(--background-card)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        p: 3,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        zIndex: 1000,
        minHeight: recordingState === 'preview' ? 200 : recordingState === 'idle' ? 120 : 150
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => {
          setIsPlaying(false);
          if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setAudioDuration(audioRef.current.duration);
          }
        }}
        onError={() => {
          setError('Audio playback failed');
          setIsPlaying(false);
        }}
      />

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton size="small" onClick={() => setError('')}>
              <Refresh fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* Idle State */}
      {recordingState === 'idle' && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Tap to start recording
          </Typography>
          
          {/* Start Recording Button */}
          <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
            <Fab
              color="primary"
              sx={{
                width: 80,
                height: 80,
                '&:hover': {
                  transform: 'scale(1.05)',
                },
                transition: 'transform 0.2s ease'
              }}
              onClick={startRecording}
            >
              <Mic sx={{ fontSize: 32 }} />
            </Fab>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Tap to start recording
          </Typography>
        </Box>
      )}

      {/* Recording State */}
      {recordingState === 'recording' && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="error.main" sx={{ mb: 2 }}>
            Tap to stop recording
          </Typography>
          
          {/* Animated Mic Button */}
          <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
            <Fab
              color="error"
              sx={{
                width: 80,
                height: 80,
                animation: 'pulse 1.5s infinite',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    opacity: 0.8,
                  },
                  '100%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                },
              }}
              onClick={stopRecording}
            >
              <Stop sx={{ fontSize: 32 }} />
            </Fab>
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 500, color: 'error.main' }}>
            {formatTime(recordingTime)}
          </Typography>
        </Box>
      )}

      {/* Preview State */}
      {recordingState === 'preview' && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Tap to listen and send
          </Typography>

          {/* Audio Player Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
            <IconButton
              onClick={cancelRecording}
              sx={{ 
                bgcolor: 'grey.200', 
                '&:hover': { bgcolor: 'grey.300' } 
              }}
            >
              <Delete />
            </IconButton>

            <IconButton
              onClick={playAudio}
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                width: 64,
                height: 64,
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              {isPlaying ? <Pause sx={{ fontSize: 32 }} /> : <PlayArrow sx={{ fontSize: 32 }} />}
            </IconButton>

            <IconButton
              onClick={sendRecording}
              sx={{ 
                bgcolor: 'success.main', 
                color: 'white',
                '&:hover': { bgcolor: 'success.dark' }
              }}
            >
              <Send />
            </IconButton>
          </Box>

          {/* Duration */}
          <Typography variant="body2" color="text.secondary">
            Duration: {formatTime(recordingTime)}
            {audioDuration && Math.abs(audioDuration - recordingTime) > 2 && ` (${formatTime(Math.round(audioDuration))})`}
          </Typography>
        </Box>
      )}

      {/* Uploading State */}
      {recordingState === 'uploading' && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sending voice message...
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            sx={{ 
              width: '100%',
              maxWidth: 300,
              mx: 'auto',
              mb: 2,
              height: 6,
              borderRadius: 3
            }} 
          />
          <Typography variant="body2" color="text.secondary">
            {uploadProgress}%
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default VoiceRecorder;
