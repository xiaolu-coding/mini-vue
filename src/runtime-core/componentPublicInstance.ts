import { hasOwn } from "../shared/index"

const publicPropertiesMap = {
  // 如果Key是$el，返回el
  $el: (instance) => instance.vnode.el,
  // 如果Key是$slots，返回slots
  $slots: (instance) => instance.slots
}

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // setupState 解构出 进行代理
    const { setupState, props } = instance
    if (hasOwn(setupState, key)) {
      // 如果是setupState里的值，返回代理值
      return setupState[key]
    } else if (hasOwn(props, key)) {
      // 如果是props里的值，返回代理值，也就是this.count
      return props[key]
    }
    // 通过key去找map里面有没有这个方法，
    const publicGetter = publicPropertiesMap[key]
    // 如果有，就调用这个方法
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
}
