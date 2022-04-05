const queue = []
let isFlushPending = false

const p = Promise.resolve()

// nextTick返回微任务 就可以拿到视图更新后的了 因为之前的微任务肯定已经执行完了，才会执行这个微任务
export function nextTick(fn) {  
  console.log('nextTick ---- 创建微任务')
  return fn ? p.then(fn) : p
}

export function queueJobs(job) {
  console.log('queueJobs ----- 更新任务队列')
  // 如果队列里没有job，就添加进去
  if (!queue.includes(job as never)) {
    queue.push(job as never)
  }
  queueFlush()
}

function queueFlush() {
  console.log('queueFlush  ------ 以nextTick微任务的方式去执行任务队列')
  if (isFlushPending) return
  // 只创建一次promise
  isFlushPending = true
  // 微任务
  nextTick(flushJobs)
}

function flushJobs() {
  console.log("flushJobs  ------ 取出队列头部任务执行")
  isFlushPending = false
  let job
  // 取出队列头部任务执行
  while ((job = queue.shift())) {
    job && job()
  }
}
