const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let isDrawing = false;
let x = 0,
  y = 0;
let brushSize = 10;
let brushColor = "#000000";
let tool = "brush";
let history = [];
let redoStack = [];

const colorPicker = document.getElementById("color");
const sizeInput = document.getElementById("size");
const clearBtn = document.getElementById("clear");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const saveBtn = document.getElementById("save");
const bgInput = document.getElementById("bgImage");

// Tool Buttons
document.getElementById("brush").onclick = () => (tool = "brush");
document.getElementById("eraser").onclick = () => (tool = "eraser");
document.getElementById("line").onclick = () => (tool = "line");
document.getElementById("rect").onclick = () => (tool = "rect");
document.getElementById("circle").onclick = () => (tool = "circle");
document.getElementById("text").onclick = () => (tool = "text");
document.getElementById("fill").onclick = () => (tool = "fill");

colorPicker.onchange = (e) => (brushColor = e.target.value);
sizeInput.onchange = (e) => (brushSize = parseInt(e.target.value));

function saveState() {
  history.push(canvas.toDataURL());
  if (history.length > 20) history.shift(); // limit history
  redoStack = []; // clear redo after new action
}

function restoreState(url) {
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0);
  img.src = url;
}

canvas.onmousedown = (e) => {
  isDrawing = true;
  [x, y] = [e.offsetX, e.offsetY];
  if (tool === "fill") {
    saveState();
    floodFill(x, y, hexToRgb(brushColor));
    isDrawing = false;
  }
};

canvas.onmouseup = (e) => {
  if (tool !== "fill") saveState();
  isDrawing = false;
};

canvas.onmousemove = (e) => {
  if (!isDrawing) return;
  const x2 = e.offsetX,
    y2 = e.offsetY;

  switch (tool) {
    case "brush":
    case "eraser":
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.stroke();
      break;
    case "line":
    case "rect":
    case "circle":
      break; // drawn on mouseup for shapes
  }
  x = x2;
  y = y2;
};

canvas.onclick = (e) => {
  if (tool === "text") {
    const text = prompt("Enter text:");
    if (text) {
      saveState();
      ctx.fillStyle = brushColor;
      ctx.font = `${brushSize * 2}px Arial`;
      ctx.fillText(text, e.offsetX, e.offsetY);
    }
  }
};

canvas.onmouseup = (e) => {
  if (!isDrawing) return;
  if (tool === "line" || tool === "rect" || tool === "circle") {
    const x2 = e.offsetX,
      y2 = e.offsetY;
    saveState();
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(x, y, x2 - x, y2 - y);
    } else if (tool === "circle") {
      ctx.beginPath();
      let radius = Math.sqrt((x2 - x) ** 2 + (y2 - y) ** 2);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  isDrawing = false;
};

// Flood Fill
function floodFill(x, y, fillColor) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const targetColor = getColorAtPixel(data, x, y);

  const pixelStack = [[x, y]];
  while (pixelStack.length) {
    const [px, py] = pixelStack.pop();
    const idx = (py * canvas.width + px) * 4;

    if (!matchColor(data, idx, targetColor)) continue;

    setColorAtPixel(data, idx, fillColor);

    pixelStack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function getColorAtPixel(data, x, y) {
  const idx = (y * canvas.width + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2]];
}

function matchColor(data, idx, color) {
  return (
    data[idx] === color[0] &&
    data[idx + 1] === color[1] &&
    data[idx + 2] === color[2]
  );
}

function setColorAtPixel(data, idx, color) {
  [data[idx], data[idx + 1], data[idx + 2]] = color;
  data[idx + 3] = 255;
}

function hexToRgb(hex) {
  const val = hex.replace("#", "");
  return [
    parseInt(val.slice(0, 2), 16),
    parseInt(val.slice(2, 4), 16),
    parseInt(val.slice(4), 16),
  ];
}

clearBtn.onclick = () => {
  saveState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

undoBtn.onclick = () => {
  if (history.length > 0) {
    redoStack.push(canvas.toDataURL());
    restoreState(history.pop());
  }
};

redoBtn.onclick = () => {
  if (redoStack.length > 0) {
    history.push(canvas.toDataURL());
    restoreState(redoStack.pop());
  }
};

saveBtn.onclick = () => {
  const link = document.createElement("a");
  link.download = "drawing.png";
  link.href = canvas.toDataURL();
  link.click();
};

bgInput.onchange = (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = reader.result;
    saveState();
  };
  reader.readAsDataURL(file);
};

// Optional: Auto-save/load
window.onload = () => {
  const saved = localStorage.getItem("autosave");
  if (saved) restoreState(saved);
};
window.onbeforeunload = () => {
  localStorage.setItem("autosave", canvas.toDataURL());
};
