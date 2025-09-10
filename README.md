​Boxy Peerflix Server (Automated Tunnel Edition)
​A self-hosted, fully automated Stremio addon server designed to run on a low-power device like an Android phone via Termux and Ubuntu Proot. It uses Peerflix for torrent streaming and is powered by Cloudflare's trycloudflare.com for instant, secure public access, making it compatible with any device, including Stremio Web and iOS.
​Features
​Fully Automated: A single start command launches the media server, addon server, and creates two separate, secure public tunnels.
​iOS & Web Compatible: By tunneling both the addon and the video stream over HTTPS, it works perfectly with browsers and iOS devices which normally block insecure (http) content.
​TV Show & Movie Support: Intelligently searches for content, including specific seasons and episodes.
​Zero Configuration: No need for static IPs, port forwarding, or manual Cloudflare dashboard setup. The entire public-facing infrastructure is created and torn down on demand.
​Lightweight: Designed to run efficiently within a proot environment on Android.
​How It Works
​The system is comprised of three main components orchestrated by a master start.sh script:
​Backend Server (server.js): A simple Express server that receives requests from the addon, uses peerflix to download a torrent from a magnet link, and prepares a video stream on a local port (8888).
​Addon Server (addon.js): A Stremio addon that searches for media metadata. When a user clicks a stream, it tells the backend server to start the download. Crucially, it provides Stremio with a public, secure HTTPS video URL that it receives from the start script.
​Automated Tunnels (start.sh): The start script is the brain of the operation. It launches two separate cloudflared instances to create two temporary trycloudflare.com tunnels:
​One tunnel exposes the Addon Server (port 7000), providing a secure https URL for installation.
​The second tunnel exposes the Video Server (port 8888), providing a secure https URL for the video stream itself.
​The script captures these two randomly generated public URLs and passes them as environment variables to the addon.js server, ensuring the whole system works seamlessly.
​Installation & Usage
​This server is designed to be installed and run inside an Ubuntu environment under proot-distro in Termux.
​After cloning this repository, the setup is simple:
