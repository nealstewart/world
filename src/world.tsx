import {Vector2d} from './App';
import {EllipseShape} from './geometry';

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

export interface CelestialObject {
  location: Vector2d;
  rotation: number;
  readonly orbit: Orbit | undefined;
  readonly shape: Shape;
  readonly rotationalVelocity: RotationalVelocity;
}

export type Cloud = CelestialObject & {
  mass: number;
  orbit: Orbit;
  state: 'raining' | 'floating';
  friends: Set<Cloud>;
};
export type Rain = {
  location: Vector2d;
  velocity: Vector2d;
};
export type PlantPart = {
  extent: [Vector2d, Vector2d];
  children: PlantPart[];
  depth: number;
  lastGrowths: [Vector2d, Vector2d][];
};
export type Plant = {
  // The location in radian units. All plants are on the planet, so
  // it's just the location relative to the surface of the circle.
  rotation: number;
  trunk: PlantPart;
};

export interface WorldState {
  lastTick: Date;
  tick: number;
  planet: CelestialObject;
  sun: CelestialObject;
  water: {
    clouds: Cloud[];
    rain: Rain[];
    ground: number;
  };
  plants: Plant[];
}
