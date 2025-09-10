​Boxy Peerflix Server (Automated Tunnel Edition)
​A self-hosted, fully automated Stremio addon server designed to run on a low-power device like an Android phone via Termux and Ubuntu Proot. It uses Peerflix for torrent streaming and is powered by Cloudflare's trycloudflare.com for instant, secure public access, making it compatible with any device, including Stremio Web and iOS.
​Features
​One-Command Install: A single command installs the Ubuntu environment, clones the repository, and sets up all dependencies.
​Fully Automated: A single start command launches the media server, addon server, and creates two secure public tunnels.
​iOS & Web Compatible: By tunneling both the addon and the video stream over HTTPS, it works perfectly with browsers and iOS devices.
​Zero Configuration: No need for static IPs, port forwarding, or manual Cloudflare dashboard setup.
​Easy Installation (for Android/Termux)
​This entire server can be set up by pasting one single command into Termux.
​Open Termux and paste the following command block. It will automatically install the Ubuntu environment, clone this repository, and run the installer.
