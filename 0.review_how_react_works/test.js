// 1.createElement方法接收标签名、标签属性、子标签内容等参数创建react元素
// 备注：如果需要使用JSX，可以引入Babel等构建工具
const element = React.createElement('div', { id: 'title' }, '黑神话：悟空')

// 2.获取待插入的dom节点
const container = document.getElementById('root')

// 3.通过ReactDOM的render方法，进行最终渲染
ReactDOM.render(element, container)
