import { useEffect, useMemo, useState } from 'react'; //
import { useNavigate, useParams } from "react-router-dom";
import { socket } from '../utils/socket'; //
import { Card } from "../components/Card";

const fetchOrCreateUserId = () => {
  let id = localStorage.getItem('userId');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', id);
  }
  return id;
};

export function GamePage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const userId = useMemo(() => fetchOrCreateUserId(), []);
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
  const [privateScore, setPrivateScore] = useState(0);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [lastChanceData, setLastChanceData] = useState<{ callerId: string } | null>(null);
  const [roundResults, setRoundResults] = useState<{
    results: { userId: string, score: number }[],
    type: 'STOP' | 'LAST_CHANCE' | 'MERMAID_WIN',
    totalScores: Record<string, number>
  } | null>(null);
  const [totalWinner, setTotalWinner] = useState<{
    winnerId: string,
    finalScores: Record<string, number>
  } | null>(null);

  useEffect(() => {
    socket.io.opts.query = { userId };
    socket.connect();
    socket.emit('join-room', roomId);

    socket.on('reconnect-game', (data) => {
      console.log("Реконект успішний, відновлюємо стан...");
      const { hand, roomData, privateScore } = data;

      setGameState(roomData.gameState);
      setMyHand(hand);
      setDiscards(roomData.discards);
      setDeckCount(roomData.deckCount);
      setIsMyTurn(roomData.nextTurn === userId);
      setHasDrawn(roomData.hasDrawn);

      if (roomData.lastChanceActive) {
        setLastChanceData({ callerId: roomData.callerId });
      } else {
        setLastChanceData(null);
      }

      const oppId = Object.keys(roomData.handCounts).find(id => id !== userId);
      if (oppId) {
        setOpponentHandCount(roomData.handCounts[oppId]);
      }

      if (roomData.choosingCards) {
        setChoosingCards(roomData.choosingCards);
      }

      if (roomData.isPickingFromCrab) {
        setIsPickingFromCrab(true);
      }

      if (roomData.currentScores) {
        setMyRoundScore(roomData.currentScores[userId] || 0);
        if (oppId) setOppRoundScore(roomData.currentScores[oppId] || 0);
      }

      if (privateScore) setPrivateScore(privateScore);

      if (roomData.totalScores) {
        setMyTotalScore(roomData.totalScores[userId] || 0);
        if (oppId) setOppTotalScore(roomData.totalScores[oppId] || 0);
      }

      if (roomData.playedCards) {
        setMyPlayedCards(roomData.playedCards[userId] || []);
        if (oppId) {
          setOppPlayedCards(roomData.playedCards[oppId] || []);
        }
      }
    });

    socket.on('join-error', (message) => {
      alert(message);
      navigate('/');
    });

    socket.on('room-status', (status) => {
      setPlayersCount(status.playersCount);
      setGameState(status.gameState);
    });

    socket.on('game-started', (data) => {
      setGameState('playing');
      setRoundResults(null);
      setDiscards(data.discards);
      setIsMyTurn(data.isMyTurn);
      setDeckCount(data.deckCount);
      setOpponentHandCount(0);
      setMyHand([]);
      setMyPlayedCards([]);
      setOppPlayedCards([]);
      setHasDrawn(false);
      setMyRoundScore(0);
      setOppRoundScore(0);
      setPrivateScore(0);
      setLastChanceData(null);
      if (data.totalScores) {
        setMyTotalScore(data.totalScores[userId] || 0);
        const oppId = Object.keys(data.totalScores).find(id => id !== userId);
        if (oppId) {
          setOppTotalScore(data.totalScores[oppId] || 0);
        }
      }
    });

    socket.on('update-opponent-count', (count) => {
      setOpponentHandCount(count);
    });

    socket.on('update-private-score', (data) => {
      setPrivateScore(data.privateScore);
    });

    socket.on('choose-card', (cards) => {
      setChoosingCards(cards);
    });

    socket.on('turn-completed', (data) => {
      setDiscards(data.discards);
      setDeckCount(data.deckCount);
      setIsMyTurn(data.nextTurn === userId);
      setHasDrawn(data.hasDrawn);
      const opponentId = Object.keys(data.handCounts).find(id => id !== userId);
      if (opponentId) {
        setOpponentHandCount(data.handCounts[opponentId]);
      }
    });

    socket.on('update-hand', (hand) => {
      setMyHand(hand);
    });

    socket.on('pair-played', (data) => {
      if (data.handCounts) {
        const opponentId = Object.keys(data.handCounts).find(id => id !== userId);
        if (opponentId) setOpponentHandCount(data.handCounts[opponentId]);
      }

      if (data.playerId === userId) {
        setMyPlayedCards(prev => [...prev, ...data.cards]);
        setSelectedCards([]);
      } else {
        setOppPlayedCards(prev => [...prev, ...data.cards]);
      }

      if (userId && data.scores) {
        setMyRoundScore(data.scores.current[userId]);
        const oppId = Object.keys(data.scores.current).find(id => id !== userId);
        if (oppId) setOppRoundScore(data.scores.current[oppId]);
      }

      switch (data.pairType) {
        case 'boat':
          setHasDrawn(false);
          break;
        case 'crab':
          if (data.playerId === userId) {
            setIsPickingFromCrab(true);
          }
          break;
        case 'fish':
          break;

        case 'shark-swimmer':
          break;
      }


    });

    socket.on('last-chance-started', (data) => {
      setLastChanceData({ callerId: data.callerId });
      setIsMyTurn(data.nextTurn === userId);
      setHasDrawn(false);
    });

    socket.on('round-ended', (data) => {
      console.log("Раунд завершено:", data);

      if (data.totalScores) {
        setMyTotalScore(data.totalScores[userId] || 0);
        const oppId = Object.keys(data.totalScores).find(id => id !== userId);
        if (oppId) setOppTotalScore(data.totalScores[oppId] || 0);
      }
      setRoundResults(data);
    });

    socket.on('game-over', (data) => {
      setGameState('finished');
      alert(data.reason === 'MERMAID_WIN' ? "Миттєва перемога русалками!" : "Гра закінчена!");
    });

    socket.on('total-game-over', (data) => {
      console.log("ГРА ЗАКІНЧЕНА! Переможець:", data.winnerId);
      setGameState('finished');
      setTotalWinner(data);
    });

    return () => {
      socket.off('reconnect-game');
      socket.off('join-error');
      socket.off('room-status');
      socket.off('game-started');
      socket.off('update-opponent-count');
      socket.off('update-private-score');
      socket.off('choose-card');
      socket.off('turn-completed');
      socket.off('update-hand');
      socket.off('pair-played');
      socket.off('last-chance-started');
      socket.off('round-ended');
      socket.off('game-over');
      socket.off('total-game-over');
      socket.disconnect();
    };
  }, [roomId, userId, navigate]);

  const handleStartGame = () => {
    socket.emit('start-game', roomId);
  };

  const handleDrawClick = () => {
    if (!isMyTurn || choosingCards !== null || hasDrawn) return;
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
      if (lastChanceData) {
        return <span className="text-gray-400 italic">Суперник робить фінальний хід...</span>;
      }
      return <span className="text-gray-500 font-medium">Хід суперника. Зачекайте...</span>;
    }

    if (choosingCards !== null) {
      if (keptCard === null) {
        return <span className="text-green-600 font-bold animate-pulse">Крок 1: Виберіть карту, яку хочете залишити.</span>;
      }
      return <span className="text-red-600 font-bold animate-pulse">Крок 2: Клікніть на одну зі стопок скиду.</span>;
    }

    if (isPickingFromCrab) {
      return <span className="text-purple-600 font-bold animate-pulse">Ви активували ефект Краба! Виберіть скид.</span>;
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

    if (lastChanceData) {
      if (!hasDrawn) {
        return <span className="text-red-600 font-black animate-bounce uppercase">🚨 Ваш фінальний хід! Візьміть карту.</span>;
      }
      return (
        <div className="flex items-center gap-3">
          <span className="text-red-600 font-bold text-xs uppercase">Час підбивати підсумки:</span>
          <button
            onClick={handleEndTurn}
            className="px-6 py-1 bg-red-600 hover:bg-red-700 text-white font-black rounded-full transition-all shadow-md border-b-2 border-red-800 active:border-0"
          >
            ЗАВЕРШИТИ РАУНД
          </button>
        </div>
      );
    }

    if (hasDrawn && privateScore >= 7) {
      return (
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleEndRound('STOP')}
            className="px-6 py-2 bg-white text-blue-900 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-lg border-b-4 border-gray-400 active:border-b-0"
          >
            СТОП
          </button>
          <button
            onClick={() => handleEndRound('LAST_CHANCE')}
            className="px-6 py-2 bg-yellow-400 text-blue-900 font-black rounded-xl hover:bg-yellow-300 transition-all shadow-lg border-b-4 border-yellow-600 active:border-b-0"
          >
            ОСТАННІЙ ШАНС
          </button>
          <button
            onClick={handleEndTurn}
            className="px-6 py-1 bg-red-500 hover:bg-red-400 text-white font-black rounded-full transition-all border-2"
          >
            Закінчити хід
          </button>
        </div>
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
    if (isPickingFromCrab) {
      return "cursor-pointer hover:scale-105 hover:ring-4 hover:ring-purple-400 transition-all duration-300 rounded-lg";
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

  const handleEndRound = (type: 'STOP' | 'LAST_CHANCE') => {
    socket.emit('declare-end-round', { roomId, type });
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
            {playersCount === 2 && gameState === 'waiting' && (
              <div className="flex-1 flex items-center">
                <button
                  onClick={handleStartGame}
                  className="px-2 py-2 bg-green-500 text-white text-xs font-bold rounded-full hover:scale-105 hover:bg-green-400 transition-all"
                >
                  Почати гру!
                </button>
              </div>
            )}

            <div className="w-fit text-center bg-white/60 py-1.5 px-4 rounded-full border border-gray-200 shadow-sm mx-4 transition-all">
              <div className="text-sm">
                {getHintMessage()}
              </div>
            </div>

            {lastChanceData && (
              <div className="bg-red-500/90 backdrop-blur-md py-1.5 px-5 rounded-full border border-red-400 shadow-md flex items-center gap-2 h-8">
                <span className="text-xs">🚨</span>
                <span className="text-white text-sm font-bold tracking-tight whitespace-nowrap">
                  Останній шанс активовано!
                </span>
                <span className="text-xs">🚨</span>
              </div>
            )}

            <div className="flex-1 flex items-center justify-end gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 bg-white/50 hover:bg-white/80 rounded-lg border border-gray-300 transition-all"
              >
                &times;
                Exit
              </button>
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
                    You {privateScore} (Total Points: {myTotalScore})
                  </h2>

                  <div className="flex-1 bg-gray-50/50 rounded-lg border border-gray-200 p-4">
                    <div className="text-center text-gray-400 text-sm">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {(myHand.length > 0 || keptCard !== null) ? (
                          <>
                            {myHand.map((cardIndex, i) => {
                              const isSelected = selectedCards.includes(cardIndex);
                              return <Card key={`hand-${i}`} index={cardIndex} {...(choosingCards == null) && { onClick: () => toggleCardSelection(cardIndex), highlighted: isSelected }} />;
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
                    <p className="text-[10px] font-bold text-blue-500 uppercase mb-2 tracking-wider">Твої пари: {myRoundScore}</p>
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
                      Opponent (Total Points: {oppTotalScore})
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
                    <p className="text-[10px] font-bold text-red-500 uppercase mb-2 tracking-wider">Пари суперника: {oppRoundScore}</p>
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
      {roundResults && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-blue-500 flex flex-col items-center">
            <h2 className="text-3xl font-black text-blue-900 mb-2 uppercase italic">
              Підсумки раунду
            </h2>

            <div className="bg-blue-100 px-4 py-1 rounded-full mb-6">
              <span className="text-blue-700 font-bold uppercase tracking-widest text-sm">
                Тип фіналу: {roundResults.type === 'STOP' ? '🛑 СТОП' : '⚖️ ОСТАННІЙ ШАНС'}
              </span>
            </div>

            <div className="w-full space-y-4 mb-8">
              {roundResults.results.map((res) => {
                const isMe = res.userId === userId;
                return (
                  <div key={res.userId} className={`flex items-center justify-between p-4 rounded-2xl ${isMe ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">{isMe ? 'Ти' : 'Суперник'}</p>
                      <p className="text-lg font-black text-gray-800">
                        Раунд: <span className="text-blue-600">+{res.score}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase">Всього</p>
                      <p className="text-2xl font-black text-blue-900">
                        {roundResults.totalScores[res.userId]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setRoundResults(null);
                handleStartGame();
              }}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-200 transition-all transform hover:scale-105 active:scale-95 uppercase tracking-wider"
            >
              Наступний раунд
            </button>
          </div>
        </div>
      )}
      {totalWinner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-blue-950/95 backdrop-blur-xl p-4 animate-in fade-in duration-500">
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-[0_0_50px_rgba(59,130,246,0.5)] border-8 border-yellow-400 flex flex-col items-center text-center">

            {/* Іконка або Кубок */}
            <div className="text-7xl mb-4">🏆</div>

            <h1 className="text-4xl font-black text-blue-900 mb-2 uppercase tracking-tighter">
              Гру завершено!
            </h1>

            <div className="mb-8">
              <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Переможець партії:</p>
              <p className="text-3xl font-black text-green-600 truncate max-w-xs">
                {totalWinner.winnerId === userId ? 'ТИ ПЕРЕМІГ!' : 'СУПЕРНИК ПЕРЕМІГ'}
              </p>
            </div>

            <div className="w-full bg-blue-50 rounded-3xl p-6 mb-8 border-2 border-blue-100">
              <h3 className="text-blue-900 font-bold mb-4 uppercase text-xs tracking-widest">Фінальний рахунок</h3>
              {Object.entries(totalWinner.finalScores).map(([id, score]) => (
                <div key={id} className="flex justify-between items-center mb-2 last:mb-0">
                  <span className="font-bold text-gray-600">{id === userId ? 'Ви:' : 'Суперник:'}</span>
                  <span className="text-2xl font-black text-blue-900">{score}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => {
                  setTotalWinner(null);
                  handleStartGame();
                }}
                className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black rounded-2xl shadow-lg transition-all transform hover:scale-105 uppercase"
              >
                Грати знову
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-2xl transition-all uppercase text-sm"
              >
                Вийти в лобі
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}