
import { h } from '../../lib/mini-vue.esm.js'

window.self = null
export const App = {

  render() {
    window.self = this
    return h('div', {
      id: 'root',
      class: ["red", "hard"],
    },
    // string
    // "hi, mini-vue"
    // array
    [h("p", {class: "red"}, "hi"+ this.msg), h("p", {class: "blue"}, "mini-vue")]
    )
  },

  setup() {
    return {
      msg: 'mini-vue'
    }
  }

}