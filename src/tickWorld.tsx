import {range} from './util';
import * as vectorMath from './vectorMath';
import {
  CelestialObject,
  Cloud,
  Plant,
  WorldState,
  Rain,
  PlantPart,
} from './world';
import {EllipseShape, circleHelpers, ellipseHelpers} from './geometry';
import {Vector2d} from './App';

const ticksInADay = 10000;
const ticksInAYear = 2000;
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
function createPlant(): Plant {
  return {
    rotation: Math.PI / 4,
    trunk: {
      extent: [
        [0, 1],
        [0, 2],
      ],
      children: [],
      depth: 0,
    },
  };
}
export function createInitialWorldState() {
  const planet: CelestialObject = {
    location: [0, 0],
    rotation: 0,
    shape: 3,
    rotationalVelocity: (2 * Math.PI) / ticksInADay,
    orbit: undefined,
  };

  // const circumferenceOfSolarOrbit =
  //   ellipseHelpers.circumference(sunOrbitEllipse);
  const clouds: Cloud[] = Array.from(range(20)).map(() =>
    createRandomCloud(planet)
  );

  const worldState: WorldState = {
    lastTick: new Date(),
    tick: 0,
    planet: planet,
    plants: [], // [createPlant()],
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

const MAX_PLANT_CHILDREN = 5;

function mapPlantCoordinateToGlobal(
  worldState: WorldState,
  plant: Plant,
  extent: [Vector2d, Vector2d]
): [Vector2d, Vector2d] {
  if (typeof worldState.planet.shape !== 'number') {
    throw new Error('');
  }
  const plantRootLocation = circleHelpers.calcRotationalPoint(
    worldState.planet.shape,
    worldState.planet.rotation + plant.rotation
  );

  return extent
    .map(p =>
      vectorMath.rotate(
        p,
        worldState.planet.rotation + plant.rotation - Math.PI / 2
      )
    )
    .map(p => vectorMath.add(p, plantRootLocation)) as [Vector2d, Vector2d];
}

function mapGlobalCoordinateToPlant(
  worldState: WorldState,
  plant: Plant,
  extent: [Vector2d, Vector2d]
): [Vector2d, Vector2d] {
  if (typeof worldState.planet.shape !== 'number') {
    throw new Error('');
  }
  const plantRootLocation = circleHelpers.calcRotationalPoint(
    worldState.planet.shape,
    worldState.planet.rotation + plant.rotation
  );

  return extent
    .map(p => vectorMath.subtract(p, plantRootLocation))
    .map(p =>
      vectorMath.rotate(
        p,
        -(worldState.planet.rotation + plant.rotation) + Math.PI / 2
      )
    ) as [Vector2d, Vector2d];
}

function constraintRadian(radian: number) {
  return radian % (Math.PI * 2);
}

function tickPlant(
  worldState: WorldState,
  plant: Plant,
  plantPart: PlantPart,
  elapsedWorldTime: number
) {
  const sun = worldState.sun;

  const rotationalDistance = Math.abs(
    constraintRadian(sun.orbit.rotation) -
      constraintRadian(worldState.planet.rotation + plant.rotation)
  );

  if (rotationalDistance > Math.PI / 2) {
    return;
  }

  for (const childPart of plantPart.children) {
    tickPlant(worldState, plant, childPart, elapsedWorldTime);
  }

  plantPart.extent = mapGlobalCoordinateToPlant(
    worldState,
    plant,
    mapPlantCoordinateToGlobal(worldState, plant, plantPart.extent).map(p => {
      const growth = vectorMath.multiply(
        vectorMath.unitVector(vectorMath.subtract(sun.location, p)),
        0.005 * elapsedWorldTime
      );

      const grown = vectorMath.add(p, growth);

      return grown;

      // return growth;
    }) as [Vector2d, Vector2d]
  );
}

function tickPlants(worldState: WorldState, elapsedWorldTime: number) {
  for (const plant of worldState.plants) {
    tickPlant(worldState, plant, plant.trunk, elapsedWorldTime);
  }
}

function addCloudJitter(cloud: Cloud): Vector2d {
  const [a, b] = cloud.location;
  return [a + (Math.random() - 0.5) * 1.0, b + (Math.random() - 0.5) * 0.3];
}

const timePerMs = 1 / 10;
export function tickWorld(worldState: WorldState) {
  const {sun, planet, water} = worldState;
  const {clouds} = water;

  const lastTick = worldState.lastTick;
  const now = new Date();
  worldState.lastTick = now;

  const elapsedWorldTime = (now.getTime() - lastTick.getTime()) * timePerMs;

  const things: CelestialObject[] = [sun, planet, ...clouds];

  tickCelestialObjects(things, elapsedWorldTime);
  tickClouds(clouds, worldState, elapsedWorldTime);
  tickRain(water, planet, elapsedWorldTime);
  tickPlants(worldState, elapsedWorldTime);
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
  water: {clouds: Cloud[]; rain: Rain[]; ground: number},
  planet: CelestialObject,
  elapsedWorldTime: number
) {
  const rainToRetain: Rain[] = [];

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
const cloudRanges: Vector2d[] = Array.from(range(cloudRangeCount)).map(i => {
  const rangeWidth = (Math.PI * 2) / cloudRangeCount;
  const begin = rangeWidth * i;
  const fuzzAmount = rangeWidth / 2;
  const end = begin + rangeWidth;
  const fuzzyBegin = i === 0 ? Math.PI * 2 - fuzzAmount : begin - fuzzAmount;
  const fuzzyEnd = i === cloudRangeCount - 1 ? fuzzAmount : end + fuzzAmount;
  return [fuzzyBegin, fuzzyEnd];
});

function getCloudGroups(clouds: Cloud[]): Cloud[][] {
  const cloudGroups: Cloud[][] = [];
  for (const [begin, end] of cloudRanges) {
    const group: Cloud[] = [];
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
  const remainingClouds: Cloud[] = [];

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

    if (clouds.length < 20 && Math.random() < 0.05) {
      console.log(worldState.water.clouds.length);
      worldState.water.clouds.push(createRandomCloud(worldState.planet));
    }
  }
}
