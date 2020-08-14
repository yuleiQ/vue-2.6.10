import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
// 构造函数
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 初始化
  this._init(options)
}
// 定义_init方法
initMixin(Vue)
// 定义数据相关的方法$set $watch
stateMixin(Vue)
// 定义事件相关的方法$on，$once，$off，$emit
eventsMixin(Vue)
// 定义_update，及生命周期相关的$forceUpdate和$destroy
lifecycleMixin(Vue)
// 定义$nextTick，_render将render函数转为vnode。
renderMixin(Vue)

export default Vue
