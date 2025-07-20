import React, { useRef, useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { styled, createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import BrushIcon from "@mui/icons-material/Brush";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#06b6d4',
    },
    background: {
      default: '#18181b',
      paper: '#232336',
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#a5b4fc',
    },
  },
  typography: {
    fontFamily: 'Inter, Roboto, Helvetica Neue, Arial, sans-serif',
  },
});

const CanvasContainer = styled(Paper)(({ theme }) => ({
  margin: 'auto',
  padding: theme.spacing(3),
  maxWidth: 600,
  background: theme.palette.background.paper,
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  borderRadius: 28,
  border: '1px solid #27273a',
}));

const CANVAS_SIZE = 640; // or even 800 if your layout can handle it
const STROKE_WIDTH = 14;
const STROKE_COLOR = '#f3f4f6'; // light stroke for dark bg



function App() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [strokeColor, setStrokeColor] = useState("#f3f4f6");
  const [strokeWidth, setStrokeWidth] = useState(14);
  const [history, setHistory] = useState([]);
  const [showInfo, setShowInfo] = useState(false);

  // Drawing logic
  const getPointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    setDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHistory((prev) => [...prev, ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)]);

  };

  const handlePointerMove = (e) => {
    if (!drawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPointerPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };
  


  const handlePointerUp = () => {
    setDrawing(false);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    setPrediction("");
  };

  // Fill canvas with white on mount
  useEffect(() => {
    clearCanvas();
    // eslint-disable-next-line
  }, []);

  const getImageData = () => {
    // Downscale to 28x28 and get grayscale values
    const offscreen = document.createElement('canvas');
    offscreen.width = 28;
    offscreen.height = 28;
    const ctx = offscreen.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 28, 28);
    ctx.drawImage(canvasRef.current, 0, 0, 28, 28);
    const imageData = ctx.getImageData(0, 0, 28, 28);
    const pixels = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const grayscale = (r + g + b) / 3;
      pixels.push(grayscale / 255);
    }
    return pixels;
  };
  const undoLast = () => {
  if (history.length > 0) {
    const ctx = canvasRef.current.getContext('2d');
    const newHistory = [...history];
    const last = newHistory.pop();
    setHistory(newHistory);
    ctx.putImageData(last, 0, 0);
  }
};

  const downloadImage = () => {
    const link = document.createElement('a');
    link.download = 'doodle.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
};

  const handlePredict = async () => {
    setLoading(true);
    const image = getImageData();
    try {
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image }),
      });
      const data = await response.json();
      setPrediction(data.label);
    } catch (err) {
      setPrediction("Error: Could not connect to backend");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top right, #232336 60%, #18181b 100%)', p: 0 }}>
        <AppBar position="static" color="primary" sx={{ background: 'linear-gradient(90deg, #232336 40%, #6366f1 100%)', boxShadow: 3 }}>
           <Button
            variant="outlined"
            color="secondary"
            onClick={() => setShowInfo(true)}
            sx={{ fontWeight: 600, borderRadius: 8, px: 2, fontSize: 16 }}
           >
          ℹ️ Info
           </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: '#232336', borderRadius: 2, px: 2, py: 0.5, boxShadow: 2 }}>
              <AccountCircleIcon sx={{ color: '#a5b4fc', fontSize: 28 }} />
              <TextField
                variant="standard"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  style: { color: '#f3f4f6', fontWeight: 500, fontSize: 18, letterSpacing: 1 },
                }}
                sx={{ width: 160, ml: 1 }}
              />
            </Box>
          
        </AppBar>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', p: 2 }}>
          <CanvasContainer>
            <Typography variant="h6" align="center" sx={{ mb: 2, color: '#a5b4fc', fontWeight: 600, letterSpacing: 1 }}>
              Draw your doodle below!
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{
                  borderRadius: 20,
                  border: '2.5px solid #6366f1',
                  background: '#18181b',
                  boxShadow: '0 4px 24px 0 rgba(20, 35, 238, 0.73)',
                  touchAction: 'none',
                  cursor: 'crosshair',
                  marginBottom: 12,
                }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              />
              </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2, mt: 2 }}>
              <Button
                 variant="contained"
                 color="primary"
                 startIcon={<CheckCircleIcon />}
                 onClick={handlePredict}
                 disabled={loading}
                sx={{ fontWeight: 600, borderRadius: 8, px: 3, fontSize: 18, boxShadow: 3 }}
              >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Predict'}
              </Button>
              <Button
                 variant="outlined"
                color="secondary"
                startIcon={<RestartAltIcon />}
                onClick={clearCanvas}
                sx={{ fontWeight: 600, borderRadius: 8, px: 3, fontSize: 18, borderWidth: 2, boxShadow: 2 }}
               >
              Clear
              </Button>
              <Button
                 variant="outlined"
                 color="secondary"
                 onClick={undoLast}
                sx={{ fontWeight: 600, borderRadius: 8, px: 3, fontSize: 18, borderWidth: 2 }}
             >
              Undo
             </Button>
             <Button
                  variant="outlined"
                 color="secondary"
                  onClick={downloadImage}
                  sx={{ fontWeight: 600, borderRadius: 8, px: 3, fontSize: 18, borderWidth: 2 }}
            >
             Download
            </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 3, flexWrap: 'wrap' }}>
            <TextField
               label="Brush Color"
               type="color"
               value={strokeColor}
               onChange={(e) => setStrokeColor(e.target.value)}
               variant="outlined"
               sx={{ minWidth: 120 }}
            />
           <TextField
               label="Stroke Size"
                type="number"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                variant="outlined"
                inputProps={{ min: 1, max: 50 }}
                sx={{ minWidth: 120 }}
             />
            </Box>

            <Paper elevation={2} sx={{ mt: 4, p: 2.5, background: 'rgba(36,41,60,0.92)', borderRadius: 10, border: '1.5px solid #6366f1', boxShadow: 6 }}>
              <Typography variant="subtitle1" align="center" sx={{ color: '#a5b4fc', fontWeight: 500, letterSpacing: 1 }}>
                Prediction for <span style={{color:'#06b6d4', fontWeight:600}}>{username || '—'}</span>:
              </Typography>
              <Typography variant="h4" align="center" sx={{ color: prediction ? '#06b6d4' : '#64748b', fontWeight: 700, mt: 1, letterSpacing: 2 }}>
                {prediction || '—'}
              </Typography>
            </Paper>
          </CanvasContainer>
         
        </Box>
      </Box>
      {showInfo && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(192, 190, 190, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{
      backgroundColor: '#e0e0ecff',
      color: '#262d3bff',
      padding: '24px',
      borderRadius: '12px',
      width: '90%',
      maxWidth: '400px',
      position: 'relative',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      <button
        onClick={() => setShowInfo(false)}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          fontSize: '24px',
          background: 'none',
          border: 'none',
          color: '#6b7280ff',
          cursor: 'pointer'
        }}
      >
        ×
      </button>
      <h2>About the Doodle Recognition App</h2>
      <p> Doodle Recognition App allows users to draw simple sketches on a digital canvas and uses machine learning to recognize what the drawing represents. It provides real-time predictions based on the input doodle using a model trained on the Quick, Draw! dataset by Google.</p>
<p>
🔹 Features:</p>
<p>Freehand drawing canvas </p>
<p>
Real-time doodle prediction</p>
<p>
Top match suggestions with confidence levels</p>
<p>
Clean and interactive UI</p>
    </div>
  </div>
)}

    </ThemeProvider>
  );
}

export default App;