import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/shared/ui/Button";

interface SignaturePadProps {
  disabled?: boolean;
  resetKey?: number;
  onChange: (signature: string | null) => void;
}

export function SignaturePad({
  disabled = false,
  resetKey = 0,
  onChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  function setupCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return null;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#111111";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";

    return { canvas, context };
  }

  function publishSignature() {
    const canvas = canvasRef.current;

    if (!canvas || !hasStrokeRef.current) {
      onChange(null);
      return;
    }

    onChange(canvas.toDataURL("image/png"));
  }

  function clearCanvas() {
    const result = setupCanvas();

    if (!result) {
      return;
    }

    hasStrokeRef.current = false;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    onChange(null);
  }

  function getPoint(event: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function drawDot(x: number, y: number) {
    const context = canvasRef.current?.getContext("2d");

    if (!context) {
      return;
    }

    context.beginPath();
    context.arc(x, y, 1.5, 0, Math.PI * 2);
    context.fillStyle = "#111111";
    context.fill();
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const point = getPoint(event, canvas);
    isDrawingRef.current = true;
    hasStrokeRef.current = true;
    lastPointRef.current = point;

    drawDot(point.x, point.y);
    publishSignature();
  }

  function continueDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || disabled) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const previousPoint = lastPointRef.current;

    if (!canvas || !context || !previousPoint) {
      return;
    }

    event.preventDefault();
    const nextPoint = getPoint(event, canvas);

    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();

    lastPointRef.current = nextPoint;
  }

  function finishDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (!isDrawingRef.current) {
      return;
    }

    event.preventDefault();
    isDrawingRef.current = false;
    lastPointRef.current = null;
    publishSignature();
  }

  useEffect(() => {
    clearCanvas();
  }, [resetKey]);

  return (
    <div className="stack-sm">
      <canvas
        ref={canvasRef}
        width={720}
        height={220}
        className="signature-pad-canvas"
        onPointerDown={startDrawing}
        onPointerMove={continueDrawing}
        onPointerUp={finishDrawing}
        onPointerLeave={finishDrawing}
        onPointerCancel={finishDrawing}
      />
      <div className="row-wrap">
        <Button type="button" variant="ghost" onClick={clearCanvas} disabled={disabled}>
          Limpiar trazo
        </Button>
        <span className="helper-text">Firma con mouse, trackpad o dedo sobre el recuadro.</span>
      </div>
    </div>
  );
}
