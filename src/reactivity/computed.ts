import { reactiveEffect } from "./effect"

class ComputedRefImpl {
  private _getter: any
  private _dirty: boolean = true
  private _value: any
  private _effect: any
  constructor(getter) {
    this._getter = getter
    this._effect = new reactiveEffect(getter, () => {
      // 通过scheduler改变dirty，不会一直调用getter
      if (!this._dirty) {
        this._dirty = true
      }
    })
  }
  // 第一次进来的时候，通过Dirty为false，使之后的每次get都直接返回缓存的值
  // 当set修改了值之后，会触发trigger，trigger内部会调用secheduler，也就是dirty为true
  // 因此下一次的时候会调用getter方法
  get value() {
    // 如果是dirty 这里就是缓存
    if (this._dirty) {
      // 只为false
      this._dirty = false
      // 传值 拿到effect调用run方法，执行里面的getter方法
      this._value = this._effect.run()
    }
    // 如果不是dirty直接返回原先的值
    return this._value
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter)
}
