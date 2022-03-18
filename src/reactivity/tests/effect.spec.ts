import { reactive } from "../reactive"
import { effect, stop } from "../effect"

describe("effect", () => {
  it("happy path", () => {
    // 期望实现reactive，将对象响应化
    const user = reactive({
      age: 10,
    })

    let nextAge
    // 期望effect收集相关依赖
    effect(() => {
      nextAge = user.age + 1
    })

    expect(nextAge).toBe(11)

    // update
    // 期望更改值时找到相关依赖，
    user.age++
    expect(nextAge).toBe(12)
  })

  it("should return runner when call effect", () => {
    // 当执行effect后会返回一个function runner
    // 当调用runner时会再次调用fn，并且把fn返回值return出去
    // 1. effect -> function (runner)
    let foo = 10
    const runner = effect(() => {
      foo++
      return "foo"
    })
    expect(foo).toBe(11)

    const r = runner()
    expect(foo).toBe(12)
    expect(r).toBe("foo")
  })

  it("scheduler", () => {
    let dummy
    let run: any
    const scheduler = jest.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { scheduler }
    )
    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)
    // 应该在第一次trigger被调用
    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1)
    // 不会触发
    expect(dummy).toBe(1)
    // run
    run()
    //
    expect(dummy).toBe(2)
  })

  it("stop", () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })
    obj.prop = 2
    expect(dummy).toBe(2)
    stop(runner)
    // obj.prop = 3
    obj.prop++
    expect(dummy).toBe(2)
    // 关闭之后runner还是能
    runner()
    expect(dummy).toBe(3)
  })

  it("onStop", () => {
    const obj = reactive({
      foo: 1,
    })
    const onStop = jest.fn()
    let dummy
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { onStop }
    )
    stop(runner)
    expect(onStop).toBeCalledTimes(1)
  })
})
