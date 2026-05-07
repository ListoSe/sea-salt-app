import { useEffect, useState } from 'react'; //
import { useNavigate, useParams } from "react-router-dom";
import { socket } from '../utils/socket'; //
import { Card } from "../components/Card";

export function GamePage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [playersCount, setPlayersCount] = useState(0);
  const [deckCount, setDeckCount] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [discards, setDiscards] = useState<number[][]>([[], []])
  const [choosingCards, setChoosingCards] = useState<number[] | null>(null);
  const [myHand, setMyHand] = useState<number[]>([]);
  const [keptCard, setKeptCard] = useState<number | null>(null);
  const [opponentHandCount, setOpponentHandCount] = useState(0);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [myPlayedCards, setMyPlayedCards] = useState<number[]>([]);
  const [oppPlayedCards, setOppPlayedCards] = useState<number[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [myRoundScore, setMyRoundScore] = useState(0);
  const [oppRoundScore, setOppRoundScore] = useState(0);
  const [myTotalScore, setMyTotalScore] = useState(0);
  const [oppTotalScore, setOppTotalScore] = useState(0);
  const [isPickingFromCrab, setIsPickingFromCrab] = useState(false);
  const [viewingStackIndex, setViewingStackIndex] = useState<number | null>(null);

  useEffect(() => {
    socket.connect();
    socket.emit('join-room', roomId);

    socket.on('room-status', (status) => {
      setPlayersCount(status.playersCount);
    });

    socket.on('game-started', (data) => {
      setDiscards(data.discards);
      setIsMyTurn(data.isMyTurn);
      setDeckCount(data.deckCount);
      setOpponentHandCount(0);
      setMyHand([]);
      setMyPlayedCards([]);
      setOppPlayedCards([]);
    });

    socket.on('update-opponent-count', (count) => {
      setOpponentHandCount(count);
    });

    socket.on('choose-card', (cards) => {
      setChoosingCards(cards);
    });

    socket.on('turn-completed', (data) => {
      setDiscards(data.discards);
      setDeckCount(data.deckCount);
      setIsMyTurn(data.nextTurn === socket.id);
      setHasDrawn(data.hasDrawn);
      const opponentId = Object.keys(data.handCounts).find(id => id !== socket.id);
      if (opponentId) {
        setOpponentHandCount(data.handCounts[opponentId]);
      }
    });

    socket.on('update-hand', (hand) => {
      setMyHand(hand);
    });

    socket.on('pair-played', (data) => {
      if (data.handCounts) {
        const opponentId = Object.keys(data.handCounts).find(id => id !== socket.id);
        if (opponentId) setOpponentHandCount(data.handCounts[opponentId]);
      }

      if (data.playerId === socket.id) {
        setMyPlayedCards(prev => [...prev, ...data.cards]);
        setSelectedCards([]);
      } else {
        setOppPlayedCards(prev => [...prev, ...data.cards]);
      }

      if (socket.id && data.scores) {
        setMyRoundScore(data.scores.current[socket.id]);
        const oppId = Object.keys(data.scores.current).find(id => id !== socket.id);
        if (oppId) setOppRoundScore(data.scores.current[oppId]);

        setMyTotalScore(data.scores.total[socket.id]);
        if (oppId) setOppTotalScore(data.scores.total[oppId]);
      }

      switch (data.pairType) {
        case 'boat':
          setHasDrawn(false);
          break;
        case 'crab':
          if (data.playerId === socket.id) {
            setIsPickingFromCrab(true);
          }
          break;
        case 'fish':
          break;

        case 'shark-swimmer':
          break;
      }


    });

    return () => {
      socket.off('room-status');
      socket.off('game-started');
      socket.off('choose-card');
      socket.off('turn-completed');
      socket.off('update-hand');
      socket.off('update-opponent-count');
      socket.off('pair-played');
      socket.disconnect();
    };
  }, [roomId]);

  const handleStartGame = () => {
    socket.emit('start-game', roomId);
  };

  const handleDrawClick = () => {
    if (!isMyTurn || choosingCards !== null || hasDrawn) return; // Якщо не мій хід - нічого не робимо
    socket.emit('request-draw', roomId);
  };

  const handlePickCard = (pickedId: number, discardStackIndex: number) => {
    socket.emit('pick-card', {
      roomId,
      pickedId,
      discardStackIndex
    });
    setChoosingCards(null);
    setKeptCard(null);
  };

  const handleDiscardClick = (stackIndex: number) => {
    const otherStackIndex = stackIndex === 0 ? 1 : 0;

    if (keptCard !== null) {
      const isCurrentStackNotEmpty = discards[stackIndex].length > 0;
      const isOtherStackEmpty = discards[otherStackIndex].length === 0;

      if (isCurrentStackNotEmpty && isOtherStackEmpty) {
        return;
      }
    }
    if (isPickingFromCrab) {
      setViewingStackIndex(stackIndex);
      return;
    }
    if (keptCard !== null) {
      handlePickCard(keptCard, stackIndex);
    } else if (isMyTurn && choosingCards === null && !hasDrawn) {
      socket.emit('pick-discard', { roomId, stackIndex });
    }
  };

  const toggleCardSelection = (cardId: number) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      if (selectedCards.length < 2) {
        setSelectedCards([...selectedCards, cardId]);
      }
    }
  };

  const handlePlayPair = () => {
  if (selectedCards.length === 2) {
    socket.emit('play-pair', { roomId, cards: selectedCards });
    setSelectedCards([]);
  }
};

  const getHintMessage = () => {
    if (playersCount < 2) {
      return <span className="text-gray-500 font-medium animate-pulse">Очікуємо на підключення суперника...</span>;
    }

    if (!isMyTurn) {
      return <span className="text-gray-500 font-medium">Хід суперника. Зачекайте...</span>;
    }

    if (choosingCards !== null) {
      if (keptCard === null) {
        return <span className="text-green-600 font-bold animate-pulse">Крок 1: Виберіть карту, яку хочете залишити.</span>;
      }
      return <span className="text-red-600 font-bold animate-pulse">Крок 2: Клікніть на одну зі стопок скиду.</span>;
    }

    if (selectedCards.length === 2 && choosingCards === null) {
      return (
        <button
          onClick={handlePlayPair}
          className="px-6 py-1 bg-yellow-500 hover:bg-yellow-400 text-white font-black rounded-full transition-all border-2"
        >
          Зіграти пару!
        </button>
      );
    }

    if (hasDrawn) {
      return (
        <div className="flex items-center gap-4">
          <span className="text-red-600 font-bold animate-pulse">Можете зіграти пари або:</span>
          <button
            onClick={handleEndTurn}
            className="px-6 py-1 bg-red-500 hover:bg-red-400 text-white font-black rounded-full transition-all border-2"
          >
            Закінчити хід
          </button>
        </div>
      );
    }

    return (
      <>
        <span className="text-blue-600 font-bold">Ваш хід!</span>
        <span className="text-gray-800"> Візьміть карту або виберіть пару у руці.</span>
      </>
    );

  };

  const getDiscardStyles = (stackIndex: number) => {
    const otherStackIndex = stackIndex === 0 ? 1 : 0;
    if (keptCard !== null && discards[stackIndex].length > 0 && discards[otherStackIndex].length === 0) {
      return "opacity-50 cursor-not-allowed grayscale";
    }
    if (keptCard !== null) {
      return "cursor-pointer ring-4 ring-red-400 animate-pulse hover:scale-105 transition-all rounded-lg";
    }
    if (isMyTurn && !hasDrawn && choosingCards === null) {
      return "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-blue-400 transition-all duration-300 rounded-lg";
    }
    return "";
  };

  const handleEndTurn = () => {
    socket.emit('end-turn', roomId);
    setSelectedCards([]);
  };

  return (
    <div className="relative size-full min-h-screen overflow-hidden">
      {/*Background */}
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
            <div className="flex-1 items-center gap-4 flex">
              <span className="text-blue-700 font-bold">ROOM: {roomId}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${playersCount === 2 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {playersCount === 2 ? '👥 Гравці: 2/2' : '⏳ Очікування суперника (1/2)...'}
              </span>
            </div>
            {playersCount === 2 && deckCount === 0 && (
              <div className="flex-1 flex items-center">
                <button
                  onClick={handleStartGame}
                  className="px-2 py-2 bg-green-500 text-white text-xs font-bold rounded-full hover:scale-105 hover:bg-green-400 transition-all"
                >
                  Почати гру!
                </button>
              </div>
            )}

            <div className="flex-1 text-center bg-white/60 py-1.5 px-4 rounded-full border border-gray-200 shadow-sm mx-4 transition-all">
              <div className="text-sm">
                {getHintMessage()}
              </div>
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
                    <div onClick={handleDrawClick} className={`flex flex-col items-center transition-all duration-300 ${isMyTurn ? 'cursor-pointer hover:scale-105' : 'opacity-50 cursor-not-allowed'}`}>
                      <Card type="deck" highlighted={!hasDrawn && isMyTurn} isback={true} />
                      <div className="mt-3 text-center">
                        <span className="text-gray-700 text-sm font-medium bg-gray-200 px-3 py-1 rounded-full">
                          {deckCount}
                        </span>
                      </div>
                    </div>

                    {/* Face-up Cards */}
                    <div className="flex flex-col gap-3 items-center">
                      {discards[0] && discards[0].length > 0 ? (
                        <div onClick={() => handleDiscardClick(0)} className={getDiscardStyles(0)}>
                          <Card index={discards[0][discards[0].length - 1]} />
                        </div>
                      ) : (
                        <div onClick={() => handleDiscardClick(0)} className={`w-20 h-28 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white/50 text-xs text-gray-400 font-medium relative ${getDiscardStyles(0)}`}>
                          Empty
                        </div>
                      )}

                      {discards[1] && discards[1].length > 0 ? (
                        <div onClick={() => handleDiscardClick(1)} className={getDiscardStyles(1)}>
                          <Card index={discards[1][discards[1].length - 1]} />
                        </div>
                      ) : (
                        <div onClick={() => handleDiscardClick(1)} className={`w-20 h-28 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white/50 text-xs text-gray-400 font-medium relative ${getDiscardStyles(1)}`}>
                          Empty
                        </div>
                      )}
                    </div>
                    {choosingCards && (
                      <div className="w-full mt-2 p-4 bg-blue-50/80 border border-blue-200 rounded-xl shadow-sm flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-300">

                        {keptCard === null ? (
                          /* КРОК 1: Вибір карти в руку */
                          <>
                            <div className="flex gap-4">
                              <div onClick={() => setKeptCard(choosingCards[0])} className="cursor-pointer hover:-translate-y-2 transition-transform">
                                <Card index={choosingCards[0]} highlighted={true} />
                              </div>
                              <div onClick={() => setKeptCard(choosingCards[1])} className="cursor-pointer hover:-translate-y-2 transition-transform">
                                <Card index={choosingCards[1]} highlighted={true} />
                              </div>
                            </div>
                          </>
                        ) : (
                          /* КРОК 2: Вибір скиду для іншої карти */
                          <>
                            <div className="flex gap-4">
                              <Card index={choosingCards.find(id => id !== keptCard)} />
                            </div>
                          </>
                        )}

                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CENTER PANEL - Player Area */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-5 h-full flex flex-col">
                  <h2 className="text-lg font-medium text-gray-800 mb-3 text-center">
                    - You - {myRoundScore} (Total Points: {myTotalScore})
                  </h2>

                  <div className="flex-1 bg-gray-50/50 rounded-lg border border-gray-200 p-4">
                    <div className="text-center text-gray-400 text-sm">
                      <div className="flex flex-wrap gap-2 justify-center">
                          {(myHand.length > 0 || keptCard !== null) ? (
                            <>
                              {myHand.map((cardIndex, i) => {
                                const isSelected = selectedCards.includes(cardIndex);
                                return <Card key={`hand-${i}`} index={cardIndex} {...(choosingCards == null) && {onClick: () => toggleCardSelection(cardIndex), highlighted: isSelected}} />;
                              })}
  
                              {keptCard !== null && (
                                <Card index={keptCard} />
                              )}
                            </>
                          ) : (
                            <div className="text-center text-gray-400 text-sm w-full">
                              Your cards will appear here
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-500 uppercase mb-2 tracking-wider">Твої пари:</p>
                    <div className="flex flex-wrap gap-y-4 justify-center">
                      {myPlayedCards.map((cardIndex, i) => (
                        <div key={`my-played-${i}`} className="scale-75 origin-center -mx-4 first:ml-0">
                          <Card index={cardIndex} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL - Opponent Area */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-5 h-full flex flex-col">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <h2 className="text-lg font-medium text-gray-800">
                      Opponent {oppRoundScore} (Total Points: {oppTotalScore})
                    </h2>
                  </div>

                  <div className="flex-1 bg-gray-50/50 rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {opponentHandCount > 0 ? (
                        Array.from({ length: opponentHandCount }).map((_, i) => (
                          <div key={i} className="transition-all duration-300 transform hover:-translate-y-2">
                            <Card isback={true} />
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 text-sm w-full mt-4">
                          Тут з'являться карти суперника
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-red-50/50 rounded-xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-500 uppercase mb-2 tracking-wider">Пари суперника:</p>
                    <div className="flex flex-wrap gap-y-4 justify-center">
                      {oppPlayedCards.map((cardIndex, i) => (
                        <div key={`opp-played-${i}`} className="scale-75 origin-center -mx-4 first:ml-0">
                          <Card index={cardIndex} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
      {viewingStackIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-10">
          <h2 className="text-white text-3xl font-black mb-10 uppercase tracking-widest">
            Ефект Краба: <span className="text-green-400">Виберіть карту</span>
          </h2>
          
          <div className="flex flex-wrap gap-4 justify-center max-w-6xl overflow-y-auto p-6 bg-white/5 rounded-3xl border border-white/10">
            {discards[viewingStackIndex].map((cardId, idx) => (
              <div 
                key={`${cardId}-${idx}`} 
                onClick={() => {
                  socket.emit('pick-from-discard-crab', { roomId, cardId, stackIndex: viewingStackIndex });
                  setViewingStackIndex(null);
                  setIsPickingFromCrab(false);
                }}
                className="cursor-pointer hover:scale-110 hover:-translate-y-6 transition-all duration-300"
              >
                <Card index={cardId} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}