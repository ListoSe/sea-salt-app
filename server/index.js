import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { FULL_DECK } from './constants/deck.js';
import { playPair } from './hooks/gameLogic.js';
import { shuffle, getRoomData } from './utils/gameUtils.js';
import { handleCrabPick } from './hooks/gameLogic.js';


const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      // поменять навыдачу ошибки на создание комнаты, если её нет
      rooms[roomId] = {
        players: [],
        deck: [],
        totalScores: {},
        currentScores: {},
        gameState: 'waiting',
        hasDrawn: false
      };
    }

    // Додаємо гравця, якщо його ще немає
    if (rooms[roomId].players.length < 2 && !rooms[roomId].players.includes(socket.id)) {
      rooms[roomId].players.push(socket.id);
      console.log(`User ${socket.id} joined room ${roomId}`);
    }

    io.to(roomId).emit('room-status', {
      playersCount: rooms[roomId].players.length,
      gameState: rooms[roomId].gameState
    });
  });

  socket.on('start-game', (roomId) => {
    const room = rooms[roomId];
    if (room && room.players.length === 2) {
      room.hasDrawn = false;
      room.deck = shuffle(FULL_DECK.map(card => card.id));
      room.hands = { [room.players[0]]: [], [room.players[1]]: [] };
      room.discards = [
        [room.deck.pop()],
        [room.deck.pop()]
      ];
      room.currentTurn = room.players[0];
      room.gameState = 'playing';

      room.players.forEach(playerId => {
        if (room.totalScores[playerId] === undefined) room.totalScores[playerId] = 0;
        room.currentScores[playerId] = 0; // поменять чтобы очки не сбрасывались при нажатии кнопки старт

        io.to(playerId).emit('game-started', {
          discards: room.discards,
          isMyTurn: room.currentTurn === playerId,
          deckCount: room.deck.length
        });
      });
    }
  });

  socket.on('request-draw', (roomId) => {
    const room = rooms[roomId];
    if (room.currentTurn !== socket.id || room.hasDrawn) return;
    if (room.deck.length < 2) return;
    const drawnCards = [room.deck.pop(), room.deck.pop()];
    room.tempCards = { [socket.id]: drawnCards };
    socket.emit('choose-card', drawnCards);
  });

  socket.on('pick-card', ({ roomId, pickedId, discardStackIndex }) => {
    const room = rooms[roomId];
    const temp = room.tempCards[socket.id];
    const pickedCard = pickedId;
    const discardedCard = temp.find(id => id !== pickedId);

    // Оновлюємо стан на сервері
    room.hands[socket.id].push(pickedCard);
    room.discards[discardStackIndex].push(discardedCard);
    delete room.tempCards[socket.id];

    room.hasDrawn = true;

    io.to(roomId).emit('turn-completed', getRoomData(room));
    socket.emit('update-hand', room.hands[socket.id]);
  });

  socket.on('pick-discard', ({ roomId, stackIndex }) => {
    const room = rooms[roomId];
    if (room.currentTurn !== socket.id || room.hasDrawn) return;

    const stack = room.discards[stackIndex];
    if (stack.length === 0) return;

    const cardId = stack.pop();
    room.hands[socket.id].push(cardId);
    room.hasDrawn = true;
    io.to(roomId).emit('turn-completed', getRoomData(room));
    socket.emit('update-hand', room.hands[socket.id]);
  });

  socket.on('play-pair', (data) => {
    playPair(io, socket, rooms, data);
  });

  socket.on('pick-from-discard-crab', (data) => {
    handleCrabPick(io, socket, rooms, data);
  });

  socket.on('end-turn', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.currentTurn !== socket.id || !room.hasDrawn) return;

    room.currentTurn = room.players.find(id => id !== socket.id);
    room.hasDrawn = false;

    io.to(roomId).emit('turn-completed', getRoomData(room));
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.indexOf(socket.id);

      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        console.log(`User ${socket.id} left room ${roomId}`);

        if (room.players.length > 0) {
          io.to(roomId).emit('room-status', {
            playersCount: room.players.length,
            gameState: 'waiting'
          });
        } else {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        }
        break;
      }
    }
  });
});

server.listen(3001, () => {
  console.log('SERVER RUNNING ON PORT 3001');
});