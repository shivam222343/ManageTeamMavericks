import React, { useRef, useState, useEffect } from 'react';
import {
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  Eraser,
  Undo,
  Redo,
  Trash2,
  Download,
  Check,
  X,
  Palette,
  Sliders
} from 'lucide-react';

const DrawingCanvasModal = ({
  isOpen,
  onClose,
  onSave,
  initialDataUrl = null,
  title = 'Diagram / Drawing Editor'
}) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('freehand'); // 'freehand' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'eraser'
  const [color, setColor] = useState('#6366f1');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState(null);

  const colors = [
    '#ffffff',
    '#000000',
    '#6366f1',
    '#3b82f6',
    '#10b981',
    '#ef4444',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6'
  ];

  // Initialize canvas
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      // Set background color
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (initialDataUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          saveState();
        };
        img.src = initialDataUrl;
      } else {
        saveState();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, initialDataUrl]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, dataUrl];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      loadHistoryImage(history[nextIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      loadHistoryImage(history[nextIndex]);
    }
  };

  const loadHistoryImage = (dataUrl) => {
    const canvas = canvasRef.current;
    if (!canvas || !dataUrl) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    if (tool === 'text') {
      const coords = getCanvasCoords(e);
      setTextPos(coords);
      return;
    }

    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e);

    ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : color;
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 4 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'freehand' || tool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else {
      // Shape preview - restore current checkpoint first
      if (history[historyIndex]) {
        const img = new Image();
        img.src = history[historyIndex];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;

      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (tool === 'arrow') {
        drawArrow(ctx, startPos.x, startPos.y, coords.x, coords.y);
      } else if (tool === 'rectangle') {
        ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headlen = 14;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const stopDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  const handleApplyText = () => {
    if (!textPos || !textInput.trim()) {
      setTextPos(null);
      setTextInput('');
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextPos(null);
    setTextInput('');
    saveState();
  };

  const handleSaveAndClose = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">{title}</h3>
              <p className="text-xs text-zinc-400">Draw diagrams, flowcharts, architectures, or sketch answers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 bg-zinc-950/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Tool buttons */}
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            {[
              { id: 'freehand', label: 'Draw', icon: Pencil },
              { id: 'line', label: 'Line', icon: Minus },
              { id: 'arrow', label: 'Arrow', icon: ArrowRight },
              { id: 'rectangle', label: 'Rect', icon: Square },
              { id: 'circle', label: 'Circle', icon: Circle },
              { id: 'text', label: 'Text', icon: Type },
              { id: 'eraser', label: 'Eraser', icon: Eraser }
            ].map((t) => {
              const Icon = t.icon;
              const isActive = tool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Color palette */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800">
            <Palette className="w-4 h-4 text-zinc-400 mr-1 hidden sm:block" />
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border transition transform ${
                  color === c ? 'scale-125 border-white ring-2 ring-indigo-500/50' : 'border-zinc-700 hover:scale-110'
                }`}
              />
            ))}
          </div>

          {/* Stroke Width & History */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-900/90 px-2 py-1 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 font-medium mr-1">Size:</span>
              {[2, 4, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                    strokeWidth === w ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded text-zinc-400 hover:text-white disabled:opacity-30 hover:bg-zinc-800"
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded text-zinc-400 hover:text-white disabled:opacity-30 hover:bg-zinc-800"
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Text Input Prompt Modal overlay inside canvas */}
        {textPos && (
          <div className="bg-zinc-950 px-4 py-2 border-b border-indigo-500/30 flex items-center gap-3 animate-in slide-in-from-top-2">
            <span className="text-indigo-400 text-xs font-semibold">Enter label text:</span>
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyText()}
              placeholder="e.g. Load Balancer, MySQL DB..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleApplyText}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
            >
              Add Text
            </button>
            <button
              onClick={() => setTextPos(null)}
              className="text-zinc-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 bg-zinc-950 p-4 flex items-center justify-center overflow-auto min-h-[360px]">
          <div className="relative border-2 border-zinc-800 rounded-xl overflow-hidden shadow-inner cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={800}
              height={450}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
              className="w-full max-w-[800px] h-auto bg-slate-900 block"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <p className="text-xs text-zinc-500 hidden sm:block">
            Tip: Select tools above and drag on the canvas to illustrate your solution.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-300 hover:text-white text-xs font-medium rounded-xl hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
            >
              <Check className="w-4 h-4" />
              Apply Diagram
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvasModal;
