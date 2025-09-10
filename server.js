const express = require('express');
const fetch = require('node-fetch');
const peerflix = require('peerflix');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const BACKEND_PORT = 8000;
const PEERFLIX_PORT = 8888;
let engine = null;

const DOWNLOAD_PATH = path.join(os.homedir(), 'Poxio', 'temp_downloads');

// --- OPTIMIZATION 1: Add a list of reliable public trackers ---
const trackers = [
    'udp://tracker.openbittorrent.com:80',
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://open.tracker.cl:1337/announce',
    'udp://p4p.arenabg.com:1337/announce',
    'udp://tracker.dler.org:6969/announce'
];
const trackerString = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');

const videoServer = express();
videoServer.get('/', (req, res) => {
    if (!engine || !engine.files.length) { return res.status(404).send('Stream not ready.'); }
    const file = engine.files.reduce((a, b) => (a.length > b.length ? a : b));
    const total = file.length;
    console.log(`[Media Server] Streaming file: ${file.name}`);
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunksize = (end - start) + 1;
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${total}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': `video/${path.extname(file.name).slice(1) || 'mp4'}` });
        file.createReadStream({ start, end }).pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': total, 'Content-Type': `video/${path.extname(file.name).slice(1) || 'mp4'}` });
        file.createReadStream().pipe(res);
    }
});
videoServer.listen(PEERFLIX_PORT, '0.0.0.0', () => { console.log(`[Media Server] Video server is running on port ${PEERFLIX_PORT}.`); });

app.use(cors());
app.use(express.json());

app.post('/search', async (req, res) => {
    const { title, year, season, episode } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    let searchQuery = (season && episode) ? `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}` : `${title} ${year}`;
    console.log(`[Backend] Searching for: ${searchQuery}`);
    try {
        const searchUrl = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}&cat=200`;
        const searchResponse = await fetch(searchUrl);
        const torrents = await searchResponse.json();
        if (!torrents || torrents.length === 0 || torrents[0].name === 'No results returned') { return res.json([]); }
        const qualityMap = { '4K': null, '1080p': null, '720p': null };
        torrents.forEach(t => {
            const name = t.name.toLowerCase();
            if ((name.includes('2160p') || name.includes('4k')) && !qualityMap['4K']) qualityMap['4K'] = t;
            else if (name.includes('1080p') && !qualityMap['1080p']) qualityMap['1080p'] = t;
            else if (name.includes('720p') && !qualityMap['720p']) qualityMap['720p'] = t;
        });
        const results = Object.keys(qualityMap).filter(q => qualityMap[q]).map(q => ({ name: qualityMap[q].name, seeders: qualityMap[q].seeders, infoHash: qualityMap[q].info_hash, quality: q }));
        res.json(results);
    } catch (error) { console.error('[Backend] Error in /search endpoint:', error); res.status(500).json({ error: 'An internal server error occurred.' }); }
});

app.get('/start-and-wait/:infoHash', (req, res) => {
    // --- OPTIMIZATION 2: Asynchronous Cleanup ---
    if (engine) {
        const oldEngine = engine;
        // Tell the old engine to clean up in the background after a brief delay.
        setTimeout(() => {
            console.log('[Backend] Asynchronously destroying previous engine...');
            oldEngine.destroy();
        }, 100);
        engine = null;
    }
    
    const { infoHash } = req.params;
    if (!infoHash) return res.status(400).json({ error: 'Info hash is required.' });

    // --- OPTIMIZATION 1 (continued): Append the trackers to the magnet link ---
    const magnetLink = `magnet:?xt=urn:btih:${infoHash}${trackerString}`;
    console.log(`[Backend] Starting stream for: ${infoHash}`);
    
    engine = peerflix(magnetLink, { uploads: 0, path: DOWNLOAD_PATH });

    engine.on('ready', () => {
        console.log('[Backend] Peerflix engine is READY. Sending confirmation.');
        res.json({ status: 'ready' });
    });
    engine.on('error', (err) => {
        console.error(`[Backend] Peerflix engine error: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Peerflix engine failed to start.' });
        }
    });
});

app.listen(BACKEND_PORT, '0.0.0.0', () => { console.log(`[Backend] Control server running on port ${BACKEND_PORT}.`); });
