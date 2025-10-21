const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

const dbConfig = {
  host: 'db4free.net',
  user: 'cwelcwelski',
  password: 'cwelcwelski',
  database: 'cwelcwelski'
};
let db;

async function initDatabase() {
  db = await mysql.createConnection(dbConfig);
  console.log('Connected to MySQL database.');

  await db.query(`
    CREATE TABLE IF NOT EXISTS civilians (
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
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS criminal_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      civilian_id INT,
      record_number VARCHAR(255) UNIQUE NOT NULL,
      incident_date DATE,
      incident_time TIME,
      location TEXT,
      arresting_officer VARCHAR(255),
      department VARCHAR(255),
      charges TEXT,
      narrative TEXT,
      status VARCHAR(50) DEFAULT 'Active',
      flags TEXT,
      FOREIGN KEY (civilian_id) REFERENCES civilians(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      civilian_id INT,
      plate VARCHAR(50) UNIQUE NOT NULL,
      model VARCHAR(100) NOT NULL,
      color VARCHAR(50),
      registration_status VARCHAR(50) DEFAULT 'Valid',
      insurance_status VARCHAR(50) DEFAULT 'Valid',
      notes TEXT,
      FOREIGN KEY (civilian_id) REFERENCES civilians(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS citations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      civilian_id INT,
      citation_number VARCHAR(255) UNIQUE NOT NULL,
      citation_date DATE,
      citation_time TIME,
      location TEXT,
      issuing_officer VARCHAR(255),
      department VARCHAR(255),
      violation TEXT,
      fine_amount DECIMAL(10,2),
      notes TEXT,
      status VARCHAR(50) DEFAULT 'Unpaid',
      FOREIGN KEY (civilian_id) REFERENCES civilians(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bolos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      civilian_id INT,
      bolo_number VARCHAR(255) UNIQUE NOT NULL,
      reason TEXT,
      description TEXT,
      last_known_location TEXT,
      issuing_officer VARCHAR(255),
      department VARCHAR(255),
      priority VARCHAR(50) DEFAULT 'Medium',
      status VARCHAR(50) DEFAULT 'Active',
      FOREIGN KEY (civilian_id) REFERENCES civilians(id) ON DELETE CASCADE
    )
  `);
}
initDatabase();

// === UNIWERSALNE FUNKCJE ===
function safe(value) { return value ? value : null; }
function randomCode(prefix) {
  return prefix + '-' + Math.random().toString(36).substring(2,8).toUpperCase();
}

// === CIVILIANS CRUD ===
app.get('/api/civilians', async (req,res)=>{
  const q=req.query.search||'';
  const [rows]=await db.query(
    `SELECT * FROM civilians WHERE game_nick LIKE ? OR first_name LIKE ? OR last_name LIKE ? ORDER BY id DESC`,
    [`%${q}%`,`%${q}%`,`%${q}%`]
  );
  res.json(rows);
});

app.get('/api/civilians/search/:nick', async (req,res)=>{
  const [r]=await db.query('SELECT * FROM civilians WHERE game_nick=?',[req.params.nick]);
  if(!r.length) return res.status(404).json({error:'Not found'});
  res.json(r[0]);
});

app.post('/api/civilians', async (req,res)=>{
  const c=req.body;
  try{
    const [r]=await db.query(
      `INSERT INTO civilians(game_nick,first_name,last_name,date_of_birth,gender,address,phone_number,license_status,notes,is_bolo,bolo_reason,warning_flags)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
      [c.game_nick,safe(c.first_name),safe(c.last_name),safe(c.date_of_birth),
       safe(c.gender),safe(c.address),safe(c.phone_number),c.license_status||'Valid',
       safe(c.notes),c.is_bolo?1:0,safe(c.bolo_reason),safe(c.warning_flags)]
    );
    res.json({id:r.insertId});
  }catch(e){res.status(400).json({error:e.message});}
});

app.put('/api/civilians/:id', async (req,res)=>{
  const c=req.body;
  await db.query(
    `UPDATE civilians SET first_name=?,last_name=?,date_of_birth=?,gender=?,address=?,phone_number=?,license_status=?,notes=?,is_bolo=?,bolo_reason=?,warning_flags=? WHERE id=?`,
    [safe(c.first_name),safe(c.last_name),safe(c.date_of_birth),safe(c.gender),
     safe(c.address),safe(c.phone_number),c.license_status||'Valid',
     safe(c.notes),c.is_bolo?1:0,safe(c.bolo_reason),safe(c.warning_flags),req.params.id]
  );
  res.json({message:'updated'});
});

app.delete('/api/civilians/:id', async (req,res)=>{
  await db.query('DELETE FROM civilians WHERE id=?',[req.params.id]);
  res.json({message:'deleted'});
});

app.get('/api/civilians/:id/records', async (req,res)=>{
  const [r]=await db.query('SELECT * FROM criminal_records WHERE civilian_id=?',[req.params.id]);
  res.json(r);
});
app.get('/api/civilians/:id/citations', async (req,res)=>{
  const [r]=await db.query('SELECT * FROM citations WHERE civilian_id=?',[req.params.id]);
  res.json(r);
});
app.get('/api/civilians/:id/bolos', async (req,res)=>{
  const [r]=await db.query('SELECT * FROM bolos WHERE civilian_id=?',[req.params.id]);
  res.json(r);
});

// === CRIMINAL RECORDS ===
app.get('/api/records', async (req,res)=>{
  const [r]=await db.query(
    `SELECT cr.*, c.game_nick FROM criminal_records cr
     JOIN civilians c ON cr.civilian_id=c.id ORDER BY id DESC`);
  res.json(r);
});

app.post('/api/records', async (req,res)=>{
  const d=req.body;
  const num=randomCode('REC');
  await db.query(
    `INSERT INTO criminal_records(civilian_id,record_number,incident_date,incident_time,location,arresting_officer,department,charges,narrative,status,flags)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [d.civilian_id,num,d.incident_date,d.incident_time,d.location,d.arresting_officer,d.department,d.charges,d.narrative,d.status,d.flags]);
  res.json({record_number:num});
});

app.put('/api/records/:id', async (req,res)=>{
  const d=req.body;
  await db.query(
    `UPDATE criminal_records SET incident_date=?,incident_time=?,location=?,arresting_officer=?,department=?,charges=?,narrative=?,status=?,flags=? WHERE id=?`,
    [d.incident_date,d.incident_time,d.location,d.arresting_officer,d.department,d.charges,d.narrative,d.status,d.flags,req.params.id]);
  res.json({message:'updated'});
});

app.delete('/api/records/:id', async (req,res)=>{
  await db.query('DELETE FROM criminal_records WHERE id=?',[req.params.id]);
  res.json({message:'deleted'});
});

// === CITATIONS ===
app.get('/api/citations', async (req,res)=>{
  const [r]=await db.query(`SELECT ct.*,c.game_nick FROM citations ct JOIN civilians c ON ct.civilian_id=c.id ORDER BY id DESC`);
  res.json(r);
});

app.post('/api/citations', async (req,res)=>{
  const d=req.body;
  const num=randomCode('CT');
  await db.query(
    `INSERT INTO citations(civilian_id,citation_number,citation_date,citation_time,location,issuing_officer,department,violation,fine_amount,notes,status)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [d.civilian_id,num,d.citation_date,d.citation_time,d.location,d.issuing_officer,d.department,d.violation,d.fine_amount,d.notes,d.status]);
  res.json({citation_number:num});
});

app.put('/api/citations/:id', async (req,res)=>{
  const d=req.body;
  await db.query(
    `UPDATE citations SET citation_date=?,citation_time=?,location=?,issuing_officer=?,department=?,violation=?,fine_amount=?,notes=?,status=? WHERE id=?`,
    [d.citation_date,d.citation_time,d.location,d.issuing_officer,d.department,d.violation,d.fine_amount,d.notes,d.status,req.params.id]);
  res.json({message:'updated'});
});

app.delete('/api/citations/:id', async (req,res)=>{
  await db.query('DELETE FROM citations WHERE id=?',[req.params.id]);
  res.json({message:'deleted'});
});

// === BOLO ===
app.get('/api/bolos', async (req,res)=>{
  const [r]=await db.query(`SELECT b.*,c.game_nick FROM bolos b JOIN civilians c ON b.civilian_id=c.id ORDER BY id DESC`);
  res.json(r);
});

app.post('/api/bolos', async (req,res)=>{
  const d=req.body;
  const num=randomCode('BOLO');
  await db.query(
    `INSERT INTO bolos(civilian_id,bolo_number,reason,description,last_known_location,issuing_officer,department,priority,status)
     VALUES(?,?,?,?,?,?,?,?,?)`,
    [d.civilian_id,num,d.reason,d.description,d.last_known_location,d.issuing_officer,d.department,d.priority,d.status]);
  res.json({bolo_number:num});
});

app.put('/api/bolos/:id', async (req,res)=>{
  const d=req.body;
  await db.query(
    `UPDATE bolos SET reason=?,description=?,last_known_location=?,issuing_officer=?,department=?,priority=?,status=? WHERE id=?`,
    [d.reason,d.description,d.last_known_location,d.issuing_officer,d.department,d.priority,d.status,req.params.id]);
  res.json({message:'updated'});
});

app.delete('/api/bolos/:id', async (req,res)=>{
  await db.query('DELETE FROM bolos WHERE id=?',[req.params.id]);
  res.json({message:'deleted'});
});

// === VEHICLES ===
app.get('/api/vehicles', async (req,res)=>{
  const [r]=await db.query(`SELECT v.*,c.game_nick FROM vehicles v LEFT JOIN civilians c ON v.civilian_id=c.id ORDER BY id DESC`);
  res.json(r);
});

app.post('/api/vehicles', async (req,res)=>{
  const d=req.body;
  await db.query(
    `INSERT INTO vehicles (civilian_id,plate,model,color,registration_status,insurance_status,notes)
     VALUES (?,?,?,?,?,?,?)`,
    [d.civilian_id,d.plate,d.model,d.color,d.registration_status,d.insurance_status,d.notes]);
  res.json({message:'added'});
});

app.get('/api/civilians/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM civilians WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const civ = rows[0];
    civ.is_bolo = civ.is_bolo ? 1 : 0;   // 👈 zamiana null/true/false → 1/0
    res.json(civ);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching civilian' });
  }
});

app.listen(PORT,()=>console.log('Server running on port',PORT));
