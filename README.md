Markdown
# Sea Salt (Паперові океани) - Web Game

A web-based multiplayer implementation of the card game "Sea Salt & Paper" for the `sea-salt-app` repository.

## 🚀 Tech Stack
* Frontend: React, TypeScript, JavaScript, Vite, and Tailwind CSS.
* Backend: Node.js (in the `server` directory) with Socket.IO for real-time multiplayer connections.

## 🎮 Features
* Real-time multiplayer card gameplay.
* Card drawing, discarding mechanics, and opponent hand tracking.
* Responsive UI architecture.

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/ListoSe/sea-salt-app.git](https://github.com/ListoSe/sea-salt-app.git)
   cd sea-salt-app
Install dependencies:

Bash
npm install
cd server && npm install
Run the local environment:
Open two separate terminal windows.

Terminal 1 (Backend):

Bash
cd server
node index.js
Terminal 2 (Frontend):

Bash
npm run dev
🧪 Local Testing
To test multiplayer locally, open http://localhost:5173 in your main browser tab.

Open a second instance in an Incognito/Private window (or another browser) to connect as the second player.

Ensure src/utils/socket.ts has the local URL active:

TypeScript
const URL = 'http://localhost:3001';
🌍 Deployment
Before deploying to production, you must update the Socket connection URL in src/utils/socket.ts.

Comment out the localhost URL and activate your production Render URL:

TypeScript
const URL = '[https://sea-salt-app.onrender.com](https://sea-salt-app.onrender.com)';
Build the production files:

Bash
npm run build
👨‍💻 Author
Serhii Chernyshov

GitHub Profile - ListoSe
