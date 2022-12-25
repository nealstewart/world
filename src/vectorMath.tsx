import {Vector2d} from './App';

export function add(a: Vector2d, b: Vector2d): Vector2d {
  return [a[0] + b[0], a[1] + b[1]];
}

export function rotate([x, y]: Vector2d, angle: number): Vector2d {
  return [
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle),
  ];
}

export function subtract(a: Vector2d, b: Vector2d): Vector2d {
  return [a[0] - b[0], a[1] - b[1]];
}

export function magnitude(a: Vector2d): number {
  return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2));
}

export function divide([x, y]: Vector2d, b: number): Vector2d {
  return [x / b, y / b];
}

export function multiply([x, y]: Vector2d, b: number): Vector2d {
  return [x * b, y * b];
}

export function unitVector(a: Vector2d): Vector2d {
  return divide(a, magnitude(a));
}

export function clipMagnitude(a: Vector2d, maxMagnitude: number): Vector2d {
  if (magnitude(a) > maxMagnitude) {
    return multiply(unitVector(a), maxMagnitude);
  }

  return a;
}
