/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'
// 获取数组原型
const arrayProto = Array.prototype
 // 创建空对象拦截器
export const arrayMethods = Object.create(arrayProto)
// 7种数组方法
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
 //  覆盖7个方法
methodsToPatch.forEach(function (method) {
  // cache original method
  // 过滤出7个数组原生原始方法
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    // 执行原定的任务 this即为调用数组
    const result = original.apply(this, args)
    // 通知
    const ob = this.__ob__
    // 插入操作，做响应化处理
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 触发手动依赖收集器内的依赖，通知更新
    ob.dep.notify()
    return result
  })
})
