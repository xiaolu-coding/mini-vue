const publicPropertiesMap = {
  // 如果Key是$el，返回el
  $el: (instance) => instance.vnode.el,
}

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // setupState 解构出 进行代理
    const { setupState } = instance
    // 如果是setupState里的值，返回代理值
    if (key in setupState) {
      return setupState[key]
    }
    // 通过key去找map里面有没有这个方法，
    const publicGetter = publicPropertiesMap[key]
    // 如果有，就调用这个方法
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
}
