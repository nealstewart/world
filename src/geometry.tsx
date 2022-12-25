import {range} from './util';
import * as vectorMath from './vectorMath';
import {Vector2d} from './App';

/**
 * An aliased vector which describes the ratio which a circle has been
 * distorted to make it an alias.
 */

export type EllipseShape = [number, number];
export const ellipseHelpers = {
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
export const circleHelpers = {
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
