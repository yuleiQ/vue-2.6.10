/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'
//  获取拦截器内挂载好的七个方法key的数组集合，用于没有__proto__的情况
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
// 每个响应式对象都会有一个__ob__
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    // ??? 为什么声明Dep
    // object有新增或者删除属性、array数组中有变更方法
    this.dep = new Dep() // 手动依赖管理器
    this.vmCount = 0
    // 设置__ob__属性，引用当前Observer实例
    def(value, '__ob__', this)
    // 根据数据类型执行对应的响应化操作
    if (Array.isArray(value)) {
      // 替换数组原型
      if (hasProto) {
      // 使用数组原型覆盖
        protoAugment(value, arrayMethods)
      } else {
        // 在当前调用数组下挂载拦截器里的异变数组方法
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 如果数组中的对象还是需要做响应化处理
      this.observeArray(value)
    } else {
      // 对象直接处理
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  // 观察者 已经存在就返回 否则创建新的
  // 只要是响应式的数据就会有个__ob__属性，它是在Observer类中挂载的
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  // 返回一个observer实例,observe其实就是Observer这个类的工厂方法
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // key一一对应 依赖管理器
  const dep = new Dep() // 自动依赖管理器

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // 属性拦截 只要对象类型 均会返回childOb
  // Object.defineProperty中的get方法，它的作用就是谁访问到当前key的值就用defineReactive内的dep将它收集起来，即收集依赖
  let childOb = !shallow && observe(val) // 返回Observer实例
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 获取key对应的值
      const value = getter ? getter.call(obj) : val
      // 如果存在依赖
      if (Dep.target) {
        // 自动依赖管理器收集依赖
        dep.depend()
        // 如果存在子ob 子ob也收集依赖
        if (childOb) {
          // 手动依赖管理器，收集依赖
          childOb.dep.depend() 
          if (Array.isArray(value)) { // 数组类型
            dependArray(value)  // 将数组每一项包装为响应式
          }
        }
      }
      return value
    },
    // set方法的作用就是当前key的值被赋值了,就通知dep内收集到的依赖项，key发生了变化，通知视图更新吧
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 新旧值相同，直接跳过
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal // 新值赋值给旧值
      }
      // 如果新值是对象 也要进行响应化
      childOb = !shallow && observe(newVal)
      // 通知更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 数组
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 安全操作
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  // 对象
  // 判断key是否属于target,属于的话就是赋值操作
  if (key in target && !(key in Object.prototype)) {
    target[key] = val // 触发set更新
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 不是响应式数据，那就是普通对象呗，设置对应key
  if (!ob) {
    target[key] = val
    return val
  }
  // 以上都不满足说明新增属性 把新增的转为响应式数据 通知手动依赖器派发更新
  defineReactive(ob.value, key, val)
  // 手动触发，通知组件更新
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 数组
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 对象
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  // 通知更新
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
