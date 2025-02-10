const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
let image = new Image();
let path = [];
let isDrawing = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        image.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    path = [{ x: e.offsetX, y: e.offsetY }];
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        path.push({ x: e.offsetX, y: e.offsetY });
        drawPath();
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    animateImage();
});

function drawPath() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
}

function animateImage() {
    let i = 0;
    function animate() {
        if (i < path.length) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawPath();
            ctx.drawImage(image, path[i].x - image.width / 2, path[i].y - image.height / 2);
            i++;
            requestAnimationFrame(animate);
        }
    }
    animate();
}
