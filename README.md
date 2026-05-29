# 🎬 sauce.watch - Premium Streaming Catalog & Player

`sauce.watch` is a high-end, responsive, dark-themed streaming catalog and player directory inspired by modern services like `Cineby.sc` and `CineHD.app`. Powered by the TMDB API, it allows users to explore trending movies, TV shows, browse detailed pages, view autoplaying ambient trailers, and stream content using dynamic multi-server embeds.

---

## ✨ Features

- 🌟 **Premium Dark UI**: Built with a sleek monochromatic zinc/black aesthetic, rich layout animations, and full responsiveness across mobile, tablet, and desktop devices.
- 🔍 **Smart Fuzzy Search**: Uses a **Bigram Similarity Coefficient (Dice's Algorithm)** to calculate query matching. Partial matches (e.g., searching for `"Hopper"` will match `"Hoppers"`) are prioritized at the top, falling back to popularity sorting.
- 🎭 **Dynamic Hero Carousel**: An autoplaying slideshow of trending titles featuring backdrop artwork, genre badges, ratings, and a quick-play toggle.
- 📺 **Comprehensive Media Pages**:
  - Immersive full-screen backdrop layout.
  - Autoplay ambient background trailers with dynamic JS postMessage volume controls.
  - Interactive season and episode picker for TV shows.
  - Comprehensive cast listings and smart recommendation grid.
- ⚡ **Hassle-Free Player Embeds**: Responsive cinema mode player supporting multiple embed streams with direct switching (VidSrc, VidLink, Embed.su, and VidSrc.xyz) under custom sandbox permissions to avoid intrusive ads.

---

## 🚀 How to Host & Review

Since `sauce.watch` is fully static (HTML, JS, and Tailwind CSS), you can host it for free on any static host.

### Option 1: GitHub Pages (Recommended)

1. Create a new empty repository on GitHub named `sauce-watch` (or any name you prefer) at **[github.com/new](https://github.com/new)**.
2. Link this local repository and push it by running the following commands in your terminal:
   ```bash
   # Add your remote GitHub repository
   git remote add origin https://github.com/your-username/sauce-watch.git
   
   # Rename default branch to main
   git branch -M main
   
   # Push the code
   git push -u origin main
   ```
3. On GitHub, go to **Settings** > **Pages**.
4. Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
5. Select the **`main`** branch and click **Save**.
6. Your site will be live at `https://your-username.github.io/sauce-watch/` within a couple of minutes!

### Option 2: Live Local Tunnel (Currently Running)

We've set up a secure, public tunnel to preview the local environment right now:
👉 **[Review Live Preview URL](https://a1a72e4f133fa7.lhr.life)**

*Note: The local tunnel runs directly from your machine. If your machine sleeps or the connection restarts, the tunnel URL will change.*

---

## 🛠️ Built With

- **Tailwind CSS** (v3 CDN) for modern styling.
- **FontAwesome** for clean, crisp vectors.
- **TMDB API** for comprehensive movie/TV databases.
