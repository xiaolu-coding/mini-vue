import { getCurrentInstance } from "./component"

export function provide(key, value) {
  // 获取当前组件实例
  const currentInstance: any = getCurrentInstance()
  // 检测是否存在，有可能不是在setup内部
  if (currentInstance) {
    // 解构出provides，并赋值
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent.provides
    // 初始化provides 因为刚开始组件初始化的时候，provides就是parent.provides，初始化之后才进行provides[key] = value
    // 下次再进来就不一样了，不会走这里了
    if (provides === parentProvides) {
      // 创建原型链，将provides的proto指向parentProvides
      provides = currentInstance.provides = Object.create(parentProvides)
    }

    provides[key] = value
  }
}

export function inject(key, defaultValue?) {
  // 获取当前组件实例
  const currentInstance: any = getCurrentInstance()
  // 如果当前组件实例存在
  if (currentInstance) {
    // 获取父组件的provides 
    const parentProvides = currentInstance.parent.provides
    // 去parentProvides中查找key，原型链查找
    if(key in parentProvides) {
      // 如果有就返回
      return parentProvides[key]
    } else if(defaultValue) {
      // 处理默认值，当默认值是函数类型时，返回函数调用结果
      if(typeof defaultValue === 'function') {
        return defaultValue()
      } else {
        // 直接返回默认值
        return defaultValue
      }
       
    }
    
  }
}
