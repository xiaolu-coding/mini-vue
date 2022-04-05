export const extend = Object.assign

export const EMPTY_OBJ = {}

export const isObject = (val) => {
  return val !== null && typeof val === "object"
}

export const isString = (val) => typeof val === 'string'


export const hasChanged = (newValue, oldValue) => {
  return !Object.is(newValue, oldValue)
}

export const hasOwn = (val, key) =>
  Object.prototype.hasOwnProperty.call(val, key)

// 转换为驼峰
export const camelize = (str: string) => {
  return str.replace(/-(\w)/g, (_, c: string) => {
    return c ? c.toUpperCase() : ""
  })
}
// 首字母转大写
export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const toHandlerKey = (str: string) => {
  // 如果str存在，返回onAdd类型， 不存在返回空字符串
  return str ? "on" + capitalize(str) : ""
}

export const isOn = (key: string) => /^on[A-Z]/.test(key)
