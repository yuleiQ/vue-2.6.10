/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
// dep负责管理一组watcher，包括watcher实例的增删以及更新通知
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = [] // 对象某个key的依赖集合
  }

  addSub (sub: Watcher) { // 添加watcher实例到数组中
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) { // 已经被赋值为了watcher的实例
      Dep.target.addDep(this) // 执行watcher的addDep方法
    }
  }
  // 通知
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update() // 触发watch中的update
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 定义一个Dep类的静态属性Dep.target为null，这是一个全局会用到的属性，保存的是当前组件对应渲染watcher的实例
Dep.target = null
// 组件从父到子对应的watcher实例集合
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target) // 添加到集合里
  Dep.target = target // 当前的watcher实例
}

export function popTarget () {
  targetStack.pop() // 移除数组的最后一项
  Dep.target = targetStack[targetStack.length - 1]  // 赋值为数组最后一项
}
