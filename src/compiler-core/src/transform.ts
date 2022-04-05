import { NodeTypes } from "./ast"
import { TO_DISPLAY_STRING } from "./runtimeHelpers"

export function transform(root, options = {}) {
  // 全局上下文对象
  const context = createTransformContext(root, options)
  // 1、遍历 深度游侠搜索
  traverseNode(root, context)
  // 2、修改content

  createRootCodegen(root)

  root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root: any) {
  root.codegenNode = root.children[0]
}

function createTransformContext(root: any, options: any) {
  // 通过context存储外部传来的函数
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key: any) {
      context.helpers.set(key, 1)
    },
  }

  return context
}

function traverseNode(node: any, context) {
  // 从外部传来的函数
  const nodeTransforms = context.nodeTransforms
  // 获取到传入的函数，执行
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    transform(node)
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context)
      break
    default:
      break
  }
}

function traverseChildren(node, context) {
  const children = node.children
  // 遍历树，深度优先搜索
  for (let i = 0; i < children.length; i++) {
    const node = children[i]

    traverseNode(node, context)
  }
}
