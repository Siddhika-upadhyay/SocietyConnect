import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Container, TextField, Button, Typography, Box, Link, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
          Log In
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email"
            name="email"
            type="email"
            autoFocus
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
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Log In
          </Button>
          <Typography variant="body2" align="center" sx={{ mt: 2, color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
            Not registered yet? <Link component={RouterLink} to="/register" sx={{ color: theme === 'dark' ? '#ffffff' : 'inherit' }}>Register here</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default LoginPage;