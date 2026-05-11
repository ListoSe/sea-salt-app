import { useState } from 'react';
import { socket } from '../utils/socket';
import { useNavigate } from 'react-router-dom';
import { RulesModal } from '../components/Rules';
import logoImage from '../assets/en_280.png';
import TitleImage from '../assets/fot2.png';
import Rules from '../assets/fot3.png';

export default function MainMenu() {
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();

  const handleCreateGame = () => {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    if (!socket.connected) socket.connect();
    socket.emit('create-room', roomId);
    socket.once('room-created', (id) => {
      navigate(`/game/${id}`);
    });
    socket.once('join-error', (msg) => alert(msg));
  };

  const handleJoinGame = () => {
    const code = prompt("Введіть 4-значний код кімнати:");
    if (code && code.length === 4) {
      if (!socket.connected) socket.connect();
      socket.emit('check-room', code.toUpperCase());

      socket.once('room-exists', (id) => {
        navigate(`/game/${id}`);
      });

      socket.once('join-error', (msg) => {
        alert(msg);
      });
    } else if (code) {
      alert("Код має складатися з 4 символів!");
    }
  };

  return (
    <div className="relative size-full min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1648435468984-78115657c236?q=80&w=1080')` }}>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-900/85 to-blue-950/90"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="mb-12 text-center">
          <img src={logoImage} alt="Logo" className="w-64 h-64 md:w-80 md:h-80 object-contain mix-blend-screen mb-6" />
          <img src={TitleImage} alt="Title" className="w-64 md:w-80 h-auto object-contain mix-blend-screen" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button 
            onClick={handleCreateGame}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            Create Game
          </button>
          <button 
            onClick={handleJoinGame}
            className="flex-1 bg-white/10 backdrop-blur-md text-white border-2 border-white/30 px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            Join Game
          </button>
        </div>

        <div className="mt-8 w-full max-w-md" onClick={() => setShowRules(true)}>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-400/30">📄</div>
              <div>
                <h3 className="text-white font-medium">Game Rules</h3>
                <p className="text-blue-200/50 text-xs uppercase">PNG FORMAT</p>
              </div>
            </div>
          </div>
        </div>

        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} rulesImage={Rules} />
        <p className="text-blue-300/50 text-sm tracking-wide mt-12">Dive into the adventure</p>
      </div>
    </div>
  );
}