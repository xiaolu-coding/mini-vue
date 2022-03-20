export const extend = Object.assign

export const isObject = (val) => {
  return val !== null && typeof val === "object"
}

export const hasChanged = (newValue, oldValue) => {
  return !Object.is(newValue, oldValue)
}

export const hasOwn = (val, key) =>
  Object.prototype.hasOwnProperty.call(val, key)
