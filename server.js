const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Разрешить все источники (для разработки)
        methods: ["GET", "POST"],
    },
});

// Обслуживание статических файлов из папки public
app.use(express.static('public'));

let currentSpeaker = null; // Текущий говорящий

io.on('connection', (socket) => {
    console.log('Пользователь подключен:', socket.id);

    // Уведомление о новом пользователе
    socket.broadcast.emit('user-joined', socket.id);

    // Запрос на право говорить
    socket.on('request-to-speak', () => {
        if (!currentSpeaker) {
            currentSpeaker = socket.id;
            io.emit('speaker-changed', currentSpeaker); // Уведомление о новом говорящем
        }
    });

    // Остановка разговора
    socket.on('stop-speaking', () => {
        if (currentSpeaker === socket.id) {
            currentSpeaker = null;
            io.emit('speaker-changed', null); // Уведомление об освобождении права говорить
        }
    });

    // Переключение микрофона
    socket.on('mic-toggle', (isMicOn) => {
        socket.broadcast.emit('mic-toggle', { userId: socket.id, isMicOn }); // Уведомление о состоянии микрофона
    });

    // Обмен сигналами WebRTC
    socket.on('offer', (data) => {
        socket.broadcast.emit('offer', data); // Передача предложения другим пользователям
    });

    socket.on('answer', (data) => {
        socket.broadcast.emit('answer', data); // Передача ответа другим пользователям
    });

    socket.on('ice-candidate', (data) => {
        socket.broadcast.emit('ice-candidate', data); // Передача ICE-кандидатов
    });

    // Отключение пользователя
    socket.on('disconnect', () => {
        console.log('Пользователь отключен:', socket.id);
        if (currentSpeaker === socket.id) {
            currentSpeaker = null;
            io.emit('speaker-changed', null); // Освобождение права говорить
        }
        socket.broadcast.emit('user-left', socket.id); // Уведомление об отключении пользователя
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});