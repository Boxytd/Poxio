const express = require('express');
const fetch = require('node-fetch');
const peerflix = require('peerflix');
const cors = require('cors');
const path = require('path');
const app = express();
const BACKEND_PORT = 8000;
const PEERFLIX_PORT = 8888;
let engine = null;
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
app.use(express.json());
app.use(cors());
app.post('/stream', async (req, res) => {
    if (engine) {
        console.log('[Media Server] Destroying previous torrent engine...');
        engine.destroy();
        engine = null;
    }
    const { title, year, season, episode } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    let searchQuery = (season && episode) ? `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}` : `${title} ${year}`;
    console.log(`[Media Server] Searching for: ${searchQuery}`);
    try {
        const searchUrl = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}&cat=200`;
        const searchResponse = await fetch(searchUrl);
        const torrents = await searchResponse.json();
        if (!torrents || torrents.length === 0 || torrents[0].name === 'No results returned') { return res.status(404).json({ error: 'No torrents found.' }); }
        const bestTorrent = torrents.sort((a, b) => Number(b.seeders) - Number(a.seeders))[0];
        const magnetLink = `magnet:?xt=urn:btih:${bestTorrent.info_hash}&dn=${encodeURIComponent(bestTorrent.name)}`;
        console.log(`[Media Server] Found best torrent: ${bestTorrent.name}`);
        engine = peerflix(magnetLink);
        engine.on('ready', () => {
            console.log('[Media Server] New torrent engine is ready.');
            res.json({ message: 'Stream engine is ready.' });
        });
        engine.on('error', (err) => { console.error(`[Media Server] Peerflix engine error: ${err.message}`); });
    } catch (error) {
        console.error('[Media Server] Error in /stream endpoint:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});
app.listen(BACKEND_PORT, '0.0.0.0', () => { console.log(`[Media Server] Backend control server running on port ${BACKEND_PORT}.`); });
