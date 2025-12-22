import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Avatar,
  Dialog,
  DialogContent
} from '@mui/material';
import {
  Call,
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  VolumeUp,
  VolumeOff
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';

function CallingUI({ isOpen, onClose, callType, recipient, onCallInitiated }) {
  const { user, socket } = useContext(AuthContext);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen && callType) {
      initializeCall();
    }

    return () => {
      cleanupCall();
    };
  }, [isOpen, callType]);

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected]);

  const initializeCall = async () => {
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: 640, height: 480 } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = pc;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            recipientId: recipient._id
          });
        }
      };

      // Initiate call
      if (onCallInitiated) {
        onCallInitiated();
      }

      // For demo purposes, simulate connection after 2 seconds
      setTimeout(() => {
        setIsConnected(true);
      }, 2000);

    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to access camera/microphone. Please check permissions.');
      onClose();
    }
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setRemoteStream(null);
    setIsConnected(false);
    setCallDuration(0);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerOff;
      setIsSpeakerOff(!isSpeakerOff);
    }
  };

  const endCall = () => {
    cleanupCall();
    onClose();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={endCall}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'black', color: 'white' }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Remote Video */}
        <Box sx={{ position: 'relative', height: '70vh', bgcolor: 'black' }}>
          {remoteStream && callType === 'video' ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Avatar
                sx={{ width: 120, height: 120, mb: 2 }}
                src={recipient?.avatar}
              >
                {recipient?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {recipient?.name}
              </Typography>
              <Typography variant="body1" color="grey.400">
                {isConnected ? formatDuration(callDuration) : 'Calling...'}
              </Typography>
            </Box>
          )}

          {/* Local Video (Picture-in-Picture) */}
          {localStream && callType === 'video' && !isVideoOff && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 120,
                height: 90,
                borderRadius: 1,
                overflow: 'hidden',
                border: '2px solid white'
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </Box>
          )}
        </Box>

        {/* Call Controls */}
        <Box
          sx={{
            p: 3,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2
          }}
        >
          <IconButton
            onClick={toggleMute}
            sx={{
              bgcolor: isMuted ? 'error.main' : 'grey.700',
              color: 'white',
              '&:hover': { bgcolor: isMuted ? 'error.dark' : 'grey.600' }
            }}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>

          {callType === 'video' && (
            <IconButton
              onClick={toggleVideo}
              sx={{
                bgcolor: isVideoOff ? 'error.main' : 'grey.700',
                color: 'white',
                '&:hover': { bgcolor: isVideoOff ? 'error.dark' : 'grey.600' }
              }}
            >
              {isVideoOff ? <VideocamOff /> : <Videocam />}
            </IconButton>
          )}

          <IconButton
            onClick={toggleSpeaker}
            sx={{
              bgcolor: isSpeakerOff ? 'error.main' : 'grey.700',
              color: 'white',
              '&:hover': { bgcolor: isSpeakerOff ? 'error.dark' : 'grey.600' }
            }}
          >
            {isSpeakerOff ? <VolumeOff /> : <VolumeUp />}
          </IconButton>

          <IconButton
            onClick={endCall}
            sx={{
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': { bgcolor: 'error.dark' }
            }}
          >
            <CallEnd />
          </IconButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default CallingUI;
