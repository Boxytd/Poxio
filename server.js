const express = require('express');
const fetch = require('node-fetch');
const peerflix = require('peerflix');
const cors = require('cors');
const path = require('path');

const app = express();
const BACKEND_PORT = 8000;
const PEERFLIX_PORT = 8888;
let engine = null;

// --- Video Streaming Server (No Change) ---
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

// --- Control Server (New Quality-Based Logic) ---
app.use(cors());
app.use(express.json());

app.post('/search', async (req, res) => {
    const { title, year, season, episode } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let searchQuery = (season && episode) ? `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}` : `${title} ${year}`;
    console.log(`[Backend] Quality search for: ${searchQuery}`);

    try {
        const searchUrl = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}&cat=200`;
        const searchResponse = await fetch(searchUrl);
        const torrents = await searchResponse.json();

        if (!torrents || torrents.length === 0 || torrents[0].name === 'No results returned') {
            return res.json([]);
        }

        // --- NEW: Find the best torrent for each quality ---
        let best = { '4K': null, '1080p': null, '720p': null };

        for (const torrent of torrents) {
            const name = torrent.name.toLowerCase();
            const seeders = Number(torrent.seeders);
            let quality = null;

            if (name.includes('2160p') || name.includes('4k')) quality = '4K';
            else if (name.includes('1080p')) quality = '1080p';
            else if (name.includes('720p')) quality = '720p';

            if (quality && (!best[quality] || seeders > best[quality].seeders)) {
                best[quality] = {
                    name: torrent.name,
                    seeders: seeders,
                    infoHash: torrent.info_hash,
                    quality: quality // Add quality property
                };
            }
        }

        // Filter out null results and send the curated list
        const results = Object.values(best).filter(t => t !== null);
        res.json(results);

    } catch (error) {
        console.error('[Backend] Error in /search endpoint:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.get('/stream/:infoHash', (req, res) => {
    if (engine) {
        console.log('[Backend] New stream requested, destroying previous engine...');
        engine.destroy();
        engine = null;
    }
    const { infoHash } = req.params;
    if (!infoHash) return res.status(400).send('Info hash is required.');

    const magnetLink = `magnet:?xt=urn:btih:${infoHash}`;
    console.log(`[Backend] Starting stream for info hash: ${infoHash}`);
    engine = peerflix(magnetLink, {});
    
    // We don't wait for 'ready'. We immediately confirm so the addon can proceed.
    res.json({ message: 'Stream engine initiated.' });
});

app.listen(BACKEND_PORT, '0.0.0.0', () => { console.log(`[Backend] Control server running on port ${BACKEND_PORT}.`); });
