import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Container, TextField, Button, Typography, Box, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name, email, password, phone);
      alert('Registration successful! You are now logged in.');
      navigate('/');
    } catch (error) {
      if (error.response && error.response.data && error.response.data.msg) {
        alert(error.response.data.msg);
      } else {
        console.error('Registration failed:', error);
        alert('Registration failed. Please try again.');
      }
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
          Register
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Name"
            name="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{
              '& .MuiInputLabel-root': { color: theme === 'dark' ? '#ffffff' : 'inherit' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                '&:hover fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                '&.Mui-focused fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
              },
              '& .MuiOutlinedInput-input': { color: theme === 'dark' ? '#ffffff' : 'inherit' }
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              '& .MuiInputLabel-root': { color: theme === 'dark' ? '#ffffff' : 'inherit' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                '&:hover fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                '&.Mui-focused fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
              },
              '& .MuiOutlinedInput-input': { color: theme === 'dark' ? '#ffffff' : 'inherit' }
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputLabel-root': { color: theme === 'dark' ? '#ffffff' : 'inherit' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                '&:hover fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                '&.Mui-focused fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
              },
              '& .MuiOutlinedInput-input': { color: theme === 'dark' ? '#ffffff' : 'inherit' }
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="phone"
            label="Phone Number"
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            sx={{
              '& .MuiInputLabel-root': { color: theme === 'dark' ? '#ffffff' : 'inherit' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                '&:hover fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
                '&.Mui-focused fieldset': { borderColor: theme === 'dark' ? '#ffffff' : 'inherit' },
              },
              '& .MuiOutlinedInput-input': { color: theme === 'dark' ? '#ffffff' : 'inherit' }
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Register
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default RegisterPage;