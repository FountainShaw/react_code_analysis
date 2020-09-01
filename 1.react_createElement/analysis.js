// 正如review_how_react_works中分析所说，createElement只是创建了一个对象
// 这个创建的对象有type和props两个属性，那么我们要做的只是创建一个含有这两个属性的对象而已

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children,
    }
  }
}

// 理想情况下，这个函数只用做这么多，但是对于一个通用的方法，不可能都在理想情况下使用

// 1.children可能是原始数据类型的值，而不一定是一个react元素，比如之前的例子中的文本
// 因此我们需要对原始值进行一些特殊处理
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    }
  }
}

// 2.将特殊情况融合进之前的方法
function createElement(type, props, ...children) {
  const temp = children.map(child => typeof child !== 'object' ? createTextElement(child) : child)

  return {
    type,
    props: { ...props, children: temp }
  }
}


// 用createElement实现以下例子
// <div id='foo'>
//   <a href='https://www.baidu.com'>跳转</a>
//   你好啊！
// </div>

const dom = createElement(
  'div', 
  { id: 'foo' }, 
  createElement('a', { href: 'https://www.baidu.com' }, '跳转'),
  '你好啊！'
)


// 我们最终需要的就是这样，每个节点都是一个标准react元素的数据结构
dom = {
  type: "div",
  props: {
    id: "foo",
    children: [
      {
        type: "a",
        props: {
          href: "https://www.baidu.com",
          children: [{
            type: "TEXT_ELEMENT",
            props: {
              nodeValue: "跳转",
              children: [],
            },
          }],
        },
      },
      {
        type: "TEXT_ELEMENT",
        props: {
          nodeValue: "你好啊！",
          children: [],
        },
      },
    ],
  },
}

// 当然，真正的createElement肯定还有一些其他的逻辑作为补充
// 但是由于我们手动实现react主要关注其核心，边边角角就暂时忽略，等后面其他功能要实现时在做补充
