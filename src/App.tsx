import React, {useEffect, useRef, useState} from 'react';
import './App.css';
import {useWindowSize} from './reactUtils';
import * as vectorMath from './vectorMath';
import {Scales, createScales, drawWorld} from './drawing';
import {WorldState} from './world';
import {tickWorld, createInitialWorldState} from './tickWorld';

export type Vector2d = [number, number];

window.vectorMath = vectorMath;

function startWorldLoop(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  scales: Scales,
  worldState: WorldState,
  onAnimationFrame: (nextAnimationFrame: number) => void
) {
  canvas.width = document.body.clientWidth; //document.width is obsolete
  canvas.height = document.body.clientHeight; //document.height is obsolete

  drawWorld(worldState, canvas, context, scales);

  function worldStep() {
    drawWorld(worldState, canvas, context, scales);
    onAnimationFrame(requestAnimationFrame(worldStep));
  }

  onAnimationFrame(requestAnimationFrame(worldStep));

  const hopefulFrameRate = 1000 / 120;

  function requestTick() {
    tickWorld(worldState);
    setTimeout(requestTick, hopefulFrameRate);
  }
  setTimeout(requestTick, hopefulFrameRate);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [coords, setCoords] = useState<Vector2d>([0, 0]);
  const [scales, setScales] = useState<Scales | undefined>(undefined);
  const [worldState, setWorldState] = useState<WorldState | undefined>(
    undefined
  );
  const [animationFrame, setAnimationFrame] = useState(0);
  const windowSize = useWindowSize();
  if (!worldState) {
    setWorldState(createInitialWorldState());
  }
  function startRenderLoop() {
    if (!canvasRef.current || !worldState) return;

    cancelAnimationFrame(animationFrame);

    const context = canvasRef.current.getContext('2d');
    const scales = createScales(canvasRef.current, worldState);
    setScales(scales);

    startWorldLoop(
      canvasRef.current!,
      context!,
      scales,
      worldState,
      nextAnimationFrame => setAnimationFrame(nextAnimationFrame)
    );
  }

  function onMouseMove(evt: React.MouseEvent<HTMLCanvasElement>) {
    setCoords([evt.clientX, evt.clientY]);
  }

  useEffect(startRenderLoop, [canvasRef, windowSize]);

  const worldCoords: Vector2d = scales
    ? [scales.x.invert(coords[0]), scales.y.invert(coords[1])]
    : [0, 0];

  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} onMouseMove={onMouseMove}></canvas>
      <div className="coords">
        {coords[0]}, {coords[1]} <br />
        {worldCoords[0]}, {worldCoords[1]} <br />
      </div>
    </div>
  );
}

export default App;
