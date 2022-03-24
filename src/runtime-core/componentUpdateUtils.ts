

export function shouldUpdateComponent(prevVnode, nextVnode) {
  const { props: prevProps } = prevVnode
  const { props: nextProps } = nextVnode
  // 遍历新的节点的props，去对比老节点props，如果有不一样的，就返回true，就需要执行update
  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true
    } 
  }
  // 如果props都一样 返回false，不用执行update
  return false
}