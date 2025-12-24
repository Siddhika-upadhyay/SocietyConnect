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
      await markNotificationAsRead(notification._id);

      if (notification.type === 'message') {
        navigate(`/messages/${notification.sender._id}`);
      } else if (notification.type === 'comment' || notification.type === 'like') {

        navigate('/');

        if (notification.post && notification.post._id) {
          setTimeout(() => {
            const postElement = document.getElementById(`post-${notification.post._id}`);
            if (postElement) {
              postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
      disableAutoFocusItem
      MenuListProps={{ 
        'aria-labelledby': 'notification-button',
        role: 'menu'
      }}
      sx={{
        maxHeight: 400,
        '& .MuiPaper-root': {
          minWidth: 350,
          bgcolor: 'var(--background-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--text-secondary)',
        },
        '& .MuiMenuItem-root': {
          '&:focus': {
            backgroundColor: 'action.selected',
          },
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