// instance是emit.bind(null, component)中传过来的compoent实例

import { camelize, toHandlerKey } from "../shared/index"

// 然后用户输入的参数从event开始
export function emit(instance, event, ...args) {
  // 找到props里面有没有on + event
  const { props } = instance
  // add -> onAdd  add-foo -> onAddFoo
  const handlerName = toHandlerKey(camelize(event))
  // 先去写一个特定的行为，再慢慢重构为通用行为
  const handler = props[handlerName]
  // 如果存在，就调用 将剩余参数放进来 
  handler && handler(...args)
}
