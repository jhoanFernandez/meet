const socket = io(); // Conexión con el servidor WebSocket
const startShareButton = document.getElementById('startShare');
const stopShareButton = document.getElementById('stopShare');
const screenVideoElement = document.getElementById('screenVideo');
const cameraVideoElement = document.getElementById('cameraVideo');
const commentInput = document.getElementById('commentInput');
const sendComment = document.getElementById('sendComment');
const commentsList = document.getElementById('commentsList');
const exportButton = document.getElementById('exportButton');
const createButton = document.getElementById('createButton');

let screenStream = null;
let cameraStream = null;

// Función para iniciar la cámara
async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraVideoElement.srcObject = cameraStream;
        cameraVideoElement.classList.remove('hidden');  // Muestra el video de la cámara
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
    }
}

// Función para compartir pantalla
async function startScreenShare() {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenVideoElement.srcObject = screenStream;
        startShareButton.classList.add('hidden');
        stopShareButton.classList.remove('hidden');

        // Detener la cámara si se inicia la pantalla compartida
        if (cameraStream) {
            stopCamera();
        }

        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            stopScreenShare();
        });
    } catch (error) {
        console.error("Error al compartir pantalla:", error);
    }
}

function stopScreenShare() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenVideoElement.srcObject = null;
        startShareButton.classList.remove('hidden');
        stopShareButton.classList.add('hidden');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraVideoElement.srcObject = null;
        cameraVideoElement.classList.add('hidden');  // Ocultar el video de la cámara
    }
}

// Enviar un comentario
sendComment.addEventListener('click', () => {
    const comment = commentInput.value;
    if (comment) {
        socket.emit('new_comment', comment);
        commentInput.value = '';
    }
});

// Escuchar los comentarios en tiempo real
socket.on('update_comments', (comment) => {
    const li = document.createElement('li');
    li.textContent = comment;
    commentsList.appendChild(li);
});

// Exportar la pantalla como imagen
exportButton.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    const video = document.getElementById('screenVideo');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'captura_pantalla.png';
    link.click();
});

// Crear un nuevo documento
createButton.addEventListener('click', () => {
    socket.emit('create_document', 'Nuevo Documento');
});

socket.on('document_created', (documentName) => {
    alert(`Documento creado: ${documentName}`);
});

// Iniciar ambos al cargar la página
startCamera();

// Iniciar la pantalla compartida
startShareButton.addEventListener('click', startScreenShare);
stopShareButton.addEventListener('click', stopScreenShare);
