import { useEffect, type RefObject } from 'react';

type ChromaKeyOptions = {
  minHue: number;
  maxHue: number;
  minSaturation: number;
  threshold: number;
};

const DEFAULT_OPTIONS: ChromaKeyOptions = {
  minHue: 60,
  maxHue: 180,
  minSaturation: 0.1,
  threshold: 1,
};

function pixelHue(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = max === red
    ? ((green - blue) / delta) % 6
    : max === green
      ? (blue - red) / delta + 2
      : (red - green) / delta + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

function applyChromaKey(
  sourceVideo: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  options: ChromaKeyOptions,
) {
  if (sourceVideo.readyState < 2 || sourceVideo.videoWidth === 0 || sourceVideo.videoHeight === 0) return;
  if (canvas.width !== sourceVideo.videoWidth || canvas.height !== sourceVideo.videoHeight) {
    canvas.width = sourceVideo.videoWidth;
    canvas.height = sourceVideo.videoHeight;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const max = Math.max(red, green, blue);
    const saturation = max === 0 ? 0 : (max - Math.min(red, green, blue)) / max;
    const hue = pixelHue(red, green, blue);
    const isGreen = hue >= options.minHue
      && hue <= options.maxHue
      && saturation > options.minSaturation
      && max / 255 > 0.15
      && green > red * options.threshold
      && green > blue * options.threshold;
    if (isGreen) {
      const greenness = (green - Math.max(red, blue)) / (green || 1);
      const alpha = Math.max(0, 1 - greenness * 4);
      data[index + 3] = alpha < 0.2 ? 0 : Math.round(alpha * 255);
    }
  }
  context.putImageData(imageData, 0, 0);
}

export function setupAvatarBackgroundCompositor(
  sourceVideo: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  options: ChromaKeyOptions = DEFAULT_OPTIONS,
) {
  const context = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
  if (!context) return () => {};
  let animationFrameId: number | null = null;
  const render = () => {
    if (sourceVideo.srcObject) applyChromaKey(sourceVideo, canvas, context, options);
    animationFrameId = requestAnimationFrame(render);
  };
  render();
  return () => {
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    context.clearRect(0, 0, canvas.width, canvas.height);
  };
}

export function useAvatarBackgroundCompositor(
  sourceVideoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const sourceVideo = sourceVideoRef.current;
    const canvas = canvasRef.current;
    if (!sourceVideo || !canvas) return;
    return setupAvatarBackgroundCompositor(sourceVideo, canvas);
  }, [canvasRef, enabled, sourceVideoRef]);
}
