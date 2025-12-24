import React, { useContext, useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Badge, Menu, MenuItem, Avatar, Dialog, DialogTitle, DialogContent, TextField, InputAdornment } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import NotificationMenu from './NotificationMenu';
import CreatePostForm from './CreatePostForm';
import ThemeSelector from './ThemeSelector';

const notificationSound = new Audio('/notification.mp3');

function Navbar({ onPostCreated, categories, searchQuery, onSearchChange }) {
  const { user, logout, notifications, markNotificationsAsRead, unreadMessagesCount, totalUnreadMessages } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const isNotificationMenuOpen = Boolean(anchorEl);

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setAnchorEl(null);
  };

  // Profile menu state
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const isProfileMenuOpen = Boolean(profileAnchorEl);

  const handleProfileClick = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const handlePostClick = () => {
    if (user) {
      setIsPostModalOpen(true);
    } else {
      navigate('/login');
    }
  };

  const handlePostModalClose = () => {
    setIsPostModalOpen(false);
  };

  const handlePostCreated = (content, imageFile, categoryId) => {
    onPostCreated(content, imageFile, categoryId);
    setIsPostModalOpen(false);
  };

  return (
    <>
      <AppBar
        position="fixed"
        className={isScrolled ? 'scrolled' : ''}
        sx={{
          backgroundColor: isScrolled ? 'var(--background-card)' : 'var(--primary)',
          transition: 'background-color 0.3s ease',
          boxShadow: isScrolled ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              color: isScrolled ? 'var(--text-primary)' : 'inherit',
              textDecoration: 'none',
              mr: 2,
              transition: 'color 0.3s ease'
            }}
          >
            HyperLocal
          </Typography>

          {/* Search bar in the middle */}
          <Box sx={{ flexGrow: 1, maxWidth: 400, mx: 2, display: 'flex', justifyContent: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: isScrolled ? 'var(--text-primary)' : (theme === 'light' ? 'black' : 'rgba(255,255,255,0.7)') }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: isScrolled ? 'rgba(255,255,255,0.9)' : (theme === 'light' ? 'white' : 'rgba(255,255,255,0.1)'),
                  '& fieldset': {
                    borderColor: isScrolled ? 'rgba(0,0,0,0.2)' : (theme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)'),
                  },
                  '&:hover fieldset': {
                    borderColor: isScrolled ? 'rgba(0,0,0,0.4)' : (theme === 'light' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)'),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: isScrolled ? 'var(--primary)' : (theme === 'light' ? 'var(--primary)' : 'white'),
                  },
                },
                '& .MuiOutlinedInput-input': {
                  color: isScrolled ? 'var(--text-primary)' : (theme === 'light' ? 'black' : 'white'),
                  '&::placeholder': {
                    color: isScrolled ? 'var(--text-secondary)' : (theme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'),
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              color="inherit"
              onClick={handlePostClick}
              sx={{
                color: isScrolled ? 'var(--text-primary)' : 'inherit',
                transition: 'color 0.3s ease'
              }}
            >
              Post
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/communities"
              sx={{
                color: isScrolled ? 'var(--text-primary)' : 'inherit',
                transition: 'color 0.3s ease'
              }}
            >
              Communities
            </Button>
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  size="large"
                  color="inherit"
                  onClick={() => navigate('/messages')}
                  sx={{
                    color: isScrolled ? 'var(--text-primary)' : 'inherit',
                    transition: 'color 0.3s ease'
                  }}
                >
                  <Badge badgeContent={totalUnreadMessages} color="error">
                    <MessageIcon />
                  </Badge>
                </IconButton>

                <IconButton
                  id="notification-button"
                  size="large"
                  color="inherit"
                  onClick={handleNotificationClick}
                  sx={{
                    color: isScrolled ? 'var(--text-primary)' : 'inherit',
                    transition: 'color 0.3s ease'
                  }}
                >
                  <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>

                <Avatar
                  sx={{ ml: 2, mr: 1, bgcolor: 'secondary.main', cursor: 'pointer' }}
                  onClick={handleProfileClick}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Menu
                  anchorEl={profileAnchorEl}
                  open={isProfileMenuOpen}
                  onClose={handleProfileClose}
                  sx={{
                    '& .MuiPaper-root': {
                      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                      color: theme === 'dark' ? '#ffffff' : '#000000'
                    }
                  }}
                >
                  <MenuItem
                    onClick={() => { handleProfileClose(); navigate(`/profile/${user.email}`); }}
                    sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}
                  >
                    Profile
                  </MenuItem>
                  {user?.isAdmin && (
                    <MenuItem
                      onClick={() => { handleProfileClose(); navigate('/admin'); }}
                      sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}
                    >
                      Admin Panel
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => { handleProfileClose(); handleLogout(); }}
                    sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}
                  >
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  size="large"
                  color="inherit"
                  onClick={() => navigate('/login')}
                  sx={{
                    color: isScrolled ? 'var(--text-primary)' : 'inherit',
                    transition: 'color 0.3s ease'
                  }}
                >
                  <PersonIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </Toolbar>

        {/* This renders the actual dropdown menu */}
        <NotificationMenu
          anchorEl={anchorEl}
          isOpen={isNotificationMenuOpen}
          onClose={handleNotificationClose}
          notifications={notifications}
        />
      </AppBar>

      {/* Post Modal */}
      <Dialog open={isPostModalOpen} onClose={handlePostModalClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Post</DialogTitle>
        <DialogContent>
          <CreatePostForm onPostCreated={handlePostCreated} categories={categories} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Navbar;