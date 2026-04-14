const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const registerUser = async (data) => {
    const existingUser = await userModel.findUserByPhoneOrUserId(data.user_id);
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

module.exports = {
    registerUser,
    loginUser
};