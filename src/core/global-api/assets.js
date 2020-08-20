/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'
// 注册实现Vue.component/directive/filter
export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    // vue['component']=function(id, def){}
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }

        // vue.component('comp', {data()----})
        // definition是对象
        if (type === 'component' && isPlainObject(definition)) {
          // 定义组件name
          definition.name = definition.name || id
          // extend创建组件的构造函数，def变成了构造函数
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 注册 this.options['components'][comp] = Cton
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
