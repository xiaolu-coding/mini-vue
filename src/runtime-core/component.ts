import { shallowReadonly } from "../reactivity/reactive"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPublicInstance"

// 创建组件实例对象
export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type, // 代理了一下
    setupState: {},
    props: {},
  }
  return component
}

export function setupComponent(instance) {
  // 初始化props，此时instance上有props
  initProps(instance, instance.vnode.props)
  // initSlots()

  // 初始化setup 处理有状态的组件
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
  // 通过实例的vnode获取type，type就是对象的内容
  const component = instance.type
  // ctx proxy代理对象，把instance传过去 PublicInstanceProxyHandlers
  instance.proxy = new Proxy({
    _: instance
  }, PublicInstanceProxyHandlers)
  // 解构出setup
  const { setup } = component
  // 如果有setup
  if(setup) {
    // 调用setup，并将返回值给setupResult  
    // 传入浅只读的Props,可以在setup中得到这个参数
    const setupResult = setup(shallowReadonly(instance.props))
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
