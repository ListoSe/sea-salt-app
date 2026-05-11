import { FULL_DECK } from '../constants/deck.js';

export const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const calculatePlayerScore = (hand, playedIds) => {
  let score = 0;

  const handCards = (hand || []).map(id => FULL_DECK.find(c => c.id === id)).filter(Boolean);
  const playedCards = (playedIds || []).map(id => FULL_DECK.find(c => c.id === id)).filter(Boolean);

  const allCards = [...handCards, ...playedCards];
  score += Math.floor(playedCards.length / 2);

  const counts = allCards.reduce((acc, card) => {
    acc[card.name] = (acc[card.name] || 0) + 1;
    return acc;
  }, {});

  if (counts['mermaid'] >= 4) {
    return 999;
  }
  if (counts['shell']) {
    const shellPoints = [0, 0, 2, 4, 6, 8, 10];
    score += shellPoints[counts['shell']];
  }
  if (counts['octopus']) {
    const octopusPoints = [0, 0, 3, 6, 9, 12];
    score += octopusPoints[counts['octopus']];
  }
  if (counts['penguin']) {
    const penguinPoints = [0, 1, 3, 5];
    score += penguinPoints[counts['penguin']];
    if (counts['penguin_colony']) {
      score += counts['penguin'] * 2;
    }
  }
  if (counts['sailor']) {
    const sailorPoints = [0, 0, 5];
    score += sailorPoints[counts['sailor']];
    if (counts['capitan']) {
      score += counts['sailor'] * 3;
    }
  }
  if (counts['boat'] && counts['lighthouse']) {
    score += counts['boat'];
  }
  if (counts['fish'] && counts['shoal_of_fish']) {
    score += counts['fish'];
  }
  if (counts['mermaid'] > 0) {
    const colorCounts = allCards.reduce((acc, card) => {
      if (card.color && card.name !== 'mermaid') {
        acc[card.color] = (acc[card.color] || 0) + 1;
      }
      return acc;
    }, {});

    const sortedCounts = Object.values(colorCounts).sort((a, b) => b - a);

    for (let i = 0; i < counts['mermaid']; i++) {
      if (sortedCounts[i]) {
        score += sortedCounts[i];
      }
    }
  }

  return score;
};

export const getColorBonus = (handIds, playedIds) => {
  const allCards = [...(handIds || []), ...(playedIds || [])]
    .map(id => FULL_DECK.find(c => c.id === id))
    .filter(c => c && c.color);

  if (allCards.length === 0) return 0;

  const colorCounts = allCards.reduce((acc, card) => {
    acc[card.color] = (acc[card.color] || 0) + 1;
    return acc;
  }, {});

  return Math.max(...Object.values(colorCounts));
};

export const processScoreUpdate = (io, socket, rooms, roomId, userId, score) => {
  if (score >= 999) {
    handleInstantWin(io, rooms, roomId, userId);
  } else {
    socket.emit('update-private-score', { privateScore: score });
  }
};

export const handleInstantWin = (io, rooms, roomId, userId) => {
  const room = rooms[roomId];
  room.gameState = 'finished';
  
  io.to(roomId).emit('game-over', {
    winnerId: userId,
    reason: 'MERMAID_WIN',
    scores: room.currentScores
  });
  
  console.log(`[INSTANT WIN] User ${userId} collected 4 Mermaids in Room ${roomId}`);
};

export const calculateFinalScores = (room, callerId, type) => {
  const players = room.players.map(p => {
    const hand = room.hands[p.userId] || [];
    const played = room.playedCards[p.userId] || [];
    
    return {
      userId: p.userId,
      fullScore: calculatePlayerScore(hand, played),
      colorBonus: getColorBonus(hand, played)
    };
  });

  const caller = players.find(p => p.userId === callerId);
  const opponent = players.find(p => p.userId !== callerId);

  let finalPoints = [];

  if (type === 'STOP') {
    finalPoints = players.map(p => ({ userId: p.userId, score: p.fullScore }));
  } else {
    if (caller.fullScore > opponent.fullScore) {
      finalPoints = [
        { userId: caller.userId, score: caller.fullScore + caller.colorBonus },
        { userId: opponent.userId, score: opponent.colorBonus }
      ];
    } else {
      finalPoints = [
        { userId: caller.userId, score: caller.colorBonus },
        { userId: opponent.userId, score: opponent.fullScore }
      ];
    }
  }

  return { points: finalPoints, type };
};

export const finishRound = (io, room, roomId, data) => {
  const { points, type, winnerId } = data;
  const WIN_LIMIT = 40;

  console.log("=== FINISH ROUND DEBUG ===");
  console.log("Room ID:", roomId);
  console.log("Points received:", JSON.stringify(points));
  console.log("Scores before update:", JSON.stringify(room.totalScores));

  if (!room.totalScores) {
    room.totalScores = {};
  }

  points.forEach(p => {
    console.log(`Adding ${p.score} to user ${p.userId}`);
    room.totalScores[p.userId] = (room.totalScores[p.userId] || 0) + p.score;
  });

  console.log("Scores after update:", JSON.stringify(room.totalScores));

  room.lastChanceActive = false;
  room.callerId = null;

  const finalWinner = Object.entries(room.totalScores).find(([id, score]) => score >= WIN_LIMIT);

  if (finalWinner) {
    room.gameState = 'total_game_over';
    io.to(roomId).emit('total-game-over', {
      winnerId: finalWinner[0],
      finalScores: room.totalScores
    });
  } else {
    io.to(roomId).emit('round-ended', {
      results: points,
      totalScores: room.totalScores,
      type: type
    });
  }
};

export const getRoomData = (room, userId) => ({
  gameState: room.gameState,
  discards: room.discards,
  deckCount: room.deck.length,
  nextTurn: room.currentTurn,
  hasDrawn: room.hasDrawn,
  currentScores: room.currentScores,
  totalScores: room.totalScores,
  playedCards: room.playedCards || {},
  choosingCards: room.tempCards[userId] || null,
  isPickingFromCrab: room.activeCrab[userId] || false,
  handCounts: room.players.reduce((acc, player) => {
    acc[player.userId] = room.hands[player.userId].length;
    return acc;
  }, {}),
  lastChanceActive: room.lastChanceActive || false,
  callerId: room.callerId || null
});