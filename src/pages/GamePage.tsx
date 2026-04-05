import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/Card";

export function GamePage() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  return (
    <div className="relative size-full min-h-screen overflow-hidden">
      {/* Ocean Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1648435468984-78115657c236?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWVwJTIwb2NlYW4lMjBibHVlJTIwd2F0ZXIlMjB0ZXh0dXJlfGVufDF8fHx8MTc3MjM4MjQwNnww&ixlib=rb-4.1.0&q=80&w=1080')`,
        }}
      >
        {/* Deep blue overlay for texture */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-900/85 to-blue-950/90"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        
        {/* Top Bar */}
        <div className="bg-gray-100/95 backdrop-blur-sm border-b border-gray-200/50 px-6 py-3">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between">
            <div className="flex-1">
                <div className="px-3 py-1 text-blue-700 font-bold text-sm">
                    ROOM: {roomId}
                </div>
            </div>
            
            <div className="flex-1 text-center">
              <p className="text-sm">
                <span className="text-red-600 font-medium">Click on the deck</span>
                <span className="text-gray-800"> to draw a card</span>
              </p>
            </div>
            
            <div className="flex-1 flex items-center justify-end gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 bg-white/50 hover:bg-white/80 rounded-lg border border-gray-300 transition-all"
              >
                &times;
                Exit
              </button>
              <div className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
                Score: 0
              </div>
            </div>
          </div>
        </div>

        {/* Game Board - 3 Column Layout */}
        <div className="flex-1 px-6 py-6">
          <div className="max-w-[1440px] mx-auto h-full">
            <div className="grid gap-5 h-full" style={{ gridTemplateColumns: '280px 1fr 1fr' }}>
              
              {/* LEFT PANEL - Deck Area */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-6 h-full flex flex-col">
                  
                  {/* Deck and Face-up Cards */}
                  <div className="flex flex-col gap-6">
                    {/* Deck Stack */}
                    <div className="flex flex-col items-center">
                      <Card type="deck" highlighted={true} isback={true} />
                      <div className="mt-3 text-center">
                        <span className="text-gray-700 text-sm font-medium bg-gray-200 px-3 py-1 rounded-full">
                          56
                        </span>
                      </div>
                    </div>
                    
                    {/* Face-up Cards */}
                    <div className="flex flex-col gap-3 items-center">
                      <Card type="face-up"/>
                      <Card type="face-up"/>
                    </div>
                  </div>

                  {/* Instruction Tooltip */}
                  <div className="mt-auto pt-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-blue-900 leading-relaxed">
                        Draw a card from the deck or choose one of the face-up cards to add to your hand.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER PANEL - Player Area */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-5 h-full flex flex-col">
                  <h2 className="text-lg font-medium text-gray-800 mb-3 text-center">
                    - You - (Points: 0)
                  </h2>
                  
                  <div className="flex-1 bg-gray-50/50 rounded-lg border border-gray-200 p-4">
                    <div className="text-center text-gray-400 text-sm">
                      Your cards will appear here
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL - Opponent Area */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-5 h-full flex flex-col">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      B
                    </div>
                    <h2 className="text-lg font-medium text-gray-800">
                      Breztoa29 (Points: 0)
                    </h2>
                  </div>
                  
                  <div className="flex-1 bg-gray-50/50 rounded-lg border border-gray-200 p-4">
                    <div className="text-center text-gray-400 text-sm">
                      Opponent's cards
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}