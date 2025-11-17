import React, { useContext } from 'react';
import { Menu, MenuItem, Typography, Box } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

function NotificationMenu({ anchorEl, isOpen, onClose, notifications }) {
  const { user, markNotificationAsRead } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleNotificationClick = async (notification) => {
    try {
      // Mark notification as read using context function
      await markNotificationAsRead(notification._id);

      // Navigate based on notification type
      if (notification.type === 'message') {
        navigate(`/messages/${notification.sender._id}`);
      } else if (notification.type === 'comment' || notification.type === 'like') {
        // Navigate to home page
        navigate('/');
        // Scroll to the post if it exists
        if (notification.post) {
          setTimeout(() => {
            const postElement = document.getElementById(`post-${notification.post}`);
            if (postElement) {
              postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Add temporary highlight
              postElement.style.boxShadow = '0 0 20px rgba(25, 118, 210, 0.5)';
              setTimeout(() => {
                postElement.style.boxShadow = '';
              }, 3000);
            }
          }, 500);
        }
      }

      onClose();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // --- NEW: Helper function to render notification text ---
  const renderNotificationText = (notif) => {
    switch (notif.type) {
      case 'comment':
        return `<strong>${notif.sender?.name || 'Someone'}</strong> commented on your post.`;
      case 'like':
        return `<strong>${notif.sender?.name || 'Someone'}</strong> liked your post.`;
      case 'message':
        return `<strong>${notif.sender?.name || 'Someone'}</strong> sent you a message.`;
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
      sx={{
        maxHeight: 400,
        '& .MuiPaper-root': {
          minWidth: 350,
          bgcolor: 'var(--background-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--text-secondary)',
        }
      }}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography variant="h6" sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>Notifications</Typography>
      </Box>
      {notifications.length === 0 ? (
        <MenuItem disabled>
          <Typography variant="body2" sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>No notifications yet.</Typography>
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
              sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}
            />
          </MenuItem>
        ))
      )}
    </Menu>
  );
}

export default NotificationMenu;