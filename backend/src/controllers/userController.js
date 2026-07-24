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

module.exports = {
    register,
    login,
    lookupUser,
    getPublicProfile
};