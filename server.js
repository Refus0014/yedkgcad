const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// MySQL connection
const dbConfig = {
    host: 'sql.freedb.tech',
    user: 'freedb_gigakox',
    password: '24&8PjWrmhauVKZ',
    database: 'freedb_ERLCusers'
};

let db;

async function initDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database.');

        // Create tables if not exist
        await db.query(`CREATE TABLE IF NOT EXISTS civilians (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_nick VARCHAR(255) UNIQUE NOT NULL,
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            date_of_birth DATE,
            gender VARCHAR(50),
            address TEXT,
            phone_number VARCHAR(50),
            license_status VARCHAR(50) DEFAULT 'Valid',
            notes TEXT,
            is_bolo TINYINT DEFAULT 0,
            bolo_reason TEXT,
            warning_flags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);

        await db.query(`CREATE TABLE IF NOT EXISTS criminal_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            civilian_id INT NOT NULL,
            record_number VARCHAR(255) UNIQUE NOT NULL,
            incident_date DATE NOT NULL,
            incident_time TIME,
            location TEXT,
            arresting_officer VARCHAR(255),
            department VARCHAR(255),
            charges TEXT NOT NULL,
            narrative TEXT,
            status VARCHAR(50) DEFAULT 'Active',
            flags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (civilian_id) REFERENCES civilians(id) ON DELETE CASCADE
        )`);

        await db.query(`CREATE TABLE IF NOT EXISTS vehicles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            civilian_id INT,
            plate VARCHAR(255) UNIQUE NOT NULL,
            model VARCHAR(255) NOT NULL,
            color VARCHAR(50),
            registration_status VARCHAR(50) DEFAULT 'Valid',
            insurance_status VARCHAR(50) DEFAULT 'Valid',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (civilian_id) REFERENCES civilians(id) ON DELETE SET NULL
        )`);

        await db.query(`CREATE TABLE IF NOT EXISTS citations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            civilian_id INT NOT NULL,
            citation_number VARCHAR(255) UNIQUE NOT NULL,
            citation_date DATE NOT NULL,
            citation_time TIME,
            location TEXT,
            issuing_officer VARCHAR(255),
            department VARCHAR(255),
            violation TEXT NOT NULL,
            fine_amount DECIMAL(10,2),
            notes TEXT,
            status VARCHAR(50) DEFAULT 'Unpaid',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (civilian_id) REFERENCES civilians(id) ON DELETE CASCADE
        )`);

        await db.query(`CREATE TABLE IF NOT EXISTS bolos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            civilian_id INT NOT NULL,
            bolo_number VARCHAR(255) UNIQUE NOT NULL,
            reason TEXT NOT NULL,
            description TEXT,
            last_known_location TEXT,
            issuing_officer VARCHAR(255),
            department VARCHAR(255),
            priority VARCHAR(50) DEFAULT 'Medium',
            status VARCHAR(50) DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (civilian_id) REFERENCES civilians(id) ON DELETE CASCADE
        )`);

        console.log('Database tables initialized.');
    } catch (err) {
        console.error('Error connecting to database:', err);
    }
}

// Initialize DB
initDatabase();

// ==================== CIVILIAN ROUTES ====================

app.get('/api/civilians', async (req, res) => {
    const search = req.query.search || '';
    try {
        const [rows] = await db.query(
            `SELECT * FROM civilians WHERE game_nick LIKE ? OR first_name LIKE ? OR last_name LIKE ? ORDER BY game_nick`,
            [`%${search}%`, `%${search}%`, `%${search}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/civilians/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM civilians WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Civilian not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/civilians', async (req, res) => {
    const { game_nick, first_name, last_name, date_of_birth, gender, address, phone_number, license_status, notes, is_bolo, bolo_reason, warning_flags } = req.body;
    if (!game_nick) return res.status(400).json({ error: 'Game nick is required' });

    try {
        const [result] = await db.query(
            `INSERT INTO civilians (game_nick, first_name, last_name, date_of_birth, gender, address, phone_number, license_status, notes, is_bolo, bolo_reason, warning_flags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [game_nick, first_name, last_name, date_of_birth, gender, address, phone_number, license_status, notes, is_bolo || 0, bolo_reason, warning_flags]
        );
        res.json({ id: result.insertId, message: 'Civilian added successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') res.status(400).json({ error: 'Game nick already exists' });
        else res.status(500).json({ error: err.message });
    }
});

// Reszta CRUD dla civilian, records, vehicles, citations, bolos jest analogiczna: zamieniasz `db.run` i `db.all` na `await db.query(...)`, i używasz `[params]` jako parametrów zamiast `?` w SQLite.

app.listen(PORT, () => {
    console.log(`Sonoran CAD Replica server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await db.end();
        console.log('Database connection closed.');
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
});
