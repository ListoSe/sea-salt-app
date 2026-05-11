import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { FULL_DECK } from './constants/deck.js';
import { playPair, handleCrabPick } from './hooks/gameLogic.js';
import { shuffle, getRoomData, calculatePlayerScore, processScoreUpdate, handleInstantWin, finishRound, calculateFinalScores } from './utils/gameUtils.js';


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
  const userId = socket.handshake.query.userId;
  console.log(`[Socket Connected] ID: ${socket.id} | User: ${userId}`);

  socket.on('create-room', (roomId) => {
    rooms[roomId] = {
      players: [],
      deck: [],
      totalScores: {},
      currentScores: {},
      tempCards: {},
      activeCrab: {},
      gameState: 'waiting',
      hasDrawn: false,
      hands: {},
      playedCards: {}
    };

    console.log(`[Room Created] ID: ${roomId} by User: ${userId}`);
    socket.emit('room-created', roomId);
  });

  socket.on('join-room', (roomId) => {
    const room = rooms[roomId];

    if (!room) {
      socket.emit('join-error', 'Комната не найдена. Создайте новую или проверьте ID.');
      return;
    }

    socket.join(roomId);
    const existingPlayer = room.players.find(p => p.userId === userId);

    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      console.log(`[Reconnect] User: ${userId} -> Room: ${roomId}`);
    } else {
      if (room.players.length >= 2) {
        socket.emit('join-error', 'Комната уже заполнена');
        socket.leave(roomId);
        return;
      }
      room.players.push({ userId, socketId: socket.id });
      console.log(`[Join] User: ${userId} joined Room: ${roomId}`);
    }

    io.to(roomId).emit('room-status', {
      playersCount: room.players.length,
      gameState: room.gameState
    });

    if (room.gameState === 'playing') {
      const myPrivateScore = calculatePlayerScore(room.hands[userId] || [], room.playedCards[userId] || []);

      socket.emit('reconnect-game', {
        hand: room.hands[userId] || [],
        roomData: getRoomData(room, userId),
        privateScore: myPrivateScore
      });
    }
  });

  socket.on('check-room', (roomId) => {
    if (rooms[roomId]) {
      socket.emit('room-exists', roomId);
    } else {
      socket.emit('join-error', 'Кімната з таким кодом не знайдена!');
    }
  });

  socket.on('start-game', (roomId) => {
    const room = rooms[roomId];
    console.log("--- START GAME DEBUG ---");
    console.log("Room ID:", roomId);
    console.log("Current TotalScores in memory:", room?.totalScores);

    if (room && room.players.length === 2) {
      if (!room.totalScores) {
        room.totalScores = {};
      }
      room.deck = shuffle(FULL_DECK.map(card => card.id));
      room.hands = { [room.players[0].userId]: [], [room.players[1].userId]: [] };
      room.playedCards = {};
      room.currentScores = {};
      room.hasDrawn = false;
      room.lastChanceActive = false;
      room.discards = [
        [room.deck.pop()],
        [room.deck.pop()]
      ];
      room.currentTurn = room.players[0].userId;
      room.gameState = 'playing';

      room.players.forEach(player => {
        const { userId, socketId } = player;
        console.log(`Checking scores for user: ${userId}. Current val: ${room.totalScores[userId]}`);

        if (room.totalScores[userId] === undefined){
          room.totalScores[userId] = 0;
        } 
        room.hands[userId] = [];
        room.currentScores[userId] = 0;
        room.playedCards[userId] = [];

        io.to(socketId).emit('game-started', {
          discards: room.discards,
          isMyTurn: room.currentTurn === userId,
          deckCount: room.deck.length,
          totalScores: room.totalScores
        });
      });
    }
  });

  socket.on('request-draw', (roomId) => {
    const room = rooms[roomId];
    if (room.currentTurn !== userId || room.hasDrawn) return;
    if (room.deck.length < 2) return;
    const drawnCards = [room.deck.pop(), room.deck.pop()];
    room.tempCards[userId] = drawnCards;
    socket.emit('choose-card', drawnCards);
  });

  socket.on('pick-card', ({ roomId, pickedId, discardStackIndex }) => {
    const room = rooms[roomId];

    if (!room || room.currentTurn !== userId) return;

    const temp = room.tempCards[userId];
    const pickedCard = pickedId;
    const discardedCard = temp.find(id => id !== pickedId);

    room.hands[userId].push(pickedCard);
    room.discards[discardStackIndex].push(discardedCard);
    delete room.tempCards[userId];

    room.hasDrawn = true;

    const myPrivateScore = calculatePlayerScore(room.hands[userId], room.playedCards[userId] || []);
    processScoreUpdate(io, socket, rooms, roomId, userId, myPrivateScore);

    io.to(roomId).emit('turn-completed', getRoomData(room));
    socket.emit('update-hand', room.hands[userId]);
  });

  socket.on('pick-discard', ({ roomId, stackIndex }) => {
    const room = rooms[roomId];
    if (room.currentTurn !== userId || room.hasDrawn) return;

    const stack = room.discards[stackIndex];
    if (stack.length === 0) return;

    const cardId = stack.pop();
    room.hands[userId].push(cardId);
    room.hasDrawn = true;
    const myPrivateScore = calculatePlayerScore(room.hands[userId], room.playedCards[userId] || []);
    processScoreUpdate(io, socket, rooms, roomId, userId, myPrivateScore);

    io.to(roomId).emit('turn-completed', getRoomData(room));
    socket.emit('update-hand', room.hands[userId]);
  });

  socket.on('play-pair', (data) => {
    playPair(io, socket, rooms, data);
  });

  socket.on('pick-from-discard-crab', (data) => {
    handleCrabPick(io, socket, rooms, data);
  });

  socket.on('declare-end-round', ({ roomId, type }) => {
    const room = rooms[roomId];
    if (!room || room.currentTurn !== userId) return;

    if (type === 'STOP') {
      const results = calculateFinalScores(room, userId, 'STOP');
      finishRound(io, room, roomId, results);
    } else {
      room.lastChanceActive = true;
      room.callerId = userId;

      const opp = room.players.find(p => p.userId !== userId);
      room.currentTurn = opp.userId;
      room.hasDrawn = false;

      io.to(roomId).emit('last-chance-started', {
        callerId: userId,
        nextTurn: room.currentTurn
      });
    }
  });

    socket.on('end-turn', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.currentTurn !== userId || !room.hasDrawn) return;
    
    if (room.lastChanceActive) {
      const results = calculateFinalScores(room, room.callerId, 'LAST_CHANCE');
      finishRound(io, room, roomId, results);
      return;
    }

    const opponent = room.players.find(p => p.userId !== userId);
    if (opponent) {
      room.currentTurn = opponent.userId;
    }
    room.hasDrawn = false;

    io.to(roomId).emit('turn-completed', getRoomData(room));
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id} | User: ${userId}`);

    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room || !room.players) {
        continue;
      }
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

      if (playerIndex !== -1) {
        if (room.gameState === 'waiting') {
          const removedUser = room.players[playerIndex].userId;

          room.players.splice(playerIndex, 1);
          console.log(`[Leave] User: ${removedUser} left Room: ${roomId} (Waiting state)`);

          io.to(roomId).emit('room-status', {
            playersCount: room.players.length,
            gameState: 'waiting'
          });

          setTimeout(() => {
            if (rooms[roomId] && rooms[roomId].players.length === 0) {
              delete rooms[roomId];
              console.log(`[Room Deleted] ID: ${roomId} (Empty)`);
            }
          }, 5000);
        } else {
          console.log(`[Reconnection Wait] User: ${userId} disconnected. Game continues.`);
        }
        break;
      }
    }
  });
});

server.listen(3001, () => {
  console.log('SERVER RUNNING ON PORT 3001');
});