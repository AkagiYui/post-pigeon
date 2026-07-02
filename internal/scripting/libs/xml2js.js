var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __knownSymbol = (name2, symbol) => (symbol = Symbol[name2]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name2);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __await = function(promise, isYieldStar) {
  this[0] = promise;
  this[1] = isYieldStar;
};
var __asyncGenerator = (__this, __arguments, generator) => {
  var resume = (k, v, yes, no) => {
    try {
      var x = generator[k](v), isAwait = (v = x.value) instanceof __await, done = x.done;
      Promise.resolve(isAwait ? v[0] : v).then((y) => isAwait ? resume(k === "return" ? k : "next", v[1] ? { done: y.done, value: y.value } : y, yes, no) : yes({ value: y, done })).catch((e) => resume("throw", e, yes, no));
    } catch (e) {
      no(e);
    }
  }, method = (k, call, wait, clear) => it[k] = (x) => (call = new Promise((yes, no, run) => (run = () => resume(k, x, yes, no), q ? q.then(run) : run())), clear = () => q === wait && (q = 0), q = wait = call.then(clear, clear), call), q, it = {};
  return generator = generator.apply(__this, __arguments), it[__knownSymbol("asyncIterator")] = () => it, method("next"), method("throw"), method("return"), it;
};
var __yieldStar = (value) => {
  var obj = value[__knownSymbol("asyncIterator")], isAwait = false, method, it = {};
  if (obj == null) {
    obj = value[__knownSymbol("iterator")]();
    method = (k) => it[k] = (x) => obj[k](x);
  } else {
    obj = obj.call(value);
    method = (k) => it[k] = (v) => {
      if (isAwait) {
        isAwait = false;
        if (k === "throw") throw v;
        return v;
      }
      isAwait = true;
      return {
        done: false,
        value: new __await(new Promise((resolve) => {
          var x = obj[k](v);
          if (!(x instanceof Object)) __typeError("Object expected");
          resolve(x);
        }), 1)
      };
    };
  }
  return it[__knownSymbol("iterator")] = () => it, method("next"), "throw" in obj ? method("throw") : it.throw = (x) => {
    throw x;
  }, "return" in obj && method("return"), it;
};
var __forAwait = (obj, it, method) => (it = obj[__knownSymbol("asyncIterator")]) ? it.call(obj) : (obj = obj[__knownSymbol("iterator")](), it = {}, method = (key, fn) => (fn = obj[key]) && (it[key] = (arg) => new Promise((yes, no, done) => (arg = fn.call(obj, arg), done = arg.done, Promise.resolve(arg.value).then((value) => yes({ value, done }), no)))), method("next"), method("return"), it);

// node_modules/esbuild-plugin-polyfill-node/polyfills/__dirname.js
var init_dirname = __esm({
  "node_modules/esbuild-plugin-polyfill-node/polyfills/__dirname.js"() {
  }
});

// node_modules/@jspm/core/nodelibs/browser/process.js
var process_exports = {};
__export(process_exports, {
  _debugEnd: () => _debugEnd,
  _debugProcess: () => _debugProcess,
  _events: () => _events,
  _eventsCount: () => _eventsCount,
  _exiting: () => _exiting,
  _fatalExceptions: () => _fatalExceptions,
  _getActiveHandles: () => _getActiveHandles,
  _getActiveRequests: () => _getActiveRequests,
  _kill: () => _kill,
  _linkedBinding: () => _linkedBinding,
  _maxListeners: () => _maxListeners,
  _preload_modules: () => _preload_modules,
  _rawDebug: () => _rawDebug,
  _startProfilerIdleNotifier: () => _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier: () => _stopProfilerIdleNotifier,
  _tickCallback: () => _tickCallback,
  abort: () => abort,
  addListener: () => addListener,
  allowedNodeEnvironmentFlags: () => allowedNodeEnvironmentFlags,
  arch: () => arch,
  argv: () => argv,
  argv0: () => argv0,
  assert: () => assert,
  binding: () => binding,
  browser: () => browser,
  chdir: () => chdir,
  config: () => config,
  cpuUsage: () => cpuUsage,
  cwd: () => cwd,
  debugPort: () => debugPort,
  default: () => process,
  dlopen: () => dlopen,
  domain: () => domain,
  emit: () => emit,
  emitWarning: () => emitWarning,
  env: () => env,
  execArgv: () => execArgv,
  execPath: () => execPath,
  exit: () => exit,
  features: () => features,
  hasUncaughtExceptionCaptureCallback: () => hasUncaughtExceptionCaptureCallback,
  hrtime: () => hrtime,
  kill: () => kill,
  listeners: () => listeners,
  memoryUsage: () => memoryUsage,
  moduleLoadList: () => moduleLoadList,
  nextTick: () => nextTick,
  off: () => off,
  on: () => on,
  once: () => once,
  openStdin: () => openStdin,
  pid: () => pid,
  platform: () => platform,
  ppid: () => ppid,
  prependListener: () => prependListener,
  prependOnceListener: () => prependOnceListener,
  reallyExit: () => reallyExit,
  release: () => release,
  removeAllListeners: () => removeAllListeners,
  removeListener: () => removeListener,
  resourceUsage: () => resourceUsage,
  setSourceMapsEnabled: () => setSourceMapsEnabled,
  setUncaughtExceptionCaptureCallback: () => setUncaughtExceptionCaptureCallback,
  stderr: () => stderr,
  stdin: () => stdin,
  stdout: () => stdout,
  title: () => title,
  umask: () => umask,
  uptime: () => uptime,
  version: () => version,
  versions: () => versions
});
function unimplemented(name2) {
  throw new Error("Node.js process " + name2 + " is not supported by JSPM core outside of Node.js");
}
function cleanUpNextTick() {
  if (!draining || !currentQueue)
    return;
  draining = false;
  if (currentQueue.length) {
    queue = currentQueue.concat(queue);
  } else {
    queueIndex = -1;
  }
  if (queue.length)
    drainQueue();
}
function drainQueue() {
  if (draining)
    return;
  var timeout = setTimeout(cleanUpNextTick, 0);
  draining = true;
  var len = queue.length;
  while (len) {
    currentQueue = queue;
    queue = [];
    while (++queueIndex < len) {
      if (currentQueue)
        currentQueue[queueIndex].run();
    }
    queueIndex = -1;
    len = queue.length;
  }
  currentQueue = null;
  draining = false;
  clearTimeout(timeout);
}
function nextTick(fun) {
  var args = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var i = 1; i < arguments.length; i++)
      args[i - 1] = arguments[i];
  }
  queue.push(new Item(fun, args));
  if (queue.length === 1 && !draining)
    setTimeout(drainQueue, 0);
}
function Item(fun, array) {
  this.fun = fun;
  this.array = array;
}
function noop() {
}
function _linkedBinding(name2) {
  unimplemented("_linkedBinding");
}
function dlopen(name2) {
  unimplemented("dlopen");
}
function _getActiveRequests() {
  return [];
}
function _getActiveHandles() {
  return [];
}
function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion error");
}
function hasUncaughtExceptionCaptureCallback() {
  return false;
}
function uptime() {
  return _performance.now() / 1e3;
}
function hrtime(previousTimestamp) {
  var baseNow = Math.floor((Date.now() - _performance.now()) * 1e-3);
  var clocktime = _performance.now() * 1e-3;
  var seconds = Math.floor(clocktime) + baseNow;
  var nanoseconds = Math.floor(clocktime % 1 * 1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += nanoPerSec;
    }
  }
  return [seconds, nanoseconds];
}
function on() {
  return process;
}
function listeners(name2) {
  return [];
}
var queue, draining, currentQueue, queueIndex, title, arch, platform, env, argv, execArgv, version, versions, emitWarning, binding, umask, cwd, chdir, release, browser, _rawDebug, moduleLoadList, domain, _exiting, config, reallyExit, _kill, cpuUsage, resourceUsage, memoryUsage, kill, exit, openStdin, allowedNodeEnvironmentFlags, features, _fatalExceptions, setUncaughtExceptionCaptureCallback, _tickCallback, _debugProcess, _debugEnd, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, stdout, stderr, stdin, abort, pid, ppid, execPath, debugPort, argv0, _preload_modules, setSourceMapsEnabled, _performance, nowOffset, nanoPerSec, _maxListeners, _events, _eventsCount, addListener, once, off, removeListener, removeAllListeners, emit, prependListener, prependOnceListener, process;
var init_process = __esm({
  "node_modules/@jspm/core/nodelibs/browser/process.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    queue = [];
    draining = false;
    queueIndex = -1;
    Item.prototype.run = function() {
      this.fun.apply(null, this.array);
    };
    title = "browser";
    arch = "x64";
    platform = "browser";
    env = {
      PATH: "/usr/bin",
      LANG: typeof navigator !== "undefined" ? navigator.language + ".UTF-8" : void 0,
      PWD: "/",
      HOME: "/home",
      TMP: "/tmp"
    };
    argv = ["/usr/bin/node"];
    execArgv = [];
    version = "v16.8.0";
    versions = {};
    emitWarning = function(message, type) {
      console.warn((type ? type + ": " : "") + message);
    };
    binding = function(name2) {
      unimplemented("binding");
    };
    umask = function(mask) {
      return 0;
    };
    cwd = function() {
      return "/";
    };
    chdir = function(dir) {
    };
    release = {
      name: "node",
      sourceUrl: "",
      headersUrl: "",
      libUrl: ""
    };
    browser = true;
    _rawDebug = noop;
    moduleLoadList = [];
    domain = {};
    _exiting = false;
    config = {};
    reallyExit = noop;
    _kill = noop;
    cpuUsage = function() {
      return {};
    };
    resourceUsage = cpuUsage;
    memoryUsage = cpuUsage;
    kill = noop;
    exit = noop;
    openStdin = noop;
    allowedNodeEnvironmentFlags = {};
    features = {
      inspector: false,
      debug: false,
      uv: false,
      ipv6: false,
      tls_alpn: false,
      tls_sni: false,
      tls_ocsp: false,
      tls: false,
      cached_builtins: true
    };
    _fatalExceptions = noop;
    setUncaughtExceptionCaptureCallback = noop;
    _tickCallback = noop;
    _debugProcess = noop;
    _debugEnd = noop;
    _startProfilerIdleNotifier = noop;
    _stopProfilerIdleNotifier = noop;
    stdout = void 0;
    stderr = void 0;
    stdin = void 0;
    abort = noop;
    pid = 2;
    ppid = 1;
    execPath = "/bin/usr/node";
    debugPort = 9229;
    argv0 = "node";
    _preload_modules = [];
    setSourceMapsEnabled = noop;
    _performance = {
      now: typeof performance !== "undefined" ? performance.now.bind(performance) : void 0,
      timing: typeof performance !== "undefined" ? performance.timing : void 0
    };
    if (_performance.now === void 0) {
      nowOffset = Date.now();
      if (_performance.timing && _performance.timing.navigationStart) {
        nowOffset = _performance.timing.navigationStart;
      }
      _performance.now = () => Date.now() - nowOffset;
    }
    nanoPerSec = 1e9;
    hrtime.bigint = function(time) {
      var diff = hrtime(time);
      if (typeof BigInt === "undefined") {
        return diff[0] * nanoPerSec + diff[1];
      }
      return BigInt(diff[0] * nanoPerSec) + BigInt(diff[1]);
    };
    _maxListeners = 10;
    _events = {};
    _eventsCount = 0;
    addListener = on;
    once = on;
    off = on;
    removeListener = on;
    removeAllListeners = on;
    emit = noop;
    prependListener = on;
    prependOnceListener = on;
    process = {
      version,
      versions,
      arch,
      platform,
      browser,
      release,
      _rawDebug,
      moduleLoadList,
      binding,
      _linkedBinding,
      _events,
      _eventsCount,
      _maxListeners,
      on,
      addListener,
      once,
      off,
      removeListener,
      removeAllListeners,
      emit,
      prependListener,
      prependOnceListener,
      listeners,
      domain,
      _exiting,
      config,
      dlopen,
      uptime,
      _getActiveRequests,
      _getActiveHandles,
      reallyExit,
      _kill,
      cpuUsage,
      resourceUsage,
      memoryUsage,
      kill,
      exit,
      openStdin,
      allowedNodeEnvironmentFlags,
      assert,
      features,
      _fatalExceptions,
      setUncaughtExceptionCaptureCallback,
      hasUncaughtExceptionCaptureCallback,
      emitWarning,
      nextTick,
      _tickCallback,
      _debugProcess,
      _debugEnd,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      stdout,
      stdin,
      stderr,
      abort,
      umask,
      chdir,
      cwd,
      env,
      title,
      argv,
      execArgv,
      pid,
      ppid,
      execPath,
      debugPort,
      hrtime,
      argv0,
      _preload_modules,
      setSourceMapsEnabled
    };
  }
});

// node_modules/esbuild-plugin-polyfill-node/polyfills/process.js
var init_process2 = __esm({
  "node_modules/esbuild-plugin-polyfill-node/polyfills/process.js"() {
    init_process();
  }
});

// node_modules/@jspm/core/nodelibs/browser/chunk-DtuTasat.js
function dew$2() {
  if (_dewExec$2) return exports$2;
  _dewExec$2 = true;
  exports$2.byteLength = byteLength;
  exports$2.toByteArray = toByteArray;
  exports$2.fromByteArray = fromByteArray;
  var lookup = [];
  var revLookup = [];
  var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
  var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }
  revLookup["-".charCodeAt(0)] = 62;
  revLookup["_".charCodeAt(0)] = 63;
  function getLens(b64) {
    var len2 = b64.length;
    if (len2 % 4 > 0) {
      throw new Error("Invalid string. Length must be a multiple of 4");
    }
    var validLen = b64.indexOf("=");
    if (validLen === -1) validLen = len2;
    var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
    return [validLen, placeHoldersLen];
  }
  function byteLength(b64) {
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
  }
  function _byteLength(b64, validLen, placeHoldersLen) {
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
  }
  function toByteArray(b64) {
    var tmp;
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
    var curByte = 0;
    var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
    var i2;
    for (i2 = 0; i2 < len2; i2 += 4) {
      tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
      arr[curByte++] = tmp >> 16 & 255;
      arr[curByte++] = tmp >> 8 & 255;
      arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 2) {
      tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
      arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 1) {
      tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
      arr[curByte++] = tmp >> 8 & 255;
      arr[curByte++] = tmp & 255;
    }
    return arr;
  }
  function tripletToBase64(num) {
    return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
  }
  function encodeChunk(uint8, start, end) {
    var tmp;
    var output = [];
    for (var i2 = start; i2 < end; i2 += 3) {
      tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
      output.push(tripletToBase64(tmp));
    }
    return output.join("");
  }
  function fromByteArray(uint8) {
    var tmp;
    var len2 = uint8.length;
    var extraBytes = len2 % 3;
    var parts = [];
    var maxChunkLength = 16383;
    for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
      parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
    }
    if (extraBytes === 1) {
      tmp = uint8[len2 - 1];
      parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
    } else if (extraBytes === 2) {
      tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
      parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
    }
    return parts.join("");
  }
  return exports$2;
}
function dew$1() {
  if (_dewExec$1) return exports$1;
  _dewExec$1 = true;
  exports$1.read = function(buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? nBytes - 1 : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
    }
    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
    }
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  };
  exports$1.write = function(buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    var i = isLE ? 0 : nBytes - 1;
    var d = isLE ? 1 : -1;
    var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }
      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }
    for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
    }
    e = e << mLen | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
    }
    buffer[offset + i - d] |= s * 128;
  };
  return exports$1;
}
function dew() {
  if (_dewExec) return exports2;
  _dewExec = true;
  const base64 = dew$2();
  const ieee754 = dew$1();
  const customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
  exports2.Buffer = Buffer3;
  exports2.SlowBuffer = SlowBuffer;
  exports2.INSPECT_MAX_BYTES = 50;
  const K_MAX_LENGTH = 2147483647;
  exports2.kMaxLength = K_MAX_LENGTH;
  Buffer3.TYPED_ARRAY_SUPPORT = typedArraySupport();
  if (!Buffer3.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
    console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
  }
  function typedArraySupport() {
    try {
      const arr = new Uint8Array(1);
      const proto = {
        foo: function() {
          return 42;
        }
      };
      Object.setPrototypeOf(proto, Uint8Array.prototype);
      Object.setPrototypeOf(arr, proto);
      return arr.foo() === 42;
    } catch (e) {
      return false;
    }
  }
  Object.defineProperty(Buffer3.prototype, "parent", {
    enumerable: true,
    get: function() {
      if (!Buffer3.isBuffer(this)) return void 0;
      return this.buffer;
    }
  });
  Object.defineProperty(Buffer3.prototype, "offset", {
    enumerable: true,
    get: function() {
      if (!Buffer3.isBuffer(this)) return void 0;
      return this.byteOffset;
    }
  });
  function createBuffer(length) {
    if (length > K_MAX_LENGTH) {
      throw new RangeError('The value "' + length + '" is invalid for option "size"');
    }
    const buf = new Uint8Array(length);
    Object.setPrototypeOf(buf, Buffer3.prototype);
    return buf;
  }
  function Buffer3(arg, encodingOrOffset, length) {
    if (typeof arg === "number") {
      if (typeof encodingOrOffset === "string") {
        throw new TypeError('The "string" argument must be of type string. Received type number');
      }
      return allocUnsafe(arg);
    }
    return from(arg, encodingOrOffset, length);
  }
  Buffer3.poolSize = 8192;
  function from(value, encodingOrOffset, length) {
    if (typeof value === "string") {
      return fromString(value, encodingOrOffset);
    }
    if (ArrayBuffer.isView(value)) {
      return fromArrayView(value);
    }
    if (value == null) {
      throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
    }
    if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
      return fromArrayBuffer(value, encodingOrOffset, length);
    }
    if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
      return fromArrayBuffer(value, encodingOrOffset, length);
    }
    if (typeof value === "number") {
      throw new TypeError('The "value" argument must not be of type number. Received type number');
    }
    const valueOf = value.valueOf && value.valueOf();
    if (valueOf != null && valueOf !== value) {
      return Buffer3.from(valueOf, encodingOrOffset, length);
    }
    const b = fromObject(value);
    if (b) return b;
    if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
      return Buffer3.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
    }
    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
  }
  Buffer3.from = function(value, encodingOrOffset, length) {
    return from(value, encodingOrOffset, length);
  };
  Object.setPrototypeOf(Buffer3.prototype, Uint8Array.prototype);
  Object.setPrototypeOf(Buffer3, Uint8Array);
  function assertSize(size) {
    if (typeof size !== "number") {
      throw new TypeError('"size" argument must be of type number');
    } else if (size < 0) {
      throw new RangeError('The value "' + size + '" is invalid for option "size"');
    }
  }
  function alloc(size, fill, encoding) {
    assertSize(size);
    if (size <= 0) {
      return createBuffer(size);
    }
    if (fill !== void 0) {
      return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
    }
    return createBuffer(size);
  }
  Buffer3.alloc = function(size, fill, encoding) {
    return alloc(size, fill, encoding);
  };
  function allocUnsafe(size) {
    assertSize(size);
    return createBuffer(size < 0 ? 0 : checked(size) | 0);
  }
  Buffer3.allocUnsafe = function(size) {
    return allocUnsafe(size);
  };
  Buffer3.allocUnsafeSlow = function(size) {
    return allocUnsafe(size);
  };
  function fromString(string, encoding) {
    if (typeof encoding !== "string" || encoding === "") {
      encoding = "utf8";
    }
    if (!Buffer3.isEncoding(encoding)) {
      throw new TypeError("Unknown encoding: " + encoding);
    }
    const length = byteLength(string, encoding) | 0;
    let buf = createBuffer(length);
    const actual = buf.write(string, encoding);
    if (actual !== length) {
      buf = buf.slice(0, actual);
    }
    return buf;
  }
  function fromArrayLike(array) {
    const length = array.length < 0 ? 0 : checked(array.length) | 0;
    const buf = createBuffer(length);
    for (let i = 0; i < length; i += 1) {
      buf[i] = array[i] & 255;
    }
    return buf;
  }
  function fromArrayView(arrayView) {
    if (isInstance(arrayView, Uint8Array)) {
      const copy = new Uint8Array(arrayView);
      return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
    }
    return fromArrayLike(arrayView);
  }
  function fromArrayBuffer(array, byteOffset, length) {
    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError('"offset" is outside of buffer bounds');
    }
    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError('"length" is outside of buffer bounds');
    }
    let buf;
    if (byteOffset === void 0 && length === void 0) {
      buf = new Uint8Array(array);
    } else if (length === void 0) {
      buf = new Uint8Array(array, byteOffset);
    } else {
      buf = new Uint8Array(array, byteOffset, length);
    }
    Object.setPrototypeOf(buf, Buffer3.prototype);
    return buf;
  }
  function fromObject(obj) {
    if (Buffer3.isBuffer(obj)) {
      const len = checked(obj.length) | 0;
      const buf = createBuffer(len);
      if (buf.length === 0) {
        return buf;
      }
      obj.copy(buf, 0, 0, len);
      return buf;
    }
    if (obj.length !== void 0) {
      if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
        return createBuffer(0);
      }
      return fromArrayLike(obj);
    }
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data);
    }
  }
  function checked(length) {
    if (length >= K_MAX_LENGTH) {
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
    }
    return length | 0;
  }
  function SlowBuffer(length) {
    if (+length != length) {
      length = 0;
    }
    return Buffer3.alloc(+length);
  }
  Buffer3.isBuffer = function isBuffer2(b) {
    return b != null && b._isBuffer === true && b !== Buffer3.prototype;
  };
  Buffer3.compare = function compare(a, b) {
    if (isInstance(a, Uint8Array)) a = Buffer3.from(a, a.offset, a.byteLength);
    if (isInstance(b, Uint8Array)) b = Buffer3.from(b, b.offset, b.byteLength);
    if (!Buffer3.isBuffer(a) || !Buffer3.isBuffer(b)) {
      throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
    }
    if (a === b) return 0;
    let x = a.length;
    let y = b.length;
    for (let i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break;
      }
    }
    if (x < y) return -1;
    if (y < x) return 1;
    return 0;
  };
  Buffer3.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return true;
      default:
        return false;
    }
  };
  Buffer3.concat = function concat(list, length) {
    if (!Array.isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    }
    if (list.length === 0) {
      return Buffer3.alloc(0);
    }
    let i;
    if (length === void 0) {
      length = 0;
      for (i = 0; i < list.length; ++i) {
        length += list[i].length;
      }
    }
    const buffer = Buffer3.allocUnsafe(length);
    let pos = 0;
    for (i = 0; i < list.length; ++i) {
      let buf = list[i];
      if (isInstance(buf, Uint8Array)) {
        if (pos + buf.length > buffer.length) {
          if (!Buffer3.isBuffer(buf)) buf = Buffer3.from(buf);
          buf.copy(buffer, pos);
        } else {
          Uint8Array.prototype.set.call(buffer, buf, pos);
        }
      } else if (!Buffer3.isBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      } else {
        buf.copy(buffer, pos);
      }
      pos += buf.length;
    }
    return buffer;
  };
  function byteLength(string, encoding) {
    if (Buffer3.isBuffer(string)) {
      return string.length;
    }
    if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
      return string.byteLength;
    }
    if (typeof string !== "string") {
      throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string);
    }
    const len = string.length;
    const mustMatch = arguments.length > 2 && arguments[2] === true;
    if (!mustMatch && len === 0) return 0;
    let loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case "ascii":
        case "latin1":
        case "binary":
          return len;
        case "utf8":
        case "utf-8":
          return utf8ToBytes(string).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return len * 2;
        case "hex":
          return len >>> 1;
        case "base64":
          return base64ToBytes(string).length;
        default:
          if (loweredCase) {
            return mustMatch ? -1 : utf8ToBytes(string).length;
          }
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer3.byteLength = byteLength;
  function slowToString(encoding, start, end) {
    let loweredCase = false;
    if (start === void 0 || start < 0) {
      start = 0;
    }
    if (start > this.length) {
      return "";
    }
    if (end === void 0 || end > this.length) {
      end = this.length;
    }
    if (end <= 0) {
      return "";
    }
    end >>>= 0;
    start >>>= 0;
    if (end <= start) {
      return "";
    }
    if (!encoding) encoding = "utf8";
    while (true) {
      switch (encoding) {
        case "hex":
          return hexSlice(this, start, end);
        case "utf8":
        case "utf-8":
          return utf8Slice(this, start, end);
        case "ascii":
          return asciiSlice(this, start, end);
        case "latin1":
        case "binary":
          return latin1Slice(this, start, end);
        case "base64":
          return base64Slice(this, start, end);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return utf16leSlice(this, start, end);
        default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = (encoding + "").toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer3.prototype._isBuffer = true;
  function swap(b, n, m) {
    const i = b[n];
    b[n] = b[m];
    b[m] = i;
  }
  Buffer3.prototype.swap16 = function swap16() {
    const len = this.length;
    if (len % 2 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    }
    for (let i = 0; i < len; i += 2) {
      swap(this, i, i + 1);
    }
    return this;
  };
  Buffer3.prototype.swap32 = function swap32() {
    const len = this.length;
    if (len % 4 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    }
    for (let i = 0; i < len; i += 4) {
      swap(this, i, i + 3);
      swap(this, i + 1, i + 2);
    }
    return this;
  };
  Buffer3.prototype.swap64 = function swap64() {
    const len = this.length;
    if (len % 8 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    }
    for (let i = 0; i < len; i += 8) {
      swap(this, i, i + 7);
      swap(this, i + 1, i + 6);
      swap(this, i + 2, i + 5);
      swap(this, i + 3, i + 4);
    }
    return this;
  };
  Buffer3.prototype.toString = function toString() {
    const length = this.length;
    if (length === 0) return "";
    if (arguments.length === 0) return utf8Slice(this, 0, length);
    return slowToString.apply(this, arguments);
  };
  Buffer3.prototype.toLocaleString = Buffer3.prototype.toString;
  Buffer3.prototype.equals = function equals(b) {
    if (!Buffer3.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
    if (this === b) return true;
    return Buffer3.compare(this, b) === 0;
  };
  Buffer3.prototype.inspect = function inspect2() {
    let str = "";
    const max = exports2.INSPECT_MAX_BYTES;
    str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
    if (this.length > max) str += " ... ";
    return "<Buffer " + str + ">";
  };
  if (customInspectSymbol) {
    Buffer3.prototype[customInspectSymbol] = Buffer3.prototype.inspect;
  }
  Buffer3.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
    if (isInstance(target, Uint8Array)) {
      target = Buffer3.from(target, target.offset, target.byteLength);
    }
    if (!Buffer3.isBuffer(target)) {
      throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target);
    }
    if (start === void 0) {
      start = 0;
    }
    if (end === void 0) {
      end = target ? target.length : 0;
    }
    if (thisStart === void 0) {
      thisStart = 0;
    }
    if (thisEnd === void 0) {
      thisEnd = this.length;
    }
    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
      throw new RangeError("out of range index");
    }
    if (thisStart >= thisEnd && start >= end) {
      return 0;
    }
    if (thisStart >= thisEnd) {
      return -1;
    }
    if (start >= end) {
      return 1;
    }
    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;
    if (this === target) return 0;
    let x = thisEnd - thisStart;
    let y = end - start;
    const len = Math.min(x, y);
    const thisCopy = this.slice(thisStart, thisEnd);
    const targetCopy = target.slice(start, end);
    for (let i = 0; i < len; ++i) {
      if (thisCopy[i] !== targetCopy[i]) {
        x = thisCopy[i];
        y = targetCopy[i];
        break;
      }
    }
    if (x < y) return -1;
    if (y < x) return 1;
    return 0;
  };
  function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
    if (buffer.length === 0) return -1;
    if (typeof byteOffset === "string") {
      encoding = byteOffset;
      byteOffset = 0;
    } else if (byteOffset > 2147483647) {
      byteOffset = 2147483647;
    } else if (byteOffset < -2147483648) {
      byteOffset = -2147483648;
    }
    byteOffset = +byteOffset;
    if (numberIsNaN(byteOffset)) {
      byteOffset = dir ? 0 : buffer.length - 1;
    }
    if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
    if (byteOffset >= buffer.length) {
      if (dir) return -1;
      else byteOffset = buffer.length - 1;
    } else if (byteOffset < 0) {
      if (dir) byteOffset = 0;
      else return -1;
    }
    if (typeof val === "string") {
      val = Buffer3.from(val, encoding);
    }
    if (Buffer3.isBuffer(val)) {
      if (val.length === 0) {
        return -1;
      }
      return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
    } else if (typeof val === "number") {
      val = val & 255;
      if (typeof Uint8Array.prototype.indexOf === "function") {
        if (dir) {
          return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
        } else {
          return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
        }
      }
      return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
    }
    throw new TypeError("val must be string, number or Buffer");
  }
  function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
    let indexSize = 1;
    let arrLength = arr.length;
    let valLength = val.length;
    if (encoding !== void 0) {
      encoding = String(encoding).toLowerCase();
      if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
        if (arr.length < 2 || val.length < 2) {
          return -1;
        }
        indexSize = 2;
        arrLength /= 2;
        valLength /= 2;
        byteOffset /= 2;
      }
    }
    function read(buf, i2) {
      if (indexSize === 1) {
        return buf[i2];
      } else {
        return buf.readUInt16BE(i2 * indexSize);
      }
    }
    let i;
    if (dir) {
      let foundIndex = -1;
      for (i = byteOffset; i < arrLength; i++) {
        if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
          if (foundIndex === -1) foundIndex = i;
          if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
        } else {
          if (foundIndex !== -1) i -= i - foundIndex;
          foundIndex = -1;
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
      for (i = byteOffset; i >= 0; i--) {
        let found = true;
        for (let j = 0; j < valLength; j++) {
          if (read(arr, i + j) !== read(val, j)) {
            found = false;
            break;
          }
        }
        if (found) return i;
      }
    }
    return -1;
  }
  Buffer3.prototype.includes = function includes(val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1;
  };
  Buffer3.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
  };
  Buffer3.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
  };
  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    const remaining = buf.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = Number(length);
      if (length > remaining) {
        length = remaining;
      }
    }
    const strLen = string.length;
    if (length > strLen / 2) {
      length = strLen / 2;
    }
    let i;
    for (i = 0; i < length; ++i) {
      const parsed = parseInt(string.substr(i * 2, 2), 16);
      if (numberIsNaN(parsed)) return i;
      buf[offset + i] = parsed;
    }
    return i;
  }
  function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
  }
  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
  }
  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
  }
  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
  }
  Buffer3.prototype.write = function write(string, offset, length, encoding) {
    if (offset === void 0) {
      encoding = "utf8";
      length = this.length;
      offset = 0;
    } else if (length === void 0 && typeof offset === "string") {
      encoding = offset;
      length = this.length;
      offset = 0;
    } else if (isFinite(offset)) {
      offset = offset >>> 0;
      if (isFinite(length)) {
        length = length >>> 0;
        if (encoding === void 0) encoding = "utf8";
      } else {
        encoding = length;
        length = void 0;
      }
    } else {
      throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
    }
    const remaining = this.length - offset;
    if (length === void 0 || length > remaining) length = remaining;
    if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
      throw new RangeError("Attempt to write outside buffer bounds");
    }
    if (!encoding) encoding = "utf8";
    let loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case "hex":
          return hexWrite(this, string, offset, length);
        case "utf8":
        case "utf-8":
          return utf8Write(this, string, offset, length);
        case "ascii":
        case "latin1":
        case "binary":
          return asciiWrite(this, string, offset, length);
        case "base64":
          return base64Write(this, string, offset, length);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return ucs2Write(this, string, offset, length);
        default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };
  Buffer3.prototype.toJSON = function toJSON() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return base64.fromByteArray(buf);
    } else {
      return base64.fromByteArray(buf.slice(start, end));
    }
  }
  function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    const res = [];
    let i = start;
    while (i < end) {
      const firstByte = buf[i];
      let codePoint = null;
      let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
      if (i + bytesPerSequence <= end) {
        let secondByte, thirdByte, fourthByte, tempCodePoint;
        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 128) {
              codePoint = firstByte;
            }
            break;
          case 2:
            secondByte = buf[i + 1];
            if ((secondByte & 192) === 128) {
              tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
              if (tempCodePoint > 127) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 3:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
              tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
              if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 4:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            fourthByte = buf[i + 3];
            if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
              tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
              if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                codePoint = tempCodePoint;
              }
            }
        }
      }
      if (codePoint === null) {
        codePoint = 65533;
        bytesPerSequence = 1;
      } else if (codePoint > 65535) {
        codePoint -= 65536;
        res.push(codePoint >>> 10 & 1023 | 55296);
        codePoint = 56320 | codePoint & 1023;
      }
      res.push(codePoint);
      i += bytesPerSequence;
    }
    return decodeCodePointsArray(res);
  }
  const MAX_ARGUMENTS_LENGTH = 4096;
  function decodeCodePointsArray(codePoints) {
    const len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints);
    }
    let res = "";
    let i = 0;
    while (i < len) {
      res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
    }
    return res;
  }
  function asciiSlice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);
    for (let i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i] & 127);
    }
    return ret;
  }
  function latin1Slice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);
    for (let i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i]);
    }
    return ret;
  }
  function hexSlice(buf, start, end) {
    const len = buf.length;
    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;
    let out = "";
    for (let i = start; i < end; ++i) {
      out += hexSliceLookupTable[buf[i]];
    }
    return out;
  }
  function utf16leSlice(buf, start, end) {
    const bytes = buf.slice(start, end);
    let res = "";
    for (let i = 0; i < bytes.length - 1; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }
    return res;
  }
  Buffer3.prototype.slice = function slice(start, end) {
    const len = this.length;
    start = ~~start;
    end = end === void 0 ? len : ~~end;
    if (start < 0) {
      start += len;
      if (start < 0) start = 0;
    } else if (start > len) {
      start = len;
    }
    if (end < 0) {
      end += len;
      if (end < 0) end = 0;
    } else if (end > len) {
      end = len;
    }
    if (end < start) end = start;
    const newBuf = this.subarray(start, end);
    Object.setPrototypeOf(newBuf, Buffer3.prototype);
    return newBuf;
  };
  function checkOffset(offset, ext, length) {
    if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
    if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
  }
  Buffer3.prototype.readUintLE = Buffer3.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength2, this.length);
    let val = this[offset];
    let mul = 1;
    let i = 0;
    while (++i < byteLength2 && (mul *= 256)) {
      val += this[offset + i] * mul;
    }
    return val;
  };
  Buffer3.prototype.readUintBE = Buffer3.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) {
      checkOffset(offset, byteLength2, this.length);
    }
    let val = this[offset + --byteLength2];
    let mul = 1;
    while (byteLength2 > 0 && (mul *= 256)) {
      val += this[offset + --byteLength2] * mul;
    }
    return val;
  };
  Buffer3.prototype.readUint8 = Buffer3.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 1, this.length);
    return this[offset];
  };
  Buffer3.prototype.readUint16LE = Buffer3.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] | this[offset + 1] << 8;
  };
  Buffer3.prototype.readUint16BE = Buffer3.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] << 8 | this[offset + 1];
  };
  Buffer3.prototype.readUint32LE = Buffer3.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
  };
  Buffer3.prototype.readUint32BE = Buffer3.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
  };
  Buffer3.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
    const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
    return BigInt(lo) + (BigInt(hi) << BigInt(32));
  });
  Buffer3.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
    const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
    return (BigInt(hi) << BigInt(32)) + BigInt(lo);
  });
  Buffer3.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength2, this.length);
    let val = this[offset];
    let mul = 1;
    let i = 0;
    while (++i < byteLength2 && (mul *= 256)) {
      val += this[offset + i] * mul;
    }
    mul *= 128;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
    return val;
  };
  Buffer3.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength2, this.length);
    let i = byteLength2;
    let mul = 1;
    let val = this[offset + --i];
    while (i > 0 && (mul *= 256)) {
      val += this[offset + --i] * mul;
    }
    mul *= 128;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
    return val;
  };
  Buffer3.prototype.readInt8 = function readInt8(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 1, this.length);
    if (!(this[offset] & 128)) return this[offset];
    return (255 - this[offset] + 1) * -1;
  };
  Buffer3.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    const val = this[offset] | this[offset + 1] << 8;
    return val & 32768 ? val | 4294901760 : val;
  };
  Buffer3.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    const val = this[offset + 1] | this[offset] << 8;
    return val & 32768 ? val | 4294901760 : val;
  };
  Buffer3.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
  };
  Buffer3.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
  };
  Buffer3.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
    return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
  });
  Buffer3.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const val = (first << 24) + // Overflow
    this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
    return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
  });
  Buffer3.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return ieee754.read(this, offset, true, 23, 4);
  };
  Buffer3.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return ieee754.read(this, offset, false, 23, 4);
  };
  Buffer3.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 8, this.length);
    return ieee754.read(this, offset, true, 52, 8);
  };
  Buffer3.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 8, this.length);
    return ieee754.read(this, offset, false, 52, 8);
  };
  function checkInt(buf, value, offset, ext, max, min) {
    if (!Buffer3.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
    if (offset + ext > buf.length) throw new RangeError("Index out of range");
  }
  Buffer3.prototype.writeUintLE = Buffer3.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
    value = +value;
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
      checkInt(this, value, offset, byteLength2, maxBytes, 0);
    }
    let mul = 1;
    let i = 0;
    this[offset] = value & 255;
    while (++i < byteLength2 && (mul *= 256)) {
      this[offset + i] = value / mul & 255;
    }
    return offset + byteLength2;
  };
  Buffer3.prototype.writeUintBE = Buffer3.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
    value = +value;
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
      checkInt(this, value, offset, byteLength2, maxBytes, 0);
    }
    let i = byteLength2 - 1;
    let mul = 1;
    this[offset + i] = value & 255;
    while (--i >= 0 && (mul *= 256)) {
      this[offset + i] = value / mul & 255;
    }
    return offset + byteLength2;
  };
  Buffer3.prototype.writeUint8 = Buffer3.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
    this[offset] = value & 255;
    return offset + 1;
  };
  Buffer3.prototype.writeUint16LE = Buffer3.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    return offset + 2;
  };
  Buffer3.prototype.writeUint16BE = Buffer3.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
    this[offset] = value >>> 8;
    this[offset + 1] = value & 255;
    return offset + 2;
  };
  Buffer3.prototype.writeUint32LE = Buffer3.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
    this[offset + 3] = value >>> 24;
    this[offset + 2] = value >>> 16;
    this[offset + 1] = value >>> 8;
    this[offset] = value & 255;
    return offset + 4;
  };
  Buffer3.prototype.writeUint32BE = Buffer3.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 255;
    return offset + 4;
  };
  function wrtBigUInt64LE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7);
    let lo = Number(value & BigInt(4294967295));
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    let hi = Number(value >> BigInt(32) & BigInt(4294967295));
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    return offset;
  }
  function wrtBigUInt64BE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7);
    let lo = Number(value & BigInt(4294967295));
    buf[offset + 7] = lo;
    lo = lo >> 8;
    buf[offset + 6] = lo;
    lo = lo >> 8;
    buf[offset + 5] = lo;
    lo = lo >> 8;
    buf[offset + 4] = lo;
    let hi = Number(value >> BigInt(32) & BigInt(4294967295));
    buf[offset + 3] = hi;
    hi = hi >> 8;
    buf[offset + 2] = hi;
    hi = hi >> 8;
    buf[offset + 1] = hi;
    hi = hi >> 8;
    buf[offset] = hi;
    return offset + 8;
  }
  Buffer3.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
    return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
  });
  Buffer3.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
    return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
  });
  Buffer3.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength2 - 1);
      checkInt(this, value, offset, byteLength2, limit - 1, -limit);
    }
    let i = 0;
    let mul = 1;
    let sub = 0;
    this[offset] = value & 255;
    while (++i < byteLength2 && (mul *= 256)) {
      if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
        sub = 1;
      }
      this[offset + i] = (value / mul >> 0) - sub & 255;
    }
    return offset + byteLength2;
  };
  Buffer3.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength2 - 1);
      checkInt(this, value, offset, byteLength2, limit - 1, -limit);
    }
    let i = byteLength2 - 1;
    let mul = 1;
    let sub = 0;
    this[offset + i] = value & 255;
    while (--i >= 0 && (mul *= 256)) {
      if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
        sub = 1;
      }
      this[offset + i] = (value / mul >> 0) - sub & 255;
    }
    return offset + byteLength2;
  };
  Buffer3.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
    if (value < 0) value = 255 + value + 1;
    this[offset] = value & 255;
    return offset + 1;
  };
  Buffer3.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    return offset + 2;
  };
  Buffer3.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
    this[offset] = value >>> 8;
    this[offset + 1] = value & 255;
    return offset + 2;
  };
  Buffer3.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    this[offset + 2] = value >>> 16;
    this[offset + 3] = value >>> 24;
    return offset + 4;
  };
  Buffer3.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
    if (value < 0) value = 4294967295 + value + 1;
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 255;
    return offset + 4;
  };
  Buffer3.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
    return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  Buffer3.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
    return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) throw new RangeError("Index out of range");
    if (offset < 0) throw new RangeError("Index out of range");
  }
  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4);
    }
    ieee754.write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
  }
  Buffer3.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert);
  };
  Buffer3.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert);
  };
  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8);
    }
    ieee754.write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
  }
  Buffer3.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert);
  };
  Buffer3.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert);
  };
  Buffer3.prototype.copy = function copy(target, targetStart, start, end) {
    if (!Buffer3.isBuffer(target)) throw new TypeError("argument should be a Buffer");
    if (!start) start = 0;
    if (!end && end !== 0) end = this.length;
    if (targetStart >= target.length) targetStart = target.length;
    if (!targetStart) targetStart = 0;
    if (end > 0 && end < start) end = start;
    if (end === start) return 0;
    if (target.length === 0 || this.length === 0) return 0;
    if (targetStart < 0) {
      throw new RangeError("targetStart out of bounds");
    }
    if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
    if (end < 0) throw new RangeError("sourceEnd out of bounds");
    if (end > this.length) end = this.length;
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }
    const len = end - start;
    if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
      this.copyWithin(targetStart, start, end);
    } else {
      Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
    }
    return len;
  };
  Buffer3.prototype.fill = function fill(val, start, end, encoding) {
    if (typeof val === "string") {
      if (typeof start === "string") {
        encoding = start;
        start = 0;
        end = this.length;
      } else if (typeof end === "string") {
        encoding = end;
        end = this.length;
      }
      if (encoding !== void 0 && typeof encoding !== "string") {
        throw new TypeError("encoding must be a string");
      }
      if (typeof encoding === "string" && !Buffer3.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
      if (val.length === 1) {
        const code = val.charCodeAt(0);
        if (encoding === "utf8" && code < 128 || encoding === "latin1") {
          val = code;
        }
      }
    } else if (typeof val === "number") {
      val = val & 255;
    } else if (typeof val === "boolean") {
      val = Number(val);
    }
    if (start < 0 || this.length < start || this.length < end) {
      throw new RangeError("Out of range index");
    }
    if (end <= start) {
      return this;
    }
    start = start >>> 0;
    end = end === void 0 ? this.length : end >>> 0;
    if (!val) val = 0;
    let i;
    if (typeof val === "number") {
      for (i = start; i < end; ++i) {
        this[i] = val;
      }
    } else {
      const bytes = Buffer3.isBuffer(val) ? val : Buffer3.from(val, encoding);
      const len = bytes.length;
      if (len === 0) {
        throw new TypeError('The value "' + val + '" is invalid for argument "value"');
      }
      for (i = 0; i < end - start; ++i) {
        this[i + start] = bytes[i % len];
      }
    }
    return this;
  };
  const errors = {};
  function E(sym, getMessage, Base) {
    errors[sym] = class NodeError extends Base {
      constructor() {
        super();
        Object.defineProperty(this, "message", {
          value: getMessage.apply(this, arguments),
          writable: true,
          configurable: true
        });
        this.name = `${this.name} [${sym}]`;
        this.stack;
        delete this.name;
      }
      get code() {
        return sym;
      }
      set code(value) {
        Object.defineProperty(this, "code", {
          configurable: true,
          enumerable: true,
          value,
          writable: true
        });
      }
      toString() {
        return `${this.name} [${sym}]: ${this.message}`;
      }
    };
  }
  E("ERR_BUFFER_OUT_OF_BOUNDS", function(name2) {
    if (name2) {
      return `${name2} is outside of buffer bounds`;
    }
    return "Attempt to access memory outside buffer bounds";
  }, RangeError);
  E("ERR_INVALID_ARG_TYPE", function(name2, actual) {
    return `The "${name2}" argument must be of type number. Received type ${typeof actual}`;
  }, TypeError);
  E("ERR_OUT_OF_RANGE", function(str, range, input) {
    let msg = `The value of "${str}" is out of range.`;
    let received = input;
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input));
    } else if (typeof input === "bigint") {
      received = String(input);
      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
        received = addNumericalSeparator(received);
      }
      received += "n";
    }
    msg += ` It must be ${range}. Received ${received}`;
    return msg;
  }, RangeError);
  function addNumericalSeparator(val) {
    let res = "";
    let i = val.length;
    const start = val[0] === "-" ? 1 : 0;
    for (; i >= start + 4; i -= 3) {
      res = `_${val.slice(i - 3, i)}${res}`;
    }
    return `${val.slice(0, i)}${res}`;
  }
  function checkBounds(buf, offset, byteLength2) {
    validateNumber(offset, "offset");
    if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
      boundsError(offset, buf.length - (byteLength2 + 1));
    }
  }
  function checkIntBI(value, min, max, buf, offset, byteLength2) {
    if (value > max || value < min) {
      const n = typeof min === "bigint" ? "n" : "";
      let range;
      {
        if (min === 0 || min === BigInt(0)) {
          range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
        } else {
          range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
        }
      }
      throw new errors.ERR_OUT_OF_RANGE("value", range, value);
    }
    checkBounds(buf, offset, byteLength2);
  }
  function validateNumber(value, name2) {
    if (typeof value !== "number") {
      throw new errors.ERR_INVALID_ARG_TYPE(name2, "number", value);
    }
  }
  function boundsError(value, length, type) {
    if (Math.floor(value) !== value) {
      validateNumber(value, type);
      throw new errors.ERR_OUT_OF_RANGE("offset", "an integer", value);
    }
    if (length < 0) {
      throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
    }
    throw new errors.ERR_OUT_OF_RANGE("offset", `>= ${0} and <= ${length}`, value);
  }
  const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
  function base64clean(str) {
    str = str.split("=")[0];
    str = str.trim().replace(INVALID_BASE64_RE, "");
    if (str.length < 2) return "";
    while (str.length % 4 !== 0) {
      str = str + "=";
    }
    return str;
  }
  function utf8ToBytes(string, units) {
    units = units || Infinity;
    let codePoint;
    const length = string.length;
    let leadSurrogate = null;
    const bytes = [];
    for (let i = 0; i < length; ++i) {
      codePoint = string.charCodeAt(i);
      if (codePoint > 55295 && codePoint < 57344) {
        if (!leadSurrogate) {
          if (codePoint > 56319) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            continue;
          } else if (i + 1 === length) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            continue;
          }
          leadSurrogate = codePoint;
          continue;
        }
        if (codePoint < 56320) {
          if ((units -= 3) > -1) bytes.push(239, 191, 189);
          leadSurrogate = codePoint;
          continue;
        }
        codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
      } else if (leadSurrogate) {
        if ((units -= 3) > -1) bytes.push(239, 191, 189);
      }
      leadSurrogate = null;
      if (codePoint < 128) {
        if ((units -= 1) < 0) break;
        bytes.push(codePoint);
      } else if (codePoint < 2048) {
        if ((units -= 2) < 0) break;
        bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
      } else if (codePoint < 65536) {
        if ((units -= 3) < 0) break;
        bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
      } else if (codePoint < 1114112) {
        if ((units -= 4) < 0) break;
        bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
      } else {
        throw new Error("Invalid code point");
      }
    }
    return bytes;
  }
  function asciiToBytes(str) {
    const byteArray = [];
    for (let i = 0; i < str.length; ++i) {
      byteArray.push(str.charCodeAt(i) & 255);
    }
    return byteArray;
  }
  function utf16leToBytes(str, units) {
    let c, hi, lo;
    const byteArray = [];
    for (let i = 0; i < str.length; ++i) {
      if ((units -= 2) < 0) break;
      c = str.charCodeAt(i);
      hi = c >> 8;
      lo = c % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }
    return byteArray;
  }
  function base64ToBytes(str) {
    return base64.toByteArray(base64clean(str));
  }
  function blitBuffer(src, dst, offset, length) {
    let i;
    for (i = 0; i < length; ++i) {
      if (i + offset >= dst.length || i >= src.length) break;
      dst[i + offset] = src[i];
    }
    return i;
  }
  function isInstance(obj, type) {
    return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
  }
  function numberIsNaN(obj) {
    return obj !== obj;
  }
  const hexSliceLookupTable = (function() {
    const alphabet = "0123456789abcdef";
    const table = new Array(256);
    for (let i = 0; i < 16; ++i) {
      const i16 = i * 16;
      for (let j = 0; j < 16; ++j) {
        table[i16 + j] = alphabet[i] + alphabet[j];
      }
    }
    return table;
  })();
  function defineBigIntMethod(fn) {
    return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
  }
  function BufferBigIntNotDefined() {
    throw new Error("BigInt not supported");
  }
  return exports2;
}
var exports$2, _dewExec$2, exports$1, _dewExec$1, exports2, _dewExec;
var init_chunk_DtuTasat = __esm({
  "node_modules/@jspm/core/nodelibs/browser/chunk-DtuTasat.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    exports$2 = {};
    _dewExec$2 = false;
    exports$1 = {};
    _dewExec$1 = false;
    exports2 = {};
    _dewExec = false;
  }
});

// node_modules/@jspm/core/nodelibs/browser/buffer.js
var exports3, Buffer2, INSPECT_MAX_BYTES, kMaxLength;
var init_buffer = __esm({
  "node_modules/@jspm/core/nodelibs/browser/buffer.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    init_chunk_DtuTasat();
    exports3 = dew();
    exports3["Buffer"];
    exports3["SlowBuffer"];
    exports3["INSPECT_MAX_BYTES"];
    exports3["kMaxLength"];
    Buffer2 = exports3.Buffer;
    INSPECT_MAX_BYTES = exports3.INSPECT_MAX_BYTES;
    kMaxLength = exports3.kMaxLength;
  }
});

// node_modules/esbuild-plugin-polyfill-node/polyfills/buffer.js
var init_buffer2 = __esm({
  "node_modules/esbuild-plugin-polyfill-node/polyfills/buffer.js"() {
    init_buffer();
  }
});

// node_modules/xml2js/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/xml2js/lib/defaults.js"(exports11) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      exports11.defaults = {
        "0.1": {
          explicitCharkey: false,
          trim: true,
          normalize: true,
          normalizeTags: false,
          attrkey: "@",
          charkey: "#",
          explicitArray: false,
          ignoreAttrs: false,
          mergeAttrs: false,
          explicitRoot: false,
          validator: null,
          xmlns: false,
          explicitChildren: false,
          childkey: "@@",
          charsAsChildren: false,
          includeWhiteChars: false,
          async: false,
          strict: true,
          attrNameProcessors: null,
          attrValueProcessors: null,
          tagNameProcessors: null,
          valueProcessors: null,
          emptyTag: ""
        },
        "0.2": {
          explicitCharkey: false,
          trim: false,
          normalize: false,
          normalizeTags: false,
          attrkey: "$",
          charkey: "_",
          explicitArray: true,
          ignoreAttrs: false,
          mergeAttrs: false,
          explicitRoot: true,
          validator: null,
          xmlns: false,
          explicitChildren: false,
          preserveChildrenOrder: false,
          childkey: "$$",
          charsAsChildren: false,
          includeWhiteChars: false,
          async: false,
          strict: true,
          attrNameProcessors: null,
          attrValueProcessors: null,
          tagNameProcessors: null,
          valueProcessors: null,
          rootName: "root",
          xmldec: {
            "version": "1.0",
            "encoding": "UTF-8",
            "standalone": true
          },
          doctype: null,
          renderOpts: {
            "pretty": true,
            "indent": "  ",
            "newline": "\n"
          },
          headless: false,
          chunkSize: 1e4,
          emptyTag: "",
          cdata: false
        }
      };
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/Utility.js
var require_Utility = __commonJS({
  "node_modules/xmlbuilder/lib/Utility.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var assign, isArray2, isEmpty, isFunction2, isObject2, isPlainObject, slice = [].slice, hasProp = {}.hasOwnProperty;
      assign = function() {
        var i, key, len, source, sources, target;
        target = arguments[0], sources = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        if (isFunction2(Object.assign)) {
          Object.assign.apply(null, arguments);
        } else {
          for (i = 0, len = sources.length; i < len; i++) {
            source = sources[i];
            if (source != null) {
              for (key in source) {
                if (!hasProp.call(source, key)) continue;
                target[key] = source[key];
              }
            }
          }
        }
        return target;
      };
      isFunction2 = function(val) {
        return !!val && Object.prototype.toString.call(val) === "[object Function]";
      };
      isObject2 = function(val) {
        var ref;
        return !!val && ((ref = typeof val) === "function" || ref === "object");
      };
      isArray2 = function(val) {
        if (isFunction2(Array.isArray)) {
          return Array.isArray(val);
        } else {
          return Object.prototype.toString.call(val) === "[object Array]";
        }
      };
      isEmpty = function(val) {
        var key;
        if (isArray2(val)) {
          return !val.length;
        } else {
          for (key in val) {
            if (!hasProp.call(val, key)) continue;
            return false;
          }
          return true;
        }
      };
      isPlainObject = function(val) {
        var ctor, proto;
        return isObject2(val) && (proto = Object.getPrototypeOf(val)) && (ctor = proto.constructor) && typeof ctor === "function" && ctor instanceof ctor && Function.prototype.toString.call(ctor) === Function.prototype.toString.call(Object);
      };
      module2.exports.assign = assign;
      module2.exports.isFunction = isFunction2;
      module2.exports.isObject = isObject2;
      module2.exports.isArray = isArray2;
      module2.exports.isEmpty = isEmpty;
      module2.exports.isPlainObject = isPlainObject;
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLAttribute.js
var require_XMLAttribute = __commonJS({
  "node_modules/xmlbuilder/lib/XMLAttribute.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLAttribute;
      module2.exports = XMLAttribute = (function() {
        function XMLAttribute2(parent, name2, value) {
          this.options = parent.options;
          this.stringify = parent.stringify;
          if (name2 == null) {
            throw new Error("Missing attribute name of element " + parent.name);
          }
          if (value == null) {
            throw new Error("Missing attribute value for attribute " + name2 + " of element " + parent.name);
          }
          this.name = this.stringify.attName(name2);
          this.value = this.stringify.attValue(value);
        }
        XMLAttribute2.prototype.clone = function() {
          return Object.create(this);
        };
        XMLAttribute2.prototype.toString = function(options) {
          return this.options.writer.set(options).attribute(this);
        };
        return XMLAttribute2;
      })();
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLElement.js
var require_XMLElement = __commonJS({
  "node_modules/xmlbuilder/lib/XMLElement.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLAttribute, XMLElement, XMLNode, isFunction2, isObject2, ref, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      ref = require_Utility(), isObject2 = ref.isObject, isFunction2 = ref.isFunction;
      XMLNode = require_XMLNode();
      XMLAttribute = require_XMLAttribute();
      module2.exports = XMLElement = (function(superClass) {
        extend(XMLElement2, superClass);
        function XMLElement2(parent, name2, attributes) {
          XMLElement2.__super__.constructor.call(this, parent);
          if (name2 == null) {
            throw new Error("Missing element name");
          }
          this.name = this.stringify.eleName(name2);
          this.attributes = {};
          if (attributes != null) {
            this.attribute(attributes);
          }
          if (parent.isDocument) {
            this.isRoot = true;
            this.documentObject = parent;
            parent.rootObject = this;
          }
        }
        XMLElement2.prototype.clone = function() {
          var att, attName, clonedSelf, ref1;
          clonedSelf = Object.create(this);
          if (clonedSelf.isRoot) {
            clonedSelf.documentObject = null;
          }
          clonedSelf.attributes = {};
          ref1 = this.attributes;
          for (attName in ref1) {
            if (!hasProp.call(ref1, attName)) continue;
            att = ref1[attName];
            clonedSelf.attributes[attName] = att.clone();
          }
          clonedSelf.children = [];
          this.children.forEach(function(child) {
            var clonedChild;
            clonedChild = child.clone();
            clonedChild.parent = clonedSelf;
            return clonedSelf.children.push(clonedChild);
          });
          return clonedSelf;
        };
        XMLElement2.prototype.attribute = function(name2, value) {
          var attName, attValue;
          if (name2 != null) {
            name2 = name2.valueOf();
          }
          if (isObject2(name2)) {
            for (attName in name2) {
              if (!hasProp.call(name2, attName)) continue;
              attValue = name2[attName];
              this.attribute(attName, attValue);
            }
          } else {
            if (isFunction2(value)) {
              value = value.apply();
            }
            if (!this.options.skipNullAttributes || value != null) {
              this.attributes[name2] = new XMLAttribute(this, name2, value);
            }
          }
          return this;
        };
        XMLElement2.prototype.removeAttribute = function(name2) {
          var attName, i, len;
          if (name2 == null) {
            throw new Error("Missing attribute name");
          }
          name2 = name2.valueOf();
          if (Array.isArray(name2)) {
            for (i = 0, len = name2.length; i < len; i++) {
              attName = name2[i];
              delete this.attributes[attName];
            }
          } else {
            delete this.attributes[name2];
          }
          return this;
        };
        XMLElement2.prototype.toString = function(options) {
          return this.options.writer.set(options).element(this);
        };
        XMLElement2.prototype.att = function(name2, value) {
          return this.attribute(name2, value);
        };
        XMLElement2.prototype.a = function(name2, value) {
          return this.attribute(name2, value);
        };
        return XMLElement2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLCData.js
var require_XMLCData = __commonJS({
  "node_modules/xmlbuilder/lib/XMLCData.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLCData, XMLNode, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLNode = require_XMLNode();
      module2.exports = XMLCData = (function(superClass) {
        extend(XMLCData2, superClass);
        function XMLCData2(parent, text) {
          XMLCData2.__super__.constructor.call(this, parent);
          if (text == null) {
            throw new Error("Missing CDATA text");
          }
          this.text = this.stringify.cdata(text);
        }
        XMLCData2.prototype.clone = function() {
          return Object.create(this);
        };
        XMLCData2.prototype.toString = function(options) {
          return this.options.writer.set(options).cdata(this);
        };
        return XMLCData2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLComment.js
var require_XMLComment = __commonJS({
  "node_modules/xmlbuilder/lib/XMLComment.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLComment, XMLNode, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLNode = require_XMLNode();
      module2.exports = XMLComment = (function(superClass) {
        extend(XMLComment2, superClass);
        function XMLComment2(parent, text) {
          XMLComment2.__super__.constructor.call(this, parent);
          if (text == null) {
            throw new Error("Missing comment text");
          }
          this.text = this.stringify.comment(text);
        }
        XMLComment2.prototype.clone = function() {
          return Object.create(this);
        };
        XMLComment2.prototype.toString = function(options) {
          return this.options.writer.set(options).comment(this);
        };
        return XMLComment2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLDeclaration.js
var require_XMLDeclaration = __commonJS({
  "node_modules/xmlbuilder/lib/XMLDeclaration.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLDeclaration, XMLNode, isObject2, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      isObject2 = require_Utility().isObject;
      XMLNode = require_XMLNode();
      module2.exports = XMLDeclaration = (function(superClass) {
        extend(XMLDeclaration2, superClass);
        function XMLDeclaration2(parent, version3, encoding, standalone) {
          var ref;
          XMLDeclaration2.__super__.constructor.call(this, parent);
          if (isObject2(version3)) {
            ref = version3, version3 = ref.version, encoding = ref.encoding, standalone = ref.standalone;
          }
          if (!version3) {
            version3 = "1.0";
          }
          this.version = this.stringify.xmlVersion(version3);
          if (encoding != null) {
            this.encoding = this.stringify.xmlEncoding(encoding);
          }
          if (standalone != null) {
            this.standalone = this.stringify.xmlStandalone(standalone);
          }
        }
        XMLDeclaration2.prototype.toString = function(options) {
          return this.options.writer.set(options).declaration(this);
        };
        return XMLDeclaration2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLDTDAttList.js
var require_XMLDTDAttList = __commonJS({
  "node_modules/xmlbuilder/lib/XMLDTDAttList.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLDTDAttList, XMLNode, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLNode = require_XMLNode();
      module2.exports = XMLDTDAttList = (function(superClass) {
        extend(XMLDTDAttList2, superClass);
        function XMLDTDAttList2(parent, elementName, attributeName, attributeType, defaultValueType, defaultValue) {
          XMLDTDAttList2.__super__.constructor.call(this, parent);
          if (elementName == null) {
            throw new Error("Missing DTD element name");
          }
          if (attributeName == null) {
            throw new Error("Missing DTD attribute name");
          }
          if (!attributeType) {
            throw new Error("Missing DTD attribute type");
          }
          if (!defaultValueType) {
            throw new Error("Missing DTD attribute default");
          }
          if (defaultValueType.indexOf("#") !== 0) {
            defaultValueType = "#" + defaultValueType;
          }
          if (!defaultValueType.match(/^(#REQUIRED|#IMPLIED|#FIXED|#DEFAULT)$/)) {
            throw new Error("Invalid default value type; expected: #REQUIRED, #IMPLIED, #FIXED or #DEFAULT");
          }
          if (defaultValue && !defaultValueType.match(/^(#FIXED|#DEFAULT)$/)) {
            throw new Error("Default value only applies to #FIXED or #DEFAULT");
          }
          this.elementName = this.stringify.eleName(elementName);
          this.attributeName = this.stringify.attName(attributeName);
          this.attributeType = this.stringify.dtdAttType(attributeType);
          this.defaultValue = this.stringify.dtdAttDefault(defaultValue);
          this.defaultValueType = defaultValueType;
        }
        XMLDTDAttList2.prototype.toString = function(options) {
          return this.options.writer.set(options).dtdAttList(this);
        };
        return XMLDTDAttList2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLDTDEntity.js
var require_XMLDTDEntity = __commonJS({
  "node_modules/xmlbuilder/lib/XMLDTDEntity.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLDTDEntity, XMLNode, isObject2, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      isObject2 = require_Utility().isObject;
      XMLNode = require_XMLNode();
      module2.exports = XMLDTDEntity = (function(superClass) {
        extend(XMLDTDEntity2, superClass);
        function XMLDTDEntity2(parent, pe, name2, value) {
          XMLDTDEntity2.__super__.constructor.call(this, parent);
          if (name2 == null) {
            throw new Error("Missing entity name");
          }
          if (value == null) {
            throw new Error("Missing entity value");
          }
          this.pe = !!pe;
          this.name = this.stringify.eleName(name2);
          if (!isObject2(value)) {
            this.value = this.stringify.dtdEntityValue(value);
          } else {
            if (!value.pubID && !value.sysID) {
              throw new Error("Public and/or system identifiers are required for an external entity");
            }
            if (value.pubID && !value.sysID) {
              throw new Error("System identifier is required for a public external entity");
            }
            if (value.pubID != null) {
              this.pubID = this.stringify.dtdPubID(value.pubID);
            }
            if (value.sysID != null) {
              this.sysID = this.stringify.dtdSysID(value.sysID);
            }
            if (value.nData != null) {
              this.nData = this.stringify.dtdNData(value.nData);
            }
            if (this.pe && this.nData) {
              throw new Error("Notation declaration is not allowed in a parameter entity");
            }
          }
        }
        XMLDTDEntity2.prototype.toString = function(options) {
          return this.options.writer.set(options).dtdEntity(this);
        };
        return XMLDTDEntity2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLDTDElement.js
var require_XMLDTDElement = __commonJS({
  "node_modules/xmlbuilder/lib/XMLDTDElement.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLDTDElement, XMLNode, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLNode = require_XMLNode();
      module2.exports = XMLDTDElement = (function(superClass) {
        extend(XMLDTDElement2, superClass);
        function XMLDTDElement2(parent, name2, value) {
          XMLDTDElement2.__super__.constructor.call(this, parent);
          if (name2 == null) {
            throw new Error("Missing DTD element name");
          }
          if (!value) {
            value = "(#PCDATA)";
          }
          if (Array.isArray(value)) {
            value = "(" + value.join(",") + ")";
          }
          this.name = this.stringify.eleName(name2);
          this.value = this.stringify.dtdElementValue(value);
        }
        XMLDTDElement2.prototype.toString = function(options) {
          return this.options.writer.set(options).dtdElement(this);
        };
        return XMLDTDElement2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLDTDNotation.js
var require_XMLDTDNotation = __commonJS({
  "node_modules/xmlbuilder/lib/XMLDTDNotation.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLDTDNotation, XMLNode, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLNode = require_XMLNode();
      module2.exports = XMLDTDNotation = (function(superClass) {
        extend(XMLDTDNotation2, superClass);
        function XMLDTDNotation2(parent, name2, value) {
          XMLDTDNotation2.__super__.constructor.call(this, parent);
          if (name2 == null) {
            throw new Error("Missing notation name");
          }
          if (!value.pubID && !value.sysID) {
            throw new Error("Public or system identifiers are required for an external entity");
          }
          this.name = this.stringify.eleName(name2);
          if (value.pubID != null) {
            this.pubID = this.stringify.dtdPubID(value.pubID);
          }
          if (value.sysID != null) {
            this.sysID = this.stringify.dtdSysID(value.sysID);
          }
        }
        XMLDTDNotation2.prototype.toString = function(options) {
          return this.options.writer.set(options).dtdNotation(this);
        };
        return XMLDTDNotation2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLDocType.js
var require_XMLDocType = __commonJS({
  "node_modules/xmlbuilder/lib/XMLDocType.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDocType, XMLNode, isObject2, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      isObject2 = require_Utility().isObject;
      XMLNode = require_XMLNode();
      XMLDTDAttList = require_XMLDTDAttList();
      XMLDTDEntity = require_XMLDTDEntity();
      XMLDTDElement = require_XMLDTDElement();
      XMLDTDNotation = require_XMLDTDNotation();
      module2.exports = XMLDocType = (function(superClass) {
        extend(XMLDocType2, superClass);
        function XMLDocType2(parent, pubID, sysID) {
          var ref, ref1;
          XMLDocType2.__super__.constructor.call(this, parent);
          this.documentObject = parent;
          if (isObject2(pubID)) {
            ref = pubID, pubID = ref.pubID, sysID = ref.sysID;
          }
          if (sysID == null) {
            ref1 = [pubID, sysID], sysID = ref1[0], pubID = ref1[1];
          }
          if (pubID != null) {
            this.pubID = this.stringify.dtdPubID(pubID);
          }
          if (sysID != null) {
            this.sysID = this.stringify.dtdSysID(sysID);
          }
        }
        XMLDocType2.prototype.element = function(name2, value) {
          var child;
          child = new XMLDTDElement(this, name2, value);
          this.children.push(child);
          return this;
        };
        XMLDocType2.prototype.attList = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
          var child;
          child = new XMLDTDAttList(this, elementName, attributeName, attributeType, defaultValueType, defaultValue);
          this.children.push(child);
          return this;
        };
        XMLDocType2.prototype.entity = function(name2, value) {
          var child;
          child = new XMLDTDEntity(this, false, name2, value);
          this.children.push(child);
          return this;
        };
        XMLDocType2.prototype.pEntity = function(name2, value) {
          var child;
          child = new XMLDTDEntity(this, true, name2, value);
          this.children.push(child);
          return this;
        };
        XMLDocType2.prototype.notation = function(name2, value) {
          var child;
          child = new XMLDTDNotation(this, name2, value);
          this.children.push(child);
          return this;
        };
        XMLDocType2.prototype.toString = function(options) {
          return this.options.writer.set(options).docType(this);
        };
        XMLDocType2.prototype.ele = function(name2, value) {
          return this.element(name2, value);
        };
        XMLDocType2.prototype.att = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
          return this.attList(elementName, attributeName, attributeType, defaultValueType, defaultValue);
        };
        XMLDocType2.prototype.ent = function(name2, value) {
          return this.entity(name2, value);
        };
        XMLDocType2.prototype.pent = function(name2, value) {
          return this.pEntity(name2, value);
        };
        XMLDocType2.prototype.not = function(name2, value) {
          return this.notation(name2, value);
        };
        XMLDocType2.prototype.up = function() {
          return this.root() || this.documentObject;
        };
        return XMLDocType2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLRaw.js
var require_XMLRaw = __commonJS({
  "node_modules/xmlbuilder/lib/XMLRaw.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLNode, XMLRaw, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLNode = require_XMLNode();
      module2.exports = XMLRaw = (function(superClass) {
        extend(XMLRaw2, superClass);
        function XMLRaw2(parent, text) {
          XMLRaw2.__super__.constructor.call(this, parent);
          if (text == null) {
            throw new Error("Missing raw text");
          }
          this.value = this.stringify.raw(text);
        }
        XMLRaw2.prototype.clone = function() {
          return Object.create(this);
        };
        XMLRaw2.prototype.toString = function(options) {
          return this.options.writer.set(options).raw(this);
        };
        return XMLRaw2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLText.js
var require_XMLText = __commonJS({
  "node_modules/xmlbuilder/lib/XMLText.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLNode, XMLText, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLNode = require_XMLNode();
      module2.exports = XMLText = (function(superClass) {
        extend(XMLText2, superClass);
        function XMLText2(parent, text) {
          XMLText2.__super__.constructor.call(this, parent);
          if (text == null) {
            throw new Error("Missing element text");
          }
          this.value = this.stringify.eleText(text);
        }
        XMLText2.prototype.clone = function() {
          return Object.create(this);
        };
        XMLText2.prototype.toString = function(options) {
          return this.options.writer.set(options).text(this);
        };
        return XMLText2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLProcessingInstruction.js
var require_XMLProcessingInstruction = __commonJS({
  "node_modules/xmlbuilder/lib/XMLProcessingInstruction.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLNode, XMLProcessingInstruction, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLNode = require_XMLNode();
      module2.exports = XMLProcessingInstruction = (function(superClass) {
        extend(XMLProcessingInstruction2, superClass);
        function XMLProcessingInstruction2(parent, target, value) {
          XMLProcessingInstruction2.__super__.constructor.call(this, parent);
          if (target == null) {
            throw new Error("Missing instruction target");
          }
          this.target = this.stringify.insTarget(target);
          if (value) {
            this.value = this.stringify.insValue(value);
          }
        }
        XMLProcessingInstruction2.prototype.clone = function() {
          return Object.create(this);
        };
        XMLProcessingInstruction2.prototype.toString = function(options) {
          return this.options.writer.set(options).processingInstruction(this);
        };
        return XMLProcessingInstruction2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLNode.js
var require_XMLNode = __commonJS({
  "node_modules/xmlbuilder/lib/XMLNode.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLCData, XMLComment, XMLDeclaration, XMLDocType, XMLElement, XMLNode, XMLProcessingInstruction, XMLRaw, XMLText, isEmpty, isFunction2, isObject2, ref, hasProp = {}.hasOwnProperty;
      ref = require_Utility(), isObject2 = ref.isObject, isFunction2 = ref.isFunction, isEmpty = ref.isEmpty;
      XMLElement = null;
      XMLCData = null;
      XMLComment = null;
      XMLDeclaration = null;
      XMLDocType = null;
      XMLRaw = null;
      XMLText = null;
      XMLProcessingInstruction = null;
      module2.exports = XMLNode = (function() {
        function XMLNode2(parent) {
          this.parent = parent;
          if (this.parent) {
            this.options = this.parent.options;
            this.stringify = this.parent.stringify;
          }
          this.children = [];
          if (!XMLElement) {
            XMLElement = require_XMLElement();
            XMLCData = require_XMLCData();
            XMLComment = require_XMLComment();
            XMLDeclaration = require_XMLDeclaration();
            XMLDocType = require_XMLDocType();
            XMLRaw = require_XMLRaw();
            XMLText = require_XMLText();
            XMLProcessingInstruction = require_XMLProcessingInstruction();
          }
        }
        XMLNode2.prototype.element = function(name2, attributes, text) {
          var childNode, item, j, k, key, lastChild, len, len1, ref1, val;
          lastChild = null;
          if (attributes == null) {
            attributes = {};
          }
          attributes = attributes.valueOf();
          if (!isObject2(attributes)) {
            ref1 = [attributes, text], text = ref1[0], attributes = ref1[1];
          }
          if (name2 != null) {
            name2 = name2.valueOf();
          }
          if (Array.isArray(name2)) {
            for (j = 0, len = name2.length; j < len; j++) {
              item = name2[j];
              lastChild = this.element(item);
            }
          } else if (isFunction2(name2)) {
            lastChild = this.element(name2.apply());
          } else if (isObject2(name2)) {
            for (key in name2) {
              if (!hasProp.call(name2, key)) continue;
              val = name2[key];
              if (isFunction2(val)) {
                val = val.apply();
              }
              if (isObject2(val) && isEmpty(val)) {
                val = null;
              }
              if (!this.options.ignoreDecorators && this.stringify.convertAttKey && key.indexOf(this.stringify.convertAttKey) === 0) {
                lastChild = this.attribute(key.substr(this.stringify.convertAttKey.length), val);
              } else if (!this.options.separateArrayItems && Array.isArray(val)) {
                for (k = 0, len1 = val.length; k < len1; k++) {
                  item = val[k];
                  childNode = {};
                  childNode[key] = item;
                  lastChild = this.element(childNode);
                }
              } else if (isObject2(val)) {
                lastChild = this.element(key);
                lastChild.element(val);
              } else {
                lastChild = this.element(key, val);
              }
            }
          } else {
            if (!this.options.ignoreDecorators && this.stringify.convertTextKey && name2.indexOf(this.stringify.convertTextKey) === 0) {
              lastChild = this.text(text);
            } else if (!this.options.ignoreDecorators && this.stringify.convertCDataKey && name2.indexOf(this.stringify.convertCDataKey) === 0) {
              lastChild = this.cdata(text);
            } else if (!this.options.ignoreDecorators && this.stringify.convertCommentKey && name2.indexOf(this.stringify.convertCommentKey) === 0) {
              lastChild = this.comment(text);
            } else if (!this.options.ignoreDecorators && this.stringify.convertRawKey && name2.indexOf(this.stringify.convertRawKey) === 0) {
              lastChild = this.raw(text);
            } else if (!this.options.ignoreDecorators && this.stringify.convertPIKey && name2.indexOf(this.stringify.convertPIKey) === 0) {
              lastChild = this.instruction(name2.substr(this.stringify.convertPIKey.length), text);
            } else {
              lastChild = this.node(name2, attributes, text);
            }
          }
          if (lastChild == null) {
            throw new Error("Could not create any elements with: " + name2);
          }
          return lastChild;
        };
        XMLNode2.prototype.insertBefore = function(name2, attributes, text) {
          var child, i, removed;
          if (this.isRoot) {
            throw new Error("Cannot insert elements at root level");
          }
          i = this.parent.children.indexOf(this);
          removed = this.parent.children.splice(i);
          child = this.parent.element(name2, attributes, text);
          Array.prototype.push.apply(this.parent.children, removed);
          return child;
        };
        XMLNode2.prototype.insertAfter = function(name2, attributes, text) {
          var child, i, removed;
          if (this.isRoot) {
            throw new Error("Cannot insert elements at root level");
          }
          i = this.parent.children.indexOf(this);
          removed = this.parent.children.splice(i + 1);
          child = this.parent.element(name2, attributes, text);
          Array.prototype.push.apply(this.parent.children, removed);
          return child;
        };
        XMLNode2.prototype.remove = function() {
          var i, ref1;
          if (this.isRoot) {
            throw new Error("Cannot remove the root element");
          }
          i = this.parent.children.indexOf(this);
          [].splice.apply(this.parent.children, [i, i - i + 1].concat(ref1 = [])), ref1;
          return this.parent;
        };
        XMLNode2.prototype.node = function(name2, attributes, text) {
          var child, ref1;
          if (name2 != null) {
            name2 = name2.valueOf();
          }
          attributes || (attributes = {});
          attributes = attributes.valueOf();
          if (!isObject2(attributes)) {
            ref1 = [attributes, text], text = ref1[0], attributes = ref1[1];
          }
          child = new XMLElement(this, name2, attributes);
          if (text != null) {
            child.text(text);
          }
          this.children.push(child);
          return child;
        };
        XMLNode2.prototype.text = function(value) {
          var child;
          child = new XMLText(this, value);
          this.children.push(child);
          return this;
        };
        XMLNode2.prototype.cdata = function(value) {
          var child;
          child = new XMLCData(this, value);
          this.children.push(child);
          return this;
        };
        XMLNode2.prototype.comment = function(value) {
          var child;
          child = new XMLComment(this, value);
          this.children.push(child);
          return this;
        };
        XMLNode2.prototype.commentBefore = function(value) {
          var child, i, removed;
          i = this.parent.children.indexOf(this);
          removed = this.parent.children.splice(i);
          child = this.parent.comment(value);
          Array.prototype.push.apply(this.parent.children, removed);
          return this;
        };
        XMLNode2.prototype.commentAfter = function(value) {
          var child, i, removed;
          i = this.parent.children.indexOf(this);
          removed = this.parent.children.splice(i + 1);
          child = this.parent.comment(value);
          Array.prototype.push.apply(this.parent.children, removed);
          return this;
        };
        XMLNode2.prototype.raw = function(value) {
          var child;
          child = new XMLRaw(this, value);
          this.children.push(child);
          return this;
        };
        XMLNode2.prototype.instruction = function(target, value) {
          var insTarget, insValue, instruction, j, len;
          if (target != null) {
            target = target.valueOf();
          }
          if (value != null) {
            value = value.valueOf();
          }
          if (Array.isArray(target)) {
            for (j = 0, len = target.length; j < len; j++) {
              insTarget = target[j];
              this.instruction(insTarget);
            }
          } else if (isObject2(target)) {
            for (insTarget in target) {
              if (!hasProp.call(target, insTarget)) continue;
              insValue = target[insTarget];
              this.instruction(insTarget, insValue);
            }
          } else {
            if (isFunction2(value)) {
              value = value.apply();
            }
            instruction = new XMLProcessingInstruction(this, target, value);
            this.children.push(instruction);
          }
          return this;
        };
        XMLNode2.prototype.instructionBefore = function(target, value) {
          var child, i, removed;
          i = this.parent.children.indexOf(this);
          removed = this.parent.children.splice(i);
          child = this.parent.instruction(target, value);
          Array.prototype.push.apply(this.parent.children, removed);
          return this;
        };
        XMLNode2.prototype.instructionAfter = function(target, value) {
          var child, i, removed;
          i = this.parent.children.indexOf(this);
          removed = this.parent.children.splice(i + 1);
          child = this.parent.instruction(target, value);
          Array.prototype.push.apply(this.parent.children, removed);
          return this;
        };
        XMLNode2.prototype.declaration = function(version3, encoding, standalone) {
          var doc, xmldec;
          doc = this.document();
          xmldec = new XMLDeclaration(doc, version3, encoding, standalone);
          if (doc.children[0] instanceof XMLDeclaration) {
            doc.children[0] = xmldec;
          } else {
            doc.children.unshift(xmldec);
          }
          return doc.root() || doc;
        };
        XMLNode2.prototype.doctype = function(pubID, sysID) {
          var child, doc, doctype, i, j, k, len, len1, ref1, ref2;
          doc = this.document();
          doctype = new XMLDocType(doc, pubID, sysID);
          ref1 = doc.children;
          for (i = j = 0, len = ref1.length; j < len; i = ++j) {
            child = ref1[i];
            if (child instanceof XMLDocType) {
              doc.children[i] = doctype;
              return doctype;
            }
          }
          ref2 = doc.children;
          for (i = k = 0, len1 = ref2.length; k < len1; i = ++k) {
            child = ref2[i];
            if (child.isRoot) {
              doc.children.splice(i, 0, doctype);
              return doctype;
            }
          }
          doc.children.push(doctype);
          return doctype;
        };
        XMLNode2.prototype.up = function() {
          if (this.isRoot) {
            throw new Error("The root node has no parent. Use doc() if you need to get the document object.");
          }
          return this.parent;
        };
        XMLNode2.prototype.root = function() {
          var node;
          node = this;
          while (node) {
            if (node.isDocument) {
              return node.rootObject;
            } else if (node.isRoot) {
              return node;
            } else {
              node = node.parent;
            }
          }
        };
        XMLNode2.prototype.document = function() {
          var node;
          node = this;
          while (node) {
            if (node.isDocument) {
              return node;
            } else {
              node = node.parent;
            }
          }
        };
        XMLNode2.prototype.end = function(options) {
          return this.document().end(options);
        };
        XMLNode2.prototype.prev = function() {
          var i;
          i = this.parent.children.indexOf(this);
          if (i < 1) {
            throw new Error("Already at the first node");
          }
          return this.parent.children[i - 1];
        };
        XMLNode2.prototype.next = function() {
          var i;
          i = this.parent.children.indexOf(this);
          if (i === -1 || i === this.parent.children.length - 1) {
            throw new Error("Already at the last node");
          }
          return this.parent.children[i + 1];
        };
        XMLNode2.prototype.importDocument = function(doc) {
          var clonedRoot;
          clonedRoot = doc.root().clone();
          clonedRoot.parent = this;
          clonedRoot.isRoot = false;
          this.children.push(clonedRoot);
          return this;
        };
        XMLNode2.prototype.ele = function(name2, attributes, text) {
          return this.element(name2, attributes, text);
        };
        XMLNode2.prototype.nod = function(name2, attributes, text) {
          return this.node(name2, attributes, text);
        };
        XMLNode2.prototype.txt = function(value) {
          return this.text(value);
        };
        XMLNode2.prototype.dat = function(value) {
          return this.cdata(value);
        };
        XMLNode2.prototype.com = function(value) {
          return this.comment(value);
        };
        XMLNode2.prototype.ins = function(target, value) {
          return this.instruction(target, value);
        };
        XMLNode2.prototype.doc = function() {
          return this.document();
        };
        XMLNode2.prototype.dec = function(version3, encoding, standalone) {
          return this.declaration(version3, encoding, standalone);
        };
        XMLNode2.prototype.dtd = function(pubID, sysID) {
          return this.doctype(pubID, sysID);
        };
        XMLNode2.prototype.e = function(name2, attributes, text) {
          return this.element(name2, attributes, text);
        };
        XMLNode2.prototype.n = function(name2, attributes, text) {
          return this.node(name2, attributes, text);
        };
        XMLNode2.prototype.t = function(value) {
          return this.text(value);
        };
        XMLNode2.prototype.d = function(value) {
          return this.cdata(value);
        };
        XMLNode2.prototype.c = function(value) {
          return this.comment(value);
        };
        XMLNode2.prototype.r = function(value) {
          return this.raw(value);
        };
        XMLNode2.prototype.i = function(target, value) {
          return this.instruction(target, value);
        };
        XMLNode2.prototype.u = function() {
          return this.up();
        };
        XMLNode2.prototype.importXMLBuilder = function(doc) {
          return this.importDocument(doc);
        };
        return XMLNode2;
      })();
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLStringifier.js
var require_XMLStringifier = __commonJS({
  "node_modules/xmlbuilder/lib/XMLStringifier.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLStringifier, bind = function(fn, me) {
        return function() {
          return fn.apply(me, arguments);
        };
      }, hasProp = {}.hasOwnProperty;
      module2.exports = XMLStringifier = (function() {
        function XMLStringifier2(options) {
          this.assertLegalChar = bind(this.assertLegalChar, this);
          var key, ref, value;
          options || (options = {});
          this.noDoubleEncoding = options.noDoubleEncoding;
          ref = options.stringify || {};
          for (key in ref) {
            if (!hasProp.call(ref, key)) continue;
            value = ref[key];
            this[key] = value;
          }
        }
        XMLStringifier2.prototype.eleName = function(val) {
          val = "" + val || "";
          return this.assertLegalChar(val);
        };
        XMLStringifier2.prototype.eleText = function(val) {
          val = "" + val || "";
          return this.assertLegalChar(this.elEscape(val));
        };
        XMLStringifier2.prototype.cdata = function(val) {
          val = "" + val || "";
          val = val.replace("]]>", "]]]]><![CDATA[>");
          return this.assertLegalChar(val);
        };
        XMLStringifier2.prototype.comment = function(val) {
          val = "" + val || "";
          if (val.match(/--/)) {
            throw new Error("Comment text cannot contain double-hypen: " + val);
          }
          return this.assertLegalChar(val);
        };
        XMLStringifier2.prototype.raw = function(val) {
          return "" + val || "";
        };
        XMLStringifier2.prototype.attName = function(val) {
          return val = "" + val || "";
        };
        XMLStringifier2.prototype.attValue = function(val) {
          val = "" + val || "";
          return this.attEscape(val);
        };
        XMLStringifier2.prototype.insTarget = function(val) {
          return "" + val || "";
        };
        XMLStringifier2.prototype.insValue = function(val) {
          val = "" + val || "";
          if (val.match(/\?>/)) {
            throw new Error("Invalid processing instruction value: " + val);
          }
          return val;
        };
        XMLStringifier2.prototype.xmlVersion = function(val) {
          val = "" + val || "";
          if (!val.match(/1\.[0-9]+/)) {
            throw new Error("Invalid version number: " + val);
          }
          return val;
        };
        XMLStringifier2.prototype.xmlEncoding = function(val) {
          val = "" + val || "";
          if (!val.match(/^[A-Za-z](?:[A-Za-z0-9._-])*$/)) {
            throw new Error("Invalid encoding: " + val);
          }
          return val;
        };
        XMLStringifier2.prototype.xmlStandalone = function(val) {
          if (val) {
            return "yes";
          } else {
            return "no";
          }
        };
        XMLStringifier2.prototype.dtdPubID = function(val) {
          return "" + val || "";
        };
        XMLStringifier2.prototype.dtdSysID = function(val) {
          return "" + val || "";
        };
        XMLStringifier2.prototype.dtdElementValue = function(val) {
          return "" + val || "";
        };
        XMLStringifier2.prototype.dtdAttType = function(val) {
          return "" + val || "";
        };
        XMLStringifier2.prototype.dtdAttDefault = function(val) {
          if (val != null) {
            return "" + val || "";
          } else {
            return val;
          }
        };
        XMLStringifier2.prototype.dtdEntityValue = function(val) {
          return "" + val || "";
        };
        XMLStringifier2.prototype.dtdNData = function(val) {
          return "" + val || "";
        };
        XMLStringifier2.prototype.convertAttKey = "@";
        XMLStringifier2.prototype.convertPIKey = "?";
        XMLStringifier2.prototype.convertTextKey = "#text";
        XMLStringifier2.prototype.convertCDataKey = "#cdata";
        XMLStringifier2.prototype.convertCommentKey = "#comment";
        XMLStringifier2.prototype.convertRawKey = "#raw";
        XMLStringifier2.prototype.assertLegalChar = function(str) {
          var res;
          res = str.match(/[\0\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/);
          if (res) {
            throw new Error("Invalid character in string: " + str + " at index " + res.index);
          }
          return str;
        };
        XMLStringifier2.prototype.elEscape = function(str) {
          var ampregex;
          ampregex = this.noDoubleEncoding ? /(?!&\S+;)&/g : /&/g;
          return str.replace(ampregex, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r/g, "&#xD;");
        };
        XMLStringifier2.prototype.attEscape = function(str) {
          var ampregex;
          ampregex = this.noDoubleEncoding ? /(?!&\S+;)&/g : /&/g;
          return str.replace(ampregex, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/\t/g, "&#x9;").replace(/\n/g, "&#xA;").replace(/\r/g, "&#xD;");
        };
        return XMLStringifier2;
      })();
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLWriterBase.js
var require_XMLWriterBase = __commonJS({
  "node_modules/xmlbuilder/lib/XMLWriterBase.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLWriterBase, hasProp = {}.hasOwnProperty;
      module2.exports = XMLWriterBase = (function() {
        function XMLWriterBase2(options) {
          var key, ref, ref1, ref2, ref3, ref4, ref5, ref6, value;
          options || (options = {});
          this.pretty = options.pretty || false;
          this.allowEmpty = (ref = options.allowEmpty) != null ? ref : false;
          if (this.pretty) {
            this.indent = (ref1 = options.indent) != null ? ref1 : "  ";
            this.newline = (ref2 = options.newline) != null ? ref2 : "\n";
            this.offset = (ref3 = options.offset) != null ? ref3 : 0;
            this.dontprettytextnodes = (ref4 = options.dontprettytextnodes) != null ? ref4 : 0;
          } else {
            this.indent = "";
            this.newline = "";
            this.offset = 0;
            this.dontprettytextnodes = 0;
          }
          this.spacebeforeslash = (ref5 = options.spacebeforeslash) != null ? ref5 : "";
          if (this.spacebeforeslash === true) {
            this.spacebeforeslash = " ";
          }
          this.newlinedefault = this.newline;
          this.prettydefault = this.pretty;
          ref6 = options.writer || {};
          for (key in ref6) {
            if (!hasProp.call(ref6, key)) continue;
            value = ref6[key];
            this[key] = value;
          }
        }
        XMLWriterBase2.prototype.set = function(options) {
          var key, ref, value;
          options || (options = {});
          if ("pretty" in options) {
            this.pretty = options.pretty;
          }
          if ("allowEmpty" in options) {
            this.allowEmpty = options.allowEmpty;
          }
          if (this.pretty) {
            this.indent = "indent" in options ? options.indent : "  ";
            this.newline = "newline" in options ? options.newline : "\n";
            this.offset = "offset" in options ? options.offset : 0;
            this.dontprettytextnodes = "dontprettytextnodes" in options ? options.dontprettytextnodes : 0;
          } else {
            this.indent = "";
            this.newline = "";
            this.offset = 0;
            this.dontprettytextnodes = 0;
          }
          this.spacebeforeslash = "spacebeforeslash" in options ? options.spacebeforeslash : "";
          if (this.spacebeforeslash === true) {
            this.spacebeforeslash = " ";
          }
          this.newlinedefault = this.newline;
          this.prettydefault = this.pretty;
          ref = options.writer || {};
          for (key in ref) {
            if (!hasProp.call(ref, key)) continue;
            value = ref[key];
            this[key] = value;
          }
          return this;
        };
        XMLWriterBase2.prototype.space = function(level) {
          var indent;
          if (this.pretty) {
            indent = (level || 0) + this.offset + 1;
            if (indent > 0) {
              return new Array(indent).join(this.indent);
            } else {
              return "";
            }
          } else {
            return "";
          }
        };
        return XMLWriterBase2;
      })();
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLStringWriter.js
var require_XMLStringWriter = __commonJS({
  "node_modules/xmlbuilder/lib/XMLStringWriter.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDeclaration, XMLDocType, XMLElement, XMLProcessingInstruction, XMLRaw, XMLStringWriter, XMLText, XMLWriterBase, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLDeclaration = require_XMLDeclaration();
      XMLDocType = require_XMLDocType();
      XMLCData = require_XMLCData();
      XMLComment = require_XMLComment();
      XMLElement = require_XMLElement();
      XMLRaw = require_XMLRaw();
      XMLText = require_XMLText();
      XMLProcessingInstruction = require_XMLProcessingInstruction();
      XMLDTDAttList = require_XMLDTDAttList();
      XMLDTDElement = require_XMLDTDElement();
      XMLDTDEntity = require_XMLDTDEntity();
      XMLDTDNotation = require_XMLDTDNotation();
      XMLWriterBase = require_XMLWriterBase();
      module2.exports = XMLStringWriter = (function(superClass) {
        extend(XMLStringWriter2, superClass);
        function XMLStringWriter2(options) {
          XMLStringWriter2.__super__.constructor.call(this, options);
        }
        XMLStringWriter2.prototype.document = function(doc) {
          var child, i, len, r, ref;
          this.textispresent = false;
          r = "";
          ref = doc.children;
          for (i = 0, len = ref.length; i < len; i++) {
            child = ref[i];
            r += (function() {
              switch (false) {
                case !(child instanceof XMLDeclaration):
                  return this.declaration(child);
                case !(child instanceof XMLDocType):
                  return this.docType(child);
                case !(child instanceof XMLComment):
                  return this.comment(child);
                case !(child instanceof XMLProcessingInstruction):
                  return this.processingInstruction(child);
                default:
                  return this.element(child, 0);
              }
            }).call(this);
          }
          if (this.pretty && r.slice(-this.newline.length) === this.newline) {
            r = r.slice(0, -this.newline.length);
          }
          return r;
        };
        XMLStringWriter2.prototype.attribute = function(att) {
          return " " + att.name + '="' + att.value + '"';
        };
        XMLStringWriter2.prototype.cdata = function(node, level) {
          return this.space(level) + "<![CDATA[" + node.text + "]]>" + this.newline;
        };
        XMLStringWriter2.prototype.comment = function(node, level) {
          return this.space(level) + "<!-- " + node.text + " -->" + this.newline;
        };
        XMLStringWriter2.prototype.declaration = function(node, level) {
          var r;
          r = this.space(level);
          r += '<?xml version="' + node.version + '"';
          if (node.encoding != null) {
            r += ' encoding="' + node.encoding + '"';
          }
          if (node.standalone != null) {
            r += ' standalone="' + node.standalone + '"';
          }
          r += this.spacebeforeslash + "?>";
          r += this.newline;
          return r;
        };
        XMLStringWriter2.prototype.docType = function(node, level) {
          var child, i, len, r, ref;
          level || (level = 0);
          r = this.space(level);
          r += "<!DOCTYPE " + node.root().name;
          if (node.pubID && node.sysID) {
            r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
          } else if (node.sysID) {
            r += ' SYSTEM "' + node.sysID + '"';
          }
          if (node.children.length > 0) {
            r += " [";
            r += this.newline;
            ref = node.children;
            for (i = 0, len = ref.length; i < len; i++) {
              child = ref[i];
              r += (function() {
                switch (false) {
                  case !(child instanceof XMLDTDAttList):
                    return this.dtdAttList(child, level + 1);
                  case !(child instanceof XMLDTDElement):
                    return this.dtdElement(child, level + 1);
                  case !(child instanceof XMLDTDEntity):
                    return this.dtdEntity(child, level + 1);
                  case !(child instanceof XMLDTDNotation):
                    return this.dtdNotation(child, level + 1);
                  case !(child instanceof XMLCData):
                    return this.cdata(child, level + 1);
                  case !(child instanceof XMLComment):
                    return this.comment(child, level + 1);
                  case !(child instanceof XMLProcessingInstruction):
                    return this.processingInstruction(child, level + 1);
                  default:
                    throw new Error("Unknown DTD node type: " + child.constructor.name);
                }
              }).call(this);
            }
            r += "]";
          }
          r += this.spacebeforeslash + ">";
          r += this.newline;
          return r;
        };
        XMLStringWriter2.prototype.element = function(node, level) {
          var att, child, i, j, len, len1, name2, r, ref, ref1, ref2, space, textispresentwasset;
          level || (level = 0);
          textispresentwasset = false;
          if (this.textispresent) {
            this.newline = "";
            this.pretty = false;
          } else {
            this.newline = this.newlinedefault;
            this.pretty = this.prettydefault;
          }
          space = this.space(level);
          r = "";
          r += space + "<" + node.name;
          ref = node.attributes;
          for (name2 in ref) {
            if (!hasProp.call(ref, name2)) continue;
            att = ref[name2];
            r += this.attribute(att);
          }
          if (node.children.length === 0 || node.children.every(function(e) {
            return e.value === "";
          })) {
            if (this.allowEmpty) {
              r += "></" + node.name + ">" + this.newline;
            } else {
              r += this.spacebeforeslash + "/>" + this.newline;
            }
          } else if (this.pretty && node.children.length === 1 && node.children[0].value != null) {
            r += ">";
            r += node.children[0].value;
            r += "</" + node.name + ">" + this.newline;
          } else {
            if (this.dontprettytextnodes) {
              ref1 = node.children;
              for (i = 0, len = ref1.length; i < len; i++) {
                child = ref1[i];
                if (child.value != null) {
                  this.textispresent++;
                  textispresentwasset = true;
                  break;
                }
              }
            }
            if (this.textispresent) {
              this.newline = "";
              this.pretty = false;
              space = this.space(level);
            }
            r += ">" + this.newline;
            ref2 = node.children;
            for (j = 0, len1 = ref2.length; j < len1; j++) {
              child = ref2[j];
              r += (function() {
                switch (false) {
                  case !(child instanceof XMLCData):
                    return this.cdata(child, level + 1);
                  case !(child instanceof XMLComment):
                    return this.comment(child, level + 1);
                  case !(child instanceof XMLElement):
                    return this.element(child, level + 1);
                  case !(child instanceof XMLRaw):
                    return this.raw(child, level + 1);
                  case !(child instanceof XMLText):
                    return this.text(child, level + 1);
                  case !(child instanceof XMLProcessingInstruction):
                    return this.processingInstruction(child, level + 1);
                  default:
                    throw new Error("Unknown XML node type: " + child.constructor.name);
                }
              }).call(this);
            }
            if (textispresentwasset) {
              this.textispresent--;
            }
            if (!this.textispresent) {
              this.newline = this.newlinedefault;
              this.pretty = this.prettydefault;
            }
            r += space + "</" + node.name + ">" + this.newline;
          }
          return r;
        };
        XMLStringWriter2.prototype.processingInstruction = function(node, level) {
          var r;
          r = this.space(level) + "<?" + node.target;
          if (node.value) {
            r += " " + node.value;
          }
          r += this.spacebeforeslash + "?>" + this.newline;
          return r;
        };
        XMLStringWriter2.prototype.raw = function(node, level) {
          return this.space(level) + node.value + this.newline;
        };
        XMLStringWriter2.prototype.text = function(node, level) {
          return this.space(level) + node.value + this.newline;
        };
        XMLStringWriter2.prototype.dtdAttList = function(node, level) {
          var r;
          r = this.space(level) + "<!ATTLIST " + node.elementName + " " + node.attributeName + " " + node.attributeType;
          if (node.defaultValueType !== "#DEFAULT") {
            r += " " + node.defaultValueType;
          }
          if (node.defaultValue) {
            r += ' "' + node.defaultValue + '"';
          }
          r += this.spacebeforeslash + ">" + this.newline;
          return r;
        };
        XMLStringWriter2.prototype.dtdElement = function(node, level) {
          return this.space(level) + "<!ELEMENT " + node.name + " " + node.value + this.spacebeforeslash + ">" + this.newline;
        };
        XMLStringWriter2.prototype.dtdEntity = function(node, level) {
          var r;
          r = this.space(level) + "<!ENTITY";
          if (node.pe) {
            r += " %";
          }
          r += " " + node.name;
          if (node.value) {
            r += ' "' + node.value + '"';
          } else {
            if (node.pubID && node.sysID) {
              r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
            } else if (node.sysID) {
              r += ' SYSTEM "' + node.sysID + '"';
            }
            if (node.nData) {
              r += " NDATA " + node.nData;
            }
          }
          r += this.spacebeforeslash + ">" + this.newline;
          return r;
        };
        XMLStringWriter2.prototype.dtdNotation = function(node, level) {
          var r;
          r = this.space(level) + "<!NOTATION " + node.name;
          if (node.pubID && node.sysID) {
            r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
          } else if (node.pubID) {
            r += ' PUBLIC "' + node.pubID + '"';
          } else if (node.sysID) {
            r += ' SYSTEM "' + node.sysID + '"';
          }
          r += this.spacebeforeslash + ">" + this.newline;
          return r;
        };
        XMLStringWriter2.prototype.openNode = function(node, level) {
          var att, name2, r, ref;
          level || (level = 0);
          if (node instanceof XMLElement) {
            r = this.space(level) + "<" + node.name;
            ref = node.attributes;
            for (name2 in ref) {
              if (!hasProp.call(ref, name2)) continue;
              att = ref[name2];
              r += this.attribute(att);
            }
            r += (node.children ? ">" : "/>") + this.newline;
            return r;
          } else {
            r = this.space(level) + "<!DOCTYPE " + node.rootNodeName;
            if (node.pubID && node.sysID) {
              r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
            } else if (node.sysID) {
              r += ' SYSTEM "' + node.sysID + '"';
            }
            r += (node.children ? " [" : ">") + this.newline;
            return r;
          }
        };
        XMLStringWriter2.prototype.closeNode = function(node, level) {
          level || (level = 0);
          switch (false) {
            case !(node instanceof XMLElement):
              return this.space(level) + "</" + node.name + ">" + this.newline;
            case !(node instanceof XMLDocType):
              return this.space(level) + "]>" + this.newline;
          }
        };
        return XMLStringWriter2;
      })(XMLWriterBase);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLDocument.js
var require_XMLDocument = __commonJS({
  "node_modules/xmlbuilder/lib/XMLDocument.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLDocument, XMLNode, XMLStringWriter, XMLStringifier, isPlainObject, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      isPlainObject = require_Utility().isPlainObject;
      XMLNode = require_XMLNode();
      XMLStringifier = require_XMLStringifier();
      XMLStringWriter = require_XMLStringWriter();
      module2.exports = XMLDocument = (function(superClass) {
        extend(XMLDocument2, superClass);
        function XMLDocument2(options) {
          XMLDocument2.__super__.constructor.call(this, null);
          options || (options = {});
          if (!options.writer) {
            options.writer = new XMLStringWriter();
          }
          this.options = options;
          this.stringify = new XMLStringifier(options);
          this.isDocument = true;
        }
        XMLDocument2.prototype.end = function(writer) {
          var writerOptions;
          if (!writer) {
            writer = this.options.writer;
          } else if (isPlainObject(writer)) {
            writerOptions = writer;
            writer = this.options.writer.set(writerOptions);
          }
          return writer.document(this);
        };
        XMLDocument2.prototype.toString = function(options) {
          return this.options.writer.set(options).document(this);
        };
        return XMLDocument2;
      })(XMLNode);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLDocumentCB.js
var require_XMLDocumentCB = __commonJS({
  "node_modules/xmlbuilder/lib/XMLDocumentCB.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLAttribute, XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDeclaration, XMLDocType, XMLDocumentCB, XMLElement, XMLProcessingInstruction, XMLRaw, XMLStringWriter, XMLStringifier, XMLText, isFunction2, isObject2, isPlainObject, ref, hasProp = {}.hasOwnProperty;
      ref = require_Utility(), isObject2 = ref.isObject, isFunction2 = ref.isFunction, isPlainObject = ref.isPlainObject;
      XMLElement = require_XMLElement();
      XMLCData = require_XMLCData();
      XMLComment = require_XMLComment();
      XMLRaw = require_XMLRaw();
      XMLText = require_XMLText();
      XMLProcessingInstruction = require_XMLProcessingInstruction();
      XMLDeclaration = require_XMLDeclaration();
      XMLDocType = require_XMLDocType();
      XMLDTDAttList = require_XMLDTDAttList();
      XMLDTDEntity = require_XMLDTDEntity();
      XMLDTDElement = require_XMLDTDElement();
      XMLDTDNotation = require_XMLDTDNotation();
      XMLAttribute = require_XMLAttribute();
      XMLStringifier = require_XMLStringifier();
      XMLStringWriter = require_XMLStringWriter();
      module2.exports = XMLDocumentCB = (function() {
        function XMLDocumentCB2(options, onData, onEnd) {
          var writerOptions;
          options || (options = {});
          if (!options.writer) {
            options.writer = new XMLStringWriter(options);
          } else if (isPlainObject(options.writer)) {
            writerOptions = options.writer;
            options.writer = new XMLStringWriter(writerOptions);
          }
          this.options = options;
          this.writer = options.writer;
          this.stringify = new XMLStringifier(options);
          this.onDataCallback = onData || function() {
          };
          this.onEndCallback = onEnd || function() {
          };
          this.currentNode = null;
          this.currentLevel = -1;
          this.openTags = {};
          this.documentStarted = false;
          this.documentCompleted = false;
          this.root = null;
        }
        XMLDocumentCB2.prototype.node = function(name2, attributes, text) {
          var ref1;
          if (name2 == null) {
            throw new Error("Missing node name");
          }
          if (this.root && this.currentLevel === -1) {
            throw new Error("Document can only have one root node");
          }
          this.openCurrent();
          name2 = name2.valueOf();
          if (attributes == null) {
            attributes = {};
          }
          attributes = attributes.valueOf();
          if (!isObject2(attributes)) {
            ref1 = [attributes, text], text = ref1[0], attributes = ref1[1];
          }
          this.currentNode = new XMLElement(this, name2, attributes);
          this.currentNode.children = false;
          this.currentLevel++;
          this.openTags[this.currentLevel] = this.currentNode;
          if (text != null) {
            this.text(text);
          }
          return this;
        };
        XMLDocumentCB2.prototype.element = function(name2, attributes, text) {
          if (this.currentNode && this.currentNode instanceof XMLDocType) {
            return this.dtdElement.apply(this, arguments);
          } else {
            return this.node(name2, attributes, text);
          }
        };
        XMLDocumentCB2.prototype.attribute = function(name2, value) {
          var attName, attValue;
          if (!this.currentNode || this.currentNode.children) {
            throw new Error("att() can only be used immediately after an ele() call in callback mode");
          }
          if (name2 != null) {
            name2 = name2.valueOf();
          }
          if (isObject2(name2)) {
            for (attName in name2) {
              if (!hasProp.call(name2, attName)) continue;
              attValue = name2[attName];
              this.attribute(attName, attValue);
            }
          } else {
            if (isFunction2(value)) {
              value = value.apply();
            }
            if (!this.options.skipNullAttributes || value != null) {
              this.currentNode.attributes[name2] = new XMLAttribute(this, name2, value);
            }
          }
          return this;
        };
        XMLDocumentCB2.prototype.text = function(value) {
          var node;
          this.openCurrent();
          node = new XMLText(this, value);
          this.onData(this.writer.text(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.cdata = function(value) {
          var node;
          this.openCurrent();
          node = new XMLCData(this, value);
          this.onData(this.writer.cdata(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.comment = function(value) {
          var node;
          this.openCurrent();
          node = new XMLComment(this, value);
          this.onData(this.writer.comment(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.raw = function(value) {
          var node;
          this.openCurrent();
          node = new XMLRaw(this, value);
          this.onData(this.writer.raw(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.instruction = function(target, value) {
          var i, insTarget, insValue, len, node;
          this.openCurrent();
          if (target != null) {
            target = target.valueOf();
          }
          if (value != null) {
            value = value.valueOf();
          }
          if (Array.isArray(target)) {
            for (i = 0, len = target.length; i < len; i++) {
              insTarget = target[i];
              this.instruction(insTarget);
            }
          } else if (isObject2(target)) {
            for (insTarget in target) {
              if (!hasProp.call(target, insTarget)) continue;
              insValue = target[insTarget];
              this.instruction(insTarget, insValue);
            }
          } else {
            if (isFunction2(value)) {
              value = value.apply();
            }
            node = new XMLProcessingInstruction(this, target, value);
            this.onData(this.writer.processingInstruction(node, this.currentLevel + 1));
          }
          return this;
        };
        XMLDocumentCB2.prototype.declaration = function(version3, encoding, standalone) {
          var node;
          this.openCurrent();
          if (this.documentStarted) {
            throw new Error("declaration() must be the first node");
          }
          node = new XMLDeclaration(this, version3, encoding, standalone);
          this.onData(this.writer.declaration(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.doctype = function(root, pubID, sysID) {
          this.openCurrent();
          if (root == null) {
            throw new Error("Missing root node name");
          }
          if (this.root) {
            throw new Error("dtd() must come before the root node");
          }
          this.currentNode = new XMLDocType(this, pubID, sysID);
          this.currentNode.rootNodeName = root;
          this.currentNode.children = false;
          this.currentLevel++;
          this.openTags[this.currentLevel] = this.currentNode;
          return this;
        };
        XMLDocumentCB2.prototype.dtdElement = function(name2, value) {
          var node;
          this.openCurrent();
          node = new XMLDTDElement(this, name2, value);
          this.onData(this.writer.dtdElement(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.attList = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
          var node;
          this.openCurrent();
          node = new XMLDTDAttList(this, elementName, attributeName, attributeType, defaultValueType, defaultValue);
          this.onData(this.writer.dtdAttList(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.entity = function(name2, value) {
          var node;
          this.openCurrent();
          node = new XMLDTDEntity(this, false, name2, value);
          this.onData(this.writer.dtdEntity(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.pEntity = function(name2, value) {
          var node;
          this.openCurrent();
          node = new XMLDTDEntity(this, true, name2, value);
          this.onData(this.writer.dtdEntity(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.notation = function(name2, value) {
          var node;
          this.openCurrent();
          node = new XMLDTDNotation(this, name2, value);
          this.onData(this.writer.dtdNotation(node, this.currentLevel + 1));
          return this;
        };
        XMLDocumentCB2.prototype.up = function() {
          if (this.currentLevel < 0) {
            throw new Error("The document node has no parent");
          }
          if (this.currentNode) {
            if (this.currentNode.children) {
              this.closeNode(this.currentNode);
            } else {
              this.openNode(this.currentNode);
            }
            this.currentNode = null;
          } else {
            this.closeNode(this.openTags[this.currentLevel]);
          }
          delete this.openTags[this.currentLevel];
          this.currentLevel--;
          return this;
        };
        XMLDocumentCB2.prototype.end = function() {
          while (this.currentLevel >= 0) {
            this.up();
          }
          return this.onEnd();
        };
        XMLDocumentCB2.prototype.openCurrent = function() {
          if (this.currentNode) {
            this.currentNode.children = true;
            return this.openNode(this.currentNode);
          }
        };
        XMLDocumentCB2.prototype.openNode = function(node) {
          if (!node.isOpen) {
            if (!this.root && this.currentLevel === 0 && node instanceof XMLElement) {
              this.root = node;
            }
            this.onData(this.writer.openNode(node, this.currentLevel));
            return node.isOpen = true;
          }
        };
        XMLDocumentCB2.prototype.closeNode = function(node) {
          if (!node.isClosed) {
            this.onData(this.writer.closeNode(node, this.currentLevel));
            return node.isClosed = true;
          }
        };
        XMLDocumentCB2.prototype.onData = function(chunk) {
          this.documentStarted = true;
          return this.onDataCallback(chunk);
        };
        XMLDocumentCB2.prototype.onEnd = function() {
          this.documentCompleted = true;
          return this.onEndCallback();
        };
        XMLDocumentCB2.prototype.ele = function() {
          return this.element.apply(this, arguments);
        };
        XMLDocumentCB2.prototype.nod = function(name2, attributes, text) {
          return this.node(name2, attributes, text);
        };
        XMLDocumentCB2.prototype.txt = function(value) {
          return this.text(value);
        };
        XMLDocumentCB2.prototype.dat = function(value) {
          return this.cdata(value);
        };
        XMLDocumentCB2.prototype.com = function(value) {
          return this.comment(value);
        };
        XMLDocumentCB2.prototype.ins = function(target, value) {
          return this.instruction(target, value);
        };
        XMLDocumentCB2.prototype.dec = function(version3, encoding, standalone) {
          return this.declaration(version3, encoding, standalone);
        };
        XMLDocumentCB2.prototype.dtd = function(root, pubID, sysID) {
          return this.doctype(root, pubID, sysID);
        };
        XMLDocumentCB2.prototype.e = function(name2, attributes, text) {
          return this.element(name2, attributes, text);
        };
        XMLDocumentCB2.prototype.n = function(name2, attributes, text) {
          return this.node(name2, attributes, text);
        };
        XMLDocumentCB2.prototype.t = function(value) {
          return this.text(value);
        };
        XMLDocumentCB2.prototype.d = function(value) {
          return this.cdata(value);
        };
        XMLDocumentCB2.prototype.c = function(value) {
          return this.comment(value);
        };
        XMLDocumentCB2.prototype.r = function(value) {
          return this.raw(value);
        };
        XMLDocumentCB2.prototype.i = function(target, value) {
          return this.instruction(target, value);
        };
        XMLDocumentCB2.prototype.att = function() {
          if (this.currentNode && this.currentNode instanceof XMLDocType) {
            return this.attList.apply(this, arguments);
          } else {
            return this.attribute.apply(this, arguments);
          }
        };
        XMLDocumentCB2.prototype.a = function() {
          if (this.currentNode && this.currentNode instanceof XMLDocType) {
            return this.attList.apply(this, arguments);
          } else {
            return this.attribute.apply(this, arguments);
          }
        };
        XMLDocumentCB2.prototype.ent = function(name2, value) {
          return this.entity(name2, value);
        };
        XMLDocumentCB2.prototype.pent = function(name2, value) {
          return this.pEntity(name2, value);
        };
        XMLDocumentCB2.prototype.not = function(name2, value) {
          return this.notation(name2, value);
        };
        return XMLDocumentCB2;
      })();
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/XMLStreamWriter.js
var require_XMLStreamWriter = __commonJS({
  "node_modules/xmlbuilder/lib/XMLStreamWriter.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDeclaration, XMLDocType, XMLElement, XMLProcessingInstruction, XMLRaw, XMLStreamWriter, XMLText, XMLWriterBase, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      XMLDeclaration = require_XMLDeclaration();
      XMLDocType = require_XMLDocType();
      XMLCData = require_XMLCData();
      XMLComment = require_XMLComment();
      XMLElement = require_XMLElement();
      XMLRaw = require_XMLRaw();
      XMLText = require_XMLText();
      XMLProcessingInstruction = require_XMLProcessingInstruction();
      XMLDTDAttList = require_XMLDTDAttList();
      XMLDTDElement = require_XMLDTDElement();
      XMLDTDEntity = require_XMLDTDEntity();
      XMLDTDNotation = require_XMLDTDNotation();
      XMLWriterBase = require_XMLWriterBase();
      module2.exports = XMLStreamWriter = (function(superClass) {
        extend(XMLStreamWriter2, superClass);
        function XMLStreamWriter2(stream, options) {
          XMLStreamWriter2.__super__.constructor.call(this, options);
          this.stream = stream;
        }
        XMLStreamWriter2.prototype.document = function(doc) {
          var child, i, j, len, len1, ref, ref1, results;
          ref = doc.children;
          for (i = 0, len = ref.length; i < len; i++) {
            child = ref[i];
            child.isLastRootNode = false;
          }
          doc.children[doc.children.length - 1].isLastRootNode = true;
          ref1 = doc.children;
          results = [];
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            child = ref1[j];
            switch (false) {
              case !(child instanceof XMLDeclaration):
                results.push(this.declaration(child));
                break;
              case !(child instanceof XMLDocType):
                results.push(this.docType(child));
                break;
              case !(child instanceof XMLComment):
                results.push(this.comment(child));
                break;
              case !(child instanceof XMLProcessingInstruction):
                results.push(this.processingInstruction(child));
                break;
              default:
                results.push(this.element(child));
            }
          }
          return results;
        };
        XMLStreamWriter2.prototype.attribute = function(att) {
          return this.stream.write(" " + att.name + '="' + att.value + '"');
        };
        XMLStreamWriter2.prototype.cdata = function(node, level) {
          return this.stream.write(this.space(level) + "<![CDATA[" + node.text + "]]>" + this.endline(node));
        };
        XMLStreamWriter2.prototype.comment = function(node, level) {
          return this.stream.write(this.space(level) + "<!-- " + node.text + " -->" + this.endline(node));
        };
        XMLStreamWriter2.prototype.declaration = function(node, level) {
          this.stream.write(this.space(level));
          this.stream.write('<?xml version="' + node.version + '"');
          if (node.encoding != null) {
            this.stream.write(' encoding="' + node.encoding + '"');
          }
          if (node.standalone != null) {
            this.stream.write(' standalone="' + node.standalone + '"');
          }
          this.stream.write(this.spacebeforeslash + "?>");
          return this.stream.write(this.endline(node));
        };
        XMLStreamWriter2.prototype.docType = function(node, level) {
          var child, i, len, ref;
          level || (level = 0);
          this.stream.write(this.space(level));
          this.stream.write("<!DOCTYPE " + node.root().name);
          if (node.pubID && node.sysID) {
            this.stream.write(' PUBLIC "' + node.pubID + '" "' + node.sysID + '"');
          } else if (node.sysID) {
            this.stream.write(' SYSTEM "' + node.sysID + '"');
          }
          if (node.children.length > 0) {
            this.stream.write(" [");
            this.stream.write(this.endline(node));
            ref = node.children;
            for (i = 0, len = ref.length; i < len; i++) {
              child = ref[i];
              switch (false) {
                case !(child instanceof XMLDTDAttList):
                  this.dtdAttList(child, level + 1);
                  break;
                case !(child instanceof XMLDTDElement):
                  this.dtdElement(child, level + 1);
                  break;
                case !(child instanceof XMLDTDEntity):
                  this.dtdEntity(child, level + 1);
                  break;
                case !(child instanceof XMLDTDNotation):
                  this.dtdNotation(child, level + 1);
                  break;
                case !(child instanceof XMLCData):
                  this.cdata(child, level + 1);
                  break;
                case !(child instanceof XMLComment):
                  this.comment(child, level + 1);
                  break;
                case !(child instanceof XMLProcessingInstruction):
                  this.processingInstruction(child, level + 1);
                  break;
                default:
                  throw new Error("Unknown DTD node type: " + child.constructor.name);
              }
            }
            this.stream.write("]");
          }
          this.stream.write(this.spacebeforeslash + ">");
          return this.stream.write(this.endline(node));
        };
        XMLStreamWriter2.prototype.element = function(node, level) {
          var att, child, i, len, name2, ref, ref1, space;
          level || (level = 0);
          space = this.space(level);
          this.stream.write(space + "<" + node.name);
          ref = node.attributes;
          for (name2 in ref) {
            if (!hasProp.call(ref, name2)) continue;
            att = ref[name2];
            this.attribute(att);
          }
          if (node.children.length === 0 || node.children.every(function(e) {
            return e.value === "";
          })) {
            if (this.allowEmpty) {
              this.stream.write("></" + node.name + ">");
            } else {
              this.stream.write(this.spacebeforeslash + "/>");
            }
          } else if (this.pretty && node.children.length === 1 && node.children[0].value != null) {
            this.stream.write(">");
            this.stream.write(node.children[0].value);
            this.stream.write("</" + node.name + ">");
          } else {
            this.stream.write(">" + this.newline);
            ref1 = node.children;
            for (i = 0, len = ref1.length; i < len; i++) {
              child = ref1[i];
              switch (false) {
                case !(child instanceof XMLCData):
                  this.cdata(child, level + 1);
                  break;
                case !(child instanceof XMLComment):
                  this.comment(child, level + 1);
                  break;
                case !(child instanceof XMLElement):
                  this.element(child, level + 1);
                  break;
                case !(child instanceof XMLRaw):
                  this.raw(child, level + 1);
                  break;
                case !(child instanceof XMLText):
                  this.text(child, level + 1);
                  break;
                case !(child instanceof XMLProcessingInstruction):
                  this.processingInstruction(child, level + 1);
                  break;
                default:
                  throw new Error("Unknown XML node type: " + child.constructor.name);
              }
            }
            this.stream.write(space + "</" + node.name + ">");
          }
          return this.stream.write(this.endline(node));
        };
        XMLStreamWriter2.prototype.processingInstruction = function(node, level) {
          this.stream.write(this.space(level) + "<?" + node.target);
          if (node.value) {
            this.stream.write(" " + node.value);
          }
          return this.stream.write(this.spacebeforeslash + "?>" + this.endline(node));
        };
        XMLStreamWriter2.prototype.raw = function(node, level) {
          return this.stream.write(this.space(level) + node.value + this.endline(node));
        };
        XMLStreamWriter2.prototype.text = function(node, level) {
          return this.stream.write(this.space(level) + node.value + this.endline(node));
        };
        XMLStreamWriter2.prototype.dtdAttList = function(node, level) {
          this.stream.write(this.space(level) + "<!ATTLIST " + node.elementName + " " + node.attributeName + " " + node.attributeType);
          if (node.defaultValueType !== "#DEFAULT") {
            this.stream.write(" " + node.defaultValueType);
          }
          if (node.defaultValue) {
            this.stream.write(' "' + node.defaultValue + '"');
          }
          return this.stream.write(this.spacebeforeslash + ">" + this.endline(node));
        };
        XMLStreamWriter2.prototype.dtdElement = function(node, level) {
          this.stream.write(this.space(level) + "<!ELEMENT " + node.name + " " + node.value);
          return this.stream.write(this.spacebeforeslash + ">" + this.endline(node));
        };
        XMLStreamWriter2.prototype.dtdEntity = function(node, level) {
          this.stream.write(this.space(level) + "<!ENTITY");
          if (node.pe) {
            this.stream.write(" %");
          }
          this.stream.write(" " + node.name);
          if (node.value) {
            this.stream.write(' "' + node.value + '"');
          } else {
            if (node.pubID && node.sysID) {
              this.stream.write(' PUBLIC "' + node.pubID + '" "' + node.sysID + '"');
            } else if (node.sysID) {
              this.stream.write(' SYSTEM "' + node.sysID + '"');
            }
            if (node.nData) {
              this.stream.write(" NDATA " + node.nData);
            }
          }
          return this.stream.write(this.spacebeforeslash + ">" + this.endline(node));
        };
        XMLStreamWriter2.prototype.dtdNotation = function(node, level) {
          this.stream.write(this.space(level) + "<!NOTATION " + node.name);
          if (node.pubID && node.sysID) {
            this.stream.write(' PUBLIC "' + node.pubID + '" "' + node.sysID + '"');
          } else if (node.pubID) {
            this.stream.write(' PUBLIC "' + node.pubID + '"');
          } else if (node.sysID) {
            this.stream.write(' SYSTEM "' + node.sysID + '"');
          }
          return this.stream.write(this.spacebeforeslash + ">" + this.endline(node));
        };
        XMLStreamWriter2.prototype.endline = function(node) {
          if (!node.isLastRootNode) {
            return this.newline;
          } else {
            return "";
          }
        };
        return XMLStreamWriter2;
      })(XMLWriterBase);
    }).call(exports11);
  }
});

// node_modules/xmlbuilder/lib/index.js
var require_lib = __commonJS({
  "node_modules/xmlbuilder/lib/index.js"(exports11, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      var XMLDocument, XMLDocumentCB, XMLStreamWriter, XMLStringWriter, assign, isFunction2, ref;
      ref = require_Utility(), assign = ref.assign, isFunction2 = ref.isFunction;
      XMLDocument = require_XMLDocument();
      XMLDocumentCB = require_XMLDocumentCB();
      XMLStringWriter = require_XMLStringWriter();
      XMLStreamWriter = require_XMLStreamWriter();
      module2.exports.create = function(name2, xmldec, doctype, options) {
        var doc, root;
        if (name2 == null) {
          throw new Error("Root element needs a name");
        }
        options = assign({}, xmldec, doctype, options);
        doc = new XMLDocument(options);
        root = doc.element(name2);
        if (!options.headless) {
          doc.declaration(options);
          if (options.pubID != null || options.sysID != null) {
            doc.doctype(options);
          }
        }
        return root;
      };
      module2.exports.begin = function(options, onData, onEnd) {
        var ref1;
        if (isFunction2(options)) {
          ref1 = [options, onData], onData = ref1[0], onEnd = ref1[1];
          options = {};
        }
        if (onData) {
          return new XMLDocumentCB(options, onData, onEnd);
        } else {
          return new XMLDocument(options);
        }
      };
      module2.exports.stringWriter = function(options) {
        return new XMLStringWriter(options);
      };
      module2.exports.streamWriter = function(stream, options) {
        return new XMLStreamWriter(stream, options);
      };
    }).call(exports11);
  }
});

// node_modules/xml2js/lib/builder.js
var require_builder = __commonJS({
  "node_modules/xml2js/lib/builder.js"(exports11) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      "use strict";
      var builder, defaults, escapeCDATA, requiresCDATA, wrapCDATA, hasProp = {}.hasOwnProperty;
      builder = require_lib();
      defaults = require_defaults().defaults;
      requiresCDATA = function(entry) {
        return typeof entry === "string" && (entry.indexOf("&") >= 0 || entry.indexOf(">") >= 0 || entry.indexOf("<") >= 0);
      };
      wrapCDATA = function(entry) {
        return "<![CDATA[" + escapeCDATA(entry) + "]]>";
      };
      escapeCDATA = function(entry) {
        return entry.replace("]]>", "]]]]><![CDATA[>");
      };
      exports11.Builder = (function() {
        function Builder(opts) {
          var key, ref, value;
          this.options = {};
          ref = defaults["0.2"];
          for (key in ref) {
            if (!hasProp.call(ref, key)) continue;
            value = ref[key];
            this.options[key] = value;
          }
          for (key in opts) {
            if (!hasProp.call(opts, key)) continue;
            value = opts[key];
            this.options[key] = value;
          }
        }
        Builder.prototype.buildObject = function(rootObj) {
          var attrkey, charkey, render, rootElement, rootName;
          attrkey = this.options.attrkey;
          charkey = this.options.charkey;
          if (Object.keys(rootObj).length === 1 && this.options.rootName === defaults["0.2"].rootName) {
            rootName = Object.keys(rootObj)[0];
            rootObj = rootObj[rootName];
          } else {
            rootName = this.options.rootName;
          }
          render = /* @__PURE__ */ (function(_this) {
            return function(element, obj) {
              var attr, child, entry, index, key, value;
              if (typeof obj !== "object") {
                if (_this.options.cdata && requiresCDATA(obj)) {
                  element.raw(wrapCDATA(obj));
                } else {
                  element.txt(obj);
                }
              } else if (Array.isArray(obj)) {
                for (index in obj) {
                  if (!hasProp.call(obj, index)) continue;
                  child = obj[index];
                  for (key in child) {
                    entry = child[key];
                    element = render(element.ele(key), entry).up();
                  }
                }
              } else {
                for (key in obj) {
                  if (!hasProp.call(obj, key)) continue;
                  child = obj[key];
                  if (key === attrkey) {
                    if (typeof child === "object") {
                      for (attr in child) {
                        value = child[attr];
                        element = element.att(attr, value);
                      }
                    }
                  } else if (key === charkey) {
                    if (_this.options.cdata && requiresCDATA(child)) {
                      element = element.raw(wrapCDATA(child));
                    } else {
                      element = element.txt(child);
                    }
                  } else if (Array.isArray(child)) {
                    for (index in child) {
                      if (!hasProp.call(child, index)) continue;
                      entry = child[index];
                      if (typeof entry === "string") {
                        if (_this.options.cdata && requiresCDATA(entry)) {
                          element = element.ele(key).raw(wrapCDATA(entry)).up();
                        } else {
                          element = element.ele(key, entry).up();
                        }
                      } else {
                        element = render(element.ele(key), entry).up();
                      }
                    }
                  } else if (typeof child === "object") {
                    element = render(element.ele(key), child).up();
                  } else {
                    if (typeof child === "string" && _this.options.cdata && requiresCDATA(child)) {
                      element = element.ele(key).raw(wrapCDATA(child)).up();
                    } else {
                      if (child == null) {
                        child = "";
                      }
                      element = element.ele(key, child.toString()).up();
                    }
                  }
                }
              }
              return element;
            };
          })(this);
          rootElement = builder.create(rootName, this.options.xmldec, this.options.doctype, {
            headless: this.options.headless,
            allowSurrogateChars: this.options.allowSurrogateChars
          });
          return render(rootElement, rootObj).end(this.options.renderOpts);
        };
        return Builder;
      })();
    }).call(exports11);
  }
});

// node_modules/@jspm/core/nodelibs/browser/events.js
var events_exports = {};
__export(events_exports, {
  EventEmitter: () => EventEmitter,
  default: () => exports4,
  defaultMaxListeners: () => defaultMaxListeners,
  init: () => init,
  listenerCount: () => listenerCount,
  on: () => on2,
  once: () => once2
});
function dew2() {
  if (_dewExec2) return exports$12;
  _dewExec2 = true;
  var R = typeof Reflect === "object" ? Reflect : null;
  var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  };
  var ReflectOwnKeys;
  if (R && typeof R.ownKeys === "function") {
    ReflectOwnKeys = R.ownKeys;
  } else if (Object.getOwnPropertySymbols) {
    ReflectOwnKeys = function ReflectOwnKeys2(target) {
      return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
    };
  } else {
    ReflectOwnKeys = function ReflectOwnKeys2(target) {
      return Object.getOwnPropertyNames(target);
    };
  }
  function ProcessEmitWarning(warning) {
    if (console && console.warn) console.warn(warning);
  }
  var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
    return value !== value;
  };
  function EventEmitter2() {
    EventEmitter2.init.call(this);
  }
  exports$12 = EventEmitter2;
  exports$12.once = once4;
  EventEmitter2.EventEmitter = EventEmitter2;
  EventEmitter2.prototype._events = void 0;
  EventEmitter2.prototype._eventsCount = 0;
  EventEmitter2.prototype._maxListeners = void 0;
  var defaultMaxListeners2 = 10;
  function checkListener(listener) {
    if (typeof listener !== "function") {
      throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
    }
  }
  Object.defineProperty(EventEmitter2, "defaultMaxListeners", {
    enumerable: true,
    get: function() {
      return defaultMaxListeners2;
    },
    set: function(arg) {
      if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
        throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
      }
      defaultMaxListeners2 = arg;
    }
  });
  EventEmitter2.init = function() {
    if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
    }
    this._maxListeners = this._maxListeners || void 0;
  };
  EventEmitter2.prototype.setMaxListeners = function setMaxListeners(n) {
    if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
      throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
    }
    this._maxListeners = n;
    return this;
  };
  function _getMaxListeners(that) {
    if (that._maxListeners === void 0) return EventEmitter2.defaultMaxListeners;
    return that._maxListeners;
  }
  EventEmitter2.prototype.getMaxListeners = function getMaxListeners() {
    return _getMaxListeners(this);
  };
  EventEmitter2.prototype.emit = function emit3(type) {
    var args = [];
    for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
    var doError = type === "error";
    var events = this._events;
    if (events !== void 0) doError = doError && events.error === void 0;
    else if (!doError) return false;
    if (doError) {
      var er;
      if (args.length > 0) er = args[0];
      if (er instanceof Error) {
        throw er;
      }
      var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
      err.context = er;
      throw err;
    }
    var handler = events[type];
    if (handler === void 0) return false;
    if (typeof handler === "function") {
      ReflectApply(handler, this, args);
    } else {
      var len = handler.length;
      var listeners3 = arrayClone(handler, len);
      for (var i = 0; i < len; ++i) ReflectApply(listeners3[i], this, args);
    }
    return true;
  };
  function _addListener(target, type, listener, prepend) {
    var m;
    var events;
    var existing;
    checkListener(listener);
    events = target._events;
    if (events === void 0) {
      events = target._events = /* @__PURE__ */ Object.create(null);
      target._eventsCount = 0;
    } else {
      if (events.newListener !== void 0) {
        target.emit("newListener", type, listener.listener ? listener.listener : listener);
        events = target._events;
      }
      existing = events[type];
    }
    if (existing === void 0) {
      existing = events[type] = listener;
      ++target._eventsCount;
    } else {
      if (typeof existing === "function") {
        existing = events[type] = prepend ? [listener, existing] : [existing, listener];
      } else if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
      m = _getMaxListeners(target);
      if (m > 0 && existing.length > m && !existing.warned) {
        existing.warned = true;
        var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
        w.name = "MaxListenersExceededWarning";
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        ProcessEmitWarning(w);
      }
    }
    return target;
  }
  EventEmitter2.prototype.addListener = function addListener3(type, listener) {
    return _addListener(this, type, listener, false);
  };
  EventEmitter2.prototype.on = EventEmitter2.prototype.addListener;
  EventEmitter2.prototype.prependListener = function prependListener3(type, listener) {
    return _addListener(this, type, listener, true);
  };
  function onceWrapper() {
    if (!this.fired) {
      this.target.removeListener(this.type, this.wrapFn);
      this.fired = true;
      if (arguments.length === 0) return this.listener.call(this.target);
      return this.listener.apply(this.target, arguments);
    }
  }
  function _onceWrap(target, type, listener) {
    var state = {
      fired: false,
      wrapFn: void 0,
      target,
      type,
      listener
    };
    var wrapped = onceWrapper.bind(state);
    wrapped.listener = listener;
    state.wrapFn = wrapped;
    return wrapped;
  }
  EventEmitter2.prototype.once = function once5(type, listener) {
    checkListener(listener);
    this.on(type, _onceWrap(this, type, listener));
    return this;
  };
  EventEmitter2.prototype.prependOnceListener = function prependOnceListener3(type, listener) {
    checkListener(listener);
    this.prependListener(type, _onceWrap(this, type, listener));
    return this;
  };
  EventEmitter2.prototype.removeListener = function removeListener3(type, listener) {
    var list, events, position, i, originalListener;
    checkListener(listener);
    events = this._events;
    if (events === void 0) return this;
    list = events[type];
    if (list === void 0) return this;
    if (list === listener || list.listener === listener) {
      if (--this._eventsCount === 0) this._events = /* @__PURE__ */ Object.create(null);
      else {
        delete events[type];
        if (events.removeListener) this.emit("removeListener", type, list.listener || listener);
      }
    } else if (typeof list !== "function") {
      position = -1;
      for (i = list.length - 1; i >= 0; i--) {
        if (list[i] === listener || list[i].listener === listener) {
          originalListener = list[i].listener;
          position = i;
          break;
        }
      }
      if (position < 0) return this;
      if (position === 0) list.shift();
      else {
        spliceOne(list, position);
      }
      if (list.length === 1) events[type] = list[0];
      if (events.removeListener !== void 0) this.emit("removeListener", type, originalListener || listener);
    }
    return this;
  };
  EventEmitter2.prototype.off = EventEmitter2.prototype.removeListener;
  EventEmitter2.prototype.removeAllListeners = function removeAllListeners3(type) {
    var listeners3, events, i;
    events = this._events;
    if (events === void 0) return this;
    if (events.removeListener === void 0) {
      if (arguments.length === 0) {
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
      } else if (events[type] !== void 0) {
        if (--this._eventsCount === 0) this._events = /* @__PURE__ */ Object.create(null);
        else delete events[type];
      }
      return this;
    }
    if (arguments.length === 0) {
      var keys = Object.keys(events);
      var key;
      for (i = 0; i < keys.length; ++i) {
        key = keys[i];
        if (key === "removeListener") continue;
        this.removeAllListeners(key);
      }
      this.removeAllListeners("removeListener");
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
      return this;
    }
    listeners3 = events[type];
    if (typeof listeners3 === "function") {
      this.removeListener(type, listeners3);
    } else if (listeners3 !== void 0) {
      for (i = listeners3.length - 1; i >= 0; i--) {
        this.removeListener(type, listeners3[i]);
      }
    }
    return this;
  };
  function _listeners(target, type, unwrap) {
    var events = target._events;
    if (events === void 0) return [];
    var evlistener = events[type];
    if (evlistener === void 0) return [];
    if (typeof evlistener === "function") return unwrap ? [evlistener.listener || evlistener] : [evlistener];
    return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
  }
  EventEmitter2.prototype.listeners = function listeners3(type) {
    return _listeners(this, type, true);
  };
  EventEmitter2.prototype.rawListeners = function rawListeners(type) {
    return _listeners(this, type, false);
  };
  EventEmitter2.listenerCount = function(emitter, type) {
    if (typeof emitter.listenerCount === "function") {
      return emitter.listenerCount(type);
    } else {
      return listenerCount2.call(emitter, type);
    }
  };
  EventEmitter2.prototype.listenerCount = listenerCount2;
  function listenerCount2(type) {
    var events = this._events;
    if (events !== void 0) {
      var evlistener = events[type];
      if (typeof evlistener === "function") {
        return 1;
      } else if (evlistener !== void 0) {
        return evlistener.length;
      }
    }
    return 0;
  }
  EventEmitter2.prototype.eventNames = function eventNames() {
    return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
  };
  function arrayClone(arr, n) {
    var copy = new Array(n);
    for (var i = 0; i < n; ++i) copy[i] = arr[i];
    return copy;
  }
  function spliceOne(list, index) {
    for (; index + 1 < list.length; index++) list[index] = list[index + 1];
    list.pop();
  }
  function unwrapListeners(arr) {
    var ret = new Array(arr.length);
    for (var i = 0; i < ret.length; ++i) {
      ret[i] = arr[i].listener || arr[i];
    }
    return ret;
  }
  function once4(emitter, name2) {
    return new Promise(function(resolve, reject) {
      function errorListener(err) {
        emitter.removeListener(name2, resolver);
        reject(err);
      }
      function resolver() {
        if (typeof emitter.removeListener === "function") {
          emitter.removeListener("error", errorListener);
        }
        resolve([].slice.call(arguments));
      }
      eventTargetAgnosticAddListener(emitter, name2, resolver, {
        once: true
      });
      if (name2 !== "error") {
        addErrorHandlerIfEventEmitter(emitter, errorListener, {
          once: true
        });
      }
    });
  }
  function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
    if (typeof emitter.on === "function") {
      eventTargetAgnosticAddListener(emitter, "error", handler, flags);
    }
  }
  function eventTargetAgnosticAddListener(emitter, name2, listener, flags) {
    if (typeof emitter.on === "function") {
      if (flags.once) {
        emitter.once(name2, listener);
      } else {
        emitter.on(name2, listener);
      }
    } else if (typeof emitter.addEventListener === "function") {
      emitter.addEventListener(name2, function wrapListener(arg) {
        if (flags.once) {
          emitter.removeEventListener(name2, wrapListener);
        }
        listener(arg);
      });
    } else {
      throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
    }
  }
  return exports$12;
}
var exports$12, _dewExec2, exports4, EventEmitter, defaultMaxListeners, init, listenerCount, on2, once2;
var init_events = __esm({
  "node_modules/@jspm/core/nodelibs/browser/events.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    exports$12 = {};
    _dewExec2 = false;
    exports4 = dew2();
    exports4["once"];
    exports4.once = function(emitter, event) {
      return new Promise((resolve, reject) => {
        function eventListener(...args) {
          if (errorListener !== void 0) {
            emitter.removeListener("error", errorListener);
          }
          resolve(args);
        }
        let errorListener;
        if (event !== "error") {
          errorListener = (err) => {
            emitter.removeListener(name, eventListener);
            reject(err);
          };
          emitter.once("error", errorListener);
        }
        emitter.once(event, eventListener);
      });
    };
    exports4.on = function(emitter, event) {
      const unconsumedEventValues = [];
      const unconsumedPromises = [];
      let error = null;
      let finished2 = false;
      const iterator = {
        async next() {
          const value = unconsumedEventValues.shift();
          if (value) {
            return createIterResult(value, false);
          }
          if (error) {
            const p = Promise.reject(error);
            error = null;
            return p;
          }
          if (finished2) {
            return createIterResult(void 0, true);
          }
          return new Promise((resolve, reject) => unconsumedPromises.push({ resolve, reject }));
        },
        async return() {
          emitter.removeListener(event, eventHandler);
          emitter.removeListener("error", errorHandler);
          finished2 = true;
          for (const promise of unconsumedPromises) {
            promise.resolve(createIterResult(void 0, true));
          }
          return createIterResult(void 0, true);
        },
        throw(err) {
          error = err;
          emitter.removeListener(event, eventHandler);
          emitter.removeListener("error", errorHandler);
        },
        [Symbol.asyncIterator]() {
          return this;
        }
      };
      emitter.on(event, eventHandler);
      emitter.on("error", errorHandler);
      return iterator;
      function eventHandler(...args) {
        const promise = unconsumedPromises.shift();
        if (promise) {
          promise.resolve(createIterResult(args, false));
        } else {
          unconsumedEventValues.push(args);
        }
      }
      function errorHandler(err) {
        finished2 = true;
        const toError = unconsumedPromises.shift();
        if (toError) {
          toError.reject(err);
        } else {
          error = err;
        }
        iterator.return();
      }
    };
    ({
      EventEmitter,
      defaultMaxListeners,
      init,
      listenerCount,
      on: on2,
      once: once2
    } = exports4);
  }
});

// node_modules/@jspm/core/nodelibs/browser/chunk-DEMDiNwt.js
function unimplemented2(name2) {
  throw new Error("Node.js process " + name2 + " is not supported by JSPM core outside of Node.js");
}
function cleanUpNextTick2() {
  if (!draining2 || !currentQueue2)
    return;
  draining2 = false;
  if (currentQueue2.length) {
    queue2 = currentQueue2.concat(queue2);
  } else {
    queueIndex2 = -1;
  }
  if (queue2.length)
    drainQueue2();
}
function drainQueue2() {
  if (draining2)
    return;
  var timeout = setTimeout(cleanUpNextTick2, 0);
  draining2 = true;
  var len = queue2.length;
  while (len) {
    currentQueue2 = queue2;
    queue2 = [];
    while (++queueIndex2 < len) {
      if (currentQueue2)
        currentQueue2[queueIndex2].run();
    }
    queueIndex2 = -1;
    len = queue2.length;
  }
  currentQueue2 = null;
  draining2 = false;
  clearTimeout(timeout);
}
function nextTick2(fun) {
  var args = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var i = 1; i < arguments.length; i++)
      args[i - 1] = arguments[i];
  }
  queue2.push(new Item2(fun, args));
  if (queue2.length === 1 && !draining2)
    setTimeout(drainQueue2, 0);
}
function Item2(fun, array) {
  this.fun = fun;
  this.array = array;
}
function noop2() {
}
function _linkedBinding2(name2) {
  unimplemented2("_linkedBinding");
}
function dlopen2(name2) {
  unimplemented2("dlopen");
}
function _getActiveRequests2() {
  return [];
}
function _getActiveHandles2() {
  return [];
}
function assert2(condition, message) {
  if (!condition) throw new Error(message || "assertion error");
}
function hasUncaughtExceptionCaptureCallback2() {
  return false;
}
function uptime2() {
  return _performance2.now() / 1e3;
}
function hrtime2(previousTimestamp) {
  var baseNow = Math.floor((Date.now() - _performance2.now()) * 1e-3);
  var clocktime = _performance2.now() * 1e-3;
  var seconds = Math.floor(clocktime) + baseNow;
  var nanoseconds = Math.floor(clocktime % 1 * 1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += nanoPerSec2;
    }
  }
  return [seconds, nanoseconds];
}
function on3() {
  return process2;
}
function listeners2(name2) {
  return [];
}
var queue2, draining2, currentQueue2, queueIndex2, title2, arch2, platform2, env2, argv2, execArgv2, version2, versions2, emitWarning2, binding2, umask2, cwd2, chdir2, release2, _rawDebug2, moduleLoadList2, domain2, _exiting2, config2, reallyExit2, _kill2, cpuUsage2, resourceUsage2, memoryUsage2, kill2, exit2, openStdin2, allowedNodeEnvironmentFlags2, features2, _fatalExceptions2, setUncaughtExceptionCaptureCallback2, _tickCallback2, _debugProcess2, _debugEnd2, _startProfilerIdleNotifier2, _stopProfilerIdleNotifier2, stdout2, stderr2, stdin2, abort2, pid2, ppid2, execPath2, debugPort2, argv02, _preload_modules2, setSourceMapsEnabled2, _performance2, nowOffset, nanoPerSec2, _maxListeners2, _events2, _eventsCount2, addListener2, once3, off2, removeListener2, removeAllListeners2, emit2, prependListener2, prependOnceListener2, process2;
var init_chunk_DEMDiNwt = __esm({
  "node_modules/@jspm/core/nodelibs/browser/chunk-DEMDiNwt.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    queue2 = [];
    draining2 = false;
    queueIndex2 = -1;
    Item2.prototype.run = function() {
      this.fun.apply(null, this.array);
    };
    title2 = "browser";
    arch2 = "x64";
    platform2 = "browser";
    env2 = {
      PATH: "/usr/bin",
      LANG: navigator.language + ".UTF-8",
      PWD: "/",
      HOME: "/home",
      TMP: "/tmp"
    };
    argv2 = ["/usr/bin/node"];
    execArgv2 = [];
    version2 = "v16.8.0";
    versions2 = {};
    emitWarning2 = function(message, type) {
      console.warn((type ? type + ": " : "") + message);
    };
    binding2 = function(name2) {
      unimplemented2("binding");
    };
    umask2 = function(mask) {
      return 0;
    };
    cwd2 = function() {
      return "/";
    };
    chdir2 = function(dir) {
    };
    release2 = {
      name: "node",
      sourceUrl: "",
      headersUrl: "",
      libUrl: ""
    };
    _rawDebug2 = noop2;
    moduleLoadList2 = [];
    domain2 = {};
    _exiting2 = false;
    config2 = {};
    reallyExit2 = noop2;
    _kill2 = noop2;
    cpuUsage2 = function() {
      return {};
    };
    resourceUsage2 = cpuUsage2;
    memoryUsage2 = cpuUsage2;
    kill2 = noop2;
    exit2 = noop2;
    openStdin2 = noop2;
    allowedNodeEnvironmentFlags2 = {};
    features2 = {
      inspector: false,
      debug: false,
      uv: false,
      ipv6: false,
      tls_alpn: false,
      tls_sni: false,
      tls_ocsp: false,
      tls: false,
      cached_builtins: true
    };
    _fatalExceptions2 = noop2;
    setUncaughtExceptionCaptureCallback2 = noop2;
    _tickCallback2 = noop2;
    _debugProcess2 = noop2;
    _debugEnd2 = noop2;
    _startProfilerIdleNotifier2 = noop2;
    _stopProfilerIdleNotifier2 = noop2;
    stdout2 = void 0;
    stderr2 = void 0;
    stdin2 = void 0;
    abort2 = noop2;
    pid2 = 2;
    ppid2 = 1;
    execPath2 = "/bin/usr/node";
    debugPort2 = 9229;
    argv02 = "node";
    _preload_modules2 = [];
    setSourceMapsEnabled2 = noop2;
    _performance2 = {
      now: typeof performance !== "undefined" ? performance.now.bind(performance) : void 0,
      timing: typeof performance !== "undefined" ? performance.timing : void 0
    };
    if (_performance2.now === void 0) {
      nowOffset = Date.now();
      if (_performance2.timing && _performance2.timing.navigationStart) {
        nowOffset = _performance2.timing.navigationStart;
      }
      _performance2.now = () => Date.now() - nowOffset;
    }
    nanoPerSec2 = 1e9;
    hrtime2.bigint = function(time) {
      var diff = hrtime2(time);
      if (typeof BigInt === "undefined") {
        return diff[0] * nanoPerSec2 + diff[1];
      }
      return BigInt(diff[0] * nanoPerSec2) + BigInt(diff[1]);
    };
    _maxListeners2 = 10;
    _events2 = {};
    _eventsCount2 = 0;
    addListener2 = on3;
    once3 = on3;
    off2 = on3;
    removeListener2 = on3;
    removeAllListeners2 = on3;
    emit2 = noop2;
    prependListener2 = on3;
    prependOnceListener2 = on3;
    process2 = {
      version: version2,
      versions: versions2,
      arch: arch2,
      platform: platform2,
      release: release2,
      _rawDebug: _rawDebug2,
      moduleLoadList: moduleLoadList2,
      binding: binding2,
      _linkedBinding: _linkedBinding2,
      _events: _events2,
      _eventsCount: _eventsCount2,
      _maxListeners: _maxListeners2,
      on: on3,
      addListener: addListener2,
      once: once3,
      off: off2,
      removeListener: removeListener2,
      removeAllListeners: removeAllListeners2,
      emit: emit2,
      prependListener: prependListener2,
      prependOnceListener: prependOnceListener2,
      listeners: listeners2,
      domain: domain2,
      _exiting: _exiting2,
      config: config2,
      dlopen: dlopen2,
      uptime: uptime2,
      _getActiveRequests: _getActiveRequests2,
      _getActiveHandles: _getActiveHandles2,
      reallyExit: reallyExit2,
      _kill: _kill2,
      cpuUsage: cpuUsage2,
      resourceUsage: resourceUsage2,
      memoryUsage: memoryUsage2,
      kill: kill2,
      exit: exit2,
      openStdin: openStdin2,
      allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
      assert: assert2,
      features: features2,
      _fatalExceptions: _fatalExceptions2,
      setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
      hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
      emitWarning: emitWarning2,
      nextTick: nextTick2,
      _tickCallback: _tickCallback2,
      _debugProcess: _debugProcess2,
      _debugEnd: _debugEnd2,
      _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
      _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
      stdout: stdout2,
      stdin: stdin2,
      stderr: stderr2,
      abort: abort2,
      umask: umask2,
      chdir: chdir2,
      cwd: cwd2,
      env: env2,
      title: title2,
      argv: argv2,
      execArgv: execArgv2,
      pid: pid2,
      ppid: ppid2,
      execPath: execPath2,
      debugPort: debugPort2,
      hrtime: hrtime2,
      argv0: argv02,
      _preload_modules: _preload_modules2,
      setSourceMapsEnabled: setSourceMapsEnabled2
    };
  }
});

// node_modules/@jspm/core/nodelibs/browser/chunk-CcCWfKp1.js
function dew$12() {
  if (_dewExec$12) return exports$22;
  _dewExec$12 = true;
  var buffer = dew();
  var Buffer3 = buffer.Buffer;
  function copyProps(src, dst) {
    for (var key in src) {
      dst[key] = src[key];
    }
  }
  if (Buffer3.from && Buffer3.alloc && Buffer3.allocUnsafe && Buffer3.allocUnsafeSlow) {
    exports$22 = buffer;
  } else {
    copyProps(buffer, exports$22);
    exports$22.Buffer = SafeBuffer;
  }
  function SafeBuffer(arg, encodingOrOffset, length) {
    return Buffer3(arg, encodingOrOffset, length);
  }
  SafeBuffer.prototype = Object.create(Buffer3.prototype);
  copyProps(Buffer3, SafeBuffer);
  SafeBuffer.from = function(arg, encodingOrOffset, length) {
    if (typeof arg === "number") {
      throw new TypeError("Argument must not be a number");
    }
    return Buffer3(arg, encodingOrOffset, length);
  };
  SafeBuffer.alloc = function(size, fill, encoding) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    var buf = Buffer3(size);
    if (fill !== void 0) {
      if (typeof encoding === "string") {
        buf.fill(fill, encoding);
      } else {
        buf.fill(fill);
      }
    } else {
      buf.fill(0);
    }
    return buf;
  };
  SafeBuffer.allocUnsafe = function(size) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    return Buffer3(size);
  };
  SafeBuffer.allocUnsafeSlow = function(size) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    return buffer.SlowBuffer(size);
  };
  return exports$22;
}
function dew3() {
  if (_dewExec3) return exports$13;
  _dewExec3 = true;
  var Buffer3 = dew$12().Buffer;
  var isEncoding = Buffer3.isEncoding || function(encoding) {
    encoding = "" + encoding;
    switch (encoding && encoding.toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
      case "raw":
        return true;
      default:
        return false;
    }
  };
  function _normalizeEncoding(enc) {
    if (!enc) return "utf8";
    var retried;
    while (true) {
      switch (enc) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return enc;
        default:
          if (retried) return;
          enc = ("" + enc).toLowerCase();
          retried = true;
      }
    }
  }
  function normalizeEncoding(enc) {
    var nenc = _normalizeEncoding(enc);
    if (typeof nenc !== "string" && (Buffer3.isEncoding === isEncoding || !isEncoding(enc))) throw new Error("Unknown encoding: " + enc);
    return nenc || enc;
  }
  exports$13.StringDecoder = StringDecoder2;
  function StringDecoder2(encoding) {
    this.encoding = normalizeEncoding(encoding);
    var nb;
    switch (this.encoding) {
      case "utf16le":
        this.text = utf16Text;
        this.end = utf16End;
        nb = 4;
        break;
      case "utf8":
        this.fillLast = utf8FillLast;
        nb = 4;
        break;
      case "base64":
        this.text = base64Text;
        this.end = base64End;
        nb = 3;
        break;
      default:
        this.write = simpleWrite;
        this.end = simpleEnd;
        return;
    }
    this.lastNeed = 0;
    this.lastTotal = 0;
    this.lastChar = Buffer3.allocUnsafe(nb);
  }
  StringDecoder2.prototype.write = function(buf) {
    if (buf.length === 0) return "";
    var r;
    var i;
    if (this.lastNeed) {
      r = this.fillLast(buf);
      if (r === void 0) return "";
      i = this.lastNeed;
      this.lastNeed = 0;
    } else {
      i = 0;
    }
    if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
    return r || "";
  };
  StringDecoder2.prototype.end = utf8End;
  StringDecoder2.prototype.text = utf8Text;
  StringDecoder2.prototype.fillLast = function(buf) {
    if (this.lastNeed <= buf.length) {
      buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
      return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
    this.lastNeed -= buf.length;
  };
  function utf8CheckByte(byte) {
    if (byte <= 127) return 0;
    else if (byte >> 5 === 6) return 2;
    else if (byte >> 4 === 14) return 3;
    else if (byte >> 3 === 30) return 4;
    return byte >> 6 === 2 ? -1 : -2;
  }
  function utf8CheckIncomplete(self2, buf, i) {
    var j = buf.length - 1;
    if (j < i) return 0;
    var nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0) self2.lastNeed = nb - 1;
      return nb;
    }
    if (--j < i || nb === -2) return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0) self2.lastNeed = nb - 2;
      return nb;
    }
    if (--j < i || nb === -2) return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0) {
        if (nb === 2) nb = 0;
        else self2.lastNeed = nb - 3;
      }
      return nb;
    }
    return 0;
  }
  function utf8CheckExtraBytes(self2, buf, p) {
    if ((buf[0] & 192) !== 128) {
      self2.lastNeed = 0;
      return "\uFFFD";
    }
    if (self2.lastNeed > 1 && buf.length > 1) {
      if ((buf[1] & 192) !== 128) {
        self2.lastNeed = 1;
        return "\uFFFD";
      }
      if (self2.lastNeed > 2 && buf.length > 2) {
        if ((buf[2] & 192) !== 128) {
          self2.lastNeed = 2;
          return "\uFFFD";
        }
      }
    }
  }
  function utf8FillLast(buf) {
    var p = this.lastTotal - this.lastNeed;
    var r = utf8CheckExtraBytes(this, buf);
    if (r !== void 0) return r;
    if (this.lastNeed <= buf.length) {
      buf.copy(this.lastChar, p, 0, this.lastNeed);
      return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, p, 0, buf.length);
    this.lastNeed -= buf.length;
  }
  function utf8Text(buf, i) {
    var total = utf8CheckIncomplete(this, buf, i);
    if (!this.lastNeed) return buf.toString("utf8", i);
    this.lastTotal = total;
    var end = buf.length - (total - this.lastNeed);
    buf.copy(this.lastChar, 0, end);
    return buf.toString("utf8", i, end);
  }
  function utf8End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) return r + "\uFFFD";
    return r;
  }
  function utf16Text(buf, i) {
    if ((buf.length - i) % 2 === 0) {
      var r = buf.toString("utf16le", i);
      if (r) {
        var c = r.charCodeAt(r.length - 1);
        if (c >= 55296 && c <= 56319) {
          this.lastNeed = 2;
          this.lastTotal = 4;
          this.lastChar[0] = buf[buf.length - 2];
          this.lastChar[1] = buf[buf.length - 1];
          return r.slice(0, -1);
        }
      }
      return r;
    }
    this.lastNeed = 1;
    this.lastTotal = 2;
    this.lastChar[0] = buf[buf.length - 1];
    return buf.toString("utf16le", i, buf.length - 1);
  }
  function utf16End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) {
      var end = this.lastTotal - this.lastNeed;
      return r + this.lastChar.toString("utf16le", 0, end);
    }
    return r;
  }
  function base64Text(buf, i) {
    var n = (buf.length - i) % 3;
    if (n === 0) return buf.toString("base64", i);
    this.lastNeed = 3 - n;
    this.lastTotal = 3;
    if (n === 1) {
      this.lastChar[0] = buf[buf.length - 1];
    } else {
      this.lastChar[0] = buf[buf.length - 2];
      this.lastChar[1] = buf[buf.length - 1];
    }
    return buf.toString("base64", i, buf.length - n);
  }
  function base64End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
    return r;
  }
  function simpleWrite(buf) {
    return buf.toString(this.encoding);
  }
  function simpleEnd(buf) {
    return buf && buf.length ? this.write(buf) : "";
  }
  return exports$13;
}
var exports$22, _dewExec$12, exports$13, _dewExec3, exports5, StringDecoder;
var init_chunk_CcCWfKp1 = __esm({
  "node_modules/@jspm/core/nodelibs/browser/chunk-CcCWfKp1.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    init_chunk_DtuTasat();
    exports$22 = {};
    _dewExec$12 = false;
    exports$13 = {};
    _dewExec3 = false;
    exports5 = dew3();
    exports5["StringDecoder"];
    StringDecoder = exports5.StringDecoder;
  }
});

// node_modules/@jspm/core/nodelibs/browser/chunk-DtcTpLWz.js
function dew$k() {
  if (_dewExec$k) return exports$k;
  _dewExec$k = true;
  exports$k = function hasSymbols() {
    if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
      return false;
    }
    if (typeof Symbol.iterator === "symbol") {
      return true;
    }
    var obj = {};
    var sym = /* @__PURE__ */ Symbol("test");
    var symObj = Object(sym);
    if (typeof sym === "string") {
      return false;
    }
    if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
      return false;
    }
    if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
      return false;
    }
    var symVal = 42;
    obj[sym] = symVal;
    for (sym in obj) {
      return false;
    }
    if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
      return false;
    }
    if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
      return false;
    }
    var syms = Object.getOwnPropertySymbols(obj);
    if (syms.length !== 1 || syms[0] !== sym) {
      return false;
    }
    if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
      return false;
    }
    if (typeof Object.getOwnPropertyDescriptor === "function") {
      var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
      if (descriptor.value !== symVal || descriptor.enumerable !== true) {
        return false;
      }
    }
    return true;
  };
  return exports$k;
}
function dew$j() {
  if (_dewExec$j) return exports$j;
  _dewExec$j = true;
  exports$j = Error;
  return exports$j;
}
function dew$i() {
  if (_dewExec$i) return exports$i;
  _dewExec$i = true;
  exports$i = EvalError;
  return exports$i;
}
function dew$h() {
  if (_dewExec$h) return exports$h;
  _dewExec$h = true;
  exports$h = RangeError;
  return exports$h;
}
function dew$g() {
  if (_dewExec$g) return exports$g;
  _dewExec$g = true;
  exports$g = ReferenceError;
  return exports$g;
}
function dew$f() {
  if (_dewExec$f) return exports$f;
  _dewExec$f = true;
  exports$f = SyntaxError;
  return exports$f;
}
function dew$e() {
  if (_dewExec$e) return exports$e;
  _dewExec$e = true;
  exports$e = TypeError;
  return exports$e;
}
function dew$d() {
  if (_dewExec$d) return exports$d;
  _dewExec$d = true;
  exports$d = URIError;
  return exports$d;
}
function dew$c() {
  if (_dewExec$c) return exports$c;
  _dewExec$c = true;
  var origSymbol = typeof Symbol !== "undefined" && Symbol;
  var hasSymbolSham = dew$k();
  exports$c = function hasNativeSymbols() {
    if (typeof origSymbol !== "function") {
      return false;
    }
    if (typeof Symbol !== "function") {
      return false;
    }
    if (typeof origSymbol("foo") !== "symbol") {
      return false;
    }
    if (typeof /* @__PURE__ */ Symbol("bar") !== "symbol") {
      return false;
    }
    return hasSymbolSham();
  };
  return exports$c;
}
function dew$b() {
  if (_dewExec$b) return exports$b;
  _dewExec$b = true;
  var test = {
    __proto__: null,
    foo: {}
  };
  var $Object = Object;
  exports$b = function hasProto() {
    return {
      __proto__: test
    }.foo === test.foo && !(test instanceof $Object);
  };
  return exports$b;
}
function dew$a() {
  if (_dewExec$a) return exports$a;
  _dewExec$a = true;
  var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
  var toStr = Object.prototype.toString;
  var max = Math.max;
  var funcType = "[object Function]";
  var concatty = function concatty2(a, b) {
    var arr = [];
    for (var i = 0; i < a.length; i += 1) {
      arr[i] = a[i];
    }
    for (var j = 0; j < b.length; j += 1) {
      arr[j + a.length] = b[j];
    }
    return arr;
  };
  var slicy = function slicy2(arrLike, offset) {
    var arr = [];
    for (var i = offset, j = 0; i < arrLike.length; i += 1, j += 1) {
      arr[j] = arrLike[i];
    }
    return arr;
  };
  var joiny = function(arr, joiner) {
    var str = "";
    for (var i = 0; i < arr.length; i += 1) {
      str += arr[i];
      if (i + 1 < arr.length) {
        str += joiner;
      }
    }
    return str;
  };
  exports$a = function bind(that) {
    var target = this;
    if (typeof target !== "function" || toStr.apply(target) !== funcType) {
      throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);
    var bound;
    var binder = function() {
      if (this instanceof bound) {
        var result = target.apply(this, concatty(args, arguments));
        if (Object(result) === result) {
          return result;
        }
        return this;
      }
      return target.apply(that, concatty(args, arguments));
    };
    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
      boundArgs[i] = "$" + i;
    }
    bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
    if (target.prototype) {
      var Empty = function Empty2() {
      };
      Empty.prototype = target.prototype;
      bound.prototype = new Empty();
      Empty.prototype = null;
    }
    return bound;
  };
  return exports$a;
}
function dew$9() {
  if (_dewExec$9) return exports$9;
  _dewExec$9 = true;
  var implementation = dew$a();
  exports$9 = Function.prototype.bind || implementation;
  return exports$9;
}
function dew$8() {
  if (_dewExec$8) return exports$8;
  _dewExec$8 = true;
  var call = Function.prototype.call;
  var $hasOwn = Object.prototype.hasOwnProperty;
  var bind = dew$9();
  exports$8 = bind.call(call, $hasOwn);
  return exports$8;
}
function dew$7() {
  if (_dewExec$7) return exports$7;
  _dewExec$7 = true;
  var undefined$1;
  var $Error = dew$j();
  var $EvalError = dew$i();
  var $RangeError = dew$h();
  var $ReferenceError = dew$g();
  var $SyntaxError = dew$f();
  var $TypeError = dew$e();
  var $URIError = dew$d();
  var $Function = Function;
  var getEvalledConstructor = function(expressionSyntax) {
    try {
      return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
    } catch (e) {
    }
  };
  var $gOPD = Object.getOwnPropertyDescriptor;
  if ($gOPD) {
    try {
      $gOPD({}, "");
    } catch (e) {
      $gOPD = null;
    }
  }
  var throwTypeError = function() {
    throw new $TypeError();
  };
  var ThrowTypeError = $gOPD ? (function() {
    try {
      arguments.callee;
      return throwTypeError;
    } catch (calleeThrows) {
      try {
        return $gOPD(arguments, "callee").get;
      } catch (gOPDthrows) {
        return throwTypeError;
      }
    }
  })() : throwTypeError;
  var hasSymbols = dew$c()();
  var hasProto = dew$b()();
  var getProto = Object.getPrototypeOf || (hasProto ? function(x) {
    return x.__proto__;
  } : null);
  var needsEval = {};
  var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined$1 : getProto(Uint8Array);
  var INTRINSICS = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError === "undefined" ? undefined$1 : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined$1 : ArrayBuffer,
    "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined$1,
    "%AsyncFromSyncIteratorPrototype%": undefined$1,
    "%AsyncFunction%": needsEval,
    "%AsyncGenerator%": needsEval,
    "%AsyncGeneratorFunction%": needsEval,
    "%AsyncIteratorPrototype%": needsEval,
    "%Atomics%": typeof Atomics === "undefined" ? undefined$1 : Atomics,
    "%BigInt%": typeof BigInt === "undefined" ? undefined$1 : BigInt,
    "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined$1 : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined$1 : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView === "undefined" ? undefined$1 : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": $Error,
    "%eval%": eval,
    // eslint-disable-line no-eval
    "%EvalError%": $EvalError,
    "%Float32Array%": typeof Float32Array === "undefined" ? undefined$1 : Float32Array,
    "%Float64Array%": typeof Float64Array === "undefined" ? undefined$1 : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined$1 : FinalizationRegistry,
    "%Function%": $Function,
    "%GeneratorFunction%": needsEval,
    "%Int8Array%": typeof Int8Array === "undefined" ? undefined$1 : Int8Array,
    "%Int16Array%": typeof Int16Array === "undefined" ? undefined$1 : Int16Array,
    "%Int32Array%": typeof Int32Array === "undefined" ? undefined$1 : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined$1,
    "%JSON%": typeof JSON === "object" ? JSON : undefined$1,
    "%Map%": typeof Map === "undefined" ? undefined$1 : Map,
    "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined$1 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": Object,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise === "undefined" ? undefined$1 : Promise,
    "%Proxy%": typeof Proxy === "undefined" ? undefined$1 : Proxy,
    "%RangeError%": $RangeError,
    "%ReferenceError%": $ReferenceError,
    "%Reflect%": typeof Reflect === "undefined" ? undefined$1 : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set === "undefined" ? undefined$1 : Set,
    "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined$1 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined$1 : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined$1,
    "%Symbol%": hasSymbols ? Symbol : undefined$1,
    "%SyntaxError%": $SyntaxError,
    "%ThrowTypeError%": ThrowTypeError,
    "%TypedArray%": TypedArray,
    "%TypeError%": $TypeError,
    "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined$1 : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined$1 : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined$1 : Uint16Array,
    "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined$1 : Uint32Array,
    "%URIError%": $URIError,
    "%WeakMap%": typeof WeakMap === "undefined" ? undefined$1 : WeakMap,
    "%WeakRef%": typeof WeakRef === "undefined" ? undefined$1 : WeakRef,
    "%WeakSet%": typeof WeakSet === "undefined" ? undefined$1 : WeakSet
  };
  if (getProto) {
    try {
      null.error;
    } catch (e) {
      var errorProto = getProto(getProto(e));
      INTRINSICS["%Error.prototype%"] = errorProto;
    }
  }
  var doEval = function doEval2(name2) {
    var value;
    if (name2 === "%AsyncFunction%") {
      value = getEvalledConstructor("async function () {}");
    } else if (name2 === "%GeneratorFunction%") {
      value = getEvalledConstructor("function* () {}");
    } else if (name2 === "%AsyncGeneratorFunction%") {
      value = getEvalledConstructor("async function* () {}");
    } else if (name2 === "%AsyncGenerator%") {
      var fn = doEval2("%AsyncGeneratorFunction%");
      if (fn) {
        value = fn.prototype;
      }
    } else if (name2 === "%AsyncIteratorPrototype%") {
      var gen = doEval2("%AsyncGenerator%");
      if (gen && getProto) {
        value = getProto(gen.prototype);
      }
    }
    INTRINSICS[name2] = value;
    return value;
  };
  var LEGACY_ALIASES = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
  };
  var bind = dew$9();
  var hasOwn = dew$8();
  var $concat = bind.call(Function.call, Array.prototype.concat);
  var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
  var $replace = bind.call(Function.call, String.prototype.replace);
  var $strSlice = bind.call(Function.call, String.prototype.slice);
  var $exec = bind.call(Function.call, RegExp.prototype.exec);
  var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = function stringToPath2(string) {
    var first = $strSlice(string, 0, 1);
    var last = $strSlice(string, -1);
    if (first === "%" && last !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
    } else if (last === "%" && first !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
    }
    var result = [];
    $replace(string, rePropName, function(match, number, quote, subString) {
      result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
    });
    return result;
  };
  var getBaseIntrinsic = function getBaseIntrinsic2(name2, allowMissing) {
    var intrinsicName = name2;
    var alias;
    if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
      alias = LEGACY_ALIASES[intrinsicName];
      intrinsicName = "%" + alias[0] + "%";
    }
    if (hasOwn(INTRINSICS, intrinsicName)) {
      var value = INTRINSICS[intrinsicName];
      if (value === needsEval) {
        value = doEval(intrinsicName);
      }
      if (typeof value === "undefined" && !allowMissing) {
        throw new $TypeError("intrinsic " + name2 + " exists, but is not available. Please file an issue!");
      }
      return {
        alias,
        name: intrinsicName,
        value
      };
    }
    throw new $SyntaxError("intrinsic " + name2 + " does not exist!");
  };
  exports$7 = function GetIntrinsic(name2, allowMissing) {
    if (typeof name2 !== "string" || name2.length === 0) {
      throw new $TypeError("intrinsic name must be a non-empty string");
    }
    if (arguments.length > 1 && typeof allowMissing !== "boolean") {
      throw new $TypeError('"allowMissing" argument must be a boolean');
    }
    if ($exec(/^%?[^%]*%?$/, name2) === null) {
      throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    }
    var parts = stringToPath(name2);
    var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
    var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
    var intrinsicRealName = intrinsic.name;
    var value = intrinsic.value;
    var skipFurtherCaching = false;
    var alias = intrinsic.alias;
    if (alias) {
      intrinsicBaseName = alias[0];
      $spliceApply(parts, $concat([0, 1], alias));
    }
    for (var i = 1, isOwn = true; i < parts.length; i += 1) {
      var part = parts[i];
      var first = $strSlice(part, 0, 1);
      var last = $strSlice(part, -1);
      if ((first === '"' || first === "'" || first === "`" || last === '"' || last === "'" || last === "`") && first !== last) {
        throw new $SyntaxError("property names with quotes must have matching quotes");
      }
      if (part === "constructor" || !isOwn) {
        skipFurtherCaching = true;
      }
      intrinsicBaseName += "." + part;
      intrinsicRealName = "%" + intrinsicBaseName + "%";
      if (hasOwn(INTRINSICS, intrinsicRealName)) {
        value = INTRINSICS[intrinsicRealName];
      } else if (value != null) {
        if (!(part in value)) {
          if (!allowMissing) {
            throw new $TypeError("base intrinsic for " + name2 + " exists, but the property is not available.");
          }
          return void undefined$1;
        }
        if ($gOPD && i + 1 >= parts.length) {
          var desc = $gOPD(value, part);
          isOwn = !!desc;
          if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
            value = desc.get;
          } else {
            value = value[part];
          }
        } else {
          isOwn = hasOwn(value, part);
          value = value[part];
        }
        if (isOwn && !skipFurtherCaching) {
          INTRINSICS[intrinsicRealName] = value;
        }
      }
    }
    return value;
  };
  return exports$7;
}
function dew$6() {
  if (_dewExec$6) return exports$6;
  _dewExec$6 = true;
  var GetIntrinsic = dew$7();
  var $defineProperty = GetIntrinsic("%Object.defineProperty%", true) || false;
  if ($defineProperty) {
    try {
      $defineProperty({}, "a", {
        value: 1
      });
    } catch (e) {
      $defineProperty = false;
    }
  }
  exports$6 = $defineProperty;
  return exports$6;
}
function dew$5() {
  if (_dewExec$5) return exports$5;
  _dewExec$5 = true;
  var GetIntrinsic = dew$7();
  var $gOPD = GetIntrinsic("%Object.getOwnPropertyDescriptor%", true);
  if ($gOPD) {
    try {
      $gOPD([], "length");
    } catch (e) {
      $gOPD = null;
    }
  }
  exports$5 = $gOPD;
  return exports$5;
}
function dew$4() {
  if (_dewExec$4) return exports$4;
  _dewExec$4 = true;
  var $defineProperty = dew$6();
  var $SyntaxError = dew$f();
  var $TypeError = dew$e();
  var gopd = dew$5();
  exports$4 = function defineDataProperty(obj, property, value) {
    if (!obj || typeof obj !== "object" && typeof obj !== "function") {
      throw new $TypeError("`obj` must be an object or a function`");
    }
    if (typeof property !== "string" && typeof property !== "symbol") {
      throw new $TypeError("`property` must be a string or a symbol`");
    }
    if (arguments.length > 3 && typeof arguments[3] !== "boolean" && arguments[3] !== null) {
      throw new $TypeError("`nonEnumerable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 4 && typeof arguments[4] !== "boolean" && arguments[4] !== null) {
      throw new $TypeError("`nonWritable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 5 && typeof arguments[5] !== "boolean" && arguments[5] !== null) {
      throw new $TypeError("`nonConfigurable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 6 && typeof arguments[6] !== "boolean") {
      throw new $TypeError("`loose`, if provided, must be a boolean");
    }
    var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
    var nonWritable = arguments.length > 4 ? arguments[4] : null;
    var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
    var loose = arguments.length > 6 ? arguments[6] : false;
    var desc = !!gopd && gopd(obj, property);
    if ($defineProperty) {
      $defineProperty(obj, property, {
        configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
        enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
        value,
        writable: nonWritable === null && desc ? desc.writable : !nonWritable
      });
    } else if (loose || !nonEnumerable && !nonWritable && !nonConfigurable) {
      obj[property] = value;
    } else {
      throw new $SyntaxError("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
    }
  };
  return exports$4;
}
function dew$3() {
  if (_dewExec$3) return exports$3;
  _dewExec$3 = true;
  var $defineProperty = dew$6();
  var hasPropertyDescriptors = function hasPropertyDescriptors2() {
    return !!$defineProperty;
  };
  hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
    if (!$defineProperty) {
      return null;
    }
    try {
      return $defineProperty([], "length", {
        value: 1
      }).length !== 1;
    } catch (e) {
      return true;
    }
  };
  exports$3 = hasPropertyDescriptors;
  return exports$3;
}
function dew$22() {
  if (_dewExec$22) return exports$23;
  _dewExec$22 = true;
  var GetIntrinsic = dew$7();
  var define = dew$4();
  var hasDescriptors = dew$3()();
  var gOPD = dew$5();
  var $TypeError = dew$e();
  var $floor = GetIntrinsic("%Math.floor%");
  exports$23 = function setFunctionLength(fn, length) {
    if (typeof fn !== "function") {
      throw new $TypeError("`fn` is not a function");
    }
    if (typeof length !== "number" || length < 0 || length > 4294967295 || $floor(length) !== length) {
      throw new $TypeError("`length` must be a positive 32-bit integer");
    }
    var loose = arguments.length > 2 && !!arguments[2];
    var functionLengthIsConfigurable = true;
    var functionLengthIsWritable = true;
    if ("length" in fn && gOPD) {
      var desc = gOPD(fn, "length");
      if (desc && !desc.configurable) {
        functionLengthIsConfigurable = false;
      }
      if (desc && !desc.writable) {
        functionLengthIsWritable = false;
      }
    }
    if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
      if (hasDescriptors) {
        define(
          /** @type {Parameters<define>[0]} */
          fn,
          "length",
          length,
          true,
          true
        );
      } else {
        define(
          /** @type {Parameters<define>[0]} */
          fn,
          "length",
          length
        );
      }
    }
    return fn;
  };
  return exports$23;
}
function dew$13() {
  if (_dewExec$13) return exports$14;
  _dewExec$13 = true;
  var bind = dew$9();
  var GetIntrinsic = dew$7();
  var setFunctionLength = dew$22();
  var $TypeError = dew$e();
  var $apply = GetIntrinsic("%Function.prototype.apply%");
  var $call = GetIntrinsic("%Function.prototype.call%");
  var $reflectApply = GetIntrinsic("%Reflect.apply%", true) || bind.call($call, $apply);
  var $defineProperty = dew$6();
  var $max = GetIntrinsic("%Math.max%");
  exports$14 = function callBind(originalFunction) {
    if (typeof originalFunction !== "function") {
      throw new $TypeError("a function is required");
    }
    var func = $reflectApply(bind, $call, arguments);
    return setFunctionLength(func, 1 + $max(0, originalFunction.length - (arguments.length - 1)), true);
  };
  var applyBind = function applyBind2() {
    return $reflectApply(bind, $apply, arguments);
  };
  if ($defineProperty) {
    $defineProperty(exports$14, "apply", {
      value: applyBind
    });
  } else {
    exports$14.apply = applyBind;
  }
  return exports$14;
}
function dew4() {
  if (_dewExec4) return exports6;
  _dewExec4 = true;
  var GetIntrinsic = dew$7();
  var callBind = dew$13();
  var $indexOf = callBind(GetIntrinsic("String.prototype.indexOf"));
  exports6 = function callBoundIntrinsic(name2, allowMissing) {
    var intrinsic = GetIntrinsic(name2, !!allowMissing);
    if (typeof intrinsic === "function" && $indexOf(name2, ".prototype.") > -1) {
      return callBind(intrinsic);
    }
    return intrinsic;
  };
  return exports6;
}
var exports$k, _dewExec$k, exports$j, _dewExec$j, exports$i, _dewExec$i, exports$h, _dewExec$h, exports$g, _dewExec$g, exports$f, _dewExec$f, exports$e, _dewExec$e, exports$d, _dewExec$d, exports$c, _dewExec$c, exports$b, _dewExec$b, exports$a, _dewExec$a, exports$9, _dewExec$9, exports$8, _dewExec$8, exports$7, _dewExec$7, exports$6, _dewExec$6, exports$5, _dewExec$5, exports$4, _dewExec$4, exports$3, _dewExec$3, exports$23, _dewExec$22, exports$14, _dewExec$13, exports6, _dewExec4;
var init_chunk_DtcTpLWz = __esm({
  "node_modules/@jspm/core/nodelibs/browser/chunk-DtcTpLWz.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    exports$k = {};
    _dewExec$k = false;
    exports$j = {};
    _dewExec$j = false;
    exports$i = {};
    _dewExec$i = false;
    exports$h = {};
    _dewExec$h = false;
    exports$g = {};
    _dewExec$g = false;
    exports$f = {};
    _dewExec$f = false;
    exports$e = {};
    _dewExec$e = false;
    exports$d = {};
    _dewExec$d = false;
    exports$c = {};
    _dewExec$c = false;
    exports$b = {};
    _dewExec$b = false;
    exports$a = {};
    _dewExec$a = false;
    exports$9 = {};
    _dewExec$9 = false;
    exports$8 = {};
    _dewExec$8 = false;
    exports$7 = {};
    _dewExec$7 = false;
    exports$6 = {};
    _dewExec$6 = false;
    exports$5 = {};
    _dewExec$5 = false;
    exports$4 = {};
    _dewExec$4 = false;
    exports$3 = {};
    _dewExec$3 = false;
    exports$23 = {};
    _dewExec$22 = false;
    exports$14 = {};
    _dewExec$13 = false;
    exports6 = {};
    _dewExec4 = false;
  }
});

// node_modules/@jspm/core/nodelibs/browser/chunk-CkFCi-G1.js
function dew5() {
  if (_dewExec5) return exports7;
  _dewExec5 = true;
  if (typeof Object.create === "function") {
    exports7 = function inherits2(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      }
    };
  } else {
    exports7 = function inherits2(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {
        };
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }
    };
  }
  return exports7;
}
var exports7, _dewExec5;
var init_chunk_CkFCi_G1 = __esm({
  "node_modules/@jspm/core/nodelibs/browser/chunk-CkFCi-G1.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    exports7 = {};
    _dewExec5 = false;
  }
});

// node_modules/@jspm/core/nodelibs/browser/util.js
function dew$b2() {
  if (_dewExec$b2) return exports$c2;
  _dewExec$b2 = true;
  var hasSymbols = dew$k();
  exports$c2 = function hasToStringTagShams() {
    return hasSymbols() && !!Symbol.toStringTag;
  };
  return exports$c2;
}
function dew$a2() {
  if (_dewExec$a2) return exports$b2;
  _dewExec$a2 = true;
  var hasToStringTag = dew$b2()();
  var callBound = dew4();
  var $toString = callBound("Object.prototype.toString");
  var isStandardArguments = function isArguments(value) {
    if (hasToStringTag && value && typeof value === "object" && Symbol.toStringTag in value) {
      return false;
    }
    return $toString(value) === "[object Arguments]";
  };
  var isLegacyArguments = function isArguments(value) {
    if (isStandardArguments(value)) {
      return true;
    }
    return value !== null && typeof value === "object" && typeof value.length === "number" && value.length >= 0 && $toString(value) !== "[object Array]" && $toString(value.callee) === "[object Function]";
  };
  var supportsStandardArguments = (function() {
    return isStandardArguments(arguments);
  })();
  isStandardArguments.isLegacyArguments = isLegacyArguments;
  exports$b2 = supportsStandardArguments ? isStandardArguments : isLegacyArguments;
  return exports$b2;
}
function dew$92() {
  if (_dewExec$92) return exports$a2;
  _dewExec$92 = true;
  var toStr = Object.prototype.toString;
  var fnToStr = Function.prototype.toString;
  var isFnRegex = /^\s*(?:function)?\*/;
  var hasToStringTag = dew$b2()();
  var getProto = Object.getPrototypeOf;
  var getGeneratorFunc = function() {
    if (!hasToStringTag) {
      return false;
    }
    try {
      return Function("return function*() {}")();
    } catch (e) {
    }
  };
  var GeneratorFunction;
  exports$a2 = function isGeneratorFunction(fn) {
    if (typeof fn !== "function") {
      return false;
    }
    if (isFnRegex.test(fnToStr.call(fn))) {
      return true;
    }
    if (!hasToStringTag) {
      var str = toStr.call(fn);
      return str === "[object GeneratorFunction]";
    }
    if (!getProto) {
      return false;
    }
    if (typeof GeneratorFunction === "undefined") {
      var generatorFunc = getGeneratorFunc();
      GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
    }
    return getProto(fn) === GeneratorFunction;
  };
  return exports$a2;
}
function dew$82() {
  if (_dewExec$82) return exports$92;
  _dewExec$82 = true;
  var fnToStr = Function.prototype.toString;
  var reflectApply = typeof Reflect === "object" && Reflect !== null && Reflect.apply;
  var badArrayLike;
  var isCallableMarker;
  if (typeof reflectApply === "function" && typeof Object.defineProperty === "function") {
    try {
      badArrayLike = Object.defineProperty({}, "length", {
        get: function() {
          throw isCallableMarker;
        }
      });
      isCallableMarker = {};
      reflectApply(function() {
        throw 42;
      }, null, badArrayLike);
    } catch (_) {
      if (_ !== isCallableMarker) {
        reflectApply = null;
      }
    }
  } else {
    reflectApply = null;
  }
  var constructorRegex = /^\s*class\b/;
  var isES6ClassFn = function isES6ClassFunction(value) {
    try {
      var fnStr = fnToStr.call(value);
      return constructorRegex.test(fnStr);
    } catch (e) {
      return false;
    }
  };
  var tryFunctionObject = function tryFunctionToStr(value) {
    try {
      if (isES6ClassFn(value)) {
        return false;
      }
      fnToStr.call(value);
      return true;
    } catch (e) {
      return false;
    }
  };
  var toStr = Object.prototype.toString;
  var objectClass = "[object Object]";
  var fnClass = "[object Function]";
  var genClass = "[object GeneratorFunction]";
  var ddaClass = "[object HTMLAllCollection]";
  var ddaClass2 = "[object HTML document.all class]";
  var ddaClass3 = "[object HTMLCollection]";
  var hasToStringTag = typeof Symbol === "function" && !!Symbol.toStringTag;
  var isIE68 = !(0 in [,]);
  var isDDA = function isDocumentDotAll() {
    return false;
  };
  if (typeof document === "object") {
    var all = document.all;
    if (toStr.call(all) === toStr.call(document.all)) {
      isDDA = function isDocumentDotAll(value) {
        if ((isIE68 || !value) && (typeof value === "undefined" || typeof value === "object")) {
          try {
            var str = toStr.call(value);
            return (str === ddaClass || str === ddaClass2 || str === ddaClass3 || str === objectClass) && value("") == null;
          } catch (e) {
          }
        }
        return false;
      };
    }
  }
  exports$92 = reflectApply ? function isCallable(value) {
    if (isDDA(value)) {
      return true;
    }
    if (!value) {
      return false;
    }
    if (typeof value !== "function" && typeof value !== "object") {
      return false;
    }
    try {
      reflectApply(value, null, badArrayLike);
    } catch (e) {
      if (e !== isCallableMarker) {
        return false;
      }
    }
    return !isES6ClassFn(value) && tryFunctionObject(value);
  } : function isCallable(value) {
    if (isDDA(value)) {
      return true;
    }
    if (!value) {
      return false;
    }
    if (typeof value !== "function" && typeof value !== "object") {
      return false;
    }
    if (hasToStringTag) {
      return tryFunctionObject(value);
    }
    if (isES6ClassFn(value)) {
      return false;
    }
    var strClass = toStr.call(value);
    if (strClass !== fnClass && strClass !== genClass && !/^\[object HTML/.test(strClass)) {
      return false;
    }
    return tryFunctionObject(value);
  };
  return exports$92;
}
function dew$72() {
  if (_dewExec$72) return exports$82;
  _dewExec$72 = true;
  var isCallable = dew$82();
  var toStr = Object.prototype.toString;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var forEachArray = function forEachArray2(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
      if (hasOwnProperty.call(array, i)) {
        if (receiver == null) {
          iterator(array[i], i, array);
        } else {
          iterator.call(receiver, array[i], i, array);
        }
      }
    }
  };
  var forEachString = function forEachString2(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
      if (receiver == null) {
        iterator(string.charAt(i), i, string);
      } else {
        iterator.call(receiver, string.charAt(i), i, string);
      }
    }
  };
  var forEachObject = function forEachObject2(object, iterator, receiver) {
    for (var k in object) {
      if (hasOwnProperty.call(object, k)) {
        if (receiver == null) {
          iterator(object[k], k, object);
        } else {
          iterator.call(receiver, object[k], k, object);
        }
      }
    }
  };
  var forEach = function forEach2(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
      throw new TypeError("iterator must be a function");
    }
    var receiver;
    if (arguments.length >= 3) {
      receiver = thisArg;
    }
    if (toStr.call(list) === "[object Array]") {
      forEachArray(list, iterator, receiver);
    } else if (typeof list === "string") {
      forEachString(list, iterator, receiver);
    } else {
      forEachObject(list, iterator, receiver);
    }
  };
  exports$82 = forEach;
  return exports$82;
}
function dew$62() {
  if (_dewExec$62) return exports$72;
  _dewExec$62 = true;
  exports$72 = ["Float32Array", "Float64Array", "Int8Array", "Int16Array", "Int32Array", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "BigInt64Array", "BigUint64Array"];
  return exports$72;
}
function dew$52() {
  if (_dewExec$52) return exports$62;
  _dewExec$52 = true;
  var possibleNames = dew$62();
  var g = typeof globalThis === "undefined" ? _global$2 : globalThis;
  exports$62 = function availableTypedArrays() {
    var out = [];
    for (var i = 0; i < possibleNames.length; i++) {
      if (typeof g[possibleNames[i]] === "function") {
        out[out.length] = possibleNames[i];
      }
    }
    return out;
  };
  return exports$62;
}
function dew$42() {
  if (_dewExec$42) return exports$52;
  _dewExec$42 = true;
  var forEach = dew$72();
  var availableTypedArrays = dew$52();
  var callBind = dew$13();
  var callBound = dew4();
  var gOPD = dew$5();
  var $toString = callBound("Object.prototype.toString");
  var hasToStringTag = dew$b2()();
  var g = typeof globalThis === "undefined" ? _global$1 : globalThis;
  var typedArrays = availableTypedArrays();
  var $slice = callBound("String.prototype.slice");
  var getPrototypeOf = Object.getPrototypeOf;
  var $indexOf = callBound("Array.prototype.indexOf", true) || function indexOf(array, value) {
    for (var i = 0; i < array.length; i += 1) {
      if (array[i] === value) {
        return i;
      }
    }
    return -1;
  };
  var cache = {
    __proto__: null
  };
  if (hasToStringTag && gOPD && getPrototypeOf) {
    forEach(typedArrays, function(typedArray) {
      var arr = new g[typedArray]();
      if (Symbol.toStringTag in arr) {
        var proto = getPrototypeOf(arr);
        var descriptor = gOPD(proto, Symbol.toStringTag);
        if (!descriptor) {
          var superProto = getPrototypeOf(proto);
          descriptor = gOPD(superProto, Symbol.toStringTag);
        }
        cache["$" + typedArray] = callBind(descriptor.get);
      }
    });
  } else {
    forEach(typedArrays, function(typedArray) {
      var arr = new g[typedArray]();
      var fn = arr.slice || arr.set;
      if (fn) {
        cache["$" + typedArray] = callBind(fn);
      }
    });
  }
  var tryTypedArrays = function tryAllTypedArrays(value) {
    var found = false;
    forEach(
      // eslint-disable-next-line no-extra-parens
      /** @type {Record<`\$${TypedArrayName}`, Getter>} */
      /** @type {any} */
      cache,
      /** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
      function(getter, typedArray) {
        if (!found) {
          try {
            if ("$" + getter(value) === typedArray) {
              found = $slice(typedArray, 1);
            }
          } catch (e) {
          }
        }
      }
    );
    return found;
  };
  var trySlices = function tryAllSlices(value) {
    var found = false;
    forEach(
      // eslint-disable-next-line no-extra-parens
      /** @type {Record<`\$${TypedArrayName}`, Getter>} */
      /** @type {any} */
      cache,
      /** @type {(getter: typeof cache, name: `\$${import('.').TypedArrayName}`) => void} */
      function(getter, name2) {
        if (!found) {
          try {
            getter(value);
            found = $slice(name2, 1);
          } catch (e) {
          }
        }
      }
    );
    return found;
  };
  exports$52 = function whichTypedArray(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    if (!hasToStringTag) {
      var tag = $slice($toString(value), 8, -1);
      if ($indexOf(typedArrays, tag) > -1) {
        return tag;
      }
      if (tag !== "Object") {
        return false;
      }
      return trySlices(value);
    }
    if (!gOPD) {
      return null;
    }
    return tryTypedArrays(value);
  };
  return exports$52;
}
function dew$32() {
  if (_dewExec$32) return exports$42;
  _dewExec$32 = true;
  var whichTypedArray = dew$42();
  exports$42 = function isTypedArray(value) {
    return !!whichTypedArray(value);
  };
  return exports$42;
}
function dew$23() {
  if (_dewExec$23) return exports$32;
  _dewExec$23 = true;
  var isArgumentsObject = dew$a2();
  var isGeneratorFunction = dew$92();
  var whichTypedArray = dew$42();
  var isTypedArray = dew$32();
  function uncurryThis(f) {
    return f.call.bind(f);
  }
  var BigIntSupported = typeof BigInt !== "undefined";
  var SymbolSupported = typeof Symbol !== "undefined";
  var ObjectToString = uncurryThis(Object.prototype.toString);
  var numberValue = uncurryThis(Number.prototype.valueOf);
  var stringValue = uncurryThis(String.prototype.valueOf);
  var booleanValue = uncurryThis(Boolean.prototype.valueOf);
  if (BigIntSupported) {
    var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
  }
  if (SymbolSupported) {
    var symbolValue = uncurryThis(Symbol.prototype.valueOf);
  }
  function checkBoxedPrimitive(value, prototypeValueOf) {
    if (typeof value !== "object") {
      return false;
    }
    try {
      prototypeValueOf(value);
      return true;
    } catch (e) {
      return false;
    }
  }
  exports$32.isArgumentsObject = isArgumentsObject;
  exports$32.isGeneratorFunction = isGeneratorFunction;
  exports$32.isTypedArray = isTypedArray;
  function isPromise(input) {
    return typeof Promise !== "undefined" && input instanceof Promise || input !== null && typeof input === "object" && typeof input.then === "function" && typeof input.catch === "function";
  }
  exports$32.isPromise = isPromise;
  function isArrayBufferView(value) {
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
      return ArrayBuffer.isView(value);
    }
    return isTypedArray(value) || isDataView(value);
  }
  exports$32.isArrayBufferView = isArrayBufferView;
  function isUint8Array(value) {
    return whichTypedArray(value) === "Uint8Array";
  }
  exports$32.isUint8Array = isUint8Array;
  function isUint8ClampedArray(value) {
    return whichTypedArray(value) === "Uint8ClampedArray";
  }
  exports$32.isUint8ClampedArray = isUint8ClampedArray;
  function isUint16Array(value) {
    return whichTypedArray(value) === "Uint16Array";
  }
  exports$32.isUint16Array = isUint16Array;
  function isUint32Array(value) {
    return whichTypedArray(value) === "Uint32Array";
  }
  exports$32.isUint32Array = isUint32Array;
  function isInt8Array(value) {
    return whichTypedArray(value) === "Int8Array";
  }
  exports$32.isInt8Array = isInt8Array;
  function isInt16Array(value) {
    return whichTypedArray(value) === "Int16Array";
  }
  exports$32.isInt16Array = isInt16Array;
  function isInt32Array(value) {
    return whichTypedArray(value) === "Int32Array";
  }
  exports$32.isInt32Array = isInt32Array;
  function isFloat32Array(value) {
    return whichTypedArray(value) === "Float32Array";
  }
  exports$32.isFloat32Array = isFloat32Array;
  function isFloat64Array(value) {
    return whichTypedArray(value) === "Float64Array";
  }
  exports$32.isFloat64Array = isFloat64Array;
  function isBigInt64Array(value) {
    return whichTypedArray(value) === "BigInt64Array";
  }
  exports$32.isBigInt64Array = isBigInt64Array;
  function isBigUint64Array(value) {
    return whichTypedArray(value) === "BigUint64Array";
  }
  exports$32.isBigUint64Array = isBigUint64Array;
  function isMapToString(value) {
    return ObjectToString(value) === "[object Map]";
  }
  isMapToString.working = typeof Map !== "undefined" && isMapToString(/* @__PURE__ */ new Map());
  function isMap(value) {
    if (typeof Map === "undefined") {
      return false;
    }
    return isMapToString.working ? isMapToString(value) : value instanceof Map;
  }
  exports$32.isMap = isMap;
  function isSetToString(value) {
    return ObjectToString(value) === "[object Set]";
  }
  isSetToString.working = typeof Set !== "undefined" && isSetToString(/* @__PURE__ */ new Set());
  function isSet(value) {
    if (typeof Set === "undefined") {
      return false;
    }
    return isSetToString.working ? isSetToString(value) : value instanceof Set;
  }
  exports$32.isSet = isSet;
  function isWeakMapToString(value) {
    return ObjectToString(value) === "[object WeakMap]";
  }
  isWeakMapToString.working = typeof WeakMap !== "undefined" && isWeakMapToString(/* @__PURE__ */ new WeakMap());
  function isWeakMap(value) {
    if (typeof WeakMap === "undefined") {
      return false;
    }
    return isWeakMapToString.working ? isWeakMapToString(value) : value instanceof WeakMap;
  }
  exports$32.isWeakMap = isWeakMap;
  function isWeakSetToString(value) {
    return ObjectToString(value) === "[object WeakSet]";
  }
  isWeakSetToString.working = typeof WeakSet !== "undefined" && isWeakSetToString(/* @__PURE__ */ new WeakSet());
  function isWeakSet(value) {
    return isWeakSetToString(value);
  }
  exports$32.isWeakSet = isWeakSet;
  function isArrayBufferToString(value) {
    return ObjectToString(value) === "[object ArrayBuffer]";
  }
  isArrayBufferToString.working = typeof ArrayBuffer !== "undefined" && isArrayBufferToString(new ArrayBuffer());
  function isArrayBuffer(value) {
    if (typeof ArrayBuffer === "undefined") {
      return false;
    }
    return isArrayBufferToString.working ? isArrayBufferToString(value) : value instanceof ArrayBuffer;
  }
  exports$32.isArrayBuffer = isArrayBuffer;
  function isDataViewToString(value) {
    return ObjectToString(value) === "[object DataView]";
  }
  isDataViewToString.working = typeof ArrayBuffer !== "undefined" && typeof DataView !== "undefined" && isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1));
  function isDataView(value) {
    if (typeof DataView === "undefined") {
      return false;
    }
    return isDataViewToString.working ? isDataViewToString(value) : value instanceof DataView;
  }
  exports$32.isDataView = isDataView;
  var SharedArrayBufferCopy = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : void 0;
  function isSharedArrayBufferToString(value) {
    return ObjectToString(value) === "[object SharedArrayBuffer]";
  }
  function isSharedArrayBuffer(value) {
    if (typeof SharedArrayBufferCopy === "undefined") {
      return false;
    }
    if (typeof isSharedArrayBufferToString.working === "undefined") {
      isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
    }
    return isSharedArrayBufferToString.working ? isSharedArrayBufferToString(value) : value instanceof SharedArrayBufferCopy;
  }
  exports$32.isSharedArrayBuffer = isSharedArrayBuffer;
  function isAsyncFunction(value) {
    return ObjectToString(value) === "[object AsyncFunction]";
  }
  exports$32.isAsyncFunction = isAsyncFunction;
  function isMapIterator(value) {
    return ObjectToString(value) === "[object Map Iterator]";
  }
  exports$32.isMapIterator = isMapIterator;
  function isSetIterator(value) {
    return ObjectToString(value) === "[object Set Iterator]";
  }
  exports$32.isSetIterator = isSetIterator;
  function isGeneratorObject(value) {
    return ObjectToString(value) === "[object Generator]";
  }
  exports$32.isGeneratorObject = isGeneratorObject;
  function isWebAssemblyCompiledModule(value) {
    return ObjectToString(value) === "[object WebAssembly.Module]";
  }
  exports$32.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;
  function isNumberObject(value) {
    return checkBoxedPrimitive(value, numberValue);
  }
  exports$32.isNumberObject = isNumberObject;
  function isStringObject(value) {
    return checkBoxedPrimitive(value, stringValue);
  }
  exports$32.isStringObject = isStringObject;
  function isBooleanObject(value) {
    return checkBoxedPrimitive(value, booleanValue);
  }
  exports$32.isBooleanObject = isBooleanObject;
  function isBigIntObject(value) {
    return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
  }
  exports$32.isBigIntObject = isBigIntObject;
  function isSymbolObject(value) {
    return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
  }
  exports$32.isSymbolObject = isSymbolObject;
  function isBoxedPrimitive(value) {
    return isNumberObject(value) || isStringObject(value) || isBooleanObject(value) || isBigIntObject(value) || isSymbolObject(value);
  }
  exports$32.isBoxedPrimitive = isBoxedPrimitive;
  function isAnyArrayBuffer(value) {
    return typeof Uint8Array !== "undefined" && (isArrayBuffer(value) || isSharedArrayBuffer(value));
  }
  exports$32.isAnyArrayBuffer = isAnyArrayBuffer;
  ["isProxy", "isExternal", "isModuleNamespaceObject"].forEach(function(method) {
    Object.defineProperty(exports$32, method, {
      enumerable: false,
      value: function() {
        throw new Error(method + " is not supported in userland");
      }
    });
  });
  return exports$32;
}
function dew$14() {
  if (_dewExec$14) return exports$24;
  _dewExec$14 = true;
  exports$24 = function isBuffer2(arg) {
    return arg && typeof arg === "object" && typeof arg.copy === "function" && typeof arg.fill === "function" && typeof arg.readUInt8 === "function";
  };
  return exports$24;
}
function dew6() {
  if (_dewExec6) return exports$15;
  _dewExec6 = true;
  var process$1 = process2;
  var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || function getOwnPropertyDescriptors2(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };
  var formatRegExp = /%[sdj%]/g;
  exports$15.format = function(f) {
    if (!isString2(f)) {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect2(arguments[i]));
      }
      return objects.join(" ");
    }
    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x2) {
      if (x2 === "%%") return "%";
      if (i >= len) return x2;
      switch (x2) {
        case "%s":
          return String(args[i++]);
        case "%d":
          return Number(args[i++]);
        case "%j":
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return "[Circular]";
          }
        default:
          return x2;
      }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
      if (isNull2(x) || !isObject2(x)) {
        str += " " + x;
      } else {
        str += " " + inspect2(x);
      }
    }
    return str;
  };
  exports$15.deprecate = function(fn, msg) {
    if (typeof process$1 !== "undefined" && process$1.noDeprecation === true) {
      return fn;
    }
    if (typeof process$1 === "undefined") {
      return function() {
        return exports$15.deprecate(fn, msg).apply(this || _global, arguments);
      };
    }
    var warned = false;
    function deprecated() {
      if (!warned) {
        if (process$1.throwDeprecation) {
          throw new Error(msg);
        } else if (process$1.traceDeprecation) {
          console.trace(msg);
        } else {
          console.error(msg);
        }
        warned = true;
      }
      return fn.apply(this || _global, arguments);
    }
    return deprecated;
  };
  var debugs = {};
  var debugEnvRegex = /^$/;
  if (process$1.env.NODE_DEBUG) {
    var debugEnv = process$1.env.NODE_DEBUG;
    debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*").replace(/,/g, "$|^").toUpperCase();
    debugEnvRegex = new RegExp("^" + debugEnv + "$", "i");
  }
  exports$15.debuglog = function(set) {
    set = set.toUpperCase();
    if (!debugs[set]) {
      if (debugEnvRegex.test(set)) {
        var pid3 = process$1.pid;
        debugs[set] = function() {
          var msg = exports$15.format.apply(exports$15, arguments);
          console.error("%s %d: %s", set, pid3, msg);
        };
      } else {
        debugs[set] = function() {
        };
      }
    }
    return debugs[set];
  };
  function inspect2(obj, opts) {
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    };
    if (arguments.length >= 3) ctx.depth = arguments[2];
    if (arguments.length >= 4) ctx.colors = arguments[3];
    if (isBoolean2(opts)) {
      ctx.showHidden = opts;
    } else if (opts) {
      exports$15._extend(ctx, opts);
    }
    if (isUndefined2(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined2(ctx.depth)) ctx.depth = 2;
    if (isUndefined2(ctx.colors)) ctx.colors = false;
    if (isUndefined2(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }
  exports$15.inspect = inspect2;
  inspect2.colors = {
    "bold": [1, 22],
    "italic": [3, 23],
    "underline": [4, 24],
    "inverse": [7, 27],
    "white": [37, 39],
    "grey": [90, 39],
    "black": [30, 39],
    "blue": [34, 39],
    "cyan": [36, 39],
    "green": [32, 39],
    "magenta": [35, 39],
    "red": [31, 39],
    "yellow": [33, 39]
  };
  inspect2.styles = {
    "special": "cyan",
    "number": "yellow",
    "boolean": "yellow",
    "undefined": "grey",
    "null": "bold",
    "string": "green",
    "date": "magenta",
    // "name": intentionally not styling
    "regexp": "red"
  };
  function stylizeWithColor(str, styleType) {
    var style = inspect2.styles[styleType];
    if (style) {
      return "\x1B[" + inspect2.colors[style][0] + "m" + str + "\x1B[" + inspect2.colors[style][1] + "m";
    } else {
      return str;
    }
  }
  function stylizeNoColor(str, styleType) {
    return str;
  }
  function arrayToHash(array) {
    var hash = {};
    array.forEach(function(val, idx) {
      hash[val] = true;
    });
    return hash;
  }
  function formatValue(ctx, value, recurseTimes) {
    if (ctx.customInspect && value && isFunction2(value.inspect) && // Filter out the util module, it's inspect function is special
    value.inspect !== exports$15.inspect && // Also filter out any prototype objects using the circular check.
    !(value.constructor && value.constructor.prototype === value)) {
      var ret = value.inspect(recurseTimes, ctx);
      if (!isString2(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }
      return ret;
    }
    var primitive = formatPrimitive(ctx, value);
    if (primitive) {
      return primitive;
    }
    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);
    if (ctx.showHidden) {
      keys = Object.getOwnPropertyNames(value);
    }
    if (isError2(value) && (keys.indexOf("message") >= 0 || keys.indexOf("description") >= 0)) {
      return formatError(value);
    }
    if (keys.length === 0) {
      if (isFunction2(value)) {
        var name2 = value.name ? ": " + value.name : "";
        return ctx.stylize("[Function" + name2 + "]", "special");
      }
      if (isRegExp2(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
      }
      if (isDate2(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), "date");
      }
      if (isError2(value)) {
        return formatError(value);
      }
    }
    var base = "", array = false, braces = ["{", "}"];
    if (isArray2(value)) {
      array = true;
      braces = ["[", "]"];
    }
    if (isFunction2(value)) {
      var n = value.name ? ": " + value.name : "";
      base = " [Function" + n + "]";
    }
    if (isRegExp2(value)) {
      base = " " + RegExp.prototype.toString.call(value);
    }
    if (isDate2(value)) {
      base = " " + Date.prototype.toUTCString.call(value);
    }
    if (isError2(value)) {
      base = " " + formatError(value);
    }
    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }
    if (recurseTimes < 0) {
      if (isRegExp2(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
      } else {
        return ctx.stylize("[Object]", "special");
      }
    }
    ctx.seen.push(value);
    var output;
    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function(key) {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }
    ctx.seen.pop();
    return reduceToSingleString(output, base, braces);
  }
  function formatPrimitive(ctx, value) {
    if (isUndefined2(value)) return ctx.stylize("undefined", "undefined");
    if (isString2(value)) {
      var simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
      return ctx.stylize(simple, "string");
    }
    if (isNumber2(value)) return ctx.stylize("" + value, "number");
    if (isBoolean2(value)) return ctx.stylize("" + value, "boolean");
    if (isNull2(value)) return ctx.stylize("null", "null");
  }
  function formatError(value) {
    return "[" + Error.prototype.toString.call(value) + "]";
  }
  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];
    for (var i = 0, l = value.length; i < l; ++i) {
      if (hasOwnProperty(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
      } else {
        output.push("");
      }
    }
    keys.forEach(function(key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
      }
    });
    return output;
  }
  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name2, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || {
      value: value[key]
    };
    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize("[Getter/Setter]", "special");
      } else {
        str = ctx.stylize("[Getter]", "special");
      }
    } else {
      if (desc.set) {
        str = ctx.stylize("[Setter]", "special");
      }
    }
    if (!hasOwnProperty(visibleKeys, key)) {
      name2 = "[" + key + "]";
    }
    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull2(recurseTimes)) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }
        if (str.indexOf("\n") > -1) {
          if (array) {
            str = str.split("\n").map(function(line) {
              return "  " + line;
            }).join("\n").slice(2);
          } else {
            str = "\n" + str.split("\n").map(function(line) {
              return "   " + line;
            }).join("\n");
          }
        }
      } else {
        str = ctx.stylize("[Circular]", "special");
      }
    }
    if (isUndefined2(name2)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }
      name2 = JSON.stringify("" + key);
      if (name2.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name2 = name2.slice(1, -1);
        name2 = ctx.stylize(name2, "name");
      } else {
        name2 = name2.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
        name2 = ctx.stylize(name2, "string");
      }
    }
    return name2 + ": " + str;
  }
  function reduceToSingleString(output, base, braces) {
    var length = output.reduce(function(prev, cur) {
      if (cur.indexOf("\n") >= 0) ;
      return prev + cur.replace(/\u001b\[\d\d?m/g, "").length + 1;
    }, 0);
    if (length > 60) {
      return braces[0] + (base === "" ? "" : base + "\n ") + " " + output.join(",\n  ") + " " + braces[1];
    }
    return braces[0] + base + " " + output.join(", ") + " " + braces[1];
  }
  exports$15.types = dew$23();
  function isArray2(ar) {
    return Array.isArray(ar);
  }
  exports$15.isArray = isArray2;
  function isBoolean2(arg) {
    return typeof arg === "boolean";
  }
  exports$15.isBoolean = isBoolean2;
  function isNull2(arg) {
    return arg === null;
  }
  exports$15.isNull = isNull2;
  function isNullOrUndefined2(arg) {
    return arg == null;
  }
  exports$15.isNullOrUndefined = isNullOrUndefined2;
  function isNumber2(arg) {
    return typeof arg === "number";
  }
  exports$15.isNumber = isNumber2;
  function isString2(arg) {
    return typeof arg === "string";
  }
  exports$15.isString = isString2;
  function isSymbol2(arg) {
    return typeof arg === "symbol";
  }
  exports$15.isSymbol = isSymbol2;
  function isUndefined2(arg) {
    return arg === void 0;
  }
  exports$15.isUndefined = isUndefined2;
  function isRegExp2(re) {
    return isObject2(re) && objectToString(re) === "[object RegExp]";
  }
  exports$15.isRegExp = isRegExp2;
  exports$15.types.isRegExp = isRegExp2;
  function isObject2(arg) {
    return typeof arg === "object" && arg !== null;
  }
  exports$15.isObject = isObject2;
  function isDate2(d) {
    return isObject2(d) && objectToString(d) === "[object Date]";
  }
  exports$15.isDate = isDate2;
  exports$15.types.isDate = isDate2;
  function isError2(e) {
    return isObject2(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
  }
  exports$15.isError = isError2;
  exports$15.types.isNativeError = isError2;
  function isFunction2(arg) {
    return typeof arg === "function";
  }
  exports$15.isFunction = isFunction2;
  function isPrimitive2(arg) {
    return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || // ES6 symbol
    typeof arg === "undefined";
  }
  exports$15.isPrimitive = isPrimitive2;
  exports$15.isBuffer = dew$14();
  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }
  function pad(n) {
    return n < 10 ? "0" + n.toString(10) : n.toString(10);
  }
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function timestamp() {
    var d = /* @__PURE__ */ new Date();
    var time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(":");
    return [d.getDate(), months[d.getMonth()], time].join(" ");
  }
  exports$15.log = function() {
    console.log("%s - %s", timestamp(), exports$15.format.apply(exports$15, arguments));
  };
  exports$15.inherits = dew5();
  exports$15._extend = function(origin, add) {
    if (!add || !isObject2(add)) return origin;
    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  };
  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
  var kCustomPromisifiedSymbol = typeof Symbol !== "undefined" ? /* @__PURE__ */ Symbol("util.promisify.custom") : void 0;
  exports$15.promisify = function promisify2(original) {
    if (typeof original !== "function") throw new TypeError('The "original" argument must be of type Function');
    if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
      fn = original[kCustomPromisifiedSymbol];
      if (typeof fn !== "function") {
        throw new TypeError('The "util.promisify.custom" argument must be of type Function');
      }
      Object.defineProperty(fn, kCustomPromisifiedSymbol, {
        value: fn,
        enumerable: false,
        writable: false,
        configurable: true
      });
      return fn;
    }
    function fn() {
      var promiseResolve, promiseReject;
      var promise = new Promise(function(resolve, reject) {
        promiseResolve = resolve;
        promiseReject = reject;
      });
      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      args.push(function(err, value) {
        if (err) {
          promiseReject(err);
        } else {
          promiseResolve(value);
        }
      });
      try {
        original.apply(this || _global, args);
      } catch (err) {
        promiseReject(err);
      }
      return promise;
    }
    Object.setPrototypeOf(fn, Object.getPrototypeOf(original));
    if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn,
      enumerable: false,
      writable: false,
      configurable: true
    });
    return Object.defineProperties(fn, getOwnPropertyDescriptors(original));
  };
  exports$15.promisify.custom = kCustomPromisifiedSymbol;
  function callbackifyOnRejected(reason, cb) {
    if (!reason) {
      var newReason = new Error("Promise was rejected with a falsy value");
      newReason.reason = reason;
      reason = newReason;
    }
    return cb(reason);
  }
  function callbackify2(original) {
    if (typeof original !== "function") {
      throw new TypeError('The "original" argument must be of type Function');
    }
    function callbackified() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      var maybeCb = args.pop();
      if (typeof maybeCb !== "function") {
        throw new TypeError("The last argument must be of type Function");
      }
      var self2 = this || _global;
      var cb = function() {
        return maybeCb.apply(self2, arguments);
      };
      original.apply(this || _global, args).then(function(ret) {
        process$1.nextTick(cb.bind(null, null, ret));
      }, function(rej) {
        process$1.nextTick(callbackifyOnRejected.bind(null, rej, cb));
      });
    }
    Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
    Object.defineProperties(callbackified, getOwnPropertyDescriptors(original));
    return callbackified;
  }
  exports$15.callbackify = callbackify2;
  return exports$15;
}
var exports$c2, _dewExec$b2, exports$b2, _dewExec$a2, exports$a2, _dewExec$92, exports$92, _dewExec$82, exports$82, _dewExec$72, exports$72, _dewExec$62, exports$62, _dewExec$52, _global$2, exports$52, _dewExec$42, _global$1, exports$42, _dewExec$32, exports$32, _dewExec$23, exports$24, _dewExec$14, exports$15, _dewExec6, _global, exports8, _extend, callbackify, debuglog, deprecate, format, inherits, inspect, isArray, isBoolean, isBuffer, isDate, isError, isFunction, isNull, isNullOrUndefined, isNumber, isObject, isPrimitive, isRegExp, isString, isSymbol, isUndefined, log, promisify, types, TextEncoder, TextDecoder2;
var init_util = __esm({
  "node_modules/@jspm/core/nodelibs/browser/util.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    init_chunk_DtcTpLWz();
    init_chunk_CkFCi_G1();
    init_chunk_DEMDiNwt();
    exports$c2 = {};
    _dewExec$b2 = false;
    exports$b2 = {};
    _dewExec$a2 = false;
    exports$a2 = {};
    _dewExec$92 = false;
    exports$92 = {};
    _dewExec$82 = false;
    exports$82 = {};
    _dewExec$72 = false;
    exports$72 = {};
    _dewExec$62 = false;
    exports$62 = {};
    _dewExec$52 = false;
    _global$2 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports$52 = {};
    _dewExec$42 = false;
    _global$1 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports$42 = {};
    _dewExec$32 = false;
    exports$32 = {};
    _dewExec$23 = false;
    exports$24 = {};
    _dewExec$14 = false;
    exports$15 = {};
    _dewExec6 = false;
    _global = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports8 = dew6();
    exports8["format"];
    exports8["deprecate"];
    exports8["debuglog"];
    exports8["inspect"];
    exports8["types"];
    exports8["isArray"];
    exports8["isBoolean"];
    exports8["isNull"];
    exports8["isNullOrUndefined"];
    exports8["isNumber"];
    exports8["isString"];
    exports8["isSymbol"];
    exports8["isUndefined"];
    exports8["isRegExp"];
    exports8["isObject"];
    exports8["isDate"];
    exports8["isError"];
    exports8["isFunction"];
    exports8["isPrimitive"];
    exports8["isBuffer"];
    exports8["log"];
    exports8["inherits"];
    exports8["_extend"];
    exports8["promisify"];
    exports8["callbackify"];
    _extend = exports8._extend;
    callbackify = exports8.callbackify;
    debuglog = exports8.debuglog;
    deprecate = exports8.deprecate;
    format = exports8.format;
    inherits = exports8.inherits;
    inspect = exports8.inspect;
    isArray = exports8.isArray;
    isBoolean = exports8.isBoolean;
    isBuffer = exports8.isBuffer;
    isDate = exports8.isDate;
    isError = exports8.isError;
    isFunction = exports8.isFunction;
    isNull = exports8.isNull;
    isNullOrUndefined = exports8.isNullOrUndefined;
    isNumber = exports8.isNumber;
    isObject = exports8.isObject;
    isPrimitive = exports8.isPrimitive;
    isRegExp = exports8.isRegExp;
    isString = exports8.isString;
    isSymbol = exports8.isSymbol;
    isUndefined = exports8.isUndefined;
    log = exports8.log;
    promisify = exports8.promisify;
    types = exports8.types;
    TextEncoder = exports8.TextEncoder = globalThis.TextEncoder;
    TextDecoder2 = exports8.TextDecoder = globalThis.TextDecoder;
  }
});

// node_modules/@jspm/core/nodelibs/browser/stream.js
var stream_exports = {};
__export(stream_exports, {
  Duplex: () => Duplex,
  PassThrough: () => PassThrough,
  Readable: () => Readable,
  Stream: () => Stream,
  Transform: () => Transform,
  Writable: () => Writable,
  default: () => exports9,
  finished: () => finished,
  pipeline: () => pipeline,
  promises: () => promises
});
function dew$o() {
  if (_dewExec$o) return exports$p;
  _dewExec$o = true;
  exports$p = {
    ArrayIsArray(self2) {
      return Array.isArray(self2);
    },
    ArrayPrototypeIncludes(self2, el) {
      return self2.includes(el);
    },
    ArrayPrototypeIndexOf(self2, el) {
      return self2.indexOf(el);
    },
    ArrayPrototypeJoin(self2, sep) {
      return self2.join(sep);
    },
    ArrayPrototypeMap(self2, fn) {
      return self2.map(fn);
    },
    ArrayPrototypePop(self2, el) {
      return self2.pop(el);
    },
    ArrayPrototypePush(self2, el) {
      return self2.push(el);
    },
    ArrayPrototypeSlice(self2, start, end) {
      return self2.slice(start, end);
    },
    Error,
    FunctionPrototypeCall(fn, thisArgs, ...args) {
      return fn.call(thisArgs, ...args);
    },
    FunctionPrototypeSymbolHasInstance(self2, instance) {
      return Function.prototype[Symbol.hasInstance].call(self2, instance);
    },
    MathFloor: Math.floor,
    Number,
    NumberIsInteger: Number.isInteger,
    NumberIsNaN: Number.isNaN,
    NumberMAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    NumberMIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
    NumberParseInt: Number.parseInt,
    ObjectDefineProperties(self2, props) {
      return Object.defineProperties(self2, props);
    },
    ObjectDefineProperty(self2, name2, prop) {
      return Object.defineProperty(self2, name2, prop);
    },
    ObjectGetOwnPropertyDescriptor(self2, name2) {
      return Object.getOwnPropertyDescriptor(self2, name2);
    },
    ObjectKeys(obj) {
      return Object.keys(obj);
    },
    ObjectSetPrototypeOf(target, proto) {
      return Object.setPrototypeOf(target, proto);
    },
    Promise,
    PromisePrototypeCatch(self2, fn) {
      return self2.catch(fn);
    },
    PromisePrototypeThen(self2, thenFn, catchFn) {
      return self2.then(thenFn, catchFn);
    },
    PromiseReject(err) {
      return Promise.reject(err);
    },
    PromiseResolve(val) {
      return Promise.resolve(val);
    },
    ReflectApply: Reflect.apply,
    RegExpPrototypeTest(self2, value) {
      return self2.test(value);
    },
    SafeSet: Set,
    String,
    StringPrototypeSlice(self2, start, end) {
      return self2.slice(start, end);
    },
    StringPrototypeToLowerCase(self2) {
      return self2.toLowerCase();
    },
    StringPrototypeToUpperCase(self2) {
      return self2.toUpperCase();
    },
    StringPrototypeTrim(self2) {
      return self2.trim();
    },
    Symbol,
    SymbolFor: Symbol.for,
    SymbolAsyncIterator: Symbol.asyncIterator,
    SymbolHasInstance: Symbol.hasInstance,
    SymbolIterator: Symbol.iterator,
    SymbolDispose: Symbol.dispose || /* @__PURE__ */ Symbol("Symbol.dispose"),
    SymbolAsyncDispose: Symbol.asyncDispose || /* @__PURE__ */ Symbol("Symbol.asyncDispose"),
    TypedArrayPrototypeSet(self2, buf, len) {
      return self2.set(buf, len);
    },
    Boolean,
    Uint8Array
  };
  return exports$p;
}
function dew$n() {
  if (_dewExec$n) return exports$o;
  _dewExec$n = true;
  const {
    AbortController,
    AbortSignal
  } = typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : (
    /* otherwise */
    void 0
  );
  exports$o = AbortController;
  exports$o.AbortSignal = AbortSignal;
  exports$o.default = AbortController;
  return exports$o;
}
function dew$m() {
  if (_dewExec$m) return exports$n;
  _dewExec$m = true;
  const bufferModule = dew();
  const {
    kResistStopPropagation,
    SymbolDispose
  } = dew$o();
  const AbortSignal = globalThis.AbortSignal || dew$n().AbortSignal;
  const AbortController = globalThis.AbortController || dew$n().AbortController;
  const AsyncFunction = Object.getPrototypeOf(async function() {
  }).constructor;
  const Blob = globalThis.Blob || bufferModule.Blob;
  const isBlob = typeof Blob !== "undefined" ? function isBlob2(b) {
    return b instanceof Blob;
  } : function isBlob2(b) {
    return false;
  };
  const validateAbortSignal = (signal, name2) => {
    if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
      throw new ERR_INVALID_ARG_TYPE(name2, "AbortSignal", signal);
    }
  };
  const validateFunction = (value, name2) => {
    if (typeof value !== "function") throw new ERR_INVALID_ARG_TYPE(name2, "Function", value);
  };
  class AggregateError2 extends Error {
    constructor(errors) {
      if (!Array.isArray(errors)) {
        throw new TypeError(`Expected input to be an Array, got ${typeof errors}`);
      }
      let message = "";
      for (let i = 0; i < errors.length; i++) {
        message += `    ${errors[i].stack}
`;
      }
      super(message);
      this.name = "AggregateError";
      this.errors = errors;
    }
  }
  exports$n = {
    AggregateError: AggregateError2,
    kEmptyObject: Object.freeze({}),
    once(callback) {
      let called = false;
      return function(...args) {
        if (called) {
          return;
        }
        called = true;
        callback.apply(this, args);
      };
    },
    createDeferredPromise: function() {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return {
        promise,
        resolve,
        reject
      };
    },
    promisify(fn) {
      return new Promise((resolve, reject) => {
        fn((err, ...args) => {
          if (err) {
            return reject(err);
          }
          return resolve(...args);
        });
      });
    },
    debuglog() {
      return function() {
      };
    },
    format(format2, ...args) {
      return format2.replace(/%([sdifj])/g, function(...[_unused, type]) {
        const replacement = args.shift();
        if (type === "f") {
          return replacement.toFixed(6);
        } else if (type === "j") {
          return JSON.stringify(replacement);
        } else if (type === "s" && typeof replacement === "object") {
          const ctor = replacement.constructor !== Object ? replacement.constructor.name : "";
          return `${ctor} {}`.trim();
        } else {
          return replacement.toString();
        }
      });
    },
    inspect(value) {
      switch (typeof value) {
        case "string":
          if (value.includes("'")) {
            if (!value.includes('"')) {
              return `"${value}"`;
            } else if (!value.includes("`") && !value.includes("${")) {
              return `\`${value}\``;
            }
          }
          return `'${value}'`;
        case "number":
          if (isNaN(value)) {
            return "NaN";
          } else if (Object.is(value, -0)) {
            return String(value);
          }
          return value;
        case "bigint":
          return `${String(value)}n`;
        case "boolean":
        case "undefined":
          return String(value);
        case "object":
          return "{}";
      }
    },
    types: {
      isAsyncFunction(fn) {
        return fn instanceof AsyncFunction;
      },
      isArrayBufferView(arr) {
        return ArrayBuffer.isView(arr);
      }
    },
    isBlob,
    deprecate(fn, message) {
      return fn;
    },
    addAbortListener: exports4.addAbortListener || function addAbortListener(signal, listener) {
      if (signal === void 0) {
        throw new ERR_INVALID_ARG_TYPE("signal", "AbortSignal", signal);
      }
      validateAbortSignal(signal, "signal");
      validateFunction(listener, "listener");
      let removeEventListener;
      if (signal.aborted) {
        queueMicrotask(() => listener());
      } else {
        signal.addEventListener("abort", listener, {
          __proto__: null,
          once: true,
          [kResistStopPropagation]: true
        });
        removeEventListener = () => {
          signal.removeEventListener("abort", listener);
        };
      }
      return {
        __proto__: null,
        [SymbolDispose]() {
          var _removeEventListener;
          (_removeEventListener = removeEventListener) === null || _removeEventListener === void 0 ? void 0 : _removeEventListener();
        }
      };
    },
    AbortSignalAny: AbortSignal.any || function AbortSignalAny(signals) {
      if (signals.length === 1) {
        return signals[0];
      }
      const ac = new AbortController();
      const abort3 = () => ac.abort();
      signals.forEach((signal) => {
        validateAbortSignal(signal, "signals");
        signal.addEventListener("abort", abort3, {
          once: true
        });
      });
      ac.signal.addEventListener("abort", () => {
        signals.forEach((signal) => signal.removeEventListener("abort", abort3));
      }, {
        once: true
      });
      return ac.signal;
    }
  };
  exports$n.promisify.custom = /* @__PURE__ */ Symbol.for("nodejs.util.promisify.custom");
  return exports$n;
}
function dew$l() {
  if (_dewExec$l) return exports$m;
  _dewExec$l = true;
  const {
    format: format2,
    inspect: inspect2,
    AggregateError: CustomAggregateError
  } = dew$m();
  const AggregateError2 = globalThis.AggregateError || CustomAggregateError;
  const kIsNodeError = /* @__PURE__ */ Symbol("kIsNodeError");
  const kTypes = [
    "string",
    "function",
    "number",
    "object",
    // Accept 'Function' and 'Object' as alternative to the lower cased version.
    "Function",
    "Object",
    "boolean",
    "bigint",
    "symbol"
  ];
  const classRegExp = /^([A-Z][a-z0-9]*)+$/;
  const nodeInternalPrefix = "__node_internal_";
  const codes = {};
  function assert3(value, message) {
    if (!value) {
      throw new codes.ERR_INTERNAL_ASSERTION(message);
    }
  }
  function addNumericalSeparator(val) {
    let res = "";
    let i = val.length;
    const start = val[0] === "-" ? 1 : 0;
    for (; i >= start + 4; i -= 3) {
      res = `_${val.slice(i - 3, i)}${res}`;
    }
    return `${val.slice(0, i)}${res}`;
  }
  function getMessage(key, msg, args) {
    if (typeof msg === "function") {
      assert3(
        msg.length <= args.length,
        // Default options do not count.
        `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${msg.length}).`
      );
      return msg(...args);
    }
    const expectedLength = (msg.match(/%[dfijoOs]/g) || []).length;
    assert3(expectedLength === args.length, `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${expectedLength}).`);
    if (args.length === 0) {
      return msg;
    }
    return format2(msg, ...args);
  }
  function E(code, message, Base) {
    if (!Base) {
      Base = Error;
    }
    class NodeError extends Base {
      constructor(...args) {
        super(getMessage(code, message, args));
      }
      toString() {
        return `${this.name} [${code}]: ${this.message}`;
      }
    }
    Object.defineProperties(NodeError.prototype, {
      name: {
        value: Base.name,
        writable: true,
        enumerable: false,
        configurable: true
      },
      toString: {
        value() {
          return `${this.name} [${code}]: ${this.message}`;
        },
        writable: true,
        enumerable: false,
        configurable: true
      }
    });
    NodeError.prototype.code = code;
    NodeError.prototype[kIsNodeError] = true;
    codes[code] = NodeError;
  }
  function hideStackFrames(fn) {
    const hidden = nodeInternalPrefix + fn.name;
    Object.defineProperty(fn, "name", {
      value: hidden
    });
    return fn;
  }
  function aggregateTwoErrors(innerError, outerError) {
    if (innerError && outerError && innerError !== outerError) {
      if (Array.isArray(outerError.errors)) {
        outerError.errors.push(innerError);
        return outerError;
      }
      const err = new AggregateError2([outerError, innerError], outerError.message);
      err.code = outerError.code;
      return err;
    }
    return innerError || outerError;
  }
  class AbortError extends Error {
    constructor(message = "The operation was aborted", options = void 0) {
      if (options !== void 0 && typeof options !== "object") {
        throw new codes.ERR_INVALID_ARG_TYPE("options", "Object", options);
      }
      super(message, options);
      this.code = "ABORT_ERR";
      this.name = "AbortError";
    }
  }
  E("ERR_ASSERTION", "%s", Error);
  E("ERR_INVALID_ARG_TYPE", (name2, expected, actual) => {
    assert3(typeof name2 === "string", "'name' must be a string");
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    let msg = "The ";
    if (name2.endsWith(" argument")) {
      msg += `${name2} `;
    } else {
      msg += `"${name2}" ${name2.includes(".") ? "property" : "argument"} `;
    }
    msg += "must be ";
    const types2 = [];
    const instances = [];
    const other = [];
    for (const value of expected) {
      assert3(typeof value === "string", "All expected entries have to be of type string");
      if (kTypes.includes(value)) {
        types2.push(value.toLowerCase());
      } else if (classRegExp.test(value)) {
        instances.push(value);
      } else {
        assert3(value !== "object", 'The value "object" should be written as "Object"');
        other.push(value);
      }
    }
    if (instances.length > 0) {
      const pos = types2.indexOf("object");
      if (pos !== -1) {
        types2.splice(types2, pos, 1);
        instances.push("Object");
      }
    }
    if (types2.length > 0) {
      switch (types2.length) {
        case 1:
          msg += `of type ${types2[0]}`;
          break;
        case 2:
          msg += `one of type ${types2[0]} or ${types2[1]}`;
          break;
        default: {
          const last = types2.pop();
          msg += `one of type ${types2.join(", ")}, or ${last}`;
        }
      }
      if (instances.length > 0 || other.length > 0) {
        msg += " or ";
      }
    }
    if (instances.length > 0) {
      switch (instances.length) {
        case 1:
          msg += `an instance of ${instances[0]}`;
          break;
        case 2:
          msg += `an instance of ${instances[0]} or ${instances[1]}`;
          break;
        default: {
          const last = instances.pop();
          msg += `an instance of ${instances.join(", ")}, or ${last}`;
        }
      }
      if (other.length > 0) {
        msg += " or ";
      }
    }
    switch (other.length) {
      case 0:
        break;
      case 1:
        if (other[0].toLowerCase() !== other[0]) {
          msg += "an ";
        }
        msg += `${other[0]}`;
        break;
      case 2:
        msg += `one of ${other[0]} or ${other[1]}`;
        break;
      default: {
        const last = other.pop();
        msg += `one of ${other.join(", ")}, or ${last}`;
      }
    }
    if (actual == null) {
      msg += `. Received ${actual}`;
    } else if (typeof actual === "function" && actual.name) {
      msg += `. Received function ${actual.name}`;
    } else if (typeof actual === "object") {
      var _actual$constructor;
      if ((_actual$constructor = actual.constructor) !== null && _actual$constructor !== void 0 && _actual$constructor.name) {
        msg += `. Received an instance of ${actual.constructor.name}`;
      } else {
        const inspected = inspect2(actual, {
          depth: -1
        });
        msg += `. Received ${inspected}`;
      }
    } else {
      let inspected = inspect2(actual, {
        colors: false
      });
      if (inspected.length > 25) {
        inspected = `${inspected.slice(0, 25)}...`;
      }
      msg += `. Received type ${typeof actual} (${inspected})`;
    }
    return msg;
  }, TypeError);
  E("ERR_INVALID_ARG_VALUE", (name2, value, reason = "is invalid") => {
    let inspected = inspect2(value);
    if (inspected.length > 128) {
      inspected = inspected.slice(0, 128) + "...";
    }
    const type = name2.includes(".") ? "property" : "argument";
    return `The ${type} '${name2}' ${reason}. Received ${inspected}`;
  }, TypeError);
  E("ERR_INVALID_RETURN_VALUE", (input, name2, value) => {
    var _value$constructor;
    const type = value !== null && value !== void 0 && (_value$constructor = value.constructor) !== null && _value$constructor !== void 0 && _value$constructor.name ? `instance of ${value.constructor.name}` : `type ${typeof value}`;
    return `Expected ${input} to be returned from the "${name2}" function but got ${type}.`;
  }, TypeError);
  E("ERR_MISSING_ARGS", (...args) => {
    assert3(args.length > 0, "At least one arg needs to be specified");
    let msg;
    const len = args.length;
    args = (Array.isArray(args) ? args : [args]).map((a) => `"${a}"`).join(" or ");
    switch (len) {
      case 1:
        msg += `The ${args[0]} argument`;
        break;
      case 2:
        msg += `The ${args[0]} and ${args[1]} arguments`;
        break;
      default:
        {
          const last = args.pop();
          msg += `The ${args.join(", ")}, and ${last} arguments`;
        }
        break;
    }
    return `${msg} must be specified`;
  }, TypeError);
  E("ERR_OUT_OF_RANGE", (str, range, input) => {
    assert3(range, 'Missing "range" argument');
    let received;
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input));
    } else if (typeof input === "bigint") {
      received = String(input);
      if (input > /* @__PURE__ */ BigInt("2") ** /* @__PURE__ */ BigInt("32") || input < -(/* @__PURE__ */ BigInt("2") ** /* @__PURE__ */ BigInt("32"))) {
        received = addNumericalSeparator(received);
      }
      received += "n";
    } else {
      received = inspect2(input);
    }
    return `The value of "${str}" is out of range. It must be ${range}. Received ${received}`;
  }, RangeError);
  E("ERR_MULTIPLE_CALLBACK", "Callback called multiple times", Error);
  E("ERR_METHOD_NOT_IMPLEMENTED", "The %s method is not implemented", Error);
  E("ERR_STREAM_ALREADY_FINISHED", "Cannot call %s after a stream was finished", Error);
  E("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable", Error);
  E("ERR_STREAM_DESTROYED", "Cannot call %s after a stream was destroyed", Error);
  E("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
  E("ERR_STREAM_PREMATURE_CLOSE", "Premature close", Error);
  E("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF", Error);
  E("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event", Error);
  E("ERR_STREAM_WRITE_AFTER_END", "write after end", Error);
  E("ERR_UNKNOWN_ENCODING", "Unknown encoding: %s", TypeError);
  exports$m = {
    AbortError,
    aggregateTwoErrors: hideStackFrames(aggregateTwoErrors),
    hideStackFrames,
    codes
  };
  return exports$m;
}
function dew$k2() {
  if (_dewExec$k2) return exports$l;
  _dewExec$k2 = true;
  const {
    ArrayIsArray,
    ArrayPrototypeIncludes,
    ArrayPrototypeJoin,
    ArrayPrototypeMap,
    NumberIsInteger,
    NumberIsNaN,
    NumberMAX_SAFE_INTEGER,
    NumberMIN_SAFE_INTEGER,
    NumberParseInt,
    ObjectPrototypeHasOwnProperty,
    RegExpPrototypeExec,
    String: String2,
    StringPrototypeToUpperCase,
    StringPrototypeTrim
  } = dew$o();
  const {
    hideStackFrames,
    codes: {
      ERR_SOCKET_BAD_PORT,
      ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2,
      ERR_INVALID_ARG_VALUE,
      ERR_OUT_OF_RANGE,
      ERR_UNKNOWN_SIGNAL
    }
  } = dew$l();
  const {
    normalizeEncoding
  } = dew$m();
  const {
    isAsyncFunction,
    isArrayBufferView
  } = dew$m().types;
  const signals = {};
  function isInt32(value) {
    return value === (value | 0);
  }
  function isUint32(value) {
    return value === value >>> 0;
  }
  const octalReg = /^[0-7]+$/;
  const modeDesc = "must be a 32-bit unsigned integer or an octal string";
  function parseFileMode(value, name2, def) {
    if (typeof value === "undefined") {
      value = def;
    }
    if (typeof value === "string") {
      if (RegExpPrototypeExec(octalReg, value) === null) {
        throw new ERR_INVALID_ARG_VALUE(name2, value, modeDesc);
      }
      value = NumberParseInt(value, 8);
    }
    validateUint32(value, name2);
    return value;
  }
  const validateInteger = hideStackFrames((value, name2, min = NumberMIN_SAFE_INTEGER, max = NumberMAX_SAFE_INTEGER) => {
    if (typeof value !== "number") throw new ERR_INVALID_ARG_TYPE2(name2, "number", value);
    if (!NumberIsInteger(value)) throw new ERR_OUT_OF_RANGE(name2, "an integer", value);
    if (value < min || value > max) throw new ERR_OUT_OF_RANGE(name2, `>= ${min} && <= ${max}`, value);
  });
  const validateInt32 = hideStackFrames((value, name2, min = -2147483648, max = 2147483647) => {
    if (typeof value !== "number") {
      throw new ERR_INVALID_ARG_TYPE2(name2, "number", value);
    }
    if (!NumberIsInteger(value)) {
      throw new ERR_OUT_OF_RANGE(name2, "an integer", value);
    }
    if (value < min || value > max) {
      throw new ERR_OUT_OF_RANGE(name2, `>= ${min} && <= ${max}`, value);
    }
  });
  const validateUint32 = hideStackFrames((value, name2, positive = false) => {
    if (typeof value !== "number") {
      throw new ERR_INVALID_ARG_TYPE2(name2, "number", value);
    }
    if (!NumberIsInteger(value)) {
      throw new ERR_OUT_OF_RANGE(name2, "an integer", value);
    }
    const min = positive ? 1 : 0;
    const max = 4294967295;
    if (value < min || value > max) {
      throw new ERR_OUT_OF_RANGE(name2, `>= ${min} && <= ${max}`, value);
    }
  });
  function validateString(value, name2) {
    if (typeof value !== "string") throw new ERR_INVALID_ARG_TYPE2(name2, "string", value);
  }
  function validateNumber(value, name2, min = void 0, max) {
    if (typeof value !== "number") throw new ERR_INVALID_ARG_TYPE2(name2, "number", value);
    if (min != null && value < min || max != null && value > max || (min != null || max != null) && NumberIsNaN(value)) {
      throw new ERR_OUT_OF_RANGE(name2, `${min != null ? `>= ${min}` : ""}${min != null && max != null ? " && " : ""}${max != null ? `<= ${max}` : ""}`, value);
    }
  }
  const validateOneOf = hideStackFrames((value, name2, oneOf) => {
    if (!ArrayPrototypeIncludes(oneOf, value)) {
      const allowed = ArrayPrototypeJoin(ArrayPrototypeMap(oneOf, (v) => typeof v === "string" ? `'${v}'` : String2(v)), ", ");
      const reason = "must be one of: " + allowed;
      throw new ERR_INVALID_ARG_VALUE(name2, value, reason);
    }
  });
  function validateBoolean(value, name2) {
    if (typeof value !== "boolean") throw new ERR_INVALID_ARG_TYPE2(name2, "boolean", value);
  }
  function getOwnPropertyValueOrDefault(options, key, defaultValue) {
    return options == null || !ObjectPrototypeHasOwnProperty(options, key) ? defaultValue : options[key];
  }
  const validateObject = hideStackFrames((value, name2, options = null) => {
    const allowArray = getOwnPropertyValueOrDefault(options, "allowArray", false);
    const allowFunction = getOwnPropertyValueOrDefault(options, "allowFunction", false);
    const nullable = getOwnPropertyValueOrDefault(options, "nullable", false);
    if (!nullable && value === null || !allowArray && ArrayIsArray(value) || typeof value !== "object" && (!allowFunction || typeof value !== "function")) {
      throw new ERR_INVALID_ARG_TYPE2(name2, "Object", value);
    }
  });
  const validateDictionary = hideStackFrames((value, name2) => {
    if (value != null && typeof value !== "object" && typeof value !== "function") {
      throw new ERR_INVALID_ARG_TYPE2(name2, "a dictionary", value);
    }
  });
  const validateArray = hideStackFrames((value, name2, minLength = 0) => {
    if (!ArrayIsArray(value)) {
      throw new ERR_INVALID_ARG_TYPE2(name2, "Array", value);
    }
    if (value.length < minLength) {
      const reason = `must be longer than ${minLength}`;
      throw new ERR_INVALID_ARG_VALUE(name2, value, reason);
    }
  });
  function validateStringArray(value, name2) {
    validateArray(value, name2);
    for (let i = 0; i < value.length; i++) {
      validateString(value[i], `${name2}[${i}]`);
    }
  }
  function validateBooleanArray(value, name2) {
    validateArray(value, name2);
    for (let i = 0; i < value.length; i++) {
      validateBoolean(value[i], `${name2}[${i}]`);
    }
  }
  function validateAbortSignalArray(value, name2) {
    validateArray(value, name2);
    for (let i = 0; i < value.length; i++) {
      const signal = value[i];
      const indexedName = `${name2}[${i}]`;
      if (signal == null) {
        throw new ERR_INVALID_ARG_TYPE2(indexedName, "AbortSignal", signal);
      }
      validateAbortSignal(signal, indexedName);
    }
  }
  function validateSignalName(signal, name2 = "signal") {
    validateString(signal, name2);
    if (signals[signal] === void 0) {
      if (signals[StringPrototypeToUpperCase(signal)] !== void 0) {
        throw new ERR_UNKNOWN_SIGNAL(signal + " (signals must use all capital letters)");
      }
      throw new ERR_UNKNOWN_SIGNAL(signal);
    }
  }
  const validateBuffer = hideStackFrames((buffer, name2 = "buffer") => {
    if (!isArrayBufferView(buffer)) {
      throw new ERR_INVALID_ARG_TYPE2(name2, ["Buffer", "TypedArray", "DataView"], buffer);
    }
  });
  function validateEncoding(data, encoding) {
    const normalizedEncoding = normalizeEncoding(encoding);
    const length = data.length;
    if (normalizedEncoding === "hex" && length % 2 !== 0) {
      throw new ERR_INVALID_ARG_VALUE("encoding", encoding, `is invalid for data of length ${length}`);
    }
  }
  function validatePort(port, name2 = "Port", allowZero = true) {
    if (typeof port !== "number" && typeof port !== "string" || typeof port === "string" && StringPrototypeTrim(port).length === 0 || +port !== +port >>> 0 || port > 65535 || port === 0 && !allowZero) {
      throw new ERR_SOCKET_BAD_PORT(name2, port, allowZero);
    }
    return port | 0;
  }
  const validateAbortSignal = hideStackFrames((signal, name2) => {
    if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
      throw new ERR_INVALID_ARG_TYPE2(name2, "AbortSignal", signal);
    }
  });
  const validateFunction = hideStackFrames((value, name2) => {
    if (typeof value !== "function") throw new ERR_INVALID_ARG_TYPE2(name2, "Function", value);
  });
  const validatePlainFunction = hideStackFrames((value, name2) => {
    if (typeof value !== "function" || isAsyncFunction(value)) throw new ERR_INVALID_ARG_TYPE2(name2, "Function", value);
  });
  const validateUndefined = hideStackFrames((value, name2) => {
    if (value !== void 0) throw new ERR_INVALID_ARG_TYPE2(name2, "undefined", value);
  });
  function validateUnion(value, name2, union) {
    if (!ArrayPrototypeIncludes(union, value)) {
      throw new ERR_INVALID_ARG_TYPE2(name2, `('${ArrayPrototypeJoin(union, "|")}')`, value);
    }
  }
  const linkValueRegExp = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/;
  function validateLinkHeaderFormat(value, name2) {
    if (typeof value === "undefined" || !RegExpPrototypeExec(linkValueRegExp, value)) {
      throw new ERR_INVALID_ARG_VALUE(name2, value, 'must be an array or string of format "</styles.css>; rel=preload; as=style"');
    }
  }
  function validateLinkHeaderValue(hints) {
    if (typeof hints === "string") {
      validateLinkHeaderFormat(hints, "hints");
      return hints;
    } else if (ArrayIsArray(hints)) {
      const hintsLength = hints.length;
      let result = "";
      if (hintsLength === 0) {
        return result;
      }
      for (let i = 0; i < hintsLength; i++) {
        const link = hints[i];
        validateLinkHeaderFormat(link, "hints");
        result += link;
        if (i !== hintsLength - 1) {
          result += ", ";
        }
      }
      return result;
    }
    throw new ERR_INVALID_ARG_VALUE("hints", hints, 'must be an array or string of format "</styles.css>; rel=preload; as=style"');
  }
  exports$l = {
    isInt32,
    isUint32,
    parseFileMode,
    validateArray,
    validateStringArray,
    validateBooleanArray,
    validateAbortSignalArray,
    validateBoolean,
    validateBuffer,
    validateDictionary,
    validateEncoding,
    validateFunction,
    validateInt32,
    validateInteger,
    validateNumber,
    validateObject,
    validateOneOf,
    validatePlainFunction,
    validatePort,
    validateSignalName,
    validateString,
    validateUint32,
    validateUndefined,
    validateUnion,
    validateAbortSignal,
    validateLinkHeaderValue
  };
  return exports$l;
}
function dew$j2() {
  if (_dewExec$j2) return exports$k2;
  _dewExec$j2 = true;
  const {
    SymbolAsyncIterator,
    SymbolIterator,
    SymbolFor
  } = dew$o();
  const kIsDestroyed = SymbolFor("nodejs.stream.destroyed");
  const kIsErrored = SymbolFor("nodejs.stream.errored");
  const kIsReadable = SymbolFor("nodejs.stream.readable");
  const kIsWritable = SymbolFor("nodejs.stream.writable");
  const kIsDisturbed = SymbolFor("nodejs.stream.disturbed");
  const kIsClosedPromise = SymbolFor("nodejs.webstream.isClosedPromise");
  const kControllerErrorFunction = SymbolFor("nodejs.webstream.controllerErrorFunction");
  function isReadableNodeStream(obj, strict = false) {
    var _obj$_readableState;
    return !!(obj && typeof obj.pipe === "function" && typeof obj.on === "function" && (!strict || typeof obj.pause === "function" && typeof obj.resume === "function") && (!obj._writableState || ((_obj$_readableState = obj._readableState) === null || _obj$_readableState === void 0 ? void 0 : _obj$_readableState.readable) !== false) && // Duplex
    (!obj._writableState || obj._readableState));
  }
  function isWritableNodeStream(obj) {
    var _obj$_writableState;
    return !!(obj && typeof obj.write === "function" && typeof obj.on === "function" && (!obj._readableState || ((_obj$_writableState = obj._writableState) === null || _obj$_writableState === void 0 ? void 0 : _obj$_writableState.writable) !== false));
  }
  function isDuplexNodeStream(obj) {
    return !!(obj && typeof obj.pipe === "function" && obj._readableState && typeof obj.on === "function" && typeof obj.write === "function");
  }
  function isNodeStream(obj) {
    return obj && (obj._readableState || obj._writableState || typeof obj.write === "function" && typeof obj.on === "function" || typeof obj.pipe === "function" && typeof obj.on === "function");
  }
  function isReadableStream(obj) {
    return !!(obj && !isNodeStream(obj) && typeof obj.pipeThrough === "function" && typeof obj.getReader === "function" && typeof obj.cancel === "function");
  }
  function isWritableStream(obj) {
    return !!(obj && !isNodeStream(obj) && typeof obj.getWriter === "function" && typeof obj.abort === "function");
  }
  function isTransformStream(obj) {
    return !!(obj && !isNodeStream(obj) && typeof obj.readable === "object" && typeof obj.writable === "object");
  }
  function isWebStream(obj) {
    return isReadableStream(obj) || isWritableStream(obj) || isTransformStream(obj);
  }
  function isIterable(obj, isAsync) {
    if (obj == null) return false;
    if (isAsync === true) return typeof obj[SymbolAsyncIterator] === "function";
    if (isAsync === false) return typeof obj[SymbolIterator] === "function";
    return typeof obj[SymbolAsyncIterator] === "function" || typeof obj[SymbolIterator] === "function";
  }
  function isDestroyed(stream) {
    if (!isNodeStream(stream)) return null;
    const wState = stream._writableState;
    const rState = stream._readableState;
    const state = wState || rState;
    return !!(stream.destroyed || stream[kIsDestroyed] || state !== null && state !== void 0 && state.destroyed);
  }
  function isWritableEnded(stream) {
    if (!isWritableNodeStream(stream)) return null;
    if (stream.writableEnded === true) return true;
    const wState = stream._writableState;
    if (wState !== null && wState !== void 0 && wState.errored) return false;
    if (typeof (wState === null || wState === void 0 ? void 0 : wState.ended) !== "boolean") return null;
    return wState.ended;
  }
  function isWritableFinished(stream, strict) {
    if (!isWritableNodeStream(stream)) return null;
    if (stream.writableFinished === true) return true;
    const wState = stream._writableState;
    if (wState !== null && wState !== void 0 && wState.errored) return false;
    if (typeof (wState === null || wState === void 0 ? void 0 : wState.finished) !== "boolean") return null;
    return !!(wState.finished || strict === false && wState.ended === true && wState.length === 0);
  }
  function isReadableEnded(stream) {
    if (!isReadableNodeStream(stream)) return null;
    if (stream.readableEnded === true) return true;
    const rState = stream._readableState;
    if (!rState || rState.errored) return false;
    if (typeof (rState === null || rState === void 0 ? void 0 : rState.ended) !== "boolean") return null;
    return rState.ended;
  }
  function isReadableFinished(stream, strict) {
    if (!isReadableNodeStream(stream)) return null;
    const rState = stream._readableState;
    if (rState !== null && rState !== void 0 && rState.errored) return false;
    if (typeof (rState === null || rState === void 0 ? void 0 : rState.endEmitted) !== "boolean") return null;
    return !!(rState.endEmitted || strict === false && rState.ended === true && rState.length === 0);
  }
  function isReadable(stream) {
    if (stream && stream[kIsReadable] != null) return stream[kIsReadable];
    if (typeof (stream === null || stream === void 0 ? void 0 : stream.readable) !== "boolean") return null;
    if (isDestroyed(stream)) return false;
    return isReadableNodeStream(stream) && stream.readable && !isReadableFinished(stream);
  }
  function isWritable(stream) {
    if (stream && stream[kIsWritable] != null) return stream[kIsWritable];
    if (typeof (stream === null || stream === void 0 ? void 0 : stream.writable) !== "boolean") return null;
    if (isDestroyed(stream)) return false;
    return isWritableNodeStream(stream) && stream.writable && !isWritableEnded(stream);
  }
  function isFinished(stream, opts) {
    if (!isNodeStream(stream)) {
      return null;
    }
    if (isDestroyed(stream)) {
      return true;
    }
    if ((opts === null || opts === void 0 ? void 0 : opts.readable) !== false && isReadable(stream)) {
      return false;
    }
    if ((opts === null || opts === void 0 ? void 0 : opts.writable) !== false && isWritable(stream)) {
      return false;
    }
    return true;
  }
  function isWritableErrored(stream) {
    var _stream$_writableStat, _stream$_writableStat2;
    if (!isNodeStream(stream)) {
      return null;
    }
    if (stream.writableErrored) {
      return stream.writableErrored;
    }
    return (_stream$_writableStat = (_stream$_writableStat2 = stream._writableState) === null || _stream$_writableStat2 === void 0 ? void 0 : _stream$_writableStat2.errored) !== null && _stream$_writableStat !== void 0 ? _stream$_writableStat : null;
  }
  function isReadableErrored(stream) {
    var _stream$_readableStat, _stream$_readableStat2;
    if (!isNodeStream(stream)) {
      return null;
    }
    if (stream.readableErrored) {
      return stream.readableErrored;
    }
    return (_stream$_readableStat = (_stream$_readableStat2 = stream._readableState) === null || _stream$_readableStat2 === void 0 ? void 0 : _stream$_readableStat2.errored) !== null && _stream$_readableStat !== void 0 ? _stream$_readableStat : null;
  }
  function isClosed(stream) {
    if (!isNodeStream(stream)) {
      return null;
    }
    if (typeof stream.closed === "boolean") {
      return stream.closed;
    }
    const wState = stream._writableState;
    const rState = stream._readableState;
    if (typeof (wState === null || wState === void 0 ? void 0 : wState.closed) === "boolean" || typeof (rState === null || rState === void 0 ? void 0 : rState.closed) === "boolean") {
      return (wState === null || wState === void 0 ? void 0 : wState.closed) || (rState === null || rState === void 0 ? void 0 : rState.closed);
    }
    if (typeof stream._closed === "boolean" && isOutgoingMessage(stream)) {
      return stream._closed;
    }
    return null;
  }
  function isOutgoingMessage(stream) {
    return typeof stream._closed === "boolean" && typeof stream._defaultKeepAlive === "boolean" && typeof stream._removedConnection === "boolean" && typeof stream._removedContLen === "boolean";
  }
  function isServerResponse(stream) {
    return typeof stream._sent100 === "boolean" && isOutgoingMessage(stream);
  }
  function isServerRequest(stream) {
    var _stream$req;
    return typeof stream._consuming === "boolean" && typeof stream._dumped === "boolean" && ((_stream$req = stream.req) === null || _stream$req === void 0 ? void 0 : _stream$req.upgradeOrConnect) === void 0;
  }
  function willEmitClose(stream) {
    if (!isNodeStream(stream)) return null;
    const wState = stream._writableState;
    const rState = stream._readableState;
    const state = wState || rState;
    return !state && isServerResponse(stream) || !!(state && state.autoDestroy && state.emitClose && state.closed === false);
  }
  function isDisturbed(stream) {
    var _stream$kIsDisturbed;
    return !!(stream && ((_stream$kIsDisturbed = stream[kIsDisturbed]) !== null && _stream$kIsDisturbed !== void 0 ? _stream$kIsDisturbed : stream.readableDidRead || stream.readableAborted));
  }
  function isErrored(stream) {
    var _ref, _ref2, _ref3, _ref4, _ref5, _stream$kIsErrored, _stream$_readableStat3, _stream$_writableStat3, _stream$_readableStat4, _stream$_writableStat4;
    return !!(stream && ((_ref = (_ref2 = (_ref3 = (_ref4 = (_ref5 = (_stream$kIsErrored = stream[kIsErrored]) !== null && _stream$kIsErrored !== void 0 ? _stream$kIsErrored : stream.readableErrored) !== null && _ref5 !== void 0 ? _ref5 : stream.writableErrored) !== null && _ref4 !== void 0 ? _ref4 : (_stream$_readableStat3 = stream._readableState) === null || _stream$_readableStat3 === void 0 ? void 0 : _stream$_readableStat3.errorEmitted) !== null && _ref3 !== void 0 ? _ref3 : (_stream$_writableStat3 = stream._writableState) === null || _stream$_writableStat3 === void 0 ? void 0 : _stream$_writableStat3.errorEmitted) !== null && _ref2 !== void 0 ? _ref2 : (_stream$_readableStat4 = stream._readableState) === null || _stream$_readableStat4 === void 0 ? void 0 : _stream$_readableStat4.errored) !== null && _ref !== void 0 ? _ref : (_stream$_writableStat4 = stream._writableState) === null || _stream$_writableStat4 === void 0 ? void 0 : _stream$_writableStat4.errored));
  }
  exports$k2 = {
    isDestroyed,
    kIsDestroyed,
    isDisturbed,
    kIsDisturbed,
    isErrored,
    kIsErrored,
    isReadable,
    kIsReadable,
    kIsClosedPromise,
    kControllerErrorFunction,
    kIsWritable,
    isClosed,
    isDuplexNodeStream,
    isFinished,
    isIterable,
    isReadableNodeStream,
    isReadableStream,
    isReadableEnded,
    isReadableFinished,
    isReadableErrored,
    isNodeStream,
    isWebStream,
    isWritable,
    isWritableNodeStream,
    isWritableStream,
    isWritableEnded,
    isWritableFinished,
    isWritableErrored,
    isServerRequest,
    isServerResponse,
    willEmitClose,
    isTransformStream
  };
  return exports$k2;
}
function dew$i2() {
  if (_dewExec$i2) return exports$j2;
  _dewExec$i2 = true;
  const process$1 = process2;
  const {
    AbortError,
    codes
  } = dew$l();
  const {
    ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2,
    ERR_STREAM_PREMATURE_CLOSE
  } = codes;
  const {
    kEmptyObject,
    once: once4
  } = dew$m();
  const {
    validateAbortSignal,
    validateFunction,
    validateObject,
    validateBoolean
  } = dew$k2();
  const {
    Promise: Promise2,
    PromisePrototypeThen,
    SymbolDispose
  } = dew$o();
  const {
    isClosed,
    isReadable,
    isReadableNodeStream,
    isReadableStream,
    isReadableFinished,
    isReadableErrored,
    isWritable,
    isWritableNodeStream,
    isWritableStream,
    isWritableFinished,
    isWritableErrored,
    isNodeStream,
    willEmitClose: _willEmitClose,
    kIsClosedPromise
  } = dew$j2();
  let addAbortListener;
  function isRequest(stream) {
    return stream.setHeader && typeof stream.abort === "function";
  }
  const nop = () => {
  };
  function eos(stream, options, callback) {
    var _options$readable, _options$writable;
    if (arguments.length === 2) {
      callback = options;
      options = kEmptyObject;
    } else if (options == null) {
      options = kEmptyObject;
    } else {
      validateObject(options, "options");
    }
    validateFunction(callback, "callback");
    validateAbortSignal(options.signal, "options.signal");
    callback = once4(callback);
    if (isReadableStream(stream) || isWritableStream(stream)) {
      return eosWeb(stream, options, callback);
    }
    if (!isNodeStream(stream)) {
      throw new ERR_INVALID_ARG_TYPE2("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
    }
    const readable = (_options$readable = options.readable) !== null && _options$readable !== void 0 ? _options$readable : isReadableNodeStream(stream);
    const writable = (_options$writable = options.writable) !== null && _options$writable !== void 0 ? _options$writable : isWritableNodeStream(stream);
    const wState = stream._writableState;
    const rState = stream._readableState;
    const onlegacyfinish = () => {
      if (!stream.writable) {
        onfinish();
      }
    };
    let willEmitClose = _willEmitClose(stream) && isReadableNodeStream(stream) === readable && isWritableNodeStream(stream) === writable;
    let writableFinished = isWritableFinished(stream, false);
    const onfinish = () => {
      writableFinished = true;
      if (stream.destroyed) {
        willEmitClose = false;
      }
      if (willEmitClose && (!stream.readable || readable)) {
        return;
      }
      if (!readable || readableFinished) {
        callback.call(stream);
      }
    };
    let readableFinished = isReadableFinished(stream, false);
    const onend = () => {
      readableFinished = true;
      if (stream.destroyed) {
        willEmitClose = false;
      }
      if (willEmitClose && (!stream.writable || writable)) {
        return;
      }
      if (!writable || writableFinished) {
        callback.call(stream);
      }
    };
    const onerror = (err) => {
      callback.call(stream, err);
    };
    let closed = isClosed(stream);
    const onclose = () => {
      closed = true;
      const errored = isWritableErrored(stream) || isReadableErrored(stream);
      if (errored && typeof errored !== "boolean") {
        return callback.call(stream, errored);
      }
      if (readable && !readableFinished && isReadableNodeStream(stream, true)) {
        if (!isReadableFinished(stream, false)) return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
      }
      if (writable && !writableFinished) {
        if (!isWritableFinished(stream, false)) return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
      }
      callback.call(stream);
    };
    const onclosed = () => {
      closed = true;
      const errored = isWritableErrored(stream) || isReadableErrored(stream);
      if (errored && typeof errored !== "boolean") {
        return callback.call(stream, errored);
      }
      callback.call(stream);
    };
    const onrequest = () => {
      stream.req.on("finish", onfinish);
    };
    if (isRequest(stream)) {
      stream.on("complete", onfinish);
      if (!willEmitClose) {
        stream.on("abort", onclose);
      }
      if (stream.req) {
        onrequest();
      } else {
        stream.on("request", onrequest);
      }
    } else if (writable && !wState) {
      stream.on("end", onlegacyfinish);
      stream.on("close", onlegacyfinish);
    }
    if (!willEmitClose && typeof stream.aborted === "boolean") {
      stream.on("aborted", onclose);
    }
    stream.on("end", onend);
    stream.on("finish", onfinish);
    if (options.error !== false) {
      stream.on("error", onerror);
    }
    stream.on("close", onclose);
    if (closed) {
      process$1.nextTick(onclose);
    } else if (wState !== null && wState !== void 0 && wState.errorEmitted || rState !== null && rState !== void 0 && rState.errorEmitted) {
      if (!willEmitClose) {
        process$1.nextTick(onclosed);
      }
    } else if (!readable && (!willEmitClose || isReadable(stream)) && (writableFinished || isWritable(stream) === false)) {
      process$1.nextTick(onclosed);
    } else if (!writable && (!willEmitClose || isWritable(stream)) && (readableFinished || isReadable(stream) === false)) {
      process$1.nextTick(onclosed);
    } else if (rState && stream.req && stream.aborted) {
      process$1.nextTick(onclosed);
    }
    const cleanup = () => {
      callback = nop;
      stream.removeListener("aborted", onclose);
      stream.removeListener("complete", onfinish);
      stream.removeListener("abort", onclose);
      stream.removeListener("request", onrequest);
      if (stream.req) stream.req.removeListener("finish", onfinish);
      stream.removeListener("end", onlegacyfinish);
      stream.removeListener("close", onlegacyfinish);
      stream.removeListener("finish", onfinish);
      stream.removeListener("end", onend);
      stream.removeListener("error", onerror);
      stream.removeListener("close", onclose);
    };
    if (options.signal && !closed) {
      const abort3 = () => {
        const endCallback = callback;
        cleanup();
        endCallback.call(stream, new AbortError(void 0, {
          cause: options.signal.reason
        }));
      };
      if (options.signal.aborted) {
        process$1.nextTick(abort3);
      } else {
        addAbortListener = addAbortListener || dew$m().addAbortListener;
        const disposable = addAbortListener(options.signal, abort3);
        const originalCallback = callback;
        callback = once4((...args) => {
          disposable[SymbolDispose]();
          originalCallback.apply(stream, args);
        });
      }
    }
    return cleanup;
  }
  function eosWeb(stream, options, callback) {
    let isAborted = false;
    let abort3 = nop;
    if (options.signal) {
      abort3 = () => {
        isAborted = true;
        callback.call(stream, new AbortError(void 0, {
          cause: options.signal.reason
        }));
      };
      if (options.signal.aborted) {
        process$1.nextTick(abort3);
      } else {
        addAbortListener = addAbortListener || dew$m().addAbortListener;
        const disposable = addAbortListener(options.signal, abort3);
        const originalCallback = callback;
        callback = once4((...args) => {
          disposable[SymbolDispose]();
          originalCallback.apply(stream, args);
        });
      }
    }
    const resolverFn = (...args) => {
      if (!isAborted) {
        process$1.nextTick(() => callback.apply(stream, args));
      }
    };
    PromisePrototypeThen(stream[kIsClosedPromise].promise, resolverFn, resolverFn);
    return nop;
  }
  function finished2(stream, opts) {
    var _opts;
    let autoCleanup = false;
    if (opts === null) {
      opts = kEmptyObject;
    }
    if ((_opts = opts) !== null && _opts !== void 0 && _opts.cleanup) {
      validateBoolean(opts.cleanup, "cleanup");
      autoCleanup = opts.cleanup;
    }
    return new Promise2((resolve, reject) => {
      const cleanup = eos(stream, opts, (err) => {
        if (autoCleanup) {
          cleanup();
        }
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  exports$j2 = eos;
  exports$j2.finished = finished2;
  return exports$j2;
}
function dew$h2() {
  if (_dewExec$h2) return exports$i2;
  _dewExec$h2 = true;
  const process$1 = process2;
  const {
    aggregateTwoErrors,
    codes: {
      ERR_MULTIPLE_CALLBACK
    },
    AbortError
  } = dew$l();
  const {
    Symbol: Symbol2
  } = dew$o();
  const {
    kIsDestroyed,
    isDestroyed,
    isFinished,
    isServerRequest
  } = dew$j2();
  const kDestroy = Symbol2("kDestroy");
  const kConstruct = Symbol2("kConstruct");
  function checkError(err, w, r) {
    if (err) {
      err.stack;
      if (w && !w.errored) {
        w.errored = err;
      }
      if (r && !r.errored) {
        r.errored = err;
      }
    }
  }
  function destroy(err, cb) {
    const r = this._readableState;
    const w = this._writableState;
    const s = w || r;
    if (w !== null && w !== void 0 && w.destroyed || r !== null && r !== void 0 && r.destroyed) {
      if (typeof cb === "function") {
        cb();
      }
      return this;
    }
    checkError(err, w, r);
    if (w) {
      w.destroyed = true;
    }
    if (r) {
      r.destroyed = true;
    }
    if (!s.constructed) {
      this.once(kDestroy, function(er) {
        _destroy(this, aggregateTwoErrors(er, err), cb);
      });
    } else {
      _destroy(this, err, cb);
    }
    return this;
  }
  function _destroy(self2, err, cb) {
    let called = false;
    function onDestroy(err2) {
      if (called) {
        return;
      }
      called = true;
      const r = self2._readableState;
      const w = self2._writableState;
      checkError(err2, w, r);
      if (w) {
        w.closed = true;
      }
      if (r) {
        r.closed = true;
      }
      if (typeof cb === "function") {
        cb(err2);
      }
      if (err2) {
        process$1.nextTick(emitErrorCloseNT, self2, err2);
      } else {
        process$1.nextTick(emitCloseNT, self2);
      }
    }
    try {
      self2._destroy(err || null, onDestroy);
    } catch (err2) {
      onDestroy(err2);
    }
  }
  function emitErrorCloseNT(self2, err) {
    emitErrorNT(self2, err);
    emitCloseNT(self2);
  }
  function emitCloseNT(self2) {
    const r = self2._readableState;
    const w = self2._writableState;
    if (w) {
      w.closeEmitted = true;
    }
    if (r) {
      r.closeEmitted = true;
    }
    if (w !== null && w !== void 0 && w.emitClose || r !== null && r !== void 0 && r.emitClose) {
      self2.emit("close");
    }
  }
  function emitErrorNT(self2, err) {
    const r = self2._readableState;
    const w = self2._writableState;
    if (w !== null && w !== void 0 && w.errorEmitted || r !== null && r !== void 0 && r.errorEmitted) {
      return;
    }
    if (w) {
      w.errorEmitted = true;
    }
    if (r) {
      r.errorEmitted = true;
    }
    self2.emit("error", err);
  }
  function undestroy() {
    const r = this._readableState;
    const w = this._writableState;
    if (r) {
      r.constructed = true;
      r.closed = false;
      r.closeEmitted = false;
      r.destroyed = false;
      r.errored = null;
      r.errorEmitted = false;
      r.reading = false;
      r.ended = r.readable === false;
      r.endEmitted = r.readable === false;
    }
    if (w) {
      w.constructed = true;
      w.destroyed = false;
      w.closed = false;
      w.closeEmitted = false;
      w.errored = null;
      w.errorEmitted = false;
      w.finalCalled = false;
      w.prefinished = false;
      w.ended = w.writable === false;
      w.ending = w.writable === false;
      w.finished = w.writable === false;
    }
  }
  function errorOrDestroy(stream, err, sync) {
    const r = stream._readableState;
    const w = stream._writableState;
    if (w !== null && w !== void 0 && w.destroyed || r !== null && r !== void 0 && r.destroyed) {
      return this;
    }
    if (r !== null && r !== void 0 && r.autoDestroy || w !== null && w !== void 0 && w.autoDestroy) stream.destroy(err);
    else if (err) {
      err.stack;
      if (w && !w.errored) {
        w.errored = err;
      }
      if (r && !r.errored) {
        r.errored = err;
      }
      if (sync) {
        process$1.nextTick(emitErrorNT, stream, err);
      } else {
        emitErrorNT(stream, err);
      }
    }
  }
  function construct(stream, cb) {
    if (typeof stream._construct !== "function") {
      return;
    }
    const r = stream._readableState;
    const w = stream._writableState;
    if (r) {
      r.constructed = false;
    }
    if (w) {
      w.constructed = false;
    }
    stream.once(kConstruct, cb);
    if (stream.listenerCount(kConstruct) > 1) {
      return;
    }
    process$1.nextTick(constructNT, stream);
  }
  function constructNT(stream) {
    let called = false;
    function onConstruct(err) {
      if (called) {
        errorOrDestroy(stream, err !== null && err !== void 0 ? err : new ERR_MULTIPLE_CALLBACK());
        return;
      }
      called = true;
      const r = stream._readableState;
      const w = stream._writableState;
      const s = w || r;
      if (r) {
        r.constructed = true;
      }
      if (w) {
        w.constructed = true;
      }
      if (s.destroyed) {
        stream.emit(kDestroy, err);
      } else if (err) {
        errorOrDestroy(stream, err, true);
      } else {
        process$1.nextTick(emitConstructNT, stream);
      }
    }
    try {
      stream._construct((err) => {
        process$1.nextTick(onConstruct, err);
      });
    } catch (err) {
      process$1.nextTick(onConstruct, err);
    }
  }
  function emitConstructNT(stream) {
    stream.emit(kConstruct);
  }
  function isRequest(stream) {
    return (stream === null || stream === void 0 ? void 0 : stream.setHeader) && typeof stream.abort === "function";
  }
  function emitCloseLegacy(stream) {
    stream.emit("close");
  }
  function emitErrorCloseLegacy(stream, err) {
    stream.emit("error", err);
    process$1.nextTick(emitCloseLegacy, stream);
  }
  function destroyer(stream, err) {
    if (!stream || isDestroyed(stream)) {
      return;
    }
    if (!err && !isFinished(stream)) {
      err = new AbortError();
    }
    if (isServerRequest(stream)) {
      stream.socket = null;
      stream.destroy(err);
    } else if (isRequest(stream)) {
      stream.abort();
    } else if (isRequest(stream.req)) {
      stream.req.abort();
    } else if (typeof stream.destroy === "function") {
      stream.destroy(err);
    } else if (typeof stream.close === "function") {
      stream.close();
    } else if (err) {
      process$1.nextTick(emitErrorCloseLegacy, stream, err);
    } else {
      process$1.nextTick(emitCloseLegacy, stream);
    }
    if (!stream.destroyed) {
      stream[kIsDestroyed] = true;
    }
  }
  exports$i2 = {
    construct,
    destroyer,
    destroy,
    undestroy,
    errorOrDestroy
  };
  return exports$i2;
}
function dew$g2() {
  if (_dewExec$g2) return exports$h2;
  _dewExec$g2 = true;
  const {
    ArrayIsArray,
    ObjectSetPrototypeOf
  } = dew$o();
  const {
    EventEmitter: EE
  } = exports4;
  function Stream2(opts) {
    EE.call(this, opts);
  }
  ObjectSetPrototypeOf(Stream2.prototype, EE.prototype);
  ObjectSetPrototypeOf(Stream2, EE);
  Stream2.prototype.pipe = function(dest, options) {
    const source = this;
    function ondata(chunk) {
      if (dest.writable && dest.write(chunk) === false && source.pause) {
        source.pause();
      }
    }
    source.on("data", ondata);
    function ondrain() {
      if (source.readable && source.resume) {
        source.resume();
      }
    }
    dest.on("drain", ondrain);
    if (!dest._isStdio && (!options || options.end !== false)) {
      source.on("end", onend);
      source.on("close", onclose);
    }
    let didOnEnd = false;
    function onend() {
      if (didOnEnd) return;
      didOnEnd = true;
      dest.end();
    }
    function onclose() {
      if (didOnEnd) return;
      didOnEnd = true;
      if (typeof dest.destroy === "function") dest.destroy();
    }
    function onerror(er) {
      cleanup();
      if (EE.listenerCount(this, "error") === 0) {
        this.emit("error", er);
      }
    }
    prependListener3(source, "error", onerror);
    prependListener3(dest, "error", onerror);
    function cleanup() {
      source.removeListener("data", ondata);
      dest.removeListener("drain", ondrain);
      source.removeListener("end", onend);
      source.removeListener("close", onclose);
      source.removeListener("error", onerror);
      dest.removeListener("error", onerror);
      source.removeListener("end", cleanup);
      source.removeListener("close", cleanup);
      dest.removeListener("close", cleanup);
    }
    source.on("end", cleanup);
    source.on("close", cleanup);
    dest.on("close", cleanup);
    dest.emit("pipe", source);
    return dest;
  };
  function prependListener3(emitter, event, fn) {
    if (typeof emitter.prependListener === "function") return emitter.prependListener(event, fn);
    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);
    else if (ArrayIsArray(emitter._events[event])) emitter._events[event].unshift(fn);
    else emitter._events[event] = [fn, emitter._events[event]];
  }
  exports$h2 = {
    Stream: Stream2,
    prependListener: prependListener3
  };
  return exports$h2;
}
function dew$f2() {
  if (_dewExec$f2) return exports$g2;
  _dewExec$f2 = true;
  const {
    SymbolDispose
  } = dew$o();
  const {
    AbortError,
    codes
  } = dew$l();
  const {
    isNodeStream,
    isWebStream,
    kControllerErrorFunction
  } = dew$j2();
  const eos = dew$i2();
  const {
    ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2
  } = codes;
  let addAbortListener;
  const validateAbortSignal = (signal, name2) => {
    if (typeof signal !== "object" || !("aborted" in signal)) {
      throw new ERR_INVALID_ARG_TYPE2(name2, "AbortSignal", signal);
    }
  };
  exports$g2.addAbortSignal = function addAbortSignal(signal, stream) {
    validateAbortSignal(signal, "signal");
    if (!isNodeStream(stream) && !isWebStream(stream)) {
      throw new ERR_INVALID_ARG_TYPE2("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
    }
    return exports$g2.addAbortSignalNoValidate(signal, stream);
  };
  exports$g2.addAbortSignalNoValidate = function(signal, stream) {
    if (typeof signal !== "object" || !("aborted" in signal)) {
      return stream;
    }
    const onAbort = isNodeStream(stream) ? () => {
      stream.destroy(new AbortError(void 0, {
        cause: signal.reason
      }));
    } : () => {
      stream[kControllerErrorFunction](new AbortError(void 0, {
        cause: signal.reason
      }));
    };
    if (signal.aborted) {
      onAbort();
    } else {
      addAbortListener = addAbortListener || dew$m().addAbortListener;
      const disposable = addAbortListener(signal, onAbort);
      eos(stream, disposable[SymbolDispose]);
    }
    return stream;
  };
  return exports$g2;
}
function dew$e2() {
  if (_dewExec$e2) return exports$f2;
  _dewExec$e2 = true;
  const {
    StringPrototypeSlice,
    SymbolIterator,
    TypedArrayPrototypeSet,
    Uint8Array: Uint8Array2
  } = dew$o();
  const {
    Buffer: Buffer3
  } = dew();
  const {
    inspect: inspect2
  } = dew$m();
  exports$f2 = class BufferList {
    constructor() {
      this.head = null;
      this.tail = null;
      this.length = 0;
    }
    push(v) {
      const entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;
      else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
    unshift(v) {
      const entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
    shift() {
      if (this.length === 0) return;
      const ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;
      else this.head = this.head.next;
      --this.length;
      return ret;
    }
    clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
    join(s) {
      if (this.length === 0) return "";
      let p = this.head;
      let ret = "" + p.data;
      while ((p = p.next) !== null) ret += s + p.data;
      return ret;
    }
    concat(n) {
      if (this.length === 0) return Buffer3.alloc(0);
      const ret = Buffer3.allocUnsafe(n >>> 0);
      let p = this.head;
      let i = 0;
      while (p) {
        TypedArrayPrototypeSet(ret, p.data, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    }
    // Consumes a specified amount of bytes or characters from the buffered data.
    consume(n, hasStrings) {
      const data = this.head.data;
      if (n < data.length) {
        const slice = data.slice(0, n);
        this.head.data = data.slice(n);
        return slice;
      }
      if (n === data.length) {
        return this.shift();
      }
      return hasStrings ? this._getString(n) : this._getBuffer(n);
    }
    first() {
      return this.head.data;
    }
    *[SymbolIterator]() {
      for (let p = this.head; p; p = p.next) {
        yield p.data;
      }
    }
    // Consumes a specified amount of characters from the buffered data.
    _getString(n) {
      let ret = "";
      let p = this.head;
      let c = 0;
      do {
        const str = p.data;
        if (n > str.length) {
          ret += str;
          n -= str.length;
        } else {
          if (n === str.length) {
            ret += str;
            ++c;
            if (p.next) this.head = p.next;
            else this.head = this.tail = null;
          } else {
            ret += StringPrototypeSlice(str, 0, n);
            this.head = p;
            p.data = StringPrototypeSlice(str, n);
          }
          break;
        }
        ++c;
      } while ((p = p.next) !== null);
      this.length -= c;
      return ret;
    }
    // Consumes a specified amount of bytes from the buffered data.
    _getBuffer(n) {
      const ret = Buffer3.allocUnsafe(n);
      const retLen = n;
      let p = this.head;
      let c = 0;
      do {
        const buf = p.data;
        if (n > buf.length) {
          TypedArrayPrototypeSet(ret, buf, retLen - n);
          n -= buf.length;
        } else {
          if (n === buf.length) {
            TypedArrayPrototypeSet(ret, buf, retLen - n);
            ++c;
            if (p.next) this.head = p.next;
            else this.head = this.tail = null;
          } else {
            TypedArrayPrototypeSet(ret, new Uint8Array2(buf.buffer, buf.byteOffset, n), retLen - n);
            this.head = p;
            p.data = buf.slice(n);
          }
          break;
        }
        ++c;
      } while ((p = p.next) !== null);
      this.length -= c;
      return ret;
    }
    // Make sure the linked list only shows the minimal necessary information.
    [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")](_, options) {
      return inspect2(this, __spreadProps(__spreadValues({}, options), {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  };
  return exports$f2;
}
function dew$d2() {
  if (_dewExec$d2) return exports$e2;
  _dewExec$d2 = true;
  const {
    MathFloor,
    NumberIsInteger
  } = dew$o();
  const {
    validateInteger
  } = dew$k2();
  const {
    ERR_INVALID_ARG_VALUE
  } = dew$l().codes;
  let defaultHighWaterMarkBytes = 16 * 1024;
  let defaultHighWaterMarkObjectMode = 16;
  function highWaterMarkFrom(options, isDuplex, duplexKey) {
    return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
  }
  function getDefaultHighWaterMark(objectMode) {
    return objectMode ? defaultHighWaterMarkObjectMode : defaultHighWaterMarkBytes;
  }
  function setDefaultHighWaterMark(objectMode, value) {
    validateInteger(value, "value", 0);
    if (objectMode) {
      defaultHighWaterMarkObjectMode = value;
    } else {
      defaultHighWaterMarkBytes = value;
    }
  }
  function getHighWaterMark(state, options, duplexKey, isDuplex) {
    const hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
    if (hwm != null) {
      if (!NumberIsInteger(hwm) || hwm < 0) {
        const name2 = isDuplex ? `options.${duplexKey}` : "options.highWaterMark";
        throw new ERR_INVALID_ARG_VALUE(name2, hwm);
      }
      return MathFloor(hwm);
    }
    return getDefaultHighWaterMark(state.objectMode);
  }
  exports$e2 = {
    getHighWaterMark,
    getDefaultHighWaterMark,
    setDefaultHighWaterMark
  };
  return exports$e2;
}
function dew$c2() {
  if (_dewExec$c2) return exports$d2;
  _dewExec$c2 = true;
  const process$1 = process2;
  const {
    PromisePrototypeThen,
    SymbolAsyncIterator,
    SymbolIterator
  } = dew$o();
  const {
    Buffer: Buffer3
  } = dew();
  const {
    ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2,
    ERR_STREAM_NULL_VALUES
  } = dew$l().codes;
  function from(Readable2, iterable, opts) {
    let iterator;
    if (typeof iterable === "string" || iterable instanceof Buffer3) {
      return new Readable2(__spreadProps(__spreadValues({
        objectMode: true
      }, opts), {
        read() {
          this.push(iterable);
          this.push(null);
        }
      }));
    }
    let isAsync;
    if (iterable && iterable[SymbolAsyncIterator]) {
      isAsync = true;
      iterator = iterable[SymbolAsyncIterator]();
    } else if (iterable && iterable[SymbolIterator]) {
      isAsync = false;
      iterator = iterable[SymbolIterator]();
    } else {
      throw new ERR_INVALID_ARG_TYPE2("iterable", ["Iterable"], iterable);
    }
    const readable = new Readable2(__spreadValues({
      objectMode: true,
      highWaterMark: 1
    }, opts));
    let reading = false;
    readable._read = function() {
      if (!reading) {
        reading = true;
        next();
      }
    };
    readable._destroy = function(error, cb) {
      PromisePrototypeThen(
        close(error),
        () => process$1.nextTick(cb, error),
        // nextTick is here in case cb throws
        (e) => process$1.nextTick(cb, e || error)
      );
    };
    async function close(error) {
      const hadError = error !== void 0 && error !== null;
      const hasThrow = typeof iterator.throw === "function";
      if (hadError && hasThrow) {
        const {
          value,
          done
        } = await iterator.throw(error);
        await value;
        if (done) {
          return;
        }
      }
      if (typeof iterator.return === "function") {
        const {
          value
        } = await iterator.return();
        await value;
      }
    }
    async function next() {
      for (; ; ) {
        try {
          const {
            value,
            done
          } = isAsync ? await iterator.next() : iterator.next();
          if (done) {
            readable.push(null);
          } else {
            const res = value && typeof value.then === "function" ? await value : value;
            if (res === null) {
              reading = false;
              throw new ERR_STREAM_NULL_VALUES();
            } else if (readable.push(res)) {
              continue;
            } else {
              reading = false;
            }
          }
        } catch (err) {
          readable.destroy(err);
        }
        break;
      }
    }
    return readable;
  }
  exports$d2 = from;
  return exports$d2;
}
function dew$b3() {
  if (_dewExec$b3) return exports$c3;
  _dewExec$b3 = true;
  const process$1 = process2;
  const {
    ArrayPrototypeIndexOf,
    NumberIsInteger,
    NumberIsNaN,
    NumberParseInt,
    ObjectDefineProperties,
    ObjectKeys,
    ObjectSetPrototypeOf,
    Promise: Promise2,
    SafeSet,
    SymbolAsyncDispose,
    SymbolAsyncIterator,
    Symbol: Symbol2
  } = dew$o();
  exports$c3 = Readable2;
  Readable2.ReadableState = ReadableState;
  const {
    EventEmitter: EE
  } = exports4;
  const {
    Stream: Stream2,
    prependListener: prependListener3
  } = dew$g2();
  const {
    Buffer: Buffer3
  } = dew();
  const {
    addAbortSignal
  } = dew$f2();
  const eos = dew$i2();
  let debug = dew$m().debuglog("stream", (fn) => {
    debug = fn;
  });
  const BufferList = dew$e2();
  const destroyImpl = dew$h2();
  const {
    getHighWaterMark,
    getDefaultHighWaterMark
  } = dew$d2();
  const {
    aggregateTwoErrors,
    codes: {
      ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2,
      ERR_METHOD_NOT_IMPLEMENTED,
      ERR_OUT_OF_RANGE,
      ERR_STREAM_PUSH_AFTER_EOF,
      ERR_STREAM_UNSHIFT_AFTER_END_EVENT
    },
    AbortError
  } = dew$l();
  const {
    validateObject
  } = dew$k2();
  const kPaused = Symbol2("kPaused");
  const {
    StringDecoder: StringDecoder2
  } = exports5;
  const from = dew$c2();
  ObjectSetPrototypeOf(Readable2.prototype, Stream2.prototype);
  ObjectSetPrototypeOf(Readable2, Stream2);
  const nop = () => {
  };
  const {
    errorOrDestroy
  } = destroyImpl;
  const kObjectMode = 1 << 0;
  const kEnded = 1 << 1;
  const kEndEmitted = 1 << 2;
  const kReading = 1 << 3;
  const kConstructed = 1 << 4;
  const kSync = 1 << 5;
  const kNeedReadable = 1 << 6;
  const kEmittedReadable = 1 << 7;
  const kReadableListening = 1 << 8;
  const kResumeScheduled = 1 << 9;
  const kErrorEmitted = 1 << 10;
  const kEmitClose = 1 << 11;
  const kAutoDestroy = 1 << 12;
  const kDestroyed = 1 << 13;
  const kClosed = 1 << 14;
  const kCloseEmitted = 1 << 15;
  const kMultiAwaitDrain = 1 << 16;
  const kReadingMore = 1 << 17;
  const kDataEmitted = 1 << 18;
  function makeBitMapDescriptor(bit) {
    return {
      enumerable: false,
      get() {
        return ((this || _global$22).state & bit) !== 0;
      },
      set(value) {
        if (value) (this || _global$22).state |= bit;
        else (this || _global$22).state &= ~bit;
      }
    };
  }
  ObjectDefineProperties(ReadableState.prototype, {
    objectMode: makeBitMapDescriptor(kObjectMode),
    ended: makeBitMapDescriptor(kEnded),
    endEmitted: makeBitMapDescriptor(kEndEmitted),
    reading: makeBitMapDescriptor(kReading),
    // Stream is still being constructed and cannot be
    // destroyed until construction finished or failed.
    // Async construction is opt in, therefore we start as
    // constructed.
    constructed: makeBitMapDescriptor(kConstructed),
    // A flag to be able to tell if the event 'readable'/'data' is emitted
    // immediately, or on a later tick.  We set this to true at first, because
    // any actions that shouldn't happen until "later" should generally also
    // not happen before the first read call.
    sync: makeBitMapDescriptor(kSync),
    // Whenever we return null, then we set a flag to say
    // that we're awaiting a 'readable' event emission.
    needReadable: makeBitMapDescriptor(kNeedReadable),
    emittedReadable: makeBitMapDescriptor(kEmittedReadable),
    readableListening: makeBitMapDescriptor(kReadableListening),
    resumeScheduled: makeBitMapDescriptor(kResumeScheduled),
    // True if the error was already emitted and should not be thrown again.
    errorEmitted: makeBitMapDescriptor(kErrorEmitted),
    emitClose: makeBitMapDescriptor(kEmitClose),
    autoDestroy: makeBitMapDescriptor(kAutoDestroy),
    // Has it been destroyed.
    destroyed: makeBitMapDescriptor(kDestroyed),
    // Indicates whether the stream has finished destroying.
    closed: makeBitMapDescriptor(kClosed),
    // True if close has been emitted or would have been emitted
    // depending on emitClose.
    closeEmitted: makeBitMapDescriptor(kCloseEmitted),
    multiAwaitDrain: makeBitMapDescriptor(kMultiAwaitDrain),
    // If true, a maybeReadMore has been scheduled.
    readingMore: makeBitMapDescriptor(kReadingMore),
    dataEmitted: makeBitMapDescriptor(kDataEmitted)
  });
  function ReadableState(options, stream, isDuplex) {
    if (typeof isDuplex !== "boolean") isDuplex = stream instanceof dew$83();
    (this || _global$22).state = kEmitClose | kAutoDestroy | kConstructed | kSync;
    if (options && options.objectMode) (this || _global$22).state |= kObjectMode;
    if (isDuplex && options && options.readableObjectMode) (this || _global$22).state |= kObjectMode;
    (this || _global$22).highWaterMark = options ? getHighWaterMark(this || _global$22, options, "readableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
    (this || _global$22).buffer = new BufferList();
    (this || _global$22).length = 0;
    (this || _global$22).pipes = [];
    (this || _global$22).flowing = null;
    (this || _global$22)[kPaused] = null;
    if (options && options.emitClose === false) (this || _global$22).state &= ~kEmitClose;
    if (options && options.autoDestroy === false) (this || _global$22).state &= ~kAutoDestroy;
    (this || _global$22).errored = null;
    (this || _global$22).defaultEncoding = options && options.defaultEncoding || "utf8";
    (this || _global$22).awaitDrainWriters = null;
    (this || _global$22).decoder = null;
    (this || _global$22).encoding = null;
    if (options && options.encoding) {
      (this || _global$22).decoder = new StringDecoder2(options.encoding);
      (this || _global$22).encoding = options.encoding;
    }
  }
  function Readable2(options) {
    if (!((this || _global$22) instanceof Readable2)) return new Readable2(options);
    const isDuplex = (this || _global$22) instanceof dew$83();
    (this || _global$22)._readableState = new ReadableState(options, this || _global$22, isDuplex);
    if (options) {
      if (typeof options.read === "function") (this || _global$22)._read = options.read;
      if (typeof options.destroy === "function") (this || _global$22)._destroy = options.destroy;
      if (typeof options.construct === "function") (this || _global$22)._construct = options.construct;
      if (options.signal && !isDuplex) addAbortSignal(options.signal, this || _global$22);
    }
    Stream2.call(this || _global$22, options);
    destroyImpl.construct(this || _global$22, () => {
      if ((this || _global$22)._readableState.needReadable) {
        maybeReadMore(this || _global$22, (this || _global$22)._readableState);
      }
    });
  }
  Readable2.prototype.destroy = destroyImpl.destroy;
  Readable2.prototype._undestroy = destroyImpl.undestroy;
  Readable2.prototype._destroy = function(err, cb) {
    cb(err);
  };
  Readable2.prototype[EE.captureRejectionSymbol] = function(err) {
    this.destroy(err);
  };
  Readable2.prototype[SymbolAsyncDispose] = function() {
    let error;
    if (!(this || _global$22).destroyed) {
      error = (this || _global$22).readableEnded ? null : new AbortError();
      this.destroy(error);
    }
    return new Promise2((resolve, reject) => eos(this || _global$22, (err) => err && err !== error ? reject(err) : resolve(null)));
  };
  Readable2.prototype.push = function(chunk, encoding) {
    return readableAddChunk(this || _global$22, chunk, encoding, false);
  };
  Readable2.prototype.unshift = function(chunk, encoding) {
    return readableAddChunk(this || _global$22, chunk, encoding, true);
  };
  function readableAddChunk(stream, chunk, encoding, addToFront) {
    debug("readableAddChunk", chunk);
    const state = stream._readableState;
    let err;
    if ((state.state & kObjectMode) === 0) {
      if (typeof chunk === "string") {
        encoding = encoding || state.defaultEncoding;
        if (state.encoding !== encoding) {
          if (addToFront && state.encoding) {
            chunk = Buffer3.from(chunk, encoding).toString(state.encoding);
          } else {
            chunk = Buffer3.from(chunk, encoding);
            encoding = "";
          }
        }
      } else if (chunk instanceof Buffer3) {
        encoding = "";
      } else if (Stream2._isUint8Array(chunk)) {
        chunk = Stream2._uint8ArrayToBuffer(chunk);
        encoding = "";
      } else if (chunk != null) {
        err = new ERR_INVALID_ARG_TYPE2("chunk", ["string", "Buffer", "Uint8Array"], chunk);
      }
    }
    if (err) {
      errorOrDestroy(stream, err);
    } else if (chunk === null) {
      state.state &= ~kReading;
      onEofChunk(stream, state);
    } else if ((state.state & kObjectMode) !== 0 || chunk && chunk.length > 0) {
      if (addToFront) {
        if ((state.state & kEndEmitted) !== 0) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
        else if (state.destroyed || state.errored) return false;
        else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed || state.errored) {
        return false;
      } else {
        state.state &= ~kReading;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);
          else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.state &= ~kReading;
      maybeReadMore(stream, state);
    }
    return !state.ended && (state.length < state.highWaterMark || state.length === 0);
  }
  function addChunk(stream, state, chunk, addToFront) {
    if (state.flowing && state.length === 0 && !state.sync && stream.listenerCount("data") > 0) {
      if ((state.state & kMultiAwaitDrain) !== 0) {
        state.awaitDrainWriters.clear();
      } else {
        state.awaitDrainWriters = null;
      }
      state.dataEmitted = true;
      stream.emit("data", chunk);
    } else {
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) state.buffer.unshift(chunk);
      else state.buffer.push(chunk);
      if ((state.state & kNeedReadable) !== 0) emitReadable(stream);
    }
    maybeReadMore(stream, state);
  }
  Readable2.prototype.isPaused = function() {
    const state = (this || _global$22)._readableState;
    return state[kPaused] === true || state.flowing === false;
  };
  Readable2.prototype.setEncoding = function(enc) {
    const decoder = new StringDecoder2(enc);
    (this || _global$22)._readableState.decoder = decoder;
    (this || _global$22)._readableState.encoding = (this || _global$22)._readableState.decoder.encoding;
    const buffer = (this || _global$22)._readableState.buffer;
    let content = "";
    for (const data of buffer) {
      content += decoder.write(data);
    }
    buffer.clear();
    if (content !== "") buffer.push(content);
    (this || _global$22)._readableState.length = content.length;
    return this || _global$22;
  };
  const MAX_HWM = 1073741824;
  function computeNewHighWaterMark(n) {
    if (n > MAX_HWM) {
      throw new ERR_OUT_OF_RANGE("size", "<= 1GiB", n);
    } else {
      n--;
      n |= n >>> 1;
      n |= n >>> 2;
      n |= n >>> 4;
      n |= n >>> 8;
      n |= n >>> 16;
      n++;
    }
    return n;
  }
  function howMuchToRead(n, state) {
    if (n <= 0 || state.length === 0 && state.ended) return 0;
    if ((state.state & kObjectMode) !== 0) return 1;
    if (NumberIsNaN(n)) {
      if (state.flowing && state.length) return state.buffer.first().length;
      return state.length;
    }
    if (n <= state.length) return n;
    return state.ended ? state.length : 0;
  }
  Readable2.prototype.read = function(n) {
    debug("read", n);
    if (n === void 0) {
      n = NaN;
    } else if (!NumberIsInteger(n)) {
      n = NumberParseInt(n, 10);
    }
    const state = (this || _global$22)._readableState;
    const nOrig = n;
    if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
    if (n !== 0) state.state &= ~kEmittedReadable;
    if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
      debug("read: emitReadable", state.length, state.ended);
      if (state.length === 0 && state.ended) endReadable(this || _global$22);
      else emitReadable(this || _global$22);
      return null;
    }
    n = howMuchToRead(n, state);
    if (n === 0 && state.ended) {
      if (state.length === 0) endReadable(this || _global$22);
      return null;
    }
    let doRead = (state.state & kNeedReadable) !== 0;
    debug("need readable", doRead);
    if (state.length === 0 || state.length - n < state.highWaterMark) {
      doRead = true;
      debug("length less than watermark", doRead);
    }
    if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
      doRead = false;
      debug("reading, ended or constructing", doRead);
    } else if (doRead) {
      debug("do read");
      state.state |= kReading | kSync;
      if (state.length === 0) state.state |= kNeedReadable;
      try {
        this._read(state.highWaterMark);
      } catch (err) {
        errorOrDestroy(this || _global$22, err);
      }
      state.state &= ~kSync;
      if (!state.reading) n = howMuchToRead(nOrig, state);
    }
    let ret;
    if (n > 0) ret = fromList(n, state);
    else ret = null;
    if (ret === null) {
      state.needReadable = state.length <= state.highWaterMark;
      n = 0;
    } else {
      state.length -= n;
      if (state.multiAwaitDrain) {
        state.awaitDrainWriters.clear();
      } else {
        state.awaitDrainWriters = null;
      }
    }
    if (state.length === 0) {
      if (!state.ended) state.needReadable = true;
      if (nOrig !== n && state.ended) endReadable(this || _global$22);
    }
    if (ret !== null && !state.errorEmitted && !state.closeEmitted) {
      state.dataEmitted = true;
      this.emit("data", ret);
    }
    return ret;
  };
  function onEofChunk(stream, state) {
    debug("onEofChunk");
    if (state.ended) return;
    if (state.decoder) {
      const chunk = state.decoder.end();
      if (chunk && chunk.length) {
        state.buffer.push(chunk);
        state.length += state.objectMode ? 1 : chunk.length;
      }
    }
    state.ended = true;
    if (state.sync) {
      emitReadable(stream);
    } else {
      state.needReadable = false;
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
  function emitReadable(stream) {
    const state = stream._readableState;
    debug("emitReadable", state.needReadable, state.emittedReadable);
    state.needReadable = false;
    if (!state.emittedReadable) {
      debug("emitReadable", state.flowing);
      state.emittedReadable = true;
      process$1.nextTick(emitReadable_, stream);
    }
  }
  function emitReadable_(stream) {
    const state = stream._readableState;
    debug("emitReadable_", state.destroyed, state.length, state.ended);
    if (!state.destroyed && !state.errored && (state.length || state.ended)) {
      stream.emit("readable");
      state.emittedReadable = false;
    }
    state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
    flow(stream);
  }
  function maybeReadMore(stream, state) {
    if (!state.readingMore && state.constructed) {
      state.readingMore = true;
      process$1.nextTick(maybeReadMore_, stream, state);
    }
  }
  function maybeReadMore_(stream, state) {
    while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
      const len = state.length;
      debug("maybeReadMore read 0");
      stream.read(0);
      if (len === state.length)
        break;
    }
    state.readingMore = false;
  }
  Readable2.prototype._read = function(n) {
    throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
  };
  Readable2.prototype.pipe = function(dest, pipeOpts) {
    const src = this || _global$22;
    const state = (this || _global$22)._readableState;
    if (state.pipes.length === 1) {
      if (!state.multiAwaitDrain) {
        state.multiAwaitDrain = true;
        state.awaitDrainWriters = new SafeSet(state.awaitDrainWriters ? [state.awaitDrainWriters] : []);
      }
    }
    state.pipes.push(dest);
    debug("pipe count=%d opts=%j", state.pipes.length, pipeOpts);
    const doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process$1.stdout && dest !== process$1.stderr;
    const endFn = doEnd ? onend : unpipe;
    if (state.endEmitted) process$1.nextTick(endFn);
    else src.once("end", endFn);
    dest.on("unpipe", onunpipe);
    function onunpipe(readable, unpipeInfo) {
      debug("onunpipe");
      if (readable === src) {
        if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
          unpipeInfo.hasUnpiped = true;
          cleanup();
        }
      }
    }
    function onend() {
      debug("onend");
      dest.end();
    }
    let ondrain;
    let cleanedUp = false;
    function cleanup() {
      debug("cleanup");
      dest.removeListener("close", onclose);
      dest.removeListener("finish", onfinish);
      if (ondrain) {
        dest.removeListener("drain", ondrain);
      }
      dest.removeListener("error", onerror);
      dest.removeListener("unpipe", onunpipe);
      src.removeListener("end", onend);
      src.removeListener("end", unpipe);
      src.removeListener("data", ondata);
      cleanedUp = true;
      if (ondrain && state.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain)) ondrain();
    }
    function pause() {
      if (!cleanedUp) {
        if (state.pipes.length === 1 && state.pipes[0] === dest) {
          debug("false write response, pause", 0);
          state.awaitDrainWriters = dest;
          state.multiAwaitDrain = false;
        } else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
          debug("false write response, pause", state.awaitDrainWriters.size);
          state.awaitDrainWriters.add(dest);
        }
        src.pause();
      }
      if (!ondrain) {
        ondrain = pipeOnDrain(src, dest);
        dest.on("drain", ondrain);
      }
    }
    src.on("data", ondata);
    function ondata(chunk) {
      debug("ondata");
      const ret = dest.write(chunk);
      debug("dest.write", ret);
      if (ret === false) {
        pause();
      }
    }
    function onerror(er) {
      debug("onerror", er);
      unpipe();
      dest.removeListener("error", onerror);
      if (dest.listenerCount("error") === 0) {
        const s = dest._writableState || dest._readableState;
        if (s && !s.errorEmitted) {
          errorOrDestroy(dest, er);
        } else {
          dest.emit("error", er);
        }
      }
    }
    prependListener3(dest, "error", onerror);
    function onclose() {
      dest.removeListener("finish", onfinish);
      unpipe();
    }
    dest.once("close", onclose);
    function onfinish() {
      debug("onfinish");
      dest.removeListener("close", onclose);
      unpipe();
    }
    dest.once("finish", onfinish);
    function unpipe() {
      debug("unpipe");
      src.unpipe(dest);
    }
    dest.emit("pipe", src);
    if (dest.writableNeedDrain === true) {
      pause();
    } else if (!state.flowing) {
      debug("pipe resume");
      src.resume();
    }
    return dest;
  };
  function pipeOnDrain(src, dest) {
    return function pipeOnDrainFunctionResult() {
      const state = src._readableState;
      if (state.awaitDrainWriters === dest) {
        debug("pipeOnDrain", 1);
        state.awaitDrainWriters = null;
      } else if (state.multiAwaitDrain) {
        debug("pipeOnDrain", state.awaitDrainWriters.size);
        state.awaitDrainWriters.delete(dest);
      }
      if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && src.listenerCount("data")) {
        src.resume();
      }
    };
  }
  Readable2.prototype.unpipe = function(dest) {
    const state = (this || _global$22)._readableState;
    const unpipeInfo = {
      hasUnpiped: false
    };
    if (state.pipes.length === 0) return this || _global$22;
    if (!dest) {
      const dests = state.pipes;
      state.pipes = [];
      this.pause();
      for (let i = 0; i < dests.length; i++) dests[i].emit("unpipe", this || _global$22, {
        hasUnpiped: false
      });
      return this || _global$22;
    }
    const index = ArrayPrototypeIndexOf(state.pipes, dest);
    if (index === -1) return this || _global$22;
    state.pipes.splice(index, 1);
    if (state.pipes.length === 0) this.pause();
    dest.emit("unpipe", this || _global$22, unpipeInfo);
    return this || _global$22;
  };
  Readable2.prototype.on = function(ev, fn) {
    const res = Stream2.prototype.on.call(this || _global$22, ev, fn);
    const state = (this || _global$22)._readableState;
    if (ev === "data") {
      state.readableListening = this.listenerCount("readable") > 0;
      if (state.flowing !== false) this.resume();
    } else if (ev === "readable") {
      if (!state.endEmitted && !state.readableListening) {
        state.readableListening = state.needReadable = true;
        state.flowing = false;
        state.emittedReadable = false;
        debug("on readable", state.length, state.reading);
        if (state.length) {
          emitReadable(this || _global$22);
        } else if (!state.reading) {
          process$1.nextTick(nReadingNextTick, this || _global$22);
        }
      }
    }
    return res;
  };
  Readable2.prototype.addListener = Readable2.prototype.on;
  Readable2.prototype.removeListener = function(ev, fn) {
    const res = Stream2.prototype.removeListener.call(this || _global$22, ev, fn);
    if (ev === "readable") {
      process$1.nextTick(updateReadableListening, this || _global$22);
    }
    return res;
  };
  Readable2.prototype.off = Readable2.prototype.removeListener;
  Readable2.prototype.removeAllListeners = function(ev) {
    const res = Stream2.prototype.removeAllListeners.apply(this || _global$22, arguments);
    if (ev === "readable" || ev === void 0) {
      process$1.nextTick(updateReadableListening, this || _global$22);
    }
    return res;
  };
  function updateReadableListening(self2) {
    const state = self2._readableState;
    state.readableListening = self2.listenerCount("readable") > 0;
    if (state.resumeScheduled && state[kPaused] === false) {
      state.flowing = true;
    } else if (self2.listenerCount("data") > 0) {
      self2.resume();
    } else if (!state.readableListening) {
      state.flowing = null;
    }
  }
  function nReadingNextTick(self2) {
    debug("readable nexttick read 0");
    self2.read(0);
  }
  Readable2.prototype.resume = function() {
    const state = (this || _global$22)._readableState;
    if (!state.flowing) {
      debug("resume");
      state.flowing = !state.readableListening;
      resume(this || _global$22, state);
    }
    state[kPaused] = false;
    return this || _global$22;
  };
  function resume(stream, state) {
    if (!state.resumeScheduled) {
      state.resumeScheduled = true;
      process$1.nextTick(resume_, stream, state);
    }
  }
  function resume_(stream, state) {
    debug("resume", state.reading);
    if (!state.reading) {
      stream.read(0);
    }
    state.resumeScheduled = false;
    stream.emit("resume");
    flow(stream);
    if (state.flowing && !state.reading) stream.read(0);
  }
  Readable2.prototype.pause = function() {
    debug("call pause flowing=%j", (this || _global$22)._readableState.flowing);
    if ((this || _global$22)._readableState.flowing !== false) {
      debug("pause");
      (this || _global$22)._readableState.flowing = false;
      this.emit("pause");
    }
    (this || _global$22)._readableState[kPaused] = true;
    return this || _global$22;
  };
  function flow(stream) {
    const state = stream._readableState;
    debug("flow", state.flowing);
    while (state.flowing && stream.read() !== null) ;
  }
  Readable2.prototype.wrap = function(stream) {
    let paused = false;
    stream.on("data", (chunk) => {
      if (!this.push(chunk) && stream.pause) {
        paused = true;
        stream.pause();
      }
    });
    stream.on("end", () => {
      this.push(null);
    });
    stream.on("error", (err) => {
      errorOrDestroy(this || _global$22, err);
    });
    stream.on("close", () => {
      this.destroy();
    });
    stream.on("destroy", () => {
      this.destroy();
    });
    (this || _global$22)._read = () => {
      if (paused && stream.resume) {
        paused = false;
        stream.resume();
      }
    };
    const streamKeys = ObjectKeys(stream);
    for (let j = 1; j < streamKeys.length; j++) {
      const i = streamKeys[j];
      if ((this || _global$22)[i] === void 0 && typeof stream[i] === "function") {
        (this || _global$22)[i] = stream[i].bind(stream);
      }
    }
    return this || _global$22;
  };
  Readable2.prototype[SymbolAsyncIterator] = function() {
    return streamToAsyncIterator(this || _global$22);
  };
  Readable2.prototype.iterator = function(options) {
    if (options !== void 0) {
      validateObject(options, "options");
    }
    return streamToAsyncIterator(this || _global$22, options);
  };
  function streamToAsyncIterator(stream, options) {
    if (typeof stream.read !== "function") {
      stream = Readable2.wrap(stream, {
        objectMode: true
      });
    }
    const iter = createAsyncIterator(stream, options);
    iter.stream = stream;
    return iter;
  }
  function createAsyncIterator(stream, options) {
    return __asyncGenerator(this, null, function* () {
      let callback = nop;
      function next(resolve) {
        if ((this || _global$22) === stream) {
          callback();
          callback = nop;
        } else {
          callback = resolve;
        }
      }
      stream.on("readable", next);
      let error;
      const cleanup = eos(stream, {
        writable: false
      }, (err) => {
        error = err ? aggregateTwoErrors(error, err) : null;
        callback();
        callback = nop;
      });
      try {
        while (true) {
          const chunk = stream.destroyed ? null : stream.read();
          if (chunk !== null) {
            yield chunk;
          } else if (error) {
            throw error;
          } else if (error === null) {
            return;
          } else {
            yield new __await(new Promise2(next));
          }
        }
      } catch (err) {
        error = aggregateTwoErrors(error, err);
        throw error;
      } finally {
        if ((error || (options === null || options === void 0 ? void 0 : options.destroyOnReturn) !== false) && (error === void 0 || stream._readableState.autoDestroy)) {
          destroyImpl.destroyer(stream, null);
        } else {
          stream.off("readable", next);
          cleanup();
        }
      }
    });
  }
  ObjectDefineProperties(Readable2.prototype, {
    readable: {
      __proto__: null,
      get() {
        const r = (this || _global$22)._readableState;
        return !!r && r.readable !== false && !r.destroyed && !r.errorEmitted && !r.endEmitted;
      },
      set(val) {
        if ((this || _global$22)._readableState) {
          (this || _global$22)._readableState.readable = !!val;
        }
      }
    },
    readableDidRead: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return (this || _global$22)._readableState.dataEmitted;
      }
    },
    readableAborted: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return !!((this || _global$22)._readableState.readable !== false && ((this || _global$22)._readableState.destroyed || (this || _global$22)._readableState.errored) && !(this || _global$22)._readableState.endEmitted);
      }
    },
    readableHighWaterMark: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return (this || _global$22)._readableState.highWaterMark;
      }
    },
    readableBuffer: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return (this || _global$22)._readableState && (this || _global$22)._readableState.buffer;
      }
    },
    readableFlowing: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return (this || _global$22)._readableState.flowing;
      },
      set: function(state) {
        if ((this || _global$22)._readableState) {
          (this || _global$22)._readableState.flowing = state;
        }
      }
    },
    readableLength: {
      __proto__: null,
      enumerable: false,
      get() {
        return (this || _global$22)._readableState.length;
      }
    },
    readableObjectMode: {
      __proto__: null,
      enumerable: false,
      get() {
        return (this || _global$22)._readableState ? (this || _global$22)._readableState.objectMode : false;
      }
    },
    readableEncoding: {
      __proto__: null,
      enumerable: false,
      get() {
        return (this || _global$22)._readableState ? (this || _global$22)._readableState.encoding : null;
      }
    },
    errored: {
      __proto__: null,
      enumerable: false,
      get() {
        return (this || _global$22)._readableState ? (this || _global$22)._readableState.errored : null;
      }
    },
    closed: {
      __proto__: null,
      get() {
        return (this || _global$22)._readableState ? (this || _global$22)._readableState.closed : false;
      }
    },
    destroyed: {
      __proto__: null,
      enumerable: false,
      get() {
        return (this || _global$22)._readableState ? (this || _global$22)._readableState.destroyed : false;
      },
      set(value) {
        if (!(this || _global$22)._readableState) {
          return;
        }
        (this || _global$22)._readableState.destroyed = value;
      }
    },
    readableEnded: {
      __proto__: null,
      enumerable: false,
      get() {
        return (this || _global$22)._readableState ? (this || _global$22)._readableState.endEmitted : false;
      }
    }
  });
  ObjectDefineProperties(ReadableState.prototype, {
    // Legacy getter for `pipesCount`.
    pipesCount: {
      __proto__: null,
      get() {
        return (this || _global$22).pipes.length;
      }
    },
    // Legacy property for `paused`.
    paused: {
      __proto__: null,
      get() {
        return (this || _global$22)[kPaused] !== false;
      },
      set(value) {
        (this || _global$22)[kPaused] = !!value;
      }
    }
  });
  Readable2._fromList = fromList;
  function fromList(n, state) {
    if (state.length === 0) return null;
    let ret;
    if (state.objectMode) ret = state.buffer.shift();
    else if (!n || n >= state.length) {
      if (state.decoder) ret = state.buffer.join("");
      else if (state.buffer.length === 1) ret = state.buffer.first();
      else ret = state.buffer.concat(state.length);
      state.buffer.clear();
    } else {
      ret = state.buffer.consume(n, state.decoder);
    }
    return ret;
  }
  function endReadable(stream) {
    const state = stream._readableState;
    debug("endReadable", state.endEmitted);
    if (!state.endEmitted) {
      state.ended = true;
      process$1.nextTick(endReadableNT, state, stream);
    }
  }
  function endReadableNT(state, stream) {
    debug("endReadableNT", state.endEmitted, state.length);
    if (!state.errored && !state.closeEmitted && !state.endEmitted && state.length === 0) {
      state.endEmitted = true;
      stream.emit("end");
      if (stream.writable && stream.allowHalfOpen === false) {
        process$1.nextTick(endWritableNT, stream);
      } else if (state.autoDestroy) {
        const wState = stream._writableState;
        const autoDestroy = !wState || wState.autoDestroy && // We don't expect the writable to ever 'finish'
        // if writable is explicitly set to false.
        (wState.finished || wState.writable === false);
        if (autoDestroy) {
          stream.destroy();
        }
      }
    }
  }
  function endWritableNT(stream) {
    const writable = stream.writable && !stream.writableEnded && !stream.destroyed;
    if (writable) {
      stream.end();
    }
  }
  Readable2.from = function(iterable, opts) {
    return from(Readable2, iterable, opts);
  };
  let webStreamsAdapters;
  function lazyWebStreams() {
    if (webStreamsAdapters === void 0) webStreamsAdapters = {};
    return webStreamsAdapters;
  }
  Readable2.fromWeb = function(readableStream, options) {
    return lazyWebStreams().newStreamReadableFromReadableStream(readableStream, options);
  };
  Readable2.toWeb = function(streamReadable, options) {
    return lazyWebStreams().newReadableStreamFromStreamReadable(streamReadable, options);
  };
  Readable2.wrap = function(src, options) {
    var _ref, _src$readableObjectMo;
    return new Readable2(__spreadProps(__spreadValues({
      objectMode: (_ref = (_src$readableObjectMo = src.readableObjectMode) !== null && _src$readableObjectMo !== void 0 ? _src$readableObjectMo : src.objectMode) !== null && _ref !== void 0 ? _ref : true
    }, options), {
      destroy(err, callback) {
        destroyImpl.destroyer(src, err);
        callback(err);
      }
    })).wrap(src);
  };
  return exports$c3;
}
function dew$a3() {
  if (_dewExec$a3) return exports$b3;
  _dewExec$a3 = true;
  const process$1 = process2;
  const {
    ArrayPrototypeSlice,
    Error: Error2,
    FunctionPrototypeSymbolHasInstance,
    ObjectDefineProperty,
    ObjectDefineProperties,
    ObjectSetPrototypeOf,
    StringPrototypeToLowerCase,
    Symbol: Symbol2,
    SymbolHasInstance
  } = dew$o();
  exports$b3 = Writable2;
  Writable2.WritableState = WritableState;
  const {
    EventEmitter: EE
  } = exports4;
  const Stream2 = dew$g2().Stream;
  const {
    Buffer: Buffer3
  } = dew();
  const destroyImpl = dew$h2();
  const {
    addAbortSignal
  } = dew$f2();
  const {
    getHighWaterMark,
    getDefaultHighWaterMark
  } = dew$d2();
  const {
    ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2,
    ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK,
    ERR_STREAM_CANNOT_PIPE,
    ERR_STREAM_DESTROYED,
    ERR_STREAM_ALREADY_FINISHED,
    ERR_STREAM_NULL_VALUES,
    ERR_STREAM_WRITE_AFTER_END,
    ERR_UNKNOWN_ENCODING
  } = dew$l().codes;
  const {
    errorOrDestroy
  } = destroyImpl;
  ObjectSetPrototypeOf(Writable2.prototype, Stream2.prototype);
  ObjectSetPrototypeOf(Writable2, Stream2);
  function nop() {
  }
  const kOnFinished = Symbol2("kOnFinished");
  function WritableState(options, stream, isDuplex) {
    if (typeof isDuplex !== "boolean") isDuplex = stream instanceof dew$83();
    (this || _global$12).objectMode = !!(options && options.objectMode);
    if (isDuplex) (this || _global$12).objectMode = (this || _global$12).objectMode || !!(options && options.writableObjectMode);
    (this || _global$12).highWaterMark = options ? getHighWaterMark(this || _global$12, options, "writableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
    (this || _global$12).finalCalled = false;
    (this || _global$12).needDrain = false;
    (this || _global$12).ending = false;
    (this || _global$12).ended = false;
    (this || _global$12).finished = false;
    (this || _global$12).destroyed = false;
    const noDecode = !!(options && options.decodeStrings === false);
    (this || _global$12).decodeStrings = !noDecode;
    (this || _global$12).defaultEncoding = options && options.defaultEncoding || "utf8";
    (this || _global$12).length = 0;
    (this || _global$12).writing = false;
    (this || _global$12).corked = 0;
    (this || _global$12).sync = true;
    (this || _global$12).bufferProcessing = false;
    (this || _global$12).onwrite = onwrite.bind(void 0, stream);
    (this || _global$12).writecb = null;
    (this || _global$12).writelen = 0;
    (this || _global$12).afterWriteTickInfo = null;
    resetBuffer(this || _global$12);
    (this || _global$12).pendingcb = 0;
    (this || _global$12).constructed = true;
    (this || _global$12).prefinished = false;
    (this || _global$12).errorEmitted = false;
    (this || _global$12).emitClose = !options || options.emitClose !== false;
    (this || _global$12).autoDestroy = !options || options.autoDestroy !== false;
    (this || _global$12).errored = null;
    (this || _global$12).closed = false;
    (this || _global$12).closeEmitted = false;
    (this || _global$12)[kOnFinished] = [];
  }
  function resetBuffer(state) {
    state.buffered = [];
    state.bufferedIndex = 0;
    state.allBuffers = true;
    state.allNoop = true;
  }
  WritableState.prototype.getBuffer = function getBuffer() {
    return ArrayPrototypeSlice((this || _global$12).buffered, (this || _global$12).bufferedIndex);
  };
  ObjectDefineProperty(WritableState.prototype, "bufferedRequestCount", {
    __proto__: null,
    get() {
      return (this || _global$12).buffered.length - (this || _global$12).bufferedIndex;
    }
  });
  function Writable2(options) {
    const isDuplex = (this || _global$12) instanceof dew$83();
    if (!isDuplex && !FunctionPrototypeSymbolHasInstance(Writable2, this || _global$12)) return new Writable2(options);
    (this || _global$12)._writableState = new WritableState(options, this || _global$12, isDuplex);
    if (options) {
      if (typeof options.write === "function") (this || _global$12)._write = options.write;
      if (typeof options.writev === "function") (this || _global$12)._writev = options.writev;
      if (typeof options.destroy === "function") (this || _global$12)._destroy = options.destroy;
      if (typeof options.final === "function") (this || _global$12)._final = options.final;
      if (typeof options.construct === "function") (this || _global$12)._construct = options.construct;
      if (options.signal) addAbortSignal(options.signal, this || _global$12);
    }
    Stream2.call(this || _global$12, options);
    destroyImpl.construct(this || _global$12, () => {
      const state = (this || _global$12)._writableState;
      if (!state.writing) {
        clearBuffer(this || _global$12, state);
      }
      finishMaybe(this || _global$12, state);
    });
  }
  ObjectDefineProperty(Writable2, SymbolHasInstance, {
    __proto__: null,
    value: function(object) {
      if (FunctionPrototypeSymbolHasInstance(this || _global$12, object)) return true;
      if ((this || _global$12) !== Writable2) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
  Writable2.prototype.pipe = function() {
    errorOrDestroy(this || _global$12, new ERR_STREAM_CANNOT_PIPE());
  };
  function _write(stream, chunk, encoding, cb) {
    const state = stream._writableState;
    if (typeof encoding === "function") {
      cb = encoding;
      encoding = state.defaultEncoding;
    } else {
      if (!encoding) encoding = state.defaultEncoding;
      else if (encoding !== "buffer" && !Buffer3.isEncoding(encoding)) throw new ERR_UNKNOWN_ENCODING(encoding);
      if (typeof cb !== "function") cb = nop;
    }
    if (chunk === null) {
      throw new ERR_STREAM_NULL_VALUES();
    } else if (!state.objectMode) {
      if (typeof chunk === "string") {
        if (state.decodeStrings !== false) {
          chunk = Buffer3.from(chunk, encoding);
          encoding = "buffer";
        }
      } else if (chunk instanceof Buffer3) {
        encoding = "buffer";
      } else if (Stream2._isUint8Array(chunk)) {
        chunk = Stream2._uint8ArrayToBuffer(chunk);
        encoding = "buffer";
      } else {
        throw new ERR_INVALID_ARG_TYPE2("chunk", ["string", "Buffer", "Uint8Array"], chunk);
      }
    }
    let err;
    if (state.ending) {
      err = new ERR_STREAM_WRITE_AFTER_END();
    } else if (state.destroyed) {
      err = new ERR_STREAM_DESTROYED("write");
    }
    if (err) {
      process$1.nextTick(cb, err);
      errorOrDestroy(stream, err, true);
      return err;
    }
    state.pendingcb++;
    return writeOrBuffer(stream, state, chunk, encoding, cb);
  }
  Writable2.prototype.write = function(chunk, encoding, cb) {
    return _write(this || _global$12, chunk, encoding, cb) === true;
  };
  Writable2.prototype.cork = function() {
    (this || _global$12)._writableState.corked++;
  };
  Writable2.prototype.uncork = function() {
    const state = (this || _global$12)._writableState;
    if (state.corked) {
      state.corked--;
      if (!state.writing) clearBuffer(this || _global$12, state);
    }
  };
  Writable2.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
    if (typeof encoding === "string") encoding = StringPrototypeToLowerCase(encoding);
    if (!Buffer3.isEncoding(encoding)) throw new ERR_UNKNOWN_ENCODING(encoding);
    (this || _global$12)._writableState.defaultEncoding = encoding;
    return this || _global$12;
  };
  function writeOrBuffer(stream, state, chunk, encoding, callback) {
    const len = state.objectMode ? 1 : chunk.length;
    state.length += len;
    const ret = state.length < state.highWaterMark;
    if (!ret) state.needDrain = true;
    if (state.writing || state.corked || state.errored || !state.constructed) {
      state.buffered.push({
        chunk,
        encoding,
        callback
      });
      if (state.allBuffers && encoding !== "buffer") {
        state.allBuffers = false;
      }
      if (state.allNoop && callback !== nop) {
        state.allNoop = false;
      }
    } else {
      state.writelen = len;
      state.writecb = callback;
      state.writing = true;
      state.sync = true;
      stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    return ret && !state.errored && !state.destroyed;
  }
  function doWrite(stream, state, writev, len, chunk, encoding, cb) {
    state.writelen = len;
    state.writecb = cb;
    state.writing = true;
    state.sync = true;
    if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED("write"));
    else if (writev) stream._writev(chunk, state.onwrite);
    else stream._write(chunk, encoding, state.onwrite);
    state.sync = false;
  }
  function onwriteError(stream, state, er, cb) {
    --state.pendingcb;
    cb(er);
    errorBuffer(state);
    errorOrDestroy(stream, er);
  }
  function onwrite(stream, er) {
    const state = stream._writableState;
    const sync = state.sync;
    const cb = state.writecb;
    if (typeof cb !== "function") {
      errorOrDestroy(stream, new ERR_MULTIPLE_CALLBACK());
      return;
    }
    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;
    if (er) {
      er.stack;
      if (!state.errored) {
        state.errored = er;
      }
      if (stream._readableState && !stream._readableState.errored) {
        stream._readableState.errored = er;
      }
      if (sync) {
        process$1.nextTick(onwriteError, stream, state, er, cb);
      } else {
        onwriteError(stream, state, er, cb);
      }
    } else {
      if (state.buffered.length > state.bufferedIndex) {
        clearBuffer(stream, state);
      }
      if (sync) {
        if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) {
          state.afterWriteTickInfo.count++;
        } else {
          state.afterWriteTickInfo = {
            count: 1,
            cb,
            stream,
            state
          };
          process$1.nextTick(afterWriteTick, state.afterWriteTickInfo);
        }
      } else {
        afterWrite(stream, state, 1, cb);
      }
    }
  }
  function afterWriteTick({
    stream,
    state,
    count,
    cb
  }) {
    state.afterWriteTickInfo = null;
    return afterWrite(stream, state, count, cb);
  }
  function afterWrite(stream, state, count, cb) {
    const needDrain = !state.ending && !stream.destroyed && state.length === 0 && state.needDrain;
    if (needDrain) {
      state.needDrain = false;
      stream.emit("drain");
    }
    while (count-- > 0) {
      state.pendingcb--;
      cb();
    }
    if (state.destroyed) {
      errorBuffer(state);
    }
    finishMaybe(stream, state);
  }
  function errorBuffer(state) {
    if (state.writing) {
      return;
    }
    for (let n = state.bufferedIndex; n < state.buffered.length; ++n) {
      var _state$errored;
      const {
        chunk,
        callback
      } = state.buffered[n];
      const len = state.objectMode ? 1 : chunk.length;
      state.length -= len;
      callback((_state$errored = state.errored) !== null && _state$errored !== void 0 ? _state$errored : new ERR_STREAM_DESTROYED("write"));
    }
    const onfinishCallbacks = state[kOnFinished].splice(0);
    for (let i = 0; i < onfinishCallbacks.length; i++) {
      var _state$errored2;
      onfinishCallbacks[i]((_state$errored2 = state.errored) !== null && _state$errored2 !== void 0 ? _state$errored2 : new ERR_STREAM_DESTROYED("end"));
    }
    resetBuffer(state);
  }
  function clearBuffer(stream, state) {
    if (state.corked || state.bufferProcessing || state.destroyed || !state.constructed) {
      return;
    }
    const {
      buffered,
      bufferedIndex,
      objectMode
    } = state;
    const bufferedLength = buffered.length - bufferedIndex;
    if (!bufferedLength) {
      return;
    }
    let i = bufferedIndex;
    state.bufferProcessing = true;
    if (bufferedLength > 1 && stream._writev) {
      state.pendingcb -= bufferedLength - 1;
      const callback = state.allNoop ? nop : (err) => {
        for (let n = i; n < buffered.length; ++n) {
          buffered[n].callback(err);
        }
      };
      const chunks = state.allNoop && i === 0 ? buffered : ArrayPrototypeSlice(buffered, i);
      chunks.allBuffers = state.allBuffers;
      doWrite(stream, state, true, state.length, chunks, "", callback);
      resetBuffer(state);
    } else {
      do {
        const {
          chunk,
          encoding,
          callback
        } = buffered[i];
        buffered[i++] = null;
        const len = objectMode ? 1 : chunk.length;
        doWrite(stream, state, false, len, chunk, encoding, callback);
      } while (i < buffered.length && !state.writing);
      if (i === buffered.length) {
        resetBuffer(state);
      } else if (i > 256) {
        buffered.splice(0, i);
        state.bufferedIndex = 0;
      } else {
        state.bufferedIndex = i;
      }
    }
    state.bufferProcessing = false;
  }
  Writable2.prototype._write = function(chunk, encoding, cb) {
    if ((this || _global$12)._writev) {
      this._writev([{
        chunk,
        encoding
      }], cb);
    } else {
      throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
    }
  };
  Writable2.prototype._writev = null;
  Writable2.prototype.end = function(chunk, encoding, cb) {
    const state = (this || _global$12)._writableState;
    if (typeof chunk === "function") {
      cb = chunk;
      chunk = null;
      encoding = null;
    } else if (typeof encoding === "function") {
      cb = encoding;
      encoding = null;
    }
    let err;
    if (chunk !== null && chunk !== void 0) {
      const ret = _write(this || _global$12, chunk, encoding);
      if (ret instanceof Error2) {
        err = ret;
      }
    }
    if (state.corked) {
      state.corked = 1;
      this.uncork();
    }
    if (err) ;
    else if (!state.errored && !state.ending) {
      state.ending = true;
      finishMaybe(this || _global$12, state, true);
      state.ended = true;
    } else if (state.finished) {
      err = new ERR_STREAM_ALREADY_FINISHED("end");
    } else if (state.destroyed) {
      err = new ERR_STREAM_DESTROYED("end");
    }
    if (typeof cb === "function") {
      if (err || state.finished) {
        process$1.nextTick(cb, err);
      } else {
        state[kOnFinished].push(cb);
      }
    }
    return this || _global$12;
  };
  function needFinish(state) {
    return state.ending && !state.destroyed && state.constructed && state.length === 0 && !state.errored && state.buffered.length === 0 && !state.finished && !state.writing && !state.errorEmitted && !state.closeEmitted;
  }
  function callFinal(stream, state) {
    let called = false;
    function onFinish(err) {
      if (called) {
        errorOrDestroy(stream, err !== null && err !== void 0 ? err : ERR_MULTIPLE_CALLBACK());
        return;
      }
      called = true;
      state.pendingcb--;
      if (err) {
        const onfinishCallbacks = state[kOnFinished].splice(0);
        for (let i = 0; i < onfinishCallbacks.length; i++) {
          onfinishCallbacks[i](err);
        }
        errorOrDestroy(stream, err, state.sync);
      } else if (needFinish(state)) {
        state.prefinished = true;
        stream.emit("prefinish");
        state.pendingcb++;
        process$1.nextTick(finish, stream, state);
      }
    }
    state.sync = true;
    state.pendingcb++;
    try {
      stream._final(onFinish);
    } catch (err) {
      onFinish(err);
    }
    state.sync = false;
  }
  function prefinish(stream, state) {
    if (!state.prefinished && !state.finalCalled) {
      if (typeof stream._final === "function" && !state.destroyed) {
        state.finalCalled = true;
        callFinal(stream, state);
      } else {
        state.prefinished = true;
        stream.emit("prefinish");
      }
    }
  }
  function finishMaybe(stream, state, sync) {
    if (needFinish(state)) {
      prefinish(stream, state);
      if (state.pendingcb === 0) {
        if (sync) {
          state.pendingcb++;
          process$1.nextTick((stream2, state2) => {
            if (needFinish(state2)) {
              finish(stream2, state2);
            } else {
              state2.pendingcb--;
            }
          }, stream, state);
        } else if (needFinish(state)) {
          state.pendingcb++;
          finish(stream, state);
        }
      }
    }
  }
  function finish(stream, state) {
    state.pendingcb--;
    state.finished = true;
    const onfinishCallbacks = state[kOnFinished].splice(0);
    for (let i = 0; i < onfinishCallbacks.length; i++) {
      onfinishCallbacks[i]();
    }
    stream.emit("finish");
    if (state.autoDestroy) {
      const rState = stream._readableState;
      const autoDestroy = !rState || rState.autoDestroy && // We don't expect the readable to ever 'end'
      // if readable is explicitly set to false.
      (rState.endEmitted || rState.readable === false);
      if (autoDestroy) {
        stream.destroy();
      }
    }
  }
  ObjectDefineProperties(Writable2.prototype, {
    closed: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState ? (this || _global$12)._writableState.closed : false;
      }
    },
    destroyed: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState ? (this || _global$12)._writableState.destroyed : false;
      },
      set(value) {
        if ((this || _global$12)._writableState) {
          (this || _global$12)._writableState.destroyed = value;
        }
      }
    },
    writable: {
      __proto__: null,
      get() {
        const w = (this || _global$12)._writableState;
        return !!w && w.writable !== false && !w.destroyed && !w.errored && !w.ending && !w.ended;
      },
      set(val) {
        if ((this || _global$12)._writableState) {
          (this || _global$12)._writableState.writable = !!val;
        }
      }
    },
    writableFinished: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState ? (this || _global$12)._writableState.finished : false;
      }
    },
    writableObjectMode: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState ? (this || _global$12)._writableState.objectMode : false;
      }
    },
    writableBuffer: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState && (this || _global$12)._writableState.getBuffer();
      }
    },
    writableEnded: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState ? (this || _global$12)._writableState.ending : false;
      }
    },
    writableNeedDrain: {
      __proto__: null,
      get() {
        const wState = (this || _global$12)._writableState;
        if (!wState) return false;
        return !wState.destroyed && !wState.ending && wState.needDrain;
      }
    },
    writableHighWaterMark: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState && (this || _global$12)._writableState.highWaterMark;
      }
    },
    writableCorked: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState ? (this || _global$12)._writableState.corked : 0;
      }
    },
    writableLength: {
      __proto__: null,
      get() {
        return (this || _global$12)._writableState && (this || _global$12)._writableState.length;
      }
    },
    errored: {
      __proto__: null,
      enumerable: false,
      get() {
        return (this || _global$12)._writableState ? (this || _global$12)._writableState.errored : null;
      }
    },
    writableAborted: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return !!((this || _global$12)._writableState.writable !== false && ((this || _global$12)._writableState.destroyed || (this || _global$12)._writableState.errored) && !(this || _global$12)._writableState.finished);
      }
    }
  });
  const destroy = destroyImpl.destroy;
  Writable2.prototype.destroy = function(err, cb) {
    const state = (this || _global$12)._writableState;
    if (!state.destroyed && (state.bufferedIndex < state.buffered.length || state[kOnFinished].length)) {
      process$1.nextTick(errorBuffer, state);
    }
    destroy.call(this || _global$12, err, cb);
    return this || _global$12;
  };
  Writable2.prototype._undestroy = destroyImpl.undestroy;
  Writable2.prototype._destroy = function(err, cb) {
    cb(err);
  };
  Writable2.prototype[EE.captureRejectionSymbol] = function(err) {
    this.destroy(err);
  };
  let webStreamsAdapters;
  function lazyWebStreams() {
    if (webStreamsAdapters === void 0) webStreamsAdapters = {};
    return webStreamsAdapters;
  }
  Writable2.fromWeb = function(writableStream, options) {
    return lazyWebStreams().newStreamWritableFromWritableStream(writableStream, options);
  };
  Writable2.toWeb = function(streamWritable) {
    return lazyWebStreams().newWritableStreamFromStreamWritable(streamWritable);
  };
  return exports$b3;
}
function dew$93() {
  if (_dewExec$93) return exports$a3;
  _dewExec$93 = true;
  const process$1 = process2;
  const bufferModule = dew();
  const {
    isReadable,
    isWritable,
    isIterable,
    isNodeStream,
    isReadableNodeStream,
    isWritableNodeStream,
    isDuplexNodeStream,
    isReadableStream,
    isWritableStream
  } = dew$j2();
  const eos = dew$i2();
  const {
    AbortError,
    codes: {
      ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2,
      ERR_INVALID_RETURN_VALUE
    }
  } = dew$l();
  const {
    destroyer
  } = dew$h2();
  const Duplex2 = dew$83();
  const Readable2 = dew$b3();
  const Writable2 = dew$a3();
  const {
    createDeferredPromise
  } = dew$m();
  const from = dew$c2();
  const Blob = globalThis.Blob || bufferModule.Blob;
  const isBlob = typeof Blob !== "undefined" ? function isBlob2(b) {
    return b instanceof Blob;
  } : function isBlob2(b) {
    return false;
  };
  const AbortController = globalThis.AbortController || dew$n().AbortController;
  const {
    FunctionPrototypeCall
  } = dew$o();
  class Duplexify extends Duplex2 {
    constructor(options) {
      super(options);
      if ((options === null || options === void 0 ? void 0 : options.readable) === false) {
        this._readableState.readable = false;
        this._readableState.ended = true;
        this._readableState.endEmitted = true;
      }
      if ((options === null || options === void 0 ? void 0 : options.writable) === false) {
        this._writableState.writable = false;
        this._writableState.ending = true;
        this._writableState.ended = true;
        this._writableState.finished = true;
      }
    }
  }
  exports$a3 = function duplexify(body, name2) {
    if (isDuplexNodeStream(body)) {
      return body;
    }
    if (isReadableNodeStream(body)) {
      return _duplexify({
        readable: body
      });
    }
    if (isWritableNodeStream(body)) {
      return _duplexify({
        writable: body
      });
    }
    if (isNodeStream(body)) {
      return _duplexify({
        writable: false,
        readable: false
      });
    }
    if (isReadableStream(body)) {
      return _duplexify({
        readable: Readable2.fromWeb(body)
      });
    }
    if (isWritableStream(body)) {
      return _duplexify({
        writable: Writable2.fromWeb(body)
      });
    }
    if (typeof body === "function") {
      const {
        value,
        write,
        final,
        destroy
      } = fromAsyncGen(body);
      if (isIterable(value)) {
        return from(Duplexify, value, {
          // TODO (ronag): highWaterMark?
          objectMode: true,
          write,
          final,
          destroy
        });
      }
      const then2 = value === null || value === void 0 ? void 0 : value.then;
      if (typeof then2 === "function") {
        let d;
        const promise = FunctionPrototypeCall(then2, value, (val) => {
          if (val != null) {
            throw new ERR_INVALID_RETURN_VALUE("nully", "body", val);
          }
        }, (err) => {
          destroyer(d, err);
        });
        return d = new Duplexify({
          // TODO (ronag): highWaterMark?
          objectMode: true,
          readable: false,
          write,
          final(cb) {
            final(async () => {
              try {
                await promise;
                process$1.nextTick(cb, null);
              } catch (err) {
                process$1.nextTick(cb, err);
              }
            });
          },
          destroy
        });
      }
      throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or AsyncFunction", name2, value);
    }
    if (isBlob(body)) {
      return duplexify(body.arrayBuffer());
    }
    if (isIterable(body)) {
      return from(Duplexify, body, {
        // TODO (ronag): highWaterMark?
        objectMode: true,
        writable: false
      });
    }
    if (isReadableStream(body === null || body === void 0 ? void 0 : body.readable) && isWritableStream(body === null || body === void 0 ? void 0 : body.writable)) {
      return Duplexify.fromWeb(body);
    }
    if (typeof (body === null || body === void 0 ? void 0 : body.writable) === "object" || typeof (body === null || body === void 0 ? void 0 : body.readable) === "object") {
      const readable = body !== null && body !== void 0 && body.readable ? isReadableNodeStream(body === null || body === void 0 ? void 0 : body.readable) ? body === null || body === void 0 ? void 0 : body.readable : duplexify(body.readable) : void 0;
      const writable = body !== null && body !== void 0 && body.writable ? isWritableNodeStream(body === null || body === void 0 ? void 0 : body.writable) ? body === null || body === void 0 ? void 0 : body.writable : duplexify(body.writable) : void 0;
      return _duplexify({
        readable,
        writable
      });
    }
    const then = body === null || body === void 0 ? void 0 : body.then;
    if (typeof then === "function") {
      let d;
      FunctionPrototypeCall(then, body, (val) => {
        if (val != null) {
          d.push(val);
        }
        d.push(null);
      }, (err) => {
        destroyer(d, err);
      });
      return d = new Duplexify({
        objectMode: true,
        writable: false,
        read() {
        }
      });
    }
    throw new ERR_INVALID_ARG_TYPE2(name2, ["Blob", "ReadableStream", "WritableStream", "Stream", "Iterable", "AsyncIterable", "Function", "{ readable, writable } pair", "Promise"], body);
  };
  function fromAsyncGen(fn) {
    let {
      promise,
      resolve
    } = createDeferredPromise();
    const ac = new AbortController();
    const signal = ac.signal;
    const value = fn((function() {
      return __asyncGenerator(this, null, function* () {
        while (true) {
          const _promise = promise;
          promise = null;
          const {
            chunk,
            done,
            cb
          } = yield new __await(_promise);
          process$1.nextTick(cb);
          if (done) return;
          if (signal.aborted) throw new AbortError(void 0, {
            cause: signal.reason
          });
          ({
            promise,
            resolve
          } = createDeferredPromise());
          yield chunk;
        }
      });
    })(), {
      signal
    });
    return {
      value,
      write(chunk, encoding, cb) {
        const _resolve = resolve;
        resolve = null;
        _resolve({
          chunk,
          done: false,
          cb
        });
      },
      final(cb) {
        const _resolve = resolve;
        resolve = null;
        _resolve({
          done: true,
          cb
        });
      },
      destroy(err, cb) {
        ac.abort();
        cb(err);
      }
    };
  }
  function _duplexify(pair) {
    const r = pair.readable && typeof pair.readable.read !== "function" ? Readable2.wrap(pair.readable) : pair.readable;
    const w = pair.writable;
    let readable = !!isReadable(r);
    let writable = !!isWritable(w);
    let ondrain;
    let onfinish;
    let onreadable;
    let onclose;
    let d;
    function onfinished(err) {
      const cb = onclose;
      onclose = null;
      if (cb) {
        cb(err);
      } else if (err) {
        d.destroy(err);
      }
    }
    d = new Duplexify({
      // TODO (ronag): highWaterMark?
      readableObjectMode: !!(r !== null && r !== void 0 && r.readableObjectMode),
      writableObjectMode: !!(w !== null && w !== void 0 && w.writableObjectMode),
      readable,
      writable
    });
    if (writable) {
      eos(w, (err) => {
        writable = false;
        if (err) {
          destroyer(r, err);
        }
        onfinished(err);
      });
      d._write = function(chunk, encoding, callback) {
        if (w.write(chunk, encoding)) {
          callback();
        } else {
          ondrain = callback;
        }
      };
      d._final = function(callback) {
        w.end();
        onfinish = callback;
      };
      w.on("drain", function() {
        if (ondrain) {
          const cb = ondrain;
          ondrain = null;
          cb();
        }
      });
      w.on("finish", function() {
        if (onfinish) {
          const cb = onfinish;
          onfinish = null;
          cb();
        }
      });
    }
    if (readable) {
      eos(r, (err) => {
        readable = false;
        if (err) {
          destroyer(r, err);
        }
        onfinished(err);
      });
      r.on("readable", function() {
        if (onreadable) {
          const cb = onreadable;
          onreadable = null;
          cb();
        }
      });
      r.on("end", function() {
        d.push(null);
      });
      d._read = function() {
        while (true) {
          const buf = r.read();
          if (buf === null) {
            onreadable = d._read;
            return;
          }
          if (!d.push(buf)) {
            return;
          }
        }
      };
    }
    d._destroy = function(err, callback) {
      if (!err && onclose !== null) {
        err = new AbortError();
      }
      onreadable = null;
      ondrain = null;
      onfinish = null;
      if (onclose === null) {
        callback(err);
      } else {
        onclose = callback;
        destroyer(w, err);
        destroyer(r, err);
      }
    };
    return d;
  }
  return exports$a3;
}
function dew$83() {
  if (_dewExec$83) return exports$93;
  _dewExec$83 = true;
  const {
    ObjectDefineProperties,
    ObjectGetOwnPropertyDescriptor,
    ObjectKeys,
    ObjectSetPrototypeOf
  } = dew$o();
  exports$93 = Duplex2;
  const Readable2 = dew$b3();
  const Writable2 = dew$a3();
  ObjectSetPrototypeOf(Duplex2.prototype, Readable2.prototype);
  ObjectSetPrototypeOf(Duplex2, Readable2);
  {
    const keys = ObjectKeys(Writable2.prototype);
    for (let i = 0; i < keys.length; i++) {
      const method = keys[i];
      if (!Duplex2.prototype[method]) Duplex2.prototype[method] = Writable2.prototype[method];
    }
  }
  function Duplex2(options) {
    if (!(this instanceof Duplex2)) return new Duplex2(options);
    Readable2.call(this, options);
    Writable2.call(this, options);
    if (options) {
      this.allowHalfOpen = options.allowHalfOpen !== false;
      if (options.readable === false) {
        this._readableState.readable = false;
        this._readableState.ended = true;
        this._readableState.endEmitted = true;
      }
      if (options.writable === false) {
        this._writableState.writable = false;
        this._writableState.ending = true;
        this._writableState.ended = true;
        this._writableState.finished = true;
      }
    } else {
      this.allowHalfOpen = true;
    }
  }
  ObjectDefineProperties(Duplex2.prototype, {
    writable: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writable")),
    writableHighWaterMark: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writableHighWaterMark")),
    writableObjectMode: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writableObjectMode")),
    writableBuffer: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writableBuffer")),
    writableLength: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writableLength")),
    writableFinished: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writableFinished")),
    writableCorked: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writableCorked")),
    writableEnded: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writableEnded")),
    writableNeedDrain: __spreadValues({
      __proto__: null
    }, ObjectGetOwnPropertyDescriptor(Writable2.prototype, "writableNeedDrain")),
    destroyed: {
      __proto__: null,
      get() {
        if (this._readableState === void 0 || this._writableState === void 0) {
          return false;
        }
        return this._readableState.destroyed && this._writableState.destroyed;
      },
      set(value) {
        if (this._readableState && this._writableState) {
          this._readableState.destroyed = value;
          this._writableState.destroyed = value;
        }
      }
    }
  });
  let webStreamsAdapters;
  function lazyWebStreams() {
    if (webStreamsAdapters === void 0) webStreamsAdapters = {};
    return webStreamsAdapters;
  }
  Duplex2.fromWeb = function(pair, options) {
    return lazyWebStreams().newStreamDuplexFromReadableWritablePair(pair, options);
  };
  Duplex2.toWeb = function(duplex) {
    return lazyWebStreams().newReadableWritablePairFromDuplex(duplex);
  };
  let duplexify;
  Duplex2.from = function(body) {
    if (!duplexify) {
      duplexify = dew$93();
    }
    return duplexify(body, "body");
  };
  return exports$93;
}
function dew$73() {
  if (_dewExec$73) return exports$83;
  _dewExec$73 = true;
  const {
    ObjectSetPrototypeOf,
    Symbol: Symbol2
  } = dew$o();
  exports$83 = Transform2;
  const {
    ERR_METHOD_NOT_IMPLEMENTED
  } = dew$l().codes;
  const Duplex2 = dew$83();
  const {
    getHighWaterMark
  } = dew$d2();
  ObjectSetPrototypeOf(Transform2.prototype, Duplex2.prototype);
  ObjectSetPrototypeOf(Transform2, Duplex2);
  const kCallback = Symbol2("kCallback");
  function Transform2(options) {
    if (!(this instanceof Transform2)) return new Transform2(options);
    const readableHighWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", true) : null;
    if (readableHighWaterMark === 0) {
      options = __spreadProps(__spreadValues({}, options), {
        highWaterMark: null,
        readableHighWaterMark,
        // TODO (ronag): 0 is not optimal since we have
        // a "bug" where we check needDrain before calling _write and not after.
        // Refs: https://github.com/nodejs/node/pull/32887
        // Refs: https://github.com/nodejs/node/pull/35941
        writableHighWaterMark: options.writableHighWaterMark || 0
      });
    }
    Duplex2.call(this, options);
    this._readableState.sync = false;
    this[kCallback] = null;
    if (options) {
      if (typeof options.transform === "function") this._transform = options.transform;
      if (typeof options.flush === "function") this._flush = options.flush;
    }
    this.on("prefinish", prefinish);
  }
  function final(cb) {
    if (typeof this._flush === "function" && !this.destroyed) {
      this._flush((er, data) => {
        if (er) {
          if (cb) {
            cb(er);
          } else {
            this.destroy(er);
          }
          return;
        }
        if (data != null) {
          this.push(data);
        }
        this.push(null);
        if (cb) {
          cb();
        }
      });
    } else {
      this.push(null);
      if (cb) {
        cb();
      }
    }
  }
  function prefinish() {
    if (this._final !== final) {
      final.call(this);
    }
  }
  Transform2.prototype._final = final;
  Transform2.prototype._transform = function(chunk, encoding, callback) {
    throw new ERR_METHOD_NOT_IMPLEMENTED("_transform()");
  };
  Transform2.prototype._write = function(chunk, encoding, callback) {
    const rState = this._readableState;
    const wState = this._writableState;
    const length = rState.length;
    this._transform(chunk, encoding, (err, val) => {
      if (err) {
        callback(err);
        return;
      }
      if (val != null) {
        this.push(val);
      }
      if (wState.ended || // Backwards compat.
      length === rState.length || // Backwards compat.
      rState.length < rState.highWaterMark) {
        callback();
      } else {
        this[kCallback] = callback;
      }
    });
  };
  Transform2.prototype._read = function() {
    if (this[kCallback]) {
      const callback = this[kCallback];
      this[kCallback] = null;
      callback();
    }
  };
  return exports$83;
}
function dew$63() {
  if (_dewExec$63) return exports$73;
  _dewExec$63 = true;
  const {
    ObjectSetPrototypeOf
  } = dew$o();
  exports$73 = PassThrough2;
  const Transform2 = dew$73();
  ObjectSetPrototypeOf(PassThrough2.prototype, Transform2.prototype);
  ObjectSetPrototypeOf(PassThrough2, Transform2);
  function PassThrough2(options) {
    if (!(this instanceof PassThrough2)) return new PassThrough2(options);
    Transform2.call(this, options);
  }
  PassThrough2.prototype._transform = function(chunk, encoding, cb) {
    cb(null, chunk);
  };
  return exports$73;
}
function dew$53() {
  if (_dewExec$53) return exports$63;
  _dewExec$53 = true;
  const process$1 = process2;
  const {
    ArrayIsArray,
    Promise: Promise2,
    SymbolAsyncIterator,
    SymbolDispose
  } = dew$o();
  const eos = dew$i2();
  const {
    once: once4
  } = dew$m();
  const destroyImpl = dew$h2();
  const Duplex2 = dew$83();
  const {
    aggregateTwoErrors,
    codes: {
      ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2,
      ERR_INVALID_RETURN_VALUE,
      ERR_MISSING_ARGS,
      ERR_STREAM_DESTROYED,
      ERR_STREAM_PREMATURE_CLOSE
    },
    AbortError
  } = dew$l();
  const {
    validateFunction,
    validateAbortSignal
  } = dew$k2();
  const {
    isIterable,
    isReadable,
    isReadableNodeStream,
    isNodeStream,
    isTransformStream,
    isWebStream,
    isReadableStream,
    isReadableFinished
  } = dew$j2();
  const AbortController = globalThis.AbortController || dew$n().AbortController;
  let PassThrough2;
  let Readable2;
  let addAbortListener;
  function destroyer(stream, reading, writing) {
    let finished2 = false;
    stream.on("close", () => {
      finished2 = true;
    });
    const cleanup = eos(stream, {
      readable: reading,
      writable: writing
    }, (err) => {
      finished2 = !err;
    });
    return {
      destroy: (err) => {
        if (finished2) return;
        finished2 = true;
        destroyImpl.destroyer(stream, err || new ERR_STREAM_DESTROYED("pipe"));
      },
      cleanup
    };
  }
  function popCallback(streams) {
    validateFunction(streams[streams.length - 1], "streams[stream.length - 1]");
    return streams.pop();
  }
  function makeAsyncIterable(val) {
    if (isIterable(val)) {
      return val;
    } else if (isReadableNodeStream(val)) {
      return fromReadable(val);
    }
    throw new ERR_INVALID_ARG_TYPE2("val", ["Readable", "Iterable", "AsyncIterable"], val);
  }
  function fromReadable(val) {
    return __asyncGenerator(this, null, function* () {
      if (!Readable2) {
        Readable2 = dew$b3();
      }
      yield* __yieldStar(Readable2.prototype[SymbolAsyncIterator].call(val));
    });
  }
  async function pumpToNode(iterable, writable, finish, {
    end
  }) {
    let error;
    let onresolve = null;
    const resume = (err) => {
      if (err) {
        error = err;
      }
      if (onresolve) {
        const callback = onresolve;
        onresolve = null;
        callback();
      }
    };
    const wait = () => new Promise2((resolve, reject) => {
      if (error) {
        reject(error);
      } else {
        onresolve = () => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };
      }
    });
    writable.on("drain", resume);
    const cleanup = eos(writable, {
      readable: false
    }, resume);
    try {
      if (writable.writableNeedDrain) {
        await wait();
      }
      try {
        for (var iter = __forAwait(iterable), more, temp, error2; more = !(temp = await iter.next()).done; more = false) {
          const chunk = temp.value;
          if (!writable.write(chunk)) {
            await wait();
          }
        }
      } catch (temp) {
        error2 = [temp];
      } finally {
        try {
          more && (temp = iter.return) && await temp.call(iter);
        } finally {
          if (error2)
            throw error2[0];
        }
      }
      if (end) {
        writable.end();
        await wait();
      }
      finish();
    } catch (err) {
      finish(error !== err ? aggregateTwoErrors(error, err) : err);
    } finally {
      cleanup();
      writable.off("drain", resume);
    }
  }
  async function pumpToWeb(readable, writable, finish, {
    end
  }) {
    if (isTransformStream(writable)) {
      writable = writable.writable;
    }
    const writer = writable.getWriter();
    try {
      try {
        for (var iter = __forAwait(readable), more, temp, error; more = !(temp = await iter.next()).done; more = false) {
          const chunk = temp.value;
          await writer.ready;
          writer.write(chunk).catch(() => {
          });
        }
      } catch (temp) {
        error = [temp];
      } finally {
        try {
          more && (temp = iter.return) && await temp.call(iter);
        } finally {
          if (error)
            throw error[0];
        }
      }
      await writer.ready;
      if (end) {
        await writer.close();
      }
      finish();
    } catch (err) {
      try {
        await writer.abort(err);
        finish(err);
      } catch (err2) {
        finish(err2);
      }
    }
  }
  function pipeline2(...streams) {
    return pipelineImpl(streams, once4(popCallback(streams)));
  }
  function pipelineImpl(streams, callback, opts) {
    if (streams.length === 1 && ArrayIsArray(streams[0])) {
      streams = streams[0];
    }
    if (streams.length < 2) {
      throw new ERR_MISSING_ARGS("streams");
    }
    const ac = new AbortController();
    const signal = ac.signal;
    const outerSignal = opts === null || opts === void 0 ? void 0 : opts.signal;
    const lastStreamCleanup = [];
    validateAbortSignal(outerSignal, "options.signal");
    function abort3() {
      finishImpl(new AbortError());
    }
    addAbortListener = addAbortListener || dew$m().addAbortListener;
    let disposable;
    if (outerSignal) {
      disposable = addAbortListener(outerSignal, abort3);
    }
    let error;
    let value;
    const destroys = [];
    let finishCount = 0;
    function finish(err) {
      finishImpl(err, --finishCount === 0);
    }
    function finishImpl(err, final) {
      var _disposable;
      if (err && (!error || error.code === "ERR_STREAM_PREMATURE_CLOSE")) {
        error = err;
      }
      if (!error && !final) {
        return;
      }
      while (destroys.length) {
        destroys.shift()(error);
      }
      (_disposable = disposable) === null || _disposable === void 0 ? void 0 : _disposable[SymbolDispose]();
      ac.abort();
      if (final) {
        if (!error) {
          lastStreamCleanup.forEach((fn) => fn());
        }
        process$1.nextTick(callback, error, value);
      }
    }
    let ret;
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i];
      const reading = i < streams.length - 1;
      const writing = i > 0;
      const end = reading || (opts === null || opts === void 0 ? void 0 : opts.end) !== false;
      const isLastStream = i === streams.length - 1;
      if (isNodeStream(stream)) {
        let onError = function(err) {
          if (err && err.name !== "AbortError" && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
            finish(err);
          }
        };
        if (end) {
          const {
            destroy,
            cleanup
          } = destroyer(stream, reading, writing);
          destroys.push(destroy);
          if (isReadable(stream) && isLastStream) {
            lastStreamCleanup.push(cleanup);
          }
        }
        stream.on("error", onError);
        if (isReadable(stream) && isLastStream) {
          lastStreamCleanup.push(() => {
            stream.removeListener("error", onError);
          });
        }
      }
      if (i === 0) {
        if (typeof stream === "function") {
          ret = stream({
            signal
          });
          if (!isIterable(ret)) {
            throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or Stream", "source", ret);
          }
        } else if (isIterable(stream) || isReadableNodeStream(stream) || isTransformStream(stream)) {
          ret = stream;
        } else {
          ret = Duplex2.from(stream);
        }
      } else if (typeof stream === "function") {
        if (isTransformStream(ret)) {
          var _ret;
          ret = makeAsyncIterable((_ret = ret) === null || _ret === void 0 ? void 0 : _ret.readable);
        } else {
          ret = makeAsyncIterable(ret);
        }
        ret = stream(ret, {
          signal
        });
        if (reading) {
          if (!isIterable(ret, true)) {
            throw new ERR_INVALID_RETURN_VALUE("AsyncIterable", `transform[${i - 1}]`, ret);
          }
        } else {
          var _ret2;
          if (!PassThrough2) {
            PassThrough2 = dew$63();
          }
          const pt = new PassThrough2({
            objectMode: true
          });
          const then = (_ret2 = ret) === null || _ret2 === void 0 ? void 0 : _ret2.then;
          if (typeof then === "function") {
            finishCount++;
            then.call(ret, (val) => {
              value = val;
              if (val != null) {
                pt.write(val);
              }
              if (end) {
                pt.end();
              }
              process$1.nextTick(finish);
            }, (err) => {
              pt.destroy(err);
              process$1.nextTick(finish, err);
            });
          } else if (isIterable(ret, true)) {
            finishCount++;
            pumpToNode(ret, pt, finish, {
              end
            });
          } else if (isReadableStream(ret) || isTransformStream(ret)) {
            const toRead = ret.readable || ret;
            finishCount++;
            pumpToNode(toRead, pt, finish, {
              end
            });
          } else {
            throw new ERR_INVALID_RETURN_VALUE("AsyncIterable or Promise", "destination", ret);
          }
          ret = pt;
          const {
            destroy,
            cleanup
          } = destroyer(ret, false, true);
          destroys.push(destroy);
          if (isLastStream) {
            lastStreamCleanup.push(cleanup);
          }
        }
      } else if (isNodeStream(stream)) {
        if (isReadableNodeStream(ret)) {
          finishCount += 2;
          const cleanup = pipe(ret, stream, finish, {
            end
          });
          if (isReadable(stream) && isLastStream) {
            lastStreamCleanup.push(cleanup);
          }
        } else if (isTransformStream(ret) || isReadableStream(ret)) {
          const toRead = ret.readable || ret;
          finishCount++;
          pumpToNode(toRead, stream, finish, {
            end
          });
        } else if (isIterable(ret)) {
          finishCount++;
          pumpToNode(ret, stream, finish, {
            end
          });
        } else {
          throw new ERR_INVALID_ARG_TYPE2("val", ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"], ret);
        }
        ret = stream;
      } else if (isWebStream(stream)) {
        if (isReadableNodeStream(ret)) {
          finishCount++;
          pumpToWeb(makeAsyncIterable(ret), stream, finish, {
            end
          });
        } else if (isReadableStream(ret) || isIterable(ret)) {
          finishCount++;
          pumpToWeb(ret, stream, finish, {
            end
          });
        } else if (isTransformStream(ret)) {
          finishCount++;
          pumpToWeb(ret.readable, stream, finish, {
            end
          });
        } else {
          throw new ERR_INVALID_ARG_TYPE2("val", ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"], ret);
        }
        ret = stream;
      } else {
        ret = Duplex2.from(stream);
      }
    }
    if (signal !== null && signal !== void 0 && signal.aborted || outerSignal !== null && outerSignal !== void 0 && outerSignal.aborted) {
      process$1.nextTick(abort3);
    }
    return ret;
  }
  function pipe(src, dst, finish, {
    end
  }) {
    let ended = false;
    dst.on("close", () => {
      if (!ended) {
        finish(new ERR_STREAM_PREMATURE_CLOSE());
      }
    });
    src.pipe(dst, {
      end: false
    });
    if (end) {
      let endFn = function() {
        ended = true;
        dst.end();
      };
      if (isReadableFinished(src)) {
        process$1.nextTick(endFn);
      } else {
        src.once("end", endFn);
      }
    } else {
      finish();
    }
    eos(src, {
      readable: true,
      writable: false
    }, (err) => {
      const rState = src._readableState;
      if (err && err.code === "ERR_STREAM_PREMATURE_CLOSE" && rState && rState.ended && !rState.errored && !rState.errorEmitted) {
        src.once("end", finish).once("error", finish);
      } else {
        finish(err);
      }
    });
    return eos(dst, {
      readable: false,
      writable: true
    }, finish);
  }
  exports$63 = {
    pipelineImpl,
    pipeline: pipeline2
  };
  return exports$63;
}
function dew$43() {
  if (_dewExec$43) return exports$53;
  _dewExec$43 = true;
  const {
    pipeline: pipeline2
  } = dew$53();
  const Duplex2 = dew$83();
  const {
    destroyer
  } = dew$h2();
  const {
    isNodeStream,
    isReadable,
    isWritable,
    isWebStream,
    isTransformStream,
    isWritableStream,
    isReadableStream
  } = dew$j2();
  const {
    AbortError,
    codes: {
      ERR_INVALID_ARG_VALUE,
      ERR_MISSING_ARGS
    }
  } = dew$l();
  const eos = dew$i2();
  exports$53 = function compose(...streams) {
    if (streams.length === 0) {
      throw new ERR_MISSING_ARGS("streams");
    }
    if (streams.length === 1) {
      return Duplex2.from(streams[0]);
    }
    const orgStreams = [...streams];
    if (typeof streams[0] === "function") {
      streams[0] = Duplex2.from(streams[0]);
    }
    if (typeof streams[streams.length - 1] === "function") {
      const idx = streams.length - 1;
      streams[idx] = Duplex2.from(streams[idx]);
    }
    for (let n = 0; n < streams.length; ++n) {
      if (!isNodeStream(streams[n]) && !isWebStream(streams[n])) {
        continue;
      }
      if (n < streams.length - 1 && !(isReadable(streams[n]) || isReadableStream(streams[n]) || isTransformStream(streams[n]))) {
        throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be readable");
      }
      if (n > 0 && !(isWritable(streams[n]) || isWritableStream(streams[n]) || isTransformStream(streams[n]))) {
        throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be writable");
      }
    }
    let ondrain;
    let onfinish;
    let onreadable;
    let onclose;
    let d;
    function onfinished(err) {
      const cb = onclose;
      onclose = null;
      if (cb) {
        cb(err);
      } else if (err) {
        d.destroy(err);
      } else if (!readable && !writable) {
        d.destroy();
      }
    }
    const head = streams[0];
    const tail = pipeline2(streams, onfinished);
    const writable = !!(isWritable(head) || isWritableStream(head) || isTransformStream(head));
    const readable = !!(isReadable(tail) || isReadableStream(tail) || isTransformStream(tail));
    d = new Duplex2({
      // TODO (ronag): highWaterMark?
      writableObjectMode: !!(head !== null && head !== void 0 && head.writableObjectMode),
      readableObjectMode: !!(tail !== null && tail !== void 0 && tail.readableObjectMode),
      writable,
      readable
    });
    if (writable) {
      if (isNodeStream(head)) {
        d._write = function(chunk, encoding, callback) {
          if (head.write(chunk, encoding)) {
            callback();
          } else {
            ondrain = callback;
          }
        };
        d._final = function(callback) {
          head.end();
          onfinish = callback;
        };
        head.on("drain", function() {
          if (ondrain) {
            const cb = ondrain;
            ondrain = null;
            cb();
          }
        });
      } else if (isWebStream(head)) {
        const writable2 = isTransformStream(head) ? head.writable : head;
        const writer = writable2.getWriter();
        d._write = async function(chunk, encoding, callback) {
          try {
            await writer.ready;
            writer.write(chunk).catch(() => {
            });
            callback();
          } catch (err) {
            callback(err);
          }
        };
        d._final = async function(callback) {
          try {
            await writer.ready;
            writer.close().catch(() => {
            });
            onfinish = callback;
          } catch (err) {
            callback(err);
          }
        };
      }
      const toRead = isTransformStream(tail) ? tail.readable : tail;
      eos(toRead, () => {
        if (onfinish) {
          const cb = onfinish;
          onfinish = null;
          cb();
        }
      });
    }
    if (readable) {
      if (isNodeStream(tail)) {
        tail.on("readable", function() {
          if (onreadable) {
            const cb = onreadable;
            onreadable = null;
            cb();
          }
        });
        tail.on("end", function() {
          d.push(null);
        });
        d._read = function() {
          while (true) {
            const buf = tail.read();
            if (buf === null) {
              onreadable = d._read;
              return;
            }
            if (!d.push(buf)) {
              return;
            }
          }
        };
      } else if (isWebStream(tail)) {
        const readable2 = isTransformStream(tail) ? tail.readable : tail;
        const reader = readable2.getReader();
        d._read = async function() {
          while (true) {
            try {
              const {
                value,
                done
              } = await reader.read();
              if (!d.push(value)) {
                return;
              }
              if (done) {
                d.push(null);
                return;
              }
            } catch (e) {
              return;
            }
          }
        };
      }
    }
    d._destroy = function(err, callback) {
      if (!err && onclose !== null) {
        err = new AbortError();
      }
      onreadable = null;
      ondrain = null;
      onfinish = null;
      if (onclose === null) {
        callback(err);
      } else {
        onclose = callback;
        if (isNodeStream(tail)) {
          destroyer(tail, err);
        }
      }
    };
    return d;
  };
  return exports$53;
}
function dew$33() {
  if (_dewExec$33) return exports$43;
  _dewExec$33 = true;
  const AbortController = globalThis.AbortController || dew$n().AbortController;
  const {
    codes: {
      ERR_INVALID_ARG_VALUE,
      ERR_INVALID_ARG_TYPE: ERR_INVALID_ARG_TYPE2,
      ERR_MISSING_ARGS,
      ERR_OUT_OF_RANGE
    },
    AbortError
  } = dew$l();
  const {
    validateAbortSignal,
    validateInteger,
    validateObject
  } = dew$k2();
  const kWeakHandler = dew$o().Symbol("kWeak");
  const kResistStopPropagation = dew$o().Symbol("kResistStopPropagation");
  const {
    finished: finished2
  } = dew$i2();
  const staticCompose = dew$43();
  const {
    addAbortSignalNoValidate
  } = dew$f2();
  const {
    isWritable,
    isNodeStream
  } = dew$j2();
  const {
    deprecate: deprecate2
  } = dew$m();
  const {
    ArrayPrototypePush,
    Boolean: Boolean2,
    MathFloor,
    Number: Number2,
    NumberIsNaN,
    Promise: Promise2,
    PromiseReject,
    PromiseResolve,
    PromisePrototypeThen,
    Symbol: Symbol2
  } = dew$o();
  const kEmpty = Symbol2("kEmpty");
  const kEof = Symbol2("kEof");
  function compose(stream, options) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    if (isNodeStream(stream) && !isWritable(stream)) {
      throw new ERR_INVALID_ARG_VALUE("stream", stream, "must be writable");
    }
    const composedStream = staticCompose(this, stream);
    if (options !== null && options !== void 0 && options.signal) {
      addAbortSignalNoValidate(options.signal, composedStream);
    }
    return composedStream;
  }
  function map(fn, options) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE2("fn", ["Function", "AsyncFunction"], fn);
    }
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    let concurrency = 1;
    if ((options === null || options === void 0 ? void 0 : options.concurrency) != null) {
      concurrency = MathFloor(options.concurrency);
    }
    let highWaterMark = concurrency - 1;
    if ((options === null || options === void 0 ? void 0 : options.highWaterMark) != null) {
      highWaterMark = MathFloor(options.highWaterMark);
    }
    validateInteger(concurrency, "options.concurrency", 1);
    validateInteger(highWaterMark, "options.highWaterMark", 0);
    highWaterMark += concurrency;
    return function map2() {
      return __asyncGenerator(this, null, function* () {
        const signal = dew$m().AbortSignalAny([options === null || options === void 0 ? void 0 : options.signal].filter(Boolean2));
        const stream = this;
        const queue3 = [];
        const signalOpt = {
          signal
        };
        let next;
        let resume;
        let done = false;
        let cnt = 0;
        function onCatch() {
          done = true;
          afterItemProcessed();
        }
        function afterItemProcessed() {
          cnt -= 1;
          maybeResume();
        }
        function maybeResume() {
          if (resume && !done && cnt < concurrency && queue3.length < highWaterMark) {
            resume();
            resume = null;
          }
        }
        async function pump() {
          try {
            try {
              for (var iter = __forAwait(stream), more, temp, error; more = !(temp = await iter.next()).done; more = false) {
                let val = temp.value;
                if (done) {
                  return;
                }
                if (signal.aborted) {
                  throw new AbortError();
                }
                try {
                  val = fn(val, signalOpt);
                  if (val === kEmpty) {
                    continue;
                  }
                  val = PromiseResolve(val);
                } catch (err) {
                  val = PromiseReject(err);
                }
                cnt += 1;
                PromisePrototypeThen(val, afterItemProcessed, onCatch);
                queue3.push(val);
                if (next) {
                  next();
                  next = null;
                }
                if (!done && (queue3.length >= highWaterMark || cnt >= concurrency)) {
                  await new Promise2((resolve) => {
                    resume = resolve;
                  });
                }
              }
            } catch (temp) {
              error = [temp];
            } finally {
              try {
                more && (temp = iter.return) && await temp.call(iter);
              } finally {
                if (error)
                  throw error[0];
              }
            }
            queue3.push(kEof);
          } catch (err) {
            const val = PromiseReject(err);
            PromisePrototypeThen(val, afterItemProcessed, onCatch);
            queue3.push(val);
          } finally {
            done = true;
            if (next) {
              next();
              next = null;
            }
          }
        }
        pump();
        try {
          while (true) {
            while (queue3.length > 0) {
              const val = yield new __await(queue3[0]);
              if (val === kEof) {
                return;
              }
              if (signal.aborted) {
                throw new AbortError();
              }
              if (val !== kEmpty) {
                yield val;
              }
              queue3.shift();
              maybeResume();
            }
            yield new __await(new Promise2((resolve) => {
              next = resolve;
            }));
          }
        } finally {
          done = true;
          if (resume) {
            resume();
            resume = null;
          }
        }
      });
    }.call(this);
  }
  function asIndexedPairs(options = void 0) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    return function asIndexedPairs2() {
      return __asyncGenerator(this, null, function* () {
        let index = 0;
        try {
          for (var iter = __forAwait(this), more, temp, error; more = !(temp = yield new __await(iter.next())).done; more = false) {
            const val = temp.value;
            var _options$signal;
            if (options !== null && options !== void 0 && (_options$signal = options.signal) !== null && _options$signal !== void 0 && _options$signal.aborted) {
              throw new AbortError({
                cause: options.signal.reason
              });
            }
            yield [index++, val];
          }
        } catch (temp) {
          error = [temp];
        } finally {
          try {
            more && (temp = iter.return) && (yield new __await(temp.call(iter)));
          } finally {
            if (error)
              throw error[0];
          }
        }
      });
    }.call(this);
  }
  async function some(fn, options = void 0) {
    try {
      for (var iter = __forAwait(filter.call(this, fn, options)), more, temp, error; more = !(temp = await iter.next()).done; more = false) {
        const unused = temp.value;
        return true;
      }
    } catch (temp) {
      error = [temp];
    } finally {
      try {
        more && (temp = iter.return) && await temp.call(iter);
      } finally {
        if (error)
          throw error[0];
      }
    }
    return false;
  }
  async function every(fn, options = void 0) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE2("fn", ["Function", "AsyncFunction"], fn);
    }
    return !await some.call(this, async (...args) => {
      return !await fn(...args);
    }, options);
  }
  async function find(fn, options) {
    try {
      for (var iter = __forAwait(filter.call(this, fn, options)), more, temp, error; more = !(temp = await iter.next()).done; more = false) {
        const result = temp.value;
        return result;
      }
    } catch (temp) {
      error = [temp];
    } finally {
      try {
        more && (temp = iter.return) && await temp.call(iter);
      } finally {
        if (error)
          throw error[0];
      }
    }
    return void 0;
  }
  async function forEach(fn, options) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE2("fn", ["Function", "AsyncFunction"], fn);
    }
    async function forEachFn(value, options2) {
      await fn(value, options2);
      return kEmpty;
    }
    try {
      for (var iter = __forAwait(map.call(this, forEachFn, options)), more, temp, error; more = !(temp = await iter.next()).done; more = false) {
        const unused = temp.value;
        ;
      }
    } catch (temp) {
      error = [temp];
    } finally {
      try {
        more && (temp = iter.return) && await temp.call(iter);
      } finally {
        if (error)
          throw error[0];
      }
    }
  }
  function filter(fn, options) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE2("fn", ["Function", "AsyncFunction"], fn);
    }
    async function filterFn(value, options2) {
      if (await fn(value, options2)) {
        return value;
      }
      return kEmpty;
    }
    return map.call(this, filterFn, options);
  }
  class ReduceAwareErrMissingArgs extends ERR_MISSING_ARGS {
    constructor() {
      super("reduce");
      this.message = "Reduce of an empty stream requires an initial value";
    }
  }
  async function reduce(reducer, initialValue, options) {
    var _options$signal2;
    if (typeof reducer !== "function") {
      throw new ERR_INVALID_ARG_TYPE2("reducer", ["Function", "AsyncFunction"], reducer);
    }
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    let hasInitialValue = arguments.length > 1;
    if (options !== null && options !== void 0 && (_options$signal2 = options.signal) !== null && _options$signal2 !== void 0 && _options$signal2.aborted) {
      const err = new AbortError(void 0, {
        cause: options.signal.reason
      });
      this.once("error", () => {
      });
      await finished2(this.destroy(err));
      throw err;
    }
    const ac = new AbortController();
    const signal = ac.signal;
    if (options !== null && options !== void 0 && options.signal) {
      const opts = {
        once: true,
        [kWeakHandler]: this,
        [kResistStopPropagation]: true
      };
      options.signal.addEventListener("abort", () => ac.abort(), opts);
    }
    let gotAnyItemFromStream = false;
    try {
      try {
        for (var iter = __forAwait(this), more, temp, error; more = !(temp = await iter.next()).done; more = false) {
          const value = temp.value;
          var _options$signal3;
          gotAnyItemFromStream = true;
          if (options !== null && options !== void 0 && (_options$signal3 = options.signal) !== null && _options$signal3 !== void 0 && _options$signal3.aborted) {
            throw new AbortError();
          }
          if (!hasInitialValue) {
            initialValue = value;
            hasInitialValue = true;
          } else {
            initialValue = await reducer(initialValue, value, {
              signal
            });
          }
        }
      } catch (temp) {
        error = [temp];
      } finally {
        try {
          more && (temp = iter.return) && await temp.call(iter);
        } finally {
          if (error)
            throw error[0];
        }
      }
      if (!gotAnyItemFromStream && !hasInitialValue) {
        throw new ReduceAwareErrMissingArgs();
      }
    } finally {
      ac.abort();
    }
    return initialValue;
  }
  async function toArray(options) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    const result = [];
    try {
      for (var iter = __forAwait(this), more, temp, error; more = !(temp = await iter.next()).done; more = false) {
        const val = temp.value;
        var _options$signal4;
        if (options !== null && options !== void 0 && (_options$signal4 = options.signal) !== null && _options$signal4 !== void 0 && _options$signal4.aborted) {
          throw new AbortError(void 0, {
            cause: options.signal.reason
          });
        }
        ArrayPrototypePush(result, val);
      }
    } catch (temp) {
      error = [temp];
    } finally {
      try {
        more && (temp = iter.return) && await temp.call(iter);
      } finally {
        if (error)
          throw error[0];
      }
    }
    return result;
  }
  function flatMap(fn, options) {
    const values = map.call(this, fn, options);
    return function flatMap2() {
      return __asyncGenerator(this, null, function* () {
        try {
          for (var iter = __forAwait(values), more, temp, error; more = !(temp = yield new __await(iter.next())).done; more = false) {
            const val = temp.value;
            yield* __yieldStar(val);
          }
        } catch (temp) {
          error = [temp];
        } finally {
          try {
            more && (temp = iter.return) && (yield new __await(temp.call(iter)));
          } finally {
            if (error)
              throw error[0];
          }
        }
      });
    }.call(this);
  }
  function toIntegerOrInfinity(number) {
    number = Number2(number);
    if (NumberIsNaN(number)) {
      return 0;
    }
    if (number < 0) {
      throw new ERR_OUT_OF_RANGE("number", ">= 0", number);
    }
    return number;
  }
  function drop(number, options = void 0) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    number = toIntegerOrInfinity(number);
    return function drop2() {
      return __asyncGenerator(this, null, function* () {
        var _options$signal5;
        if (options !== null && options !== void 0 && (_options$signal5 = options.signal) !== null && _options$signal5 !== void 0 && _options$signal5.aborted) {
          throw new AbortError();
        }
        try {
          for (var iter = __forAwait(this), more, temp, error; more = !(temp = yield new __await(iter.next())).done; more = false) {
            const val = temp.value;
            var _options$signal6;
            if (options !== null && options !== void 0 && (_options$signal6 = options.signal) !== null && _options$signal6 !== void 0 && _options$signal6.aborted) {
              throw new AbortError();
            }
            if (number-- <= 0) {
              yield val;
            }
          }
        } catch (temp) {
          error = [temp];
        } finally {
          try {
            more && (temp = iter.return) && (yield new __await(temp.call(iter)));
          } finally {
            if (error)
              throw error[0];
          }
        }
      });
    }.call(this);
  }
  function take(number, options = void 0) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    number = toIntegerOrInfinity(number);
    return function take2() {
      return __asyncGenerator(this, null, function* () {
        var _options$signal7;
        if (options !== null && options !== void 0 && (_options$signal7 = options.signal) !== null && _options$signal7 !== void 0 && _options$signal7.aborted) {
          throw new AbortError();
        }
        try {
          for (var iter = __forAwait(this), more, temp, error; more = !(temp = yield new __await(iter.next())).done; more = false) {
            const val = temp.value;
            var _options$signal8;
            if (options !== null && options !== void 0 && (_options$signal8 = options.signal) !== null && _options$signal8 !== void 0 && _options$signal8.aborted) {
              throw new AbortError();
            }
            if (number-- > 0) {
              yield val;
            }
            if (number <= 0) {
              return;
            }
          }
        } catch (temp) {
          error = [temp];
        } finally {
          try {
            more && (temp = iter.return) && (yield new __await(temp.call(iter)));
          } finally {
            if (error)
              throw error[0];
          }
        }
      });
    }.call(this);
  }
  exports$43.streamReturningOperators = {
    asIndexedPairs: deprecate2(asIndexedPairs, "readable.asIndexedPairs will be removed in a future version."),
    drop,
    filter,
    flatMap,
    map,
    take,
    compose
  };
  exports$43.promiseReturningOperators = {
    every,
    forEach,
    reduce,
    toArray,
    some,
    find
  };
  return exports$43;
}
function dew$24() {
  if (_dewExec$24) return exports$33;
  _dewExec$24 = true;
  const {
    ArrayPrototypePop,
    Promise: Promise2
  } = dew$o();
  const {
    isIterable,
    isNodeStream,
    isWebStream
  } = dew$j2();
  const {
    pipelineImpl: pl
  } = dew$53();
  const {
    finished: finished2
  } = dew$i2();
  dew$15();
  function pipeline2(...streams) {
    return new Promise2((resolve, reject) => {
      let signal;
      let end;
      const lastArg = streams[streams.length - 1];
      if (lastArg && typeof lastArg === "object" && !isNodeStream(lastArg) && !isIterable(lastArg) && !isWebStream(lastArg)) {
        const options = ArrayPrototypePop(streams);
        signal = options.signal;
        end = options.end;
      }
      pl(streams, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      }, {
        signal,
        end
      });
    });
  }
  exports$33 = {
    finished: finished2,
    pipeline: pipeline2
  };
  return exports$33;
}
function dew$15() {
  if (_dewExec$15) return exports$25;
  _dewExec$15 = true;
  const {
    Buffer: Buffer3
  } = dew();
  const {
    ObjectDefineProperty,
    ObjectKeys,
    ReflectApply
  } = dew$o();
  const {
    promisify: {
      custom: customPromisify
    }
  } = dew$m();
  const {
    streamReturningOperators,
    promiseReturningOperators
  } = dew$33();
  const {
    codes: {
      ERR_ILLEGAL_CONSTRUCTOR
    }
  } = dew$l();
  const compose = dew$43();
  const {
    setDefaultHighWaterMark,
    getDefaultHighWaterMark
  } = dew$d2();
  const {
    pipeline: pipeline2
  } = dew$53();
  const {
    destroyer
  } = dew$h2();
  const eos = dew$i2();
  const promises2 = dew$24();
  const utils = dew$j2();
  const Stream2 = exports$25 = dew$g2().Stream;
  Stream2.isDestroyed = utils.isDestroyed;
  Stream2.isDisturbed = utils.isDisturbed;
  Stream2.isErrored = utils.isErrored;
  Stream2.isReadable = utils.isReadable;
  Stream2.isWritable = utils.isWritable;
  Stream2.Readable = dew$b3();
  for (const key of ObjectKeys(streamReturningOperators)) {
    let fn = function(...args) {
      if (new.target) {
        throw ERR_ILLEGAL_CONSTRUCTOR();
      }
      return Stream2.Readable.from(ReflectApply(op, this || _global2, args));
    };
    const op = streamReturningOperators[key];
    ObjectDefineProperty(fn, "name", {
      __proto__: null,
      value: op.name
    });
    ObjectDefineProperty(fn, "length", {
      __proto__: null,
      value: op.length
    });
    ObjectDefineProperty(Stream2.Readable.prototype, key, {
      __proto__: null,
      value: fn,
      enumerable: false,
      configurable: true,
      writable: true
    });
  }
  for (const key of ObjectKeys(promiseReturningOperators)) {
    let fn = function(...args) {
      if (new.target) {
        throw ERR_ILLEGAL_CONSTRUCTOR();
      }
      return ReflectApply(op, this || _global2, args);
    };
    const op = promiseReturningOperators[key];
    ObjectDefineProperty(fn, "name", {
      __proto__: null,
      value: op.name
    });
    ObjectDefineProperty(fn, "length", {
      __proto__: null,
      value: op.length
    });
    ObjectDefineProperty(Stream2.Readable.prototype, key, {
      __proto__: null,
      value: fn,
      enumerable: false,
      configurable: true,
      writable: true
    });
  }
  Stream2.Writable = dew$a3();
  Stream2.Duplex = dew$83();
  Stream2.Transform = dew$73();
  Stream2.PassThrough = dew$63();
  Stream2.pipeline = pipeline2;
  const {
    addAbortSignal
  } = dew$f2();
  Stream2.addAbortSignal = addAbortSignal;
  Stream2.finished = eos;
  Stream2.destroy = destroyer;
  Stream2.compose = compose;
  Stream2.setDefaultHighWaterMark = setDefaultHighWaterMark;
  Stream2.getDefaultHighWaterMark = getDefaultHighWaterMark;
  ObjectDefineProperty(Stream2, "promises", {
    __proto__: null,
    configurable: true,
    enumerable: true,
    get() {
      return promises2;
    }
  });
  ObjectDefineProperty(pipeline2, customPromisify, {
    __proto__: null,
    enumerable: true,
    get() {
      return promises2.pipeline;
    }
  });
  ObjectDefineProperty(eos, customPromisify, {
    __proto__: null,
    enumerable: true,
    get() {
      return promises2.finished;
    }
  });
  Stream2.Stream = Stream2;
  Stream2._isUint8Array = function isUint8Array(value) {
    return value instanceof Uint8Array;
  };
  Stream2._uint8ArrayToBuffer = function _uint8ArrayToBuffer(chunk) {
    return Buffer3.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  };
  return exports$25;
}
function dew7() {
  if (_dewExec7) return exports$16;
  _dewExec7 = true;
  const CustomStream = dew$15();
  const promises2 = dew$24();
  const originalDestroy = CustomStream.Readable.destroy;
  exports$16 = CustomStream.Readable;
  exports$16._uint8ArrayToBuffer = CustomStream._uint8ArrayToBuffer;
  exports$16._isUint8Array = CustomStream._isUint8Array;
  exports$16.isDisturbed = CustomStream.isDisturbed;
  exports$16.isErrored = CustomStream.isErrored;
  exports$16.isReadable = CustomStream.isReadable;
  exports$16.Readable = CustomStream.Readable;
  exports$16.Writable = CustomStream.Writable;
  exports$16.Duplex = CustomStream.Duplex;
  exports$16.Transform = CustomStream.Transform;
  exports$16.PassThrough = CustomStream.PassThrough;
  exports$16.addAbortSignal = CustomStream.addAbortSignal;
  exports$16.finished = CustomStream.finished;
  exports$16.destroy = CustomStream.destroy;
  exports$16.destroy = originalDestroy;
  exports$16.pipeline = CustomStream.pipeline;
  exports$16.compose = CustomStream.compose;
  Object.defineProperty(CustomStream, "promises", {
    configurable: true,
    enumerable: true,
    get() {
      return promises2;
    }
  });
  exports$16.Stream = CustomStream.Stream;
  exports$16.default = exports$16;
  return exports$16;
}
var exports$p, _dewExec$o, exports$o, _dewExec$n, exports$n, _dewExec$m, exports$m, _dewExec$l, exports$l, _dewExec$k2, exports$k2, _dewExec$j2, exports$j2, _dewExec$i2, exports$i2, _dewExec$h2, exports$h2, _dewExec$g2, exports$g2, _dewExec$f2, exports$f2, _dewExec$e2, exports$e2, _dewExec$d2, exports$d2, _dewExec$c2, exports$c3, _dewExec$b3, _global$22, exports$b3, _dewExec$a3, _global$12, exports$a3, _dewExec$93, exports$93, _dewExec$83, exports$83, _dewExec$73, exports$73, _dewExec$63, exports$63, _dewExec$53, exports$53, _dewExec$43, exports$43, _dewExec$33, exports$33, _dewExec$24, exports$25, _dewExec$15, _global2, exports$16, _dewExec7, exports9, Readable, Writable, Duplex, Transform, PassThrough, finished, pipeline, Stream, promises;
var init_stream = __esm({
  "node_modules/@jspm/core/nodelibs/browser/stream.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    init_chunk_DtuTasat();
    init_events();
    init_chunk_DEMDiNwt();
    init_chunk_CcCWfKp1();
    init_util();
    init_chunk_DtcTpLWz();
    init_chunk_CkFCi_G1();
    exports$p = {};
    _dewExec$o = false;
    exports$o = {};
    _dewExec$n = false;
    exports$n = {};
    _dewExec$m = false;
    exports$m = {};
    _dewExec$l = false;
    exports$l = {};
    _dewExec$k2 = false;
    exports$k2 = {};
    _dewExec$j2 = false;
    exports$j2 = {};
    _dewExec$i2 = false;
    exports$i2 = {};
    _dewExec$h2 = false;
    exports$h2 = {};
    _dewExec$g2 = false;
    exports$g2 = {};
    _dewExec$f2 = false;
    exports$f2 = {};
    _dewExec$e2 = false;
    exports$e2 = {};
    _dewExec$d2 = false;
    exports$d2 = {};
    _dewExec$c2 = false;
    exports$c3 = {};
    _dewExec$b3 = false;
    _global$22 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports$b3 = {};
    _dewExec$a3 = false;
    _global$12 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports$a3 = {};
    _dewExec$93 = false;
    exports$93 = {};
    _dewExec$83 = false;
    exports$83 = {};
    _dewExec$73 = false;
    exports$73 = {};
    _dewExec$63 = false;
    exports$63 = {};
    _dewExec$53 = false;
    exports$53 = {};
    _dewExec$43 = false;
    exports$43 = {};
    _dewExec$33 = false;
    exports$33 = {};
    _dewExec$24 = false;
    exports$25 = {};
    _dewExec$15 = false;
    _global2 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports$16 = {};
    _dewExec7 = false;
    exports9 = dew7();
    exports9["_uint8ArrayToBuffer"];
    exports9["_isUint8Array"];
    exports9["isDisturbed"];
    exports9["isErrored"];
    exports9["isReadable"];
    exports9["Readable"];
    exports9["Writable"];
    exports9["Duplex"];
    exports9["Transform"];
    exports9["PassThrough"];
    exports9["addAbortSignal"];
    exports9["finished"];
    exports9["destroy"];
    exports9["pipeline"];
    exports9["compose"];
    exports9["Stream"];
    Readable = exports9.Readable;
    Readable.wrap = function(src, options) {
      options = Object.assign({ objectMode: src.readableObjectMode != null || src.objectMode != null || true }, options);
      options.destroy = function(err, callback) {
        src.destroy(err);
        callback(err);
      };
      return new Readable(options).wrap(src);
    };
    Writable = exports9.Writable;
    Duplex = exports9.Duplex;
    Transform = exports9.Transform;
    PassThrough = exports9.PassThrough;
    finished = exports9.finished;
    pipeline = exports9.pipeline;
    Stream = exports9.Stream;
    promises = {
      finished: promisify(exports9.finished),
      pipeline: promisify(exports9.pipeline)
    };
  }
});

// node_modules/sax/lib/sax.js
var require_sax = __commonJS({
  "node_modules/sax/lib/sax.js"(exports11) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function(sax) {
      sax.parser = function(strict, opt) {
        return new SAXParser(strict, opt);
      };
      sax.SAXParser = SAXParser;
      sax.SAXStream = SAXStream;
      sax.createStream = createStream;
      sax.MAX_BUFFER_LENGTH = 64 * 1024;
      var buffers = [
        "comment",
        "sgmlDecl",
        "textNode",
        "tagName",
        "doctype",
        "procInstName",
        "procInstBody",
        "entity",
        "attribName",
        "attribValue",
        "cdata",
        "script"
      ];
      sax.EVENTS = [
        "text",
        "processinginstruction",
        "sgmldeclaration",
        "doctype",
        "comment",
        "opentagstart",
        "attribute",
        "opentag",
        "closetag",
        "opencdata",
        "cdata",
        "closecdata",
        "error",
        "end",
        "ready",
        "script",
        "opennamespace",
        "closenamespace"
      ];
      function SAXParser(strict, opt) {
        if (!(this instanceof SAXParser)) {
          return new SAXParser(strict, opt);
        }
        var parser = this;
        clearBuffers(parser);
        parser.q = parser.c = "";
        parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH;
        parser.encoding = null;
        parser.opt = opt || {};
        parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags;
        parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase";
        parser.opt.maxEntityCount = parser.opt.maxEntityCount || 512;
        parser.opt.maxEntityDepth = parser.opt.maxEntityDepth || 4;
        parser.entityCount = parser.entityDepth = 0;
        parser.tags = [];
        parser.closed = parser.closedRoot = parser.sawRoot = false;
        parser.tag = parser.error = null;
        parser.strict = !!strict;
        parser.noscript = !!(strict || parser.opt.noscript);
        parser.state = S.BEGIN;
        parser.strictEntities = parser.opt.strictEntities;
        parser.ENTITIES = parser.strictEntities ? Object.create(sax.XML_ENTITIES) : Object.create(sax.ENTITIES);
        parser.attribList = [];
        if (parser.opt.xmlns) {
          parser.ns = Object.create(rootNS);
        }
        if (parser.opt.unquotedAttributeValues === void 0) {
          parser.opt.unquotedAttributeValues = !strict;
        }
        parser.trackPosition = parser.opt.position !== false;
        if (parser.trackPosition) {
          parser.position = parser.line = parser.column = 0;
        }
        emit3(parser, "onready");
      }
      if (!Object.create) {
        Object.create = function(o) {
          function F() {
          }
          F.prototype = o;
          var newf = new F();
          return newf;
        };
      }
      if (!Object.keys) {
        Object.keys = function(o) {
          var a = [];
          for (var i in o) if (o.hasOwnProperty(i)) a.push(i);
          return a;
        };
      }
      function checkBufferLength(parser) {
        var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10);
        var maxActual = 0;
        for (var i = 0, l = buffers.length; i < l; i++) {
          var len = parser[buffers[i]].length;
          if (len > maxAllowed) {
            switch (buffers[i]) {
              case "textNode":
                closeText(parser);
                break;
              case "cdata":
                emitNode(parser, "oncdata", parser.cdata);
                parser.cdata = "";
                break;
              case "script":
                emitNode(parser, "onscript", parser.script);
                parser.script = "";
                break;
              default:
                error(parser, "Max buffer length exceeded: " + buffers[i]);
            }
          }
          maxActual = Math.max(maxActual, len);
        }
        var m = sax.MAX_BUFFER_LENGTH - maxActual;
        parser.bufferCheckPosition = m + parser.position;
      }
      function clearBuffers(parser) {
        for (var i = 0, l = buffers.length; i < l; i++) {
          parser[buffers[i]] = "";
        }
      }
      function flushBuffers(parser) {
        closeText(parser);
        if (parser.cdata !== "") {
          emitNode(parser, "oncdata", parser.cdata);
          parser.cdata = "";
        }
        if (parser.script !== "") {
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
      }
      SAXParser.prototype = {
        end: function() {
          end(this);
        },
        write,
        resume: function() {
          this.error = null;
          return this;
        },
        close: function() {
          return this.write(null);
        },
        flush: function() {
          flushBuffers(this);
        }
      };
      var Stream2;
      try {
        Stream2 = (init_stream(), __toCommonJS(stream_exports)).Stream;
      } catch (ex) {
        Stream2 = function() {
        };
      }
      if (!Stream2) Stream2 = function() {
      };
      var streamWraps = sax.EVENTS.filter(function(ev) {
        return ev !== "error" && ev !== "end";
      });
      function createStream(strict, opt) {
        return new SAXStream(strict, opt);
      }
      function determineBufferEncoding(data, isEnd) {
        if (data.length >= 2) {
          if (data[0] === 255 && data[1] === 254) {
            return "utf-16le";
          }
          if (data[0] === 254 && data[1] === 255) {
            return "utf-16be";
          }
        }
        if (data.length >= 3 && data[0] === 239 && data[1] === 187 && data[2] === 191) {
          return "utf8";
        }
        if (data.length >= 4) {
          if (data[0] === 60 && data[1] === 0 && data[2] === 63 && data[3] === 0) {
            return "utf-16le";
          }
          if (data[0] === 0 && data[1] === 60 && data[2] === 0 && data[3] === 63) {
            return "utf-16be";
          }
          return "utf8";
        }
        return isEnd ? "utf8" : null;
      }
      function SAXStream(strict, opt) {
        if (!(this instanceof SAXStream)) {
          return new SAXStream(strict, opt);
        }
        Stream2.apply(this);
        this._parser = new SAXParser(strict, opt);
        this.writable = true;
        this.readable = true;
        var me = this;
        this._parser.onend = function() {
          me.emit("end");
        };
        this._parser.onerror = function(er) {
          me.emit("error", er);
          me._parser.error = null;
        };
        this._decoder = null;
        this._decoderBuffer = null;
        streamWraps.forEach(function(ev) {
          Object.defineProperty(me, "on" + ev, {
            get: function() {
              return me._parser["on" + ev];
            },
            set: function(h) {
              if (!h) {
                me.removeAllListeners(ev);
                me._parser["on" + ev] = h;
                return h;
              }
              me.on(ev, h);
            },
            enumerable: true,
            configurable: false
          });
        });
      }
      SAXStream.prototype = Object.create(Stream2.prototype, {
        constructor: {
          value: SAXStream
        }
      });
      SAXStream.prototype._decodeBuffer = function(data, isEnd) {
        if (this._decoderBuffer) {
          data = Buffer2.concat([this._decoderBuffer, data]);
          this._decoderBuffer = null;
        }
        if (!this._decoder) {
          var encoding = determineBufferEncoding(data, isEnd);
          if (!encoding) {
            this._decoderBuffer = data;
            return "";
          }
          this._parser.encoding = encoding;
          this._decoder = new TextDecoder(encoding);
        }
        return this._decoder.decode(data, { stream: !isEnd });
      };
      SAXStream.prototype.write = function(data) {
        if (typeof Buffer2 === "function" && typeof Buffer2.isBuffer === "function" && Buffer2.isBuffer(data)) {
          data = this._decodeBuffer(data, false);
        } else if (this._decoderBuffer) {
          var remaining = this._decodeBuffer(Buffer2.alloc(0), true);
          if (remaining) {
            this._parser.write(remaining);
            this.emit("data", remaining);
          }
        }
        this._parser.write(data.toString());
        this.emit("data", data);
        return true;
      };
      SAXStream.prototype.end = function(chunk) {
        if (chunk && chunk.length) {
          this.write(chunk);
        }
        if (this._decoderBuffer) {
          var finalChunk = this._decodeBuffer(Buffer2.alloc(0), true);
          if (finalChunk) {
            this._parser.write(finalChunk);
            this.emit("data", finalChunk);
          }
        } else if (this._decoder) {
          var remaining = this._decoder.decode();
          if (remaining) {
            this._parser.write(remaining);
            this.emit("data", remaining);
          }
        }
        this._parser.end();
        return true;
      };
      SAXStream.prototype.on = function(ev, handler) {
        var me = this;
        if (!me._parser["on" + ev] && streamWraps.indexOf(ev) !== -1) {
          me._parser["on" + ev] = function() {
            var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
            args.splice(0, 0, ev);
            me.emit.apply(me, args);
          };
        }
        return Stream2.prototype.on.call(me, ev, handler);
      };
      var CDATA = "[CDATA[";
      var DOCTYPE = "DOCTYPE";
      var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
      var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
      var rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE };
      var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      var entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      function isWhitespace(c) {
        return c === " " || c === "\n" || c === "\r" || c === "	";
      }
      function isQuote(c) {
        return c === '"' || c === "'";
      }
      function isAttribEnd(c) {
        return c === ">" || isWhitespace(c);
      }
      function isMatch(regex, c) {
        return regex.test(c);
      }
      function notMatch(regex, c) {
        return !isMatch(regex, c);
      }
      var S = 0;
      sax.STATE = {
        BEGIN: S++,
        // leading byte order mark or whitespace
        BEGIN_WHITESPACE: S++,
        // leading whitespace
        TEXT: S++,
        // general stuff
        TEXT_ENTITY: S++,
        // &amp and such.
        OPEN_WAKA: S++,
        // <
        SGML_DECL: S++,
        // <!BLARG
        SGML_DECL_QUOTED: S++,
        // <!BLARG foo "bar
        DOCTYPE: S++,
        // <!DOCTYPE
        DOCTYPE_QUOTED: S++,
        // <!DOCTYPE "//blah
        DOCTYPE_DTD: S++,
        // <!DOCTYPE "//blah" [ ...
        DOCTYPE_DTD_QUOTED: S++,
        // <!DOCTYPE "//blah" [ "foo
        COMMENT_STARTING: S++,
        // <!-
        COMMENT: S++,
        // <!--
        COMMENT_ENDING: S++,
        // <!-- blah -
        COMMENT_ENDED: S++,
        // <!-- blah --
        CDATA: S++,
        // <![CDATA[ something
        CDATA_ENDING: S++,
        // ]
        CDATA_ENDING_2: S++,
        // ]]
        PROC_INST: S++,
        // <?hi
        PROC_INST_BODY: S++,
        // <?hi there
        PROC_INST_ENDING: S++,
        // <?hi "there" ?
        OPEN_TAG: S++,
        // <strong
        OPEN_TAG_SLASH: S++,
        // <strong /
        ATTRIB: S++,
        // <a
        ATTRIB_NAME: S++,
        // <a foo
        ATTRIB_NAME_SAW_WHITE: S++,
        // <a foo _
        ATTRIB_VALUE: S++,
        // <a foo=
        ATTRIB_VALUE_QUOTED: S++,
        // <a foo="bar
        ATTRIB_VALUE_CLOSED: S++,
        // <a foo="bar"
        ATTRIB_VALUE_UNQUOTED: S++,
        // <a foo=bar
        ATTRIB_VALUE_ENTITY_Q: S++,
        // <foo bar="&quot;"
        ATTRIB_VALUE_ENTITY_U: S++,
        // <foo bar=&quot
        CLOSE_TAG: S++,
        // </a
        CLOSE_TAG_SAW_WHITE: S++,
        // </a   >
        SCRIPT: S++,
        // <script> ...
        SCRIPT_ENDING: S++
        // <script> ... <
      };
      sax.XML_ENTITIES = {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'"
      };
      sax.ENTITIES = {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'",
        AElig: 198,
        Aacute: 193,
        Acirc: 194,
        Agrave: 192,
        Aring: 197,
        Atilde: 195,
        Auml: 196,
        Ccedil: 199,
        ETH: 208,
        Eacute: 201,
        Ecirc: 202,
        Egrave: 200,
        Euml: 203,
        Iacute: 205,
        Icirc: 206,
        Igrave: 204,
        Iuml: 207,
        Ntilde: 209,
        Oacute: 211,
        Ocirc: 212,
        Ograve: 210,
        Oslash: 216,
        Otilde: 213,
        Ouml: 214,
        THORN: 222,
        Uacute: 218,
        Ucirc: 219,
        Ugrave: 217,
        Uuml: 220,
        Yacute: 221,
        aacute: 225,
        acirc: 226,
        aelig: 230,
        agrave: 224,
        aring: 229,
        atilde: 227,
        auml: 228,
        ccedil: 231,
        eacute: 233,
        ecirc: 234,
        egrave: 232,
        eth: 240,
        euml: 235,
        iacute: 237,
        icirc: 238,
        igrave: 236,
        iuml: 239,
        ntilde: 241,
        oacute: 243,
        ocirc: 244,
        ograve: 242,
        oslash: 248,
        otilde: 245,
        ouml: 246,
        szlig: 223,
        thorn: 254,
        uacute: 250,
        ucirc: 251,
        ugrave: 249,
        uuml: 252,
        yacute: 253,
        yuml: 255,
        copy: 169,
        reg: 174,
        nbsp: 160,
        iexcl: 161,
        cent: 162,
        pound: 163,
        curren: 164,
        yen: 165,
        brvbar: 166,
        sect: 167,
        uml: 168,
        ordf: 170,
        laquo: 171,
        not: 172,
        shy: 173,
        macr: 175,
        deg: 176,
        plusmn: 177,
        sup1: 185,
        sup2: 178,
        sup3: 179,
        acute: 180,
        micro: 181,
        para: 182,
        middot: 183,
        cedil: 184,
        ordm: 186,
        raquo: 187,
        frac14: 188,
        frac12: 189,
        frac34: 190,
        iquest: 191,
        times: 215,
        divide: 247,
        OElig: 338,
        oelig: 339,
        Scaron: 352,
        scaron: 353,
        Yuml: 376,
        fnof: 402,
        circ: 710,
        tilde: 732,
        Alpha: 913,
        Beta: 914,
        Gamma: 915,
        Delta: 916,
        Epsilon: 917,
        Zeta: 918,
        Eta: 919,
        Theta: 920,
        Iota: 921,
        Kappa: 922,
        Lambda: 923,
        Mu: 924,
        Nu: 925,
        Xi: 926,
        Omicron: 927,
        Pi: 928,
        Rho: 929,
        Sigma: 931,
        Tau: 932,
        Upsilon: 933,
        Phi: 934,
        Chi: 935,
        Psi: 936,
        Omega: 937,
        alpha: 945,
        beta: 946,
        gamma: 947,
        delta: 948,
        epsilon: 949,
        zeta: 950,
        eta: 951,
        theta: 952,
        iota: 953,
        kappa: 954,
        lambda: 955,
        mu: 956,
        nu: 957,
        xi: 958,
        omicron: 959,
        pi: 960,
        rho: 961,
        sigmaf: 962,
        sigma: 963,
        tau: 964,
        upsilon: 965,
        phi: 966,
        chi: 967,
        psi: 968,
        omega: 969,
        thetasym: 977,
        upsih: 978,
        piv: 982,
        ensp: 8194,
        emsp: 8195,
        thinsp: 8201,
        zwnj: 8204,
        zwj: 8205,
        lrm: 8206,
        rlm: 8207,
        ndash: 8211,
        mdash: 8212,
        lsquo: 8216,
        rsquo: 8217,
        sbquo: 8218,
        ldquo: 8220,
        rdquo: 8221,
        bdquo: 8222,
        dagger: 8224,
        Dagger: 8225,
        bull: 8226,
        hellip: 8230,
        permil: 8240,
        prime: 8242,
        Prime: 8243,
        lsaquo: 8249,
        rsaquo: 8250,
        oline: 8254,
        frasl: 8260,
        euro: 8364,
        image: 8465,
        weierp: 8472,
        real: 8476,
        trade: 8482,
        alefsym: 8501,
        larr: 8592,
        uarr: 8593,
        rarr: 8594,
        darr: 8595,
        harr: 8596,
        crarr: 8629,
        lArr: 8656,
        uArr: 8657,
        rArr: 8658,
        dArr: 8659,
        hArr: 8660,
        forall: 8704,
        part: 8706,
        exist: 8707,
        empty: 8709,
        nabla: 8711,
        isin: 8712,
        notin: 8713,
        ni: 8715,
        prod: 8719,
        sum: 8721,
        minus: 8722,
        lowast: 8727,
        radic: 8730,
        prop: 8733,
        infin: 8734,
        ang: 8736,
        and: 8743,
        or: 8744,
        cap: 8745,
        cup: 8746,
        int: 8747,
        there4: 8756,
        sim: 8764,
        cong: 8773,
        asymp: 8776,
        ne: 8800,
        equiv: 8801,
        le: 8804,
        ge: 8805,
        sub: 8834,
        sup: 8835,
        nsub: 8836,
        sube: 8838,
        supe: 8839,
        oplus: 8853,
        otimes: 8855,
        perp: 8869,
        sdot: 8901,
        lceil: 8968,
        rceil: 8969,
        lfloor: 8970,
        rfloor: 8971,
        lang: 9001,
        rang: 9002,
        loz: 9674,
        spades: 9824,
        clubs: 9827,
        hearts: 9829,
        diams: 9830
      };
      Object.keys(sax.ENTITIES).forEach(function(key) {
        var e = sax.ENTITIES[key];
        var s2 = typeof e === "number" ? String.fromCharCode(e) : e;
        sax.ENTITIES[key] = s2;
      });
      for (var s in sax.STATE) {
        sax.STATE[sax.STATE[s]] = s;
      }
      S = sax.STATE;
      function emit3(parser, event, data) {
        parser[event] && parser[event](data);
      }
      function getDeclaredEncoding(body) {
        var match = body && body.match(/(?:^|\s)encoding\s*=\s*(['"])([^'"]+)\1/i);
        return match ? match[2] : null;
      }
      function normalizeEncodingName(encoding) {
        if (!encoding) {
          return null;
        }
        return encoding.toLowerCase().replace(/[^a-z0-9]/g, "");
      }
      function encodingsMatch(detectedEncoding, declaredEncoding) {
        const detected = normalizeEncodingName(detectedEncoding);
        const declared = normalizeEncodingName(declaredEncoding);
        if (!detected || !declared) {
          return true;
        }
        if (declared === "utf16") {
          return detected === "utf16le" || detected === "utf16be";
        }
        return detected === declared;
      }
      function validateXmlDeclarationEncoding(parser, data) {
        if (!parser.strict || !parser.encoding || !data || data.name !== "xml") {
          return;
        }
        var declaredEncoding = getDeclaredEncoding(data.body);
        if (declaredEncoding && !encodingsMatch(parser.encoding, declaredEncoding)) {
          strictFail(
            parser,
            "XML declaration encoding " + declaredEncoding + " does not match detected stream encoding " + parser.encoding.toUpperCase()
          );
        }
      }
      function emitNode(parser, nodeType, data) {
        if (parser.textNode) closeText(parser);
        emit3(parser, nodeType, data);
      }
      function closeText(parser) {
        parser.textNode = textopts(parser.opt, parser.textNode);
        if (parser.textNode) emit3(parser, "ontext", parser.textNode);
        parser.textNode = "";
      }
      function textopts(opt, text) {
        if (opt.trim) text = text.trim();
        if (opt.normalize) text = text.replace(/\s+/g, " ");
        return text;
      }
      function error(parser, er) {
        closeText(parser);
        if (parser.trackPosition) {
          er += "\nLine: " + parser.line + "\nColumn: " + parser.column + "\nChar: " + parser.c;
        }
        er = new Error(er);
        parser.error = er;
        emit3(parser, "onerror", er);
        return parser;
      }
      function end(parser) {
        if (parser.sawRoot && !parser.closedRoot)
          strictFail(parser, "Unclosed root tag");
        if (parser.state !== S.BEGIN && parser.state !== S.BEGIN_WHITESPACE && parser.state !== S.TEXT) {
          error(parser, "Unexpected end");
        }
        closeText(parser);
        parser.c = "";
        parser.closed = true;
        emit3(parser, "onend");
        SAXParser.call(parser, parser.strict, parser.opt);
        return parser;
      }
      function strictFail(parser, message) {
        if (typeof parser !== "object" || !(parser instanceof SAXParser)) {
          throw new Error("bad call to strictFail");
        }
        if (parser.strict) {
          error(parser, message);
        }
      }
      function newTag(parser) {
        if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]();
        var parent = parser.tags[parser.tags.length - 1] || parser;
        var tag = parser.tag = { name: parser.tagName, attributes: {} };
        if (parser.opt.xmlns) {
          tag.ns = parent.ns;
        }
        parser.attribList.length = 0;
        emitNode(parser, "onopentagstart", tag);
      }
      function qname(name2, attribute) {
        var i = name2.indexOf(":");
        var qualName = i < 0 ? ["", name2] : name2.split(":");
        var prefix = qualName[0];
        var local = qualName[1];
        if (attribute && name2 === "xmlns") {
          prefix = "xmlns";
          local = "";
        }
        return { prefix, local };
      }
      function attrib(parser) {
        if (!parser.strict) {
          parser.attribName = parser.attribName[parser.looseCase]();
        }
        if (parser.attribList.indexOf(parser.attribName) !== -1 || parser.tag.attributes.hasOwnProperty(parser.attribName)) {
          parser.attribName = parser.attribValue = "";
          return;
        }
        if (parser.opt.xmlns) {
          var qn = qname(parser.attribName, true);
          var prefix = qn.prefix;
          var local = qn.local;
          if (prefix === "xmlns") {
            if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
              strictFail(
                parser,
                "xml: prefix must be bound to " + XML_NAMESPACE + "\nActual: " + parser.attribValue
              );
            } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
              strictFail(
                parser,
                "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\nActual: " + parser.attribValue
              );
            } else {
              var tag = parser.tag;
              var parent = parser.tags[parser.tags.length - 1] || parser;
              if (tag.ns === parent.ns) {
                tag.ns = Object.create(parent.ns);
              }
              tag.ns[local] = parser.attribValue;
            }
          }
          parser.attribList.push([parser.attribName, parser.attribValue]);
        } else {
          parser.tag.attributes[parser.attribName] = parser.attribValue;
          emitNode(parser, "onattribute", {
            name: parser.attribName,
            value: parser.attribValue
          });
        }
        parser.attribName = parser.attribValue = "";
      }
      function openTag(parser, selfClosing) {
        if (parser.opt.xmlns) {
          var tag = parser.tag;
          var qn = qname(parser.tagName);
          tag.prefix = qn.prefix;
          tag.local = qn.local;
          tag.uri = tag.ns[qn.prefix] || "";
          if (tag.prefix && !tag.uri) {
            strictFail(
              parser,
              "Unbound namespace prefix: " + JSON.stringify(parser.tagName)
            );
            tag.uri = qn.prefix;
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (tag.ns && parent.ns !== tag.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              emitNode(parser, "onopennamespace", {
                prefix: p,
                uri: tag.ns[p]
              });
            });
          }
          for (var i = 0, l = parser.attribList.length; i < l; i++) {
            var nv = parser.attribList[i];
            var name2 = nv[0];
            var value = nv[1];
            var qualName = qname(name2, true);
            var prefix = qualName.prefix;
            var local = qualName.local;
            var uri = prefix === "" ? "" : tag.ns[prefix] || "";
            var a = {
              name: name2,
              value,
              prefix,
              local,
              uri
            };
            if (prefix && prefix !== "xmlns" && !uri) {
              strictFail(
                parser,
                "Unbound namespace prefix: " + JSON.stringify(prefix)
              );
              a.uri = prefix;
            }
            parser.tag.attributes[name2] = a;
            emitNode(parser, "onattribute", a);
          }
          parser.attribList.length = 0;
        }
        parser.tag.isSelfClosing = !!selfClosing;
        parser.sawRoot = true;
        parser.tags.push(parser.tag);
        emitNode(parser, "onopentag", parser.tag);
        if (!selfClosing) {
          if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
            parser.state = S.SCRIPT;
          } else {
            parser.state = S.TEXT;
          }
          parser.tag = null;
          parser.tagName = "";
        }
        parser.attribName = parser.attribValue = "";
        parser.attribList.length = 0;
      }
      function closeTag(parser) {
        if (!parser.tagName) {
          strictFail(parser, "Weird empty close tag.");
          parser.textNode += "</>";
          parser.state = S.TEXT;
          return;
        }
        if (parser.script) {
          if (parser.tagName !== "script") {
            parser.script += "</" + parser.tagName + ">";
            parser.tagName = "";
            parser.state = S.SCRIPT;
            return;
          }
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
        var t = parser.tags.length;
        var tagName = parser.tagName;
        if (!parser.strict) {
          tagName = tagName[parser.looseCase]();
        }
        var closeTo = tagName;
        while (t--) {
          var close = parser.tags[t];
          if (close.name !== closeTo) {
            strictFail(parser, "Unexpected close tag");
          } else {
            break;
          }
        }
        if (t < 0) {
          strictFail(parser, "Unmatched closing tag: " + parser.tagName);
          parser.textNode += "</" + parser.tagName + ">";
          parser.state = S.TEXT;
          return;
        }
        parser.tagName = tagName;
        var s2 = parser.tags.length;
        while (s2-- > t) {
          var tag = parser.tag = parser.tags.pop();
          parser.tagName = parser.tag.name;
          emitNode(parser, "onclosetag", parser.tagName);
          var x = {};
          for (var i in tag.ns) {
            x[i] = tag.ns[i];
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (parser.opt.xmlns && tag.ns !== parent.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              var n = tag.ns[p];
              emitNode(parser, "onclosenamespace", { prefix: p, uri: n });
            });
          }
        }
        if (t === 0) parser.closedRoot = true;
        parser.tagName = parser.attribValue = parser.attribName = "";
        parser.attribList.length = 0;
        parser.state = S.TEXT;
      }
      function parseEntity(parser) {
        var entity = parser.entity;
        var entityLC = entity.toLowerCase();
        var num;
        var numStr = "";
        if (parser.ENTITIES[entity]) {
          return parser.ENTITIES[entity];
        }
        if (parser.ENTITIES[entityLC]) {
          return parser.ENTITIES[entityLC];
        }
        entity = entityLC;
        if (entity.charAt(0) === "#") {
          if (entity.charAt(1) === "x") {
            entity = entity.slice(2);
            num = parseInt(entity, 16);
            numStr = num.toString(16);
          } else {
            entity = entity.slice(1);
            num = parseInt(entity, 10);
            numStr = num.toString(10);
          }
        }
        entity = entity.replace(/^0+/, "");
        if (isNaN(num) || numStr.toLowerCase() !== entity || num < 0 || num > 1114111) {
          strictFail(parser, "Invalid character entity");
          return "&" + parser.entity + ";";
        }
        return String.fromCodePoint(num);
      }
      function beginWhiteSpace(parser, c) {
        if (c === "<") {
          parser.state = S.OPEN_WAKA;
          parser.startTagPosition = parser.position;
        } else if (!isWhitespace(c)) {
          strictFail(parser, "Non-whitespace before first tag.");
          parser.textNode = c;
          parser.state = S.TEXT;
        }
      }
      function charAt(chunk, i) {
        var result = "";
        if (i < chunk.length) {
          result = chunk.charAt(i);
        }
        return result;
      }
      function write(chunk) {
        var parser = this;
        if (this.error) {
          throw this.error;
        }
        if (parser.closed) {
          return error(
            parser,
            "Cannot write after close. Assign an onready handler."
          );
        }
        if (chunk === null) {
          return end(parser);
        }
        if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        var i = 0;
        var c = "";
        while (true) {
          c = charAt(chunk, i++);
          parser.c = c;
          if (!c) {
            break;
          }
          if (parser.trackPosition) {
            parser.position++;
            if (c === "\n") {
              parser.line++;
              parser.column = 0;
            } else {
              parser.column++;
            }
          }
          switch (parser.state) {
            case S.BEGIN:
              parser.state = S.BEGIN_WHITESPACE;
              if (c === "\uFEFF") {
                continue;
              }
              beginWhiteSpace(parser, c);
              continue;
            case S.BEGIN_WHITESPACE:
              beginWhiteSpace(parser, c);
              continue;
            case S.TEXT:
              if (parser.sawRoot && !parser.closedRoot) {
                var starti = i - 1;
                while (c && c !== "<" && c !== "&") {
                  c = charAt(chunk, i++);
                  if (c && parser.trackPosition) {
                    parser.position++;
                    if (c === "\n") {
                      parser.line++;
                      parser.column = 0;
                    } else {
                      parser.column++;
                    }
                  }
                }
                parser.textNode += chunk.substring(starti, i - 1);
              }
              if (c === "<" && !(parser.sawRoot && parser.closedRoot && !parser.strict)) {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else {
                if (!isWhitespace(c) && (!parser.sawRoot || parser.closedRoot)) {
                  strictFail(parser, "Text data outside of root node.");
                }
                if (c === "&") {
                  parser.state = S.TEXT_ENTITY;
                } else {
                  parser.textNode += c;
                }
              }
              continue;
            case S.SCRIPT:
              if (c === "<") {
                parser.state = S.SCRIPT_ENDING;
              } else {
                parser.script += c;
              }
              continue;
            case S.SCRIPT_ENDING:
              if (c === "/") {
                parser.state = S.CLOSE_TAG;
              } else {
                parser.script += "<" + c;
                parser.state = S.SCRIPT;
              }
              continue;
            case S.OPEN_WAKA:
              if (c === "!") {
                parser.state = S.SGML_DECL;
                parser.sgmlDecl = "";
              } else if (isWhitespace(c)) {
              } else if (isMatch(nameStart, c)) {
                parser.state = S.OPEN_TAG;
                parser.tagName = c;
              } else if (c === "/") {
                parser.state = S.CLOSE_TAG;
                parser.tagName = "";
              } else if (c === "?") {
                parser.state = S.PROC_INST;
                parser.procInstName = parser.procInstBody = "";
              } else {
                strictFail(parser, "Unencoded <");
                if (parser.startTagPosition + 1 < parser.position) {
                  var pad = parser.position - parser.startTagPosition;
                  c = new Array(pad).join(" ") + c;
                }
                parser.textNode += "<" + c;
                parser.state = S.TEXT;
              }
              continue;
            case S.SGML_DECL:
              if (parser.sgmlDecl + c === "--") {
                parser.state = S.COMMENT;
                parser.comment = "";
                parser.sgmlDecl = "";
                continue;
              }
              if (parser.doctype && parser.doctype !== true && parser.sgmlDecl) {
                parser.state = S.DOCTYPE_DTD;
                parser.doctype += "<!" + parser.sgmlDecl + c;
                parser.sgmlDecl = "";
              } else if ((parser.sgmlDecl + c).toUpperCase() === CDATA) {
                emitNode(parser, "onopencdata");
                parser.state = S.CDATA;
                parser.sgmlDecl = "";
                parser.cdata = "";
              } else if ((parser.sgmlDecl + c).toUpperCase() === DOCTYPE) {
                parser.state = S.DOCTYPE;
                if (parser.doctype || parser.sawRoot) {
                  strictFail(
                    parser,
                    "Inappropriately located doctype declaration"
                  );
                }
                parser.doctype = "";
                parser.sgmlDecl = "";
              } else if (c === ">") {
                emitNode(parser, "onsgmldeclaration", parser.sgmlDecl);
                parser.sgmlDecl = "";
                parser.state = S.TEXT;
              } else if (isQuote(c)) {
                parser.state = S.SGML_DECL_QUOTED;
                parser.sgmlDecl += c;
              } else {
                parser.sgmlDecl += c;
              }
              continue;
            case S.SGML_DECL_QUOTED:
              if (c === parser.q) {
                parser.state = S.SGML_DECL;
                parser.q = "";
              }
              parser.sgmlDecl += c;
              continue;
            case S.DOCTYPE:
              if (c === ">") {
                parser.state = S.TEXT;
                emitNode(parser, "ondoctype", parser.doctype);
                parser.doctype = true;
              } else {
                parser.doctype += c;
                if (c === "[") {
                  parser.state = S.DOCTYPE_DTD;
                } else if (isQuote(c)) {
                  parser.state = S.DOCTYPE_QUOTED;
                  parser.q = c;
                }
              }
              continue;
            case S.DOCTYPE_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.q = "";
                parser.state = S.DOCTYPE;
              }
              continue;
            case S.DOCTYPE_DTD:
              if (c === "]") {
                parser.doctype += c;
                parser.state = S.DOCTYPE;
              } else if (c === "<") {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else if (isQuote(c)) {
                parser.doctype += c;
                parser.state = S.DOCTYPE_DTD_QUOTED;
                parser.q = c;
              } else {
                parser.doctype += c;
              }
              continue;
            case S.DOCTYPE_DTD_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.state = S.DOCTYPE_DTD;
                parser.q = "";
              }
              continue;
            case S.COMMENT:
              if (c === "-") {
                parser.state = S.COMMENT_ENDING;
              } else {
                parser.comment += c;
              }
              continue;
            case S.COMMENT_ENDING:
              if (c === "-") {
                parser.state = S.COMMENT_ENDED;
                parser.comment = textopts(parser.opt, parser.comment);
                if (parser.comment) {
                  emitNode(parser, "oncomment", parser.comment);
                }
                parser.comment = "";
              } else {
                parser.comment += "-" + c;
                parser.state = S.COMMENT;
              }
              continue;
            case S.COMMENT_ENDED:
              if (c !== ">") {
                strictFail(parser, "Malformed comment");
                parser.comment += "--" + c;
                parser.state = S.COMMENT;
              } else if (parser.doctype && parser.doctype !== true) {
                parser.state = S.DOCTYPE_DTD;
              } else {
                parser.state = S.TEXT;
              }
              continue;
            case S.CDATA:
              var starti = i - 1;
              while (c && c !== "]") {
                c = charAt(chunk, i++);
                if (c && parser.trackPosition) {
                  parser.position++;
                  if (c === "\n") {
                    parser.line++;
                    parser.column = 0;
                  } else {
                    parser.column++;
                  }
                }
              }
              parser.cdata += chunk.substring(starti, i - 1);
              if (c === "]") {
                parser.state = S.CDATA_ENDING;
              }
              continue;
            case S.CDATA_ENDING:
              if (c === "]") {
                parser.state = S.CDATA_ENDING_2;
              } else {
                parser.cdata += "]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.CDATA_ENDING_2:
              if (c === ">") {
                if (parser.cdata) {
                  emitNode(parser, "oncdata", parser.cdata);
                }
                emitNode(parser, "onclosecdata");
                parser.cdata = "";
                parser.state = S.TEXT;
              } else if (c === "]") {
                parser.cdata += "]";
              } else {
                parser.cdata += "]]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.PROC_INST:
              if (c === "?") {
                parser.state = S.PROC_INST_ENDING;
              } else if (isWhitespace(c)) {
                parser.state = S.PROC_INST_BODY;
              } else {
                parser.procInstName += c;
              }
              continue;
            case S.PROC_INST_BODY:
              if (!parser.procInstBody && isWhitespace(c)) {
                continue;
              } else if (c === "?") {
                parser.state = S.PROC_INST_ENDING;
              } else {
                parser.procInstBody += c;
              }
              continue;
            case S.PROC_INST_ENDING:
              if (c === ">") {
                const procInstEndData = {
                  name: parser.procInstName,
                  body: parser.procInstBody
                };
                validateXmlDeclarationEncoding(parser, procInstEndData);
                emitNode(parser, "onprocessinginstruction", procInstEndData);
                parser.procInstName = parser.procInstBody = "";
                parser.state = S.TEXT;
              } else {
                parser.procInstBody += "?" + c;
                parser.state = S.PROC_INST_BODY;
              }
              continue;
            case S.OPEN_TAG:
              if (isMatch(nameBody, c)) {
                parser.tagName += c;
              } else {
                newTag(parser);
                if (c === ">") {
                  openTag(parser);
                } else if (c === "/") {
                  parser.state = S.OPEN_TAG_SLASH;
                } else {
                  if (!isWhitespace(c)) {
                    strictFail(parser, "Invalid character in tag name");
                  }
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.OPEN_TAG_SLASH:
              if (c === ">") {
                openTag(parser, true);
                closeTag(parser);
              } else {
                strictFail(
                  parser,
                  "Forward-slash in opening tag not followed by >"
                );
                parser.state = S.ATTRIB;
              }
              continue;
            case S.ATTRIB:
              if (isWhitespace(c)) {
                continue;
              } else if (c === ">") {
                openTag(parser);
              } else if (c === "/") {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (isMatch(nameStart, c)) {
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_NAME:
              if (c === "=") {
                parser.state = S.ATTRIB_VALUE;
              } else if (c === ">") {
                strictFail(parser, "Attribute without value");
                parser.attribValue = parser.attribName;
                attrib(parser);
                openTag(parser);
              } else if (isWhitespace(c)) {
                parser.state = S.ATTRIB_NAME_SAW_WHITE;
              } else if (isMatch(nameBody, c)) {
                parser.attribName += c;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_NAME_SAW_WHITE:
              if (c === "=") {
                parser.state = S.ATTRIB_VALUE;
              } else if (isWhitespace(c)) {
                continue;
              } else {
                strictFail(parser, "Attribute without value");
                parser.tag.attributes[parser.attribName] = "";
                parser.attribValue = "";
                emitNode(parser, "onattribute", {
                  name: parser.attribName,
                  value: ""
                });
                parser.attribName = "";
                if (c === ">") {
                  openTag(parser);
                } else if (isMatch(nameStart, c)) {
                  parser.attribName = c;
                  parser.state = S.ATTRIB_NAME;
                } else {
                  strictFail(parser, "Invalid attribute name");
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.ATTRIB_VALUE:
              if (isWhitespace(c)) {
                continue;
              } else if (isQuote(c)) {
                parser.q = c;
                parser.state = S.ATTRIB_VALUE_QUOTED;
              } else {
                if (!parser.opt.unquotedAttributeValues) {
                  error(parser, "Unquoted attribute value");
                }
                parser.state = S.ATTRIB_VALUE_UNQUOTED;
                parser.attribValue = c;
              }
              continue;
            case S.ATTRIB_VALUE_QUOTED:
              if (c !== parser.q) {
                if (c === "&") {
                  parser.state = S.ATTRIB_VALUE_ENTITY_Q;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              parser.q = "";
              parser.state = S.ATTRIB_VALUE_CLOSED;
              continue;
            case S.ATTRIB_VALUE_CLOSED:
              if (isWhitespace(c)) {
                parser.state = S.ATTRIB;
              } else if (c === ">") {
                openTag(parser);
              } else if (c === "/") {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (isMatch(nameStart, c)) {
                strictFail(parser, "No whitespace between attributes");
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_VALUE_UNQUOTED:
              if (!isAttribEnd(c)) {
                if (c === "&") {
                  parser.state = S.ATTRIB_VALUE_ENTITY_U;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              if (c === ">") {
                openTag(parser);
              } else {
                parser.state = S.ATTRIB;
              }
              continue;
            case S.CLOSE_TAG:
              if (!parser.tagName) {
                if (isWhitespace(c)) {
                  continue;
                } else if (notMatch(nameStart, c)) {
                  if (parser.script) {
                    parser.script += "</" + c;
                    parser.state = S.SCRIPT;
                  } else {
                    strictFail(parser, "Invalid tagname in closing tag.");
                  }
                } else {
                  parser.tagName = c;
                }
              } else if (c === ">") {
                closeTag(parser);
              } else if (isMatch(nameBody, c)) {
                parser.tagName += c;
              } else if (parser.script) {
                parser.script += "</" + parser.tagName + c;
                parser.tagName = "";
                parser.state = S.SCRIPT;
              } else {
                if (!isWhitespace(c)) {
                  strictFail(parser, "Invalid tagname in closing tag");
                }
                parser.state = S.CLOSE_TAG_SAW_WHITE;
              }
              continue;
            case S.CLOSE_TAG_SAW_WHITE:
              if (isWhitespace(c)) {
                continue;
              }
              if (c === ">") {
                closeTag(parser);
              } else {
                strictFail(parser, "Invalid characters in closing tag");
              }
              continue;
            case S.TEXT_ENTITY:
            case S.ATTRIB_VALUE_ENTITY_Q:
            case S.ATTRIB_VALUE_ENTITY_U:
              var returnState;
              var buffer;
              switch (parser.state) {
                case S.TEXT_ENTITY:
                  returnState = S.TEXT;
                  buffer = "textNode";
                  break;
                case S.ATTRIB_VALUE_ENTITY_Q:
                  returnState = S.ATTRIB_VALUE_QUOTED;
                  buffer = "attribValue";
                  break;
                case S.ATTRIB_VALUE_ENTITY_U:
                  returnState = S.ATTRIB_VALUE_UNQUOTED;
                  buffer = "attribValue";
                  break;
              }
              if (c === ";") {
                var parsedEntity = parseEntity(parser);
                if (parser.opt.unparsedEntities && !Object.values(sax.XML_ENTITIES).includes(parsedEntity)) {
                  if ((parser.entityCount += 1) > parser.opt.maxEntityCount) {
                    error(
                      parser,
                      "Parsed entity count exceeds max entity count"
                    );
                  }
                  if ((parser.entityDepth += 1) > parser.opt.maxEntityDepth) {
                    error(
                      parser,
                      "Parsed entity depth exceeds max entity depth"
                    );
                  }
                  parser.entity = "";
                  parser.state = returnState;
                  parser.write(parsedEntity);
                  parser.entityDepth -= 1;
                } else {
                  parser[buffer] += parsedEntity;
                  parser.entity = "";
                  parser.state = returnState;
                }
              } else if (isMatch(parser.entity.length ? entityBody : entityStart, c)) {
                parser.entity += c;
              } else {
                strictFail(parser, "Invalid character in entity name");
                parser[buffer] += "&" + parser.entity + c;
                parser.entity = "";
                parser.state = returnState;
              }
              continue;
            default: {
              throw new Error(parser, "Unknown state: " + parser.state);
            }
          }
        }
        if (parser.position >= parser.bufferCheckPosition) {
          checkBufferLength(parser);
        }
        return parser;
      }
      if (!String.fromCodePoint) {
        ;
        (function() {
          var stringFromCharCode = String.fromCharCode;
          var floor = Math.floor;
          var fromCodePoint = function() {
            var MAX_SIZE = 16384;
            var codeUnits = [];
            var highSurrogate;
            var lowSurrogate;
            var index = -1;
            var length = arguments.length;
            if (!length) {
              return "";
            }
            var result = "";
            while (++index < length) {
              var codePoint = Number(arguments[index]);
              if (!isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
              codePoint < 0 || // not a valid Unicode code point
              codePoint > 1114111 || // not a valid Unicode code point
              floor(codePoint) !== codePoint) {
                throw RangeError("Invalid code point: " + codePoint);
              }
              if (codePoint <= 65535) {
                codeUnits.push(codePoint);
              } else {
                codePoint -= 65536;
                highSurrogate = (codePoint >> 10) + 55296;
                lowSurrogate = codePoint % 1024 + 56320;
                codeUnits.push(highSurrogate, lowSurrogate);
              }
              if (index + 1 === length || codeUnits.length > MAX_SIZE) {
                result += stringFromCharCode.apply(null, codeUnits);
                codeUnits.length = 0;
              }
            }
            return result;
          };
          if (Object.defineProperty) {
            Object.defineProperty(String, "fromCodePoint", {
              value: fromCodePoint,
              configurable: true,
              writable: true
            });
          } else {
            String.fromCodePoint = fromCodePoint;
          }
        })();
      }
    })(typeof exports11 === "undefined" ? exports11.sax = {} : exports11);
  }
});

// node_modules/xml2js/lib/bom.js
var require_bom = __commonJS({
  "node_modules/xml2js/lib/bom.js"(exports11) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      "use strict";
      exports11.stripBOM = function(str) {
        if (str[0] === "\uFEFF") {
          return str.substring(1);
        } else {
          return str;
        }
      };
    }).call(exports11);
  }
});

// node_modules/xml2js/lib/processors.js
var require_processors = __commonJS({
  "node_modules/xml2js/lib/processors.js"(exports11) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      "use strict";
      var prefixMatch;
      prefixMatch = new RegExp(/(?!xmlns)^.*:/);
      exports11.normalize = function(str) {
        return str.toLowerCase();
      };
      exports11.firstCharLowerCase = function(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
      };
      exports11.stripPrefix = function(str) {
        return str.replace(prefixMatch, "");
      };
      exports11.parseNumbers = function(str) {
        if (!isNaN(str)) {
          str = str % 1 === 0 ? parseInt(str, 10) : parseFloat(str);
        }
        return str;
      };
      exports11.parseBooleans = function(str) {
        if (/^(?:true|false)$/i.test(str)) {
          str = str.toLowerCase() === "true";
        }
        return str;
      };
    }).call(exports11);
  }
});

// node_modules/@jspm/core/nodelibs/browser/timers.js
var timers_exports = {};
__export(timers_exports, {
  _unrefActive: () => _unrefActive,
  active: () => active,
  clearImmediate: () => clearImmediate,
  clearInterval: () => clearInterval$1,
  clearTimeout: () => clearTimeout$1,
  default: () => exports10,
  enroll: () => enroll,
  setImmediate: () => setImmediate,
  setInterval: () => setInterval$1,
  setTimeout: () => setTimeout$1,
  unenroll: () => unenroll
});
function dew$16() {
  if (_dewExec$16) return exports$26;
  _dewExec$16 = true;
  var process$1 = process2;
  (function(global2, undefined$1) {
    if (global2.setImmediate) {
      return;
    }
    var nextHandle = 1;
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global2.document;
    var registerImmediate;
    function setImmediate2(callback) {
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
        args[i] = arguments[i + 1];
      }
      var task = {
        callback,
        args
      };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }
    function clearImmediate2(handle) {
      delete tasksByHandle[handle];
    }
    function run(task) {
      var callback = task.callback;
      var args = task.args;
      switch (args.length) {
        case 0:
          callback();
          break;
        case 1:
          callback(args[0]);
          break;
        case 2:
          callback(args[0], args[1]);
          break;
        case 3:
          callback(args[0], args[1], args[2]);
          break;
        default:
          callback.apply(undefined$1, args);
          break;
      }
    }
    function runIfPresent(handle) {
      if (currentlyRunningATask) {
        setTimeout(runIfPresent, 0, handle);
      } else {
        var task = tasksByHandle[handle];
        if (task) {
          currentlyRunningATask = true;
          try {
            run(task);
          } finally {
            clearImmediate2(handle);
            currentlyRunningATask = false;
          }
        }
      }
    }
    function installNextTickImplementation() {
      registerImmediate = function(handle) {
        process$1.nextTick(function() {
          runIfPresent(handle);
        });
      };
    }
    function canUsePostMessage() {
      if (global2.postMessage && !global2.importScripts) {
        var postMessageIsAsynchronous = true;
        var oldOnMessage = global2.onmessage;
        global2.onmessage = function() {
          postMessageIsAsynchronous = false;
        };
        global2.postMessage("", "*");
        global2.onmessage = oldOnMessage;
        return postMessageIsAsynchronous;
      }
    }
    function installPostMessageImplementation() {
      var messagePrefix = "setImmediate$" + Math.random() + "$";
      var onGlobalMessage = function(event) {
        if (event.source === global2 && typeof event.data === "string" && event.data.indexOf(messagePrefix) === 0) {
          runIfPresent(+event.data.slice(messagePrefix.length));
        }
      };
      if (global2.addEventListener) {
        global2.addEventListener("message", onGlobalMessage, false);
      } else {
        global2.attachEvent("onmessage", onGlobalMessage);
      }
      registerImmediate = function(handle) {
        global2.postMessage(messagePrefix + handle, "*");
      };
    }
    function installMessageChannelImplementation() {
      var channel = new MessageChannel();
      channel.port1.onmessage = function(event) {
        var handle = event.data;
        runIfPresent(handle);
      };
      registerImmediate = function(handle) {
        channel.port2.postMessage(handle);
      };
    }
    function installReadyStateChangeImplementation() {
      var html = doc.documentElement;
      registerImmediate = function(handle) {
        var script = doc.createElement("script");
        script.onreadystatechange = function() {
          runIfPresent(handle);
          script.onreadystatechange = null;
          html.removeChild(script);
          script = null;
        };
        html.appendChild(script);
      };
    }
    function installSetTimeoutImplementation() {
      registerImmediate = function(handle) {
        setTimeout(runIfPresent, 0, handle);
      };
    }
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global2);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global2;
    if ({}.toString.call(global2.process) === "[object process]") {
      installNextTickImplementation();
    } else if (canUsePostMessage()) {
      installPostMessageImplementation();
    } else if (global2.MessageChannel) {
      installMessageChannelImplementation();
    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
      installReadyStateChangeImplementation();
    } else {
      installSetTimeoutImplementation();
    }
    attachTo.setImmediate = setImmediate2;
    attachTo.clearImmediate = clearImmediate2;
  })(typeof self === "undefined" ? typeof _global$13 === "undefined" ? exports$26 : _global$13 : self);
  return exports$26;
}
function dew8() {
  if (_dewExec8) return exports$17;
  _dewExec8 = true;
  var scope = typeof _global3 !== "undefined" && _global3 || typeof self !== "undefined" && self || window;
  var apply = Function.prototype.apply;
  exports$17.setTimeout = function() {
    return new Timeout(apply.call(setTimeout, scope, arguments), clearTimeout);
  };
  exports$17.setInterval = function() {
    return new Timeout(apply.call(setInterval, scope, arguments), clearInterval);
  };
  exports$17.clearTimeout = exports$17.clearInterval = function(timeout) {
    if (timeout) {
      timeout.close();
    }
  };
  function Timeout(id, clearFn) {
    (this || _global3)._id = id;
    (this || _global3)._clearFn = clearFn;
  }
  Timeout.prototype.unref = Timeout.prototype.ref = function() {
  };
  Timeout.prototype.close = function() {
    (this || _global3)._clearFn.call(scope, (this || _global3)._id);
  };
  exports$17.enroll = function(item, msecs) {
    clearTimeout(item._idleTimeoutId);
    item._idleTimeout = msecs;
  };
  exports$17.unenroll = function(item) {
    clearTimeout(item._idleTimeoutId);
    item._idleTimeout = -1;
  };
  exports$17._unrefActive = exports$17.active = function(item) {
    clearTimeout(item._idleTimeoutId);
    var msecs = item._idleTimeout;
    if (msecs >= 0) {
      item._idleTimeoutId = setTimeout(function onTimeout() {
        if (item._onTimeout) item._onTimeout();
      }, msecs);
    }
  };
  dew$16();
  exports$17.setImmediate = typeof self !== "undefined" && self.setImmediate || typeof _global3 !== "undefined" && _global3.setImmediate || exports$17 && exports$17.setImmediate;
  exports$17.clearImmediate = typeof self !== "undefined" && self.clearImmediate || typeof _global3 !== "undefined" && _global3.clearImmediate || exports$17 && exports$17.clearImmediate;
  return exports$17;
}
var exports$26, _dewExec$16, _global$13, exports$17, _dewExec8, _global3, exports10, _unrefActive, active, clearImmediate, clearInterval$1, clearTimeout$1, enroll, setImmediate, setInterval$1, setTimeout$1, unenroll;
var init_timers = __esm({
  "node_modules/@jspm/core/nodelibs/browser/timers.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    init_chunk_DEMDiNwt();
    exports$26 = {};
    _dewExec$16 = false;
    _global$13 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports$17 = {};
    _dewExec8 = false;
    _global3 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports10 = dew8();
    exports10["setTimeout"];
    exports10["setInterval"];
    exports10["clearTimeout"];
    exports10["clearInterval"];
    exports10["enroll"];
    exports10["unenroll"];
    exports10["_unrefActive"];
    exports10["active"];
    exports10["setImmediate"];
    exports10["clearImmediate"];
    _unrefActive = exports10._unrefActive;
    active = exports10.active;
    clearImmediate = exports10.clearImmediate;
    clearInterval$1 = exports10.clearInterval;
    clearTimeout$1 = exports10.clearTimeout;
    enroll = exports10.enroll;
    setImmediate = exports10.setImmediate;
    setInterval$1 = exports10.setInterval;
    setTimeout$1 = exports10.setTimeout;
    unenroll = exports10.unenroll;
  }
});

// node_modules/xml2js/lib/parser.js
var require_parser = __commonJS({
  "node_modules/xml2js/lib/parser.js"(exports11) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      "use strict";
      var bom, defaults, events, isEmpty, processItem, processors, sax, setImmediate2, bind = function(fn, me) {
        return function() {
          return fn.apply(me, arguments);
        };
      }, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      sax = require_sax();
      events = (init_events(), __toCommonJS(events_exports));
      bom = require_bom();
      processors = require_processors();
      setImmediate2 = (init_timers(), __toCommonJS(timers_exports)).setImmediate;
      defaults = require_defaults().defaults;
      isEmpty = function(thing) {
        return typeof thing === "object" && thing != null && Object.keys(thing).length === 0;
      };
      processItem = function(processors2, item, key) {
        var i, len, process3;
        for (i = 0, len = processors2.length; i < len; i++) {
          process3 = processors2[i];
          item = process3(item, key);
        }
        return item;
      };
      exports11.Parser = (function(superClass) {
        extend(Parser, superClass);
        function Parser(opts) {
          this.parseString = bind(this.parseString, this);
          this.reset = bind(this.reset, this);
          this.assignOrPush = bind(this.assignOrPush, this);
          this.processAsync = bind(this.processAsync, this);
          var key, ref, value;
          if (!(this instanceof exports11.Parser)) {
            return new exports11.Parser(opts);
          }
          this.options = {};
          ref = defaults["0.2"];
          for (key in ref) {
            if (!hasProp.call(ref, key)) continue;
            value = ref[key];
            this.options[key] = value;
          }
          for (key in opts) {
            if (!hasProp.call(opts, key)) continue;
            value = opts[key];
            this.options[key] = value;
          }
          if (this.options.xmlns) {
            this.options.xmlnskey = this.options.attrkey + "ns";
          }
          if (this.options.normalizeTags) {
            if (!this.options.tagNameProcessors) {
              this.options.tagNameProcessors = [];
            }
            this.options.tagNameProcessors.unshift(processors.normalize);
          }
          this.reset();
        }
        Parser.prototype.processAsync = function() {
          var chunk, err;
          try {
            if (this.remaining.length <= this.options.chunkSize) {
              chunk = this.remaining;
              this.remaining = "";
              this.saxParser = this.saxParser.write(chunk);
              return this.saxParser.close();
            } else {
              chunk = this.remaining.substr(0, this.options.chunkSize);
              this.remaining = this.remaining.substr(this.options.chunkSize, this.remaining.length);
              this.saxParser = this.saxParser.write(chunk);
              return setImmediate2(this.processAsync);
            }
          } catch (error1) {
            err = error1;
            if (!this.saxParser.errThrown) {
              this.saxParser.errThrown = true;
              return this.emit(err);
            }
          }
        };
        Parser.prototype.assignOrPush = function(obj, key, newValue) {
          if (!(key in obj)) {
            if (!this.options.explicitArray) {
              return obj[key] = newValue;
            } else {
              return obj[key] = [newValue];
            }
          } else {
            if (!(obj[key] instanceof Array)) {
              obj[key] = [obj[key]];
            }
            return obj[key].push(newValue);
          }
        };
        Parser.prototype.reset = function() {
          var attrkey, charkey, ontext, stack;
          this.removeAllListeners();
          this.saxParser = sax.parser(this.options.strict, {
            trim: false,
            normalize: false,
            xmlns: this.options.xmlns
          });
          this.saxParser.errThrown = false;
          this.saxParser.onerror = /* @__PURE__ */ (function(_this) {
            return function(error) {
              _this.saxParser.resume();
              if (!_this.saxParser.errThrown) {
                _this.saxParser.errThrown = true;
                return _this.emit("error", error);
              }
            };
          })(this);
          this.saxParser.onend = /* @__PURE__ */ (function(_this) {
            return function() {
              if (!_this.saxParser.ended) {
                _this.saxParser.ended = true;
                return _this.emit("end", _this.resultObject);
              }
            };
          })(this);
          this.saxParser.ended = false;
          this.EXPLICIT_CHARKEY = this.options.explicitCharkey;
          this.resultObject = null;
          stack = [];
          attrkey = this.options.attrkey;
          charkey = this.options.charkey;
          this.saxParser.onopentag = /* @__PURE__ */ (function(_this) {
            return function(node) {
              var key, newValue, obj, processedKey, ref;
              obj = {};
              obj[charkey] = "";
              if (!_this.options.ignoreAttrs) {
                ref = node.attributes;
                for (key in ref) {
                  if (!hasProp.call(ref, key)) continue;
                  if (!(attrkey in obj) && !_this.options.mergeAttrs) {
                    obj[attrkey] = {};
                  }
                  newValue = _this.options.attrValueProcessors ? processItem(_this.options.attrValueProcessors, node.attributes[key], key) : node.attributes[key];
                  processedKey = _this.options.attrNameProcessors ? processItem(_this.options.attrNameProcessors, key) : key;
                  if (_this.options.mergeAttrs) {
                    _this.assignOrPush(obj, processedKey, newValue);
                  } else {
                    obj[attrkey][processedKey] = newValue;
                  }
                }
              }
              obj["#name"] = _this.options.tagNameProcessors ? processItem(_this.options.tagNameProcessors, node.name) : node.name;
              if (_this.options.xmlns) {
                obj[_this.options.xmlnskey] = {
                  uri: node.uri,
                  local: node.local
                };
              }
              return stack.push(obj);
            };
          })(this);
          this.saxParser.onclosetag = /* @__PURE__ */ (function(_this) {
            return function() {
              var cdata, emptyStr, key, node, nodeName, obj, objClone, old, s, xpath;
              obj = stack.pop();
              nodeName = obj["#name"];
              if (!_this.options.explicitChildren || !_this.options.preserveChildrenOrder) {
                delete obj["#name"];
              }
              if (obj.cdata === true) {
                cdata = obj.cdata;
                delete obj.cdata;
              }
              s = stack[stack.length - 1];
              if (obj[charkey].match(/^\s*$/) && !cdata) {
                emptyStr = obj[charkey];
                delete obj[charkey];
              } else {
                if (_this.options.trim) {
                  obj[charkey] = obj[charkey].trim();
                }
                if (_this.options.normalize) {
                  obj[charkey] = obj[charkey].replace(/\s{2,}/g, " ").trim();
                }
                obj[charkey] = _this.options.valueProcessors ? processItem(_this.options.valueProcessors, obj[charkey], nodeName) : obj[charkey];
                if (Object.keys(obj).length === 1 && charkey in obj && !_this.EXPLICIT_CHARKEY) {
                  obj = obj[charkey];
                }
              }
              if (isEmpty(obj)) {
                obj = _this.options.emptyTag !== "" ? _this.options.emptyTag : emptyStr;
              }
              if (_this.options.validator != null) {
                xpath = "/" + (function() {
                  var i, len, results;
                  results = [];
                  for (i = 0, len = stack.length; i < len; i++) {
                    node = stack[i];
                    results.push(node["#name"]);
                  }
                  return results;
                })().concat(nodeName).join("/");
                (function() {
                  var err;
                  try {
                    return obj = _this.options.validator(xpath, s && s[nodeName], obj);
                  } catch (error1) {
                    err = error1;
                    return _this.emit("error", err);
                  }
                })();
              }
              if (_this.options.explicitChildren && !_this.options.mergeAttrs && typeof obj === "object") {
                if (!_this.options.preserveChildrenOrder) {
                  node = {};
                  if (_this.options.attrkey in obj) {
                    node[_this.options.attrkey] = obj[_this.options.attrkey];
                    delete obj[_this.options.attrkey];
                  }
                  if (!_this.options.charsAsChildren && _this.options.charkey in obj) {
                    node[_this.options.charkey] = obj[_this.options.charkey];
                    delete obj[_this.options.charkey];
                  }
                  if (Object.getOwnPropertyNames(obj).length > 0) {
                    node[_this.options.childkey] = obj;
                  }
                  obj = node;
                } else if (s) {
                  s[_this.options.childkey] = s[_this.options.childkey] || [];
                  objClone = {};
                  for (key in obj) {
                    if (!hasProp.call(obj, key)) continue;
                    objClone[key] = obj[key];
                  }
                  s[_this.options.childkey].push(objClone);
                  delete obj["#name"];
                  if (Object.keys(obj).length === 1 && charkey in obj && !_this.EXPLICIT_CHARKEY) {
                    obj = obj[charkey];
                  }
                }
              }
              if (stack.length > 0) {
                return _this.assignOrPush(s, nodeName, obj);
              } else {
                if (_this.options.explicitRoot) {
                  old = obj;
                  obj = {};
                  obj[nodeName] = old;
                }
                _this.resultObject = obj;
                _this.saxParser.ended = true;
                return _this.emit("end", _this.resultObject);
              }
            };
          })(this);
          ontext = /* @__PURE__ */ (function(_this) {
            return function(text) {
              var charChild, s;
              s = stack[stack.length - 1];
              if (s) {
                s[charkey] += text;
                if (_this.options.explicitChildren && _this.options.preserveChildrenOrder && _this.options.charsAsChildren && (_this.options.includeWhiteChars || text.replace(/\\n/g, "").trim() !== "")) {
                  s[_this.options.childkey] = s[_this.options.childkey] || [];
                  charChild = {
                    "#name": "__text__"
                  };
                  charChild[charkey] = text;
                  if (_this.options.normalize) {
                    charChild[charkey] = charChild[charkey].replace(/\s{2,}/g, " ").trim();
                  }
                  s[_this.options.childkey].push(charChild);
                }
                return s;
              }
            };
          })(this);
          this.saxParser.ontext = ontext;
          return this.saxParser.oncdata = /* @__PURE__ */ (function(_this) {
            return function(text) {
              var s;
              s = ontext(text);
              if (s) {
                return s.cdata = true;
              }
            };
          })(this);
        };
        Parser.prototype.parseString = function(str, cb) {
          var err;
          if (cb != null && typeof cb === "function") {
            this.on("end", function(result) {
              this.reset();
              return cb(null, result);
            });
            this.on("error", function(err2) {
              this.reset();
              return cb(err2);
            });
          }
          try {
            str = str.toString();
            if (str.trim() === "") {
              this.emit("end", null);
              return true;
            }
            str = bom.stripBOM(str);
            if (this.options.async) {
              this.remaining = str;
              setImmediate2(this.processAsync);
              return this.saxParser;
            }
            return this.saxParser.write(str).close();
          } catch (error1) {
            err = error1;
            if (!(this.saxParser.errThrown || this.saxParser.ended)) {
              this.emit("error", err);
              return this.saxParser.errThrown = true;
            } else if (this.saxParser.ended) {
              throw err;
            }
          }
        };
        return Parser;
      })(events.EventEmitter);
      exports11.parseString = function(str, a, b) {
        var cb, options, parser;
        if (b != null) {
          if (typeof b === "function") {
            cb = b;
          }
          if (typeof a === "object") {
            options = a;
          }
        } else {
          if (typeof a === "function") {
            cb = a;
          }
          options = {};
        }
        parser = new exports11.Parser(options);
        return parser.parseString(str, cb);
      };
    }).call(exports11);
  }
});

// node_modules/xml2js/lib/xml2js.js
var require_xml2js = __commonJS({
  "node_modules/xml2js/lib/xml2js.js"(exports11) {
    init_dirname();
    init_buffer2();
    init_process2();
    (function() {
      "use strict";
      var builder, defaults, parser, processors, extend = function(child, parent) {
        for (var key in parent) {
          if (hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
          this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      }, hasProp = {}.hasOwnProperty;
      defaults = require_defaults();
      builder = require_builder();
      parser = require_parser();
      processors = require_processors();
      exports11.defaults = defaults.defaults;
      exports11.processors = processors;
      exports11.ValidationError = (function(superClass) {
        extend(ValidationError, superClass);
        function ValidationError(message) {
          this.message = message;
        }
        return ValidationError;
      })(Error);
      exports11.Builder = builder.Builder;
      exports11.Parser = parser.Parser;
      exports11.parseString = parser.parseString;
    }).call(exports11);
  }
});

// <stdin>
init_dirname();
init_buffer2();
init_process2();
module.exports = require_xml2js();
