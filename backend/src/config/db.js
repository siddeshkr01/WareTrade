const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "myapp",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise wrapper
const db = pool.promise();

console.log("DB CONFIG:", {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME
});
// Test connection
pool.getConnection((err, conn) => {
    if (err) {
        console.error("❌ MySQL Error:", err.message);
    } else {
        console.log("✅ MySQL Connected");
        conn.release();
    }
});

module.exports = db;