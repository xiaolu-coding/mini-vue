import { mutableHandlers, readonlyHandlers } from "./baseHandlers"

export function reactive(raw) {
  // baseHanlders是get set对象
  return createReactiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
  return createReactiveObject(raw, readonlyHandlers)
}

export function createReactiveObject(raw, baseHandlers) {
  return new Proxy(raw, baseHandlers)
}
