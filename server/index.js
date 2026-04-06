const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const FULL_DECK = [
  { id: 1, name: 'boat', type: 'pair', color: 'black' },
  { id: 2, name: 'crab', type: 'pair', color: 'blue' },
  { id: 3, name: 'octopus', type: 'collector', color: 'green' },
  { id: 4, name: 'shell', type: 'collector', color: 'green' },
  { id: 5, name: 'boat', type: 'pair', color: 'blue' },
  { id: 6, name: 'swimmer', type: 'pair', color: 'blue' },
  { id: 7, name: 'crab', type: 'pair', color: 'gray' },
  { id: 8, name: 'boat', type: 'pair', color: 'blue' },
  { id: 9, name: 'shell', type: 'collector', color: 'blue' },
  { id: 10, name: 'crab', type: 'pair', color: 'blue' },
  { id: 11, name: 'shoal_of_fish', type: 'multiplier', color: 'gray' },
  { id: 12, name: 'mermaid', type: 'mermaid', color: 'mermaid' },
  { id: 13, name: 'penguin', type: 'collector', color: 'lightorange' },
  { id: 14, name: 'octopus', type: 'collector', color: 'purple' },
  { id: 15, name: 'boat', type: 'pair', color: 'yellow' },
  { id: 16, name: 'fish', type: 'pair', color: 'black' },
  { id: 17, name: 'swimmer', type: 'pair', color: 'yellow' },
  { id: 18, name: 'boat', type: 'pair', color: 'lightblue' },
  { id: 19, name: 'swimmer', type: 'pair', color: 'lightorange' },
  { id: 20, name: 'fish', type: 'pair', color: 'lightblue' },
  { id: 21, name: 'fish', type: 'pair', color: 'blue' },
  { id: 22, name: 'fish', type: 'pair', color: 'black' },
  { id: 23, name: 'boat', type: 'pair', color: 'lightblue' },
  { id: 24, name: 'crab', type: 'pair', color: 'lightblue' },
  { id: 25, name: 'shark', type: 'pair', color: 'purple' },
  { id: 26, name: 'shark', type: 'pair', color: 'black' },
  { id: 27, name: 'boat', type: 'pair', color: 'black' },
  { id: 28, name: 'sailor', type: 'collector', color: 'pink' },
  { id: 29, name: 'shell', type: 'collector', color: 'yellow' },
  { id: 30, name: 'octopus', type: 'collector', color: 'gray' },
  { id: 31, name: 'penguin_colony', type: 'multiplier', color: 'green' },
  { id: 32, name: 'sailor', type: 'collector', color: 'orange' },
  { id: 33, name: 'fish', type: 'pair', color: 'blue' },
  { id: 34, name: 'crab', type: 'pair', color: 'yellow' },
  { id: 35, name: 'shell', type: 'collector', color: 'lightblue' },
  { id: 36, name: 'shark', type: 'pair', color: 'green' },
  { id: 38, name: 'shark', type: 'pair', color: 'blue' },
  { id: 39, name: 'crab', type: 'pair', color: 'black' },
  { id: 40, name: 'fish', type: 'pair', color: 'green' },
  { id: 41, name: 'shell', type: 'collector', color: 'black' },
  { id: 42, name: 'mermaid', type: 'mermaid', color: 'mermaid' },
  { id: 43, name: 'fish', type: 'pair', color: 'yellow' },
  { id: 44, name: 'crab', type: 'pair', color: 'lightblue' },
  { id: 45, name: 'penguin', type: 'collector', color: 'pink' },
  { id: 46, name: 'boat', type: 'pair', color: 'yellow' },
  { id: 47, name: 'lighthouse', type: 'multiplier', color: 'purple' },
  { id: 48, name: 'crab', type: 'pair', color: 'yellow' },
  { id: 49, name: 'crab', type: 'pair', color: 'green' },
  { id: 50, name: 'penguin', type: 'collector', color: 'purple' },
  { id: 51, name: 'swimmer', type: 'pair', color: 'black' },
  { id: 55, name: 'mermaid', type: 'mermaid', color: 'mermaid' },
  { id: 56, name: 'shell', type: 'collector', color: 'gray' },
  { id: 57, name: 'octopus', type: 'collector', color: 'yellow' },
  { id: 58, name: 'shark', type: 'pair', color: 'lightblue' },
  { id: 59, name: 'octopus', type: 'collector', color: 'lightblue' },
  { id: 60, name: 'capitan', type: 'multiplier', color: 'lightorange' },
  { id: 61, name: 'swimmer', type: 'pair', color: 'lightblue' },
  { id: 62, name: 'mermaid', type: 'mermaid', color: 'mermaid' },
];

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const shuffle = (array) => {
  let currentIndex = array.length, randomIndex;
  const newArray = [...array];
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
};

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      // Якщо кімнати немає — створюємо її
      rooms[roomId] = {
        players: [],
        deck: [], // Тут буде перемішана колода
        gameState: 'waiting' // waiting, playing, finished
      };
    }

    // Додаємо гравця, якщо його ще немає
    if (rooms[roomId].players.length < 2 && !rooms[roomId].players.includes(socket.id)) {
      rooms[roomId].players.push(socket.id);
      console.log(`User ${socket.id} joined room ${roomId}`);
    }

    // Сповіщаємо всіх у кімнаті про кількість гравців
    io.to(roomId).emit('room-status', {
      playersCount: rooms[roomId].players.length,
      gameState: rooms[roomId].gameState
    });
  });

  // ХОСТ ПОЧИНАЄ ГРУ
  socket.on('start-game', (roomId) => {
    const room = rooms[roomId];
    if (room && room.players.length === 2) {
      room.deck = shuffle(FULL_DECK.map(card => card.id));
      room.hands = { [room.players[0]]: [], [room.players[1]]: [] };
      room.discards = [
        [room.deck.pop()],
        [room.deck.pop()]
      ];

      room.currentTurn = room.players[0];
      room.gameState = 'playing';

      room.players.forEach(playerId => {
        io.to(playerId).emit('game-started', {
          discards: room.discards,
          isMyTurn: room.currentTurn === playerId, // true тільки для першого гравця
          deckCount: room.deck.length
        });
      });
    }
  });

  socket.on('request-draw', (roomId) => {
    const room = rooms[roomId];
    if (room.currentTurn !== socket.id) return; // Перевірка черги

    if (room.deck.length < 2) return;
    const drawnCards = [room.deck.pop(), room.deck.pop()];

    room.tempCards = { [socket.id]: drawnCards }; // Тимчасово зберігаємо вибір

    socket.emit('choose-card', drawnCards); // Відправляємо варіанти ТІЛЬКИ гравцю
    console.log(`User ${socket.id} is choosing from cards: ${drawnCards}`);//dsadasdddddd
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

    // Міняємо хід
    room.currentTurn = room.players.find(id => id !== socket.id);

    // Всім розсилаємо оновлений стан столу
    io.to(roomId).emit('turn-completed', {
      discards: room.discards,
      deckCount: room.deck.length,
      nextTurn: room.currentTurn,
      lastAction: { type: 'draw', player: socket.id }
    });
    socket.emit('update-hand', room.hands[socket.id]);
    const opponentId = room.players.find(id => id !== socket.id);
    if (opponentId) {
      io.to(opponentId).emit('update-opponent-count', room.hands[socket.id].length);
      console.log(`Відправлено Гравцю ${opponentId}: у його суперника тепер ${room.hands[socket.id].length} карт`);
    }
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