# PostureDot Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Local Setup](#local-setup)
5. [Using the Application](#using-the-application)
6. [Available Landmarks / Nodes](#available-landmarks--nodes)
   - [Pose Landmarks (33)](#pose-landmarks-33)
   - [Hand Landmarks (21 per hand)](#hand-landmarks-21-per-hand)
   - [Face Landmarks (468)](#face-landmarks-468)
7. [Harvested Data](#harvested-data)
8. [View Modes & Controls](#view-modes--controls)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)
11. [Environment Variables](#environment-variables)
12. [Troubleshooting](#troubleshooting)

---

## Overview

PostureDot is a browser-based body/face/hand data harvester. It uses your camera and MediaPipe to detect landmarks in real time, stabilizes them with a One-Euro filter, and stores raw data in a backend database. The system is designed to capture as much pose-related information as possible from a video feed.

The entire pipeline runs in the browser for the heavy inference (MediaPipe models), while the backend persists frame data and exposes WebSocket/REST endpoints for integration.

---

## Architecture

```
┌─────────────────────┐      WebSocket/REST      ┌─────────────────────┐
│  Browser (Frontend) │  <──────────────────>  │  FastAPI (Backend)  │
│  - React + Vite     │                        │  - SQLite storage   │
│  - MediaPipe (GPU)  │                        │  - Session/Frame CRUD│
└─────────────────────┘                        └─────────────────────┘
```

- **Frontend**: React, TypeScript, Vite. Runs MediaPipe in the browser via `@mediapipe/tasks-vision`.
- **Backend**: FastAPI, SQLAlchemy, SQLite. Receives landmark frames and stores them.
- **Communication**: HTTP `POST` for frame persistence, WebSocket for live broadcasts.

---

## Features

- **Real-time body/face/hand landmark detection**
- **Body segmentation mask** overlay
- **Muscle overlay** visualization (approximate, derived from landmarks)
- **One-Euro filter stabilization** on every landmark
- **Fullscreen mode**
- **Skeleton-only mode** (hide video feed)
- **Data inspector** showing live harvested info
- **Session persistence** with raw frame storage
- **Fetchable API** via FastAPI, deployable to Render or other hosts

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A webcam
- (Optional) Git for deployment

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

The backend will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

The Vite dev server proxies `/api` and `/ws` to `localhost:8000`, so no extra env configuration is needed for local development.

---

## Using the Application

1. Open the frontend in your browser.
2. Allow camera access when prompted.
3. Wait for the MediaPipe models to download (one-time per browser cache).
4. You will see:
   - Video feed (can be hidden)
   - Skeleton overlay (pose, face, hands)
   - Data inspector panel on the right (desktop)
5. Toggle **Show Muscles** to see approximate muscle overlays.
6. Toggle **Show Segmentation** to see the body silhouette mask.
7. Click **Hide Video** to enter skeleton-only mode.
8. Click **Fullscreen** to expand the view.
9. Click **New Session** to start a fresh data session.
10. Switch to the **Analytics** tab to view stored frames for the current session.

---

## Available Landmarks / Nodes

### Pose Landmarks (33)

MediaPipe Pose returns 33 normalized landmarks per detected person. Each landmark has `x`, `y`, `z`, and `visibility`.

| Index | Name | Index | Name |
|-------|------|-------|------|
| 0 | nose | 17 | left pinky |
| 1 | left eye inner | 18 | right pinky |
| 2 | left eye | 19 | left index |
| 3 | left eye outer | 20 | right index |
| 4 | right eye inner | 21 | left thumb |
| 5 | right eye | 22 | right thumb |
| 6 | right eye outer | 23 | left hip |
| 7 | left ear | 24 | right hip |
| 8 | right ear | 25 | left knee |
| 9 | mouth left | 26 | right knee |
| 10 | mouth right | 27 | left ankle |
| 11 | left shoulder | 28 | right ankle |
| 12 | right shoulder | 29 | left heel |
| 13 | left elbow | 30 | right heel |
| 14 | right elbow | 31 | left foot index |
| 15 | left wrist | 32 | right foot index |
| 16 | right wrist | | |

**Pose connections drawn**:

- Head: 0–1–2–3–7, 0–4–5–6–8
- Mouth: 9–10
- Torso/arms: 11–13–15–17/19/21, 12–14–16–18/20/22, 11–12, 11–23, 12–24, 23–24
- Legs: 23–25–27–29–31, 24–26–28–30–32

### Hand Landmarks (21 per hand)

MediaPipe Hands returns up to 2 hands × 21 landmarks each. Each landmark has `x`, `y`, `z`.

| Index | Name | Index | Name |
|-------|------|-------|------|
| 0 | wrist | 11 | middle finger dip |
| 1 | thumb cmc | 12 | middle finger tip |
| 2 | thumb mcp | 13 | ring finger mcp |
| 3 | thumb ip | 14 | ring finger pip |
| 4 | thumb tip | 15 | ring finger dip |
| 5 | index finger mcp | 16 | ring finger tip |
| 6 | index finger pip | 17 | pinky mcp |
| 7 | index finger dip | 18 | pinky pip |
| 8 | index finger tip | 19 | pinky dip |
| 9 | middle finger mcp | 20 | pinky tip |
| 10 | middle finger pip | | |

**Hand connections drawn**:
- Thumb: 0–1–2–3–4
- Index: 0–5–6–7–8
- Middle: 0–9–10–11–12
- Ring: 0–13–14–15–16
- Pinky: 0–17–18–19–20
- Palm: 5–9–13–17

### Face Landmarks (468)

MediaPipe Face Mesh returns 468 landmarks covering the entire face:

- **0–10**: central face contour / nose bridge
- **11–20**: inner lip and chin
- **21–30**: right eyebrow
- **31–40**: left eyebrow
- **41–70**: eyes (irises, eyelids)
- **71–80**: nose bottom
- **81–90**: upper lip
- **91–100**: lower lip
- **101–127**: left eye region
- **128–154**: right eye region
- **155–168**: face oval contour
- **169–234**: left face region
- **235–288**: nose region
- **289–338**: right face region
- **339–378**: upper lip outline
- **379–418**: lower lip outline
- **419–468**: eyes and eyebrows detail

In the UI, all 468 face landmarks are rendered as small dots.

---

## Harvested Data

The frontend captures the following data per frame and sends it to the backend every 100 ms:

| Data | Description | Source |
|------|-------------|--------|
| Pose landmarks | 33 body points in normalized screen coords | MediaPipe Pose |
| Pose world landmarks | 33 body points in 3D metric coords | MediaPipe Pose |
| Face landmarks | 468 face points in normalized screen coords | MediaPipe Face Mesh |
| Face blendshapes | 52 facial expression categories | MediaPipe Face Mesh |
| Facial transformation matrices | 4×4 matrix for 3D face pose | MediaPipe Face Mesh |
| Hand landmarks | 21 points per hand | MediaPipe Hands |
| Hand world landmarks | 21 points per hand in 3D metric coords | MediaPipe Hands |
| Body segmentation mask | Binary/person mask | MediaPipe Pose |

The backend stores `raw_pose`, `raw_face`, and `raw_hands` as JSON text per frame. The segmentation mask is drawn on the canvas but not persisted (it is not JSON-serializable).

---

## View Modes & Controls

| Button | Effect |
|--------|--------|
| **Hide Video** / **Show Video** | Toggles the camera feed. When hidden, only the skeleton/muscles/segmentation are visible on a dark background. |
| **Show Muscles** / **Hide Muscles** | Draws approximate muscle overlays (trapezius, deltoids, pectorals, abs, biceps). |
| **Show Segmentation** / **Hide Segmentation** | Draws the body segmentation mask as a translucent overlay. |
| **Fullscreen** / **Exit Fullscreen** | Expands the video canvas to full screen. |
| **New Session** | Generates a new session ID and clears current inspector data. |
| **Camera / Analytics tabs** | Switches between live view and stored session data view. |

---

## API Reference

Base URL: `http://localhost:8000` (local) or your deployed URL.

### `POST /api/landmarks`

Store one frame of landmark data.

**Request body**:

```json
{
  "sessionId": "uuid-string",
  "pose": {
    "landmarks": [[{ "x": 0.5, "y": 0.5, "z": 0, "visibility": 0.9 }]],
    "worldLandmarks": [[{ "x": 0.1, "y": 0.2, "z": 0.3, "visibility": 0.9 }]]
  },
  "face": {
    "faceLandmarks": [[{ "x": 0.5, "y": 0.5, "z": 0 }]],
    "faceBlendshapes": [[{ "categories": [{ "categoryName": "jawOpen", "score": 0.1 }] }]],
    "facialTransformationMatrixes": [{ /* 4x4 matrix */ }]
  },
  "hands": {
    "handLandmarks": [[{ "x": 0.5, "y": 0.5, "z": 0 }]],
    "handWorldLandmarks": [[{ "x": 0.1, "y": 0.2, "z": 0.3 }]]
  }
}
```

**Response**:

```json
{ "ok": true }
```

### `GET /api/sessions/{session_id}/summary`

Get session summary.

**Response**:

```json
{
  "session_id": "uuid-string",
  "frame_count": 120,
  "created_at": "2026-07-18T04:43:03.644744"
}
```

### `GET /api/sessions/{session_id}/frames`

Get stored frames for a session.

**Query parameters**:
- `limit` (int, default 1000): maximum frames to return

**Response**:

```json
[
  {
    "timestamp": "2026-07-18T04:43:03.644744",
    "raw_pose": "{...}",
    "raw_face": "{...}",
    "raw_hands": "{...}"
  }
]
```

### `WS /ws/{session_id}`

WebSocket endpoint for live updates. The backend broadcasts a `frame` event whenever a new frame is stored.

**Broadcast message**:

```json
{
  "type": "frame",
  "pose_landmarks": 33,
  "face_landmarks": 468,
  "hand_count": 2
}
```

### `GET /health`

Health check.

**Response**:

```json
{ "status": "ok" }
```

---

## Deployment

### Recommended: Render (free)

1. Push this repo to GitHub.
2. Sign up at [render.com](https://render.com) (free, no credit card required).
3. Create a new **Web Service** from your GitHub repo.
4. Point the service at the `backend/` directory.
5. Render reads `backend/render.yaml`. Update `YOUR_USERNAME` in that file to your GitHub username.
6. Deploy and copy the public URL (e.g. `https://posturedot-api.onrender.com`).
7. In `frontend/.env`, set:
   ```
   VITE_API_URL=https://posturedot-api.onrender.com
   ```
8. Rebuild and deploy the frontend (Vercel, Cloudflare Pages, Render static site, etc.).

### Alternative: Cloudflare Tunnel (expose localhost)

If you want a public URL without deploying:

1. Sign up at [cloudflare.com](https://cloudflare.com) and install `cloudflared`.
2. Run:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```
3. Copy the public URL and set it as `VITE_API_URL` in `frontend/.env`.

### Note on Cloudflare Workers

Cloudflare Workers does **not** natively run Python/FastAPI. Workers supports JavaScript, TypeScript, Rust, and WebAssembly. If you want a Cloudflare-native stack, you would need to rewrite the backend in TypeScript/Hono and use **Cloudflare D1** instead of SQLite.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins. Use `*` for any, or set your frontend domain. |
| `DATABASE_URL` | `sqlite:///./posturedot.db` | SQLAlchemy database URL. Use PostgreSQL in production. |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `''` | Backend base URL with no trailing slash. Empty uses the Vite dev proxy. |

---

## Troubleshooting

### Camera not working

- Make sure you allowed camera permissions in the browser.
- Use `https://` or `localhost` (MediaPipe requires a secure context).
- Close other apps using the camera.

### Models fail to load

- The MediaPipe models and WASM are loaded from CDN. Check your internet connection.
- If the browser blocks third-party requests, add a CDN exception or self-host the models.

### Backend not reachable from deployed frontend

- Set `CORS_ORIGINS` to include your frontend domain (e.g. `https://posturedot.vercel.app`).
- Set `VITE_API_URL` to the backend URL and rebuild the frontend.

### WebSocket not connecting

- Make sure the backend supports WebSocket on the same host/port.
- If using HTTPS frontend, the backend must also be HTTPS for WSS.

### Database errors after schema changes

- Delete the local `backend/posturedot.db` file and restart the backend to recreate the schema.
- On Render, the disk is persistent at `/app/data` when using the provided `render.yaml`.

### Low FPS

- MediaPipe full models are heavier than lite. Close other browser tabs/applications.
- Ensure GPU acceleration is enabled in the browser.
- Reduce video resolution with `getUserMedia` constraints.
