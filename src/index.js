/**
 * @copyright 2017- commenthol
 * @license MIT
 */

module.exports = clones

/**
 * A Deep-Clone of object `source`
 *
 * @static
 * @param {Object} source - clone source
 * @param {Object} [bind] - bind functions to this context
 * @return {Any} deep clone of `source`
 * @example
 * const clones = require('clones')
 *
 * const source = [
 *   {a: {b: 1}},
 *   {c: {d: 2}},
 *   '3',
 *   function () { return 4 }
 * ]
 * // adding circularities
 * source[0].a.e = source[0].a
 *
 * const dest = clones(source)
 * // => [{ a: { b: 1, e: [Circular] } },
 * //     { c: { d: 2 } },
 * //     '3',
 * //     [Function] ]
 */
function clones (source, bind, target) {
  let opts = {
    bind: bind,
    visited: [],
    cloned: []
  }
  return _clone(opts, source, target)
}

/**
 * clones prototype function / class
 * @static
 * @param {Object} source - clone source
 * @return {Any} deep clone of `source`
 * @example
 * const clones = require('clones')
 * // clone built in `Array`
 * const C = clones.classes(Array)
 *
 * let c = new C(1,2,3)
 * // => [1, 2, 3]
 * c.reverse()
 * // => [3, 2, 1]
 */
clones.classes = function (source) {
  let target = function (a, b, c, d, e, f, g, h, i) {
    try {
      return new (Function.prototype.bind.apply(source, [null].concat([].slice.call(arguments))))()
    } catch (e) {
      // Safari throws TypeError for typed Arrays
      return new source(a, b, c, d, e, f, g, h, i) // eslint-disable-line new-cap
    }
  }
  return clones(source, source, target)
}

/**
 * Recursively clone source
 *
 * @static
 * @private
 * @param {Object} opts - options
 * @param {Object} [opts.bind] - optional bind for function clones
 * @param {Array} opts.visited - visited references to detect circularities
 * @param {Array} opts.cloned - visited references of clones to assign circularities
 * @param {Any} source - The object to clone
 * @return {Any} deep clone of `source`
 */
function _clone (opts, source, target) {
  let type = toType(source)
  switch (type) {
    case 'String':
    case 'Number':
    case 'Boolean':
    case 'Null':
    case 'Undefined':
    case 'Symbol':
    case 'DOMPrototype': // (browser)
    case 'process': // (node) cloning this is not a good idea
      target = source
      break
    case 'Function':
      if (!target) {
        let _bind = (opts.bind === null ? null : opts.bind || source)
        if (opts.wrapFn) {
          target = function () {
            return source.apply(_bind, arguments)
          }
        } else {
          target = source.bind(_bind)
        }
      }
      target = _props(opts, source, target)
      break
    case 'Int8Array':
    case 'Uint8Array':
    case 'Uint8ClampedArray':
    case 'Int16Array':
    case 'Uint16Array':
    case 'Int32Array':
    case 'Uint32Array':
    case 'Float32Array':
    case 'Float64Array':
      target = new source.constructor(source)
      break
    case 'Array':
      target = source.map(function (item) {
        return _clone(opts, item)
      })
      target = _props(opts, source, target)
      break
    case 'Date':
      target = new Date(source)
      break
    case 'Error':
    case 'EvalError':
    case 'InternalError':
    case 'RangeError':
    case 'ReferenceError':
    case 'SyntaxError':
    case 'TypeError':
    case 'URIError':
      target = new source.constructor(source.message)
      target = _props(opts, source, target)
      target.stack = source.stack
      break
    case 'RegExp':
      let flags = source.flags ||
        (source.global ? 'g' : '') +
        (source.ignoreCase ? 'i' : '') +
        (source.multiline ? 'm' : '')
      target = new RegExp(source.source, flags)
      break
    case 'Buffer':
      target = new source.constructor(source)
      break
    case 'Window': // clone of global object
    case 'global':
      opts.wrapFn = true
      target = _props(opts, source, target || {})
      break
    case 'Math':
    case 'JSON':
    case 'Console':
    case 'Navigator':
    case 'Screen':
    case 'Object':
      target = _props(opts, source, target || {})
      break
    default:
      if (/^HTML/.test(type)) { // handle HTMLElements
        if (source.cloneNode) {
          target = source.cloneNode(true)
        } else {
          target = source
        }
      } else if (typeof source === 'object') { // handle other object based types
        target = _props(opts, source, target || {})
      } else { // anything else should be a primitive
        target = source
      }
  }
  return target
}

/**
 * Clone property while cloning circularities
 *
 * @static
 * @private
 * @param {Object} opts - options
 * @param {Any} source - source object
 * @param {Any} [target] - target object
 * @returns {Any} target
 */
function _props (opts, source, target) {
  let idx = opts.visited.indexOf(source) // check for circularities
  if (idx === -1) {
    opts.visited.push(source)
    opts.cloned.push(target)
    Object.getOwnPropertyNames(source).forEach(function (key) {
      if (key === 'prototype') {
        target[key] = Object.create(source[key])
        Object.getOwnPropertyNames(source[key]).forEach(function (p) {
          if (p !== 'constructor') {
            _descriptor(opts, source[key], target[key], p)
            // } else {
            //   target[key][p] = target
            //   Safari may throw here with TypeError: Attempted to assign to readonly property.
          }
        })
      } else {
        _descriptor(opts, source, target, key)
      }
    })
    opts.visited.pop()
    opts.cloned.pop()
  } else {
    target = opts.cloned[idx] // add reference of circularity
  }
  return target
}

/**
 * assign descriptor with property `key` from source to target
 * @private
 */
function _descriptor (opts, source, target, key) {
  let desc = Object.getOwnPropertyDescriptor(source, key)
  if (desc) {
    if (desc.writable) {
      desc.value = _clone(opts, desc.value)
    }
    try {
      Object.defineProperty(target, key, desc)
    } catch (e) {
      // Safari throws with TypeError:
      //  Attempting to change access mechanism for an unconfigurable property.
      //  Attempting to change value of a readonly property.
      if (!'Attempting to change'.indexOf(e.message)) {
        throw e
      }
    }
  }
}

/**
 * @private
 */
function toType (o) {
  return toString.call(o).replace(/^\[[a-z]+ (.*)\]$/, '$1')
}
