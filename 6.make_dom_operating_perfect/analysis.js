// 要对DOM进行改操作，我们需要知道之前是什么，现在是什么，要有针对性的改
// 而不是告诉我现在是什么样，我就直接一下子全部重新渲染一遍
// 说到这里，相信大家都会隐约冒出一个概念：虚拟DOM的diff
// 确实，我们改元素就是对Fiber树这么个虚拟出来的类似DOM的东西，进行针对性的diff
// 那我们首先必须知道，之前的Fiber树是什么样的？
// 很简单，我们只要让每一个Fiber节点保存一份之前的引用就好了
// 根节点的处理要特殊一些，因为他会涉及到重置的问题


let currentRoot = null

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },

    // --------------- ADD ----------------------
    // 在根节点中，设置一个属性，表示上一次渲染的Fiber树
    alternate: currentRoot
    // --------------- ADD ----------------------
  }

  nextUnitOfWork = wipRoot
}

function commitRoot() {
  // 将所有的nodes添加到DOM中去
  commitWork(wipRoot.child)

  // --------------- ADD ----------------------
  // 重置wipRoot之前，将其保存起来
  currentRoot = wipRoot
  // --------------- ADD ----------------------

  // 重置根节点Fiber树，进入下一次循环
  wipRoot = null
}


// 其实要处理的不止是根节点，应该是所有节点都需要保存一份，这便于修改时的对比
// 所以我们需要把performUnitOfWork函数中为元素的所有子元素创建工作单元的任务给抽离出来
// 让其作为独立函数，负责处理元素子节点Fiber的构建和对比等工作

function performUnitOfWork(fiber) {
  // 1.将元素添加到dom节点中去
  if (!fiber.dom) fiber.dom = createDom(fiber)

  // --------------- DEL ----------------------
  /* 
  // 2.为元素的所有子元素创建工作单元
  const elements = fiber.props.children
  let index = 0
  let prevSibling = null

  while (index < elements.length) {
    const element = elements[index]
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }

    if (index === 0) fiber.child = newFiber
    else prevSibling.sibling = newFiber

    prevSibling = newFiber
    index++
  } 
  */
  // --------------- DEL ----------------------


  // --------------- ADD ----------------------

  const elements = fiber.props.children
  reconcileChildren(fiber, elements)

  // --------------- ADD ----------------------

  // 3.选择下一个待执行的工作单元
  if (fiber.child) return fiber.child

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling

    nextFiber = nextFiber.parent
  }
}

// 该函数主要负责将之前的Fiber和待渲染的元素进行调和
function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  // 同时遍历之前Fiber的子元素和我们要调和的当前子元素
  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    // --------------- DEL ----------------------
    /* 
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }

    if (index === 0) fiber.child = newFiber
    else prevSibling.sibling = newFiber

    prevSibling = newFiber
    index++ 
    */
    // --------------- DEL ----------------------

    // --------------- ADD ----------------------
    
    let newFiber = null

    // 比较之前渲染的Fiber和当前准备渲染的元素
    const sameType = oldFiber && element && element.type == oldFiber.type

    if (sameType) {
      //  新老元素类型相同时，只要将新元素的props更新进去
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        // 新增一个操作标识，告诉commitWork函数，这个Fiber是什么操作
        effectTag: 'UPDATE'
      }
    }

    if (element && !sameType) {
      // 新老元素类型不同，且新元素存在时，就需要为这个新元素重新创建一个节点了
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT'
      }
    }

    if (oldFiber && !sameType) {
      // 新老元素类型不同，且老元素存在时，那老元素就没有必要存在，直接删除
      // 此时不需要newFiber，直接将oldFiber的标识置为删除即可
      oldFiber.effectTag = 'DELETION'
      // 但问题是，我们提交渲染时，是针对的当前的Fiber树的节点进行渲染
      // 而上一次已经渲染而本轮需要删除的节点，并不会受到影响，因为他根本就不在当前Fiber树中
      // 所以我们只能手动维护一个待删除的元素集合，在提交节点操作时先将这些节点删除
      // 并且要在每次渲染之前将集合重置，为下一轮渲染做好准备
      deletions.push(oldFiber)
    }

    // --------------- ADD ----------------------
  } 
}

let deletions = null

function commitRoot() {
  // --------------- ADD ----------------------

  // 单独对上一轮中已经渲染过，但本轮又要删除的Fiber，进行处理
  deletions.forEach(commitWork)

  // --------------- ADD ----------------------

  // 将所有的nodes添加到DOM中去
  commitWork(wipRoot.child)

  // 重置wipRoot之前，将其保存起来
  currentRoot = wipRoot

  // 重置根节点Fiber树，进入下一次循环
  wipRoot = null
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }

  // --------------- ADD ----------------------

  // 再次渲染前，将待删除集合重置
  deletions = []

  // --------------- ADD ----------------------
  nextUnitOfWork = wipRoot
}
​


// 处理完关于节点的调和准备工作，那接下来就需要针对具体的调和进行处理了
// 比如我们新加的属性：effectTag，针对PLACEMENT、UPDATE、DELETION都要有具体的实现

function commitWork(fiber) {
  if (!fiber) return
  
  const domParent = fiber.parent.dom

  // --------------- DEL ----------------------
  // domParent.appendChild(fiber.dom)
  // --------------- DEL ----------------------

  // --------------- ADD ----------------------

  //  PLACEMENT比较简单，就是我们之前的新增元素
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  }

  //  UPDATE需要的是对已有节点的props进行替换
  else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  }

  //  DELETION就是一个和新增相对的操作
  else if (fiber.effectTag === 'DELETION') {
    domParent.removeChild(fiber.dom)
  }

  // --------------- ADD ----------------------

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}



// 先过滤掉子元素这个特殊属性
const isProperty = key => key !== 'children'
// 所有上轮渲染用到的属性中，只要本轮没用上的属性，都筛选出来
const isGone = (prev, next) => key => !(key in next)
// 所有本轮渲染用上的属性中，只要是上轮和本轮值不同的，都筛选出来
const isNew = (prev, next) => key => prev[key] !== next[key]
// 对节点进行更新
function updateDom (dom, prevProps, nextProps) {
  // 1.删除下轮渲染中没用到的属性
  Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => dom[name] = '')

  // 2.添加新增或者变化过的属性
  Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => dom[name] = nextProps[name])
}


// 另外，对于事件属性需要特殊处理一下，因为他的增删与普通属性还是存在一定差异的
const isEvent = key => key.startsWith('on')
const isProperty = key => key !== 'children' && !isEvent(key)

function updateDom (dom, prevProps, nextProps) {
  // 删除上一轮渲染中所有不在本轮中使用或值与本轮有差异的事件
  Object.keys(prevProps)
        .filter(isEvent)
        .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
        .forEach(name => {
          const eventType = name.toLowerCase().substring(2)
          dom.removeEventListener(eventType, prevProps[name])
        })


  Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => dom[name] = '')

  Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => dom[name] = nextProps[name])


  // 添加所有本轮渲染中与上轮的值存在差异的事件
  Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
          const eventType = name.toLowerCase().substring(2)
          dom.addEventListener(eventType, nextProps[name])
        })
}

// 自此，我们关于react的渲染与优化工作基本上结束了
// 具体的效果我们可以通过一个例子来看看，当然我们需要整合一下之前的所有代码
