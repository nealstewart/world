import {ScaleLinear, scaleLinear} from 'd3-scale';
import * as vectorMath from './vectorMath';
import {Vector2d} from './App';
import {CelestialObject, Cloud, Plant, WorldState, PlantPart} from './world';
import {circleHelpers} from './geometry';

function drawPlanet(
  context: CanvasRenderingContext2D,
  scales: Scales,
  planet: CelestialObject,
  sun: CelestialObject
) {
  if (typeof planet.shape !== 'number') {
    throw new Error('Ellipse shape not yet supported.');
  }

  const planetSun = vectorMath.multiply(
    vectorMath.unitVector(vectorMath.subtract(sun.location, planet.location)),
    (planet.shape * 3) / 4
  );

  const gradient = context.createRadialGradient(
    scales.x(planetSun[0]),
    scales.y(planetSun[1]),
    scales.size(planet.shape / 30),
    scales.x(planet.location[0]),
    scales.y(planet.location[1]),
    scales.size(planet.shape)
  );

  gradient.addColorStop(0.0, 'beige');
  gradient.addColorStop(1.0, 'midnightblue');

  context.beginPath();
  context.strokeStyle = 'transparent';
  context.fillStyle = gradient;

  context.ellipse(
    scales.x(planet.location[0]),
    scales.y(planet.location[1]),
    scales.size(planet.shape),
    scales.size(planet.shape),
    0,
    0,
    Math.PI * 2,
    false
  );

  context.closePath();

  context.stroke();
  context.fill();
}

export function drawCelestialObject(
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

  context.closePath();

  context.stroke();
  context.fill();
}
export function drawCloud(
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

  context.closePath();
  context.fill();
  context.stroke();

  const [x, y] = obj.location;
}

function drawPlantPart(
  context: CanvasRenderingContext2D,
  scales: Scales,
  rootLocation: Vector2d,
  part: PlantPart | undefined,
  planetRotation: number
) {
  if (!part) {
    return;
  }
  part.extent
    .map(p => vectorMath.rotate(p, planetRotation - Math.PI / 2))
    .map(p => vectorMath.add(p, rootLocation))
    .forEach(([x, y]) => {
      context.lineTo(scales.x(x), scales.y(y));
      context.stroke();
    });

  for (const child of part.children) {
    drawPlantPart(context, scales, rootLocation, child, planetRotation);
  }
}

function drawPlant(
  context: CanvasRenderingContext2D,
  scales: Scales,
  planet: CelestialObject,
  plant: Plant
) {
  const planetRadius = planet.shape;
  if (typeof planetRadius !== 'number') {
    throw new Error('');
  }
  const plantStart = circleHelpers.calcRotationalPoint(
    planetRadius,
    planet.rotation + plant.rotation
  );

  context.strokeStyle = 'green';
  context.fillStyle = 'green';
  const lineWidthBefore = context.lineWidth;
  context.lineWidth = 10;
  context.beginPath();
  context.moveTo(scales.x(plantStart[0]), scales.y(plantStart[1]));

  drawPlantPart(
    context,
    scales,
    plantStart,
    plant.trunk,
    planet.rotation + plant.rotation
  );
  context.closePath();
  context.lineWidth = lineWidthBefore;
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
  context.closePath();
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
  context.closePath();
  context.stroke();
}
const rainSize = 0.1;
export function drawRain(
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

  context.closePath();

  context.fill();

  context.stroke();
}
export interface Scales {
  x: ScaleLinear<number, number>;
  y: ScaleLinear<number, number>;
  size: ScaleLinear<number, number>;
}
export function createScales(
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

export function drawWorld(
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

  for (const plant of worldState.plants) {
    drawPlant(context, scales, planet, plant);
  }

  drawCelestialObject(context, scales, sun);
  drawPlanet(context, scales, planet, sun);
}
