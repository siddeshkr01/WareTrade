const userService = require('../services/userService');

const register = async (req, res) => {
    try {
        const result = await userService.registerUser(req.body);
        res.status(201).json({
            message: "User registered successfully",
            user_id: result.insertId
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        const result = await userService.loginUser(identifier, password);

        res.json({
            message: "Login successful",
            ...result
        });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
};

const lookupUser = async (req, res) => {
    try {
        const identifier = req.query.identifier;
        if (!identifier?.trim()) {
            return res.status(400).json({ error: "identifier is required" });
        }

        const user = await userService.findPublicUser(identifier.trim(), req.user.user_id);
        res.json(user);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

const getPublicProfile = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const profile = await userService.getPublicProfile(userId);
        res.json(profile);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier?.trim()) {
            return res.status(400).json({ error: "identifier is required" });
        }
        const result = await userService.requestPasswordReset(identifier.trim());
        res.json({
            message: "Reset token generated. In production this would be emailed or texted to you.",
            reset_token: result.reset_token,
            expires_at: result.expires_at
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, new_password } = req.body;
        await userService.resetPassword(token, new_password);
        res.json({ message: "Password reset successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    register,
    login,
    lookupUser,
    getPublicProfile,
    forgotPassword,
    resetPassword
};