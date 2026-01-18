import React, { useState, useRef, useEffect } from 'react';
import { Video, MessageCircle, PhoneOff, Mic, MicOff, VideoOff, Copy, Check, Monitor } from 'lucide-react';
import Peer from 'peerjs';

const styles = {
  container: {
    minHeight: '100vh',
    background: '#111827',
    color: 'white',
    padding: '20px'
  },
  centerContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  maxWidth: {
    maxWidth: '500px',
    width: '100%'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  subtitle: {
    color: '#9CA3AF',
    marginBottom: '8px'
  },
  card: {
    background: '#1F2937',
    borderRadius: '12px',
    padding: '30px'
  },
  button: {
    width: '100%',
    padding: '16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonPrimary: {
    background: '#2563EB',
    color: 'white'
  },
  buttonSuccess: {
    background: '#059669',
    color: 'white'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#374151',
    color: 'white',
    fontSize: '18px',
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: '2px'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    margin: '20px 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#374151'
  },
  videoContainer: {
    background: 'black',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: '16/9'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  videoPlaceholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1F2937'
  },
  controlButton: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  chatContainer: {
    background: '#1F2937',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '600px'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '15px'
  },
  message: {
    display: 'inline-block',
    padding: '10px 15px',
    borderRadius: '8px',
    marginBottom: '8px',
    maxWidth: '70%',
    wordWrap: 'break-word'
  },
  messageYou: {
    background: '#2563EB',
    marginLeft: 'auto',
    textAlign: 'right'
  },
  messageFriend: {
    background: '#374151'
  },
  inputContainer: {
    display: 'flex',
    gap: '10px'
  }
};

export default function PrivateChatApp() {
  const [roomId, setRoomId] = useState('');
  const [myPeerId, setMyPeerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const typingTimeoutRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const connectionRef = useRef(null);
  const callRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
    }
  }, []);

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      alert('Please allow camera and microphone access');
      return null;
    }
  };

  const stopLocalVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Sound effects
  const playJoinSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playLeaveSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const initializePeer = (peerId) => {
    return new Promise((resolve, reject) => {
      const peer = new Peer(peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('open', (id) => {
        console.log('Peer initialized with ID:', id);
        setMyPeerId(id);
        resolve(peer);
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        reject(err);
      });
    });
  };

  const createRoom = async () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setIsHost(true);
    setIsWaiting(true);

    window.history.pushState({}, '', `?room=${newRoomId}`);

    const stream = await startLocalVideo();
    if (!stream) return;

    try {
      const peer = await initializePeer(newRoomId);
      peerRef.current = peer;

      peer.on('call', (call) => {
        console.log('Receiving call...');
        call.answer(stream);
        callRef.current = call;

        call.on('stream', (remoteStream) => {
          console.log('Received remote stream');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          playJoinSound();
          setIsWaiting(false);
          setIsConnected(true);
          setMessages([{ text: 'Connected securely. Room will close when either person leaves.', system: true }]);
        });
      });

      peer.on('connection', (conn) => {
        console.log('Data connection established');
        connectionRef.current = conn;
        
        conn.on('data', (data) => {
          console.log('Received message:', data);
          if (data === '__TYPING__') {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
          } else {
            setMessages(prev => [...prev, { text: data, sender: 'friend' }]);
          }
        });

        conn.on('close', () => {
          console.log('Connection closed');
          playLeaveSound();
          endCall();
        });
      });

    } catch (err) {
      console.error('Error creating room:', err);
      alert('Failed to create room. Please try again.');
      setIsWaiting(false);
    }
  };

  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert('Please enter a room code');
      return;
    }
    
    setIsWaiting(true);

    const stream = await startLocalVideo();
    if (!stream) return;

    try {
      const myId = generateRoomId();
      const peer = await initializePeer(myId);
      peerRef.current = peer;

      setTimeout(() => {
        console.log('Calling peer:', roomId);
        const call = peer.call(roomId, stream);
        callRef.current = call;

        call.on('stream', (remoteStream) => {
          console.log('Received remote stream');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          playJoinSound();
          setIsWaiting(false);
          setIsConnected(true);
          setMessages([{ text: 'Connected securely. Room will close when either person leaves.', system: true }]);
        });

        const conn = peer.connect(roomId);
        connectionRef.current = conn;

        conn.on('open', () => {
          console.log('Data connection opened');
        });

        conn.on('data', (data) => {
          console.log('Received message:', data);
          if (data === '__TYPING__') {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
          } else {
            setMessages(prev => [...prev, { text: data, sender: 'friend' }]);
          }
        });

        conn.on('close', () => {
          console.log('Connection closed');
          playLeaveSound();
          endCall();
        });
      }, 1000);

    } catch (err) {
      console.error('Error joining room:', err);
      alert('Failed to join room. Make sure the room code is correct.');
      setIsWaiting(false);
    }
  };

  const endCall = () => {
    playLeaveSound();
    if (callRef.current) {
      callRef.current.close();
    }
    if (connectionRef.current) {
      connectionRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    setIsConnected(false);
    setIsWaiting(false);
    setIsHost(false);
    setRoomId('');
    setMessages([]);
    stopLocalVideo();
    
    window.history.pushState({}, '', window.location.pathname);
  };

  const sendMessage = () => {
    if (messageInput.trim() && isConnected && connectionRef.current) {
      const msg = messageInput.trim();
      connectionRef.current.send(msg);
      setMessages(prev => [...prev, { text: msg, sender: 'you' }]);
      setMessageInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (connectionRef.current && isConnected) {
      connectionRef.current.send('__TYPING__');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing, return to camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      const sender = callRef.current?.peerConnection?.getSenders()?.find(s => s.track?.kind === 'video');
      
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks()[0].stop();
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
        localStreamRef.current.addTrack(videoTrack);
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true 
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = callRef.current?.peerConnection?.getSenders()?.find(s => s.track?.kind === 'video');
        
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks()[0].stop();
          localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
          localStreamRef.current.addTrack(screenTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Stop screen sharing when user clicks browser's stop button
        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Error sharing screen:', err);
        alert('Screen sharing not available or permission denied');
      }
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goHome = () => {
    if (isConnected || isWaiting) {
      endCall();
    } else {
      window.location.href = window.location.pathname;
    }
  };

  if (!isWaiting && !isConnected) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.maxWidth}>
          <div style={styles.header}>
            <h1 style={styles.title}>👻 Ghost Chat</h1>
            <p style={styles.subtitle}>Secure 1-on-1 video & text chat</p>
            <p style={{...styles.subtitle, fontSize: '14px'}}>🔒 End-to-end encrypted • Temporary rooms</p>
          </div>

          <div style={styles.card}>
            <div style={{marginBottom: '25px'}}>
              <button
                onClick={createRoom}
                style={{...styles.button, ...styles.buttonPrimary}}
                onMouseOver={(e) => e.target.style.background = '#1D4ED8'}
                onMouseOut={(e) => e.target.style.background = '#2563EB'}
              >
                Create New Room
              </button>
              <p style={{...styles.subtitle, fontSize: '14px', textAlign: 'center', marginTop: '10px'}}>
                Get a link to share with one person
              </p>
            </div>

            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span style={{color: '#6B7280', fontSize: '14px'}}>OR</span>
              <div style={styles.dividerLine}></div>
            </div>

            <div>
              <label style={{display: 'block', fontSize: '14px', color: '#9CA3AF', marginBottom: '8px'}}>
                Enter room code to join:
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                maxLength={8}
                style={styles.input}
              />
              <button
                onClick={joinRoom}
                disabled={!roomId.trim()}
                style={{
                  ...styles.button,
                  ...styles.buttonSuccess,
                  marginTop: '12px',
                  opacity: !roomId.trim() ? 0.5 : 1,
                  cursor: !roomId.trim() ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => !roomId.trim() ? null : e.target.style.background = '#047857'}
                onMouseOut={(e) => !roomId.trim() ? null : e.target.style.background = '#059669'}
              >
                Join Room
              </button>
            </div>
          </div>

          <div style={{marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#6B7280'}}>
            <p>Rooms are temporary and close when anyone leaves</p>
            <p style={{marginTop: '5px'}}>No data is stored or recorded</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{maxWidth: '1400px', margin: '0 auto'}}>
        {/* Logo/Header */}
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px'}}>
          <div 
            onClick={goHome}
            style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}
          >
            <span style={{fontSize: '32px'}}>👻</span>
            <span style={{fontSize: '24px', fontWeight: 'bold'}}>Ghost Chat</span>
          </div>
        </div>

        <div style={{textAlign: 'center', marginBottom: '25px'}}>
          {isWaiting && (
            <div style={{display: 'inline-block', background: '#1F2937', padding: '10px 20px', borderRadius: '8px'}}>
              <p style={{color: '#FBBF24', fontWeight: '600'}}>Room: {roomId}</p>
              <p style={{color: '#9CA3AF', fontSize: '14px', marginTop: '5px'}}>Waiting for other person to join...</p>
              <button
                onClick={copyRoomLink}
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '10px auto 0',
                  background: '#2563EB',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Room Link'}
              </button>
            </div>
          )}
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '20px'}}>
          <div>
            <div style={{...styles.videoContainer, marginBottom: '20px'}}>
              <video 
                ref={remoteVideoRef}
                autoPlay 
                playsInline
                style={styles.video}
              />
              {!isConnected && (
                <div style={styles.videoPlaceholder}>
                  <div style={{textAlign: 'center'}}>
                    <Video size={64} color="#4B5563" style={{margin: '0 auto 15px'}} />
                    <p style={{color: '#9CA3AF'}}>Waiting for connection...</p>
                  </div>
                </div>
              )}
            </div>

            <div style={{...styles.videoContainer, maxWidth: '350px', marginBottom: '20px'}}>
              <video 
                ref={localVideoRef}
                autoPlay 
                playsInline 
                muted
                style={{...styles.video, transform: 'scaleX(-1)'}}
              />
              <div style={{position: 'absolute', top: '8px', left: '8px', background: 'rgba(17,24,39,0.75)', padding: '4px 8px', borderRadius: '4px', fontSize: '14px'}}>
                You
              </div>
            </div>

            {isConnected && (
              <div style={{display: 'flex', justifyContent: 'center', gap: '15px'}}>
                <button
                  onClick={toggleMute}
                  style={{
                    ...styles.controlButton,
                    background: isMuted ? '#DC2626' : '#374151'
                  }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button
                  onClick={toggleVideo}
                  style={{
                    ...styles.controlButton,
                    background: isVideoOff ? '#DC2626' : '#374151'
                  }}
                  title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
                <button
                  onClick={toggleScreenShare}
                  style={{
                    ...styles.controlButton,
                    background: isScreenSharing ? '#2563EB' : '#374151'
                  }}
                  title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                  <Monitor size={24} />
                </button>
                <button
                  onClick={endCall}
                  style={{
                    ...styles.controlButton,
                    background: '#DC2626'
                  }}
                  title="End call"
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            )}

            {isWaiting && (
              <div style={{display: 'flex', justifyContent: 'center', gap: '15px'}}>
                <button
                  onClick={toggleMute}
                  style={{
                    ...styles.controlButton,
                    background: isMuted ? '#DC2626' : '#374151'
                  }}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button
                  onClick={toggleVideo}
                  style={{
                    ...styles.controlButton,
                    background: isVideoOff ? '#DC2626' : '#374151'
                  }}
                >
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
                <button
                  onClick={endCall}
                  style={{
                    ...styles.controlButton,
                    background: '#DC2626'
                  }}
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            )}
          </div>

          <div style={styles.chatContainer}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #374151'}}>
              <MessageCircle size={20} />
              <h2 style={{fontWeight: '600'}}>Chat</h2>
            </div>

            <div style={styles.messagesContainer}>
              {messages.length === 0 ? (
                <p style={{color: '#6B7280', textAlign: 'center', fontSize: '14px', marginTop: '30px'}}>
                  Messages will appear here
                </p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      textAlign: msg.system ? 'center' : (msg.sender === 'you' ? 'right' : 'left'),
                      marginBottom: '8px'
                    }}
                  >
                    {!msg.system && (
                      <div
                        style={{
                          ...styles.message,
                          ...(msg.sender === 'you' ? styles.messageYou : styles.messageFriend)
                        }}
                      >
                        {msg.text}
                      </div>
                    )}
                    {msg.system && <div style={{color: '#9CA3AF', fontSize: '14px', fontStyle: 'italic'}}>{msg.text}</div>}
                  </div>
                ))
              )}
              {isTyping && (
                <div style={{textAlign: 'left', marginBottom: '8px'}}>
                  <div style={{
                    ...styles.message,
                    ...styles.messageFriend,
                    display: 'inline-flex',
                    gap: '4px'
                  }}>
                    <span style={{animation: 'blink 1.4s infinite', animationDelay: '0s'}}>•</span>
                    <span style={{animation: 'blink 1.4s infinite', animationDelay: '0.2s'}}>•</span>
                    <span style={{animation: 'blink 1.4s infinite', animationDelay: '0.4s'}}>•</span>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.inputContainer}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Type a message..." : "Waiting to connect..."}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  background: '#374151',
                  borderRadius: '8px',
                  padding: '10px 15px',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  opacity: !isConnected ? 0.5 : 1
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || !messageInput.trim()}
                style={{
                  background: '#2563EB',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (!isConnected || !messageInput.trim()) ? 0.5 : 1
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div style={{marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#6B7280'}}>
          <p>🔒 End-to-end encrypted • Room: {roomId} • Closes when anyone leaves</p>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 20%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}