import React, { useContext, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Badge } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { AuthContext } from '../context/AuthContext';
import NotificationMenu from './NotificationMenu'; // Import the new component

function Navbar() {
  const { user, logout, notifications, markNotificationsAsRead } = useContext(AuthContext);
  const navigate = useNavigate();

  // Calculate the number of unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const isNotificationMenuOpen = Boolean(anchorEl);

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
    // When the user opens the menu, mark all notifications as read
    if (unreadCount > 0) {
      markNotificationsAsRead();
    }
  };

  const handleNotificationClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>
          HyperLocal
        </Typography>
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              id="notification-button"
              size="large"
              color="inherit"
              onClick={handleNotificationClick}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Typography component="span" sx={{ ml: 2, mr: 2 }}>
              Welcome, {user.username}
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" component={RouterLink} to="/login">
              Login
            </Button>
            <Button color="inherit" component={RouterLink} to="/register">
              Register
            </Button>
          </Box>
        )}
      </Toolbar>

      {/* This renders the actual dropdown menu */}
      <NotificationMenu 
        anchorEl={anchorEl}
        isOpen={isNotificationMenuOpen}
        onClose={handleNotificationClose}
        notifications={notifications}
      />
    </AppBar>
  );
}

export default Navbar;