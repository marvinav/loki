/**
 * Object/Array utility functions replacing ramda.
 * Implements only the functions actually used in the codebase.
 */

/**
 * Group array items by a key function
 *
 * groupBy(x => x.type, [{type: 'a', v: 1}, {type: 'b', v: 2}, {type: 'a', v: 3}])
 * // => { a: [{type: 'a', v: 1}, {type: 'a', v: 3}], b: [{type: 'b', v: 2}] }
 */
function groupBy<T>(
  fn: (item: T) => string,
  list: T[]
): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of list) {
    const key = fn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }

  return result;
}

/**
 * Convert object to array of [key, value] pairs
 *
 * toPairs({a: 1, b: 2}) // => [['a', 1], ['b', 2]]
 */
function toPairs<T>(obj: Record<string, T>): [string, T][] {
  return Object.entries(obj) as [string, T][];
}

/**
 * Convert array of [key, value] pairs to object
 *
 * fromPairs([['a', 1], ['b', 2]]) // => {a: 1, b: 2}
 */
function fromPairs<T>(pairs: [string, T][]): Record<string, T> {
  const result: Record<string, T> = {};

  for (const [key, value] of pairs) {
    result[key] = value;
  }

  return result;
}

/**
 * Map over object values with access to key
 *
 * mapObjIndexed((v, k) => v * 2, {a: 1, b: 2}) // => {a: 2, b: 4}
 */
function mapObjIndexed<T, R>(
  fn: (value: T, key: string, obj: Record<string, T>) => R,
  obj: Record<string, T>
): Record<string, R> {
  const result: Record<string, R> = {};

  for (const key of Object.keys(obj)) {
    result[key] = fn(obj[key]!, key, obj);
  }

  return result;
}

/**
 * Map over object values (curried for use with ramda-style composition)
 *
 * map(fn, obj) or map(fn)(obj)
 */
function map<T, R>(
  fn: (value: T) => R
): (obj: Record<string, T>) => Record<string, R>;
function map<T, R>(
  fn: (value: T) => R,
  obj: Record<string, T>
): Record<string, R>;
function map<T, R>(
  fn: (value: T) => R,
  obj?: Record<string, T>
): Record<string, R> | ((obj: Record<string, T>) => Record<string, R>) {
  if (obj === undefined) {
    return (o: Record<string, T>) => map(fn, o);
  }

  const result: Record<string, R> = {};
  for (const key of Object.keys(obj)) {
    result[key] = fn(obj[key]!);
  }
  return result;
}

/**
 * Filter object by predicate
 *
 * pickBy((v, k) => v > 1, {a: 1, b: 2, c: 3}) // => {b: 2, c: 3}
 */
function pickBy<T>(
  predicate: (value: T, key: string) => boolean,
  obj: Record<string, T>
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key]!;
    if (predicate(value, key)) {
      result[key] = value;
    }
  }

  return result;
}

export { groupBy, toPairs, fromPairs, mapObjIndexed, map, pickBy };
