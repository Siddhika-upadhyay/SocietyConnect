const router = require('express').Router();
const Group = require('../models/group.model');
const User = require('../models/user.model');
const auth = require('../middleware/auth');

// GET /api/groups - Get user's groups
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.find({
      'members.user': userId
    })
    .populate('members.user', 'name email avatar isOnline lastSeen')
    .populate('lastMessage')
    .populate('createdBy', 'name email')
    .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups - Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = req.user.id;

    if (!name) {
      return res.status(400).json({ msg: 'Group name is required' });
    }

    // Create members array with creator as admin
    const members = [{ user: creatorId, role: 'admin' }];

    // Add other members
    if (memberIds && memberIds.length > 0) {
      memberIds.forEach(memberId => {
        if (memberId !== creatorId) {
          members.push({ user: memberId, role: 'member' });
        }
      });
    }

    const newGroup = new Group({
      name: name.trim(),
      description: description?.trim(),
      createdBy: creatorId,
      members
    });

    const savedGroup = await newGroup.save();

    const populatedGroup = await Group.findById(savedGroup._id)
      .populate('members.user', 'name email avatar isOnline lastSeen')
      .populate('createdBy', 'name email');

    res.json(populatedGroup);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:id - Get group details
router.get('/:id', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId)
      .populate('members.user', 'name email avatar isOnline lastSeen status')
      .populate('createdBy', 'name email')
      .populate('admins', 'name email');

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is member
    const isMember = group.members.some(member => member.user._id.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ msg: 'Not authorized to view this group' });
    }

    res.json(group);
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/groups/:id - Update group
router.put('/:id', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    const { name, description } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.some(admin => admin.toString() === userId);
    if (!isAdmin) {
      return res.status(403).json({ msg: 'Only admins can update group' });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description?.trim();

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate('members.user', 'name email avatar isOnline lastSeen')
      .populate('createdBy', 'name email');

    res.json(populatedGroup);
  } catch (err) {
    console.error('Update group error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/members - Add members to group
router.post('/:id/members', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    const { memberIds } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.some(admin => admin.toString() === userId);
    if (!isAdmin) {
      return res.status(403).json({ msg: 'Only admins can add members' });
    }

    // Add new members
    memberIds.forEach(memberId => {
      const exists = group.members.some(member => member.user.toString() === memberId);
      if (!exists) {
        group.members.push({ user: memberId, role: 'member' });
      }
    });

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate('members.user', 'name email avatar isOnline lastSeen')
      .populate('createdBy', 'name email');

    res.json(populatedGroup);
  } catch (err) {
    console.error('Add members error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:id/members/:memberId - Remove member from group
router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is admin or removing themselves
    const isAdmin = group.admins.some(admin => admin.toString() === userId);
    const isSelfRemoval = userId === memberId;

    if (!isAdmin && !isSelfRemoval) {
      return res.status(403).json({ msg: 'Not authorized to remove members' });
    }

    // Cannot remove the last admin
    const memberToRemove = group.members.find(member => member.user.toString() === memberId);
    if (memberToRemove?.role === 'admin' && group.admins.length === 1) {
      return res.status(400).json({ msg: 'Cannot remove the last admin' });
    }

    group.members = group.members.filter(member => member.user.toString() !== memberId);
    group.admins = group.admins.filter(admin => admin.toString() !== memberId);

    await group.save();

    res.json({ msg: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:id - Delete group
router.delete('/:id', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Only creator can delete group
    if (group.createdBy.toString() !== userId) {
      return res.status(403).json({ msg: 'Only group creator can delete the group' });
    }

    await Group.findByIdAndDelete(groupId);

    res.json({ msg: 'Group deleted successfully' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
