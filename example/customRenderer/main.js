
// vue3



import { createRenderer } from '../../lib/mini-vue.esm.js'
import { App } from './App.js'

const game = new PIXI.Application({
  width: 500,
  hegiht: 500,
})

document.body.append(game.view)



const renderer = createRenderer({
  createElement(type) { 
    if (type === 'rect') {
      const rect = new PIXI.Graphics()
      rect.beginFill(0xff0000)
      rect.drawRect(0, 0, 100, 100)
      rect.endFill()

      return rect
    }
  },
  patchProp(el, key, val) {
    el[key] = val
  },
  insert(el, container) {
    container.addChild(el)
  }
})

renderer.createApp(App).mount(game.stage)

// const rootContainer = document.querySelector('#app')
// createApp(App).mount(rootContainer)
