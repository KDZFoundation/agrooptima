import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3000;
const SECRET = 'super-secret-key-123';

app.use(cors());
app.use(express.json());

// In-memory database
const dbFile = path.join(process.cwd(), 'db.json');
let db: any = {
  users: [],
  clients: [],
  operations: {},
  documents: {},
  fields: {},
  templates: [],
  rates: [],
  crops: []
};

if (fs.existsSync(dbFile)) {
  try {
    db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
  } catch (e) {
    console.error('Failed to load db.json', e);
  }
}

const saveDb = () => {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
};

// --- AUTH ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (db.users.find((u: any) => u.email === email)) {
    return res.status(400).json({ detail: 'Email already registered' });
  }
  const user = { id: Date.now().toString(), email, password, fullName, role };
  db.users.push(user);
  saveDb();
  const token = jwt.sign({ sub: user.id }, SECRET);
  res.json({ token, user: { id: user.id, email, fullName, role } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find((u: any) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }
  const token = jwt.sign({ sub: user.id }, SECRET);
  res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
});

// --- CLIENTS ---
app.get('/api/clients', (req, res) => res.json(db.clients));
app.post('/api/clients', (req, res) => {
  const client = req.body;
  const idx = db.clients.findIndex((c: any) => c.producerId === client.producerId);
  if (idx >= 0) db.clients[idx] = client;
  else db.clients.push(client);
  saveDb();
  res.json(client);
});
app.delete('/api/clients/:id', (req, res) => {
  db.clients = db.clients.filter((c: any) => c.producerId !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

// --- OPERATIONS ---
app.get('/api/clients/:id/operations', (req, res) => res.json(db.operations[req.params.id] || []));
app.post('/api/clients/:id/operations', (req, res) => {
  const op = req.body;
  if (!db.operations[req.params.id]) db.operations[req.params.id] = [];
  const idx = db.operations[req.params.id].findIndex((o: any) => o.id === op.id);
  if (idx >= 0) db.operations[req.params.id][idx] = op;
  else db.operations[req.params.id].push(op);
  saveDb();
  res.json(op);
});
app.delete('/api/clients/:id/operations/:opId', (req, res) => {
  if (db.operations[req.params.id]) {
    db.operations[req.params.id] = db.operations[req.params.id].filter((o: any) => o.id !== req.params.opId);
    saveDb();
  }
  res.json({ ok: true });
});

// --- DOCUMENTS ---
app.post('/api/clients/:id/documents', (req, res) => {
  const doc = req.body;
  if (!db.documents[req.params.id]) db.documents[req.params.id] = [];
  db.documents[req.params.id].push(doc);
  saveDb();
  res.json(doc);
});
app.delete('/api/clients/:id/documents/:docId', (req, res) => {
  if (db.documents[req.params.id]) {
    db.documents[req.params.id] = db.documents[req.params.id].filter((d: any) => d.id !== req.params.docId);
    saveDb();
  }
  res.json({ ok: true });
});

// --- FIELDS ---
app.get('/api/clients/:id/fields', (req, res) => res.json(db.fields[req.params.id] || []));
app.post('/api/clients/:id/fields', (req, res) => {
  db.fields[req.params.id] = req.body;
  saveDb();
  res.json({ ok: true });
});

// --- TEMPLATES ---
app.get('/api/templates', (req, res) => res.json(db.templates));
app.post('/api/templates', (req, res) => {
  const tpl = req.body;
  const idx = db.templates.findIndex((t: any) => t.id === tpl.id);
  if (idx >= 0) db.templates[idx] = tpl;
  else db.templates.push(tpl);
  saveDb();
  res.json(tpl);
});

// --- RATES ---
app.get('/api/rates', (req, res) => res.json(db.rates));
app.post('/api/rates', (req, res) => {
  const rate = req.body;
  const idx = db.rates.findIndex((r: any) => r.id === rate.id);
  if (idx >= 0) db.rates[idx] = rate;
  else db.rates.push(rate);
  saveDb();
  res.json(rate);
});
app.delete('/api/rates/:id', (req, res) => {
  db.rates = db.rates.filter((r: any) => r.id !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

// --- CROPS ---
app.get('/api/crops', (req, res) => res.json(db.crops));
app.post('/api/crops', (req, res) => {
  const crop = req.body;
  const idx = db.crops.findIndex((c: any) => c.id === crop.id);
  if (idx >= 0) db.crops[idx] = crop;
  else db.crops.push(crop);
  saveDb();
  res.json(crop);
});
app.delete('/api/crops/:id', (req, res) => {
  db.crops = db.crops.filter((c: any) => c.id !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

// --- LOGO GENERATION ---
const staticDir = path.join(process.cwd(), 'public', 'static');
if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });

app.post('/api/generate-logo', async (req, res) => {
  try {
    const { prompt, filename } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt
    });
    
    let imageData;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        break;
      }
    }
    
    if (!imageData) {
      return res.status(500).json({ detail: 'No image generated' });
    }
    
    const filepath = path.join(staticDir, filename);
    fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));
    res.json({ url: `/static/${filename}` });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'online', app: 'agrooptima' }));

// Start server with Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
