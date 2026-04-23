import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Carica le variabili d'ambiente
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Servi i file statici
app.use('/assets', express.static(join(__dirname, 'assets')));
app.use('/lib', express.static(join(__dirname, 'lib')));

// Routes per le pagine HTML
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, 'admin.html'));
});

app.get('/portfolio', (req, res) => {
    res.sendFile(join(__dirname, 'portfolio.html'));
});

app.get('/collection', (req, res) => {
    res.sendFile(join(__dirname, 'collection.html'));
});

app.get('/journal', (req, res) => {
    res.sendFile(join(__dirname, 'journal.html'));
});

app.get('/chi-siamo', (req, res) => {
    res.sendFile(join(__dirname, 'chi-siamo.html'));
});

app.get('/contatti', (req, res) => {
    res.sendFile(join(__dirname, 'contatti.html'));
});

app.get('/servizi-lab', (req, res) => {
    res.sendFile(join(__dirname, 'servizi-lab.html'));
});

// API Routes proxy al backend Flask
app.get('/api/*', async (req, res) => {
    try {
        const flaskUrl = `http://localhost:5000${req.originalUrl}`;
        const response = await fetch(flaskUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('API Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
