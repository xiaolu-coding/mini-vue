import { h, createTextVnode } from "../../lib/mini-vue.esm.js"
import { Foo } from "./Foo.js"

export const App = {
  name: "App",
  render() {
    const app = h("div", {}, "App")
    // object key
    const foo = h(
      Foo,
      {},
      // children被Foo的slots拿到并渲染
      // h('p', {}, '123')
      // 如果是数组的
      // [h('p', {}, '123'), h('p', {}, '456')]
      // {
      //   header: h('p', {}, 'header'),
      //   footer: h('p', {}, 'footer'),
      // }
      {
        header: ({ age }) => [h("p", {}, "header" + age),
        createTextVnode('你好呀')],
        footer: () => h("p", {}, "footer"),
      }
    )
    // 数组 vnode
    // const foo = h(Foo, {}, h("p", {}, "123"));
    return h("div", {}, [app, foo])
  },

  setup() {
    return {}
  },
}
