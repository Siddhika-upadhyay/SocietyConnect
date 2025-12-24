
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Modal, IconButton, Avatar, Alert } from '@mui/material';
import { Phone, PhoneDisabled, Videocam } from '@mui/icons-material';
import SimplePeer from 'simple-peer';

const VideoCallInterface = ({ socket, currentUser, otherUser }) => {
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState('');
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [callActive, setCallActive] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callTimer, setCallTimer] = useState(null);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [isRinging, setIsRinging] = useState(false);
  const [missedCallTimeout, setMissedCallTimeout] = useState(null);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const ringtoneRef = useRef(null);

    // 🔥 ENHANCEMENT: Call timeout and missed call handling
    useEffect(() => {
        if (receivingCall && !callAccepted && !callEnded) {
            // Set 30-second timeout for missed calls
            const timeout = setTimeout(() => {
                console.log('Video call timed out - marking as missed call');
                handleMissedCall();
            }, 30000);
            
            setMissedCallTimeout(timeout);
        }
        
        return () => {
            if (missedCallTimeout) {
                clearTimeout(missedCallTimeout);
                setMissedCallTimeout(null);
            }
        };
    }, [receivingCall, callAccepted, callEnded]);

    // 🔥 ENHANCEMENT: Ringtone management
    const playRingtone = () => {
        try {
            // Create a simple ringtone using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 1);
            
            // Repeat the ringtone
            const interval = setInterval(() => {
                if (!receivingCall || callAccepted || callEnded) {
                    clearInterval(interval);
                    return;
                }
                
                const newOscillator = audioContext.createOscillator();
                const newGainNode = audioContext.createGain();
                
                newOscillator.connect(newGainNode);
                newGainNode.connect(audioContext.destination);
                
                newOscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
                newOscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.5);
                
                newGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                newGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
                
                newOscillator.start();
                newOscillator.stop(audioContext.currentTime + 1);
            }, 2000);
            
            ringtoneRef.current = interval;
        } catch (error) {
            console.error('Error playing ringtone:', error);
        }
    };

    const stopRingtone = () => {
        if (ringtoneRef.current) {
            clearInterval(ringtoneRef.current);
            ringtoneRef.current = null;
        }
    };

    useEffect(() => {
        if (!socket) return;

        // 🔥 FIX: Proper socket event cleanup and listener management
        const handleCallUser = (data) => {
            console.log('Received incoming video call:', data);
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
            setError('');
            setIsRinging(true);
            playRingtone();
        };

        const handleCallEnded = () => {
            console.log('Video call ended by remote user');
            handleCallEnd();
        };

        const handleCallAccepted = (signal) => {
            console.log('Video call accepted, processing signal');
            setCallAccepted(true);
            setIsRinging(false);
            stopRingtone();
            if (connectionRef.current) {
                connectionRef.current.signal(signal);
            }
        };

        socket.on('callUser', handleCallUser);
        socket.on('callEnded', handleCallEnded);
        socket.on('callAccepted', handleCallAccepted);

        return () => {
            socket.off('callUser', handleCallUser);
            socket.off('callEnded', handleCallEnded);
            socket.off('callAccepted', handleCallAccepted);
            stopRingtone();
        };
    }, [socket]);

    // 🔥 FIX: Comprehensive call cleanup function
    const handleCallEnd = () => {
        console.log('Cleaning up video call resources');
        
        // Clear missed call timeout
        if (missedCallTimeout) {
            clearTimeout(missedCallTimeout);
            setMissedCallTimeout(null);
        }

        // Stop ringtone
        stopRingtone();

        // Destroy peer connection with proper cleanup
        if (connectionRef.current) {
            try {
                // Remove all event listeners first
                connectionRef.current.removeAllListeners();
                
                // Destroy the peer connection
                if (typeof connectionRef.current.destroy === 'function') {
                    connectionRef.current.destroy();
                }
                
                // Additional cleanup for browser compatibility
                if (connectionRef.current._pc) {
                    connectionRef.current._pc.close();
                }
                
            } catch (err) {
                console.error('Error destroying peer connection:', err);
            }
            connectionRef.current = null;
        }

        // Stop local stream
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            setStream(null);
            setLocalStream(null);
        }

        // Clear video elements
        if (myVideo.current) {
            myVideo.current.srcObject = null;
        }
        if (userVideo.current) {
            userVideo.current.srcObject = null;
        }

        // Clear call timer
        if (callTimer) {
            clearInterval(callTimer);
            setCallTimer(null);
        }

        // Reset state
        setCallAccepted(false);
        setCallEnded(true);
        setCallActive(false);
        setReceivingCall(false);
        setIsInitializing(false);
        setCallStartTime(null);
        setIsRinging(false);
        setCallDuration(0);
    };

    // 🔥 ENHANCEMENT: Call duration timer for video calls
    useEffect(() => {
        if (callAccepted && !callEnded) {
            setCallStartTime(Date.now());
            const timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
            setCallTimer(timer);
            
            return () => {
                clearInterval(timer);
                setCallTimer(null);
            };
        }
    }, [callAccepted, callEnded]);

    // 🔥 ENHANCEMENT: Missed call handling for video calls
    const handleMissedCall = async () => {
        try {
            console.log('Recording missed video call');
            
            // Send missed call notification to the caller
            const missedCallData = {
                type: 'missed_video_call',
                from: currentUser.id,
                to: otherUser._id,
                timestamp: new Date().toISOString(),
                duration: 0
            };

            // Notify server about missed call
            if (socket) {
                socket.emit('missedCall', missedCallData);
            }

            // Create a missed call message
            const messageData = {
                receiver: otherUser._id,
                content: `Missed video call from ${currentUser.name}`,
                messageType: 'missed_video_call',
                timestamp: new Date().toISOString()
            };

            await api.post('/messages', messageData);
            
            // Emit custom event to notify other components
            window.dispatchEvent(new CustomEvent('newMessageReceived', {
                detail: {
                    ...messageData,
                    sender: { _id: currentUser.id, name: currentUser.name },
                    isMissedVideoCall: true
                }
            }));

            // Stop ringtone and reset state
            stopRingtone();
            setReceivingCall(false);
            setIsRinging(false);
            
            if (missedCallTimeout) {
                clearTimeout(missedCallTimeout);
                setMissedCallTimeout(null);
            }
        } catch (error) {
            console.error('Error handling missed video call:', error);
        }
    };

    const startLocalStream = async () => {
        try {
            setError('');
            setIsInitializing(true);
            
            // 🔥 FIX: Better media constraints with fallbacks
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                },
                video: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    frameRate: { min: 15, ideal: 30, max: 30 }
                }
            };

            const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(currentStream);
            setLocalStream(currentStream);
            
            // Set local video
            if (myVideo.current) {
                myVideo.current.srcObject = currentStream;
                myVideo.current.play()
                    .then(() => console.log('Local video playing'))
                    .catch(e => console.log('Local video play error:', e));
            }
            
            setIsInitializing(false);
            return currentStream;
        } catch (err) {
            console.error("Error accessing media devices:", err);
            setError('Could not access camera/microphone. Please check your permissions.');
            setIsInitializing(false);
            return null;
        }
    };

    const callUser = async () => {
        try {
            const currentStream = await startLocalStream();
            if (!currentStream) return;

            setCallActive(true);
            setCallEnded(false);

            const peer = new SimplePeer({
                initiator: true,
                trickle: false,
                stream: currentStream,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            peer.on('signal', (data) => {
                console.log('Sending video call signal');
                socket.emit('callUser', {
                    userToCall: otherUser._id,
                    signalData: data,
                    fromUser: currentUser.id,
                    name: currentUser.name
                });
            });

            peer.on('stream', (remoteStream) => {
                console.log('Received remote video stream');
                if (userVideo.current) {
                    userVideo.current.srcObject = remoteStream;
                    userVideo.current.play()
                        .then(() => console.log('Remote video playing'))
                        .catch(e => console.log('Video play error:', e));
                }
            });

            peer.on('error', (err) => {
                console.error('Peer connection error:', err);
                setError('Connection error occurred');
                handleCallEnd();
            });

            peer.on('close', () => {
                console.log('Peer connection closed');
                handleCallEnd();
            });

            connectionRef.current = peer;

        } catch (err) {
            console.error('Error initiating video call:', err);
            setError('Failed to start video call');
            handleCallEnd();
        }
    };

    const answerCall = async () => {
        try {
            const currentStream = await startLocalStream();
            if (!currentStream) return;

            setCallAccepted(true);
            setCallActive(true);

            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: currentStream,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            peer.on('signal', (data) => {
                console.log('Sending video call answer');
                socket.emit('answerCall', { signal: data, to: caller });
            });

            peer.on('stream', (remoteStream) => {
                console.log('Received remote video stream');
                if (userVideo.current) {
                    userVideo.current.srcObject = remoteStream;
                    userVideo.current.play()
                        .then(() => console.log('Remote video playing'))
                        .catch(e => console.log('Video play error:', e));
                }
            });

            peer.on('error', (err) => {
                console.error('Peer connection error:', err);
                setError('Connection error occurred');
                handleCallEnd();
            });

            peer.on('close', () => {
                console.log('Peer connection closed');
                handleCallEnd();
            });

            peer.signal(callerSignal);
            connectionRef.current = peer;

        } catch (err) {
            console.error('Error answering video call:', err);
            setError('Failed to answer video call');
            handleCallEnd();
        }
    };

    const leaveCall = async () => {
        console.log('User ended video call');
        
        // Log call duration if call was accepted
        if (callAccepted && callStartTime) {
            const actualDuration = Math.floor((Date.now() - callStartTime) / 1000);
            console.log(`Video call duration: ${formatDuration(actualDuration)}`);
            
            try {
                // Log the completed call
                const callLogData = {
                    receiver: otherUser._id,
                    content: `Video call ended - Duration: ${formatDuration(actualDuration)}`,
                    messageType: 'video_call_log',
                    callDuration: actualDuration,
                    timestamp: new Date().toISOString()
                };

                await api.post('/messages', callLogData);
                
                // Emit custom event to notify other components
                window.dispatchEvent(new CustomEvent('newMessageReceived', {
                    detail: {
                        ...callLogData,
                        sender: { _id: currentUser.id, name: currentUser.name },
                        isVideoCallLog: true,
                        duration: actualDuration
                    }
                }));
            } catch (error) {
                console.error('Error logging video call duration:', error);
            }
        }
        
        // Notify other user
        if (socket && (callAccepted || receivingCall)) {
            socket.emit('endCall', { to: callAccepted ? otherUser._id : caller });
        }

        handleCallEnd();
    };

    const declineCall = () => {
        console.log('User declined video call');
        
        // Record missed call for the caller
        handleMissedCall();
        
        // Stop ringtone
        stopRingtone();
        
        setReceivingCall(false);
        setCaller('');
        setCallerSignal(null);
        setError('');
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {error && (
                <Alert 
                    severity="error" 
                    sx={{ mr: 2 }}
                    onClose={() => setError('')}
                >
                    {error}
                </Alert>
            )}

            {!callActive && !receivingCall && (
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Videocam />}
                    onClick={callUser}
                    disabled={isInitializing}
                >
                    {isInitializing ? 'Connecting...' : 'Video Call'}
                </Button>
            )}

            {/* Incoming Call Modal */}
            <Modal open={receivingCall && !callAccepted} onClose={() => {}}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 300, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2,
                    textAlign: 'center'
                }}>
                    <Box sx={{ mb: 2 }}>
                        <Avatar sx={{ width: 60, height: 60, margin: '0 auto', bgcolor: 'primary.main' }}>
                            <Videocam sx={{ fontSize: 30 }} />
                        </Avatar>
                    </Box>
                    <Typography variant="h6" gutterBottom>Incoming Video Call</Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        {otherUser?.name || 'Someone'} is calling you...
                    </Typography>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-around' }}>
                        <Button 
                            variant="contained" 
                            color="success" 
                            onClick={answerCall}
                            startIcon={<Videocam />}
                        >
                            Answer
                        </Button>
                        <Button 
                            variant="contained" 
                            color="error" 
                            onClick={declineCall}
                            startIcon={<PhoneDisabled />}
                        >
                            Decline
                        </Button>
                    </Box>
                </Box>
            </Modal>

            {/* Video Call Interface */}
            <Modal open={callActive} onClose={() => { }}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '90%', maxWidth: 800, bgcolor: '#1a1a1a', boxShadow: 24, p: 2, borderRadius: 2,
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                    <Box sx={{ display: 'flex', width: '100%', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                        {/* My Video */}
                        <Box sx={{ flex: 1, position: 'relative' }}>
                            <video
                                playsInline
                                muted
                                ref={myVideo}
                                autoPlay
                                style={{ 
                                    width: '100%', 
                                    borderRadius: '8px', 
                                    border: '2px solid #333',
                                    backgroundColor: '#000'
                                }}
                            />
                            <Typography sx={{ 
                                position: 'absolute', 
                                bottom: 8, 
                                left: 8, 
                                color: 'white', 
                                bgcolor: 'rgba(0,0,0,0.5)', 
                                px: 1, 
                                borderRadius: 1,
                                fontSize: '0.875rem'
                            }}>
                                You
                            </Typography>
                        </Box>

                        {/* User Video */}
                        <Box sx={{ flex: 1, position: 'relative' }}>
                            {callAccepted && !callEnded ? (
                                <video
                                    playsInline
                                    ref={userVideo}
                                    autoPlay
                                    style={{ 
                                        width: '100%', 
                                        borderRadius: '8px', 
                                        border: '2px solid #333',
                                        backgroundColor: '#000'
                                    }}
                                />
                            ) : (
                                <Box sx={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    minHeight: 200, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    bgcolor: '#333', 
                                    borderRadius: 2,
                                    flexDirection: 'column',
                                    gap: 2
                                }}>
                                    <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}>
                                        {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                                    </Avatar>
                                    <Typography color="white" variant="h6">
                                        {callAccepted ? 'Connecting...' : 'Calling...'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<PhoneDisabled />}
                        onClick={leaveCall}
                        size="large"
                    >
                        End Call
                    </Button>
                </Box>
            </Modal>
        </Box>
    );
};

export default VideoCallInterface;
