import { NodeTypes } from "./ast"
import { TO_DISPLAY_STRING } from "./runtimeHelpers"

export function transform(root, options = {}) {
  console.log('transform  ------ 将ast转换为vnode')
  // 全局上下文对象
  const context = createTransformContext(root, options)
  // 1、遍历 深度游侠搜索
  traverseNode(root, context)
  // 2、修改content

  createRootCodegen(root)

  root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root: any) {
  const child = root.children[0]
  if (child.type === NodeTypes.ELEMENT) {
    root.codegenNode = child.codegenNode
  } else {
    root.codegenNode = child
  }
  
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
  const exitFns: any = []
  // 获取到传入的函数，执行
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    const onExit = transform(node, context)
    if (onExit) exitFns.push(onExit)
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

  let i = exitFns.length
  while (i--) {
    exitFns[i]()
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
