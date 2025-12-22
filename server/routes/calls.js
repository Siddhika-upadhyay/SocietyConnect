const router = require('express').Router();
const Call = require('../models/call.model');
const User = require('../models/user.model');
const auth = require('../middleware/auth');

// POST /api/calls - Initiate a call
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, groupId, callType } = req.body;
    const callerId = req.user.id;

    if (!callType || (!receiverId && !groupId)) {
      return res.status(400).json({ msg: 'Call type and receiver/group are required' });
    }

    // Generate unique room ID
    const roomId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const participants = [{ user: callerId, status: 'joined', joinedAt: new Date() }];

    if (receiverId) {
      participants.push({ user: receiverId, status: 'ringing' });
    } else if (groupId) {
      // Add all group members as participants
      const Group = require('../models/group.model');
      const group = await Group.findById(groupId).populate('members.user');
      group.members.forEach(member => {
        if (member.user._id.toString() !== callerId) {
          participants.push({ user: member.user._id, status: 'ringing' });
        }
      });
    }

    const newCall = new Call({
      caller: callerId,
      receiver: receiverId,
      group: groupId,
      callType,
      participants,
      roomId,
      startedAt: new Date()
    });

    const savedCall = await newCall.save();

    const populatedCall = await Call.findById(savedCall._id)
      .populate('caller', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('group', 'name avatar')
      .populate('participants.user', 'name email avatar');

    // Emit call notification via sockets
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');

    if (receiverId) {
      const receiverSocketId = userSocketMap.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('incomingCall', {
          call: populatedCall,
          caller: populatedCall.caller
        });
      }
    } else if (groupId) {
      const Group = require('../models/group.model');
      const group = await Group.findById(groupId).populate('members.user');
      group.members.forEach(member => {
        if (member.user._id.toString() !== callerId) {
          const memberSocketId = userSocketMap.get(member.user._id.toString());
          if (memberSocketId) {
            io.to(memberSocketId).emit('incomingCall', {
              call: populatedCall,
              caller: populatedCall.caller
            });
          }
        }
      });
    }

    res.json(populatedCall);
  } catch (err) {
    console.error('Initiate call error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calls/:id/answer - Answer a call
router.put('/:id/answer', auth, async (req, res) => {
  try {
    const callId = req.params.id;
    const userId = req.user.id;
    const { answer } = req.body; // 'accept' or 'decline'

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ msg: 'Call not found' });
    }

    const participant = call.participants.find(p => p.user.toString() === userId);
    if (!participant) {
      return res.status(403).json({ msg: 'Not a participant in this call' });
    }

    if (answer === 'accept') {
      participant.status = 'joined';
      participant.joinedAt = new Date();
      call.status = 'ongoing';
    } else {
      participant.status = 'declined';
    }

    await call.save();

    const populatedCall = await Call.findById(callId)
      .populate('caller', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('group', 'name avatar')
      .populate('participants.user', 'name email avatar');

    // Emit answer via sockets
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');

    const callerSocketId = userSocketMap.get(call.caller.toString());
    if (callerSocketId) {
      io.to(callerSocketId).emit('callAnswered', {
        callId,
        participantId: userId,
        answer,
        call: populatedCall
      });
    }

    res.json(populatedCall);
  } catch (err) {
    console.error('Answer call error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calls/:id/end - End a call
router.put('/:id/end', auth, async (req, res) => {
  try {
    const callId = req.params.id;
    const userId = req.user.id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ msg: 'Call not found' });
    }

    const participant = call.participants.find(p => p.user.toString() === userId);
    if (!participant) {
      return res.status(403).json({ msg: 'Not a participant in this call' });
    }

    participant.status = 'left';
    participant.leftAt = new Date();

    // Check if all participants have left
    const activeParticipants = call.participants.filter(p => p.status === 'joined');
    if (activeParticipants.length <= 1) {
      call.status = 'ended';
      call.endedAt = new Date();
    }

    await call.save();

    const populatedCall = await Call.findById(callId)
      .populate('caller', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('group', 'name avatar')
      .populate('participants.user', 'name email avatar');

    // Emit end call via sockets
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');

    call.participants.forEach(p => {
      const participantSocketId = userSocketMap.get(p.user.toString());
      if (participantSocketId) {
        io.to(participantSocketId).emit('callEnded', {
          callId,
          call: populatedCall
        });
      }
    });

    res.json(populatedCall);
  } catch (err) {
    console.error('End call error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calls/:id - Get call details
router.get('/:id', auth, async (req, res) => {
  try {
    const callId = req.params.id;
    const userId = req.user.id;

    const call = await Call.findById(callId)
      .populate('caller', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('group', 'name avatar')
      .populate('participants.user', 'name email avatar');

    if (!call) {
      return res.status(404).json({ msg: 'Call not found' });
    }

    // Check if user is participant
    const isParticipant = call.participants.some(p => p.user._id.toString() === userId);
    if (!isParticipant) {
      return res.status(403).json({ msg: 'Not authorized to view this call' });
    }

    res.json(call);
  } catch (err) {
    console.error('Get call error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calls - Get user's call history
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const calls = await Call.find({
      $or: [
        { caller: userId },
        { 'participants.user': userId }
      ]
    })
    .populate('caller', 'name email avatar')
    .populate('receiver', 'name email avatar')
    .populate('group', 'name avatar')
    .populate('participants.user', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(calls);
  } catch (err) {
    console.error('Get calls error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
