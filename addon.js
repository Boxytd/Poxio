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

            if (!torrents || torrents.length === 0) {
                return Promise.resolve({ streams: [] });
            }
            
            // Map over the curated list of torrents
            const streams = torrents.map(torrent => {
                const streamUrl = `${PEERFLIX_BACKEND_URL}/stream/${torrent.infoHash}`;
                // NEW: Create a clean, informative title
                const displayTitle = `[${torrent.quality}] [S: ${torrent.seeders}] 🎬\n${torrent.name}`;
                return {
                    name: `Boxy (Public)`,
                    title: displayTitle,
                    url: streamUrl,
                    behaviorHints: {
                        proxyHeaders: { "location": PUBLIC_VIDEO_URL }
                    }
                };
            });

            return Promise.resolve({ streams });

        } catch (error) { console.error(`[Addon] Error: ${error.message}`); return Promise.resolve({ streams: [] }); }
    }
    return Promise.resolve({ streams: [] });
};

const manifest = {
    id: 'com.boxy.addon.public.quality',
    version: '12.0.0',
    name: 'Boxy Peerflix (By Quality)',
    description: 'Provides the best 4K, 1080p, and 720p streams, tunneled via Cloudflare.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: []
};

const builder = new addonBuilder(manifest);
builder.defineStreamHandler(streamHandler);
const app = express();
app.use(cors());
app.use((req, res, next) => {
    if (req.path.startsWith('/stream/')) {
        if (res.get('location')) {
            return res.redirect(307, res.get('location'));
        }
    }
    next();
}, getRouter(builder.getInterface()));

app.listen(ADDON_PORT, '0.0.0.0', () => {
    console.log('');
    console.log('--- ✅ Boxy Quality-Based Addon is Running ---');
    console.log('Install this addon on ANY device (iOS, Web, TV) using your public URL:');
    console.log(PUBLIC_ADDON_URL);
    console.log('--------------------------------------------------');
});
