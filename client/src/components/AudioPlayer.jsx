import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Typography, LinearProgress, Slider, Alert, CircularProgress } from '@mui/material';
import { PlayArrow, Pause, Refresh, VolumeUp, VolumeOff } from '@mui/icons-material';

function AudioPlayer({ audioUrl, duration, isOwn = false, onPlayStateChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showProgress, setShowProgress] = useState(false);

  const audioRef = useRef(null);

  /* -------------------- Load audio -------------------- */
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    setIsLoading(true);
    setHasError(false);
    setCurrentTime(0);
    setIsPlaying(false);

    const audio = audioRef.current;
    audio.src = audioUrl;
    audio.preload = 'metadata';
    audio.volume = volume;

    const onLoadedMetadata = () => {
      console.log('Audio metadata loaded');
      setAudioDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => {
      console.log('Audio playback ended');
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      if (onPlayStateChange) onPlayStateChange(false);
    };

    const onCanPlay = () => {
      console.log('Audio can start playing');
      setIsLoading(false);
    };

    const onLoadStart = () => {
      console.log('Audio load started');
      setIsLoading(true);
    };

    const onError = (e) => {
      console.error('Audio error:', e);
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      setErrorMessage('Unable to load audio. Please try again.');
      if (onPlayStateChange) onPlayStateChange(false);
    };

    const onPlay = () => {
      console.log('Audio started playing');
      setIsPlaying(true);
      if (onPlayStateChange) onPlayStateChange(true);
    };

    const onPause = () => {
      console.log('Audio paused');
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
    };

    // Add all event listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('error', onError);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    // Cleanup function
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [audioUrl, volume, onPlayStateChange]);

  /* -------------------- Play / Pause -------------------- */
  const togglePlayPause = async () => {
    if (!audioRef.current || hasError) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // 🔥 FIX: Better error handling for play() promise
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      }
    } catch (err) {
      console.error('Audio play/pause failed:', err);
      setHasError(true);
      setErrorMessage('Playback failed. Please try again.');
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
    }
  };

  /* -------------------- Seek -------------------- */
  const handleSeek = (_, value) => {
    if (!audioRef.current || !audioDuration || isNaN(audioDuration)) return;
    const seekTime = (value / 100) * audioDuration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  /* -------------------- Volume Control -------------------- */
  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    audioRef.current.muted = newMutedState;
  };

  const handleVolumeChange = (_, newValue) => {
    const newVolume = newValue / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration && !isNaN(audioDuration) ? (currentTime / audioDuration) * 100 : 0;
  const displayDuration = duration && !isNaN(duration) ? duration : audioDuration;

  /* -------------------- Retry loading -------------------- */
  const retryLoad = () => {
    if (!audioRef.current || !audioUrl) return;
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    audioRef.current.load(); // Reload the audio
  };

  /* -------------------- Error UI -------------------- */
  if (hasError) {
    return (
      <Box 
        sx={{ 
          p: 2, 
          borderRadius: 2, 
          bgcolor: 'grey.100',
          border: '1px solid',
          borderColor: 'grey.300',
          maxWidth: 320
        }}
      >
        <Alert
          severity="error"
          action={
            <IconButton size="small" onClick={retryLoad}>
              <Refresh fontSize="small" />
            </IconButton>
          }
        >
          {errorMessage}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        bgcolor: isOwn ? 'primary.light' : 'grey.100',
        borderRadius: 3,
        minWidth: 250,
        maxWidth: 350,
        position: 'relative',
        border: '1px solid',
        borderColor: isOwn ? 'primary.main' : 'grey.300',
        '&:hover': {
          boxShadow: 1
        }
      }}
      onMouseEnter={() => setShowProgress(true)}
      onMouseLeave={() => setShowProgress(false)}
    >
      <audio ref={audioRef} preload="metadata" />

      {/* Play / Pause Button */}
      <IconButton
        onClick={togglePlayPause}
        disabled={isLoading}
        sx={{
          bgcolor: isOwn ? 'primary.main' : 'grey.600',
          color: 'white',
          width: 44,
          height: 44,
          '&:hover': {
            bgcolor: isOwn ? 'primary.dark' : 'grey.700',
            transform: 'scale(1.05)'
          },
          transition: 'all 0.2s ease',
          '&:disabled': {
            bgcolor: 'grey.400'
          }
        }}
      >
        {isLoading ? (
          <CircularProgress size={20} color="inherit" />
        ) : isPlaying ? (
          <Pause />
        ) : (
          <PlayArrow />
        )}
      </IconButton>

      {/* Progress and Time */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ position: 'relative' }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.3)',
              '& .MuiLinearProgress-bar': {
                bgcolor: isOwn ? 'white' : 'grey.700',
                borderRadius: 3
              }
            }}
          />
          {/* Hidden seek slider */}
          <Slider
            value={progress}
            onChange={handleSeek}
            disabled={!audioDuration || isLoading}
            sx={{
              position: 'absolute',
              top: -4,
              left: 0,
              right: 0,
              height: 14,
              opacity: showProgress ? 1 : 0,
              transition: 'opacity 0.2s ease',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                backgroundColor: isOwn ? 'white' : 'grey.700',
                '&:hover': {
                  boxShadow: '0px 0px 0px 8px rgba(0,0,0,0.16)'
                }
              },
              '& .MuiSlider-track': {
                backgroundColor: isOwn ? 'white' : 'grey.700',
              },
              '& .MuiSlider-rail': {
                backgroundColor: 'rgba(255,255,255,0.3)',
              }
            }}
          />
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 0.5,
          alignItems: 'center'
        }}>
          <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
            {formatTime(currentTime)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
            {formatTime(displayDuration)}
          </Typography>
        </Box>
      </Box>

      {/* Volume Control */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={toggleMute}
          sx={{ 
            color: isOwn ? 'primary.dark' : 'grey.600',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.04)'
            }
          }}
        >
          {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
        </IconButton>
        <Slider
          value={isMuted ? 0 : volume * 100}
          onChange={handleVolumeChange}
          sx={{
            width: 60,
            height: 4,
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
              backgroundColor: isOwn ? 'primary.main' : 'grey.600',
            },
            '& .MuiSlider-track': {
              backgroundColor: isOwn ? 'primary.main' : 'grey.600',
            },
            '& .MuiSlider-rail': {
              backgroundColor: 'rgba(0,0,0,0.2)',
            }
          }}
        />
      </Box>
    </Box>
  );
}

export default AudioPlayer;
