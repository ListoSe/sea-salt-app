import { Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';
import { GamePage } from './pages/GamePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/game/:roomId" element={<GamePage />} />
    </Routes>
  );
}

export default App;