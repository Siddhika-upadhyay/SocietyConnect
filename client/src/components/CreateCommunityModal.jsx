import React, { useState, useContext } from 'react';
import {
    Modal, Box, TextField, Button, Typography, IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { ThemeContext } from '../context/ThemeContext';
import { api } from '../context/AuthContext';

function CreateCommunityModal({ open, onClose, onCommunityCreated }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { theme } = useContext(ThemeContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || name.trim().length < 3) {
            setError('Community name must be at least 3 characters');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await api.post('/communities', {
                name: name.trim(),
                description: description.trim()
            });
            onCommunityCreated?.(response.data);
            setName('');
            setDescription('');
            onClose();
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to create community');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: theme === 'dark' ? '#1a1a1a' : 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 2
    };

    const inputStyle = {
        '& .MuiInputLabel-root': {
            color: theme === 'dark' ? '#ffffff' : 'inherit'
        },
        '& .MuiOutlinedInput-root': {
            color: theme === 'dark' ? '#ffffff' : 'inherit',
            '& fieldset': {
                borderColor: theme === 'dark' ? '#ffffff55' : 'inherit'
            },
            '&:hover fieldset': {
                borderColor: theme === 'dark' ? '#bbbbbb' : 'inherit'
            },
            '&.Mui-focused fieldset': {
                borderColor: theme === 'dark' ? '#ffffff' : 'inherit'
            }
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={modalStyle}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: theme === 'dark' ? '#fff' : 'inherit' }}>
                        Create Community
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <Close sx={{ color: theme === 'dark' ? '#fff' : 'inherit' }} />
                    </IconButton>
                </Box>

                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        label="Community Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        sx={{ ...inputStyle, mb: 2 }}
                        required
                        inputProps={{ maxLength: 50 }}
                        helperText={`${name.length}/50 characters`}
                    />

                    <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        sx={{ ...inputStyle, mb: 2 }}
                        inputProps={{ maxLength: 500 }}
                        helperText={`${description.length}/500 characters`}
                    />

                    {error && (
                        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Community'}
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}

export default CreateCommunityModal;
