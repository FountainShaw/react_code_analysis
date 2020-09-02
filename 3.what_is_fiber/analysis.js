/* 
在说明什么是Fiber之前，我们需要搞清楚之前说的performUnitOfWork函数要做些什么
其实按照之前的讨论可以想象的到，既然是对拆分后的迭代任务的执行，那肯定也跟迭代的任务有关
回顾一下之前的迭代： 
*/

function render(element, container) {
  const node = element.type !== 'TEXT_ELEMENT'
              ? document.createElement(element.type)
              : document.createTextNode('')

  Object.keys(element.props)
        .filter(key => key !== 'children')
        .forEach(name => node[name] = element.props[name])
  
  element.props.children.forEach(child => render(child, node))

  container.appendChild(node)
}

/* 
迭代中，其实就是以我们创建的element为根节点，然后将他的所有子节点都挂在其下
最终形成了一个DOM树，然后将所有这些，一起挂在root对应的节点下
总结一下，大概有三个任务，需要performUnitOfWork函数去做：

1.将元素添加到dom节点中去
2.为元素的所有子元素创建工作单元
3.选择下一个待执行的工作单元

以此作为迭代的基础，反复进行，就能实现我们render函数要做的事情了
*/


/* 
什么是Fiber呢？其实按照刚才总结中讲到的，就是一个比较特殊的数据结构
这种数据结构跟react元素是一个一一映射关系
并且每一个数据结构都可以作为一个独立的微小任务去执行

那怎么去设计这个数据结构呢？
其实明白目的，就好去做反推了，只要便于performUnitOfWork函数三个任务的达成就好
其实说起来，也就一个，怎样方便选出某个子节点作为下一个要执行的任务
明白了这个任务，那就肯定知道，每个Fiber必须有一个链接指向其他Fiber
这个其他Fiber就跟react独特的nextUnitWork选取方式有关了

我找了张图，可以很快看懂nextUnitWork选取方式
当一个Fiber对应的任务执行完毕后，就开始选择nextUnitWork对应的Fiber
这下一个工作模块肯定是优先选则起子元素，而且是第一个子元素，即firstChild
当发现该元素没有子元素时，就优先选择他的下一个兄弟元素，即sibling
如果连下一个兄弟元素都没有了，那就选择其父元素的下一个兄弟元素，即parentSibling
直到最终又回到起始遍历的根节点，那么performUnitOfWork函数的工作也就结束了，render也就完成了
*/


/* 
element.props.children.forEach(child => render(child, node))
很显然，目前来说这一句放在render中，就很不合适了，他必须被拆分成很多个小任务
而且，nextUnitWork也得进行初始化
所以就有了以下代码： 
*/

function createDom(element) {
  const dom = element.type === 'TEXT_ELEMENT'
            ? document.createTextNode('')
            : document.createElement(element.type)
  
  const isProperty = key => key !== 'children'
  Object.keys(element.props).filter(isProperty).forEach(name => {
    dom[name] = element.props[name]
  })

  // element.props.children.forEach(child => render(child, node))
  // container.appendChild(node)

  return dom
}
  
function render(element, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element]
    }
  }
}

function performUnitOfWork(fiber) {
  // 1.将元素添加到dom节点中去
  
  // 2.为元素的所有子元素创建工作单元
  
  // 3.选择下一个待执行的工作单元

// ----------------------------------------------------- 

  // 剩下要做的，就是去完善performUnitOfWork函数中所列的任务了

  // 针对第一个任务
  // 将当前Fiber的DOM挂载到其父节点下，首先必须该Fiber要有DOM，然后才能进行挂载
  if (!fiber.dom) fiber.dom = createDom(fiber)
  if (fiber.parent) fiber.parent.dom.appendChild(fiber.dom)

  // 针对第二个任务
  // 遍历元素的所有子节点，为他们创建对应的Fiber
  const elements = fiber.props.children
  let index = 0
  let preSibling = null

  while (index < elements.length) {
    const element = elements[index]

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }

    // 并将这些子节点添加到Fiber树中去，根据情况设置child或sibling
    if (index === 0) fiber.child = newFiber
    else preSibling.sibling = newFiber

    preSibling = newFiber
    index++
  }

  // 针对第三个任务
  // 根据第一子元素，下一个兄弟元素，父节点的下一个兄弟元素的优先顺序选取下一个工作单元
  if (fiber.child) return fiber.children

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling

    nextFiber = nextFiber.parent
  }
}


// 至此，我们针对render的实现就基本完成了，下面我们看一下整个代码运行的效果
































// 但这样真的就结束了么？
// 其实我们的实现还是存在一个比较明显的缺陷的，只是程序运行太快，我们没有看出来而已
// 那让我们把时间放慢一点，再看看
// 这里就需要我们把requestIdleCallback重新实现一下了

// 模拟requestIdleCallback工作，将时间放慢
function requestIdleCallback(workLoop) {
  const timer = setTimeout(() => {
      workLoop({ timeRemaining: () => 0.5 })
      clearTimeout(timer)
  }, 50)
}

// 大家可以看到，我们的这些节点，都是一个一个的渲染到页面的
// 也就是说，如果我们有动画或交互，并且也需要重新渲染页面时
// 页面没准会卡在某个渲染阶段，而这个渲染阶段上只有几个节点在上面，其余的还在等待
// 除非是因为有异步资源加载，否则这肯定是不合适的
// 我们需要的是所有要一起渲染的节点都一下子全展现出来，而不是那种可能看到残缺的UI
