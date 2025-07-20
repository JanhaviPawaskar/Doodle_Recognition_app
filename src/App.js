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
import './funky.css';
import CATEGORIES from './categories';

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

// Responsive canvas size (wide 16:9 aspect ratio, max 96vw x 54vw)
const getResponsiveCanvasSize = () => {
  const maxW = Math.min(window.innerWidth * 0.96, 1200);
  const width = Math.floor(maxW);
  const height = Math.floor(width * 9 / 16);
  return { width, height };
};

const DEFAULT_STROKE_COLOR = '#000000'; // default black stroke for drawing

function App() {
  // --- Confetti state ---
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(null);

  // Free draw state
  const [feedback, setFeedback] = useState('');
  const [aiImage, setAiImage] = useState(""); // base64 or URL for AI image
  const [isErasing, setIsErasing] = useState(false); // new state for eraser

  // Download user drawing as PNG
  const downloadUserDrawing = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'your_drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Download AI drawing as PNG
  const downloadAIDrawing = () => {
    if (!aiImage) return;
    const link = document.createElement('a');
    link.download = 'ai_drawing.png';
    link.href = aiImage;
    link.click();
  };

  // Remove round logic: free draw mode
  const resetCanvasAndFeedback = () => {
    setFeedback('');
    setPrediction("");
    setGenAiPrediction("");
    clearCanvas();
  };

  // On mount, just clear canvas and feedback
  useEffect(() => {
    resetCanvasAndFeedback();
    // eslint-disable-next-line
  }, []);

  // Handle doodle submission: send image and username to backend (no category)
  const handleSubmitDoodle = async () => {
    setLoading(true);
    try {
      const image = canvasRef.current.toDataURL("image/png");
      await fetch("http://localhost:5000/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, username }),
      });
      setFeedback('Submitted!');
      setTimeout(() => resetCanvasAndFeedback(), 1200);
    } catch (err) {
      setFeedback('Submission failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [genAiPrediction, setGenAiPrediction] = useState("");
  const [genAiLoading, setGenAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [brushColor, setBrushColor] = useState(DEFAULT_STROKE_COLOR);
  const [canvasSize, setCanvasSize] = useState(getResponsiveCanvasSize());

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize(getResponsiveCanvasSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drawing logic
  const getPointerPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    setDrawing(true);
    const pos = getPointerPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handlePointerMove = (e) => {
    if (!drawing) return;
    const pos = getPointerPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = isErasing ? '#ffffff' : brushColor;
    ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Reset to white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (canvasRef.current) {
      clearCanvas();
    }
  }, [canvasSize]);

  const getImageData = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and create binary array
    const binaryData = [];
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      binaryData.push(avg < 128 ? 1 : 0);
    }
    
    return binaryData;
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const imageData = getImageData();
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
      const result = await response.json();
      setPrediction(result.prediction);
    } catch (err) {
      setPrediction("Error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenAiPredict = async () => {
    setGenAiLoading(true);
    try {
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL("image/png");
      const response = await fetch("http://localhost:5000/genai-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      const result = await response.json();
      setGenAiPrediction(result.prediction);
      if (result.aiImage) {
        setAiImage(result.aiImage);
      }
    } catch (err) {
      setGenAiPrediction("Error");
    } finally {
      setGenAiLoading(false);
    }
  };

  // Combined function to run both predict and AI generate
  const handlePredictAndGenerate = async () => {
    // Run both operations simultaneously
    await Promise.all([
      handlePredict(),
      handleGenAiPredict()
    ]);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top right, #232336 60%, #18181b 100%)', p: 0 }}>
        <AppBar position="static" color="primary" sx={{ background: 'linear-gradient(90deg, #232336 40%, #6366f1 100%)', boxShadow: 3 }}>
          <Toolbar sx={{ display: 'flex', gap: 2 }}>
            <BrushIcon sx={{ mr: 1, fontSize: 32 }} />
            <Typography
              variant="h4"
              sx={{
                flexGrow: 1,
                fontWeight: 600,
                letterSpacing: 1.5,
                fontFamily: 'Inter, Roboto, Helvetica Neue, Arial, sans-serif',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                userSelect: 'none',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#06b6d4" opacity="0.9" />
                <path d="M19 15L19.5 17L21.5 17.5L19.5 18L19 20L18.5 18L16.5 17.5L18.5 17L19 15Z" fill="#f472b6" opacity="0.8" />
                <path d="M5 6L5.5 7.5L7 8L5.5 8.5L5 10L4.5 8.5L3 8L4.5 7.5L5 6Z" fill="#a5b4fc" opacity="0.7" />
              </svg>
              Doodle Recognizer
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setShowInfo(true)}
              sx={{ fontWeight: 600, borderRadius: 8, px: 2, fontSize: 16, mr: 2 }}
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
          </Toolbar>
        </AppBar>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', p: 3 }}>
          {/* Control Buttons - Above canvas */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 2))}
                sx={{ minWidth: 36, px: 0, fontWeight: 700 }}
              >-
              </Button>
              <Typography sx={{ mx: 1, fontWeight: 700, fontSize: 18, color: '#6366f1' }}>
                Brush: {strokeWidth}px
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setStrokeWidth(Math.min(100, strokeWidth + 2))}
                sx={{ minWidth: 36, px: 0, fontWeight: 700 }}
              >+
              </Button>
              <Button
                variant={isErasing ? "contained" : "outlined"}
                color={isErasing ? "primary" : "secondary"}
                onClick={() => setIsErasing(!isErasing)}
                sx={{ fontWeight: 700 }}
              >{isErasing ? 'Eraser (On)' : 'Eraser'}
              </Button>
              
              {/* Elegant Color Palette */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                ml: 3,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                padding: '12px 16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}>
                <Typography sx={{ 
                  fontWeight: 600, 
                  fontSize: 15, 
                  color: '#e2e8f0', 
                  letterSpacing: 0.5,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}>Palette</Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {[
                    { color: '#1a1a1a', name: 'Charcoal', shadow: 'rgba(26,26,26,0.4)' },
                    { color: '#dc2626', name: 'Crimson', shadow: 'rgba(220,38,38,0.4)' },
                    { color: '#2563eb', name: 'Sapphire', shadow: 'rgba(37,99,235,0.4)' },
                    { color: '#059669', name: 'Emerald', shadow: 'rgba(5,150,105,0.4)' },
                    { color: '#d97706', name: 'Amber', shadow: 'rgba(217,119,6,0.4)' },
                    { color: '#7c3aed', name: 'Violet', shadow: 'rgba(124,58,237,0.4)' },
                    { color: '#ea580c', name: 'Tangerine', shadow: 'rgba(234,88,12,0.4)' },
                    { color: '#0891b2', name: 'Teal', shadow: 'rgba(8,145,178,0.4)' }
                  ].map((colorOption) => (
                    <Box
                      key={colorOption.color}
                      onClick={() => setBrushColor(colorOption.color)}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colorOption.color} 0%, ${colorOption.color}dd 100%)`,
                        border: brushColor === colorOption.color 
                          ? '3px solid #ffffff' 
                          : '2px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: brushColor === colorOption.color 
                          ? `0 0 0 2px ${colorOption.color}44, 0 8px 25px ${colorOption.shadow}` 
                          : `0 4px 15px ${colorOption.shadow}`,
                        '&:hover': {
                          transform: 'translateY(-2px) scale(1.1)',
                          boxShadow: `0 0 0 2px ${colorOption.color}66, 0 12px 35px ${colorOption.shadow}`,
                          border: '2px solid rgba(255,255,255,0.4)'
                        },
                        '&:active': {
                          transform: 'translateY(0) scale(1.05)'
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.2)',
                          transform: 'translate(-50%, -50%)',
                          opacity: brushColor === colorOption.color ? 1 : 0,
                          transition: 'opacity 0.2s ease'
                        }
                      }}
                      title={colorOption.name}
                    />
                  ))}
                </Box>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={clearCanvas}
                sx={{ fontWeight: 700 }}
              >Clear
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={downloadUserDrawing}
                sx={{ fontWeight: 700 }}
              >Download Drawing
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={downloadAIDrawing}
                disabled={!aiImage}
                sx={{ fontWeight: 700 }}
              >Download AI Image
              </Button>
            </Box>
          </Box>
          
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{
              border: '2.5px solid #6366f1',
              borderRadius: 18,
              background: '#fff',
              boxShadow: '0 4px 18px 0 rgba(31, 38, 135, 0.08)',
              touchAction: 'none',
              maxWidth: '98vw',
              maxHeight: '60vw',
              cursor: 'crosshair',
              marginBottom: 18
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mt: 2, mb: 2, width: '100%', justifyContent: 'center', alignItems: 'stretch' }}>
            <Paper elevation={3} sx={{ flex: 1, p: 2.5, background: 'rgba(36,41,60,0.97)', borderRadius: 10, border: '2px solid #f472b6', minWidth: 240, maxWidth: 420, textAlign: 'center', mb: { xs: 2, md: 0 } }}>
              <Typography variant="subtitle1" sx={{ color: '#f472b6', fontWeight: 600, letterSpacing: 1, mb: 1 }}>
                Model Prediction
              </Typography>
              <Typography variant="h5" sx={{ color: prediction ? '#f472b6' : '#64748b', fontWeight: 700, letterSpacing: 2 }}>
                {prediction || '—'}
              </Typography>
            </Paper>
            <Paper elevation={3} sx={{ flex: 1, p: 2.5, background: 'rgba(36,41,60,0.97)', borderRadius: 10, border: '2px solid #06b6d4', minWidth: 240, maxWidth: 480, textAlign: 'center' }}>
              <Typography variant="subtitle1" sx={{ color: '#a5b4fc', fontWeight: 600, letterSpacing: 1, mb: 1 }}>
                AI Prediction
              </Typography>
              <Typography variant="h5" sx={{ color: genAiPrediction ? '#06b6d4' : '#64748b', fontWeight: 700, letterSpacing: 2 }}>
                {genAiPrediction || '—'}
              </Typography>
              {aiImage && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src={aiImage} alt="AI Drawing" style={{ maxWidth: 180, borderRadius: 8, border: '1px solid #6366f1', background: '#fff', boxShadow: '0 2px 8px #23233644' }} />
                  <Typography variant="caption" sx={{ color: '#a5b4fc', mt: 1 }}>
                    AI generated drawing
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
          
          {/* Only Predict and AI Generate buttons at bottom */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', mt: 4 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePredictAndGenerate}
                disabled={loading || genAiLoading}
                sx={{ fontWeight: 700, px: 4, py: 1.5, fontSize: 16 }}
              >{(loading || genAiLoading) ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Predict & Generate AI'}
              </Button>
            </Box>
            {feedback && (
              <Typography variant="h6" sx={{ mt: 2, color: '#06b6d4', fontWeight: 600 }}>
                {feedback}
              </Typography>
            )}
          </Box>
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#232336',
            color: '#f3f4f6',
            padding: '24px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            border: '1px solid #6366f1'
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
                color: '#a5b4fc',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
            <h2 style={{ color: '#6366f1', marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>About Doodle Recognizer</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>
              This advanced doodle recognition app uses machine learning to identify your drawings and generate AI-powered artwork based on your sketches.
            </p>
            <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>
              <strong>Features:</strong>
            </p>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>Real-time drawing recognition using neural networks</li>
              <li>AI-powered image generation based on your doodles</li>
              <li>Customizable brush size and colors</li>
              <li>Download your drawings and AI-generated images</li>
              <li>Responsive canvas that adapts to your screen</li>
            </ul>
            <p style={{ lineHeight: '1.6', marginTop: '16px', fontSize: '14px', color: '#a5b4fc' }}>
              Draw something and click "Predict & Generate AI" to see the magic happen!
            </p>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App; 
