import { isObject } from "../shared/index"
import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers } from "./baseHandlers"

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly'
}

export function reactive(raw) {
  // baseHanlders是get set对象
  return createReactiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
  return createReactiveObject(raw, readonlyHandlers)
}

export function shallowReadonly(raw) {
  return createReactiveObject(raw, shallowReadonlyHandlers)
}

function createReactiveObject(target, baseHandlers) {
  // 如果不是对象
  if(!isObject(target)) {
    console.warn(`target ${target} 必须是一个对象`)
    return target
  }
  return new Proxy(target, baseHandlers)
}

export function isReactive(value) {
  // 为了 取value任意值是为了触发get，然后在get里面判断是不是reactive  !!是为了将其undefined情况转换为boolean
  return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}


