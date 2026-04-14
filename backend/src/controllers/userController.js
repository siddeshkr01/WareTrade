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

module.exports = {
    register,
    login
};