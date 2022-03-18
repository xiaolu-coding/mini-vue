import { extend } from "../shared/index"

// 用来存放effect实例的全局变量
let activeEffect
// 用来判断是否收集依赖的全局变量
let shouldTrack

class reactiveEffect {
  private _fn: any
  deps = []
  active: boolean = true
  onStop?: () => void
  constructor(fn, public scheduler?: Function) {
    this._fn = fn
    this.scheduler = scheduler
  }

  run() {
    // 1. 会收集依赖，通过shouldTrack来区分
    // 如果active是false，代表stop了
    if (!this.active) {
      // 返回fn调用之后的返回值，这时候的shouldTrack为false，
      // 因此调用fn，不会收集依赖
      return this._fn()
    }

    shouldTrack = true
    // 通过activeEffect拿到effect实例，this是effect实例，然后push到dep中
    activeEffect = this
    const result = this._fn()
    shouldTrack = false
    return result
  }

  stop() {
    // active防止一直清除
    if (this.active) {
      if (this.onStop) {
        this.onStop()
      }
      cleanupEffect(this)
      this.active = false
    }
  }
}
// 遍历deps删除内部的effect
function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
  effect.deps.length = 0
}

function isTracking() {
  // 是否需要收集依赖，stop里面的get set ++操作
  // if (!shouldTrack) return
  // 如果没有effect，就不需要收集
  // if (!activeEffect) return
  return shouldTrack && activeEffect !== undefined
}

// 结构是这样的 target: {key: [effect]}
// effect.run() 执行内部的fn
// track的功能就是通过这种结构添加对应的effect依赖
const targetMap = new WeakMap()
export function track(target, key) {
  // 如果不是track中的状态，就返回
  if (!isTracking()) return
  // 获取到target的depsMap 为map类型
  let depsMap = targetMap.get(target)
  // 初始化
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  // 获取到key的dep， 为set类型
  let dep = depsMap.get(key)
  // 初始化
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  // 如果dep中已经有同样的effect 返回
  if (dep.has(activeEffect)) return
  // 添加依赖，activeEffect是全局变量保存的effect实例
  dep.add(activeEffect)
  // 挂载deps在effect实例上，以便在stop里面可以清除
  activeEffect.deps.push(dep)
}

export function trigger(target, key) {
  let depsMap = targetMap.get(target)
  let dep = depsMap.get(key)
  // 遍历拿到dep中的effect实例，执行实例的run方法去执行fn
  for (const effect of dep) {
    // 如果有scheduler，执行scheduler
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

export function effect(fn, options: any = {}) {
  // fn是函数

  const _effect = new reactiveEffect(fn, options.scheduler)
  // 通过Object.assign将otpions放进来
  extend(_effect, options)
  // _effect.onStop = options.onStop
  // 通过run方法去执行内部的fn
  _effect.run()
  const runner: any = _effect.run.bind(_effect)
  // 保存effect在runner上。给stop用
  runner.effect = _effect
  // 返回一个runner方法，当调用它时，会再次执行fn，并返回fn返回值
  return runner
}

export function stop(runner) {
  runner.effect.stop()
}
