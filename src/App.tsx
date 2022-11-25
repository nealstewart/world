import React, {useEffect, useRef} from 'react';
import logo from './logo.svg';
import {range} from './util';
import './App.css';
import {ScaleLinear, scaleLinear} from 'd3-scale';

type Vector2d = [number, number];

/**
 * An aliased vector which describes the ratio which a circle has been
 * distorted to make it an alias.
 */
interface EllipseShape {
  a: number;
  b: number;
}

const ellipseHelpers = {
  circumference({a, b}: EllipseShape, precision = 1000) {
    const thing = Array.from(range(1, precision + 1)).reduce(
      (prev, curr) => prev * (2 * curr - 1)
    );
    return Math.PI * (a + b) * (1 + thing);
  },

  calcRotationalPoint({a, b}: EllipseShape, t: number): Vector2d {
    return [a * Math.cos(t), b * Math.sin(t)];
  },
};

/**
 * Unit: Radians
 */
type RotationalVelocity = number;

/**
 * Unit: Spatial
 */
type OrbitalVelocity = number;

/**
 * A description of the orbit of a CelestialObject.
 */
interface Orbit {
  target: CelestialObject;
  orbitalVelocity: OrbitalVelocity;
  ellipseShape: EllipseShape;
}

/**
 * An object in the heavens of this little world.
 */
interface CelestialObject {
  location: Vector2d;
  rotation: number;
  readonly orbit: Orbit | null;
  readonly radius: number;
  readonly rotationalVelocity: RotationalVelocity;
}

interface WorldState {
  tick: number;
  planet: CelestialObject;
  sun: CelestialObject;
}

function calculateCircleCircumference(radius: number) {
  return 2 * Math.PI * radius;
}

const ticksInADay = 100;
const ticksInAYear = 1000;

const sunOrbitEllipse: EllipseShape = {
  a: 100,
  b: 200,
};

function createInitialWorldState() {
  const planet: CelestialObject = {
    location: [0, 0],
    rotation: 0,
    radius: 3,
    rotationalVelocity: (2 * Math.PI) / ticksInADay,
    orbit: null,
  };

  const circumferenceOfSolarOrbit =
    ellipseHelpers.circumference(sunOrbitEllipse);

  const worldState: WorldState = {
    tick: 0,
    planet: planet,
    sun: {
      rotation: 0,
      location: ellipseHelpers.calcRotationalPoint(sunOrbitEllipse, 0),
      radius: 20,
      rotationalVelocity: 0,
      orbit: {
        target: planet,
        orbitalVelocity: circumferenceOfSolarOrbit / ticksInAYear,
        ellipseShape: sunOrbitEllipse,
      },
    },
  };

  return worldState;
}

function drawEllipse(
  context: CanvasRenderingContext2D,
  xScale: ScaleLinear<number, number>,
  yScale: ScaleLinear<number, number>,
  sizeScale: ScaleLinear<number, number>,
  obj: CelestialObject
) {
  context.beginPath();
  context.strokeStyle = 'black';

  context.ellipse(
    xScale(obj.location[0]),
    yScale(obj.location[1]),
    sizeScale(obj.radius),
    sizeScale(obj.radius),
    0,
    0,
    Math.PI * 2,
    false
  );

  context.stroke();
}

function drawWorld(
  worldState,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) {
  const canvasRect = canvas.getBoundingClientRect();
  const xScale = scaleLinear([-400, 400], [0, canvasRect.width]);
  const yScale = scaleLinear([-400, 400], [canvasRect.width, 0]);
  const sizeScale = scaleLinear([0, 800], [0, canvasRect.width]);

  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'black';
  const {sun, planet} = worldState;
  drawEllipse(context, xScale, yScale, sizeScale, sun);
  drawEllipse(context, xScale, yScale, sizeScale, planet);
}

function startWorldLoop(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) {
  const worldState = createInitialWorldState();
  canvas.width = document.body.clientWidth; //document.width is obsolete
  canvas.height = document.body.clientHeight; //document.height is obsolete

  drawWorld(worldState, canvas, context);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  function startRenderLoop() {
    if (!canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');

    startWorldLoop(canvasRef.current!, context!);
  }
  useEffect(startRenderLoop, [canvasRef]);
  return <canvas ref={canvasRef}></canvas>;
}

export default App;
