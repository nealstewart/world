export function doubleFactorial(i: number) {
  if (!Number.isInteger(i)) {
    throw new Error('Non-integer passed to doubleFactorial');
  }

  if (i % 2 === 0) {
    return Array.from(range(i / 2 + 1)).reduce(
      (prev, curr) => prev * curr * 2,
      1
    );
  }

  return Array.from(range((i + 1) / 2 + 1)).reduce(
    (prev, curr) => prev * (curr * 2 - 1),
    1
  );
}

export function range(start: number, stop?: number): Iterable<number> {
  return {
    [Symbol.iterator]() {
      if (stop === undefined) {
        stop = start;
        start = 0;
      }

      let i = start - 1;

      return {
        next() {
          i++;
          if (!stop) {
            throw new Error('Impossible');
          }
          if (i < stop) {
            return {
              value: i,
              done: false,
            };
          }
          return {
            value: undefined,
            done: true,
          };
        },
      };
    },
  };
}
