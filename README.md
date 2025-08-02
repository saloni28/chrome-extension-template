# Chrome Extension + Flask Backend Starter (with Google OAuth + Cloud Run)

A complete template to build a secure Chrome Extension that fetches data from a Python Flask backend hosted on Google Cloud Run using Google OAuth authentication.

Built for real-world use cases like pricing analysis, product intelligence, and workflow automation.

---

## 🔧 Features

- 🛡️ Google OAuth 2.0 login using `chrome.identity.launchWebAuthFlow`
- 🔒 ID token verification in backend (Flask + Firebase Admin SDK or Google Auth)
- 🚀 Backend API protected by Cloud Run + Identity-Aware Proxy
- 📊 Backend integrates with BigQuery and Google Secret Manager
- 📈 Popup displays charts, tables, and real-time data
- 🔁 Token caching for smoother re-authentication

---

## 📁 Folder Structure
├── extension/ # Chrome extension frontend
│ ├── manifest.json # Manifest v3 config
│ ├── popup.html # UI for popup
│ ├── popup.js # Frontend logic
│ ├── background.js # OAuth + fetch logic
│ └── icons/ # Extension icon files
│
├── backend/ # Python Flask backend
│ ├── main.py # Flask app with routes
│ ├── requirements.txt # Python dependencies
│ └── Dockerfile # For Cloud Run deployment

## 🔐 Setup: Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new **OAuth Client ID** (type: Web Application)
3. Set the **Authorized redirect URI** to:
https://<YOUR_EXTENSION_ID>.chromiumapp.org/
4. Replace the `oauth2.client_id` in `manifest.json`

---

## 🔧 Setup: Cloud Run + Flask

1. Create a GCP project with BigQuery + Secret Manager enabled
2. Add your BigQuery service account key to Secret Manager
3. Deploy the Flask app to Cloud Run with authentication required
4. Add your OAuth client ID as the `audience` in `main.py`

---

## ▶️ How it Works

1. User installs the extension and logs in with Google
2. Extension gets an `id_token` and sends it to the Flask backend
3. Backend verifies the token and serves BigQuery data
4. Data is displayed as interactive charts + tables in the popup

---

## 🧪 Example Use Cases

- Internal tools for pricing/product teams
- Sales intelligence dashboards
- Secure UI wrappers around BigQuery or ML models
- Real-time data injectors for your browser

---

## 🚧 TODO / Contributions Welcome

- Add reusable chart rendering using Chart.js
- Add OAuth login fallback / error handler
- Add backend logging via Cloud Logging

---

## 🧠 Credits & Inspiration

Created by [@SaloniKataria](https://github.com/SaloniKataria)  
Inspired by building internal AI + analytics tools that save time and reduce context switching.

---

## 📄 License

MIT License – feel free to fork, modify, or contribute.

