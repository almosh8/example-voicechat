const joinButton = document.getElementById('joinButton');
const speakButton = document.getElementById('speakButton');
const micStatus = document.getElementById('micStatus');

let localStream;
let peerConnection;
let isMicOn = false; // Состояние микрофона (вкл/выкл)
const socket = io('https://example-voicechat.onrender.com'); // Подключение к серверу

// Конфигурация ICE-серверов (используйте свои или публичные)
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Публичный STUN-сервер
    ],
};

// Подключение к аудиозвонку
joinButton.addEventListener('click', async () => {
    try {
        // Получение аудиопотока
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Аудио поток получен");

        // Отключение кнопки "Присоединиться" и включение кнопки "Говорить"
        joinButton.disabled = true;
        speakButton.disabled = false;

        // Создание PeerConnection
        peerConnection = new RTCPeerConnection(configuration);

        // Добавление локального аудиопотока
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // Обработка ICE-кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate);
            }
        };

        // Обработка входящих потоков
        peerConnection.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
        };

        // Создание предложения (offer)
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    } catch (error) {
        console.error("Ошибка при получении аудио потока:", error);
    }
});

// Переключение микрофона
speakButton.addEventListener('click', () => {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            isMicOn = !isMicOn; // Переключение состояния микрофона
            audioTracks[0].enabled = isMicOn; // Включение/выключение микрофона
            micStatus.textContent = isMicOn ? "Включен" : "Выключен"; // Обновление статуса
            speakButton.textContent = isMicOn ? "Выключить микрофон" : "Включить микрофон"; // Обновление текста кнопки
            socket.emit('mic-toggle', isMicOn); // Отправка состояния микрофона на сервер
        }
    }
});

// Обработка входящих предложений (offer)
socket.on('offer', async (offer) => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate);
            }
        };
        peerConnection.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
        };
    }

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

// Обработка входящих ответов (answer)
socket.on('answer', async (answer) => {
    await peerConnection.setRemoteDescription(answer);
});

// Обработка входящих ICE-кандидатов
socket.on('ice-candidate', async (candidate) => {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// Уведомление о новом говорящем
socket.on('speaker-changed', (speakerId) => {
    if (speakerId === socket.id) {
        speakButton.disabled = true; // Заблокировать кнопку для говорящего
    } else {
        speakButton.disabled = false; // Разблокировать кнопку для остальных
    }
});

// Логирование состояния подключения к серверу
socket.on('connect', () => {
    console.log('Подключено к серверу');
});

socket.on('disconnect', () => {
    console.log('Отключено от сервера');
});