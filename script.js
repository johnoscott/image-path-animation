const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const clearButton = document.getElementById('clearButton');
const newSelectionButton = document.getElementById('newSelectionButton');
const animationButton = document.getElementById('animationButton');
const animationTypeRadios = document.getElementsByName('animationType');
let image = new Image();
let path = [];
let isDrawing = false;
let selectionPath = [];
let isSelecting = false;
let selectedImage = null;
let animationType = 'sprite';

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        image.src = event.target.result;
        image.onload = () => {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        };
    };
    reader.readAsDataURL(file);
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
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    path = [];
    selectionPath = [];
    isSelecting = false;
    newSelectionButton.classList.remove('active');
    animationButton.classList.remove('active');
    clearButton.classList.add('active');
});

newSelectionButton.addEventListener('click', () => {
    isSelecting = true;
    path = [];
    newSelectionButton.classList.add('active');
    animationButton.classList.remove('active');
    clearButton.classList.remove('active');
});

animationButton.addEventListener('click', () => {
    isSelecting = false;
    animationButton.classList.add('active');
    newSelectionButton.classList.remove('active');
    clearButton.classList.remove('active');
});

animationTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        animationType = e.target.value;
    });
});

function drawPath() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image.src) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
}

function drawSelection() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image.src) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    ctx.beginPath();
    ctx.moveTo(selectionPath[0].x, selectionPath[0].y);
    for (let i = 1; i < selectionPath.length; i++) {
        ctx.lineTo(selectionPath[i].x, selectionPath[i].y);
    }
    ctx.lineTo(selectionPath[0].x, selectionPath[0].y);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
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

function animateImage() {
    let i = 0;
    function animate() {
        if (i < path.length) {
            if (animationType === 'sprite') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (image.src) {
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                }
                drawPath();
                if (selectedImage) {
                    ctx.drawImage(selectedImage, path[i].x - selectedImage.width / 2, path[i].y - selectedImage.height / 2);
                }
            } else if (animationType === 'trail') {
                if (selectedImage) {
                    ctx.drawImage(selectedImage, path[i].x - selectedImage.width / 2, path[i].y - selectedImage.height / 2);
                }
            }
            i++;
            requestAnimationFrame(animate);
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
