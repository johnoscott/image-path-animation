const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const clearButton = document.getElementById('clearButton');
const newSelectionButton = document.getElementById('newSelectionButton');
const animationButton = document.getElementById('animationButton');
const replayButton = document.getElementById('replayButton');
const downloadButton = document.getElementById('downloadButton');
const animationTypeRadios = document.getElementsByName('animationType');
const zoomSlider = document.getElementById('zoomSlider');
const showOutlineCheckbox = document.getElementById('showOutline');
let image = new Image();
let path = [];
let isDrawing = false;
let selectionPath = [];
let isSelecting = false;
let selectedImage = null;
let animationType = 'trail';
let zoom = 100;
let showOutline = true;
let mediaRecorder;
let recordedChunks = [];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        image.src = event.target.result;
        image.onload = () => {
            zoomSlider.value = 100;
            drawImage();
            switchToSelectionMode();
        };
    };
    reader.readAsDataURL(file);
});

zoomSlider.addEventListener('input', (e) => {
    zoom = e.target.value;
    drawImage();
});

showOutlineCheckbox.addEventListener('change', (e) => {
    showOutline = e.target.checked;
});

canvas.addEventListener('mousedown', (e) => {
    if (!image.src) return;
    if (!isSelecting) {
        isDrawing = true;
        path = [{ x: e.offsetX, y: e.offsetY }];
    } else {
        isDrawing = true;
        selectionPath = [{ x: e.offsetX, y: e.offsetY }];
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        if (!isSelecting) {
            path.push({ x: e.offsetX, y: e.offsetY });
            drawPath();
        } else {
            selectionPath.push({ x: e.offsetX, y: e.offsetY });
            drawSelection();
        }
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        if (!isSelecting) {
            animateImage();
        } else {
            closeSelection();
            cutSelection();
            switchToAnimationMode();
        }
    }
});

clearButton.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image.src) {
        drawImage();
    }
    path = [];
    selectionPath = [];
    isSelecting = false;
    newSelectionButton.classList.remove('active');
    animationButton.classList.remove('active');
    clearButton.classList.add('active');
});

newSelectionButton.addEventListener('click', () => {
    switchToSelectionMode();
});

animationButton.addEventListener('click', () => {
    switchToAnimationMode();
});

replayButton.addEventListener('click', () => {
    if (selectedImage && path.length > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (animationType === 'trail') {
            drawImage();
        }
        animateImage();
    }
});

downloadButton.addEventListener('click', () => {
    if (selectedImage && path.length > 0) {
        startRecording();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (animationType === 'trail') {
            drawImage();
        }
        animateImage(() => {
            stopRecording();
        });
    }
});

animationTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        animationType = e.target.value;
    });
});

function drawImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const aspectRatio = image.width / image.height;
    const canvasAspectRatio = canvas.width / canvas.height;
    let width, height;

    if (aspectRatio > canvasAspectRatio) {
        width = canvas.width;
        height = width / aspectRatio;
    } else {
        height = canvas.height;
        width = height * aspectRatio;
    }

    const zoomFactor = zoom / 100;
    const zoomedWidth = width * zoomFactor;
    const zoomedHeight = height * zoomFactor;
    const offsetX = (canvas.width - zoomedWidth) / 2;
    const offsetY = (canvas.height - zoomedHeight) / 2;

    ctx.drawImage(image, offsetX, offsetY, zoomedWidth, zoomedHeight);
}

function drawPath() {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
}

function drawSelection() {
    drawImage();
    ctx.beginPath();
    ctx.moveTo(selectionPath[0].x, selectionPath[0].y);
    for (let i = 1; i < selectionPath.length; i++) {
        ctx.lineTo(selectionPath[i].x, selectionPath[i].y);
    }
    ctx.lineTo(selectionPath[0].x, selectionPath[0].y);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    const aspectRatio = image.width / image.height;
    const canvasAspectRatio = canvas.width / canvas.height;
    let width, height;

    if (aspectRatio > canvasAspectRatio) {
        width = canvas.width;
        height = width / aspectRatio;
    } else {
        height = canvas.height;
        width = height * aspectRatio;
    }

    const zoomFactor = zoom / 100;
    const zoomedWidth = width * zoomFactor;
    const zoomedHeight = height * zoomFactor;
    const offsetX = (canvas.width - zoomedWidth) / 2;
    const offsetY = (canvas.height - zoomedHeight) / 2;

    ctx.drawImage(image, offsetX, offsetY, zoomedWidth, zoomedHeight);
    ctx.restore();
}

function closeSelection() {
    ctx.lineTo(selectionPath[0].x, selectionPath[0].y);
    ctx.stroke();
}

function cutSelection() {
    if (selectionPath.length < 3) return;
    const minX = Math.min(...selectionPath.map(p => p.x));
    const minY = Math.min(...selectionPath.map(p => p.y));
    const maxX = Math.max(...selectionPath.map(p => p.x));
    const maxY = Math.max(...selectionPath.map(p => p.y));
    const width = maxX - minX;
    const height = maxY - minY;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.save();
    tempCtx.beginPath();
    tempCtx.moveTo(selectionPath[0].x - minX, selectionPath[0].y - minY);
    for (let i = 1; i < selectionPath.length; i++) {
        tempCtx.lineTo(selectionPath[i].x - minX, selectionPath[i].y - minY);
    }
    tempCtx.closePath();
    tempCtx.clip();
    tempCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
    tempCtx.restore();

    selectedImage = new Image();
    selectedImage.src = tempCanvas.toDataURL();
}

function animateImage(callback) {
    let i = 0;
    function animate() {
        if (i < path.length) {
            if (animationType === 'sprite') {
                drawImage();
                if (showOutline) {
                    drawPath();
                }
                if (selectedImage) {
                    ctx.drawImage(selectedImage, path[i].x - selectedImage.width / 2, path[i].y - selectedImage.height / 2);
                }
            } else if (animationType === 'trail') {
                if (i === 0) {
                    drawImage();
                }
                if (selectedImage) {
                    ctx.drawImage(selectedImage, path[i].x - selectedImage.width / 2, path[i].y - selectedImage.height / 2);
                }
            }
            i++;
            requestAnimationFrame(animate);
        } else if (callback) {
            callback();
        }
    }
    animate();
}

function switchToAnimationMode() {
    isSelecting = false;
    animationButton.classList.add('active');
    newSelectionButton.classList.remove('active');
    clearButton.classList.remove('active');
}

function switchToSelectionMode() {
    isSelecting = true;
    path = [];
    newSelectionButton.classList.add('active');
    animationButton.classList.remove('active');
    clearButton.classList.remove('active');
}

function startRecording() {
    recordedChunks = [];
    const stream = canvas.captureStream();
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'animation.webm';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    };

    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();
}
