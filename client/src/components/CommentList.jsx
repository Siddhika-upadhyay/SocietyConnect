import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Button, CircularProgress, IconButton } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import CommentItem from './CommentItem';
import ReplyForm from './ReplyForm';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';

function CommentList({ postId, onCommentDeleted, onCommentAdded }) {
  const { user, socket } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [showAddComment, setShowAddComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [processedCommentIds, setProcessedCommentIds] = useState(new Set());
  const processedCommentIdsRef = useRef(new Set());

  // Fetch comments from API
  const fetchComments = useCallback(async (limit = 10, offset = 0) => {
    if (!postId) return;

    setIsLoading(true);
    try {
      const response = await api.get(`/posts/${postId}/comments?limit=${limit}&offset=${offset}`);
      const { comments: newComments, totalComments, hasMore } = response.data;
      
      setTotalComments(totalComments);
      setHasMoreComments(hasMore);
      
      // Add new comment IDs to processed set to prevent duplicates
      const newCommentIds = new Set(newComments.map(c => c._id));
      processedCommentIdsRef.current = new Set([...processedCommentIdsRef.current, ...newCommentIds]);
      setProcessedCommentIds(prev => new Set([...prev, ...newCommentIds]));
      
      if (offset === 0) {
        // First load - replace all comments
        setComments(newComments);
      } else {
        // Load more - append comments
        setComments(prev => [...prev, ...newComments]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  // Initialize comments and socket listeners
  useEffect(() => {
    if (postId) {
      setComments([]);
      setTotalComments(0);
      setHasMoreComments(false);
      setShowComments(false);
      setShowAddComment(false);
      setProcessedCommentIds(new Set());
      processedCommentIdsRef.current = new Set();
      fetchComments(10, 0);
    }
  }, [postId, fetchComments]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !postId) return;

    const handleCommentAdded = (data) => {
      if (data.postId === postId) {
        // Check if comment ID already processed to prevent duplicates
        if (processedCommentIdsRef.current.has(data.comment._id)) {
          return;
        }

        processedCommentIdsRef.current.add(data.comment._id);
        setProcessedCommentIds(prev => new Set([...prev, data.comment._id]));
        setComments(prev => [data.comment, ...prev]);
        setTotalComments(prev => prev + 1);
        onCommentAdded?.(data.comment);
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.postId === postId) {
        setComments(prev => prev.filter(comment => comment._id !== data.commentId));
        processedCommentIdsRef.current.delete(data.commentId);
        setProcessedCommentIds(prev => {
          const updated = new Set(prev);
          updated.delete(data.commentId);
          return updated;
        });
        setTotalComments(prev => Math.max(0, prev - 1));
        onCommentDeleted?.(data.commentId);
      }
    };

    socket.on('comment_added', handleCommentAdded);
    socket.on('comment_deleted', handleCommentDeleted);

    return () => {
      socket.off('comment_added', handleCommentAdded);
      socket.off('comment_deleted', handleCommentDeleted);
    };
  }, [socket, postId, onCommentAdded, onCommentDeleted]);

  // Handle load more comments
  const handleLoadMore = () => {
    if (!isLoading && hasMoreComments) {
      fetchComments(10, comments.length);
    }
  };

  // Handle new comment added
  const handleNewComment = (newComment) => {
    setShowAddComment(false);
  };

  // Handle comment deleted
  const handleCommentDeletedInternal = (commentId) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId));
    setProcessedCommentIds(prev => {
      const updated = new Set(prev);
      updated.delete(commentId);
      return updated;
    });
    setTotalComments(prev => Math.max(0, prev - 1));
    onCommentDeleted?.(commentId);
  };

  // Handle comment icon click to show/hide comments
  const handleCommentIconClick = () => {
    setShowComments(!showComments);
  };

  if (isLoading && comments.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      {/* Comments Header with Icon */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton 
            onClick={handleCommentIconClick}
            size="small"
            sx={{ 
              color: showComments ? 'primary.main' : 'text.secondary',
              '&:hover': { backgroundColor: 'action.hover' }
            }}
          >
            {showComments ? <ChatBubbleIcon /> : <ChatBubbleOutlineIcon />}
          </IconButton>
          <Typography 
            variant="body2" 
            sx={{ 
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              '&:hover': { color: 'var(--primary)' }
            }}
            onClick={handleCommentIconClick}
          >
            {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
          </Typography>
        </Box>
        {user && !showAddComment && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowAddComment(true)}
          >
            Add Comment
          </Button>
        )}
      </Box>

      {/* Add Comment Form */}
      {showAddComment && user && (
        <Box sx={{ mb: 3 }}>
          <ReplyForm
            postId={postId}
            onCommentAdded={handleNewComment}
            placeholder="Write a comment..."
          />
          <Button
            size="small"
            onClick={() => setShowAddComment(false)}
            sx={{ mt: 1 }}
          >
            Cancel
          </Button>
        </Box>
      )}

      {/* Comments List - Only show when expanded */}
      {showComments && (
        <Box>
          {comments.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 2,
                fontStyle: 'italic',
                textAlign: 'center',
                py: 4
              }}
            >
              No comments yet. Be the first to comment!
            </Typography>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  onCommentDeleted={handleCommentDeletedInternal}
                />
              ))}
              
              {/* Load more button for pagination */}
              {hasMoreComments && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Load More Comments'}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default CommentList;
