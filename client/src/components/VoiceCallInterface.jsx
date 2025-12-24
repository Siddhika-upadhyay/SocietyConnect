
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Modal, IconButton, Avatar, Alert } from '@mui/material';
import { Phone, PhoneDisabled, Call } from '@mui/icons-material';
import SimplePeer from 'simple-peer';

const VoiceCallInterface = ({ socket, currentUser, otherUser }) => {
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState('');
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [callActive, setCallActive] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [isRinging, setIsRinging] = useState(false);
  const [missedCallTimeout, setMissedCallTimeout] = useState(null);

  const audioRef = useRef();
  const connectionRef = useRef();
  const timerRef = useRef();
  const ringtoneRef = useRef(null);

    // 🔥 ENHANCEMENT: Call timeout and missed call handling
    useEffect(() => {
        if (receivingCall && !callAccepted && !callEnded) {
            // Set 30-second timeout for missed calls
            const timeout = setTimeout(() => {
                console.log('Call timed out - marking as missed call');
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
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5);
            
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
                
                newOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                newOscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5);
                
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
            console.log('Received incoming call:', data);
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
            setError('');
            setIsRinging(true);
            playRingtone();
        };

        const handleCallEnded = () => {
            console.log('Call ended by remote user');
            handleCallEnd();
        };

        const handleCallAccepted = (signal) => {
            console.log('Call accepted, processing signal');
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

    // 🔥 FIX: Separate call cleanup function
    const handleCallEnd = () => {
        console.log('Cleaning up call resources');
        
        // Clear timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

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
        }

        // Reset state
        setCallAccepted(false);
        setCallEnded(true);
        setCallActive(false);
        setReceivingCall(false);
        setCallDuration(0);
        setIsInitializing(false);
        setCallStartTime(null);
        setIsRinging(false);
    };

    // 🔥 ENHANCEMENT: Call duration timer
    useEffect(() => {
        if (callAccepted && !callEnded) {
            setCallStartTime(Date.now());
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callAccepted, callEnded]);

    // 🔥 ENHANCEMENT: Missed call handling
    const handleMissedCall = async () => {
        try {
            console.log('Recording missed call');
            
            // Send missed call notification to the caller
            const missedCallData = {
                type: 'missed_call',
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
                content: `Missed call from ${currentUser.name}`,
                messageType: 'missed_call',
                timestamp: new Date().toISOString()
            };

            await api.post('/messages', messageData);
            
            // Emit custom event to notify other components
            window.dispatchEvent(new CustomEvent('newMessageReceived', {
                detail: {
                    ...messageData,
                    sender: { _id: currentUser.id, name: currentUser.name },
                    isMissedCall: true
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
            console.error('Error handling missed call:', error);
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
                video: false
            };

            const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(currentStream);
            setIsInitializing(false);
            return currentStream;
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError('Could not access microphone. Please check your permissions.');
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
            setCallDuration(0);

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
                console.log('Sending call signal');
                socket.emit('callUser', {
                    userToCall: otherUser._id,
                    signalData: data,
                    fromUser: currentUser.id,
                    name: currentUser.name
                });
            });

            peer.on('stream', (remoteStream) => {
                console.log('Received remote audio stream');
                if (audioRef.current) {
                    audioRef.current.srcObject = remoteStream;
                    audioRef.current.play()
                        .then(() => console.log('Audio playback started'))
                        .catch(e => console.log('Audio play error:', e));
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
            console.error('Error initiating call:', err);
            setError('Failed to start call');
            handleCallEnd();
        }
    };

    const answerCall = async () => {
        try {
            const currentStream = await startLocalStream();
            if (!currentStream) return;

            setCallAccepted(true);
            setCallActive(true);
            setCallDuration(0);

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
                console.log('Sending call answer');
                socket.emit('answerCall', { signal: data, to: caller });
            });

            peer.on('stream', (remoteStream) => {
                console.log('Received remote audio stream');
                if (audioRef.current) {
                    audioRef.current.srcObject = remoteStream;
                    audioRef.current.play()
                        .then(() => console.log('Audio playback started'))
                        .catch(e => console.log('Audio play error:', e));
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
            console.error('Error answering call:', err);
            setError('Failed to answer call');
            handleCallEnd();
        }
    };

    const leaveCall = async () => {
        console.log('User ended call');
        
        // Log call duration if call was accepted
        if (callAccepted && callStartTime) {
            const actualDuration = Math.floor((Date.now() - callStartTime) / 1000);
            console.log(`Call duration: ${formatDuration(actualDuration)}`);
            
            try {
                // Log the completed call
                const callLogData = {
                    receiver: otherUser._id,
                    content: `Call ended - Duration: ${formatDuration(actualDuration)}`,
                    messageType: 'call_log',
                    callDuration: actualDuration,
                    timestamp: new Date().toISOString()
                };

                await api.post('/messages', callLogData);
                
                // Emit custom event to notify other components
                window.dispatchEvent(new CustomEvent('newMessageReceived', {
                    detail: {
                        ...callLogData,
                        sender: { _id: currentUser.id, name: currentUser.name },
                        isCallLog: true,
                        duration: actualDuration
                    }
                }));
            } catch (error) {
                console.error('Error logging call duration:', error);
            }
        }
        
        // Notify other user
        if (socket && (callAccepted || receivingCall)) {
            socket.emit('endCall', { to: callAccepted ? otherUser._id : caller });
        }

        handleCallEnd();
    };

    const declineCall = () => {
        console.log('User declined call');
        
        // Record missed call for the caller
        handleMissedCall();
        
        // Stop ringtone
        stopRingtone();
        
        setReceivingCall(false);
        setCaller('');
        setCallerSignal(null);
        setError('');
    };

    return (
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {/* Hidden audio element for remote audio */}
            <audio ref={audioRef} autoPlay />

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
                    startIcon={<Call />}
                    onClick={callUser}
                    disabled={isInitializing}
                >
                    {isInitializing ? 'Connecting...' : 'Voice Call'}
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
                            <Call sx={{ fontSize: 30 }} />
                        </Avatar>
                    </Box>
                    <Typography variant="h6" gutterBottom>Incoming Voice Call</Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        {otherUser?.name || 'Someone'} is calling you...
                    </Typography>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-around' }}>
                        <IconButton
                            onClick={answerCall}
                            sx={{
                                bgcolor: 'success.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'success.dark' },
                                width: 56,
                                height: 56
                            }}
                        >
                            <Call />
                        </IconButton>
                        <IconButton
                            onClick={declineCall}
                            sx={{
                                bgcolor: 'error.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.dark' },
                                width: 56,
                                height: 56
                            }}
                        >
                            <PhoneDisabled />
                        </IconButton>
                    </Box>
                </Box>
            </Modal>

            {/* Active Call Modal */}
            <Modal open={callActive} onClose={() => { }}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 320, bgcolor: '#1a1a1a', boxShadow: 24, p: 4, borderRadius: 3,
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                    {/* User Avatar */}
                    <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: 'primary.main' }}>
                        {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>

                    {/* User Name */}
                    <Typography variant="h6" color="white" gutterBottom>
                        {otherUser?.name || 'Unknown User'}
                    </Typography>

                    {/* Call Status */}
                    <Typography variant="body2" color="grey.400" sx={{ mb: 3 }}>
                        {callAccepted && !callEnded ? formatDuration(callDuration) : 
                         receivingCall && isRinging ? 'Incoming call...' : 'Calling...'}
                    </Typography>

                    {/* Call animation indicator */}
                    {(callAccepted && !callEnded) || (receivingCall && isRinging) ? (
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 3 }}>
                            {[0, 1, 2].map((i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        bgcolor: receivingCall && isRinging ? 'warning.main' : 'success.main',
                                        borderRadius: '50%',
                                        animation: 'pulse 1.5s ease-in-out infinite',
                                        animationDelay: `${i * 0.2}s`,
                                        '@keyframes pulse': {
                                            '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
                                            '50%': { opacity: 1, transform: 'scale(1.2)' }
                                        }
                                    }}
                                />
                            ))}
                        </Box>
                    ) : null}

                    {/* End Call Button */}
                    <IconButton
                        onClick={leaveCall}
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                            width: 64,
                            height: 64
                        }}
                    >
                        <PhoneDisabled sx={{ fontSize: 28 }} />
                    </IconButton>
                </Box>
            </Modal>
        </Box>
    );
};

export default VoiceCallInterface;
