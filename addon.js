const express = require('express');
const cors = require('cors');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

// These public URLs are passed in automatically by the start.sh script.
const PUBLIC_ADDON_URL = process.env.PUBLIC_ADDON_URL;
const PUBLIC_VIDEO_URL = process.env.PUBLIC_VIDEO_URL;

if (!PUBLIC_ADDON_URL || !PUBLIC_VIDEO_URL) {
    console.error("FATAL ERROR: Public URLs were not provided by the start script.");
    process.exit(1);
}

const API_KEY = '028406cf6c26c6b0fb52ff5e12e07d7f';
const LOCAL_IP = '127.0.0.1';
const ADDON_PORT = 7000;
const PEERFLIX_BACKEND_URL = `http://${LOCAL_IP}:8000/stream`;

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

            console.log(`[Public Addon] Request for: ${title} (${year})`);
            await fetch(PEERFLIX_BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, year, season, episode })
            });

            // The addon gives the PUBLIC, SECURE video URL to Stremio.
            const stream = { url: PUBLIC_VIDEO_URL, title: 'Cloudflare Stream (HTTPS)', name: 'Boxy (Public)' };
            return Promise.resolve({ streams: [stream] });
        } catch (error) { console.error(`[Public Addon] Error: ${error.message}`); return Promise.resolve({ streams: [] }); }
    }
    return Promise.resolve({ streams: [] });
};

const manifest = {
    id: 'com.boxy.addon.public.autotunnel',
    version: '10.0.0',
    name: 'Boxy Peerflix (Public Auto-Tunnel)',
    description: 'Streams media securely to any device via a temporary Cloudflare Tunnel.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: []
};

const builder = new addonBuilder(manifest);
builder.defineStreamHandler(streamHandler);
const app = express();
app.use(cors());
app.use(getRouter(builder.getInterface()));

app.listen(ADDON_PORT, '0.0.0.0', () => {
    console.log('');
    console.log('--- ✅ Boxy PUBLIC Addon is Running ---');
    console.log('Install this addon on ANY device (iOS, Web, TV) using your public URL:');
    console.log(PUBLIC_ADDON_URL);
    console.log('--------------------------------------------------');
});
