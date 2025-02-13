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
const outlineColorPicker = document.getElementById('outlineColor');
const outlineThicknessSlider = document.getElementById('outlineThickness');
const thicknessPreview = document.getElementById('thicknessPreview');
const thicknessPreviewCtx = thicknessPreview.getContext('2d');
const lineStyleSelect = document.getElementById('lineStyle');
const thicknessValueInput = document.getElementById('thicknessValue'); // Add with other const declarations at top
const CROSSHAIR_SIZE = 20; // Add with other const declarations at top
const downloadImageButton = document.getElementById('downloadImageButton'); // Add to const declarations at top
const loopCheckbox = document.getElementById('loopCheckbox');
const loopCount = document.getElementById('loopCount');
const stopButton = document.getElementById('stopButton');
let image = new Image();
let path = [];
let isDrawing = false;
let selectionPath = [];
let isSelecting = false;
let selectedImage = null;
let animationType = 'trail';
let zoom = 100;
let showOutline = true;
let outlineColor = '#ff69b4';
let outlineThickness = 4;
let lineStyle = 'dotted';
let mediaRecorder;
let recordedChunks = [];
let selectionBounds = null; // Add this with other global variables at the top
let selectionCenter = null; // Add to the global variables at top
let isAnimating = false;
let animationFrame = null;
let dashOffset = 0; // Add with other global variables at top
let pathAnimationFrame = null; // Add this with other global variables at top

// Add new functions for localStorage
function saveOptions() {
    const options = {
        animationType: animationType,
        zoom: zoom,
        showOutline: showOutline,
        outlineColor: outlineColor,
        outlineThickness: outlineThickness,
        lineStyle: lineStyle,
        loopEnabled: loopCheckbox.checked,
        loopCount: loopCount.value
    };
    localStorage.setItem('animationOptions', JSON.stringify(options));
}

function loadOptions() {
    const saved = localStorage.getItem('animationOptions');
    if (saved) {
        const options = JSON.parse(saved);
        
        // Restore animation type
        animationType = options.animationType;
        document.querySelector(`input[name="animationType"][value="${options.animationType}"]`).checked = true;
        
        // Restore zoom
        zoom = options.zoom;
        zoomSlider.value = options.zoom;
        
        // Restore outline options
        showOutline = options.showOutline;
        showOutlineCheckbox.checked = options.showOutline;
        
        outlineColor = options.outlineColor;
        outlineColorPicker.value = options.outlineColor;
        
        outlineThickness = options.outlineThickness;
        outlineThicknessSlider.value = options.outlineThickness;
        thicknessValueInput.value = options.outlineThickness;
        
        // Restore line style
        lineStyle = options.lineStyle;
        lineStyleSelect.value = options.lineStyle;
        
        // Restore loop options
        loopCheckbox.checked = options.loopEnabled;
        loopCount.value = options.loopCount;
        
        // Update preview
        updateThicknessPreview();
    }
}

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
    saveOptions();
});

showOutlineCheckbox.addEventListener('change', (e) => {
    showOutline = e.target.checked;
    saveOptions();
});

outlineColorPicker.addEventListener('input', (e) => {
    outlineColor = e.target.value;
    updateThicknessPreview();
    saveOptions();
});

outlineThicknessSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    outlineThickness = value;
    thicknessValueInput.value = value;
    updateThicknessPreview();
    saveOptions();
});

// Add new event listener for the number input
thicknessValueInput.addEventListener('input', (e) => {
    const value = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 10);
    outlineThickness = value;
    outlineThicknessSlider.value = value;
    thicknessValueInput.value = value; // Ensure valid number is shown
    updateThicknessPreview();
    saveOptions();
});

lineStyleSelect.addEventListener('change', (e) => {
    lineStyle = e.target.value;
    updateThicknessPreview();
    saveOptions();
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
        // Cancel any ongoing path animation
        if (pathAnimationFrame) {
            cancelAnimationFrame(pathAnimationFrame);
            pathAnimationFrame = null;
        }
        if (!isSelecting) {
            // Clear the path after a short delay
            setTimeout(() => {
                if (!isSelecting) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawImage();
                    animateImage();
                }
            }, 100);
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
    selectionCenter = null; // Modify clearButton click handler to reset selection center
    isAnimating = false;
    stopButton.disabled = true;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
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
        saveOptions();
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

function applyLineStyle(context) {
    switch(lineStyle) {
        case 'dashed':
            context.setLineDash([outlineThickness * 3, outlineThickness * 2]);
            break;
        case 'dotted':
            context.setLineDash([outlineThickness, outlineThickness]);
            break;
        case 'double':
            // Double line is handled differently, see below
            break;
        default:
            context.setLineDash([]);
    }
}

// Replace the drawPath function with this version
function drawPath() {
    // Clear previous animation frame if it exists
    if (pathAnimationFrame) {
        cancelAnimationFrame(pathAnimationFrame);
    }

    // Clear and redraw background for animated styles
    if (lineStyle === 'dashed' || lineStyle === 'dotted') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawImage();
        
        // Update dash offset for animation
        dashOffset = (dashOffset + 1) % (outlineThickness * 5);
    }

    ctx.save();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineThickness;

    if (lineStyle === 'dashed' || lineStyle === 'dotted') {
        if (lineStyle === 'dashed') {
            ctx.setLineDash([outlineThickness * 3, outlineThickness * 2]);
        } else {
            ctx.setLineDash([outlineThickness, outlineThickness]);
        }
        ctx.lineDashOffset = -dashOffset;
        
        if (isDrawing) {
            pathAnimationFrame = requestAnimationFrame(() => drawPath());
        }
    } else {
        applyLineStyle(ctx);
    }

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }

    if (lineStyle === 'double') {
        ctx.lineWidth = outlineThickness/3;
        ctx.stroke();
        ctx.lineWidth = outlineThickness/3;
        ctx.lineCap = 'butt';
        const offset = outlineThickness/1.5;
        ctx.beginPath();
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i+1].x - path[i].x;
            const dy = path[i+1].y - path[i].y;
            const angle = Math.atan2(dy, dx);
            const nx = Math.cos(angle + Math.PI/2) * offset;
            const ny = Math.sin(angle + Math.PI/2) * offset;
            
            if (i === 0) ctx.moveTo(path[i].x + nx, path[i].y + ny);
            ctx.lineTo(path[i+1].x + nx, path[i+1].y + ny);
        }
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i+1].x - path[i].x;
            const dy = path[i+1].y - path[i].y;
            const angle = Math.atan2(dy, dx);
            const nx = Math.cos(angle + Math.PI/2) * -offset;
            const ny = Math.sin(angle + Math.PI/2) * -offset;
            
            if (i === 0) ctx.moveTo(path[i].x + nx, path[i].y + ny);
            ctx.lineTo(path[i+1].x + nx, path[i+1].y + ny);
        }
        ctx.stroke();
    } else {
        ctx.stroke();
    }
    ctx.restore();
}

function drawSelection() {
    drawImage();
    ctx.save();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineThickness;
    applyLineStyle(ctx);
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

    // Store selection bounds for later outline drawing
    selectionBounds = {
        path: selectionPath.map(p => ({ x: p.x - minX, y: p.y - minY })),
        width,
        height
    };

    // Store selection center position
    selectionCenter = {
        x: minX + width/2,
        y: minY + height/2
    };

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    // Clear canvas and redraw image without selection path
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawImage();

    // Create the clipped selection
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
    
    // Show preview
    const previewContainer = document.getElementById('selectionPreview');
    previewContainer.style.display = 'block';
    previewContainer.innerHTML = '';
    const previewImg = selectedImage.cloneNode();
    previewContainer.appendChild(previewImg);
}

function drawSelectionOutline(x, y) {
    if (!selectionBounds || !showOutline) return;
    
    ctx.save();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineThickness;
    applyLineStyle(ctx);
    ctx.translate(x - selectionBounds.width/2, y - selectionBounds.height/2);
    ctx.beginPath();
    ctx.moveTo(selectionBounds.path[0].x, selectionBounds.path[0].y);
    for (let i = 1; i < selectionBounds.path.length; i++) {
        ctx.lineTo(selectionBounds.path[i].x, selectionBounds.path[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

// Add new function for drawing the complete selection guide
function drawSelectionGuide(x, y) {
    if (!selectionBounds || !selectedImage) return;

    // Draw selection outline
    drawSelectionOutline(x, y);

    // Calculate center point of selection
    const centerX = x;
    const centerY = y;

    // Draw crosshair at center
    drawCrosshair(centerX, centerY);
}

// Modify switchToAnimationMode to use the new guide function
function switchToAnimationMode() {
    isSelecting = false;
    animationButton.classList.add('active');
    newSelectionButton.classList.remove('active');
    clearButton.classList.remove('active');

    // Show initial position with guide at original selection position
    if (selectedImage && selectionBounds && selectionCenter) {
        drawImage();
        ctx.drawImage(
            selectedImage, 
            selectionCenter.x - selectedImage.width/2, 
            selectionCenter.y - selectedImage.height/2
        );
        drawSelectionGuide(selectionCenter.x, selectionCenter.y);
    }
}

// Modify animateImage to remove crosshair during animation
function animateImage(callback) {
    let i = 0;
    let currentLoop = 0;
    const maxLoops = loopCheckbox.checked ? parseInt(loopCount.value) : 1;
    
    isAnimating = true;
    stopButton.disabled = false;

    function animate() {
        if (!isAnimating) {
            stopButton.disabled = true;
            if (callback) callback();
            return;
        }

        if (i < path.length) {
            if (animationType === 'sprite') {
                drawImage();
                if (showOutline) {
                    drawPath();
                }
                if (selectedImage) {
                    const x = path[i].x;
                    const y = path[i].y;
                    ctx.drawImage(selectedImage, x - selectedImage.width/2, y - selectedImage.height/2);
                    drawSelectionOutline(x, y);
                }
            } else if (animationType === 'trail') {
                if (i === 0) {
                    drawImage();
                }
                if (selectedImage) {
                    const x = path[i].x;
                    const y = path[i].y;
                    ctx.drawImage(selectedImage, x - selectedImage.width/2, y - selectedImage.height/2);
                    drawSelectionOutline(x, y);
                }
            }
            i++;
            animationFrame = requestAnimationFrame(animate);
        } else {
            currentLoop++;
            if (currentLoop < maxLoops) {
                i = 0;
                if (animationType === 'sprite') {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                animationFrame = requestAnimationFrame(animate);
            } else {
                isAnimating = false;
                stopButton.disabled = true;
                if (callback) callback();
            }
        }
    }
    animate();
}

function switchToSelectionMode() {
    isSelecting = true;
    path = [];
    newSelectionButton.classList.add('active');
    animationButton.classList.remove('active');
    clearButton.classList.remove('active');
    
    // Clear preview
    const previewContainer = document.getElementById('selectionPreview');
    previewContainer.style.display = 'none';
    previewContainer.innerHTML = '';
    selectionCenter = null; // Modify switchToSelectionMode to reset selection center
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

function updateThicknessPreview() {
    thicknessPreviewCtx.clearRect(0, 0, thicknessPreview.width, thicknessPreview.height);
    thicknessPreviewCtx.strokeStyle = outlineColor;
    thicknessPreviewCtx.lineWidth = outlineThickness;
    applyLineStyle(thicknessPreviewCtx);
    
    if (lineStyle === 'double') {
        thicknessPreviewCtx.lineWidth = outlineThickness/3;
        thicknessPreviewCtx.beginPath();
        thicknessPreviewCtx.moveTo(10, thicknessPreview.height/2 - outlineThickness/1.5);
        thicknessPreviewCtx.lineTo(40, thicknessPreview.height/2 - outlineThickness/1.5);
        thicknessPreviewCtx.stroke();
        
        thicknessPreviewCtx.beginPath();
        thicknessPreviewCtx.moveTo(10, thicknessPreview.height/2);
        thicknessPreviewCtx.lineTo(40, thicknessPreview.height/2);
        thicknessPreviewCtx.stroke();
        
        thicknessPreviewCtx.beginPath();
        thicknessPreviewCtx.moveTo(10, thicknessPreview.height/2 + outlineThickness/1.5);
        thicknessPreviewCtx.lineTo(40, thicknessPreview.height/2 + outlineThickness/1.5);
        thicknessPreviewCtx.stroke();
    } else {
        thicknessPreviewCtx.beginPath();
        thicknessPreviewCtx.moveTo(10, thicknessPreview.height/2);
        thicknessPreviewCtx.lineTo(40, thicknessPreview.height/2);
        thicknessPreviewCtx.stroke();
    }
    thicknessPreviewCtx.setLineDash([]);
}

// Add new function for drawing crosshair
function drawCrosshair(x, y) {
    ctx.save();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(x - CROSSHAIR_SIZE, y);
    ctx.lineTo(x + CROSSHAIR_SIZE, y);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, y - CROSSHAIR_SIZE);
    ctx.lineTo(x, y + CROSSHAIR_SIZE);
    ctx.stroke();
    
    ctx.restore();
}

updateThicknessPreview(); // Initial preview

// Add new event listener
downloadImageButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'animation-frame.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Add stop button click handler
stopButton.addEventListener('click', () => {
    isAnimating = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    stopButton.disabled = true;
});

// Add new event listeners for loop controls
loopCheckbox.addEventListener('change', saveOptions);
loopCount.addEventListener('change', saveOptions);

// Load options when page loads
document.addEventListener('DOMContentLoaded', loadOptions);
