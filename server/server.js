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
        res.download(filePath);  // Inicia la descarga
    } else {
        res.status(404).send('Archivo no encontrado');
    }
});

// Función para crear nuevas salas
let rooms = {};  // Objeto para manejar las salas y los usuarios en cada sala

// Ruta para crear una nueva sala
app.post('/create-room', (req, res) => {
    const roomName = req.body.roomName || `room-${Date.now()}`;
    rooms[roomName] = [];
    res.json({ message: `Sala ${roomName} creada`, roomName });
});

// Conexión WebSocket
io.on('connection', (socket) => {
    console.log('Un usuario se conectó');

    // Función para unirse a una sala
    socket.on('join_room', (roomName) => {
        socket.join(roomName);
        rooms[roomName].push(socket.id);
        console.log(`Usuario ${socket.id} se unió a la sala: ${roomName}`);
    });

    // Función para enviar un comentario
    socket.on('new_comment', (roomName, comment) => {
        io.to(roomName).emit('update_comments', comment);  // Emitir el comentario a todos los usuarios de la sala
    });

    // Función para editar el documento en la sala
    socket.on('edit_document', (roomName, newText) => {
        io.to(roomName).emit('document_update', newText);  // Actualizar el documento compartido
    });

    // Función para crear un nuevo documento
    socket.on('create_document', (roomName, documentName) => {
        io.to(roomName).emit('document_created', documentName);  // Crear un nuevo documento en la sala
    });

    // Cuando un usuario se desconecta
    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
        for (const roomName in rooms) {
            const room = rooms[roomName];
            const index = room.indexOf(socket.id);
            if (index !== -1) {
                room.splice(index, 1);  // Eliminar al usuario de la sala
            }
        }
    });
});

// Inicia el servidor
server.listen(3001, () => {
    console.log('Servidor corriendo en http://localhost:3001');
});
