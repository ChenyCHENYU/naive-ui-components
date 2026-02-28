import { ref } from "vue";
import type { Ref } from "vue";
import type { CropOutputFormat, CropResult } from "../types";

interface UseCropperCoreOptions {
  format?: Ref<CropOutputFormat>;
  quality?: Ref<number>;
  maxWidth?: Ref<number>;
  maxHeight?: Ref<number>;
}

export function useCropperCore(options: UseCropperCoreOptions = {}) {
  const cropperRef = ref<any>(null);

  function rotateLeft() {
    cropperRef.value?.rotateLeft();
  }

  function rotateRight() {
    cropperRef.value?.rotateRight();
  }

  function rotate(angle: number) {
    const steps = Math.round(angle / 90);
    const fn = steps > 0 ? rotateRight : rotateLeft;
    for (let i = 0; i < Math.abs(steps); i++) fn();
  }

  function zoom(scale: number) {
    cropperRef.value?.changeScale(scale > 0 ? 1 : -1);
  }

  function flipX() {
    const el = cropperRef.value?.$refs?.img;
    if (!el) return;
    const current = el.style.transform || "";
    if (current.includes("scaleX(-1)")) {
      el.style.transform = current.replace("scaleX(-1)", "scaleX(1)");
    } else {
      el.style.transform =
        current.replace(/scaleX\([^)]*\)/, "") + " scaleX(-1)";
    }
  }

  function flipY() {
    const el = cropperRef.value?.$refs?.img;
    if (!el) return;
    const current = el.style.transform || "";
    if (current.includes("scaleY(-1)")) {
      el.style.transform = current.replace("scaleY(-1)", "scaleY(1)");
    } else {
      el.style.transform =
        current.replace(/scaleY\([^)]*\)/, "") + " scaleY(-1)";
    }
  }

  function reset() {
    cropperRef.value?.refresh();
  }

  function constrainSize(w: number, h: number) {
    let ow = w;
    let oh = h;
    const maxW = options.maxWidth?.value ?? 0;
    const maxH = options.maxHeight?.value ?? 0;

    if (maxW > 0 && ow > maxW) {
      const ratio = maxW / ow;
      ow = maxW;
      oh = Math.round(oh * ratio);
    }
    if (maxH > 0 && oh > maxH) {
      const ratio = maxH / oh;
      oh = maxH;
      ow = Math.round(ow * ratio);
    }
    return { width: ow, height: oh };
  }

  function getCropResult(): Promise<CropResult> {
    return new Promise((resolve, reject) => {
      const cropper = cropperRef.value;
      if (!cropper) return reject(new Error("Cropper not initialized"));

      const format = options.format?.value ?? "png";
      const quality = options.quality?.value ?? 0.92;
      const mime =
        format === "jpeg"
          ? "image/jpeg"
          : format === "webp"
            ? "image/webp"
            : "image/png";

      cropper.getCropData((base64: string) => {
        cropper.getCropBlob((blob: Blob) => {
          const img = new Image();
          img.onload = () => {
            const { width, height } = constrainSize(img.width, img.height);

            if (width !== img.width || height !== img.height) {
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(img, 0, 0, width, height);
              const constrainedBase64 = canvas.toDataURL(mime, quality);
              canvas.toBlob(
                (constrainedBlob) => {
                  resolve({
                    base64: constrainedBase64,
                    blob: constrainedBlob!,
                    width,
                    height,
                    format,
                  });
                },
                mime,
                format === "png" ? undefined : quality,
              );
            } else {
              resolve({
                base64,
                blob,
                width: img.width,
                height: img.height,
                format,
              });
            }
          };
          img.onerror = () => reject(new Error("Failed to load crop result"));
          img.src = base64;
        });
      });
    });
  }

  return {
    cropperRef,
    rotate,
    rotateLeft,
    rotateRight,
    zoom,
    flipX,
    flipY,
    reset,
    getCropResult,
  };
}
