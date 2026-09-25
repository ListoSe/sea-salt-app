# Sea Salt (Паперові океани) - Web Game

A web-based multiplayer implementation of the card game "Sea Salt & Paper" for the `sea-salt-app` repository.

## 🚀 Tech Stack
* Frontend: React, TypeScript (65.1%), JavaScript (34.3%), Vite, and Tailwind CSS[cite: 14].
* Backend: Node.js (in the `server` directory) with Socket.IO for real-time multiplayer connections[cite: 14].

## 🎮 Features
* Real-time multiplayer card gameplay.
* Card drawing, discarding mechanics, and opponent hand tracking[cite: 14].
* Responsive UI architecture.

## 📸 Screenshots
> **Note:** Replace this with an actual screenshot of the game.
![Gameplay](./public/screenshot.png)

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

3. Run the development environment:
  ```bash
  # Start frontend (Vite)
  npm run dev

  # Start backend (Node.js)
  cd server && npm start
  ```
