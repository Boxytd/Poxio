Boxy Peerflix Server (Quality-Based Edition)
A self-hosted, fully automated Stremio addon server that provides a curated list of the best 4K, 1080p, and 720p streams for every movie and show. Designed to run on a low-power device like an Android phone via Termux and Ubuntu Proot, it uses Cloudflare's trycloudflare.com for instant, secure public access, making it compatible with any device, including Stremio Web and iOS.
Features
 * Quality-Based Streams: Intelligently finds and displays the best available torrent for 4K, 1080p, and 720p resolutions, prioritized by the highest seeder count.
 * One-Command Install: A single command installs the Ubuntu environment, clones the repository, and sets up all dependencies.
 * Fully Automated: A single start command launches all servers and creates the necessary secure public tunnels.
 * iOS & Web Compatible: By tunneling both the addon and the video stream over HTTPS, it works perfectly with browsers and iOS devices.
 * Zero Configuration: No need for static IPs, port forwarding, or manual Cloudflare dashboard setup.
Easy Installation (for Android/Termux)
This entire server can be set up by pasting one single command into Termux. It will automatically install the Ubuntu environment, clone this repository, and run the installer.
pkg update -y && pkg install proot-distro git -y && proot-distro install ubuntu && proot-distro login ubuntu -- bash -c "apt-get update -y && apt-get install git -y && git clone [https://github.com/Boxytd/Poxio.git](https://github.com/Boxytd/Poxio.git) && cd Poxio && chmod +x install.sh && ./install.sh"

How to Run
After the installation is complete, you only need one command to start the entire server.
 * Log in to your Ubuntu environment:
   proot-distro login ubuntu

 * Navigate to the project directory and run the start script:
   cd Poxio && ./start.sh

The script will automatically create two public tunnels and print the addon installation URL. Use this URL to install the addon in Stremio. You will now see a curated list of 4K, 1080p, and 720p streams for your content.
