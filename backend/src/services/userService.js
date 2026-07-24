const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

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

module.exports = {
    registerUser,
    loginUser,
    findPublicUser,
    getPublicProfile
};