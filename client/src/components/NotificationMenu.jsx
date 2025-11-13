import React, { useContext } from 'react';
import { Menu, MenuItem, Typography, Box } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function NotificationMenu({ anchorEl, isOpen, onClose, notifications }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    // We could add logic to navigate to the specific post
    onClose();
  };

  // --- NEW: Helper function to render notification text ---
  const renderNotificationText = (notif) => {
    switch (notif.type) {
      case 'comment':
        return `<strong>${notif.sender?.username || 'Someone'}</strong> commented on your post.`;
      case 'like':
        return `<strong>${notif.sender?.username || 'Someone'}</strong> liked your post.`;
      default:
        return 'You have a new notification.';
    }
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={isOpen}
      onClose={onClose}
      MenuListProps={{ 'aria-labelledby': 'notification-button' }}
      sx={{ maxHeight: 400, '& .MuiPaper-root': { minWidth: 350 } }}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography variant="h6">Notifications</Typography>
      </Box>
      {notifications.length === 0 ? (
        <MenuItem disabled>
          <Typography variant="body2">No notifications yet.</Typography>
        </MenuItem>
      ) : (
        notifications.map((notif) => (
          <MenuItem
            key={notif._id}
            onClick={() => handleNotificationClick(notif)}
            sx={{
              backgroundColor: notif.read ? 'transparent' : 'action.hover',
              whiteSpace: 'normal',
            }}
          >
            {/* Use the helper function to display the correct text */}
            <Typography 
              variant="body2" 
              dangerouslySetInnerHTML={{ __html: renderNotificationText(notif) }} 
            />
          </MenuItem>
        ))
      )}
    </Menu>
  );
}

export default NotificationMenu;