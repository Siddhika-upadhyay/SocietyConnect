import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Paper, Divider, Avatar, Badge } from '@mui/material';
import io from 'socket.io-client';
import { AuthContext, api } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import MessageList from '../components/MessageList';
import SendMessage from '../components/SendMessage';

function MessagesPage() {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const { userId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      if (userId) {
        // If userId is provided in URL, fetch that conversation
        fetchMessages(userId);
        // Find and set the selected conversation
        setSelectedConversation({ user: { _id: userId, name: 'Loading...' } });
      }

      // Set up socket connection for real-time updates
      const newSocket = io('http://localhost:5001');
      newSocket.emit('addUser', user.id);
      setSocket(newSocket);

      // Listen for new messages
      newSocket.on('receiveMessage', (messageData) => {
        // Refresh conversations to update unread counts
        fetchConversations();
        // If the message is for the current conversation, refresh messages
        if (selectedConversation && (messageData.sender === selectedConversation.user._id || messageData.receiver === selectedConversation.user._id)) {
          fetchMessages(selectedConversation.user._id);
        }
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, userId]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/messages');
      setConversations(response.data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const response = await api.get(`/messages/${otherUserId}`);
      setMessages(response.data);
      // Update selected conversation with user details
      if (userId) {
        const userResponse = await api.get(`/users/${otherUserId}`);
        setSelectedConversation({ user: userResponse.data });
      }
      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.user._id);
  };

  const handleMessageSent = (newMessage) => {
    setMessages(prev => [...prev, newMessage]);
    // Update conversations to reflect new message
    fetchConversations();
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please log in to view messages.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: 'var(--background)' }}>
      {/* Conversations List */}
      <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', bgcolor: 'var(--background-card)' }}>
        <Typography variant="h6" sx={{ p: 2, bgcolor: 'var(--primary)', color: 'white' }}>
          Conversations
        </Typography>
        <Divider />
        <List>
          {conversations.map((conversation) => (
            <ListItem key={conversation.user._id} disablePadding>
              <ListItemButton
                selected={selectedConversation?.user._id === conversation.user._id}
                onClick={() => handleConversationClick(conversation)}
              >
                <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                  {conversation.user.name.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText
                  primary={conversation.user.name}
                  secondary={conversation.lastMessage.content.substring(0, 30) + '...'}
                  sx={{
                    '& .MuiListItemText-primary': { color: theme === 'dark' ? '#ffffff' : 'inherit' },
                    '& .MuiListItemText-secondary': { color: theme === 'dark' ? '#b0b0b0' : 'inherit' }
                  }}
                />
                {conversation.unreadCount > 0 && (
                  <Badge badgeContent={conversation.unreadCount} color="error" />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            <Box sx={{ p: 2, bgcolor: 'var(--background-card)', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ color: theme === 'dark' ? '#ffffff' : 'var(--text-primary)' }}>{selectedConversation.user.name}</Typography>
            </Box>
            <MessageList messages={messages} currentUser={user} />
            <SendMessage
              receiverId={selectedConversation.user._id}
              onMessageSent={handleMessageSent}
            />
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Typography variant="h6" sx={{ color: theme === 'dark' ? '#ffffff' : 'text.secondary' }}>
              Select a conversation to start messaging
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default MessagesPage;
