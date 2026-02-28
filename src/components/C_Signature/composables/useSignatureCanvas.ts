import type { Ref } from "vue";
import { ref, readonly } from "vue";
import type {
  PenConfig,
  PenMode,
  SignaturePoint,
  SignatureStroke,
} from "../types";

interface UseSignatureCanvasOptions {
  canvasRef: Ref<HTMLCanvasElement | null>;
  penConfig: Ref<PenConfig>;
  mode: Ref<PenMode>;
  disabled: Ref<boolean>;
  onStrokeComplete: (stroke: SignatureStroke) => void;
  onDrawStart: () => void;
  onDrawing: (point: SignaturePoint) => void;
}

export function useSignatureCanvas(options: UseSignatureCanvasOptions) {
  const {
    canvasRef,
    penConfig,
    mode,
    disabled,
    onStrokeComplete,
    onDrawStart,
    onDrawing,
  } = options;

  const isDrawing = ref(false);
  const currentStroke = ref<SignaturePoint[]>([]);
  let ctx: CanvasRenderingContext2D | null = null;

  const initCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const getPointFromEvent = (e: MouseEvent | TouchEvent): SignaturePoint => {
    const canvas = canvasRef.value;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;
    if ("touches" in e && e.touches.length > 0) {
      ({ clientX, clientY } = e.touches[0]);
    } else if ("clientX" in e) {
      ({ clientX, clientY } = e);
    } else {
      return { x: 0, y: 0 };
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      timestamp: Date.now(),
    };
  };

  const drawStroke = (
    from: SignaturePoint,
    to: SignaturePoint,
    config: PenConfig,
    eraserMode = false,
  ) => {
    if (!ctx) return;
    ctx.save();
    if (eraserMode) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 20;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.width;
      ctx.globalAlpha = config.opacity;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    if (disabled.value) return;
    e.preventDefault();
    isDrawing.value = true;
    currentStroke.value = [];
    const point = getPointFromEvent(e);
    currentStroke.value.push(point);
    onDrawStart();
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing.value || disabled.value) return;
    e.preventDefault();
    const point = getPointFromEvent(e);
    const lastPoint = currentStroke.value[currentStroke.value.length - 1];
    if (lastPoint) {
      drawStroke(lastPoint, point, penConfig.value, mode.value === "eraser");
    }
    currentStroke.value.push(point);
    onDrawing(point);
  };

  const endDrawing = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing.value || disabled.value) return;
    e.preventDefault();
    isDrawing.value = false;
    if (currentStroke.value.length > 0) {
      const stroke: SignatureStroke = {
        points: [...currentStroke.value],
        color: penConfig.value.color,
        width: penConfig.value.width,
        opacity: penConfig.value.opacity,
        mode: mode.value,
      };
      onStrokeComplete(stroke);
      currentStroke.value = [];
    }
  };

  const redrawStrokes = (strokes: SignatureStroke[]) => {
    if (!ctx || !canvasRef.value) return;
    const canvas = canvasRef.value;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => {
      for (let i = 1; i < stroke.points.length; i++) {
        drawStroke(
          stroke.points[i - 1],
          stroke.points[i],
          { color: stroke.color, width: stroke.width, opacity: stroke.opacity },
          stroke.mode === "eraser",
        );
      }
    });
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.value) return;
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  };

  const bindEvents = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDrawing);
    canvas.addEventListener("mouseleave", endDrawing);
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDrawing);
    canvas.addEventListener("touchcancel", endDrawing);
  };

  const unbindEvents = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    canvas.removeEventListener("mousedown", startDrawing);
    canvas.removeEventListener("mousemove", draw);
    canvas.removeEventListener("mouseup", endDrawing);
    canvas.removeEventListener("mouseleave", endDrawing);
    canvas.removeEventListener("touchstart", startDrawing);
    canvas.removeEventListener("touchmove", draw);
    canvas.removeEventListener("touchend", endDrawing);
    canvas.removeEventListener("touchcancel", endDrawing);
  };

  return {
    isDrawing: readonly(isDrawing),
    initCanvas,
    bindEvents,
    unbindEvents,
    redrawStrokes,
    clearCanvas,
  };
}
