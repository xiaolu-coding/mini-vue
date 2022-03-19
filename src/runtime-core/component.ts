// 创建组件实例对象
export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type // 代理了一下
  }
  return component
}

export function setupComponent(instance) {
  // initProps()
  // initSlots()

  // 初始化setup 处理有状态的组件
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
  // 通过实例的vnode获取type，type就是对象的内容
  const component = instance.type
  // 解构出setup
  const { setup } = component
  // 如果有setup
  if(setup) {
    // 调用setup，并将返回值给setupResult
    const setupResult = setup()
    // 对结果判断，可能是函数可能是对象,object,function
    handleSetupResult(instance, setupResult)
  }
}
// 对结果判断，可能是函数可能是对象,object,function
function handleSetupResult(instance, setupResult) {
  // todo function
  if(typeof setupResult === 'object') {
    instance.setupState = setupResult
  }
  // 处理render函数的
  finishComponentSetup(instance) 
}

function finishComponentSetup(instance) {
  const component = instance.type

  // if(component.render) {
    instance.render = component.render
  // }
}
