import { h } from "../../lib/mini-vue.esm.js"
import { Foo } from "./Foo.js"

window.self = null
export const App = {
  name: 'app',
  render() {
    window.self = this
    return h(
      "div",
      {
        id: "root",
        class: ["red", "hard"],
        onClick() {
          console.log("click")
        },
        onMouseDown() {
          console.log("onmouseDown")
        },
      },
      [h("div", {}, "hi" + this.msg), h(Foo, { count: 1 })]
      // string
      // "hi, mini-vue"
      // array
      // [h("p", {class: "red"}, "hi"+ this.msg), h("p", {class: "blue"}, "mini-vue")]
    )
  },

  setup() {
    return {
      msg: "mini-vue",
    }
  },
}
