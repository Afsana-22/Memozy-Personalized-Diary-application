import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';

export type DrawCanvasHandle = {
  exportBlob: (type?: string, quality?: number) => Promise<Blob | null>;
  clear: () => void;
};

const DrawCanvas = forwardRef<DrawCanvasHandle, { width?: number; height?: number }>(function DrawCanvas(props, ref) {
  const { width = 800, height = 400 } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(4);
  const [history, setHistory] = useState<string[]>([]); // dataURL history for undo

  useEffect(() => {
    const c = canvasRef.current!;
    c.width = width * 1; // device pixels simplified
    c.height = height * 1;
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctxRef.current = ctx;
    // push initial state
    pushHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = color;
    }
  }, [color]);

  useEffect(() => {
    if (ctxRef.current) ctxRef.current.lineWidth = size;
  }, [size]);

  function getPoint(e: PointerEvent | React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e as any).clientX - rect.left,
      y: (e as any).clientY - rect.top,
    };
  }

  function pointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture((e as any).pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(e);
  }

  function pointerMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    const p = getPoint(e);
    const ctx = ctxRef.current!;
    if (!ctx || !lastPoint.current) return;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
  }

  function pointerUp(e: React.PointerEvent) {
    try {
      (e.target as Element).releasePointerCapture((e as any).pointerId);
    } catch {}
    drawing.current = false;
    lastPoint.current = null;
    pushHistory();
  }

  function pushHistory() {
    try {
      const data = canvasRef.current!.toDataURL('image/png');
      setHistory((h) => {
        const next = h.concat([data]);
        if (next.length > 20) next.shift();
        return next;
      });
    } catch (err) {
      // ignore
    }
  }

  function undo() {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const next = h.slice(0, -1);
      const last = next[next.length - 1];
      restoreFromDataUrl(last);
      return next;
    });
  }

  function restoreFromDataUrl(dataUrl: string) {
    const img = new Image();
    img.onload = () => {
      const ctx = ctxRef.current!;
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
    };
    img.src = dataUrl;
  }

  function clear() {
    const ctx = ctxRef.current!;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    pushHistory();
  }

  useImperativeHandle(ref, () => ({
    async exportBlob(type = 'image/png', quality = 0.92) {
      return await new Promise<Blob | null>((resolve) => {
        const c = canvasRef.current!;
        if (!c) return resolve(null);
        c.toBlob((b) => resolve(b), type, quality);
      });
    },
    clear: () => clear(),
  }), []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-sm">Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <label className="text-sm ml-2">Brush</label>
        <input type="range" min={1} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        <button type="button" className="ml-2 btn btn-outline btn-sm" onClick={undo}>Undo</button>
        <button type="button" className="ml-2 btn btn-outline btn-sm" onClick={clear}>Clear</button>
      </div>
      <div className="border rounded">
        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          style={{ touchAction: 'none', background: '#fff' }}
        />
      </div>
    </div>
  );
});

export default DrawCanvas;
