const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('../models/userModel');

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

const registerUser = async (data) => {
    if (!data.user_name?.trim() || data.user_name.trim().length < 3) {
        throw new Error('Username must be at least 3 characters');
    }
    if (!/^\d{10,15}$/.test(data.phone_number?.trim() || '')) {
        throw new Error('Phone number must be 10-15 digits');
    }
    if (!data.password || data.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }

    const existingUser = await userModel.findUserByPhoneOrUserId(data.phone_number)
        || await userModel.findUserByPhoneOrUserId(data.user_name);
    if (existingUser) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = {
        ...data,
        password: hashedPassword
    };

    return await userModel.createUser(newUser);
};

const loginUser = async (identifier, password) => {
    const user = await userModel.findUserByPhoneOrUserId(identifier);

    if (!user) {
        throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        process.env.JWT_SECRET || "secretkey",
        { expiresIn: '1d' }
    );

    return {
        token,
        user: {
            user_id: user.user_id,
            user_name: user.user_name,
            role: user.role
        }
    };
};

const findPublicUser = async (identifier, requestingUserId) => {
    const user = await userModel.findPublicUserByIdentifier(identifier);
    if (!user) {
        throw new Error('User not found');
    }
    if (user.user_id === requestingUserId) {
        throw new Error('Cannot select yourself');
    }
    return user;
};

const getPublicProfile = async (user_id) => {
    const profile = await userModel.findPublicProfileById(user_id);
    if (!profile) throw new Error('User not found');
    return profile;
};

// No email/SMS provider is configured for this app, so the reset token is
// handed back to the caller instead of being delivered out-of-band — the
// frontend surfaces it directly with a note that this stands in for an
// emailed/texted link in production.
const requestPasswordReset = async (identifier) => {
    const user = await userModel.findUserByPhoneOrUserId(identifier);
    if (!user) throw new Error('User not found');

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await userModel.setResetToken(user.user_id, token, expires);

    return { reset_token: token, expires_at: expires };
};

const resetPassword = async (token, newPassword) => {
    if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }

    const user = await userModel.findByResetToken(token);
    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
        throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userModel.updatePasswordAndClearToken(user.user_id, hashedPassword);
};

module.exports = {
    registerUser,
    loginUser,
    findPublicUser,
    getPublicProfile,
    requestPasswordReset,
    resetPassword
};