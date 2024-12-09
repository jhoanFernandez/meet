const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Inicializa el servidor
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configura el almacenamiento de archivos con multer
const upload = multer({ dest: 'uploads/' });

// Middleware para servir archivos estáticos
app.use(express.static('public'));

// Ruta para cargar documentos
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ message: 'Archivo subido correctamente', file: req.file });
});

// Ruta para descargar un documento
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath); // Inicia la descarga
    } else {
        res.status(404).send('Archivo no encontrado');
    }
});

// Función para crear nuevas salas
let rooms = {}; // Objeto para manejar las salas y los usuarios en cada sala

// Ruta para crear una nueva sala
app.post('/create-room', (req, res) => {
    const roomName = req.body.roomName || `room-${Date.now()}`;
    rooms[roomName] = [];
    res.json({ message: `Sala ${roomName} creada`, roomName });
});

// Conexión WebSocket
io.on('connection', (socket) => {
    console.log('Un usuario se conectó');

    // Función para unirse a una sala con un rol
    socket.on('join_room', (roomName, role = 'viewer') => {
        if (!rooms[roomName]) {
            rooms[roomName] = [];
        }

        rooms[roomName].push({ id: socket.id, role });
        socket.join(roomName);

        console.log(`Usuario ${socket.id} se unió a la sala ${roomName} como ${role}`);
    });

    // Función para enviar un comentario
    socket.on('new_comment', (roomName, comment) => {
        const user = rooms[roomName]?.find(user => user.id === socket.id);
        if (user && (user.role === 'viewer' || user.role === 'editor')) {
            io.to(roomName).emit('update_comments', { userId: socket.id, comment });
        } else {
            socket.emit('error', 'No tienes permiso para comentar');
        }
    });

    // Función para editar el documento en la sala
    socket.on('edit_document', (roomName, newText) => {
        const user = rooms[roomName]?.find(user => user.id === socket.id);
        if (user && user.role === 'editor') {
            io.to(roomName).emit('document_update', { editorId: socket.id, text: newText });
        } else {
            socket.emit('error', 'No tienes permiso para editar el documento');
        }
    });

    // Función para crear un nuevo documento
    socket.on('create_document', (roomName, documentName) => {
        const user = rooms[roomName]?.find(user => user.id === socket.id);
        if (user && user.role === 'editor') {
            io.to(roomName).emit('document_created', { documentName, creatorId: socket.id });
        } else {
            socket.emit('error', 'No tienes permiso para crear un documento');
        }
    });

    // Cuando un usuario se desconecta
    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
        for (const roomName in rooms) {
            rooms[roomName] = rooms[roomName].filter(user => user.id !== socket.id);
        }
    });
});

// Inicia el servidor
server.listen(3001, () => {
    console.log('Servidor corriendo en http://localhost:3001');
});
