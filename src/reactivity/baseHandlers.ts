import { track, trigger } from "./effect"
// 直接初始化，后面直接用，优化了，不需要每次都重新返回get
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

function createGetter(isReadOnly = false) {
  return function get(target, key) {
    const res = Reflect.get(target, key)
    // 如果不是只读，就track收集依赖
    if (!isReadOnly) {
      track(target, key)
    }
    return res
  }
}

function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value)
    // 触发依赖
    trigger(target, key)
    return res
  }
}

export const mutableHandlers = {
  get,
  set,
}

export const readonlyHandlers = {
  // isReadOnly为true
  get: readonlyGet,
  set(target, key, value) {
    console.warn(`key:${key} set 失败，因为 ${target}是readonly`)
    return true
  },
}
