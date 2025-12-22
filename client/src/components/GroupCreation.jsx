import React, { useState, useContext } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip
} from '@mui/material';
import { Close, PersonAdd, Group } from '@mui/icons-material';
import { AuthContext, api } from '../context/AuthContext';

function GroupCreation({ onGroupCreated, onClose }) {
  const { user } = useContext(AuthContext);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/users/search?q=${query}`);
      // Filter out current user and already selected users
      const filtered = response.data.filter(u =>
        u._id !== user.id && !selectedUsers.find(su => su._id === u._id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const addUser = (user) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert('Please enter a group name and add at least one member');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/groups', {
        name: groupName.trim(),
        members: selectedUsers.map(u => u._id)
      });

      onGroupCreated(response.data);
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        maxWidth: 500,
        mx: 'auto',
        position: 'relative'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Create Group Chat</Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      <TextField
        fullWidth
        label="Group Name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Search Users"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Type to search users..."
        sx={{ mb: 2 }}
      />

      {searchResults.length > 0 && (
        <Paper sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
          <List dense>
            {searchResults.map((user) => (
              <ListItem key={user._id} button onClick={() => addUser(user)}>
                <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText primary={user.name} secondary={user.email} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => addUser(user)}>
                    <PersonAdd />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {selectedUsers.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Selected Members ({selectedUsers.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedUsers.map((user) => (
              <Chip
                key={user._id}
                avatar={<Avatar>{user.name.charAt(0).toUpperCase()}</Avatar>}
                label={user.name}
                onDelete={() => removeUser(user._id)}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<Group />}
          onClick={createGroup}
          disabled={loading || !groupName.trim() || selectedUsers.length === 0}
        >
          {loading ? 'Creating...' : 'Create Group'}
        </Button>
        <Button
          variant="outlined"
          fullWidth
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
      </Box>
    </Paper>
  );
}

export default GroupCreation;
