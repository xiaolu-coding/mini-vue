import { track, trigger } from "./effect"
import { reactive, ReactiveFlags, readonly } from "./reactive"
import { extend, isObject } from "../shared"
// 直接初始化，后面直接用，优化了，不需要每次都重新返回get
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

function createGetter(isReadOnly = false, shallow = false) {
  return function get(target, key) {
    
    // 如果是isReactive触发的get，返回!isReadonly
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadOnly
    } else if(key === ReactiveFlags.IS_READONLY) {
      // 如果是irReadonly触发的get，返回isReadonly
      return isReadOnly
    }
    const res = Reflect.get(target, key)
    // 如果是浅响应式，直接返回 
    if(shallow) {
      return res
    }
    // 如果res是对象，递归去reactive
    if(isObject(res)) {
      // 判断是否是readonly 如果是就readonly，如果不是就reactive
      return isReadOnly ? readonly(res) : reactive(res)
    }

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

// 修改readonlyhanlders的get为shallowReadonlyGet
export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet
})
