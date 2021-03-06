/* global describe, it */

var assert = require('assert')
var clones = require('..')

var isBrowser = (typeof window !== 'undefined')

// zuul testing needs some special treatment
if (typeof assert.deepStrictEqual === 'undefined') {
  assert.deepStrictEqual = assert.deepEqual // eslint-disable-line
}

describe('#clones', function () {
  var tests = [
    ['Null', null],
    ['Undefined', undefined],
    ['String', 'string'],
    ['Number', 3.14],
    ['Boolean', true],
    ['Array', [1, '2', false], true],
    ['Uint8Array', new Uint8Array([1, 2, 3]), true],
    ['Float32Array', new Float32Array([1.1, 2.22, 3.333]), true],
    ['Object', { a: 1, b: 2 }, true],
    ['Date', new Date('1970-01-01T00:00:00'), true],
    ['RegExp', new RegExp('test', 'gim'), true]
  ]
  tests.forEach(function (test) {
    var tcase = test[0]
    var inp = test[1]
    var isRef = test[2]
    it('should clone ' + tcase, function () {
      var res = clones(inp)
      assert.deepStrictEqual(res, inp)
      assert.strictEqual(toType(res), toType(inp))
      if (isRef) {
        assert.ok(res !== inp)
      }
    })
  })

  if (!isBrowser) {
    it('should clone Buffer', function () {
      var inp = Buffer.from('Hello')
      var res = clones(inp)
      assert.ok(res !== inp)
      assert.strictEqual(toType(res), toType(inp))
      assert.strictEqual(res.toString(), inp.toString())
    })
  }

  it('should clone Error', function () {
    var inp = new Error('boom')
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.strictEqual(toType(res), toType(inp))
    assert.strictEqual(res.message, inp.message)
    assert.strictEqual(res.stack, inp.stack)
  })

  it('should clone TypeError', function () {
    var inp = new TypeError('boom')
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.strictEqual(toType(res), toType(inp))
    assert.strictEqual(res.message, inp.message)
    assert.strictEqual(res.stack, inp.stack)
  })

  it('should clone Object of Objects', function () {
    var inp = { a: { b: { c: 3 } } }
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.strictEqual(toType(res), toType(inp))
    assert.ok(res.a.b !== inp.a.b)
    assert.deepStrictEqual(res.a.b, inp.a.b)
  })

  it('should clone Object of Array of Objects', function () {
    var inp = { a: [{ b: { c: 3 } }] }
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.ok(res.a !== inp.a)
    assert.ok(res.a[0] !== inp.a[0])
    assert.deepStrictEqual(res, inp)
  })

  it('should clone Array of Objects', function () {
    var inp = [{ a: 1 }, { b: 2 }]
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.strictEqual(toType(res), toType(inp))
    assert.ok(res[0] !== inp[0])
    assert.deepStrictEqual(res, inp)
  })

  it('should clone Array of Objects of Objects', function () {
    var inp = [{ a: { b: 1 } }, { c: { d: 2 } }, 3, '4']
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.ok(res[0] !== inp[0])
    assert.ok(res[0].a !== inp[0].a)
    assert.deepStrictEqual(res, inp)
  })

  it('should clone function', function () {
    var inp = function () { return 42 }
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.strictEqual(toType(res), toType(inp))
    assert.strictEqual(res(), 42)
  })

  it('should clone function with props', function () {
    var inp = function () { return 42 }
    inp.test = { a: 1, b: 2 }
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.strictEqual(res(), 42)
    assert.ok(res.test !== inp.test)
    assert.deepStrictEqual(res.test, inp.test)
  })

  it('should clone Array of functions', function () {
    var inp = [function () { return 1 }, function () { return 2 }]
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.ok(res[0] !== inp[0])
    assert.strictEqual(res[0](), inp[0]())
    assert.strictEqual(res[1](), inp[1]())
    // can be overwritten
    res[0] = 1
    assert.ok(res[0] !== inp[0])
    assert.ok(typeof inp[0], 'function')
  })

  it('should bind cloned function', function () {
    var inp = function () { return this.test() }
    var ctx = { test: function () { return 42 } }
    var res = clones(inp, ctx)
    assert.ok(res !== inp)
    assert.strictEqual(res(), 42)
  })

  it('should bind cloned function in Object of Array', function () {
    var inp = { a: [function () { return this.test() }] }
    var ctx = { test: function () { return 42 } }
    var res = clones(inp, ctx)
    assert.ok(res !== inp)
    assert.strictEqual(res.a[0](), 42)
  })

  it('should clone a circular object', function () {
    var inp = { a: { b: 1 } }
    inp.a.c = inp.a
    // console.log(inp)
    var res = clones(inp)
    assert.ok(res !== inp)
    assert.ok(res.a.c === res.a) // is circular
  })

  it('should clone everything', function () {
    var source = {
      obj: { a: { b: 1 }, d: new Date() },
      arr: [true, 1, { c: 'dee' }],
      fn: function () { return this.number + 12 }
    }
    // adding circularity
    source.obj.a.e = source.obj.a
    // do the cloneing (with binding a context)
    var dest = clones(source, { number: 30 })

    // checks
    assert.ok(dest !== source) // has different reference
    assert.ok(dest.obj !== source.obj) // has different reference
    assert.ok(dest.obj.a !== source.obj.a) // has different reference
    assert.ok(dest.obj.d !== source.obj.d) // has different reference
    assert.strictEqual(dest.obj.d.toISOString(),
      source.obj.d.toISOString()) // has same content
    assert.ok(dest.obj.a.e !== source.obj.a.e) // different references for circularities
    assert.ok(dest.fn !== source.fn) // has different function reference
    source.fn = source.fn.bind({ number: 29 }) // bind `this` for `source`
    assert.strictEqual(dest.fn(), source.fn() + 1) // returning the same result
  })

  describe('should clone the Math object', function () {
    var inp
    var res

    it('should be different', function () {
      inp = Math
      res = clones(inp)
      assert.ok(res !== inp)
    })
    it('should now be of type Object', function () {
      assert.strictEqual(toType(res), 'Object')
    })
    Object.getOwnPropertyNames(Math).forEach(function (key) {
      it(key, function () {
        if (toType(res[key]) === 'Function') {
          assert.ok(res[key] !== inp[key])
          if (inp[key].length === 1) {
            var same = (key === 'acosh' ? 1.2 : 0.5)
            assert.strictEqual(res[key](same), inp[key](same))
          } else if (inp[key].length === 2) {
            assert.strictEqual(res[key](0.5, 2), inp[key](0.5, 2))
          }
        } else {
          // Math constants
          assert.strictEqual(res[key], inp[key])
        }
      })
    })
  })

  describe('should clone the JSON object', function () {
    var inp
    var res

    it('should be different', function () {
      inp = JSON
      res = clones(inp)
      assert.ok(res !== inp)
    })
    it('should now be of type Object', function () {
      assert.strictEqual(toType(res), 'Object')
    })
    it('should give the same result', function () {
      var same = '{"a":1,"b":2,"c":{"d":"three"}}'
      assert.strictEqual(res.stringify(res.parse(same)), inp.stringify(inp.parse(same)))
    })
    Object.getOwnPropertyNames(JSON).forEach(function (key) {
      it(key, function () {
        assert.ok(res[key] !== inp[key])
      })
    })
  })

  it('should clone the console object', function () {
    var inp = console
    var res = clones(inp, inp)
    assert.ok(res !== inp)
    assert.ok(res.log !== inp.log)
    res.log('works')
  })

  if (!isBrowser) {
    it('should clone global object', function () {
      var inp = global
      var res = clones(inp, global)
      assert.ok(res !== inp)
      assert.ok(res.global !== inp.global) // circular obj is cloned
    })
  }

  if (isBrowser) {
    it('should clone window object', function () {
      this.timeout(10000) // need this timeout on edge
      var inp = window
      var res = clones(inp)
      assert.ok(res !== inp)
    })
    it('should clone document object', function () {
      this.timeout(10000) // need this timeout on edge
      var inp = document
      var res = clones(inp)
      assert.ok(res !== inp)
      // append an element to body
      var div = res.createElement('DIV')
      div.innerHTML = 'works'
      var body = res.querySelector('body')
      assert.strictEqual(toString.call(body), '[object HTMLBodyElement]')
      body.appendChild(div)
      assert.strictEqual(body.lastChild.innerHTML, 'works')
      // element should not be part of original DOM
      var body0 = inp.querySelector('body')
      assert.strictEqual(body0.lastChild.innerHTML, undefined)
      // overwriting a function does not harm original
      res.createElement = undefined
      assert.ok(inp.createElement !== undefined)
    })
  }

  describe('should clone built-in object', function () {
    it('Array', function () {
      var C = clones.classes(Array)
      var a = new Array(1, 2, 3) // eslint-disable-line no-array-constructor
      var c = new C(1, 2, 3)
      assert.ok(C !== Array)
      assert.ok(C.prototype !== Array.prototype)
      assert.ok(C.prototype.reverse !== Array.prototype.reverse)
      assert.strictEqual(a.reverse().join('#'), c.reverse().join('#'))
      // should protect against overwriting
      c.reverse = 1
      C.prototype.reverse = 0
      assert.strictEqual(typeof Array.prototype.reverse, 'function')
    })

    it('Object', function () {
      var C = clones.classes(Object)
      var a = Object.assign({ b: 2 }, new Object({ a: 1 })) // eslint-disable-line no-new-object
      var c = C.assign({ b: 2 }, new C({ a: 1 }))
      assert.ok(C !== Object)
      assert.ok(C.prototype !== Object.prototype)
      assert.ok(C.assign !== Object.assign)
      assert.deepStrictEqual(a, c)
    })

    it('Function', function () {
      var C = clones.classes(Function)
      var a = new Function('return "test"') // eslint-disable-line no-new-func
      var c = new C('return "test"')
      assert.ok(C !== Function)
      assert.ok(C.prototype !== Function.prototype)
      assert.ok(C.prototype.apply !== Function.prototype.apply)
      assert.strictEqual(a(), c())
    })

    it('Date', function () {
      var C = clones.classes(Date)
      var a = new Date('2000-02-29').toISOString()
      var c = new C('2000-02-29').toISOString()
      assert.ok(C !== Date)
      assert.ok(C.prototype !== Date.prototype)
      assert.ok(C.prototype.toISOString !== Date.prototype.toISOString)
      assert.strictEqual(a, c)
    })

    it('RegExp', function () {
      var C = clones.classes(RegExp)
      var a = new RegExp('(fo+).*', 'ig')
      var c = new C('(fo+).*', 'ig')
      assert.ok(C !== RegExp)
      assert.ok(C.prototype !== RegExp.prototype)
      assert.ok(C.prototype.test !== RegExp.prototype.test)
      assert.deepStrictEqual([].concat(a.exec('faFoofafoobaFoobar')), ['FoofafoobaFoobar', 'Foo'])
      assert.deepStrictEqual([].concat(c.exec('faFoofafoobaFoobar')), ['FoofafoobaFoobar', 'Foo'])
    })

    it('String', function () {
      var C = clones.classes(String)
      var a = 'ababc'
      var c = new C('ababc')
      assert.ok(C !== String)
      assert.ok(C.prototype !== String.prototype)
      assert.ok(C.prototype.substring !== String.prototype.substring)
      assert.ok(a !== c)
      assert.strictEqual(a.toString(), c.toString())
      assert.strictEqual(a.substring(2), c.substring(2))
    })

    it('Uint8Array', function () {
      var C = clones.classes(Uint8Array)
      var a = new Uint8Array([1, 2, 3])
      var c = new C([1, 2, 3])
      assert.ok(C !== Uint8Array)
      assert.ok(C.prototype !== Uint8Array.prototype)
      assert.ok(a !== c)
      // console.log(a, c)
      assert.strictEqual(a.length, c.length)
    })
  })
})

function toType (o) {
  return toString.call(o).replace(/^\[object (.*)\]$/, '$1')
}
