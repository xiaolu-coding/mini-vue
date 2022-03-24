import { NodeTypes } from "./ast"

export function baseParse(content: string) {
  // 转换为 context.source可以拿到content值
  const context = createParserContext(content)
  // 
  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any = []
  let node
  // 判断是否是{{}}语法
  if (context.source.startsWith("{{")) {
    // 解析插值语法
    node = parseInterpolation(context)
  }
  // 推进到nodes
  nodes.push(node)
  return nodes
}

function parseInterpolation(context) {
  const openDelimiter = "{{"
  const closeDelimiter = "}}"
  // 关闭的}}的index
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  )
  // 推进，干掉{{
  advanceBy(context, openDelimiter.length)
  // 减掉推进前的{{ 2 就是插值语法内部的文本长度
  const rawContentLength = closeIndex - openDelimiter.length
  // 截取出插值语法中的值 {{message}} -> message
  const rawContent = context.source.slice(0, rawContentLength)
  // 去空格 {{ message }} 这种情况
  const content = rawContent.trim()
  // 截取}}后面的
  advanceBy(context, rawContentLength + closeDelimiter.length)
  // 返回相应的对象
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  }
}
// 推进 截取
function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length)
}


function createRoot(children) {
  return {
    children,
  }
}

function createParserContext(content: string): any {
  return {
    source: content,
  }
}
