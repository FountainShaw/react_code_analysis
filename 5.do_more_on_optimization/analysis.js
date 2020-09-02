// 问题是明确了，关键是怎么改呢？
// 首先这个问题是由什么导致的？
// performUnitOfWork函数中的第一步，就是将元素添加到DOM节点中去
// 这一步就是说，每一个小工作单元，都可能会有一次插入DOM节点的操作出现，即：
// if (fiber.parent) fiber.parent.dom.appendChild(fiber.dom)
// 也就是因为这一步，导致了可能产生的UI渲染不全

// 那接下来，怎么去处理这个问题呢？
// 很简单，既然不能在每一个小工作单元执行时都去操作DOM
// 那就只在工作单元中创建DOM的对象，等到所有的工作单元都执行完了，再一起操作DOM

// 有可能又有人要问了，你怎么知道什么时候所有的小工作单元都执行完了？
// 记得之前我们讲的Fiber树的遍历么？遍历结束的标志就是重新回到了根节点
// 这时，所有的小工作单元都执行完毕了，此刻我们就可以统一操作DOM了

// 逻辑是这么个逻辑，主要还是要看怎么实现代码
// 首先是，将上面在空闲时小工作单元的频繁DOM操作替换为统一时段的批量操作



// 定义并固定根节点，并初始化
let wipRoot = null

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    }
  }

  nextUnitOfWork = wipRoot
}

// 通过在任务循环中，设置统一提交的条件，来控制DOM操作
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  // --------------- ADD ----------------------
  // 当没有下一个工作单元或者当遍历重新回到根节点时，将Fiber树统一提交
  if (!nextUnitOfWork && wipRoot) commitRoot()
  // --------------- ADD ----------------------

  requestIdleCallback(workLoop)
}

function commitWork(fiber) {
  // 当fiber节点不存在时，直接终止操作DOM
  if (!fiber) return

  // 将当前节点添加到其父节点中
  const domParent = fiber.parent.dom
  domParent.appendChild(fiber.dom)

  // 对Fiber的子节点和兄弟节点进行递归，保证Fiber树上所有节点都被添加到DOM中去
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitRoot() {
  // 将所有的nodes添加到DOM中去
  commitWork(wipRoot.child)
  // 重置根节点Fiber树，为下一次重新渲染DOM树做准备
  wipRoot = null
}


// 至此，我们就基本上完成了关于render的优化了
// 我们可以再次整合以上代码，并以requestIdleCallback的重新实现进行实验
// 看是否达到了我们的预期效果，也就是一次性渲染所有节点


// 但是事实上，我们还有很多工作没有做完
// 因为我们现在只针对appendChild这种情况，也就是新增节点做了处理，删、改操作还没实现
// 下面我们将对删、改进行处理，对代码做些调整
