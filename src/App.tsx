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
  subtract(a: Vector2d, b: Vector2d): Vector2d {
    return [a[0] - b[0], a[1] - b[1]];
  },
  magnitude(a: Vector2d): number {
    return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2));
  },
  divide([x, y]: Vector2d, b: number): Vector2d {
    return [x / b, y / b];
  },
  multiply([x, y]: Vector2d, b: number): Vector2d {
    return [x * b, y * b];
  },
  unitVector(a: Vector2d): Vector2d {
    return vectorMath.divide(a, vectorMath.magnitude(a));
  },
  clipMagnitude(a: Vector2d, maxMagnitude: number): Vector2d {
    const magnitude = vectorMath.magnitude(a);
    if (magnitude > maxMagnitude) {
      return vectorMath.multiply(vectorMath.unitVector(a), maxMagnitude);
    }

    return a;
  },
};

window.vectorMath = vectorMath;

/**
 * An aliased vector which describes the ratio which a circle has been
 * distorted to make it an alias.
 */
type EllipseShape = [number, number];

const ellipseHelpers = {
  circumference([a, b]: EllipseShape, precision = 1000) {
    const thing = Array.from(range(1, precision + 1)).reduce(
      (prev, curr) => prev * (2 * curr - 1),
      1
    );
    return Math.PI * (a + b) * (1 + thing);
  },

  calcRotationalPoint([a, b]: EllipseShape, t: number): Vector2d {
    return [a * Math.cos(t), b * Math.sin(t)];
  },
};

const circleHelpers = {
  calcRotationalPoint(radius: number, t: number): Vector2d {
    return [radius * Math.cos(t), radius * Math.sin(t)];
  },
  convertRotationalVelocityToEuclideanVelocity(
    radius: number,
    rotation: number,
    rotationalVelocity: number
  ): Vector2d {
    return vectorMath.subtract(
      circleHelpers.calcRotationalPoint(radius, rotation + rotationalVelocity),
      circleHelpers.calcRotationalPoint(radius, rotation)
    );
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

type Shape = EllipseShape | number;

/**
 * A description of the orbit of a CelestialObject.
 */
interface Orbit {
  rotation: number;
  rotationalVelocity: OrbitalVelocity;
  readonly target: CelestialObject;
  readonly shape: Shape;
}

/**
 * An object in the heavens of this little world.
 */
interface CelestialObject {
  location: Vector2d;
  rotation: number;
  readonly orbit: Orbit | null;
  readonly shape: Shape;
  readonly rotationalVelocity: RotationalVelocity;
}

type Cloud = CelestialObject & {
  mass: number;
  orbit: Orbit;
  state: 'raining' | 'floating';
  friends: Set<Cloud>;
};

type Rain = {
  location: Vector2d;
  velocity: Vector2d;
};

type PlantPart = {
  extent: Vector2d;
  child: PlantPart;
};

type Plant = {
  // The location in radian units. All plants are on the planet, so
  // it's just the location relative to the surface of the circle.
  rotation: number;
  trunk: PlantPart;
};

interface WorldState {
  lastTick: Date;
  tick: number;
  planet: CelestialObject;
  sun: CelestialObject;
  water: {
    clouds: Array<Cloud>;
    rain: Array<Rain>;
    ground: number;
  };
  planets: Plant[];
}

const ticksInADay = 100;
const ticksInAYear = 500;

const sunOrbitEllipse: EllipseShape = [175, 200];

function createRandomCloud(planet: CelestialObject): Cloud {
  if (typeof planet.shape !== 'number') {
    throw new Error(
      'Clouds can only be created around circular CelestialObjects'
    );
  }

  const initialRotation = Math.random() * 2 * Math.PI;

  const minimumCloudHeight = 1;

  const orbitalRadius =
    planet.shape * 2 + minimumCloudHeight + Math.random() * 1;

  const direction = planet.rotationalVelocity > 0 ? 1 : -1;

  const rotationalVelocityCoefficient = Math.random() * 700 + 800;

  return {
    shape: [0.6 + Math.random() * 0.2, 0.4 + Math.random() * 0.2],
    rotationalVelocity: 0,
    rotation: 0,
    location: circleHelpers.calcRotationalPoint(orbitalRadius, initialRotation),
    orbit: {
      target: planet,
      rotationalVelocity:
        (direction * (2 * Math.PI)) / rotationalVelocityCoefficient,
      rotation: initialRotation,
      shape: orbitalRadius,
    },
    mass: 5,
    state: 'floating',
    friends: new Set(),
  };
}

function createInitialWorldState() {
  const planet: CelestialObject = {
    location: [0, 0],
    rotation: 0,
    shape: 3,
    rotationalVelocity: (2 * Math.PI) / ticksInADay,
    orbit: null,
  };

  // const circumferenceOfSolarOrbit =
  //   ellipseHelpers.circumference(sunOrbitEllipse);

  const clouds: Array<Cloud> = Array.from(range(40)).map(() =>
    createRandomCloud(planet)
  );

  const worldState: WorldState = {
    lastTick: new Date(),
    tick: 0,
    planet: planet,
    sun: {
      rotation: 0,
      location: ellipseHelpers.calcRotationalPoint(sunOrbitEllipse, 0),
      shape: 20,
      rotationalVelocity: 0,
      orbit: {
        rotation: 0,
        rotationalVelocity: (2 * Math.PI) / ticksInAYear,
        target: planet,
        shape: sunOrbitEllipse,
      },
    },
    water: {
      clouds: clouds,
      rain: [],
      ground: 0,
    },
  };

  return worldState;
}

function drawCelestialObject(
  context: CanvasRenderingContext2D,
  scales: Scales,
  obj: CelestialObject
) {
  if (typeof obj.shape !== 'number') {
    throw new Error('Ellipse shape not yet supported.');
  }

  context.beginPath();
  context.strokeStyle = 'transparent';
  context.fillStyle = 'white';

  context.ellipse(
    scales.x(obj.location[0]),
    scales.y(obj.location[1]),
    scales.size(obj.shape),
    scales.size(obj.shape),
    0,
    0,
    Math.PI * 2,
    false
  );

  context.stroke();
  context.fill();
}

function drawCloud(
  context: CanvasRenderingContext2D,
  scales: Scales,
  obj: Cloud
) {
  if (typeof obj.shape === 'number') {
    throw new Error('Ellipse shape not yet supported.');
  }
  context.beginPath();
  context.strokeStyle = 'transparent';
  context.fillStyle = '#FFFFFF77';

  context.ellipse(
    scales.x(obj.location[0]),
    scales.y(obj.location[1]),
    scales.size(obj.shape[0]),
    scales.size(obj.shape[1]),
    Math.PI / 2 - obj.orbit.rotation,
    0,
    Math.PI * 2,
    false
  );

  context.fill();
  context.stroke();

  const [x, y] = obj.location;
}

function drawOrbitOrientationLines(
  scales: Scales,
  obj: CelestialObject,
  context: CanvasRenderingContext2D
) {
  if (!obj.orbit) {
    throw new Error('Must have orbit to use.');
  }
  const directionVector: Vector2d = vectorMath.multiply(
    [Math.cos(obj.orbit.rotation), Math.sin(obj.orbit.rotation)],
    0.5
  );
  const [x, y] = obj.location;
  const relativeVector = vectorMath.add(obj.location, directionVector);

  context.beginPath();
  context.moveTo(scales.x(x), scales.y(y));
  context.lineTo(scales.x(relativeVector[0]), scales.y(relativeVector[1]));
  context.stroke();

  const directionVectorPerpendicular: Vector2d = vectorMath.multiply(
    [
      Math.cos(obj.orbit.rotation - Math.PI / 2),
      Math.sin(obj.orbit.rotation - Math.PI / 2),
    ],
    0.5
  );

  const relativeVectorPerpendicular = vectorMath.add(
    obj.location,
    directionVectorPerpendicular
  );
  context.beginPath();
  context.moveTo(scales.x(x), scales.y(y));
  context.lineTo(
    scales.x(relativeVectorPerpendicular[0]),
    scales.y(relativeVectorPerpendicular[1])
  );
  context.stroke();
}

const rainSize = 0.1;
function drawRain(
  context: CanvasRenderingContext2D,
  scales: Scales,
  location: Vector2d
) {
  context.beginPath();
  context.strokeStyle = 'transparent';
  context.fillStyle = 'lightblue';

  context.ellipse(
    scales.x(location[0]),
    scales.y(location[1]),
    scales.size(rainSize),
    scales.size(rainSize),
    0,
    0,
    Math.PI * 2,
    false
  );

  context.fill();

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
  const zoom = 10;
  const min = Math.min(canvasRect.width, canvasRect.height);
  const xRemainder = canvasRect.width - min;
  const yRemainder = canvasRect.height - min;
  return {
    x: scaleLinear([-zoom, zoom], [xRemainder / 2, min + xRemainder / 2]),
    y: scaleLinear([-zoom, zoom], [min + yRemainder / 2, yRemainder / 2]),
    size: scaleLinear([0, zoom * 2], [0, min]),
  };
}

function addCloudJitter(cloud: Cloud): Vector2d {
  const [a, b] = cloud.location;
  return [a + (Math.random() - 0.5) * 1.0, b + (Math.random() - 0.5) * 0.3];
}

function drawWorld(
  worldState: WorldState,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  scales: Scales
) {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'black';
  const {sun, planet, water} = worldState;

  for (const rain of water.rain) {
    drawRain(context, scales, rain.location);
  }

  for (const cloud of water.clouds) {
    drawCloud(context, scales, cloud);
  }

  drawCelestialObject(context, scales, sun);
  drawCelestialObject(context, scales, planet);
}

const timePerMs = 1 / 10;

function tickWorld(worldState: WorldState) {
  const {sun, planet, water} = worldState;
  const {clouds} = water;

  const lastTick = worldState.lastTick;
  const now = new Date();
  worldState.lastTick = now;

  const elapsedWorldTime = (now.getTime() - lastTick.getTime()) * timePerMs;

  const things: Array<CelestialObject> = [sun, planet, ...clouds];

  tickCelestialObjects(things, elapsedWorldTime);
  tickClouds(clouds, worldState, elapsedWorldTime);
  tickRain(water, planet, elapsedWorldTime);
}

const gravity = 0.1;

function tickCelestialObjects(
  celestialObjects: CelestialObject[],
  elapsedWorldTime: number
) {
  for (const celestial of celestialObjects) {
    celestial.rotation += celestial.rotationalVelocity * elapsedWorldTime;

    celestial.rotation = celestial.rotation % (Math.PI * 2);
    if (celestial.orbit) {
      celestial.orbit.rotation +=
        celestial.orbit.rotationalVelocity * elapsedWorldTime;
      celestial.orbit.rotation = celestial.orbit.rotation % (Math.PI * 2);

      const {
        target,
        shape: rotationShape,
        rotation: orbitalRotation,
      } = celestial.orbit;

      const newLocationRelativeToTarget =
        typeof rotationShape === 'number'
          ? circleHelpers.calcRotationalPoint(rotationShape, orbitalRotation)
          : ellipseHelpers.calcRotationalPoint(rotationShape, orbitalRotation);

      celestial.location = vectorMath.add(
        newLocationRelativeToTarget,
        target.location
      );
    }
  }
}

const maxRainVelocity = 0.1;

function tickRain(
  water: {clouds: Array<Cloud>; rain: Array<Rain>; ground: number},
  planet: CelestialObject,
  elapsedWorldTime: number
) {
  const rainToRetain: Array<Rain> = [];

  for (const rain of water.rain) {
    const centerOfEarthDirection = vectorMath.unitVector(
      vectorMath.subtract(planet.location, rain.location)
    );

    const changeInVelocity = vectorMath.multiply(
      centerOfEarthDirection,
      gravity * elapsedWorldTime
    );

    rain.velocity = vectorMath.clipMagnitude(
      vectorMath.add(rain.velocity, changeInVelocity),
      maxRainVelocity
    );

    rain.location = vectorMath.add(
      rain.location,
      vectorMath.multiply(rain.velocity, elapsedWorldTime)
    );

    const distance = vectorMath.magnitude(
      vectorMath.subtract(rain.location, planet.location)
    );

    if (distance > planet.shape) {
      rainToRetain.push(rain);
    }
  }
  water.rain = rainToRetain;
}

const rainThreshold = 30;

const cloudRangeCount = 10;

const cloudRanges: Array<Vector2d> = Array.from(range(cloudRangeCount)).map(
  i => {
    const rangeWidth = (Math.PI * 2) / cloudRangeCount;
    const begin = rangeWidth * i;
    const fuzzAmount = rangeWidth / 2;
    const end = begin + rangeWidth;
    const fuzzyBegin = i === 0 ? Math.PI * 2 - fuzzAmount : begin - fuzzAmount;
    const fuzzyEnd = i === cloudRangeCount - 1 ? fuzzAmount : end + fuzzAmount;
    return [fuzzyBegin, fuzzyEnd];
  }
);

function getCloudGroups(clouds: Array<Cloud>): Array<Array<Cloud>> {
  const cloudGroups: Array<Array<Cloud>> = [];
  for (const [begin, end] of cloudRanges) {
    const group: Array<Cloud> = [];
    cloudGroups.push(group);
    for (const cloud of clouds) {
      if (
        (end < begin &&
          (cloud.orbit.rotation > begin || cloud.orbit.rotation < end)) ||
        (cloud.orbit.rotation > begin && cloud.orbit.rotation < end)
      ) {
        group.push(cloud);
      }
    }
  }
  return cloudGroups;
}

function tickClouds(
  clouds: Cloud[],
  worldState: WorldState,
  elapsedWorldTime: number
) {
  const remainingClouds: Array<Cloud> = [];

  const cloudGroups = getCloudGroups(clouds);

  for (const cloudGroup of cloudGroups) {
    for (const cloud of cloudGroup) {
      for (const otherCloud of cloudGroup) {
        const cloudShape = cloud.shape;
        if (typeof cloudShape === 'number') {
          throw new Error('Cloud must have tuple.');
        }
        const otherCloudShape = cloud.shape;
        if (typeof otherCloudShape === 'number') {
          throw new Error('Cloud must have tuple.');
        }
        if (cloud === otherCloud) {
          continue;
        }
        const distance = vectorMath.magnitude(
          vectorMath.subtract(otherCloud.location, cloud.location)
        );

        if (
          distance <
          Math.min(...cloudShape) + Math.min(...otherCloudShape) / 4
        ) {
          otherCloud.orbit.rotationalVelocity = cloud.orbit.rotationalVelocity;
          otherCloud.friends.add(cloud);
          cloud.friends.add(otherCloud);
        }
      }
    }
  }

  for (const cloud of clouds) {
    const collectiveMass =
      cloud.mass +
      Array.from(cloud.friends)
        .map(
          cloud =>
            cloud.mass +
            Array.from(cloud.friends)
              .map(cloud => cloud.mass)
              .reduce((a, b) => a + b, 0)
        )
        .reduce((a, b) => a + b, 0);

    if (collectiveMass > rainThreshold) {
      cloud.state = 'raining';
      for (const otherCloud of cloud.friends) {
        otherCloud.state = 'raining';
      }
    }

    if (cloud.state === 'raining') {
      const rainProbabilityAdjustment = Math.max(
        Math.min(0.01 * Math.pow(collectiveMass, 2), 1.0),
        0.2
      );
      const probability = Math.min(
        0.1 * elapsedWorldTime * rainProbabilityAdjustment,
        0.2
      );
      const cloudRadius = cloud.orbit.shape;
      const cloudRotation = cloud.orbit.rotation;
      const cloudRotationalVelocity = cloud.orbit.rotationalVelocity;
      if (typeof cloudRadius !== 'number') {
        throw new Error('Non-circular cloud orbital radius');
      }
      if (Math.random() < probability) {
        cloud.mass -= 0.1;

        worldState.water.rain.push({
          location: addCloudJitter(cloud),
          velocity: circleHelpers.convertRotationalVelocityToEuclideanVelocity(
            cloudRadius,
            cloudRotation,
            cloudRotationalVelocity
          ),
        });
      }

      if (cloud.mass > 0) {
        remainingClouds.push(cloud);
      }
    } else {
      remainingClouds.push(cloud);
    }

    worldState.water.clouds = remainingClouds;
  }
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
