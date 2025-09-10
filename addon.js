const express = require('express');
const cors = require('cors');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const PUBLIC_ADDON_URL = process.env.PUBLIC_ADDON_URL;
const PUBLIC_VIDEO_URL = process.env.PUBLIC_VIDEO_URL;

if (!PUBLIC_ADDON_URL || !PUBLIC_VIDEO_URL) {
    console.error("FATAL ERROR: Public URLs were not provided by the start script.");
    process.exit(1);
}

const API_KEY = '028406cf6c26c6b0fb52ff5e12e07d7f';
const LOCAL_IP = '127.0.0.1';
const ADDON_PORT = 7000;
const PEERFLIX_BACKEND_URL = `http://${LOCAL_IP}:8000`;

const streamHandler = async (args) => {
    if ((args.type === 'movie' || args.type === 'series') && args.id) {
        try {
            const [imdbId, season, episode] = args.id.split(':');
            const tmdbUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${API_KEY}&external_source=imdb_id`;
            const tmdbResponse = await fetch(tmdbUrl);
            const tmdbData = await tmdbResponse.json();
            let media, title, year;
            if (args.type === 'movie' && tmdbData.movie_results.length > 0) {
                media = tmdbData.movie_results[0];
                title = media.title;
                year = media.release_date ? media.release_date.substring(0, 4) : null;
            } else if (args.type === 'series' && tmdbData.tv_results.length > 0) {
                media = tmdbData.tv_results[0];
                title = media.name;
                year = media.first_air_date ? media.first_air_date.substring(0, 4) : null;
            } else { throw new Error('Media not found on TMDB.'); }

            console.log(`[Addon] Request for: ${title} (${year})`);

            const searchResponse = await fetch(`${PEERFLIX_BACKEND_URL}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, year, season, episode })
            });
            const torrents = await searchResponse.json();
            if (!torrents || torrents.length === 0) { return Promise.resolve({ streams: [] }); }

            const streams = torrents.map(torrent => {
                const playUrl = `${PUBLIC_ADDON_URL}/play/${torrent.infoHash}`;
                const displayTitle = `[${torrent.quality}] [S: ${torrent.seeders}] 🎬\n${torrent.name}`;
                return { name: `Boxy (Public)`, title: displayTitle, url: playUrl };
            });

            return Promise.resolve({ streams });
        } catch (error) { console.error(`[Addon] Error: ${error.message}`); return Promise.resolve({ streams: [] }); }
    }
    return Promise.resolve({ streams: [] });
};

const manifest = {
    id: 'com.boxy.addon.public.final.v3',
    version: '15.0.0', // Long-polling fix
    name: 'Boxy Peerflix (Public Final)',
    description: 'Provides quality-based streams, tunneled securely for all devices.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: []
};

const builder = new addonBuilder(manifest);
builder.defineStreamHandler(streamHandler);
const app = express();
app.use(cors());

// --- DEFINITIVE FIX: Middleman Route with Long-Polling ---
app.get('/play/:infoHash', async (req, res) => {
    const { infoHash } = req.params;
    console.log(`[Addon] Received play request for ${infoHash}, waiting for backend confirmation...`);

    try {
        // This makes ONE call and waits for the backend to respond when it's ready.
        // We add a timeout of 30 seconds to prevent it from waiting forever.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

        const response = await fetch(`${PEERFLIX_BACKEND_URL}/start-and-wait/${infoHash}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.status === 'ready') {
            console.log('[Addon] Backend is ready! Redirecting player.');
            res.redirect(307, PUBLIC_VIDEO_URL);
        } else {
            throw new Error('Backend responded with an unexpected status.');
        }
    } catch (error) {
        console.error(`[Addon] Error waiting for backend: ${error.name === 'AbortError' ? 'Request timed out' : error.message}`);
        res.status(504).send('Server timed out waiting for the stream to become ready.');
    }
});

app.use(getRouter(builder.getInterface()));

app.listen(ADDON_PORT, '0.0.0.0', () => {
    console.log('');
    console.log('--- ✅ Boxy Definitive Addon is Running ---');
    console.log('Install this addon on ANY device (iOS, Web, TV) using your public URL:');
    console.log(PUBLIC_ADDON_URL);
    console.log('--------------------------------------------------');
});
