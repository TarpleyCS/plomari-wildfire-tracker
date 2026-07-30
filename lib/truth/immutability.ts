export type DeepReadonly<T> =
  T extends string | number | boolean | bigint | symbol | null | undefined
    ? T
    : T extends (...args: never[]) => unknown
      ? T
      : T extends readonly (infer Item)[]
        ? readonly DeepReadonly<Item>[]
        : { readonly [Key in keyof T]: DeepReadonly<T[Key]> };

/** Recursively freezes the plain-data graphs used by truth registries. */
export function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== "object") {
    return value as DeepReadonly<T>;
  }

  Object.values(value).forEach((child) => deepFreeze(child));
  return (Object.isFrozen(value) ? value : Object.freeze(value)) as DeepReadonly<T>;
}
