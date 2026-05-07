import { FULL_DECK } from '../constants/deck.js';
import { getRoomData } from '../utils/gameUtils.js';

export const playPair = (io, socket, rooms, { roomId, cards }) => {
    const room = rooms[roomId];
    if (!room || room.currentTurn !== socket.id) return;

    const card1 = FULL_DECK.find(c => c.id === cards[0]);
    const card2 = FULL_DECK.find(c => c.id === cards[1]);

    if (!card1 || !card2) return;

    if (card1?.name === card2?.name || (card1?.name === 'shark' && card2?.name === 'swimmer') || (card1?.name === 'swimmer' && card2?.name === 'shark')) {
      const pairType = (card1.name === 'shark' || card1.name === 'swimmer') ? 'shark-swimmer' : card1.name;

      room.currentScores[socket.id] += 1;
      room.totalScores[socket.id] += 1;
      room.hands[socket.id] = room.hands[socket.id].filter(id => !cards.includes(id));

      if (!room.playedCards) room.playedCards = {};
      if (!room.playedCards[socket.id]) room.playedCards[socket.id] = [];
      room.playedCards[socket.id].push(...cards);

      switch (pairType) {
        case 'boat':
          room.hasDrawn = false;
          break;

        case 'fish':
          if (room.deck.length > 0) {
            room.hands[socket.id].push(room.deck.pop());
          }
          break;

        case 'crab':
          socket.emit('enable-discard-pick');
          break;

        case 'shark-swimmer':
          const opponentId = room.players.find(id => id !== socket.id);
          if (room.hands[opponentId].length > 0) {
            const stolenCardId = room.hands[opponentId].splice(Math.floor(Math.random() * room.hands[opponentId].length), 1)[0];
            room.hands[socket.id].push(stolenCardId);
            io.to(opponentId).emit('update-hand', room.hands[opponentId]);
          }
          break;
      }

      io.to(roomId).emit('pair-played', {
        playerId: socket.id,
        cards,
        pairType,
        scores: {
          current: room.currentScores,
          total: room.totalScores
        },
        handCounts: getRoomData(room).handCounts
      });

      socket.emit('update-hand', room.hands[socket.id]);
    }
  };

export const handleCrabPick = (io, socket, rooms, { roomId, cardId, stackIndex }) => {
  const room = rooms[roomId];

  if (!room || room.currentTurn !== socket.id) return;

  const stack = room.discards[stackIndex];
  if (!stack) return;

  const cardIndex = stack.indexOf(cardId);

  if (cardIndex !== -1) {
    const pickedCard = stack.splice(cardIndex, 1)[0];

    room.hands[socket.id].push(pickedCard);

    console.log(`Ефект Краба: Гравець ${socket.id} витягнув карту ${cardId} зі стопки ${stackIndex}`);

    io.to(roomId).emit('turn-completed', getRoomData(room));

    socket.emit('update-hand', room.hands[socket.id]);
  }
};