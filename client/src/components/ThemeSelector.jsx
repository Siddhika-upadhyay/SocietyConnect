import React, { useContext, useState, useEffect } from 'react';
import { Menu, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import { ThemeContext } from '../context/ThemeContext';

function ThemeSelector() {
  const { theme, changeTheme, customColors, updateCustomColors } = useContext(ThemeContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [tempColors, setTempColors] = useState(customColors);

  useEffect(() => {
    setTempColors(customColors);
  }, [customColors]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeChange = (newTheme) => {
    if (newTheme === 'custom') {
      setCustomDialogOpen(true);
    } else {
      changeTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      // Update CSS custom properties for custom theme fallback
      if (newTheme === 'custom') {
        document.documentElement.style.setProperty('--custom-primary', customColors.primary);
        document.documentElement.style.setProperty('--custom-secondary', customColors.secondary);
        document.documentElement.style.setProperty('--custom-background', customColors.background);
        document.documentElement.style.setProperty('--custom-surface', customColors.surface);
        document.documentElement.style.setProperty('--custom-text', customColors.text);
      }
    }
    handleClose();
  };

  const handleCustomDialogClose = () => {
    setCustomDialogOpen(false);
    setTempColors(customColors);
  };

  const handleCustomThemeApply = () => {
    updateCustomColors(tempColors);
    changeTheme('custom');
    document.documentElement.setAttribute('data-theme', 'custom');
    // Update CSS custom properties
    document.documentElement.style.setProperty('--custom-primary', tempColors.primary);
    document.documentElement.style.setProperty('--custom-secondary', tempColors.secondary);
    document.documentElement.style.setProperty('--custom-background', tempColors.background);
    document.documentElement.style.setProperty('--custom-surface', tempColors.surface);
    document.documentElement.style.setProperty('--custom-text', tempColors.text);
    setCustomDialogOpen(false);
  };

  const handleColorChange = (colorType, value) => {
    setTempColors(prev => ({ ...prev, [colorType]: value }));
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
      >
        <PaletteIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: 'var(--background-card)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(0,0,0,0.1)'
          },
          '& .MuiMenuItem-root': {
            color: 'var(--text-primary)',
            '&:hover': {
              backgroundColor: 'var(--accent)'
            },
            '&.Mui-selected': {
              backgroundColor: 'var(--primary)',
              color: 'white'
            }
          }
        }}
      >
        <MenuItem onClick={() => handleThemeChange('light')} selected={theme === 'light'}>
          Light Theme
        </MenuItem>
        <MenuItem onClick={() => handleThemeChange('dark')} selected={theme === 'dark'}>
          Dark Theme
        </MenuItem>
        <MenuItem onClick={() => handleThemeChange('custom')} selected={theme === 'custom'}>
          Custom Theme
        </MenuItem>
      </Menu>

      <Dialog open={customDialogOpen} onClose={handleCustomDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>Customize Theme</DialogTitle>
        <DialogContent sx={{ backgroundColor: 'var(--background-card)', color: 'var(--text-primary)' }}>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Primary Color"
              type="color"
              value={tempColors.primary}
              onChange={(e) => handleColorChange('primary', e.target.value)}
              fullWidth
            />
            <TextField
              label="Secondary Color"
              type="color"
              value={tempColors.secondary}
              onChange={(e) => handleColorChange('secondary', e.target.value)}
              fullWidth
            />
            <TextField
              label="Background Color"
              type="color"
              value={tempColors.background}
              onChange={(e) => handleColorChange('background', e.target.value)}
              fullWidth
            />
            <TextField
              label="Surface Color"
              type="color"
              value={tempColors.surface}
              onChange={(e) => handleColorChange('surface', e.target.value)}
              fullWidth
            />
            <TextField
              label="Text Color"
              type="color"
              value={tempColors.text}
              onChange={(e) => handleColorChange('text', e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: 'var(--background-card)' }}>
          <Button onClick={handleCustomDialogClose} sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>Cancel</Button>
          <Button onClick={handleCustomThemeApply} variant="contained" sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>Apply</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ThemeSelector;
