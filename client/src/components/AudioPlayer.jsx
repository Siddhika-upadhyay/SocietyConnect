import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Typography, LinearProgress, Slider, Alert } from '@mui/material';
import { PlayArrow, Pause, Refresh } from '@mui/icons-material';

function AudioPlayer({ audioUrl, duration, isOwn = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const audioRef = useRef(null);

  /* -------------------- Load audio -------------------- */
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    setIsLoading(true);
    setHasError(false);
    setCurrentTime(0);

    audioRef.current.src = audioUrl;

    const onLoadedMetadata = () => {
      setAudioDuration(audioRef.current.duration || 0);
      setIsLoading(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audioRef.current.currentTime || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      setErrorMessage('Unable to play audio');
    };

    audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
    audioRef.current.addEventListener('timeupdate', onTimeUpdate);
    audioRef.current.addEventListener('ended', onEnded);
    audioRef.current.addEventListener('error', onError);

    return () => {
      audioRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
      audioRef.current?.removeEventListener('timeupdate', onTimeUpdate);
      audioRef.current?.removeEventListener('ended', onEnded);
      audioRef.current?.removeEventListener('error', onError);
    };
  }, [audioUrl]);

  /* -------------------- Play / Pause -------------------- */
  const togglePlayPause = async () => {
    if (!audioRef.current || hasError) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play(); // 🔑 KEY FIX
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Audio play failed:', err);
      setHasError(true);
      setErrorMessage('Playback failed');
    }
  };

  /* -------------------- Seek -------------------- */
  const handleSeek = (_, value) => {
    if (!audioRef.current || !audioDuration) return;
    const seekTime = (value / 100) * audioDuration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration ? (currentTime / audioDuration) * 100 : 0;
  const displayDuration = duration || audioDuration;

  /* -------------------- Error UI -------------------- */
  if (hasError) {
    return (
      <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'grey.200' }}>
        <Alert
          severity="error"
          action={
            <IconButton size="small" onClick={() => setHasError(false)}>
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
        gap: 1,
        p: 1.5,
        bgcolor: isOwn ? 'primary.light' : 'grey.100',
        borderRadius: 3,
        minWidth: 220,
        maxWidth: 320,
        position: 'relative'
      }}
    >
      <audio ref={audioRef} preload="metadata" />

      {/* Play / Pause */}
      <IconButton
        onClick={togglePlayPause}
        disabled={isLoading}
        sx={{
          bgcolor: isOwn ? 'primary.main' : 'grey.600',
          color: 'white',
          width: 40,
          height: 40,
          '&:hover': {
            bgcolor: isOwn ? 'primary.dark' : 'grey.700'
          }
        }}
      >
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>

      {/* Progress */}
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            borderRadius: 2,
            mb: 0.5,
            bgcolor: 'rgba(255,255,255,0.3)',
            '& .MuiLinearProgress-bar': {
              bgcolor: isOwn ? 'white' : 'grey.700'
            }
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">
            {formatTime(currentTime)}
          </Typography>
          <Typography variant="caption">
            {formatTime(displayDuration)}
          </Typography>
        </Box>
      </Box>

      {/* Seek Slider */}
      <Slider
        value={progress}
        onChange={handleSeek}
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer'
        }}
      />
    </Box>
  );
}

export default AudioPlayer;
