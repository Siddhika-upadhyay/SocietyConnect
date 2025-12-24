const router = require('express').Router();
const Community = require('../models/community.model');
const User = require('../models/user.model');
const auth = require('../middleware/auth');

// --- POST: Create a new community ---
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, avatar } = req.body;

        if (!name || name.trim().length < 3) {
            return res.status(400).json({ msg: 'Community name must be at least 3 characters' });
        }

        // Check if community name already exists
        const existingCommunity = await Community.findOne({ name: name.trim() });
        if (existingCommunity) {
            return res.status(400).json({ msg: 'A community with this name already exists' });
        }

        const newCommunity = new Community({
            name: name.trim(),
            description: description || '',
            avatar: avatar || '',
            creator: req.user.id,
            members: [req.user.id] // Creator automatically joins
        });

        const savedCommunity = await newCommunity.save();

        // Add to user's joined communities
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { joinedCommunities: savedCommunity._id }
        });

        const populatedCommunity = await Community.findById(savedCommunity._id)
            .populate('creator', 'name email')
            .populate('members', 'name email');

        res.status(201).json(populatedCommunity);
    } catch (err) {
        console.error('Error creating community:', err);
        res.status(500).json({ msg: 'Error creating community: ' + err.message });
    }
});

// --- GET: Fetch all communities ---
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const communities = await Community.find(filter)
            .sort({ createdAt: -1 })
            .populate('creator', 'name email')
            .select('name description avatar members createdAt');

        // Add member count to each community
        const communitiesWithCount = communities.map(comm => ({
            ...comm.toObject(),
            memberCount: comm.members.length
        }));

        res.json(communitiesWithCount);
    } catch (err) {
        console.error('Error fetching communities:', err);
        res.status(500).json({ msg: 'Error fetching communities' });
    }
});

// --- GET: Fetch single community by ID ---
router.get('/:id', async (req, res) => {
    try {
        const community = await Community.findById(req.params.id)
            .populate('creator', 'name email')
            .populate('members', 'name email avatar');

        if (!community) {
            return res.status(404).json({ msg: 'Community not found' });
        }

        res.json({
            ...community.toObject(),
            memberCount: community.members.length
        });
    } catch (err) {
        console.error('Error fetching community:', err);
        res.status(500).json({ msg: 'Error fetching community' });
    }
});

// --- POST: Toggle join/leave community ---
router.post('/:id/join', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) {
            return res.status(404).json({ msg: 'Community not found' });
        }

        const userId = req.user.id;
        const isMember = community.members.includes(userId);

        if (isMember) {
            // Leave community
            community.members = community.members.filter(
                memberId => memberId.toString() !== userId
            );
            await User.findByIdAndUpdate(userId, {
                $pull: { joinedCommunities: community._id }
            });
        } else {
            // Join community
            community.members.push(userId);
            await User.findByIdAndUpdate(userId, {
                $addToSet: { joinedCommunities: community._id }
            });
        }

        await community.save();

        const updatedCommunity = await Community.findById(req.params.id)
            .populate('creator', 'name email')
            .populate('members', 'name email');

        res.json({
            ...updatedCommunity.toObject(),
            memberCount: updatedCommunity.members.length,
            isMember: !isMember
        });
    } catch (err) {
        console.error('Error toggling community membership:', err);
        res.status(500).json({ msg: 'Error updating membership' });
    }
});

// --- DELETE: Delete a community (creator only) ---
router.delete('/:id', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) {
            return res.status(404).json({ msg: 'Community not found' });
        }

        if (community.creator.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized to delete this community' });
        }

        // Remove from all users' joinedCommunities
        await User.updateMany(
            { joinedCommunities: community._id },
            { $pull: { joinedCommunities: community._id } }
        );

        await Community.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Community deleted successfully' });
    } catch (err) {
        console.error('Error deleting community:', err);
        res.status(500).json({ msg: 'Error deleting community' });
    }
});

module.exports = router;
