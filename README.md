# PulseFetch - All-in-One Social Media Downloader

**PulseFetch** is an independent, mobile-first, production-ready public social media downloader inspired by clean UI aesthetics, built with vanilla web technologies and powered by Cloudflare Workers & Firebase Realtime Database.

---

## 🚀 Key Features

* **Zero Framework Bloat**: Pure HTML5, Modern CSS3 custom properties, and Vanilla ES6+ JavaScript. No React, Vue, jQuery, or heavy dependencies.
* **White & Purple Premium Identity**: Clean interface featuring high-contrast accessibility, rounded cards, animated loading states, and direct download buttons.
* **Strict Security & Anti-Abuse**:
  * Edge SSRF mitigation (private IP filtering, loopback, AWS/Cloudflare link-local blocks).
  * Sliding-window rate limiter per client IP.
  * No server proxying of multi-gigabyte video files — direct streaming to authorized CDN links with attachment headers.
  * No storage of user media files.
* **Full Legal & Monetization Compliance**:
  * Google AdSense compliant containers and labeled slots.
  * Fully formatted `privacy.html`, `terms.html`, `disclaimer.html`, `about.html`, `contact.html`.
  * `sitemap.xml` and `robots.txt` pre-configured.
* **Firebase Realtime Database Edge Integration**:
  * Read/write operations conducted strictly through trusted serverless edge calls.
  * Zero Firebase SDK or credentials exposed in frontend JavaScript.
  * Firebase Security Rules file `database/database.rules.json` included (`.read: false, .write: false`).
* **Staff Control Center (`/admin.html`)**:
  * Token-authenticated session manager.
  * Live request streaming and metrics (latency, success rate).
  * Toggle Instagram/Facebook resolvers or activate platform maintenance mode.
  * AdSense publisher ID controls.

---

## 📁 Repository Layout

```
pulsefetch/
├── public/                     # Static frontend for Cloudflare Pages
│   ├── css/
│   │   ├── style.css           # Premium purple & white stylesheet
│   │   └── admin.css           # Admin portal layout
│   ├── js/
│   │   ├── app.js              # Vanilla downloader controller
│   │   └── admin.js            # Admin panel controller
│   ├── assets/                 # SVGs and placeholders
│   ├── index.html              # Main downloader
│   ├── admin.html              # Staff portal
│   ├── instagram-downloader.html
│   ├── facebook-downloader.html
│   ├── about.html
│   ├── contact.html
│   ├── privacy.html
│   ├── terms.html
│   ├── disclaimer.html
│   ├── robots.txt
│   └── sitemap.xml
├── functions/                  # Cloudflare Pages Functions (Edge API)
│   └── api/
│       └── v1/
│           ├── detect.js       # Fast URL pattern validation
│           ├── resolve.js      # Public media metadata resolver
│           ├── download.js     # CDN stream redirector with attachment headers
│           ├── status.js       # System health endpoint
│           └── admin/
│               ├── login.js    # Secure PBKDF2 staff login
│               ├── dashboard.js# Real-time request telemetry
│               └── settings.js # Dynamic platform configuration
├── core/
│   ├── security.js             # SSRF protection & input sanitization
│   └── ratelimit.js            # Sliding window IP rate limiter
├── providers/
│   ├── provider-interface.js   # Standard abstract provider
│   ├── instagram.js            # Public Instagram Reel & Photo resolver
│   └── facebook.js             # Public Facebook Watch & Video resolver
├── database/
│   ├── firebase.js             # Backend REST client for Firebase
│   └── database.rules.json     # Firebase Realtime Database security rules
├── ads/
│   └── adsense-config.js       # Centralized AdSense policies and slot manager
├── wrangler.toml               # Cloudflare configuration
└── .env.example                # Sample environment variables
```

---

## 🛠️ Deployment Instructions

### 1. Cloudflare Pages Deployment

1. Commit and push this repository to GitHub.
2. In the Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your repository.
4. Set **Build output directory** to `public`.
5. Under **Environment variables**, define:
   * `FIREBASE_DATABASE_URL`: `https://<YOUR_FIREBASE_PROJECT>.firebaseio.com`
   * `FIREBASE_DATABASE_SECRET`: Your Firebase Database Secret / Auth token
   * `ADMIN_USERNAME`: `admin`
   * `ADMIN_PASSWORD`: `<YOUR_STRONG_PASSWORD>`
6. Deploy! Your site will be active globally with edge functions automatically routed under `/api/v1/*`.

### 2. Firebase Realtime Database Setup

1. In the Firebase Console, create a new project and add a **Realtime Database**.
2. Go to the **Rules** tab and paste the contents of `database/database.rules.json`:
   ```json
   {
     "rules": {
       "Downloader": {
         ".read": false,
         ".write": false
       }
     }
   }
   ```
3. Copy your database URL and secret into Cloudflare Pages settings.

---

## ⚖️ Legal & Copyright Stance

PulseFetch strictly resolves public social media metadata. It does not circumvent DRM, private account settings, or login walls. No video files are permanently cached or duplicated on server storage.
