require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get('/', (req, res) => {
    res.send('Server is running 🚀');
});

// routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);
const godownRoutes = require('./routes/godownRoutes');
app.use('/api/godowns', godownRoutes);

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
});