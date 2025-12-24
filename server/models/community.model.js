const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const communitySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    description: {
        type: String,
        default: '',
        maxlength: 500
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    avatar: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for faster name searches
communitySchema.index({ name: 'text', description: 'text' });

const Community = mongoose.model('Community', communitySchema);

module.exports = Community;
