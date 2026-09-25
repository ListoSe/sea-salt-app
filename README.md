# Sea Salt (Паперові океани) - Web Game

A web-based multiplayer implementation of the card game "Sea Salt & Paper" for the `sea-salt-app` repository.

## 🚀 Tech Stack
* Frontend: React, TypeScript, JavaScript, Vite, and Tailwind CSS.
* Backend: Node.js (in the `server` directory) with Socket.IO for real-time multiplayer connections.

## 🎮 Features
* Real-time multiplayer card gameplay.
* Card drawing, discarding mechanics, and opponent hand tracking.
* Responsive UI architecture.

## 📸 Screenshots
<img width="1471" height="1124" alt="image" src="https://github.com/user-attachments/assets/806d2ded-bed8-4376-bbbb-355e4c64974d" />
<img width="2559" height="1317" alt="image" src="https://github.com/user-attachments/assets/3259524f-4dbe-4148-b6b8-a9cb781b663b" />

## 🛠️ Installation & Setup

1. **Clone the repository:**
```bash
   git clone [https://github.com/ListoSe/sea-salt-app.git](https://github.com/ListoSe/sea-salt-app.git)
   cd sea-salt-app
```

2. Install dependencies:
```bash
   npm install
   cd server && npm install
```

3. Run the local environment:
Open two separate terminal windows.

Terminal 1 (Backend):
```bash
   cd server
   node index.js
```

Terminal 2 (Frontend):
```bash
   npm run dev
```

🧪 Local Testing
To test multiplayer locally, open http://localhost:5173 in your main browser tab.

Open a second instance in an Incognito/Private window (or another browser) to connect as the second player.

Ensure src/utils/socket.ts has the local URL active:

```typescript
const URL = 'http://localhost:3001';
```

🌍 Deployment
Before deploying to production, you must update the Socket connection URL in src/utils/socket.ts.

Comment out the localhost URL and activate your production Render URL:

```typescript
const URL = '[https://sea-salt-app.onrender.com](https://sea-salt-app.onrender.com)';
```

Build the production files:

```bash
npm run build
```

👨‍💻 Author
Serhii Chernyshov

GitHub Profile - ListoSe
