import { FULL_DECK, PAIR_NAMES } from '../constants/deck.js';
import { getRoomData, calculatePlayerScore, processScoreUpdate, handleInstantWin } from '../utils/gameUtils.js';

export const playPair = (io, socket, rooms, { roomId, cards }) => {
  const userId = socket.handshake.query.userId;
  const room = rooms[roomId];
  if (!room || room.currentTurn !== userId) return;

  const card1 = FULL_DECK.find(c => c.id === cards[0]);
  const card2 = FULL_DECK.find(c => c.id === cards[1]);

  if (!card1 || !card2) return;

  if (!PAIR_NAMES.includes(card1.name)) return;

  if ((card1.name === card2.name && !['shark', 'swimmer'].includes(card1.name)) ||
    (card1.name === 'shark' && card2.name === 'swimmer') ||
    (card1.name === 'swimmer' && card2.name === 'shark')) {
    const pairType = (card1.name === 'shark' || card1.name === 'swimmer') ? 'shark-swimmer' : card1.name;

    room.currentScores[userId] += 1;
    room.hands[userId] = room.hands[userId].filter(id => !cards.includes(id));

    if (!room.playedCards) room.playedCards = {};
    if (!room.playedCards[userId]) room.playedCards[userId] = [];
    room.playedCards[userId].push(...cards);

    switch (pairType) {
      case 'boat':
        room.hasDrawn = false;
        break;

      case 'fish':
        if (room.deck.length > 0) {
          room.hands[userId].push(room.deck.pop());
        }
        break;

      case 'crab':
        room.activeCrab[userId] = true;
        socket.emit('enable-discard-pick');
        break;

      case 'shark-swimmer':
        const opponent = room.players.find(p => p.userId !== userId);
        const opponentId = opponent?.userId;
        if (room.hands[opponentId].length > 0) {
          const stolenCardId = room.hands[opponentId].splice(Math.floor(Math.random() * room.hands[opponentId].length), 1)[0];
          room.hands[userId].push(stolenCardId);
          io.to(opponent.socketId).emit('update-hand', room.hands[opponentId]);

          const oppPrivate = calculatePlayerScore(room.hands[opponentId], room.playedCards[opponentId] || []);
          io.to(opponent.socketId).emit('update-private-score', { privateScore: oppPrivate });
        }
        break;
    }

    const myPrivateScore = calculatePlayerScore(room.hands[userId], room.playedCards[userId]);

    io.to(roomId).emit('pair-played', {
      playerId: userId,
      cards,
      pairType,
      scores: {
        current: room.currentScores
      },
      handCounts: getRoomData(room).handCounts
    });

    processScoreUpdate(io, socket, rooms, roomId, userId, myPrivateScore);

    socket.emit('update-hand', room.hands[userId]);
  }
};

export const handleCrabPick = (io, socket, rooms, { roomId, cardId, stackIndex }) => {
  const userId = socket.handshake.query.userId;
  const room = rooms[roomId];

  if (!room || room.currentTurn !== userId) return;

  const stack = room.discards[stackIndex];
  if (!stack) return;

  const cardIndex = stack.indexOf(cardId);

  if (cardIndex !== -1) {
    const pickedCard = stack.splice(cardIndex, 1)[0];

    room.hands[userId].push(pickedCard);
    room.activeCrab[userId] = false;

    console.log(`Ефект Краба: Гравець ${userId} витягнув карту ${cardId} зі стопки ${stackIndex}`);

    const myPrivateScore = calculatePlayerScore(room.hands[userId], room.playedCards[userId] || []);

    io.to(roomId).emit('turn-completed', getRoomData(room));

    socket.emit('update-hand', room.hands[userId]);
    processScoreUpdate(io, socket, rooms, roomId, userId, myPrivateScore);
  }
};