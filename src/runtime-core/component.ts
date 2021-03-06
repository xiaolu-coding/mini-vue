import { proxyRefs } from "../reactivity"
import { shallowReadonly } from "../reactivity/reactive"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { initSlots } from "./componentSlots"

// 创建组件实例对象
export function createComponentInstance(vnode, parent) {
  console.log("createComponentInstance  --- 创建组件实例对象")
  const component = {
    vnode,
    type: vnode.type, // 代理了一下
    setupState: {}, // setup内容
    props: {},
    slots: {},
    next: null, // 下次要更新的节点
    emit: () => {},
    parent, // 父组件
    provides: parent ? parent.provides : {}, // 存储provide的内容
    isMounted: false,
    subTree: {},   
  }
  // 将emit函数赋值给组件实例的emit 将compoent作为第一个参数传过去
  component.emit = emit.bind(null, component) as any
  return component
}

export function setupComponent(instance) {
  console.log("setupComponent  --- 初始化组件实例")
  // 初始化props，此时instance上有props
  initProps(instance, instance.vnode.props)
  // 初始化slots，此时instance上有slots
  // PublicInstanceProxyHandlers里就能拿到slots
  initSlots(instance, instance.vnode.children)

  // 初始化setup 处理有状态的组件
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
  console.log("setupStatefulComponent ---- 执行setup方法")
  // 通过实例的vnode获取type，type就是对象的内容
  const component = instance.type
  // ctx proxy代理对象，把instance传过去 PublicInstanceProxyHandlers
  console.log('创建实例的proxy代理对象')
  instance.proxy = new Proxy(
    {
      _: instance,
    },
    PublicInstanceProxyHandlers
  )
  // 解构出setup
  const { setup } = component
  // 如果有setup
  if (setup) {
    // 将instance传给全局变量currentInstance，以便getCurrentInstance在setup中获取到
    setCurrentInstance(instance)
    // 调用setup，并将返回值给setupResult
    // 传入浅只读的Props,可以在setup中得到这个参数
    // 传入emit
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    })
    console.log('调用了setup方法,返回值为: ', setupResult)
    // 调用完setup后 设为null
    setCurrentInstance(null)
    // 对结果判断，可能是函数可能是对象,object,function
    handleSetupResult(instance, setupResult)
  }
}
// 对结果判断，可能是函数可能是对象,object,function
function handleSetupResult(instance, setupResult) {
  console.log("handleSetupResult --- 对setup方法的返回值做处理")
  // todo function  
  if (typeof setupResult === "object") {
    // 做一层ref代理，可以通过this.count 直接获取到count.value的值
    instance.setupState = proxyRefs(setupResult)
  }
  // 处理render函数的
  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  console.log('finishComponentSetup --- 通过compile方法得到render函数(Vue3里面对Vue2做兼容处理:applyOptions)')
  const component = instance.type

  if (compiler && !component.render) {
    if (component.template) {
      component.render = compiler(component.template)
    }
  }

  // if(component.render) {
  instance.render = component.render
  // }
}

let currentInstance = null

export function getCurrentInstance() {
  return currentInstance
}

function setCurrentInstance(instance) {
  currentInstance = instance
}

let compiler

export function registerRuntimeCompiler(_compiler) {
  compiler = _compiler
}
