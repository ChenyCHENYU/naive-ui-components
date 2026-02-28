import { ref, computed, readonly } from "vue";
import type { SignatureStroke } from "../types";

interface UseSignatureHistoryOptions {
  maxHistory?: number;
  onChange?: (strokes: SignatureStroke[]) => void;
}

export function useSignatureHistory(options: UseSignatureHistoryOptions = {}) {
  const { maxHistory = 50, onChange } = options;

  const strokes = ref<SignatureStroke[]>([]);
  const historyStack = ref<SignatureStroke[][]>([]);
  const historyIndex = ref(-1);

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(
    () => historyIndex.value < historyStack.value.length - 1,
  );

  const addStroke = (stroke: SignatureStroke) => {
    strokes.value.push(stroke);
    saveToHistory();
  };

  const saveToHistory = () => {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
    historyStack.value.push([...strokes.value]);
    historyIndex.value++;
    if (historyStack.value.length > maxHistory) {
      historyStack.value.shift();
      historyIndex.value--;
    }
    onChange?.(strokes.value);
  };

  const undo = (): boolean => {
    if (!canUndo.value) return false;
    historyIndex.value--;
    strokes.value = [...historyStack.value[historyIndex.value]];
    onChange?.(strokes.value);
    return true;
  };

  const redo = (): boolean => {
    if (!canRedo.value) return false;
    historyIndex.value++;
    strokes.value = [...historyStack.value[historyIndex.value]];
    onChange?.(strokes.value);
    return true;
  };

  const clear = () => {
    strokes.value = [];
    historyStack.value = [[]];
    historyIndex.value = 0;
    onChange?.(strokes.value);
  };

  const loadData = (data: SignatureStroke[]) => {
    strokes.value = [...data];
    historyStack.value = [[...data]];
    historyIndex.value = 0;
    onChange?.(strokes.value);
  };

  const isEmpty = computed(() => strokes.value.length === 0);

  // 初始化历史栈
  historyStack.value = [[]];
  historyIndex.value = 0;

  return {
    strokes: readonly(strokes),
    canUndo: readonly(canUndo),
    canRedo: readonly(canRedo),
    isEmpty: readonly(isEmpty),
    addStroke,
    undo,
    redo,
    clear,
    loadData,
  };
}
