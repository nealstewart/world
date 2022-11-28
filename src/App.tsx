import React, {useEffect, useRef, useState} from 'react';
import {range} from './util';
import './App.css';
import {ScaleLinear, scaleLinear} from 'd3-scale';
import {useWindowSize} from './reactUtils';

type Vector2d = [number, number];

const vectorMath = {
  add(a: Vector2d, b: Vector2d): Vector2d {
    return [a[0] + b[0], a[1] + b[1]];
  },
};

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
      (prev, curr) => prev * (2 * curr - 1),
      1
    );
    return Math.PI * (a + b) * (1 + thing);
  },

  calcRotationalPoint({a, b}: EllipseShape, t: number): Vector2d {
    return [a * Math.cos(t), b * Math.sin(t)];
  },
};

const circleHelpers = {
  calcRotationalPoint(radius: number, t: number): Vector2d {
    return [radius * Math.cos(t), radius * Math.sin(t)];
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
  rotation: number;
  readonly target: CelestialObject;
  readonly rotationalVelocity: OrbitalVelocity;
  readonly shape: EllipseShape | number;
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

type Cloud = {mass: number} & CelestialObject;

interface WorldState {
  tick: number;
  planet: CelestialObject;
  sun: CelestialObject;
  clouds: Array<Cloud>;
}

const ticksInADay = 100;
const ticksInAYear = 500;

const sunOrbitEllipse: EllipseShape = {
  a: 175,
  b: 200,
};

function createRandomCloud(planet: CelestialObject): Cloud {
  const initialRotation = Math.random() * 2 * Math.PI;
  const minimumCloudHeight = 1;
  const orbitalRadius =
    planet.radius * 2 + minimumCloudHeight + Math.random() * 1;
  const direction = Math.random() > 0.5 ? -1 : 1;
  return {
    radius: 0.4 + Math.random() * 0.2,
    rotationalVelocity: 0,
    rotation: 0,
    location: circleHelpers.calcRotationalPoint(orbitalRadius, initialRotation),
    orbit: {
      target: planet,
      rotationalVelocity:
        (direction * (2 * Math.PI)) / (Math.random() * 20 + 20000),
      rotation: initialRotation,
      shape: orbitalRadius,
    },
    mass: 1,
  };
}

function createInitialWorldState() {
  const planet: CelestialObject = {
    location: [0, 0],
    rotation: 0,
    radius: 3,
    rotationalVelocity: (2 * Math.PI) / ticksInADay,
    orbit: null,
  };

  // const circumferenceOfSolarOrbit =
  //   ellipseHelpers.circumference(sunOrbitEllipse);

  const clouds: Array<CelestialObject> = Array.from(range(20)).map(() =>
    createRandomCloud(planet)
  );

  const worldState: WorldState = {
    tick: 0,
    planet: planet,
    sun: {
      rotation: 0,
      location: ellipseHelpers.calcRotationalPoint(sunOrbitEllipse, 0),
      radius: 20,
      rotationalVelocity: 0,
      orbit: {
        rotation: 0,
        rotationalVelocity: (2 * Math.PI) / ticksInAYear,
        target: planet,
        shape: sunOrbitEllipse,
      },
    },
    clouds: clouds,
  };

  return worldState;
}

function drawEllipse(
  context: CanvasRenderingContext2D,
  scales: Scales,
  obj: CelestialObject
) {
  context.beginPath();
  context.strokeStyle = 'black';

  context.ellipse(
    scales.x(obj.location[0]),
    scales.y(obj.location[1]),
    scales.size(obj.radius),
    scales.size(obj.radius),
    0,
    0,
    Math.PI * 2,
    false
  );

  context.stroke();
}

interface Scales {
  x: ScaleLinear<number, number>;
  y: ScaleLinear<number, number>;
  size: ScaleLinear<number, number>;
}

function createScales(
  canvas: HTMLCanvasElement,
  worldState: WorldState
): Scales {
  const canvasRect = canvas.getBoundingClientRect();
  const scaleFactor = 10;
  const min = Math.min(canvasRect.width, canvasRect.height);
  const xRemainder = canvasRect.width - min;
  const yRemainder = canvasRect.height - min;
  return {
    x: scaleLinear(
      [-scaleFactor, scaleFactor],
      [xRemainder / 2, min + xRemainder / 2]
    ),
    y: scaleLinear(
      [-scaleFactor, scaleFactor],
      [min + yRemainder / 2, yRemainder / 2]
    ),
    size: scaleLinear([0, scaleFactor * 2], [0, min]),
  };
}

function drawWorld(
  worldState,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  scales: Scales
) {
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'black';
  const {sun, planet, clouds} = worldState;
  drawEllipse(context, scales, sun);
  drawEllipse(context, scales, planet);

  for (const cloud of clouds) {
    drawEllipse(context, scales, cloud);
  }
}

function tickWorld(worldState: WorldState) {
  const {sun, planet, clouds} = worldState;
  const things: Array<CelestialObject> = [sun, planet, ...clouds];

  for (const thing of things) {
    thing.rotation += thing.rotationalVelocity;
    if (thing.orbit) {
      thing.orbit.rotation += thing.orbit.rotationalVelocity;

      const {
        rotationalVelocity: orbitalVelocity,
        target,
        shape: rotationShape,
        rotation: orbitalRotation,
      } = thing.orbit;

      const newLocationRelativeToTarget =
        typeof rotationShape === 'number'
          ? circleHelpers.calcRotationalPoint(rotationShape, orbitalRotation)
          : ellipseHelpers.calcRotationalPoint(rotationShape, orbitalRotation);

      thing.location = vectorMath.add(
        newLocationRelativeToTarget,
        target.location
      );
    }
  }

  // for (const cloud of clouds) {
  //   let cloudsToCombine = []
  //   for (const otherCloud of clouds) {
  //     if

  //   }
  // }
}

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
    tickWorld(worldState);
    drawWorld(worldState, canvas, context, scales);
    onAnimationFrame(requestAnimationFrame(worldStep));
  }

  onAnimationFrame(requestAnimationFrame(worldStep));
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [coords, setCoords] = useState<Vector2d>([0, 0]);
  const [scales, setScales] = useState<Scales | null>(null);
  const [worldState, setWorldState] = useState<WorldState | null>(null);
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
