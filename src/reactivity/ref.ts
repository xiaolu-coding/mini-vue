import { hasChanged, isObject } from "../shared"
import { isTracking, trackEffects, triggerEffects } from "./effect"
import { reactive } from "./reactive"

class RefImpl {
  private _value: any
  public dep
  private _rawValue: any
  // 判断是不是ref得标记
  public __v_isRef = true
  constructor(value) {
    // 为了防止是对象相比，再保存一份
    this._rawValue = value
    // 如果value是对象，就要reactive
    this._value = convert(value)
    this.dep = new Set()
  }
  // get时收集依赖
  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    // 判断值是否改变,如果值变了，才需要触发通知
    // 用保存的一份比较
    if (hasChanged(newValue, this._rawValue)) {
      // 要先去修改value值，再通知
      this._rawValue = newValue
      this._value = convert(newValue)
      triggerEffects(this.dep)
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}

export function ref(value) {
  return new RefImpl(value)
}

export function isRef(ref) {
  // 如果没有的情况肯定是undefined，因此要!!转
  return !!ref.__v_isRef
}


export function unRef(ref) {
  // 看看是不是ref对象，如果是，返回value，不是，返回本身
  return isRef(ref) ? ref.value : ref
}

export function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key) {
      // 将get的值经过unRef后返回
      return unRef(Reflect.get(target, key))
    },
    set(target, key, newValue) {
      // 如果是ref类型，并且新值不是ref
      if(isRef(target[key]) && !isRef(newValue )) {
        // 要value
        return target[key].value = newValue
      } else {
        return Reflect.set(target, key, newValue)
      }
    }
  })
}
