import { Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
    </Routes>
  );
}

export default App;