var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
  Buffer3.isBuffer = function isBuffer(b) {
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
  Buffer3.prototype.inspect = function inspect() {
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
var buffer_exports = {};
__export(buffer_exports, {
  Buffer: () => Buffer2,
  INSPECT_MAX_BYTES: () => INSPECT_MAX_BYTES,
  default: () => exports3,
  kMaxLength: () => kMaxLength
});
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

// node_modules/entities/maps/decode.json
var require_decode = __commonJS({
  "node_modules/entities/maps/decode.json"(exports6, module2) {
    module2.exports = { "0": 65533, "128": 8364, "130": 8218, "131": 402, "132": 8222, "133": 8230, "134": 8224, "135": 8225, "136": 710, "137": 8240, "138": 352, "139": 8249, "140": 338, "142": 381, "145": 8216, "146": 8217, "147": 8220, "148": 8221, "149": 8226, "150": 8211, "151": 8212, "152": 732, "153": 8482, "154": 353, "155": 8250, "156": 339, "158": 382, "159": 376 };
  }
});

// node_modules/entities/lib/decode_codepoint.js
var require_decode_codepoint = __commonJS({
  "node_modules/entities/lib/decode_codepoint.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var decodeMap = require_decode();
    module2.exports = decodeCodePoint;
    function decodeCodePoint(codePoint) {
      if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
        return "\uFFFD";
      }
      if (codePoint in decodeMap) {
        codePoint = decodeMap[codePoint];
      }
      var output = "";
      if (codePoint > 65535) {
        codePoint -= 65536;
        output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
        codePoint = 56320 | codePoint & 1023;
      }
      output += String.fromCharCode(codePoint);
      return output;
    }
  }
});

// node_modules/entities/maps/entities.json
var require_entities = __commonJS({
  "node_modules/entities/maps/entities.json"(exports6, module2) {
    module2.exports = { Aacute: "\xC1", aacute: "\xE1", Abreve: "\u0102", abreve: "\u0103", ac: "\u223E", acd: "\u223F", acE: "\u223E\u0333", Acirc: "\xC2", acirc: "\xE2", acute: "\xB4", Acy: "\u0410", acy: "\u0430", AElig: "\xC6", aelig: "\xE6", af: "\u2061", Afr: "\u{1D504}", afr: "\u{1D51E}", Agrave: "\xC0", agrave: "\xE0", alefsym: "\u2135", aleph: "\u2135", Alpha: "\u0391", alpha: "\u03B1", Amacr: "\u0100", amacr: "\u0101", amalg: "\u2A3F", amp: "&", AMP: "&", andand: "\u2A55", And: "\u2A53", and: "\u2227", andd: "\u2A5C", andslope: "\u2A58", andv: "\u2A5A", ang: "\u2220", ange: "\u29A4", angle: "\u2220", angmsdaa: "\u29A8", angmsdab: "\u29A9", angmsdac: "\u29AA", angmsdad: "\u29AB", angmsdae: "\u29AC", angmsdaf: "\u29AD", angmsdag: "\u29AE", angmsdah: "\u29AF", angmsd: "\u2221", angrt: "\u221F", angrtvb: "\u22BE", angrtvbd: "\u299D", angsph: "\u2222", angst: "\xC5", angzarr: "\u237C", Aogon: "\u0104", aogon: "\u0105", Aopf: "\u{1D538}", aopf: "\u{1D552}", apacir: "\u2A6F", ap: "\u2248", apE: "\u2A70", ape: "\u224A", apid: "\u224B", apos: "'", ApplyFunction: "\u2061", approx: "\u2248", approxeq: "\u224A", Aring: "\xC5", aring: "\xE5", Ascr: "\u{1D49C}", ascr: "\u{1D4B6}", Assign: "\u2254", ast: "*", asymp: "\u2248", asympeq: "\u224D", Atilde: "\xC3", atilde: "\xE3", Auml: "\xC4", auml: "\xE4", awconint: "\u2233", awint: "\u2A11", backcong: "\u224C", backepsilon: "\u03F6", backprime: "\u2035", backsim: "\u223D", backsimeq: "\u22CD", Backslash: "\u2216", Barv: "\u2AE7", barvee: "\u22BD", barwed: "\u2305", Barwed: "\u2306", barwedge: "\u2305", bbrk: "\u23B5", bbrktbrk: "\u23B6", bcong: "\u224C", Bcy: "\u0411", bcy: "\u0431", bdquo: "\u201E", becaus: "\u2235", because: "\u2235", Because: "\u2235", bemptyv: "\u29B0", bepsi: "\u03F6", bernou: "\u212C", Bernoullis: "\u212C", Beta: "\u0392", beta: "\u03B2", beth: "\u2136", between: "\u226C", Bfr: "\u{1D505}", bfr: "\u{1D51F}", bigcap: "\u22C2", bigcirc: "\u25EF", bigcup: "\u22C3", bigodot: "\u2A00", bigoplus: "\u2A01", bigotimes: "\u2A02", bigsqcup: "\u2A06", bigstar: "\u2605", bigtriangledown: "\u25BD", bigtriangleup: "\u25B3", biguplus: "\u2A04", bigvee: "\u22C1", bigwedge: "\u22C0", bkarow: "\u290D", blacklozenge: "\u29EB", blacksquare: "\u25AA", blacktriangle: "\u25B4", blacktriangledown: "\u25BE", blacktriangleleft: "\u25C2", blacktriangleright: "\u25B8", blank: "\u2423", blk12: "\u2592", blk14: "\u2591", blk34: "\u2593", block: "\u2588", bne: "=\u20E5", bnequiv: "\u2261\u20E5", bNot: "\u2AED", bnot: "\u2310", Bopf: "\u{1D539}", bopf: "\u{1D553}", bot: "\u22A5", bottom: "\u22A5", bowtie: "\u22C8", boxbox: "\u29C9", boxdl: "\u2510", boxdL: "\u2555", boxDl: "\u2556", boxDL: "\u2557", boxdr: "\u250C", boxdR: "\u2552", boxDr: "\u2553", boxDR: "\u2554", boxh: "\u2500", boxH: "\u2550", boxhd: "\u252C", boxHd: "\u2564", boxhD: "\u2565", boxHD: "\u2566", boxhu: "\u2534", boxHu: "\u2567", boxhU: "\u2568", boxHU: "\u2569", boxminus: "\u229F", boxplus: "\u229E", boxtimes: "\u22A0", boxul: "\u2518", boxuL: "\u255B", boxUl: "\u255C", boxUL: "\u255D", boxur: "\u2514", boxuR: "\u2558", boxUr: "\u2559", boxUR: "\u255A", boxv: "\u2502", boxV: "\u2551", boxvh: "\u253C", boxvH: "\u256A", boxVh: "\u256B", boxVH: "\u256C", boxvl: "\u2524", boxvL: "\u2561", boxVl: "\u2562", boxVL: "\u2563", boxvr: "\u251C", boxvR: "\u255E", boxVr: "\u255F", boxVR: "\u2560", bprime: "\u2035", breve: "\u02D8", Breve: "\u02D8", brvbar: "\xA6", bscr: "\u{1D4B7}", Bscr: "\u212C", bsemi: "\u204F", bsim: "\u223D", bsime: "\u22CD", bsolb: "\u29C5", bsol: "\\", bsolhsub: "\u27C8", bull: "\u2022", bullet: "\u2022", bump: "\u224E", bumpE: "\u2AAE", bumpe: "\u224F", Bumpeq: "\u224E", bumpeq: "\u224F", Cacute: "\u0106", cacute: "\u0107", capand: "\u2A44", capbrcup: "\u2A49", capcap: "\u2A4B", cap: "\u2229", Cap: "\u22D2", capcup: "\u2A47", capdot: "\u2A40", CapitalDifferentialD: "\u2145", caps: "\u2229\uFE00", caret: "\u2041", caron: "\u02C7", Cayleys: "\u212D", ccaps: "\u2A4D", Ccaron: "\u010C", ccaron: "\u010D", Ccedil: "\xC7", ccedil: "\xE7", Ccirc: "\u0108", ccirc: "\u0109", Cconint: "\u2230", ccups: "\u2A4C", ccupssm: "\u2A50", Cdot: "\u010A", cdot: "\u010B", cedil: "\xB8", Cedilla: "\xB8", cemptyv: "\u29B2", cent: "\xA2", centerdot: "\xB7", CenterDot: "\xB7", cfr: "\u{1D520}", Cfr: "\u212D", CHcy: "\u0427", chcy: "\u0447", check: "\u2713", checkmark: "\u2713", Chi: "\u03A7", chi: "\u03C7", circ: "\u02C6", circeq: "\u2257", circlearrowleft: "\u21BA", circlearrowright: "\u21BB", circledast: "\u229B", circledcirc: "\u229A", circleddash: "\u229D", CircleDot: "\u2299", circledR: "\xAE", circledS: "\u24C8", CircleMinus: "\u2296", CirclePlus: "\u2295", CircleTimes: "\u2297", cir: "\u25CB", cirE: "\u29C3", cire: "\u2257", cirfnint: "\u2A10", cirmid: "\u2AEF", cirscir: "\u29C2", ClockwiseContourIntegral: "\u2232", CloseCurlyDoubleQuote: "\u201D", CloseCurlyQuote: "\u2019", clubs: "\u2663", clubsuit: "\u2663", colon: ":", Colon: "\u2237", Colone: "\u2A74", colone: "\u2254", coloneq: "\u2254", comma: ",", commat: "@", comp: "\u2201", compfn: "\u2218", complement: "\u2201", complexes: "\u2102", cong: "\u2245", congdot: "\u2A6D", Congruent: "\u2261", conint: "\u222E", Conint: "\u222F", ContourIntegral: "\u222E", copf: "\u{1D554}", Copf: "\u2102", coprod: "\u2210", Coproduct: "\u2210", copy: "\xA9", COPY: "\xA9", copysr: "\u2117", CounterClockwiseContourIntegral: "\u2233", crarr: "\u21B5", cross: "\u2717", Cross: "\u2A2F", Cscr: "\u{1D49E}", cscr: "\u{1D4B8}", csub: "\u2ACF", csube: "\u2AD1", csup: "\u2AD0", csupe: "\u2AD2", ctdot: "\u22EF", cudarrl: "\u2938", cudarrr: "\u2935", cuepr: "\u22DE", cuesc: "\u22DF", cularr: "\u21B6", cularrp: "\u293D", cupbrcap: "\u2A48", cupcap: "\u2A46", CupCap: "\u224D", cup: "\u222A", Cup: "\u22D3", cupcup: "\u2A4A", cupdot: "\u228D", cupor: "\u2A45", cups: "\u222A\uFE00", curarr: "\u21B7", curarrm: "\u293C", curlyeqprec: "\u22DE", curlyeqsucc: "\u22DF", curlyvee: "\u22CE", curlywedge: "\u22CF", curren: "\xA4", curvearrowleft: "\u21B6", curvearrowright: "\u21B7", cuvee: "\u22CE", cuwed: "\u22CF", cwconint: "\u2232", cwint: "\u2231", cylcty: "\u232D", dagger: "\u2020", Dagger: "\u2021", daleth: "\u2138", darr: "\u2193", Darr: "\u21A1", dArr: "\u21D3", dash: "\u2010", Dashv: "\u2AE4", dashv: "\u22A3", dbkarow: "\u290F", dblac: "\u02DD", Dcaron: "\u010E", dcaron: "\u010F", Dcy: "\u0414", dcy: "\u0434", ddagger: "\u2021", ddarr: "\u21CA", DD: "\u2145", dd: "\u2146", DDotrahd: "\u2911", ddotseq: "\u2A77", deg: "\xB0", Del: "\u2207", Delta: "\u0394", delta: "\u03B4", demptyv: "\u29B1", dfisht: "\u297F", Dfr: "\u{1D507}", dfr: "\u{1D521}", dHar: "\u2965", dharl: "\u21C3", dharr: "\u21C2", DiacriticalAcute: "\xB4", DiacriticalDot: "\u02D9", DiacriticalDoubleAcute: "\u02DD", DiacriticalGrave: "`", DiacriticalTilde: "\u02DC", diam: "\u22C4", diamond: "\u22C4", Diamond: "\u22C4", diamondsuit: "\u2666", diams: "\u2666", die: "\xA8", DifferentialD: "\u2146", digamma: "\u03DD", disin: "\u22F2", div: "\xF7", divide: "\xF7", divideontimes: "\u22C7", divonx: "\u22C7", DJcy: "\u0402", djcy: "\u0452", dlcorn: "\u231E", dlcrop: "\u230D", dollar: "$", Dopf: "\u{1D53B}", dopf: "\u{1D555}", Dot: "\xA8", dot: "\u02D9", DotDot: "\u20DC", doteq: "\u2250", doteqdot: "\u2251", DotEqual: "\u2250", dotminus: "\u2238", dotplus: "\u2214", dotsquare: "\u22A1", doublebarwedge: "\u2306", DoubleContourIntegral: "\u222F", DoubleDot: "\xA8", DoubleDownArrow: "\u21D3", DoubleLeftArrow: "\u21D0", DoubleLeftRightArrow: "\u21D4", DoubleLeftTee: "\u2AE4", DoubleLongLeftArrow: "\u27F8", DoubleLongLeftRightArrow: "\u27FA", DoubleLongRightArrow: "\u27F9", DoubleRightArrow: "\u21D2", DoubleRightTee: "\u22A8", DoubleUpArrow: "\u21D1", DoubleUpDownArrow: "\u21D5", DoubleVerticalBar: "\u2225", DownArrowBar: "\u2913", downarrow: "\u2193", DownArrow: "\u2193", Downarrow: "\u21D3", DownArrowUpArrow: "\u21F5", DownBreve: "\u0311", downdownarrows: "\u21CA", downharpoonleft: "\u21C3", downharpoonright: "\u21C2", DownLeftRightVector: "\u2950", DownLeftTeeVector: "\u295E", DownLeftVectorBar: "\u2956", DownLeftVector: "\u21BD", DownRightTeeVector: "\u295F", DownRightVectorBar: "\u2957", DownRightVector: "\u21C1", DownTeeArrow: "\u21A7", DownTee: "\u22A4", drbkarow: "\u2910", drcorn: "\u231F", drcrop: "\u230C", Dscr: "\u{1D49F}", dscr: "\u{1D4B9}", DScy: "\u0405", dscy: "\u0455", dsol: "\u29F6", Dstrok: "\u0110", dstrok: "\u0111", dtdot: "\u22F1", dtri: "\u25BF", dtrif: "\u25BE", duarr: "\u21F5", duhar: "\u296F", dwangle: "\u29A6", DZcy: "\u040F", dzcy: "\u045F", dzigrarr: "\u27FF", Eacute: "\xC9", eacute: "\xE9", easter: "\u2A6E", Ecaron: "\u011A", ecaron: "\u011B", Ecirc: "\xCA", ecirc: "\xEA", ecir: "\u2256", ecolon: "\u2255", Ecy: "\u042D", ecy: "\u044D", eDDot: "\u2A77", Edot: "\u0116", edot: "\u0117", eDot: "\u2251", ee: "\u2147", efDot: "\u2252", Efr: "\u{1D508}", efr: "\u{1D522}", eg: "\u2A9A", Egrave: "\xC8", egrave: "\xE8", egs: "\u2A96", egsdot: "\u2A98", el: "\u2A99", Element: "\u2208", elinters: "\u23E7", ell: "\u2113", els: "\u2A95", elsdot: "\u2A97", Emacr: "\u0112", emacr: "\u0113", empty: "\u2205", emptyset: "\u2205", EmptySmallSquare: "\u25FB", emptyv: "\u2205", EmptyVerySmallSquare: "\u25AB", emsp13: "\u2004", emsp14: "\u2005", emsp: "\u2003", ENG: "\u014A", eng: "\u014B", ensp: "\u2002", Eogon: "\u0118", eogon: "\u0119", Eopf: "\u{1D53C}", eopf: "\u{1D556}", epar: "\u22D5", eparsl: "\u29E3", eplus: "\u2A71", epsi: "\u03B5", Epsilon: "\u0395", epsilon: "\u03B5", epsiv: "\u03F5", eqcirc: "\u2256", eqcolon: "\u2255", eqsim: "\u2242", eqslantgtr: "\u2A96", eqslantless: "\u2A95", Equal: "\u2A75", equals: "=", EqualTilde: "\u2242", equest: "\u225F", Equilibrium: "\u21CC", equiv: "\u2261", equivDD: "\u2A78", eqvparsl: "\u29E5", erarr: "\u2971", erDot: "\u2253", escr: "\u212F", Escr: "\u2130", esdot: "\u2250", Esim: "\u2A73", esim: "\u2242", Eta: "\u0397", eta: "\u03B7", ETH: "\xD0", eth: "\xF0", Euml: "\xCB", euml: "\xEB", euro: "\u20AC", excl: "!", exist: "\u2203", Exists: "\u2203", expectation: "\u2130", exponentiale: "\u2147", ExponentialE: "\u2147", fallingdotseq: "\u2252", Fcy: "\u0424", fcy: "\u0444", female: "\u2640", ffilig: "\uFB03", fflig: "\uFB00", ffllig: "\uFB04", Ffr: "\u{1D509}", ffr: "\u{1D523}", filig: "\uFB01", FilledSmallSquare: "\u25FC", FilledVerySmallSquare: "\u25AA", fjlig: "fj", flat: "\u266D", fllig: "\uFB02", fltns: "\u25B1", fnof: "\u0192", Fopf: "\u{1D53D}", fopf: "\u{1D557}", forall: "\u2200", ForAll: "\u2200", fork: "\u22D4", forkv: "\u2AD9", Fouriertrf: "\u2131", fpartint: "\u2A0D", frac12: "\xBD", frac13: "\u2153", frac14: "\xBC", frac15: "\u2155", frac16: "\u2159", frac18: "\u215B", frac23: "\u2154", frac25: "\u2156", frac34: "\xBE", frac35: "\u2157", frac38: "\u215C", frac45: "\u2158", frac56: "\u215A", frac58: "\u215D", frac78: "\u215E", frasl: "\u2044", frown: "\u2322", fscr: "\u{1D4BB}", Fscr: "\u2131", gacute: "\u01F5", Gamma: "\u0393", gamma: "\u03B3", Gammad: "\u03DC", gammad: "\u03DD", gap: "\u2A86", Gbreve: "\u011E", gbreve: "\u011F", Gcedil: "\u0122", Gcirc: "\u011C", gcirc: "\u011D", Gcy: "\u0413", gcy: "\u0433", Gdot: "\u0120", gdot: "\u0121", ge: "\u2265", gE: "\u2267", gEl: "\u2A8C", gel: "\u22DB", geq: "\u2265", geqq: "\u2267", geqslant: "\u2A7E", gescc: "\u2AA9", ges: "\u2A7E", gesdot: "\u2A80", gesdoto: "\u2A82", gesdotol: "\u2A84", gesl: "\u22DB\uFE00", gesles: "\u2A94", Gfr: "\u{1D50A}", gfr: "\u{1D524}", gg: "\u226B", Gg: "\u22D9", ggg: "\u22D9", gimel: "\u2137", GJcy: "\u0403", gjcy: "\u0453", gla: "\u2AA5", gl: "\u2277", glE: "\u2A92", glj: "\u2AA4", gnap: "\u2A8A", gnapprox: "\u2A8A", gne: "\u2A88", gnE: "\u2269", gneq: "\u2A88", gneqq: "\u2269", gnsim: "\u22E7", Gopf: "\u{1D53E}", gopf: "\u{1D558}", grave: "`", GreaterEqual: "\u2265", GreaterEqualLess: "\u22DB", GreaterFullEqual: "\u2267", GreaterGreater: "\u2AA2", GreaterLess: "\u2277", GreaterSlantEqual: "\u2A7E", GreaterTilde: "\u2273", Gscr: "\u{1D4A2}", gscr: "\u210A", gsim: "\u2273", gsime: "\u2A8E", gsiml: "\u2A90", gtcc: "\u2AA7", gtcir: "\u2A7A", gt: ">", GT: ">", Gt: "\u226B", gtdot: "\u22D7", gtlPar: "\u2995", gtquest: "\u2A7C", gtrapprox: "\u2A86", gtrarr: "\u2978", gtrdot: "\u22D7", gtreqless: "\u22DB", gtreqqless: "\u2A8C", gtrless: "\u2277", gtrsim: "\u2273", gvertneqq: "\u2269\uFE00", gvnE: "\u2269\uFE00", Hacek: "\u02C7", hairsp: "\u200A", half: "\xBD", hamilt: "\u210B", HARDcy: "\u042A", hardcy: "\u044A", harrcir: "\u2948", harr: "\u2194", hArr: "\u21D4", harrw: "\u21AD", Hat: "^", hbar: "\u210F", Hcirc: "\u0124", hcirc: "\u0125", hearts: "\u2665", heartsuit: "\u2665", hellip: "\u2026", hercon: "\u22B9", hfr: "\u{1D525}", Hfr: "\u210C", HilbertSpace: "\u210B", hksearow: "\u2925", hkswarow: "\u2926", hoarr: "\u21FF", homtht: "\u223B", hookleftarrow: "\u21A9", hookrightarrow: "\u21AA", hopf: "\u{1D559}", Hopf: "\u210D", horbar: "\u2015", HorizontalLine: "\u2500", hscr: "\u{1D4BD}", Hscr: "\u210B", hslash: "\u210F", Hstrok: "\u0126", hstrok: "\u0127", HumpDownHump: "\u224E", HumpEqual: "\u224F", hybull: "\u2043", hyphen: "\u2010", Iacute: "\xCD", iacute: "\xED", ic: "\u2063", Icirc: "\xCE", icirc: "\xEE", Icy: "\u0418", icy: "\u0438", Idot: "\u0130", IEcy: "\u0415", iecy: "\u0435", iexcl: "\xA1", iff: "\u21D4", ifr: "\u{1D526}", Ifr: "\u2111", Igrave: "\xCC", igrave: "\xEC", ii: "\u2148", iiiint: "\u2A0C", iiint: "\u222D", iinfin: "\u29DC", iiota: "\u2129", IJlig: "\u0132", ijlig: "\u0133", Imacr: "\u012A", imacr: "\u012B", image: "\u2111", ImaginaryI: "\u2148", imagline: "\u2110", imagpart: "\u2111", imath: "\u0131", Im: "\u2111", imof: "\u22B7", imped: "\u01B5", Implies: "\u21D2", incare: "\u2105", in: "\u2208", infin: "\u221E", infintie: "\u29DD", inodot: "\u0131", intcal: "\u22BA", int: "\u222B", Int: "\u222C", integers: "\u2124", Integral: "\u222B", intercal: "\u22BA", Intersection: "\u22C2", intlarhk: "\u2A17", intprod: "\u2A3C", InvisibleComma: "\u2063", InvisibleTimes: "\u2062", IOcy: "\u0401", iocy: "\u0451", Iogon: "\u012E", iogon: "\u012F", Iopf: "\u{1D540}", iopf: "\u{1D55A}", Iota: "\u0399", iota: "\u03B9", iprod: "\u2A3C", iquest: "\xBF", iscr: "\u{1D4BE}", Iscr: "\u2110", isin: "\u2208", isindot: "\u22F5", isinE: "\u22F9", isins: "\u22F4", isinsv: "\u22F3", isinv: "\u2208", it: "\u2062", Itilde: "\u0128", itilde: "\u0129", Iukcy: "\u0406", iukcy: "\u0456", Iuml: "\xCF", iuml: "\xEF", Jcirc: "\u0134", jcirc: "\u0135", Jcy: "\u0419", jcy: "\u0439", Jfr: "\u{1D50D}", jfr: "\u{1D527}", jmath: "\u0237", Jopf: "\u{1D541}", jopf: "\u{1D55B}", Jscr: "\u{1D4A5}", jscr: "\u{1D4BF}", Jsercy: "\u0408", jsercy: "\u0458", Jukcy: "\u0404", jukcy: "\u0454", Kappa: "\u039A", kappa: "\u03BA", kappav: "\u03F0", Kcedil: "\u0136", kcedil: "\u0137", Kcy: "\u041A", kcy: "\u043A", Kfr: "\u{1D50E}", kfr: "\u{1D528}", kgreen: "\u0138", KHcy: "\u0425", khcy: "\u0445", KJcy: "\u040C", kjcy: "\u045C", Kopf: "\u{1D542}", kopf: "\u{1D55C}", Kscr: "\u{1D4A6}", kscr: "\u{1D4C0}", lAarr: "\u21DA", Lacute: "\u0139", lacute: "\u013A", laemptyv: "\u29B4", lagran: "\u2112", Lambda: "\u039B", lambda: "\u03BB", lang: "\u27E8", Lang: "\u27EA", langd: "\u2991", langle: "\u27E8", lap: "\u2A85", Laplacetrf: "\u2112", laquo: "\xAB", larrb: "\u21E4", larrbfs: "\u291F", larr: "\u2190", Larr: "\u219E", lArr: "\u21D0", larrfs: "\u291D", larrhk: "\u21A9", larrlp: "\u21AB", larrpl: "\u2939", larrsim: "\u2973", larrtl: "\u21A2", latail: "\u2919", lAtail: "\u291B", lat: "\u2AAB", late: "\u2AAD", lates: "\u2AAD\uFE00", lbarr: "\u290C", lBarr: "\u290E", lbbrk: "\u2772", lbrace: "{", lbrack: "[", lbrke: "\u298B", lbrksld: "\u298F", lbrkslu: "\u298D", Lcaron: "\u013D", lcaron: "\u013E", Lcedil: "\u013B", lcedil: "\u013C", lceil: "\u2308", lcub: "{", Lcy: "\u041B", lcy: "\u043B", ldca: "\u2936", ldquo: "\u201C", ldquor: "\u201E", ldrdhar: "\u2967", ldrushar: "\u294B", ldsh: "\u21B2", le: "\u2264", lE: "\u2266", LeftAngleBracket: "\u27E8", LeftArrowBar: "\u21E4", leftarrow: "\u2190", LeftArrow: "\u2190", Leftarrow: "\u21D0", LeftArrowRightArrow: "\u21C6", leftarrowtail: "\u21A2", LeftCeiling: "\u2308", LeftDoubleBracket: "\u27E6", LeftDownTeeVector: "\u2961", LeftDownVectorBar: "\u2959", LeftDownVector: "\u21C3", LeftFloor: "\u230A", leftharpoondown: "\u21BD", leftharpoonup: "\u21BC", leftleftarrows: "\u21C7", leftrightarrow: "\u2194", LeftRightArrow: "\u2194", Leftrightarrow: "\u21D4", leftrightarrows: "\u21C6", leftrightharpoons: "\u21CB", leftrightsquigarrow: "\u21AD", LeftRightVector: "\u294E", LeftTeeArrow: "\u21A4", LeftTee: "\u22A3", LeftTeeVector: "\u295A", leftthreetimes: "\u22CB", LeftTriangleBar: "\u29CF", LeftTriangle: "\u22B2", LeftTriangleEqual: "\u22B4", LeftUpDownVector: "\u2951", LeftUpTeeVector: "\u2960", LeftUpVectorBar: "\u2958", LeftUpVector: "\u21BF", LeftVectorBar: "\u2952", LeftVector: "\u21BC", lEg: "\u2A8B", leg: "\u22DA", leq: "\u2264", leqq: "\u2266", leqslant: "\u2A7D", lescc: "\u2AA8", les: "\u2A7D", lesdot: "\u2A7F", lesdoto: "\u2A81", lesdotor: "\u2A83", lesg: "\u22DA\uFE00", lesges: "\u2A93", lessapprox: "\u2A85", lessdot: "\u22D6", lesseqgtr: "\u22DA", lesseqqgtr: "\u2A8B", LessEqualGreater: "\u22DA", LessFullEqual: "\u2266", LessGreater: "\u2276", lessgtr: "\u2276", LessLess: "\u2AA1", lesssim: "\u2272", LessSlantEqual: "\u2A7D", LessTilde: "\u2272", lfisht: "\u297C", lfloor: "\u230A", Lfr: "\u{1D50F}", lfr: "\u{1D529}", lg: "\u2276", lgE: "\u2A91", lHar: "\u2962", lhard: "\u21BD", lharu: "\u21BC", lharul: "\u296A", lhblk: "\u2584", LJcy: "\u0409", ljcy: "\u0459", llarr: "\u21C7", ll: "\u226A", Ll: "\u22D8", llcorner: "\u231E", Lleftarrow: "\u21DA", llhard: "\u296B", lltri: "\u25FA", Lmidot: "\u013F", lmidot: "\u0140", lmoustache: "\u23B0", lmoust: "\u23B0", lnap: "\u2A89", lnapprox: "\u2A89", lne: "\u2A87", lnE: "\u2268", lneq: "\u2A87", lneqq: "\u2268", lnsim: "\u22E6", loang: "\u27EC", loarr: "\u21FD", lobrk: "\u27E6", longleftarrow: "\u27F5", LongLeftArrow: "\u27F5", Longleftarrow: "\u27F8", longleftrightarrow: "\u27F7", LongLeftRightArrow: "\u27F7", Longleftrightarrow: "\u27FA", longmapsto: "\u27FC", longrightarrow: "\u27F6", LongRightArrow: "\u27F6", Longrightarrow: "\u27F9", looparrowleft: "\u21AB", looparrowright: "\u21AC", lopar: "\u2985", Lopf: "\u{1D543}", lopf: "\u{1D55D}", loplus: "\u2A2D", lotimes: "\u2A34", lowast: "\u2217", lowbar: "_", LowerLeftArrow: "\u2199", LowerRightArrow: "\u2198", loz: "\u25CA", lozenge: "\u25CA", lozf: "\u29EB", lpar: "(", lparlt: "\u2993", lrarr: "\u21C6", lrcorner: "\u231F", lrhar: "\u21CB", lrhard: "\u296D", lrm: "\u200E", lrtri: "\u22BF", lsaquo: "\u2039", lscr: "\u{1D4C1}", Lscr: "\u2112", lsh: "\u21B0", Lsh: "\u21B0", lsim: "\u2272", lsime: "\u2A8D", lsimg: "\u2A8F", lsqb: "[", lsquo: "\u2018", lsquor: "\u201A", Lstrok: "\u0141", lstrok: "\u0142", ltcc: "\u2AA6", ltcir: "\u2A79", lt: "<", LT: "<", Lt: "\u226A", ltdot: "\u22D6", lthree: "\u22CB", ltimes: "\u22C9", ltlarr: "\u2976", ltquest: "\u2A7B", ltri: "\u25C3", ltrie: "\u22B4", ltrif: "\u25C2", ltrPar: "\u2996", lurdshar: "\u294A", luruhar: "\u2966", lvertneqq: "\u2268\uFE00", lvnE: "\u2268\uFE00", macr: "\xAF", male: "\u2642", malt: "\u2720", maltese: "\u2720", Map: "\u2905", map: "\u21A6", mapsto: "\u21A6", mapstodown: "\u21A7", mapstoleft: "\u21A4", mapstoup: "\u21A5", marker: "\u25AE", mcomma: "\u2A29", Mcy: "\u041C", mcy: "\u043C", mdash: "\u2014", mDDot: "\u223A", measuredangle: "\u2221", MediumSpace: "\u205F", Mellintrf: "\u2133", Mfr: "\u{1D510}", mfr: "\u{1D52A}", mho: "\u2127", micro: "\xB5", midast: "*", midcir: "\u2AF0", mid: "\u2223", middot: "\xB7", minusb: "\u229F", minus: "\u2212", minusd: "\u2238", minusdu: "\u2A2A", MinusPlus: "\u2213", mlcp: "\u2ADB", mldr: "\u2026", mnplus: "\u2213", models: "\u22A7", Mopf: "\u{1D544}", mopf: "\u{1D55E}", mp: "\u2213", mscr: "\u{1D4C2}", Mscr: "\u2133", mstpos: "\u223E", Mu: "\u039C", mu: "\u03BC", multimap: "\u22B8", mumap: "\u22B8", nabla: "\u2207", Nacute: "\u0143", nacute: "\u0144", nang: "\u2220\u20D2", nap: "\u2249", napE: "\u2A70\u0338", napid: "\u224B\u0338", napos: "\u0149", napprox: "\u2249", natural: "\u266E", naturals: "\u2115", natur: "\u266E", nbsp: "\xA0", nbump: "\u224E\u0338", nbumpe: "\u224F\u0338", ncap: "\u2A43", Ncaron: "\u0147", ncaron: "\u0148", Ncedil: "\u0145", ncedil: "\u0146", ncong: "\u2247", ncongdot: "\u2A6D\u0338", ncup: "\u2A42", Ncy: "\u041D", ncy: "\u043D", ndash: "\u2013", nearhk: "\u2924", nearr: "\u2197", neArr: "\u21D7", nearrow: "\u2197", ne: "\u2260", nedot: "\u2250\u0338", NegativeMediumSpace: "\u200B", NegativeThickSpace: "\u200B", NegativeThinSpace: "\u200B", NegativeVeryThinSpace: "\u200B", nequiv: "\u2262", nesear: "\u2928", nesim: "\u2242\u0338", NestedGreaterGreater: "\u226B", NestedLessLess: "\u226A", NewLine: "\n", nexist: "\u2204", nexists: "\u2204", Nfr: "\u{1D511}", nfr: "\u{1D52B}", ngE: "\u2267\u0338", nge: "\u2271", ngeq: "\u2271", ngeqq: "\u2267\u0338", ngeqslant: "\u2A7E\u0338", nges: "\u2A7E\u0338", nGg: "\u22D9\u0338", ngsim: "\u2275", nGt: "\u226B\u20D2", ngt: "\u226F", ngtr: "\u226F", nGtv: "\u226B\u0338", nharr: "\u21AE", nhArr: "\u21CE", nhpar: "\u2AF2", ni: "\u220B", nis: "\u22FC", nisd: "\u22FA", niv: "\u220B", NJcy: "\u040A", njcy: "\u045A", nlarr: "\u219A", nlArr: "\u21CD", nldr: "\u2025", nlE: "\u2266\u0338", nle: "\u2270", nleftarrow: "\u219A", nLeftarrow: "\u21CD", nleftrightarrow: "\u21AE", nLeftrightarrow: "\u21CE", nleq: "\u2270", nleqq: "\u2266\u0338", nleqslant: "\u2A7D\u0338", nles: "\u2A7D\u0338", nless: "\u226E", nLl: "\u22D8\u0338", nlsim: "\u2274", nLt: "\u226A\u20D2", nlt: "\u226E", nltri: "\u22EA", nltrie: "\u22EC", nLtv: "\u226A\u0338", nmid: "\u2224", NoBreak: "\u2060", NonBreakingSpace: "\xA0", nopf: "\u{1D55F}", Nopf: "\u2115", Not: "\u2AEC", not: "\xAC", NotCongruent: "\u2262", NotCupCap: "\u226D", NotDoubleVerticalBar: "\u2226", NotElement: "\u2209", NotEqual: "\u2260", NotEqualTilde: "\u2242\u0338", NotExists: "\u2204", NotGreater: "\u226F", NotGreaterEqual: "\u2271", NotGreaterFullEqual: "\u2267\u0338", NotGreaterGreater: "\u226B\u0338", NotGreaterLess: "\u2279", NotGreaterSlantEqual: "\u2A7E\u0338", NotGreaterTilde: "\u2275", NotHumpDownHump: "\u224E\u0338", NotHumpEqual: "\u224F\u0338", notin: "\u2209", notindot: "\u22F5\u0338", notinE: "\u22F9\u0338", notinva: "\u2209", notinvb: "\u22F7", notinvc: "\u22F6", NotLeftTriangleBar: "\u29CF\u0338", NotLeftTriangle: "\u22EA", NotLeftTriangleEqual: "\u22EC", NotLess: "\u226E", NotLessEqual: "\u2270", NotLessGreater: "\u2278", NotLessLess: "\u226A\u0338", NotLessSlantEqual: "\u2A7D\u0338", NotLessTilde: "\u2274", NotNestedGreaterGreater: "\u2AA2\u0338", NotNestedLessLess: "\u2AA1\u0338", notni: "\u220C", notniva: "\u220C", notnivb: "\u22FE", notnivc: "\u22FD", NotPrecedes: "\u2280", NotPrecedesEqual: "\u2AAF\u0338", NotPrecedesSlantEqual: "\u22E0", NotReverseElement: "\u220C", NotRightTriangleBar: "\u29D0\u0338", NotRightTriangle: "\u22EB", NotRightTriangleEqual: "\u22ED", NotSquareSubset: "\u228F\u0338", NotSquareSubsetEqual: "\u22E2", NotSquareSuperset: "\u2290\u0338", NotSquareSupersetEqual: "\u22E3", NotSubset: "\u2282\u20D2", NotSubsetEqual: "\u2288", NotSucceeds: "\u2281", NotSucceedsEqual: "\u2AB0\u0338", NotSucceedsSlantEqual: "\u22E1", NotSucceedsTilde: "\u227F\u0338", NotSuperset: "\u2283\u20D2", NotSupersetEqual: "\u2289", NotTilde: "\u2241", NotTildeEqual: "\u2244", NotTildeFullEqual: "\u2247", NotTildeTilde: "\u2249", NotVerticalBar: "\u2224", nparallel: "\u2226", npar: "\u2226", nparsl: "\u2AFD\u20E5", npart: "\u2202\u0338", npolint: "\u2A14", npr: "\u2280", nprcue: "\u22E0", nprec: "\u2280", npreceq: "\u2AAF\u0338", npre: "\u2AAF\u0338", nrarrc: "\u2933\u0338", nrarr: "\u219B", nrArr: "\u21CF", nrarrw: "\u219D\u0338", nrightarrow: "\u219B", nRightarrow: "\u21CF", nrtri: "\u22EB", nrtrie: "\u22ED", nsc: "\u2281", nsccue: "\u22E1", nsce: "\u2AB0\u0338", Nscr: "\u{1D4A9}", nscr: "\u{1D4C3}", nshortmid: "\u2224", nshortparallel: "\u2226", nsim: "\u2241", nsime: "\u2244", nsimeq: "\u2244", nsmid: "\u2224", nspar: "\u2226", nsqsube: "\u22E2", nsqsupe: "\u22E3", nsub: "\u2284", nsubE: "\u2AC5\u0338", nsube: "\u2288", nsubset: "\u2282\u20D2", nsubseteq: "\u2288", nsubseteqq: "\u2AC5\u0338", nsucc: "\u2281", nsucceq: "\u2AB0\u0338", nsup: "\u2285", nsupE: "\u2AC6\u0338", nsupe: "\u2289", nsupset: "\u2283\u20D2", nsupseteq: "\u2289", nsupseteqq: "\u2AC6\u0338", ntgl: "\u2279", Ntilde: "\xD1", ntilde: "\xF1", ntlg: "\u2278", ntriangleleft: "\u22EA", ntrianglelefteq: "\u22EC", ntriangleright: "\u22EB", ntrianglerighteq: "\u22ED", Nu: "\u039D", nu: "\u03BD", num: "#", numero: "\u2116", numsp: "\u2007", nvap: "\u224D\u20D2", nvdash: "\u22AC", nvDash: "\u22AD", nVdash: "\u22AE", nVDash: "\u22AF", nvge: "\u2265\u20D2", nvgt: ">\u20D2", nvHarr: "\u2904", nvinfin: "\u29DE", nvlArr: "\u2902", nvle: "\u2264\u20D2", nvlt: "<\u20D2", nvltrie: "\u22B4\u20D2", nvrArr: "\u2903", nvrtrie: "\u22B5\u20D2", nvsim: "\u223C\u20D2", nwarhk: "\u2923", nwarr: "\u2196", nwArr: "\u21D6", nwarrow: "\u2196", nwnear: "\u2927", Oacute: "\xD3", oacute: "\xF3", oast: "\u229B", Ocirc: "\xD4", ocirc: "\xF4", ocir: "\u229A", Ocy: "\u041E", ocy: "\u043E", odash: "\u229D", Odblac: "\u0150", odblac: "\u0151", odiv: "\u2A38", odot: "\u2299", odsold: "\u29BC", OElig: "\u0152", oelig: "\u0153", ofcir: "\u29BF", Ofr: "\u{1D512}", ofr: "\u{1D52C}", ogon: "\u02DB", Ograve: "\xD2", ograve: "\xF2", ogt: "\u29C1", ohbar: "\u29B5", ohm: "\u03A9", oint: "\u222E", olarr: "\u21BA", olcir: "\u29BE", olcross: "\u29BB", oline: "\u203E", olt: "\u29C0", Omacr: "\u014C", omacr: "\u014D", Omega: "\u03A9", omega: "\u03C9", Omicron: "\u039F", omicron: "\u03BF", omid: "\u29B6", ominus: "\u2296", Oopf: "\u{1D546}", oopf: "\u{1D560}", opar: "\u29B7", OpenCurlyDoubleQuote: "\u201C", OpenCurlyQuote: "\u2018", operp: "\u29B9", oplus: "\u2295", orarr: "\u21BB", Or: "\u2A54", or: "\u2228", ord: "\u2A5D", order: "\u2134", orderof: "\u2134", ordf: "\xAA", ordm: "\xBA", origof: "\u22B6", oror: "\u2A56", orslope: "\u2A57", orv: "\u2A5B", oS: "\u24C8", Oscr: "\u{1D4AA}", oscr: "\u2134", Oslash: "\xD8", oslash: "\xF8", osol: "\u2298", Otilde: "\xD5", otilde: "\xF5", otimesas: "\u2A36", Otimes: "\u2A37", otimes: "\u2297", Ouml: "\xD6", ouml: "\xF6", ovbar: "\u233D", OverBar: "\u203E", OverBrace: "\u23DE", OverBracket: "\u23B4", OverParenthesis: "\u23DC", para: "\xB6", parallel: "\u2225", par: "\u2225", parsim: "\u2AF3", parsl: "\u2AFD", part: "\u2202", PartialD: "\u2202", Pcy: "\u041F", pcy: "\u043F", percnt: "%", period: ".", permil: "\u2030", perp: "\u22A5", pertenk: "\u2031", Pfr: "\u{1D513}", pfr: "\u{1D52D}", Phi: "\u03A6", phi: "\u03C6", phiv: "\u03D5", phmmat: "\u2133", phone: "\u260E", Pi: "\u03A0", pi: "\u03C0", pitchfork: "\u22D4", piv: "\u03D6", planck: "\u210F", planckh: "\u210E", plankv: "\u210F", plusacir: "\u2A23", plusb: "\u229E", pluscir: "\u2A22", plus: "+", plusdo: "\u2214", plusdu: "\u2A25", pluse: "\u2A72", PlusMinus: "\xB1", plusmn: "\xB1", plussim: "\u2A26", plustwo: "\u2A27", pm: "\xB1", Poincareplane: "\u210C", pointint: "\u2A15", popf: "\u{1D561}", Popf: "\u2119", pound: "\xA3", prap: "\u2AB7", Pr: "\u2ABB", pr: "\u227A", prcue: "\u227C", precapprox: "\u2AB7", prec: "\u227A", preccurlyeq: "\u227C", Precedes: "\u227A", PrecedesEqual: "\u2AAF", PrecedesSlantEqual: "\u227C", PrecedesTilde: "\u227E", preceq: "\u2AAF", precnapprox: "\u2AB9", precneqq: "\u2AB5", precnsim: "\u22E8", pre: "\u2AAF", prE: "\u2AB3", precsim: "\u227E", prime: "\u2032", Prime: "\u2033", primes: "\u2119", prnap: "\u2AB9", prnE: "\u2AB5", prnsim: "\u22E8", prod: "\u220F", Product: "\u220F", profalar: "\u232E", profline: "\u2312", profsurf: "\u2313", prop: "\u221D", Proportional: "\u221D", Proportion: "\u2237", propto: "\u221D", prsim: "\u227E", prurel: "\u22B0", Pscr: "\u{1D4AB}", pscr: "\u{1D4C5}", Psi: "\u03A8", psi: "\u03C8", puncsp: "\u2008", Qfr: "\u{1D514}", qfr: "\u{1D52E}", qint: "\u2A0C", qopf: "\u{1D562}", Qopf: "\u211A", qprime: "\u2057", Qscr: "\u{1D4AC}", qscr: "\u{1D4C6}", quaternions: "\u210D", quatint: "\u2A16", quest: "?", questeq: "\u225F", quot: '"', QUOT: '"', rAarr: "\u21DB", race: "\u223D\u0331", Racute: "\u0154", racute: "\u0155", radic: "\u221A", raemptyv: "\u29B3", rang: "\u27E9", Rang: "\u27EB", rangd: "\u2992", range: "\u29A5", rangle: "\u27E9", raquo: "\xBB", rarrap: "\u2975", rarrb: "\u21E5", rarrbfs: "\u2920", rarrc: "\u2933", rarr: "\u2192", Rarr: "\u21A0", rArr: "\u21D2", rarrfs: "\u291E", rarrhk: "\u21AA", rarrlp: "\u21AC", rarrpl: "\u2945", rarrsim: "\u2974", Rarrtl: "\u2916", rarrtl: "\u21A3", rarrw: "\u219D", ratail: "\u291A", rAtail: "\u291C", ratio: "\u2236", rationals: "\u211A", rbarr: "\u290D", rBarr: "\u290F", RBarr: "\u2910", rbbrk: "\u2773", rbrace: "}", rbrack: "]", rbrke: "\u298C", rbrksld: "\u298E", rbrkslu: "\u2990", Rcaron: "\u0158", rcaron: "\u0159", Rcedil: "\u0156", rcedil: "\u0157", rceil: "\u2309", rcub: "}", Rcy: "\u0420", rcy: "\u0440", rdca: "\u2937", rdldhar: "\u2969", rdquo: "\u201D", rdquor: "\u201D", rdsh: "\u21B3", real: "\u211C", realine: "\u211B", realpart: "\u211C", reals: "\u211D", Re: "\u211C", rect: "\u25AD", reg: "\xAE", REG: "\xAE", ReverseElement: "\u220B", ReverseEquilibrium: "\u21CB", ReverseUpEquilibrium: "\u296F", rfisht: "\u297D", rfloor: "\u230B", rfr: "\u{1D52F}", Rfr: "\u211C", rHar: "\u2964", rhard: "\u21C1", rharu: "\u21C0", rharul: "\u296C", Rho: "\u03A1", rho: "\u03C1", rhov: "\u03F1", RightAngleBracket: "\u27E9", RightArrowBar: "\u21E5", rightarrow: "\u2192", RightArrow: "\u2192", Rightarrow: "\u21D2", RightArrowLeftArrow: "\u21C4", rightarrowtail: "\u21A3", RightCeiling: "\u2309", RightDoubleBracket: "\u27E7", RightDownTeeVector: "\u295D", RightDownVectorBar: "\u2955", RightDownVector: "\u21C2", RightFloor: "\u230B", rightharpoondown: "\u21C1", rightharpoonup: "\u21C0", rightleftarrows: "\u21C4", rightleftharpoons: "\u21CC", rightrightarrows: "\u21C9", rightsquigarrow: "\u219D", RightTeeArrow: "\u21A6", RightTee: "\u22A2", RightTeeVector: "\u295B", rightthreetimes: "\u22CC", RightTriangleBar: "\u29D0", RightTriangle: "\u22B3", RightTriangleEqual: "\u22B5", RightUpDownVector: "\u294F", RightUpTeeVector: "\u295C", RightUpVectorBar: "\u2954", RightUpVector: "\u21BE", RightVectorBar: "\u2953", RightVector: "\u21C0", ring: "\u02DA", risingdotseq: "\u2253", rlarr: "\u21C4", rlhar: "\u21CC", rlm: "\u200F", rmoustache: "\u23B1", rmoust: "\u23B1", rnmid: "\u2AEE", roang: "\u27ED", roarr: "\u21FE", robrk: "\u27E7", ropar: "\u2986", ropf: "\u{1D563}", Ropf: "\u211D", roplus: "\u2A2E", rotimes: "\u2A35", RoundImplies: "\u2970", rpar: ")", rpargt: "\u2994", rppolint: "\u2A12", rrarr: "\u21C9", Rrightarrow: "\u21DB", rsaquo: "\u203A", rscr: "\u{1D4C7}", Rscr: "\u211B", rsh: "\u21B1", Rsh: "\u21B1", rsqb: "]", rsquo: "\u2019", rsquor: "\u2019", rthree: "\u22CC", rtimes: "\u22CA", rtri: "\u25B9", rtrie: "\u22B5", rtrif: "\u25B8", rtriltri: "\u29CE", RuleDelayed: "\u29F4", ruluhar: "\u2968", rx: "\u211E", Sacute: "\u015A", sacute: "\u015B", sbquo: "\u201A", scap: "\u2AB8", Scaron: "\u0160", scaron: "\u0161", Sc: "\u2ABC", sc: "\u227B", sccue: "\u227D", sce: "\u2AB0", scE: "\u2AB4", Scedil: "\u015E", scedil: "\u015F", Scirc: "\u015C", scirc: "\u015D", scnap: "\u2ABA", scnE: "\u2AB6", scnsim: "\u22E9", scpolint: "\u2A13", scsim: "\u227F", Scy: "\u0421", scy: "\u0441", sdotb: "\u22A1", sdot: "\u22C5", sdote: "\u2A66", searhk: "\u2925", searr: "\u2198", seArr: "\u21D8", searrow: "\u2198", sect: "\xA7", semi: ";", seswar: "\u2929", setminus: "\u2216", setmn: "\u2216", sext: "\u2736", Sfr: "\u{1D516}", sfr: "\u{1D530}", sfrown: "\u2322", sharp: "\u266F", SHCHcy: "\u0429", shchcy: "\u0449", SHcy: "\u0428", shcy: "\u0448", ShortDownArrow: "\u2193", ShortLeftArrow: "\u2190", shortmid: "\u2223", shortparallel: "\u2225", ShortRightArrow: "\u2192", ShortUpArrow: "\u2191", shy: "\xAD", Sigma: "\u03A3", sigma: "\u03C3", sigmaf: "\u03C2", sigmav: "\u03C2", sim: "\u223C", simdot: "\u2A6A", sime: "\u2243", simeq: "\u2243", simg: "\u2A9E", simgE: "\u2AA0", siml: "\u2A9D", simlE: "\u2A9F", simne: "\u2246", simplus: "\u2A24", simrarr: "\u2972", slarr: "\u2190", SmallCircle: "\u2218", smallsetminus: "\u2216", smashp: "\u2A33", smeparsl: "\u29E4", smid: "\u2223", smile: "\u2323", smt: "\u2AAA", smte: "\u2AAC", smtes: "\u2AAC\uFE00", SOFTcy: "\u042C", softcy: "\u044C", solbar: "\u233F", solb: "\u29C4", sol: "/", Sopf: "\u{1D54A}", sopf: "\u{1D564}", spades: "\u2660", spadesuit: "\u2660", spar: "\u2225", sqcap: "\u2293", sqcaps: "\u2293\uFE00", sqcup: "\u2294", sqcups: "\u2294\uFE00", Sqrt: "\u221A", sqsub: "\u228F", sqsube: "\u2291", sqsubset: "\u228F", sqsubseteq: "\u2291", sqsup: "\u2290", sqsupe: "\u2292", sqsupset: "\u2290", sqsupseteq: "\u2292", square: "\u25A1", Square: "\u25A1", SquareIntersection: "\u2293", SquareSubset: "\u228F", SquareSubsetEqual: "\u2291", SquareSuperset: "\u2290", SquareSupersetEqual: "\u2292", SquareUnion: "\u2294", squarf: "\u25AA", squ: "\u25A1", squf: "\u25AA", srarr: "\u2192", Sscr: "\u{1D4AE}", sscr: "\u{1D4C8}", ssetmn: "\u2216", ssmile: "\u2323", sstarf: "\u22C6", Star: "\u22C6", star: "\u2606", starf: "\u2605", straightepsilon: "\u03F5", straightphi: "\u03D5", strns: "\xAF", sub: "\u2282", Sub: "\u22D0", subdot: "\u2ABD", subE: "\u2AC5", sube: "\u2286", subedot: "\u2AC3", submult: "\u2AC1", subnE: "\u2ACB", subne: "\u228A", subplus: "\u2ABF", subrarr: "\u2979", subset: "\u2282", Subset: "\u22D0", subseteq: "\u2286", subseteqq: "\u2AC5", SubsetEqual: "\u2286", subsetneq: "\u228A", subsetneqq: "\u2ACB", subsim: "\u2AC7", subsub: "\u2AD5", subsup: "\u2AD3", succapprox: "\u2AB8", succ: "\u227B", succcurlyeq: "\u227D", Succeeds: "\u227B", SucceedsEqual: "\u2AB0", SucceedsSlantEqual: "\u227D", SucceedsTilde: "\u227F", succeq: "\u2AB0", succnapprox: "\u2ABA", succneqq: "\u2AB6", succnsim: "\u22E9", succsim: "\u227F", SuchThat: "\u220B", sum: "\u2211", Sum: "\u2211", sung: "\u266A", sup1: "\xB9", sup2: "\xB2", sup3: "\xB3", sup: "\u2283", Sup: "\u22D1", supdot: "\u2ABE", supdsub: "\u2AD8", supE: "\u2AC6", supe: "\u2287", supedot: "\u2AC4", Superset: "\u2283", SupersetEqual: "\u2287", suphsol: "\u27C9", suphsub: "\u2AD7", suplarr: "\u297B", supmult: "\u2AC2", supnE: "\u2ACC", supne: "\u228B", supplus: "\u2AC0", supset: "\u2283", Supset: "\u22D1", supseteq: "\u2287", supseteqq: "\u2AC6", supsetneq: "\u228B", supsetneqq: "\u2ACC", supsim: "\u2AC8", supsub: "\u2AD4", supsup: "\u2AD6", swarhk: "\u2926", swarr: "\u2199", swArr: "\u21D9", swarrow: "\u2199", swnwar: "\u292A", szlig: "\xDF", Tab: "	", target: "\u2316", Tau: "\u03A4", tau: "\u03C4", tbrk: "\u23B4", Tcaron: "\u0164", tcaron: "\u0165", Tcedil: "\u0162", tcedil: "\u0163", Tcy: "\u0422", tcy: "\u0442", tdot: "\u20DB", telrec: "\u2315", Tfr: "\u{1D517}", tfr: "\u{1D531}", there4: "\u2234", therefore: "\u2234", Therefore: "\u2234", Theta: "\u0398", theta: "\u03B8", thetasym: "\u03D1", thetav: "\u03D1", thickapprox: "\u2248", thicksim: "\u223C", ThickSpace: "\u205F\u200A", ThinSpace: "\u2009", thinsp: "\u2009", thkap: "\u2248", thksim: "\u223C", THORN: "\xDE", thorn: "\xFE", tilde: "\u02DC", Tilde: "\u223C", TildeEqual: "\u2243", TildeFullEqual: "\u2245", TildeTilde: "\u2248", timesbar: "\u2A31", timesb: "\u22A0", times: "\xD7", timesd: "\u2A30", tint: "\u222D", toea: "\u2928", topbot: "\u2336", topcir: "\u2AF1", top: "\u22A4", Topf: "\u{1D54B}", topf: "\u{1D565}", topfork: "\u2ADA", tosa: "\u2929", tprime: "\u2034", trade: "\u2122", TRADE: "\u2122", triangle: "\u25B5", triangledown: "\u25BF", triangleleft: "\u25C3", trianglelefteq: "\u22B4", triangleq: "\u225C", triangleright: "\u25B9", trianglerighteq: "\u22B5", tridot: "\u25EC", trie: "\u225C", triminus: "\u2A3A", TripleDot: "\u20DB", triplus: "\u2A39", trisb: "\u29CD", tritime: "\u2A3B", trpezium: "\u23E2", Tscr: "\u{1D4AF}", tscr: "\u{1D4C9}", TScy: "\u0426", tscy: "\u0446", TSHcy: "\u040B", tshcy: "\u045B", Tstrok: "\u0166", tstrok: "\u0167", twixt: "\u226C", twoheadleftarrow: "\u219E", twoheadrightarrow: "\u21A0", Uacute: "\xDA", uacute: "\xFA", uarr: "\u2191", Uarr: "\u219F", uArr: "\u21D1", Uarrocir: "\u2949", Ubrcy: "\u040E", ubrcy: "\u045E", Ubreve: "\u016C", ubreve: "\u016D", Ucirc: "\xDB", ucirc: "\xFB", Ucy: "\u0423", ucy: "\u0443", udarr: "\u21C5", Udblac: "\u0170", udblac: "\u0171", udhar: "\u296E", ufisht: "\u297E", Ufr: "\u{1D518}", ufr: "\u{1D532}", Ugrave: "\xD9", ugrave: "\xF9", uHar: "\u2963", uharl: "\u21BF", uharr: "\u21BE", uhblk: "\u2580", ulcorn: "\u231C", ulcorner: "\u231C", ulcrop: "\u230F", ultri: "\u25F8", Umacr: "\u016A", umacr: "\u016B", uml: "\xA8", UnderBar: "_", UnderBrace: "\u23DF", UnderBracket: "\u23B5", UnderParenthesis: "\u23DD", Union: "\u22C3", UnionPlus: "\u228E", Uogon: "\u0172", uogon: "\u0173", Uopf: "\u{1D54C}", uopf: "\u{1D566}", UpArrowBar: "\u2912", uparrow: "\u2191", UpArrow: "\u2191", Uparrow: "\u21D1", UpArrowDownArrow: "\u21C5", updownarrow: "\u2195", UpDownArrow: "\u2195", Updownarrow: "\u21D5", UpEquilibrium: "\u296E", upharpoonleft: "\u21BF", upharpoonright: "\u21BE", uplus: "\u228E", UpperLeftArrow: "\u2196", UpperRightArrow: "\u2197", upsi: "\u03C5", Upsi: "\u03D2", upsih: "\u03D2", Upsilon: "\u03A5", upsilon: "\u03C5", UpTeeArrow: "\u21A5", UpTee: "\u22A5", upuparrows: "\u21C8", urcorn: "\u231D", urcorner: "\u231D", urcrop: "\u230E", Uring: "\u016E", uring: "\u016F", urtri: "\u25F9", Uscr: "\u{1D4B0}", uscr: "\u{1D4CA}", utdot: "\u22F0", Utilde: "\u0168", utilde: "\u0169", utri: "\u25B5", utrif: "\u25B4", uuarr: "\u21C8", Uuml: "\xDC", uuml: "\xFC", uwangle: "\u29A7", vangrt: "\u299C", varepsilon: "\u03F5", varkappa: "\u03F0", varnothing: "\u2205", varphi: "\u03D5", varpi: "\u03D6", varpropto: "\u221D", varr: "\u2195", vArr: "\u21D5", varrho: "\u03F1", varsigma: "\u03C2", varsubsetneq: "\u228A\uFE00", varsubsetneqq: "\u2ACB\uFE00", varsupsetneq: "\u228B\uFE00", varsupsetneqq: "\u2ACC\uFE00", vartheta: "\u03D1", vartriangleleft: "\u22B2", vartriangleright: "\u22B3", vBar: "\u2AE8", Vbar: "\u2AEB", vBarv: "\u2AE9", Vcy: "\u0412", vcy: "\u0432", vdash: "\u22A2", vDash: "\u22A8", Vdash: "\u22A9", VDash: "\u22AB", Vdashl: "\u2AE6", veebar: "\u22BB", vee: "\u2228", Vee: "\u22C1", veeeq: "\u225A", vellip: "\u22EE", verbar: "|", Verbar: "\u2016", vert: "|", Vert: "\u2016", VerticalBar: "\u2223", VerticalLine: "|", VerticalSeparator: "\u2758", VerticalTilde: "\u2240", VeryThinSpace: "\u200A", Vfr: "\u{1D519}", vfr: "\u{1D533}", vltri: "\u22B2", vnsub: "\u2282\u20D2", vnsup: "\u2283\u20D2", Vopf: "\u{1D54D}", vopf: "\u{1D567}", vprop: "\u221D", vrtri: "\u22B3", Vscr: "\u{1D4B1}", vscr: "\u{1D4CB}", vsubnE: "\u2ACB\uFE00", vsubne: "\u228A\uFE00", vsupnE: "\u2ACC\uFE00", vsupne: "\u228B\uFE00", Vvdash: "\u22AA", vzigzag: "\u299A", Wcirc: "\u0174", wcirc: "\u0175", wedbar: "\u2A5F", wedge: "\u2227", Wedge: "\u22C0", wedgeq: "\u2259", weierp: "\u2118", Wfr: "\u{1D51A}", wfr: "\u{1D534}", Wopf: "\u{1D54E}", wopf: "\u{1D568}", wp: "\u2118", wr: "\u2240", wreath: "\u2240", Wscr: "\u{1D4B2}", wscr: "\u{1D4CC}", xcap: "\u22C2", xcirc: "\u25EF", xcup: "\u22C3", xdtri: "\u25BD", Xfr: "\u{1D51B}", xfr: "\u{1D535}", xharr: "\u27F7", xhArr: "\u27FA", Xi: "\u039E", xi: "\u03BE", xlarr: "\u27F5", xlArr: "\u27F8", xmap: "\u27FC", xnis: "\u22FB", xodot: "\u2A00", Xopf: "\u{1D54F}", xopf: "\u{1D569}", xoplus: "\u2A01", xotime: "\u2A02", xrarr: "\u27F6", xrArr: "\u27F9", Xscr: "\u{1D4B3}", xscr: "\u{1D4CD}", xsqcup: "\u2A06", xuplus: "\u2A04", xutri: "\u25B3", xvee: "\u22C1", xwedge: "\u22C0", Yacute: "\xDD", yacute: "\xFD", YAcy: "\u042F", yacy: "\u044F", Ycirc: "\u0176", ycirc: "\u0177", Ycy: "\u042B", ycy: "\u044B", yen: "\xA5", Yfr: "\u{1D51C}", yfr: "\u{1D536}", YIcy: "\u0407", yicy: "\u0457", Yopf: "\u{1D550}", yopf: "\u{1D56A}", Yscr: "\u{1D4B4}", yscr: "\u{1D4CE}", YUcy: "\u042E", yucy: "\u044E", yuml: "\xFF", Yuml: "\u0178", Zacute: "\u0179", zacute: "\u017A", Zcaron: "\u017D", zcaron: "\u017E", Zcy: "\u0417", zcy: "\u0437", Zdot: "\u017B", zdot: "\u017C", zeetrf: "\u2128", ZeroWidthSpace: "\u200B", Zeta: "\u0396", zeta: "\u03B6", zfr: "\u{1D537}", Zfr: "\u2128", ZHcy: "\u0416", zhcy: "\u0436", zigrarr: "\u21DD", zopf: "\u{1D56B}", Zopf: "\u2124", Zscr: "\u{1D4B5}", zscr: "\u{1D4CF}", zwj: "\u200D", zwnj: "\u200C" };
  }
});

// node_modules/entities/maps/legacy.json
var require_legacy = __commonJS({
  "node_modules/entities/maps/legacy.json"(exports6, module2) {
    module2.exports = { Aacute: "\xC1", aacute: "\xE1", Acirc: "\xC2", acirc: "\xE2", acute: "\xB4", AElig: "\xC6", aelig: "\xE6", Agrave: "\xC0", agrave: "\xE0", amp: "&", AMP: "&", Aring: "\xC5", aring: "\xE5", Atilde: "\xC3", atilde: "\xE3", Auml: "\xC4", auml: "\xE4", brvbar: "\xA6", Ccedil: "\xC7", ccedil: "\xE7", cedil: "\xB8", cent: "\xA2", copy: "\xA9", COPY: "\xA9", curren: "\xA4", deg: "\xB0", divide: "\xF7", Eacute: "\xC9", eacute: "\xE9", Ecirc: "\xCA", ecirc: "\xEA", Egrave: "\xC8", egrave: "\xE8", ETH: "\xD0", eth: "\xF0", Euml: "\xCB", euml: "\xEB", frac12: "\xBD", frac14: "\xBC", frac34: "\xBE", gt: ">", GT: ">", Iacute: "\xCD", iacute: "\xED", Icirc: "\xCE", icirc: "\xEE", iexcl: "\xA1", Igrave: "\xCC", igrave: "\xEC", iquest: "\xBF", Iuml: "\xCF", iuml: "\xEF", laquo: "\xAB", lt: "<", LT: "<", macr: "\xAF", micro: "\xB5", middot: "\xB7", nbsp: "\xA0", not: "\xAC", Ntilde: "\xD1", ntilde: "\xF1", Oacute: "\xD3", oacute: "\xF3", Ocirc: "\xD4", ocirc: "\xF4", Ograve: "\xD2", ograve: "\xF2", ordf: "\xAA", ordm: "\xBA", Oslash: "\xD8", oslash: "\xF8", Otilde: "\xD5", otilde: "\xF5", Ouml: "\xD6", ouml: "\xF6", para: "\xB6", plusmn: "\xB1", pound: "\xA3", quot: '"', QUOT: '"', raquo: "\xBB", reg: "\xAE", REG: "\xAE", sect: "\xA7", shy: "\xAD", sup1: "\xB9", sup2: "\xB2", sup3: "\xB3", szlig: "\xDF", THORN: "\xDE", thorn: "\xFE", times: "\xD7", Uacute: "\xDA", uacute: "\xFA", Ucirc: "\xDB", ucirc: "\xFB", Ugrave: "\xD9", ugrave: "\xF9", uml: "\xA8", Uuml: "\xDC", uuml: "\xFC", Yacute: "\xDD", yacute: "\xFD", yen: "\xA5", yuml: "\xFF" };
  }
});

// node_modules/entities/maps/xml.json
var require_xml = __commonJS({
  "node_modules/entities/maps/xml.json"(exports6, module2) {
    module2.exports = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
  }
});

// node_modules/htmlparser2/lib/Tokenizer.js
var require_Tokenizer = __commonJS({
  "node_modules/htmlparser2/lib/Tokenizer.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = Tokenizer;
    var decodeCodePoint = require_decode_codepoint();
    var entityMap = require_entities();
    var legacyMap = require_legacy();
    var xmlMap = require_xml();
    var i = 0;
    var TEXT = i++;
    var BEFORE_TAG_NAME = i++;
    var IN_TAG_NAME = i++;
    var IN_SELF_CLOSING_TAG = i++;
    var BEFORE_CLOSING_TAG_NAME = i++;
    var IN_CLOSING_TAG_NAME = i++;
    var AFTER_CLOSING_TAG_NAME = i++;
    var BEFORE_ATTRIBUTE_NAME = i++;
    var IN_ATTRIBUTE_NAME = i++;
    var AFTER_ATTRIBUTE_NAME = i++;
    var BEFORE_ATTRIBUTE_VALUE = i++;
    var IN_ATTRIBUTE_VALUE_DQ = i++;
    var IN_ATTRIBUTE_VALUE_SQ = i++;
    var IN_ATTRIBUTE_VALUE_NQ = i++;
    var BEFORE_DECLARATION = i++;
    var IN_DECLARATION = i++;
    var IN_PROCESSING_INSTRUCTION = i++;
    var BEFORE_COMMENT = i++;
    var IN_COMMENT = i++;
    var AFTER_COMMENT_1 = i++;
    var AFTER_COMMENT_2 = i++;
    var BEFORE_CDATA_1 = i++;
    var BEFORE_CDATA_2 = i++;
    var BEFORE_CDATA_3 = i++;
    var BEFORE_CDATA_4 = i++;
    var BEFORE_CDATA_5 = i++;
    var BEFORE_CDATA_6 = i++;
    var IN_CDATA = i++;
    var AFTER_CDATA_1 = i++;
    var AFTER_CDATA_2 = i++;
    var BEFORE_SPECIAL = i++;
    var BEFORE_SPECIAL_END = i++;
    var BEFORE_SCRIPT_1 = i++;
    var BEFORE_SCRIPT_2 = i++;
    var BEFORE_SCRIPT_3 = i++;
    var BEFORE_SCRIPT_4 = i++;
    var BEFORE_SCRIPT_5 = i++;
    var AFTER_SCRIPT_1 = i++;
    var AFTER_SCRIPT_2 = i++;
    var AFTER_SCRIPT_3 = i++;
    var AFTER_SCRIPT_4 = i++;
    var AFTER_SCRIPT_5 = i++;
    var BEFORE_STYLE_1 = i++;
    var BEFORE_STYLE_2 = i++;
    var BEFORE_STYLE_3 = i++;
    var BEFORE_STYLE_4 = i++;
    var AFTER_STYLE_1 = i++;
    var AFTER_STYLE_2 = i++;
    var AFTER_STYLE_3 = i++;
    var AFTER_STYLE_4 = i++;
    var BEFORE_ENTITY = i++;
    var BEFORE_NUMERIC_ENTITY = i++;
    var IN_NAMED_ENTITY = i++;
    var IN_NUMERIC_ENTITY = i++;
    var IN_HEX_ENTITY = i++;
    var j = 0;
    var SPECIAL_NONE = j++;
    var SPECIAL_SCRIPT = j++;
    var SPECIAL_STYLE = j++;
    function whitespace(c) {
      return c === " " || c === "\n" || c === "	" || c === "\f" || c === "\r";
    }
    function ifElseState(upper, SUCCESS, FAILURE) {
      var lower = upper.toLowerCase();
      if (upper === lower) {
        return function(c) {
          if (c === lower) {
            this._state = SUCCESS;
          } else {
            this._state = FAILURE;
            this._index--;
          }
        };
      } else {
        return function(c) {
          if (c === lower || c === upper) {
            this._state = SUCCESS;
          } else {
            this._state = FAILURE;
            this._index--;
          }
        };
      }
    }
    function consumeSpecialNameChar(upper, NEXT_STATE) {
      var lower = upper.toLowerCase();
      return function(c) {
        if (c === lower || c === upper) {
          this._state = NEXT_STATE;
        } else {
          this._state = IN_TAG_NAME;
          this._index--;
        }
      };
    }
    function Tokenizer(options, cbs) {
      this._state = TEXT;
      this._buffer = "";
      this._sectionStart = 0;
      this._index = 0;
      this._bufferOffset = 0;
      this._baseState = TEXT;
      this._special = SPECIAL_NONE;
      this._cbs = cbs;
      this._running = true;
      this._ended = false;
      this._xmlMode = !!(options && options.xmlMode);
      this._decodeEntities = !!(options && options.decodeEntities);
    }
    Tokenizer.prototype._stateText = function(c) {
      if (c === "<") {
        if (this._index > this._sectionStart) {
          this._cbs.ontext(this._getSection());
        }
        this._state = BEFORE_TAG_NAME;
        this._sectionStart = this._index;
      } else if (this._decodeEntities && this._special === SPECIAL_NONE && c === "&") {
        if (this._index > this._sectionStart) {
          this._cbs.ontext(this._getSection());
        }
        this._baseState = TEXT;
        this._state = BEFORE_ENTITY;
        this._sectionStart = this._index;
      }
    };
    Tokenizer.prototype._stateBeforeTagName = function(c) {
      if (c === "/") {
        this._state = BEFORE_CLOSING_TAG_NAME;
      } else if (c === "<") {
        this._cbs.ontext(this._getSection());
        this._sectionStart = this._index;
      } else if (c === ">" || this._special !== SPECIAL_NONE || whitespace(c)) {
        this._state = TEXT;
      } else if (c === "!") {
        this._state = BEFORE_DECLARATION;
        this._sectionStart = this._index + 1;
      } else if (c === "?") {
        this._state = IN_PROCESSING_INSTRUCTION;
        this._sectionStart = this._index + 1;
      } else {
        this._state = !this._xmlMode && (c === "s" || c === "S") ? BEFORE_SPECIAL : IN_TAG_NAME;
        this._sectionStart = this._index;
      }
    };
    Tokenizer.prototype._stateInTagName = function(c) {
      if (c === "/" || c === ">" || whitespace(c)) {
        this._emitToken("onopentagname");
        this._state = BEFORE_ATTRIBUTE_NAME;
        this._index--;
      }
    };
    Tokenizer.prototype._stateBeforeCloseingTagName = function(c) {
      if (whitespace(c)) ;
      else if (c === ">") {
        this._state = TEXT;
      } else if (this._special !== SPECIAL_NONE) {
        if (c === "s" || c === "S") {
          this._state = BEFORE_SPECIAL_END;
        } else {
          this._state = TEXT;
          this._index--;
        }
      } else {
        this._state = IN_CLOSING_TAG_NAME;
        this._sectionStart = this._index;
      }
    };
    Tokenizer.prototype._stateInCloseingTagName = function(c) {
      if (c === ">" || whitespace(c)) {
        this._emitToken("onclosetag");
        this._state = AFTER_CLOSING_TAG_NAME;
        this._index--;
      }
    };
    Tokenizer.prototype._stateAfterCloseingTagName = function(c) {
      if (c === ">") {
        this._state = TEXT;
        this._sectionStart = this._index + 1;
      }
    };
    Tokenizer.prototype._stateBeforeAttributeName = function(c) {
      if (c === ">") {
        this._cbs.onopentagend();
        this._state = TEXT;
        this._sectionStart = this._index + 1;
      } else if (c === "/") {
        this._state = IN_SELF_CLOSING_TAG;
      } else if (!whitespace(c)) {
        this._state = IN_ATTRIBUTE_NAME;
        this._sectionStart = this._index;
      }
    };
    Tokenizer.prototype._stateInSelfClosingTag = function(c) {
      if (c === ">") {
        this._cbs.onselfclosingtag();
        this._state = TEXT;
        this._sectionStart = this._index + 1;
      } else if (!whitespace(c)) {
        this._state = BEFORE_ATTRIBUTE_NAME;
        this._index--;
      }
    };
    Tokenizer.prototype._stateInAttributeName = function(c) {
      if (c === "=" || c === "/" || c === ">" || whitespace(c)) {
        this._cbs.onattribname(this._getSection());
        this._sectionStart = -1;
        this._state = AFTER_ATTRIBUTE_NAME;
        this._index--;
      }
    };
    Tokenizer.prototype._stateAfterAttributeName = function(c) {
      if (c === "=") {
        this._state = BEFORE_ATTRIBUTE_VALUE;
      } else if (c === "/" || c === ">") {
        this._cbs.onattribend();
        this._state = BEFORE_ATTRIBUTE_NAME;
        this._index--;
      } else if (!whitespace(c)) {
        this._cbs.onattribend();
        this._state = IN_ATTRIBUTE_NAME;
        this._sectionStart = this._index;
      }
    };
    Tokenizer.prototype._stateBeforeAttributeValue = function(c) {
      if (c === '"') {
        this._state = IN_ATTRIBUTE_VALUE_DQ;
        this._sectionStart = this._index + 1;
      } else if (c === "'") {
        this._state = IN_ATTRIBUTE_VALUE_SQ;
        this._sectionStart = this._index + 1;
      } else if (!whitespace(c)) {
        this._state = IN_ATTRIBUTE_VALUE_NQ;
        this._sectionStart = this._index;
        this._index--;
      }
    };
    Tokenizer.prototype._stateInAttributeValueDoubleQuotes = function(c) {
      if (c === '"') {
        this._emitToken("onattribdata");
        this._cbs.onattribend();
        this._state = BEFORE_ATTRIBUTE_NAME;
      } else if (this._decodeEntities && c === "&") {
        this._emitToken("onattribdata");
        this._baseState = this._state;
        this._state = BEFORE_ENTITY;
        this._sectionStart = this._index;
      }
    };
    Tokenizer.prototype._stateInAttributeValueSingleQuotes = function(c) {
      if (c === "'") {
        this._emitToken("onattribdata");
        this._cbs.onattribend();
        this._state = BEFORE_ATTRIBUTE_NAME;
      } else if (this._decodeEntities && c === "&") {
        this._emitToken("onattribdata");
        this._baseState = this._state;
        this._state = BEFORE_ENTITY;
        this._sectionStart = this._index;
      }
    };
    Tokenizer.prototype._stateInAttributeValueNoQuotes = function(c) {
      if (whitespace(c) || c === ">") {
        this._emitToken("onattribdata");
        this._cbs.onattribend();
        this._state = BEFORE_ATTRIBUTE_NAME;
        this._index--;
      } else if (this._decodeEntities && c === "&") {
        this._emitToken("onattribdata");
        this._baseState = this._state;
        this._state = BEFORE_ENTITY;
        this._sectionStart = this._index;
      }
    };
    Tokenizer.prototype._stateBeforeDeclaration = function(c) {
      this._state = c === "[" ? BEFORE_CDATA_1 : c === "-" ? BEFORE_COMMENT : IN_DECLARATION;
    };
    Tokenizer.prototype._stateInDeclaration = function(c) {
      if (c === ">") {
        this._cbs.ondeclaration(this._getSection());
        this._state = TEXT;
        this._sectionStart = this._index + 1;
      }
    };
    Tokenizer.prototype._stateInProcessingInstruction = function(c) {
      if (c === ">") {
        this._cbs.onprocessinginstruction(this._getSection());
        this._state = TEXT;
        this._sectionStart = this._index + 1;
      }
    };
    Tokenizer.prototype._stateBeforeComment = function(c) {
      if (c === "-") {
        this._state = IN_COMMENT;
        this._sectionStart = this._index + 1;
      } else {
        this._state = IN_DECLARATION;
      }
    };
    Tokenizer.prototype._stateInComment = function(c) {
      if (c === "-") this._state = AFTER_COMMENT_1;
    };
    Tokenizer.prototype._stateAfterComment1 = function(c) {
      if (c === "-") {
        this._state = AFTER_COMMENT_2;
      } else {
        this._state = IN_COMMENT;
      }
    };
    Tokenizer.prototype._stateAfterComment2 = function(c) {
      if (c === ">") {
        this._cbs.oncomment(
          this._buffer.substring(this._sectionStart, this._index - 2)
        );
        this._state = TEXT;
        this._sectionStart = this._index + 1;
      } else if (c !== "-") {
        this._state = IN_COMMENT;
      }
    };
    Tokenizer.prototype._stateBeforeCdata1 = ifElseState(
      "C",
      BEFORE_CDATA_2,
      IN_DECLARATION
    );
    Tokenizer.prototype._stateBeforeCdata2 = ifElseState(
      "D",
      BEFORE_CDATA_3,
      IN_DECLARATION
    );
    Tokenizer.prototype._stateBeforeCdata3 = ifElseState(
      "A",
      BEFORE_CDATA_4,
      IN_DECLARATION
    );
    Tokenizer.prototype._stateBeforeCdata4 = ifElseState(
      "T",
      BEFORE_CDATA_5,
      IN_DECLARATION
    );
    Tokenizer.prototype._stateBeforeCdata5 = ifElseState(
      "A",
      BEFORE_CDATA_6,
      IN_DECLARATION
    );
    Tokenizer.prototype._stateBeforeCdata6 = function(c) {
      if (c === "[") {
        this._state = IN_CDATA;
        this._sectionStart = this._index + 1;
      } else {
        this._state = IN_DECLARATION;
        this._index--;
      }
    };
    Tokenizer.prototype._stateInCdata = function(c) {
      if (c === "]") this._state = AFTER_CDATA_1;
    };
    Tokenizer.prototype._stateAfterCdata1 = function(c) {
      if (c === "]") this._state = AFTER_CDATA_2;
      else this._state = IN_CDATA;
    };
    Tokenizer.prototype._stateAfterCdata2 = function(c) {
      if (c === ">") {
        this._cbs.oncdata(
          this._buffer.substring(this._sectionStart, this._index - 2)
        );
        this._state = TEXT;
        this._sectionStart = this._index + 1;
      } else if (c !== "]") {
        this._state = IN_CDATA;
      }
    };
    Tokenizer.prototype._stateBeforeSpecial = function(c) {
      if (c === "c" || c === "C") {
        this._state = BEFORE_SCRIPT_1;
      } else if (c === "t" || c === "T") {
        this._state = BEFORE_STYLE_1;
      } else {
        this._state = IN_TAG_NAME;
        this._index--;
      }
    };
    Tokenizer.prototype._stateBeforeSpecialEnd = function(c) {
      if (this._special === SPECIAL_SCRIPT && (c === "c" || c === "C")) {
        this._state = AFTER_SCRIPT_1;
      } else if (this._special === SPECIAL_STYLE && (c === "t" || c === "T")) {
        this._state = AFTER_STYLE_1;
      } else this._state = TEXT;
    };
    Tokenizer.prototype._stateBeforeScript1 = consumeSpecialNameChar(
      "R",
      BEFORE_SCRIPT_2
    );
    Tokenizer.prototype._stateBeforeScript2 = consumeSpecialNameChar(
      "I",
      BEFORE_SCRIPT_3
    );
    Tokenizer.prototype._stateBeforeScript3 = consumeSpecialNameChar(
      "P",
      BEFORE_SCRIPT_4
    );
    Tokenizer.prototype._stateBeforeScript4 = consumeSpecialNameChar(
      "T",
      BEFORE_SCRIPT_5
    );
    Tokenizer.prototype._stateBeforeScript5 = function(c) {
      if (c === "/" || c === ">" || whitespace(c)) {
        this._special = SPECIAL_SCRIPT;
      }
      this._state = IN_TAG_NAME;
      this._index--;
    };
    Tokenizer.prototype._stateAfterScript1 = ifElseState("R", AFTER_SCRIPT_2, TEXT);
    Tokenizer.prototype._stateAfterScript2 = ifElseState("I", AFTER_SCRIPT_3, TEXT);
    Tokenizer.prototype._stateAfterScript3 = ifElseState("P", AFTER_SCRIPT_4, TEXT);
    Tokenizer.prototype._stateAfterScript4 = ifElseState("T", AFTER_SCRIPT_5, TEXT);
    Tokenizer.prototype._stateAfterScript5 = function(c) {
      if (c === ">" || whitespace(c)) {
        this._special = SPECIAL_NONE;
        this._state = IN_CLOSING_TAG_NAME;
        this._sectionStart = this._index - 6;
        this._index--;
      } else this._state = TEXT;
    };
    Tokenizer.prototype._stateBeforeStyle1 = consumeSpecialNameChar(
      "Y",
      BEFORE_STYLE_2
    );
    Tokenizer.prototype._stateBeforeStyle2 = consumeSpecialNameChar(
      "L",
      BEFORE_STYLE_3
    );
    Tokenizer.prototype._stateBeforeStyle3 = consumeSpecialNameChar(
      "E",
      BEFORE_STYLE_4
    );
    Tokenizer.prototype._stateBeforeStyle4 = function(c) {
      if (c === "/" || c === ">" || whitespace(c)) {
        this._special = SPECIAL_STYLE;
      }
      this._state = IN_TAG_NAME;
      this._index--;
    };
    Tokenizer.prototype._stateAfterStyle1 = ifElseState("Y", AFTER_STYLE_2, TEXT);
    Tokenizer.prototype._stateAfterStyle2 = ifElseState("L", AFTER_STYLE_3, TEXT);
    Tokenizer.prototype._stateAfterStyle3 = ifElseState("E", AFTER_STYLE_4, TEXT);
    Tokenizer.prototype._stateAfterStyle4 = function(c) {
      if (c === ">" || whitespace(c)) {
        this._special = SPECIAL_NONE;
        this._state = IN_CLOSING_TAG_NAME;
        this._sectionStart = this._index - 5;
        this._index--;
      } else this._state = TEXT;
    };
    Tokenizer.prototype._stateBeforeEntity = ifElseState(
      "#",
      BEFORE_NUMERIC_ENTITY,
      IN_NAMED_ENTITY
    );
    Tokenizer.prototype._stateBeforeNumericEntity = ifElseState(
      "X",
      IN_HEX_ENTITY,
      IN_NUMERIC_ENTITY
    );
    Tokenizer.prototype._parseNamedEntityStrict = function() {
      if (this._sectionStart + 1 < this._index) {
        var entity = this._buffer.substring(
          this._sectionStart + 1,
          this._index
        ), map = this._xmlMode ? xmlMap : entityMap;
        if (map.hasOwnProperty(entity)) {
          this._emitPartial(map[entity]);
          this._sectionStart = this._index + 1;
        }
      }
    };
    Tokenizer.prototype._parseLegacyEntity = function() {
      var start = this._sectionStart + 1, limit = this._index - start;
      if (limit > 6) limit = 6;
      while (limit >= 2) {
        var entity = this._buffer.substr(start, limit);
        if (legacyMap.hasOwnProperty(entity)) {
          this._emitPartial(legacyMap[entity]);
          this._sectionStart += limit + 1;
          return;
        } else {
          limit--;
        }
      }
    };
    Tokenizer.prototype._stateInNamedEntity = function(c) {
      if (c === ";") {
        this._parseNamedEntityStrict();
        if (this._sectionStart + 1 < this._index && !this._xmlMode) {
          this._parseLegacyEntity();
        }
        this._state = this._baseState;
      } else if ((c < "a" || c > "z") && (c < "A" || c > "Z") && (c < "0" || c > "9")) {
        if (this._xmlMode) ;
        else if (this._sectionStart + 1 === this._index) ;
        else if (this._baseState !== TEXT) {
          if (c !== "=") {
            this._parseNamedEntityStrict();
          }
        } else {
          this._parseLegacyEntity();
        }
        this._state = this._baseState;
        this._index--;
      }
    };
    Tokenizer.prototype._decodeNumericEntity = function(offset, base) {
      var sectionStart = this._sectionStart + offset;
      if (sectionStart !== this._index) {
        var entity = this._buffer.substring(sectionStart, this._index);
        var parsed = parseInt(entity, base);
        this._emitPartial(decodeCodePoint(parsed));
        this._sectionStart = this._index;
      } else {
        this._sectionStart--;
      }
      this._state = this._baseState;
    };
    Tokenizer.prototype._stateInNumericEntity = function(c) {
      if (c === ";") {
        this._decodeNumericEntity(2, 10);
        this._sectionStart++;
      } else if (c < "0" || c > "9") {
        if (!this._xmlMode) {
          this._decodeNumericEntity(2, 10);
        } else {
          this._state = this._baseState;
        }
        this._index--;
      }
    };
    Tokenizer.prototype._stateInHexEntity = function(c) {
      if (c === ";") {
        this._decodeNumericEntity(3, 16);
        this._sectionStart++;
      } else if ((c < "a" || c > "f") && (c < "A" || c > "F") && (c < "0" || c > "9")) {
        if (!this._xmlMode) {
          this._decodeNumericEntity(3, 16);
        } else {
          this._state = this._baseState;
        }
        this._index--;
      }
    };
    Tokenizer.prototype._cleanup = function() {
      if (this._sectionStart < 0) {
        this._buffer = "";
        this._bufferOffset += this._index;
        this._index = 0;
      } else if (this._running) {
        if (this._state === TEXT) {
          if (this._sectionStart !== this._index) {
            this._cbs.ontext(this._buffer.substr(this._sectionStart));
          }
          this._buffer = "";
          this._bufferOffset += this._index;
          this._index = 0;
        } else if (this._sectionStart === this._index) {
          this._buffer = "";
          this._bufferOffset += this._index;
          this._index = 0;
        } else {
          this._buffer = this._buffer.substr(this._sectionStart);
          this._index -= this._sectionStart;
          this._bufferOffset += this._sectionStart;
        }
        this._sectionStart = 0;
      }
    };
    Tokenizer.prototype.write = function(chunk) {
      if (this._ended) this._cbs.onerror(Error(".write() after done!"));
      this._buffer += chunk;
      this._parse();
    };
    Tokenizer.prototype._parse = function() {
      while (this._index < this._buffer.length && this._running) {
        var c = this._buffer.charAt(this._index);
        if (this._state === TEXT) {
          this._stateText(c);
        } else if (this._state === BEFORE_TAG_NAME) {
          this._stateBeforeTagName(c);
        } else if (this._state === IN_TAG_NAME) {
          this._stateInTagName(c);
        } else if (this._state === BEFORE_CLOSING_TAG_NAME) {
          this._stateBeforeCloseingTagName(c);
        } else if (this._state === IN_CLOSING_TAG_NAME) {
          this._stateInCloseingTagName(c);
        } else if (this._state === AFTER_CLOSING_TAG_NAME) {
          this._stateAfterCloseingTagName(c);
        } else if (this._state === IN_SELF_CLOSING_TAG) {
          this._stateInSelfClosingTag(c);
        } else if (this._state === BEFORE_ATTRIBUTE_NAME) {
          this._stateBeforeAttributeName(c);
        } else if (this._state === IN_ATTRIBUTE_NAME) {
          this._stateInAttributeName(c);
        } else if (this._state === AFTER_ATTRIBUTE_NAME) {
          this._stateAfterAttributeName(c);
        } else if (this._state === BEFORE_ATTRIBUTE_VALUE) {
          this._stateBeforeAttributeValue(c);
        } else if (this._state === IN_ATTRIBUTE_VALUE_DQ) {
          this._stateInAttributeValueDoubleQuotes(c);
        } else if (this._state === IN_ATTRIBUTE_VALUE_SQ) {
          this._stateInAttributeValueSingleQuotes(c);
        } else if (this._state === IN_ATTRIBUTE_VALUE_NQ) {
          this._stateInAttributeValueNoQuotes(c);
        } else if (this._state === BEFORE_DECLARATION) {
          this._stateBeforeDeclaration(c);
        } else if (this._state === IN_DECLARATION) {
          this._stateInDeclaration(c);
        } else if (this._state === IN_PROCESSING_INSTRUCTION) {
          this._stateInProcessingInstruction(c);
        } else if (this._state === BEFORE_COMMENT) {
          this._stateBeforeComment(c);
        } else if (this._state === IN_COMMENT) {
          this._stateInComment(c);
        } else if (this._state === AFTER_COMMENT_1) {
          this._stateAfterComment1(c);
        } else if (this._state === AFTER_COMMENT_2) {
          this._stateAfterComment2(c);
        } else if (this._state === BEFORE_CDATA_1) {
          this._stateBeforeCdata1(c);
        } else if (this._state === BEFORE_CDATA_2) {
          this._stateBeforeCdata2(c);
        } else if (this._state === BEFORE_CDATA_3) {
          this._stateBeforeCdata3(c);
        } else if (this._state === BEFORE_CDATA_4) {
          this._stateBeforeCdata4(c);
        } else if (this._state === BEFORE_CDATA_5) {
          this._stateBeforeCdata5(c);
        } else if (this._state === BEFORE_CDATA_6) {
          this._stateBeforeCdata6(c);
        } else if (this._state === IN_CDATA) {
          this._stateInCdata(c);
        } else if (this._state === AFTER_CDATA_1) {
          this._stateAfterCdata1(c);
        } else if (this._state === AFTER_CDATA_2) {
          this._stateAfterCdata2(c);
        } else if (this._state === BEFORE_SPECIAL) {
          this._stateBeforeSpecial(c);
        } else if (this._state === BEFORE_SPECIAL_END) {
          this._stateBeforeSpecialEnd(c);
        } else if (this._state === BEFORE_SCRIPT_1) {
          this._stateBeforeScript1(c);
        } else if (this._state === BEFORE_SCRIPT_2) {
          this._stateBeforeScript2(c);
        } else if (this._state === BEFORE_SCRIPT_3) {
          this._stateBeforeScript3(c);
        } else if (this._state === BEFORE_SCRIPT_4) {
          this._stateBeforeScript4(c);
        } else if (this._state === BEFORE_SCRIPT_5) {
          this._stateBeforeScript5(c);
        } else if (this._state === AFTER_SCRIPT_1) {
          this._stateAfterScript1(c);
        } else if (this._state === AFTER_SCRIPT_2) {
          this._stateAfterScript2(c);
        } else if (this._state === AFTER_SCRIPT_3) {
          this._stateAfterScript3(c);
        } else if (this._state === AFTER_SCRIPT_4) {
          this._stateAfterScript4(c);
        } else if (this._state === AFTER_SCRIPT_5) {
          this._stateAfterScript5(c);
        } else if (this._state === BEFORE_STYLE_1) {
          this._stateBeforeStyle1(c);
        } else if (this._state === BEFORE_STYLE_2) {
          this._stateBeforeStyle2(c);
        } else if (this._state === BEFORE_STYLE_3) {
          this._stateBeforeStyle3(c);
        } else if (this._state === BEFORE_STYLE_4) {
          this._stateBeforeStyle4(c);
        } else if (this._state === AFTER_STYLE_1) {
          this._stateAfterStyle1(c);
        } else if (this._state === AFTER_STYLE_2) {
          this._stateAfterStyle2(c);
        } else if (this._state === AFTER_STYLE_3) {
          this._stateAfterStyle3(c);
        } else if (this._state === AFTER_STYLE_4) {
          this._stateAfterStyle4(c);
        } else if (this._state === BEFORE_ENTITY) {
          this._stateBeforeEntity(c);
        } else if (this._state === BEFORE_NUMERIC_ENTITY) {
          this._stateBeforeNumericEntity(c);
        } else if (this._state === IN_NAMED_ENTITY) {
          this._stateInNamedEntity(c);
        } else if (this._state === IN_NUMERIC_ENTITY) {
          this._stateInNumericEntity(c);
        } else if (this._state === IN_HEX_ENTITY) {
          this._stateInHexEntity(c);
        } else {
          this._cbs.onerror(Error("unknown _state"), this._state);
        }
        this._index++;
      }
      this._cleanup();
    };
    Tokenizer.prototype.pause = function() {
      this._running = false;
    };
    Tokenizer.prototype.resume = function() {
      this._running = true;
      if (this._index < this._buffer.length) {
        this._parse();
      }
      if (this._ended) {
        this._finish();
      }
    };
    Tokenizer.prototype.end = function(chunk) {
      if (this._ended) this._cbs.onerror(Error(".end() after done!"));
      if (chunk) this.write(chunk);
      this._ended = true;
      if (this._running) this._finish();
    };
    Tokenizer.prototype._finish = function() {
      if (this._sectionStart < this._index) {
        this._handleTrailingData();
      }
      this._cbs.onend();
    };
    Tokenizer.prototype._handleTrailingData = function() {
      var data = this._buffer.substr(this._sectionStart);
      if (this._state === IN_CDATA || this._state === AFTER_CDATA_1 || this._state === AFTER_CDATA_2) {
        this._cbs.oncdata(data);
      } else if (this._state === IN_COMMENT || this._state === AFTER_COMMENT_1 || this._state === AFTER_COMMENT_2) {
        this._cbs.oncomment(data);
      } else if (this._state === IN_NAMED_ENTITY && !this._xmlMode) {
        this._parseLegacyEntity();
        if (this._sectionStart < this._index) {
          this._state = this._baseState;
          this._handleTrailingData();
        }
      } else if (this._state === IN_NUMERIC_ENTITY && !this._xmlMode) {
        this._decodeNumericEntity(2, 10);
        if (this._sectionStart < this._index) {
          this._state = this._baseState;
          this._handleTrailingData();
        }
      } else if (this._state === IN_HEX_ENTITY && !this._xmlMode) {
        this._decodeNumericEntity(3, 16);
        if (this._sectionStart < this._index) {
          this._state = this._baseState;
          this._handleTrailingData();
        }
      } else if (this._state !== IN_TAG_NAME && this._state !== BEFORE_ATTRIBUTE_NAME && this._state !== BEFORE_ATTRIBUTE_VALUE && this._state !== AFTER_ATTRIBUTE_NAME && this._state !== IN_ATTRIBUTE_NAME && this._state !== IN_ATTRIBUTE_VALUE_SQ && this._state !== IN_ATTRIBUTE_VALUE_DQ && this._state !== IN_ATTRIBUTE_VALUE_NQ && this._state !== IN_CLOSING_TAG_NAME) {
        this._cbs.ontext(data);
      }
    };
    Tokenizer.prototype.reset = function() {
      Tokenizer.call(
        this,
        { xmlMode: this._xmlMode, decodeEntities: this._decodeEntities },
        this._cbs
      );
    };
    Tokenizer.prototype.getAbsoluteIndex = function() {
      return this._bufferOffset + this._index;
    };
    Tokenizer.prototype._getSection = function() {
      return this._buffer.substring(this._sectionStart, this._index);
    };
    Tokenizer.prototype._emitToken = function(name2) {
      this._cbs[name2](this._getSection());
      this._sectionStart = -1;
    };
    Tokenizer.prototype._emitPartial = function(value) {
      if (this._baseState !== TEXT) {
        this._cbs.onattribdata(value);
      } else {
        this._cbs.ontext(value);
      }
    };
  }
});

// node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS({
  "node_modules/inherits/inherits_browser.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    if (typeof Object.create === "function") {
      module2.exports = function inherits(ctor, superCtor) {
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
      module2.exports = function inherits(ctor, superCtor) {
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
  exports$12.once = once3;
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
  EventEmitter2.prototype.emit = function emit2(type) {
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
      var listeners2 = arrayClone(handler, len);
      for (var i = 0; i < len; ++i) ReflectApply(listeners2[i], this, args);
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
  EventEmitter2.prototype.addListener = function addListener2(type, listener) {
    return _addListener(this, type, listener, false);
  };
  EventEmitter2.prototype.on = EventEmitter2.prototype.addListener;
  EventEmitter2.prototype.prependListener = function prependListener2(type, listener) {
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
  EventEmitter2.prototype.once = function once4(type, listener) {
    checkListener(listener);
    this.on(type, _onceWrap(this, type, listener));
    return this;
  };
  EventEmitter2.prototype.prependOnceListener = function prependOnceListener2(type, listener) {
    checkListener(listener);
    this.prependListener(type, _onceWrap(this, type, listener));
    return this;
  };
  EventEmitter2.prototype.removeListener = function removeListener2(type, listener) {
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
  EventEmitter2.prototype.removeAllListeners = function removeAllListeners2(type) {
    var listeners2, events, i;
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
    listeners2 = events[type];
    if (typeof listeners2 === "function") {
      this.removeListener(type, listeners2);
    } else if (listeners2 !== void 0) {
      for (i = listeners2.length - 1; i >= 0; i--) {
        this.removeListener(type, listeners2[i]);
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
  EventEmitter2.prototype.listeners = function listeners2(type) {
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
  function once3(emitter, name2) {
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
      let finished = false;
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
          if (finished) {
            return createIterResult(void 0, true);
          }
          return new Promise((resolve, reject) => unconsumedPromises.push({ resolve, reject }));
        },
        async return() {
          emitter.removeListener(event, eventHandler);
          emitter.removeListener("error", errorHandler);
          finished = true;
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
        finished = true;
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

// node_modules/htmlparser2/lib/Parser.js
var require_Parser = __commonJS({
  "node_modules/htmlparser2/lib/Parser.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var Tokenizer = require_Tokenizer();
    var formTags = {
      input: true,
      option: true,
      optgroup: true,
      select: true,
      button: true,
      datalist: true,
      textarea: true
    };
    var openImpliesClose = {
      tr: { tr: true, th: true, td: true },
      th: { th: true },
      td: { thead: true, th: true, td: true },
      body: { head: true, link: true, script: true },
      li: { li: true },
      p: { p: true },
      h1: { p: true },
      h2: { p: true },
      h3: { p: true },
      h4: { p: true },
      h5: { p: true },
      h6: { p: true },
      select: formTags,
      input: formTags,
      output: formTags,
      button: formTags,
      datalist: formTags,
      textarea: formTags,
      option: { option: true },
      optgroup: { optgroup: true }
    };
    var voidElements = {
      __proto__: null,
      area: true,
      base: true,
      basefont: true,
      br: true,
      col: true,
      command: true,
      embed: true,
      frame: true,
      hr: true,
      img: true,
      input: true,
      isindex: true,
      keygen: true,
      link: true,
      meta: true,
      param: true,
      source: true,
      track: true,
      wbr: true
    };
    var foreignContextElements = {
      __proto__: null,
      math: true,
      svg: true
    };
    var htmlIntegrationElements = {
      __proto__: null,
      mi: true,
      mo: true,
      mn: true,
      ms: true,
      mtext: true,
      "annotation-xml": true,
      foreignObject: true,
      desc: true,
      title: true
    };
    var re_nameEnd = /\s|\//;
    function Parser(cbs, options) {
      this._options = options || {};
      this._cbs = cbs || {};
      this._tagname = "";
      this._attribname = "";
      this._attribvalue = "";
      this._attribs = null;
      this._stack = [];
      this._foreignContext = [];
      this.startIndex = 0;
      this.endIndex = null;
      this._lowerCaseTagNames = "lowerCaseTags" in this._options ? !!this._options.lowerCaseTags : !this._options.xmlMode;
      this._lowerCaseAttributeNames = "lowerCaseAttributeNames" in this._options ? !!this._options.lowerCaseAttributeNames : !this._options.xmlMode;
      if (this._options.Tokenizer) {
        Tokenizer = this._options.Tokenizer;
      }
      this._tokenizer = new Tokenizer(this._options, this);
      if (this._cbs.onparserinit) this._cbs.onparserinit(this);
    }
    require_inherits_browser()(Parser, (init_events(), __toCommonJS(events_exports)).EventEmitter);
    Parser.prototype._updatePosition = function(initialOffset) {
      if (this.endIndex === null) {
        if (this._tokenizer._sectionStart <= initialOffset) {
          this.startIndex = 0;
        } else {
          this.startIndex = this._tokenizer._sectionStart - initialOffset;
        }
      } else this.startIndex = this.endIndex + 1;
      this.endIndex = this._tokenizer.getAbsoluteIndex();
    };
    Parser.prototype.ontext = function(data) {
      this._updatePosition(1);
      this.endIndex--;
      if (this._cbs.ontext) this._cbs.ontext(data);
    };
    Parser.prototype.onopentagname = function(name2) {
      if (this._lowerCaseTagNames) {
        name2 = name2.toLowerCase();
      }
      this._tagname = name2;
      if (!this._options.xmlMode && name2 in openImpliesClose) {
        for (var el; (el = this._stack[this._stack.length - 1]) in openImpliesClose[name2]; this.onclosetag(el)) ;
      }
      if (this._options.xmlMode || !(name2 in voidElements)) {
        this._stack.push(name2);
        if (name2 in foreignContextElements) this._foreignContext.push(true);
        else if (name2 in htmlIntegrationElements)
          this._foreignContext.push(false);
      }
      if (this._cbs.onopentagname) this._cbs.onopentagname(name2);
      if (this._cbs.onopentag) this._attribs = {};
    };
    Parser.prototype.onopentagend = function() {
      this._updatePosition(1);
      if (this._attribs) {
        if (this._cbs.onopentag)
          this._cbs.onopentag(this._tagname, this._attribs);
        this._attribs = null;
      }
      if (!this._options.xmlMode && this._cbs.onclosetag && this._tagname in voidElements) {
        this._cbs.onclosetag(this._tagname);
      }
      this._tagname = "";
    };
    Parser.prototype.onclosetag = function(name2) {
      this._updatePosition(1);
      if (this._lowerCaseTagNames) {
        name2 = name2.toLowerCase();
      }
      if (name2 in foreignContextElements || name2 in htmlIntegrationElements) {
        this._foreignContext.pop();
      }
      if (this._stack.length && (!(name2 in voidElements) || this._options.xmlMode)) {
        var pos = this._stack.lastIndexOf(name2);
        if (pos !== -1) {
          if (this._cbs.onclosetag) {
            pos = this._stack.length - pos;
            while (pos--) this._cbs.onclosetag(this._stack.pop());
          } else this._stack.length = pos;
        } else if (name2 === "p" && !this._options.xmlMode) {
          this.onopentagname(name2);
          this._closeCurrentTag();
        }
      } else if (!this._options.xmlMode && (name2 === "br" || name2 === "p")) {
        this.onopentagname(name2);
        this._closeCurrentTag();
      }
    };
    Parser.prototype.onselfclosingtag = function() {
      if (this._options.xmlMode || this._options.recognizeSelfClosing || this._foreignContext[this._foreignContext.length - 1]) {
        this._closeCurrentTag();
      } else {
        this.onopentagend();
      }
    };
    Parser.prototype._closeCurrentTag = function() {
      var name2 = this._tagname;
      this.onopentagend();
      if (this._stack[this._stack.length - 1] === name2) {
        if (this._cbs.onclosetag) {
          this._cbs.onclosetag(name2);
        }
        this._stack.pop();
      }
    };
    Parser.prototype.onattribname = function(name2) {
      if (this._lowerCaseAttributeNames) {
        name2 = name2.toLowerCase();
      }
      this._attribname = name2;
    };
    Parser.prototype.onattribdata = function(value) {
      this._attribvalue += value;
    };
    Parser.prototype.onattribend = function() {
      if (this._cbs.onattribute)
        this._cbs.onattribute(this._attribname, this._attribvalue);
      if (this._attribs && !Object.prototype.hasOwnProperty.call(this._attribs, this._attribname)) {
        this._attribs[this._attribname] = this._attribvalue;
      }
      this._attribname = "";
      this._attribvalue = "";
    };
    Parser.prototype._getInstructionName = function(value) {
      var idx = value.search(re_nameEnd), name2 = idx < 0 ? value : value.substr(0, idx);
      if (this._lowerCaseTagNames) {
        name2 = name2.toLowerCase();
      }
      return name2;
    };
    Parser.prototype.ondeclaration = function(value) {
      if (this._cbs.onprocessinginstruction) {
        var name2 = this._getInstructionName(value);
        this._cbs.onprocessinginstruction("!" + name2, "!" + value);
      }
    };
    Parser.prototype.onprocessinginstruction = function(value) {
      if (this._cbs.onprocessinginstruction) {
        var name2 = this._getInstructionName(value);
        this._cbs.onprocessinginstruction("?" + name2, "?" + value);
      }
    };
    Parser.prototype.oncomment = function(value) {
      this._updatePosition(4);
      if (this._cbs.oncomment) this._cbs.oncomment(value);
      if (this._cbs.oncommentend) this._cbs.oncommentend();
    };
    Parser.prototype.oncdata = function(value) {
      this._updatePosition(1);
      if (this._options.xmlMode || this._options.recognizeCDATA) {
        if (this._cbs.oncdatastart) this._cbs.oncdatastart();
        if (this._cbs.ontext) this._cbs.ontext(value);
        if (this._cbs.oncdataend) this._cbs.oncdataend();
      } else {
        this.oncomment("[CDATA[" + value + "]]");
      }
    };
    Parser.prototype.onerror = function(err) {
      if (this._cbs.onerror) this._cbs.onerror(err);
    };
    Parser.prototype.onend = function() {
      if (this._cbs.onclosetag) {
        for (var i = this._stack.length; i > 0; this._cbs.onclosetag(this._stack[--i])) ;
      }
      if (this._cbs.onend) this._cbs.onend();
    };
    Parser.prototype.reset = function() {
      if (this._cbs.onreset) this._cbs.onreset();
      this._tokenizer.reset();
      this._tagname = "";
      this._attribname = "";
      this._attribs = null;
      this._stack = [];
      if (this._cbs.onparserinit) this._cbs.onparserinit(this);
    };
    Parser.prototype.parseComplete = function(data) {
      this.reset();
      this.end(data);
    };
    Parser.prototype.write = function(chunk) {
      this._tokenizer.write(chunk);
    };
    Parser.prototype.end = function(chunk) {
      this._tokenizer.end(chunk);
    };
    Parser.prototype.pause = function() {
      this._tokenizer.pause();
    };
    Parser.prototype.resume = function() {
      this._tokenizer.resume();
    };
    Parser.prototype.parseChunk = Parser.prototype.write;
    Parser.prototype.done = Parser.prototype.end;
    module2.exports = Parser;
  }
});

// node_modules/domelementtype/index.js
var require_domelementtype = __commonJS({
  "node_modules/domelementtype/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = {
      Text: "text",
      //Text
      Directive: "directive",
      //<? ... ?>
      Comment: "comment",
      //<!-- ... -->
      Script: "script",
      //<script> tags
      Style: "style",
      //<style> tags
      Tag: "tag",
      //Any tag
      CDATA: "cdata",
      //<![CDATA[ ... ]]>
      Doctype: "doctype",
      isTag: function(elem) {
        return elem.type === "tag" || elem.type === "script" || elem.type === "style";
      }
    };
  }
});

// node_modules/domhandler/lib/node.js
var require_node = __commonJS({
  "node_modules/domhandler/lib/node.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var NodePrototype = module2.exports = {
      get firstChild() {
        var children = this.children;
        return children && children[0] || null;
      },
      get lastChild() {
        var children = this.children;
        return children && children[children.length - 1] || null;
      },
      get nodeType() {
        return nodeTypes[this.type] || nodeTypes.element;
      }
    };
    var domLvl1 = {
      tagName: "name",
      childNodes: "children",
      parentNode: "parent",
      previousSibling: "prev",
      nextSibling: "next",
      nodeValue: "data"
    };
    var nodeTypes = {
      element: 1,
      text: 3,
      cdata: 4,
      comment: 8
    };
    Object.keys(domLvl1).forEach(function(key) {
      var shorthand = domLvl1[key];
      Object.defineProperty(NodePrototype, key, {
        get: function() {
          return this[shorthand] || null;
        },
        set: function(val) {
          this[shorthand] = val;
          return val;
        }
      });
    });
  }
});

// node_modules/domhandler/lib/element.js
var require_element = __commonJS({
  "node_modules/domhandler/lib/element.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var NodePrototype = require_node();
    var ElementPrototype = module2.exports = Object.create(NodePrototype);
    var domLvl1 = {
      tagName: "name"
    };
    Object.keys(domLvl1).forEach(function(key) {
      var shorthand = domLvl1[key];
      Object.defineProperty(ElementPrototype, key, {
        get: function() {
          return this[shorthand] || null;
        },
        set: function(val) {
          this[shorthand] = val;
          return val;
        }
      });
    });
  }
});

// node_modules/domhandler/index.js
var require_domhandler = __commonJS({
  "node_modules/domhandler/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var ElementType = require_domelementtype();
    var re_whitespace = /\s+/g;
    var NodePrototype = require_node();
    var ElementPrototype = require_element();
    function DomHandler(callback, options, elementCB) {
      if (typeof callback === "object") {
        elementCB = options;
        options = callback;
        callback = null;
      } else if (typeof options === "function") {
        elementCB = options;
        options = defaultOpts;
      }
      this._callback = callback;
      this._options = options || defaultOpts;
      this._elementCB = elementCB;
      this.dom = [];
      this._done = false;
      this._tagStack = [];
      this._parser = this._parser || null;
    }
    var defaultOpts = {
      normalizeWhitespace: false,
      //Replace all whitespace with single spaces
      withStartIndices: false,
      //Add startIndex properties to nodes
      withEndIndices: false
      //Add endIndex properties to nodes
    };
    DomHandler.prototype.onparserinit = function(parser) {
      this._parser = parser;
    };
    DomHandler.prototype.onreset = function() {
      DomHandler.call(this, this._callback, this._options, this._elementCB);
    };
    DomHandler.prototype.onend = function() {
      if (this._done) return;
      this._done = true;
      this._parser = null;
      this._handleCallback(null);
    };
    DomHandler.prototype._handleCallback = DomHandler.prototype.onerror = function(error) {
      if (typeof this._callback === "function") {
        this._callback(error, this.dom);
      } else {
        if (error) throw error;
      }
    };
    DomHandler.prototype.onclosetag = function() {
      var elem = this._tagStack.pop();
      if (this._options.withEndIndices && elem) {
        elem.endIndex = this._parser.endIndex;
      }
      if (this._elementCB) this._elementCB(elem);
    };
    DomHandler.prototype._createDomElement = function(properties) {
      if (!this._options.withDomLvl1) return properties;
      var element;
      if (properties.type === "tag") {
        element = Object.create(ElementPrototype);
      } else {
        element = Object.create(NodePrototype);
      }
      for (var key in properties) {
        if (properties.hasOwnProperty(key)) {
          element[key] = properties[key];
        }
      }
      return element;
    };
    DomHandler.prototype._addDomElement = function(element) {
      var parent = this._tagStack[this._tagStack.length - 1];
      var siblings = parent ? parent.children : this.dom;
      var previousSibling = siblings[siblings.length - 1];
      element.next = null;
      if (this._options.withStartIndices) {
        element.startIndex = this._parser.startIndex;
      }
      if (this._options.withEndIndices) {
        element.endIndex = this._parser.endIndex;
      }
      if (previousSibling) {
        element.prev = previousSibling;
        previousSibling.next = element;
      } else {
        element.prev = null;
      }
      siblings.push(element);
      element.parent = parent || null;
    };
    DomHandler.prototype.onopentag = function(name2, attribs) {
      var properties = {
        type: name2 === "script" ? ElementType.Script : name2 === "style" ? ElementType.Style : ElementType.Tag,
        name: name2,
        attribs,
        children: []
      };
      var element = this._createDomElement(properties);
      this._addDomElement(element);
      this._tagStack.push(element);
    };
    DomHandler.prototype.ontext = function(data) {
      var normalize = this._options.normalizeWhitespace || this._options.ignoreWhitespace;
      var lastTag;
      if (!this._tagStack.length && this.dom.length && (lastTag = this.dom[this.dom.length - 1]).type === ElementType.Text) {
        if (normalize) {
          lastTag.data = (lastTag.data + data).replace(re_whitespace, " ");
        } else {
          lastTag.data += data;
        }
      } else {
        if (this._tagStack.length && (lastTag = this._tagStack[this._tagStack.length - 1]) && (lastTag = lastTag.children[lastTag.children.length - 1]) && lastTag.type === ElementType.Text) {
          if (normalize) {
            lastTag.data = (lastTag.data + data).replace(re_whitespace, " ");
          } else {
            lastTag.data += data;
          }
        } else {
          if (normalize) {
            data = data.replace(re_whitespace, " ");
          }
          var element = this._createDomElement({
            data,
            type: ElementType.Text
          });
          this._addDomElement(element);
        }
      }
    };
    DomHandler.prototype.oncomment = function(data) {
      var lastTag = this._tagStack[this._tagStack.length - 1];
      if (lastTag && lastTag.type === ElementType.Comment) {
        lastTag.data += data;
        return;
      }
      var properties = {
        data,
        type: ElementType.Comment
      };
      var element = this._createDomElement(properties);
      this._addDomElement(element);
      this._tagStack.push(element);
    };
    DomHandler.prototype.oncdatastart = function() {
      var properties = {
        children: [{
          data: "",
          type: ElementType.Text
        }],
        type: ElementType.CDATA
      };
      var element = this._createDomElement(properties);
      this._addDomElement(element);
      this._tagStack.push(element);
    };
    DomHandler.prototype.oncommentend = DomHandler.prototype.oncdataend = function() {
      this._tagStack.pop();
    };
    DomHandler.prototype.onprocessinginstruction = function(name2, data) {
      var element = this._createDomElement({
        name: name2,
        data,
        type: ElementType.Directive
      });
      this._addDomElement(element);
    };
    module2.exports = DomHandler;
  }
});

// node_modules/entities/lib/encode.js
var require_encode = __commonJS({
  "node_modules/entities/lib/encode.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var inverseXML = getInverseObj(require_xml());
    var xmlReplacer = getInverseReplacer(inverseXML);
    exports6.XML = getInverse(inverseXML, xmlReplacer);
    var inverseHTML = getInverseObj(require_entities());
    var htmlReplacer = getInverseReplacer(inverseHTML);
    exports6.HTML = getInverse(inverseHTML, htmlReplacer);
    function getInverseObj(obj) {
      return Object.keys(obj).sort().reduce(function(inverse, name2) {
        inverse[obj[name2]] = "&" + name2 + ";";
        return inverse;
      }, {});
    }
    function getInverseReplacer(inverse) {
      var single = [], multiple = [];
      Object.keys(inverse).forEach(function(k) {
        if (k.length === 1) {
          single.push("\\" + k);
        } else {
          multiple.push(k);
        }
      });
      multiple.unshift("[" + single.join("") + "]");
      return new RegExp(multiple.join("|"), "g");
    }
    var re_nonASCII = /[^\0-\x7F]/g;
    var re_astralSymbols = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
    function singleCharReplacer(c) {
      return "&#x" + c.charCodeAt(0).toString(16).toUpperCase() + ";";
    }
    function astralReplacer(c) {
      var high = c.charCodeAt(0);
      var low = c.charCodeAt(1);
      var codePoint = (high - 55296) * 1024 + low - 56320 + 65536;
      return "&#x" + codePoint.toString(16).toUpperCase() + ";";
    }
    function getInverse(inverse, re) {
      function func(name2) {
        return inverse[name2];
      }
      return function(data) {
        return data.replace(re, func).replace(re_astralSymbols, astralReplacer).replace(re_nonASCII, singleCharReplacer);
      };
    }
    var re_xmlChars = getInverseReplacer(inverseXML);
    function escapeXML(data) {
      return data.replace(re_xmlChars, singleCharReplacer).replace(re_astralSymbols, astralReplacer).replace(re_nonASCII, singleCharReplacer);
    }
    exports6.escape = escapeXML;
  }
});

// node_modules/entities/lib/decode.js
var require_decode2 = __commonJS({
  "node_modules/entities/lib/decode.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var entityMap = require_entities();
    var legacyMap = require_legacy();
    var xmlMap = require_xml();
    var decodeCodePoint = require_decode_codepoint();
    var decodeXMLStrict = getStrictDecoder(xmlMap);
    var decodeHTMLStrict = getStrictDecoder(entityMap);
    function getStrictDecoder(map) {
      var keys = Object.keys(map).join("|"), replace = getReplacer(map);
      keys += "|#[xX][\\da-fA-F]+|#\\d+";
      var re = new RegExp("&(?:" + keys + ");", "g");
      return function(str) {
        return String(str).replace(re, replace);
      };
    }
    var decodeHTML = (function() {
      var legacy = Object.keys(legacyMap).sort(sorter);
      var keys = Object.keys(entityMap).sort(sorter);
      for (var i = 0, j = 0; i < keys.length; i++) {
        if (legacy[j] === keys[i]) {
          keys[i] += ";?";
          j++;
        } else {
          keys[i] += ";";
        }
      }
      var re = new RegExp("&(?:" + keys.join("|") + "|#[xX][\\da-fA-F]+;?|#\\d+;?)", "g"), replace = getReplacer(entityMap);
      function replacer(str) {
        if (str.substr(-1) !== ";") str += ";";
        return replace(str);
      }
      return function(str) {
        return String(str).replace(re, replacer);
      };
    })();
    function sorter(a, b) {
      return a < b ? 1 : -1;
    }
    function getReplacer(map) {
      return function replace(str) {
        if (str.charAt(1) === "#") {
          if (str.charAt(2) === "X" || str.charAt(2) === "x") {
            return decodeCodePoint(parseInt(str.substr(3), 16));
          }
          return decodeCodePoint(parseInt(str.substr(2), 10));
        }
        return map[str.slice(1, -1)];
      };
    }
    module2.exports = {
      XML: decodeXMLStrict,
      HTML: decodeHTML,
      HTMLStrict: decodeHTMLStrict
    };
  }
});

// node_modules/entities/index.js
var require_entities2 = __commonJS({
  "node_modules/entities/index.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var encode = require_encode();
    var decode = require_decode2();
    exports6.decode = function(data, level) {
      return (!level || level <= 0 ? decode.XML : decode.HTML)(data);
    };
    exports6.decodeStrict = function(data, level) {
      return (!level || level <= 0 ? decode.XML : decode.HTMLStrict)(data);
    };
    exports6.encode = function(data, level) {
      return (!level || level <= 0 ? encode.XML : encode.HTML)(data);
    };
    exports6.encodeXML = encode.XML;
    exports6.encodeHTML4 = exports6.encodeHTML5 = exports6.encodeHTML = encode.HTML;
    exports6.decodeXML = exports6.decodeXMLStrict = decode.XML;
    exports6.decodeHTML4 = exports6.decodeHTML5 = exports6.decodeHTML = decode.HTML;
    exports6.decodeHTML4Strict = exports6.decodeHTML5Strict = exports6.decodeHTMLStrict = decode.HTMLStrict;
    exports6.escape = encode.escape;
  }
});

// node_modules/dom-serializer/index.js
var require_dom_serializer = __commonJS({
  "node_modules/dom-serializer/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var ElementType = require_domelementtype();
    var entities = require_entities2();
    var unencodedElements = {
      __proto__: null,
      style: true,
      script: true,
      xmp: true,
      iframe: true,
      noembed: true,
      noframes: true,
      plaintext: true,
      noscript: true
    };
    function formatAttrs(attributes, opts) {
      if (!attributes) return;
      var output = "", value;
      for (var key in attributes) {
        value = attributes[key];
        if (output) {
          output += " ";
        }
        output += key;
        if (value !== null && value !== "" || opts.xmlMode) {
          output += '="' + (opts.decodeEntities ? entities.encodeXML(value) : value) + '"';
        }
      }
      return output;
    }
    var singleTag = {
      __proto__: null,
      area: true,
      base: true,
      basefont: true,
      br: true,
      col: true,
      command: true,
      embed: true,
      frame: true,
      hr: true,
      img: true,
      input: true,
      isindex: true,
      keygen: true,
      link: true,
      meta: true,
      param: true,
      source: true,
      track: true,
      wbr: true
    };
    var render = module2.exports = function(dom, opts) {
      if (!Array.isArray(dom) && !dom.cheerio) dom = [dom];
      opts = opts || {};
      var output = "";
      for (var i = 0; i < dom.length; i++) {
        var elem = dom[i];
        if (elem.type === "root")
          output += render(elem.children, opts);
        else if (ElementType.isTag(elem))
          output += renderTag(elem, opts);
        else if (elem.type === ElementType.Directive)
          output += renderDirective(elem);
        else if (elem.type === ElementType.Comment)
          output += renderComment(elem);
        else if (elem.type === ElementType.CDATA)
          output += renderCdata(elem);
        else
          output += renderText(elem, opts);
      }
      return output;
    };
    function renderTag(elem, opts) {
      if (elem.name === "svg") opts = { decodeEntities: opts.decodeEntities, xmlMode: true };
      var tag = "<" + elem.name, attribs = formatAttrs(elem.attribs, opts);
      if (attribs) {
        tag += " " + attribs;
      }
      if (opts.xmlMode && (!elem.children || elem.children.length === 0)) {
        tag += "/>";
      } else {
        tag += ">";
        if (elem.children) {
          tag += render(elem.children, opts);
        }
        if (!singleTag[elem.name] || opts.xmlMode) {
          tag += "</" + elem.name + ">";
        }
      }
      return tag;
    }
    function renderDirective(elem) {
      return "<" + elem.data + ">";
    }
    function renderText(elem, opts) {
      var data = elem.data || "";
      if (opts.decodeEntities && !(elem.parent && elem.parent.name in unencodedElements)) {
        data = entities.encodeXML(data);
      }
      return data;
    }
    function renderCdata(elem) {
      return "<![CDATA[" + elem.children[0].data + "]]>";
    }
    function renderComment(elem) {
      return "<!--" + elem.data + "-->";
    }
  }
});

// node_modules/domutils/lib/stringify.js
var require_stringify = __commonJS({
  "node_modules/domutils/lib/stringify.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var ElementType = require_domelementtype();
    var getOuterHTML = require_dom_serializer();
    var isTag = ElementType.isTag;
    module2.exports = {
      getInnerHTML,
      getOuterHTML,
      getText
    };
    function getInnerHTML(elem, opts) {
      return elem.children ? elem.children.map(function(elem2) {
        return getOuterHTML(elem2, opts);
      }).join("") : "";
    }
    function getText(elem) {
      if (Array.isArray(elem)) return elem.map(getText).join("");
      if (isTag(elem) || elem.type === ElementType.CDATA) return getText(elem.children);
      if (elem.type === ElementType.Text) return elem.data;
      return "";
    }
  }
});

// node_modules/domutils/lib/traversal.js
var require_traversal = __commonJS({
  "node_modules/domutils/lib/traversal.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var getChildren = exports6.getChildren = function(elem) {
      return elem.children;
    };
    var getParent = exports6.getParent = function(elem) {
      return elem.parent;
    };
    exports6.getSiblings = function(elem) {
      var parent = getParent(elem);
      return parent ? getChildren(parent) : [elem];
    };
    exports6.getAttributeValue = function(elem, name2) {
      return elem.attribs && elem.attribs[name2];
    };
    exports6.hasAttrib = function(elem, name2) {
      return !!elem.attribs && hasOwnProperty.call(elem.attribs, name2);
    };
    exports6.getName = function(elem) {
      return elem.name;
    };
  }
});

// node_modules/domutils/lib/manipulation.js
var require_manipulation = __commonJS({
  "node_modules/domutils/lib/manipulation.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    exports6.removeElement = function(elem) {
      if (elem.prev) elem.prev.next = elem.next;
      if (elem.next) elem.next.prev = elem.prev;
      if (elem.parent) {
        var childs = elem.parent.children;
        childs.splice(childs.lastIndexOf(elem), 1);
      }
    };
    exports6.replaceElement = function(elem, replacement) {
      var prev = replacement.prev = elem.prev;
      if (prev) {
        prev.next = replacement;
      }
      var next = replacement.next = elem.next;
      if (next) {
        next.prev = replacement;
      }
      var parent = replacement.parent = elem.parent;
      if (parent) {
        var childs = parent.children;
        childs[childs.lastIndexOf(elem)] = replacement;
      }
    };
    exports6.appendChild = function(elem, child) {
      child.parent = elem;
      if (elem.children.push(child) !== 1) {
        var sibling = elem.children[elem.children.length - 2];
        sibling.next = child;
        child.prev = sibling;
        child.next = null;
      }
    };
    exports6.append = function(elem, next) {
      var parent = elem.parent, currNext = elem.next;
      next.next = currNext;
      next.prev = elem;
      elem.next = next;
      next.parent = parent;
      if (currNext) {
        currNext.prev = next;
        if (parent) {
          var childs = parent.children;
          childs.splice(childs.lastIndexOf(currNext), 0, next);
        }
      } else if (parent) {
        parent.children.push(next);
      }
    };
    exports6.prepend = function(elem, prev) {
      var parent = elem.parent;
      if (parent) {
        var childs = parent.children;
        childs.splice(childs.lastIndexOf(elem), 0, prev);
      }
      if (elem.prev) {
        elem.prev.next = prev;
      }
      prev.parent = parent;
      prev.prev = elem.prev;
      prev.next = elem;
      elem.prev = prev;
    };
  }
});

// node_modules/domutils/lib/querying.js
var require_querying = __commonJS({
  "node_modules/domutils/lib/querying.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var isTag = require_domelementtype().isTag;
    module2.exports = {
      filter,
      find,
      findOneChild,
      findOne,
      existsOne,
      findAll
    };
    function filter(test, element, recurse, limit) {
      if (!Array.isArray(element)) element = [element];
      if (typeof limit !== "number" || !isFinite(limit)) {
        limit = Infinity;
      }
      return find(test, element, recurse !== false, limit);
    }
    function find(test, elems, recurse, limit) {
      var result = [], childs;
      for (var i = 0, j = elems.length; i < j; i++) {
        if (test(elems[i])) {
          result.push(elems[i]);
          if (--limit <= 0) break;
        }
        childs = elems[i].children;
        if (recurse && childs && childs.length > 0) {
          childs = find(test, childs, recurse, limit);
          result = result.concat(childs);
          limit -= childs.length;
          if (limit <= 0) break;
        }
      }
      return result;
    }
    function findOneChild(test, elems) {
      for (var i = 0, l = elems.length; i < l; i++) {
        if (test(elems[i])) return elems[i];
      }
      return null;
    }
    function findOne(test, elems) {
      var elem = null;
      for (var i = 0, l = elems.length; i < l && !elem; i++) {
        if (!isTag(elems[i])) {
          continue;
        } else if (test(elems[i])) {
          elem = elems[i];
        } else if (elems[i].children.length > 0) {
          elem = findOne(test, elems[i].children);
        }
      }
      return elem;
    }
    function existsOne(test, elems) {
      for (var i = 0, l = elems.length; i < l; i++) {
        if (isTag(elems[i]) && (test(elems[i]) || elems[i].children.length > 0 && existsOne(test, elems[i].children))) {
          return true;
        }
      }
      return false;
    }
    function findAll(test, elems) {
      var result = [];
      for (var i = 0, j = elems.length; i < j; i++) {
        if (!isTag(elems[i])) continue;
        if (test(elems[i])) result.push(elems[i]);
        if (elems[i].children.length > 0) {
          result = result.concat(findAll(test, elems[i].children));
        }
      }
      return result;
    }
  }
});

// node_modules/domutils/lib/legacy.js
var require_legacy2 = __commonJS({
  "node_modules/domutils/lib/legacy.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var ElementType = require_domelementtype();
    var isTag = exports6.isTag = ElementType.isTag;
    exports6.testElement = function(options, element) {
      for (var key in options) {
        if (!options.hasOwnProperty(key)) ;
        else if (key === "tag_name") {
          if (!isTag(element) || !options.tag_name(element.name)) {
            return false;
          }
        } else if (key === "tag_type") {
          if (!options.tag_type(element.type)) return false;
        } else if (key === "tag_contains") {
          if (isTag(element) || !options.tag_contains(element.data)) {
            return false;
          }
        } else if (!element.attribs || !options[key](element.attribs[key])) {
          return false;
        }
      }
      return true;
    };
    var Checks = {
      tag_name: function(name2) {
        if (typeof name2 === "function") {
          return function(elem) {
            return isTag(elem) && name2(elem.name);
          };
        } else if (name2 === "*") {
          return isTag;
        } else {
          return function(elem) {
            return isTag(elem) && elem.name === name2;
          };
        }
      },
      tag_type: function(type) {
        if (typeof type === "function") {
          return function(elem) {
            return type(elem.type);
          };
        } else {
          return function(elem) {
            return elem.type === type;
          };
        }
      },
      tag_contains: function(data) {
        if (typeof data === "function") {
          return function(elem) {
            return !isTag(elem) && data(elem.data);
          };
        } else {
          return function(elem) {
            return !isTag(elem) && elem.data === data;
          };
        }
      }
    };
    function getAttribCheck(attrib, value) {
      if (typeof value === "function") {
        return function(elem) {
          return elem.attribs && value(elem.attribs[attrib]);
        };
      } else {
        return function(elem) {
          return elem.attribs && elem.attribs[attrib] === value;
        };
      }
    }
    function combineFuncs(a, b) {
      return function(elem) {
        return a(elem) || b(elem);
      };
    }
    exports6.getElements = function(options, element, recurse, limit) {
      var funcs = Object.keys(options).map(function(key) {
        var value = options[key];
        return key in Checks ? Checks[key](value) : getAttribCheck(key, value);
      });
      return funcs.length === 0 ? [] : this.filter(
        funcs.reduce(combineFuncs),
        element,
        recurse,
        limit
      );
    };
    exports6.getElementById = function(id, element, recurse) {
      if (!Array.isArray(element)) element = [element];
      return this.findOne(getAttribCheck("id", id), element, recurse !== false);
    };
    exports6.getElementsByTagName = function(name2, element, recurse, limit) {
      return this.filter(Checks.tag_name(name2), element, recurse, limit);
    };
    exports6.getElementsByTagType = function(type, element, recurse, limit) {
      return this.filter(Checks.tag_type(type), element, recurse, limit);
    };
  }
});

// node_modules/domutils/lib/helpers.js
var require_helpers = __commonJS({
  "node_modules/domutils/lib/helpers.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    exports6.removeSubsets = function(nodes) {
      var idx = nodes.length, node, ancestor, replace;
      while (--idx > -1) {
        node = ancestor = nodes[idx];
        nodes[idx] = null;
        replace = true;
        while (ancestor) {
          if (nodes.indexOf(ancestor) > -1) {
            replace = false;
            nodes.splice(idx, 1);
            break;
          }
          ancestor = ancestor.parent;
        }
        if (replace) {
          nodes[idx] = node;
        }
      }
      return nodes;
    };
    var POSITION = {
      DISCONNECTED: 1,
      PRECEDING: 2,
      FOLLOWING: 4,
      CONTAINS: 8,
      CONTAINED_BY: 16
    };
    var comparePos = exports6.compareDocumentPosition = function(nodeA, nodeB) {
      var aParents = [];
      var bParents = [];
      var current, sharedParent, siblings, aSibling, bSibling, idx;
      if (nodeA === nodeB) {
        return 0;
      }
      current = nodeA;
      while (current) {
        aParents.unshift(current);
        current = current.parent;
      }
      current = nodeB;
      while (current) {
        bParents.unshift(current);
        current = current.parent;
      }
      idx = 0;
      while (aParents[idx] === bParents[idx]) {
        idx++;
      }
      if (idx === 0) {
        return POSITION.DISCONNECTED;
      }
      sharedParent = aParents[idx - 1];
      siblings = sharedParent.children;
      aSibling = aParents[idx];
      bSibling = bParents[idx];
      if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
        if (sharedParent === nodeB) {
          return POSITION.FOLLOWING | POSITION.CONTAINED_BY;
        }
        return POSITION.FOLLOWING;
      } else {
        if (sharedParent === nodeA) {
          return POSITION.PRECEDING | POSITION.CONTAINS;
        }
        return POSITION.PRECEDING;
      }
    };
    exports6.uniqueSort = function(nodes) {
      var idx = nodes.length, node, position;
      nodes = nodes.slice();
      while (--idx > -1) {
        node = nodes[idx];
        position = nodes.indexOf(node);
        if (position > -1 && position < idx) {
          nodes.splice(idx, 1);
        }
      }
      nodes.sort(function(a, b) {
        var relative = comparePos(a, b);
        if (relative & POSITION.PRECEDING) {
          return -1;
        } else if (relative & POSITION.FOLLOWING) {
          return 1;
        }
        return 0;
      });
      return nodes;
    };
  }
});

// node_modules/domutils/index.js
var require_domutils = __commonJS({
  "node_modules/domutils/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var DomUtils = module2.exports;
    [
      require_stringify(),
      require_traversal(),
      require_manipulation(),
      require_querying(),
      require_legacy2(),
      require_helpers()
    ].forEach(function(ext) {
      Object.keys(ext).forEach(function(key) {
        DomUtils[key] = ext[key].bind(DomUtils);
      });
    });
  }
});

// node_modules/htmlparser2/lib/FeedHandler.js
var require_FeedHandler = __commonJS({
  "node_modules/htmlparser2/lib/FeedHandler.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var DomHandler = require_domhandler();
    var DomUtils = require_domutils();
    function FeedHandler(callback, options) {
      this.init(callback, options);
    }
    require_inherits_browser()(FeedHandler, DomHandler);
    FeedHandler.prototype.init = DomHandler;
    function getElements(what, where) {
      return DomUtils.getElementsByTagName(what, where, true);
    }
    function getOneElement(what, where) {
      return DomUtils.getElementsByTagName(what, where, true, 1)[0];
    }
    function fetch(what, where, recurse) {
      return DomUtils.getText(
        DomUtils.getElementsByTagName(what, where, recurse, 1)
      ).trim();
    }
    function addConditionally(obj, prop, what, where, recurse) {
      var tmp = fetch(what, where, recurse);
      if (tmp) obj[prop] = tmp;
    }
    var isValidFeed = function(value) {
      return value === "rss" || value === "feed" || value === "rdf:RDF";
    };
    FeedHandler.prototype.onend = function() {
      var feed = {}, feedRoot = getOneElement(isValidFeed, this.dom), tmp, childs;
      if (feedRoot) {
        if (feedRoot.name === "feed") {
          childs = feedRoot.children;
          feed.type = "atom";
          addConditionally(feed, "id", "id", childs);
          addConditionally(feed, "title", "title", childs);
          if ((tmp = getOneElement("link", childs)) && (tmp = tmp.attribs) && (tmp = tmp.href))
            feed.link = tmp;
          addConditionally(feed, "description", "subtitle", childs);
          if (tmp = fetch("updated", childs)) feed.updated = new Date(tmp);
          addConditionally(feed, "author", "email", childs, true);
          feed.items = getElements("entry", childs).map(function(item) {
            var entry = {}, tmp2;
            item = item.children;
            addConditionally(entry, "id", "id", item);
            addConditionally(entry, "title", "title", item);
            if ((tmp2 = getOneElement("link", item)) && (tmp2 = tmp2.attribs) && (tmp2 = tmp2.href))
              entry.link = tmp2;
            if (tmp2 = fetch("summary", item) || fetch("content", item))
              entry.description = tmp2;
            if (tmp2 = fetch("updated", item))
              entry.pubDate = new Date(tmp2);
            return entry;
          });
        } else {
          childs = getOneElement("channel", feedRoot.children).children;
          feed.type = feedRoot.name.substr(0, 3);
          feed.id = "";
          addConditionally(feed, "title", "title", childs);
          addConditionally(feed, "link", "link", childs);
          addConditionally(feed, "description", "description", childs);
          if (tmp = fetch("lastBuildDate", childs))
            feed.updated = new Date(tmp);
          addConditionally(feed, "author", "managingEditor", childs, true);
          feed.items = getElements("item", feedRoot.children).map(function(item) {
            var entry = {}, tmp2;
            item = item.children;
            addConditionally(entry, "id", "guid", item);
            addConditionally(entry, "title", "title", item);
            addConditionally(entry, "link", "link", item);
            addConditionally(entry, "description", "description", item);
            if (tmp2 = fetch("pubDate", item))
              entry.pubDate = new Date(tmp2);
            return entry;
          });
        }
      }
      this.dom = feed;
      DomHandler.prototype._handleCallback.call(
        this,
        feedRoot ? null : Error("couldn't find root of feed")
      );
    };
    module2.exports = FeedHandler;
  }
});

// (disabled):node_modules/readable-stream/readable-browser.js
var require_readable_browser = __commonJS({
  "(disabled):node_modules/readable-stream/readable-browser.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
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

// node_modules/@jspm/core/nodelibs/browser/string_decoder.js
var string_decoder_exports = {};
__export(string_decoder_exports, {
  StringDecoder: () => StringDecoder,
  default: () => exports5
});
var init_string_decoder = __esm({
  "node_modules/@jspm/core/nodelibs/browser/string_decoder.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    init_chunk_CcCWfKp1();
    init_chunk_DtuTasat();
  }
});

// node_modules/htmlparser2/lib/WritableStream.js
var require_WritableStream = __commonJS({
  "node_modules/htmlparser2/lib/WritableStream.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = Stream;
    var Parser = require_Parser();
    var WritableStream = require_readable_browser().Writable;
    var StringDecoder2 = (init_string_decoder(), __toCommonJS(string_decoder_exports)).StringDecoder;
    var Buffer3 = (init_buffer(), __toCommonJS(buffer_exports)).Buffer;
    function Stream(cbs, options) {
      var parser = this._parser = new Parser(cbs, options);
      var decoder = this._decoder = new StringDecoder2();
      WritableStream.call(this, { decodeStrings: false });
      this.once("finish", function() {
        parser.end(decoder.end());
      });
    }
    require_inherits_browser()(Stream, WritableStream);
    Stream.prototype._write = function(chunk, encoding, cb) {
      if (chunk instanceof Buffer3) chunk = this._decoder.write(chunk);
      this._parser.write(chunk);
      cb();
    };
  }
});

// node_modules/htmlparser2/lib/Stream.js
var require_Stream = __commonJS({
  "node_modules/htmlparser2/lib/Stream.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = Stream;
    var Parser = require_WritableStream();
    function Stream(options) {
      Parser.call(this, new Cbs(this), options);
    }
    require_inherits_browser()(Stream, Parser);
    Stream.prototype.readable = true;
    function Cbs(scope) {
      this.scope = scope;
    }
    var EVENTS = require_lib().EVENTS;
    Object.keys(EVENTS).forEach(function(name2) {
      if (EVENTS[name2] === 0) {
        Cbs.prototype["on" + name2] = function() {
          this.scope.emit(name2);
        };
      } else if (EVENTS[name2] === 1) {
        Cbs.prototype["on" + name2] = function(a) {
          this.scope.emit(name2, a);
        };
      } else if (EVENTS[name2] === 2) {
        Cbs.prototype["on" + name2] = function(a, b) {
          this.scope.emit(name2, a, b);
        };
      } else {
        throw Error("wrong number of arguments!");
      }
    });
  }
});

// node_modules/htmlparser2/lib/ProxyHandler.js
var require_ProxyHandler = __commonJS({
  "node_modules/htmlparser2/lib/ProxyHandler.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = ProxyHandler;
    function ProxyHandler(cbs) {
      this._cbs = cbs || {};
    }
    var EVENTS = require_lib().EVENTS;
    Object.keys(EVENTS).forEach(function(name2) {
      if (EVENTS[name2] === 0) {
        name2 = "on" + name2;
        ProxyHandler.prototype[name2] = function() {
          if (this._cbs[name2]) this._cbs[name2]();
        };
      } else if (EVENTS[name2] === 1) {
        name2 = "on" + name2;
        ProxyHandler.prototype[name2] = function(a) {
          if (this._cbs[name2]) this._cbs[name2](a);
        };
      } else if (EVENTS[name2] === 2) {
        name2 = "on" + name2;
        ProxyHandler.prototype[name2] = function(a, b) {
          if (this._cbs[name2]) this._cbs[name2](a, b);
        };
      } else {
        throw Error("wrong number of arguments");
      }
    });
  }
});

// node_modules/htmlparser2/lib/CollectingHandler.js
var require_CollectingHandler = __commonJS({
  "node_modules/htmlparser2/lib/CollectingHandler.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = CollectingHandler;
    function CollectingHandler(cbs) {
      this._cbs = cbs || {};
      this.events = [];
    }
    var EVENTS = require_lib().EVENTS;
    Object.keys(EVENTS).forEach(function(name2) {
      if (EVENTS[name2] === 0) {
        name2 = "on" + name2;
        CollectingHandler.prototype[name2] = function() {
          this.events.push([name2]);
          if (this._cbs[name2]) this._cbs[name2]();
        };
      } else if (EVENTS[name2] === 1) {
        name2 = "on" + name2;
        CollectingHandler.prototype[name2] = function(a) {
          this.events.push([name2, a]);
          if (this._cbs[name2]) this._cbs[name2](a);
        };
      } else if (EVENTS[name2] === 2) {
        name2 = "on" + name2;
        CollectingHandler.prototype[name2] = function(a, b) {
          this.events.push([name2, a, b]);
          if (this._cbs[name2]) this._cbs[name2](a, b);
        };
      } else {
        throw Error("wrong number of arguments");
      }
    });
    CollectingHandler.prototype.onreset = function() {
      this.events = [];
      if (this._cbs.onreset) this._cbs.onreset();
    };
    CollectingHandler.prototype.restart = function() {
      if (this._cbs.onreset) this._cbs.onreset();
      for (var i = 0, len = this.events.length; i < len; i++) {
        if (this._cbs[this.events[i][0]]) {
          var num = this.events[i].length;
          if (num === 1) {
            this._cbs[this.events[i][0]]();
          } else if (num === 2) {
            this._cbs[this.events[i][0]](this.events[i][1]);
          } else {
            this._cbs[this.events[i][0]](
              this.events[i][1],
              this.events[i][2]
            );
          }
        }
      }
    };
  }
});

// node_modules/htmlparser2/lib/index.js
var require_lib = __commonJS({
  "node_modules/htmlparser2/lib/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var Parser = require_Parser();
    var DomHandler = require_domhandler();
    function defineProp(name2, value) {
      delete module2.exports[name2];
      module2.exports[name2] = value;
      return value;
    }
    module2.exports = {
      Parser,
      Tokenizer: require_Tokenizer(),
      ElementType: require_domelementtype(),
      DomHandler,
      get FeedHandler() {
        return defineProp("FeedHandler", require_FeedHandler());
      },
      get Stream() {
        return defineProp("Stream", require_Stream());
      },
      get WritableStream() {
        return defineProp("WritableStream", require_WritableStream());
      },
      get ProxyHandler() {
        return defineProp("ProxyHandler", require_ProxyHandler());
      },
      get DomUtils() {
        return defineProp("DomUtils", require_domutils());
      },
      get CollectingHandler() {
        return defineProp(
          "CollectingHandler",
          require_CollectingHandler()
        );
      },
      // For legacy support
      DefaultHandler: DomHandler,
      get RssHandler() {
        return defineProp("RssHandler", this.FeedHandler);
      },
      //helper methods
      parseDOM: function(data, options) {
        var handler = new DomHandler(options);
        new Parser(handler, options).end(data);
        return handler.dom;
      },
      parseFeed: function(feed, options) {
        var handler = new module2.exports.FeedHandler(options);
        new Parser(handler, options).end(feed);
        return handler.dom;
      },
      createDomStream: function(cb, options, elementCb) {
        var handler = new DomHandler(cb, options, elementCb);
        return new Parser(handler, options);
      },
      // List of all events that the parser emits
      EVENTS: {
        /* Format: eventname: number of arguments */
        attribute: 2,
        cdatastart: 0,
        cdataend: 0,
        text: 1,
        processinginstruction: 2,
        comment: 1,
        commentend: 0,
        closetag: 1,
        opentag: 2,
        opentagname: 1,
        error: 1,
        end: 0
      }
    };
  }
});

// node_modules/cheerio/lib/parse.js
var require_parse = __commonJS({
  "node_modules/cheerio/lib/parse.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var htmlparser = require_lib();
    exports6 = module2.exports = function(content, options) {
      var dom = exports6.evaluate(content, options), root = exports6.evaluate("<root></root>", options)[0];
      root.type = "root";
      exports6.update(dom, root);
      return root;
    };
    exports6.evaluate = function(content, options) {
      var dom;
      if (typeof content === "string" || Buffer2.isBuffer(content)) {
        dom = htmlparser.parseDOM(content, options);
      } else {
        dom = content;
      }
      return dom;
    };
    exports6.update = function(arr, parent) {
      if (!Array.isArray(arr)) arr = [arr];
      if (parent) {
        parent.children = arr;
      } else {
        parent = null;
      }
      for (var i = 0; i < arr.length; i++) {
        var node = arr[i];
        var oldParent = node.parent || node.root, oldSiblings = oldParent && oldParent.children;
        if (oldSiblings && oldSiblings !== arr) {
          oldSiblings.splice(oldSiblings.indexOf(node), 1);
          if (node.prev) {
            node.prev.next = node.next;
          }
          if (node.next) {
            node.next.prev = node.prev;
          }
        }
        if (parent) {
          node.prev = arr[i - 1] || null;
          node.next = arr[i + 1] || null;
        } else {
          node.prev = node.next = null;
        }
        if (parent && parent.type === "root") {
          node.root = parent;
          node.parent = null;
        } else {
          node.root = null;
          node.parent = parent;
        }
      }
      return parent;
    };
  }
});

// node_modules/cheerio/lib/utils.js
var require_utils = __commonJS({
  "node_modules/cheerio/lib/utils.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var parse = require_parse();
    var render = require_dom_serializer();
    var tags = { tag: true, script: true, style: true };
    exports6.isTag = function(type) {
      if (type.type) type = type.type;
      return tags[type] || false;
    };
    exports6.camelCase = function(str) {
      return str.replace(/[_.-](\w|$)/g, function(_, x) {
        return x.toUpperCase();
      });
    };
    exports6.cssCase = function(str) {
      return str.replace(/[A-Z]/g, "-$&").toLowerCase();
    };
    exports6.domEach = function(cheerio, fn) {
      var i = 0, len = cheerio.length;
      while (i < len && fn.call(cheerio, i, cheerio[i]) !== false) ++i;
      return cheerio;
    };
    exports6.cloneDom = function(dom, options) {
      return parse(render(dom, options), options).children;
    };
    var quickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/;
    exports6.isHtml = function(str) {
      if (str.charAt(0) === "<" && str.charAt(str.length - 1) === ">" && str.length >= 3) return true;
      var match = quickExpr.exec(str);
      return !!(match && match[1]);
    };
  }
});

// node_modules/lodash.assignin/index.js
var require_lodash = __commonJS({
  "node_modules/lodash.assignin/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    function apply(func, thisArg, args) {
      switch (args.length) {
        case 0:
          return func.call(thisArg);
        case 1:
          return func.call(thisArg, args[0]);
        case 2:
          return func.call(thisArg, args[0], args[1]);
        case 3:
          return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    var objectProto = Object.prototype;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var nativeMax = Math.max;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assignValue(object, key, value) {
      var objValue = object[key];
      if (!(hasOwnProperty2.call(object, key) && eq(objValue, value)) || value === void 0 && !(key in object)) {
        object[key] = value;
      }
    }
    function baseKeysIn(object) {
      if (!isObject(object)) {
        return nativeKeysIn(object);
      }
      var isProto = isPrototype(object), result = [];
      for (var key in object) {
        if (!(key == "constructor" && (isProto || !hasOwnProperty2.call(object, key)))) {
          result.push(key);
        }
      }
      return result;
    }
    function baseRest(func, start) {
      start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
      return function() {
        var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
        while (++index < length) {
          array[index] = args[start + index];
        }
        index = -1;
        var otherArgs = Array(start + 1);
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = array;
        return apply(func, this, otherArgs);
      };
    }
    function copyObject(source, props, object, customizer) {
      object || (object = {});
      var index = -1, length = props.length;
      while (++index < length) {
        var key = props[index];
        var newValue = customizer ? customizer(object[key], source[key], key, object, source) : void 0;
        assignValue(object, key, newValue === void 0 ? source[key] : newValue);
      }
      return object;
    }
    function createAssigner(assigner) {
      return baseRest(function(object, sources) {
        var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
        customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
        if (guard && isIterateeCall(sources[0], sources[1], guard)) {
          customizer = length < 3 ? void 0 : customizer;
          length = 1;
        }
        object = Object(object);
        while (++index < length) {
          var source = sources[index];
          if (source) {
            assigner(object, source, index, customizer);
          }
        }
        return object;
      });
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
        return eq(object[index], value);
      }
      return false;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function nativeKeysIn(object) {
      var result = [];
      if (object != null) {
        for (var key in Object(object)) {
          result.push(key);
        }
      }
      return result;
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    var assignIn = createAssigner(function(object, source) {
      copyObject(source, keysIn(source), object);
    });
    function keysIn(object) {
      return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
    }
    module2.exports = assignIn;
  }
});

// node_modules/lodash.bind/index.js
var require_lodash2 = __commonJS({
  "node_modules/lodash.bind/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var FUNC_ERROR_TEXT = "Expected a function";
    var PLACEHOLDER = "__lodash_placeholder__";
    var BIND_FLAG = 1;
    var BIND_KEY_FLAG = 2;
    var CURRY_BOUND_FLAG = 4;
    var CURRY_FLAG = 8;
    var CURRY_RIGHT_FLAG = 16;
    var PARTIAL_FLAG = 32;
    var PARTIAL_RIGHT_FLAG = 64;
    var ARY_FLAG = 128;
    var REARG_FLAG = 256;
    var FLIP_FLAG = 512;
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var MAX_INTEGER = 17976931348623157e292;
    var NAN = 0 / 0;
    var wrapFlags = [
      ["ary", ARY_FLAG],
      ["bind", BIND_FLAG],
      ["bindKey", BIND_KEY_FLAG],
      ["curry", CURRY_FLAG],
      ["curryRight", CURRY_RIGHT_FLAG],
      ["flip", FLIP_FLAG],
      ["partial", PARTIAL_FLAG],
      ["partialRight", PARTIAL_RIGHT_FLAG],
      ["rearg", REARG_FLAG]
    ];
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var symbolTag = "[object Symbol]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reTrim = /^\s+|\s+$/g;
    var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/;
    var reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/;
    var reSplitDetails = /,? & /;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsOctal = /^0o[0-7]+$/i;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var freeParseInt = parseInt;
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    function apply(func, thisArg, args) {
      switch (args.length) {
        case 0:
          return func.call(thisArg);
        case 1:
          return func.call(thisArg, args[0]);
        case 2:
          return func.call(thisArg, args[0], args[1]);
        case 3:
          return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }
    function arrayEach(array, iteratee) {
      var index = -1, length = array ? array.length : 0;
      while (++index < length) {
        if (iteratee(array[index], index, array) === false) {
          break;
        }
      }
      return array;
    }
    function arrayIncludes(array, value) {
      var length = array ? array.length : 0;
      return !!length && baseIndexOf(array, value, 0) > -1;
    }
    function baseFindIndex(array, predicate, fromIndex, fromRight) {
      var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
      while (fromRight ? index-- : ++index < length) {
        if (predicate(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }
    function baseIndexOf(array, value, fromIndex) {
      if (value !== value) {
        return baseFindIndex(array, baseIsNaN, fromIndex);
      }
      var index = fromIndex - 1, length = array.length;
      while (++index < length) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }
    function baseIsNaN(value) {
      return value !== value;
    }
    function countHolders(array, placeholder) {
      var length = array.length, result = 0;
      while (length--) {
        if (array[length] === placeholder) {
          result++;
        }
      }
      return result;
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e) {
        }
      }
      return result;
    }
    function replaceHolders(array, placeholder) {
      var index = -1, length = array.length, resIndex = 0, result = [];
      while (++index < length) {
        var value = array[index];
        if (value === placeholder || value === PLACEHOLDER) {
          array[index] = PLACEHOLDER;
          result[resIndex++] = index;
        }
      }
      return result;
    }
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var funcToString = funcProto.toString;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var objectCreate = Object.create;
    var nativeMax = Math.max;
    var nativeMin = Math.min;
    var defineProperty = (function() {
      var func = getNative(Object, "defineProperty"), name2 = getNative.name;
      return name2 && name2.length > 2 ? func : void 0;
    })();
    function baseCreate(proto) {
      return isObject(proto) ? objectCreate(proto) : {};
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseRest(func, start) {
      start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
      return function() {
        var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
        while (++index < length) {
          array[index] = args[start + index];
        }
        index = -1;
        var otherArgs = Array(start + 1);
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = array;
        return apply(func, this, otherArgs);
      };
    }
    function composeArgs(args, partials, holders, isCurried) {
      var argsIndex = -1, argsLength = args.length, holdersLength = holders.length, leftIndex = -1, leftLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result = Array(leftLength + rangeLength), isUncurried = !isCurried;
      while (++leftIndex < leftLength) {
        result[leftIndex] = partials[leftIndex];
      }
      while (++argsIndex < holdersLength) {
        if (isUncurried || argsIndex < argsLength) {
          result[holders[argsIndex]] = args[argsIndex];
        }
      }
      while (rangeLength--) {
        result[leftIndex++] = args[argsIndex++];
      }
      return result;
    }
    function composeArgsRight(args, partials, holders, isCurried) {
      var argsIndex = -1, argsLength = args.length, holdersIndex = -1, holdersLength = holders.length, rightIndex = -1, rightLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result = Array(rangeLength + rightLength), isUncurried = !isCurried;
      while (++argsIndex < rangeLength) {
        result[argsIndex] = args[argsIndex];
      }
      var offset = argsIndex;
      while (++rightIndex < rightLength) {
        result[offset + rightIndex] = partials[rightIndex];
      }
      while (++holdersIndex < holdersLength) {
        if (isUncurried || argsIndex < argsLength) {
          result[offset + holders[holdersIndex]] = args[argsIndex++];
        }
      }
      return result;
    }
    function copyArray(source, array) {
      var index = -1, length = source.length;
      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }
    function createBind(func, bitmask, thisArg) {
      var isBind = bitmask & BIND_FLAG, Ctor = createCtor(func);
      function wrapper() {
        var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
        return fn.apply(isBind ? thisArg : this, arguments);
      }
      return wrapper;
    }
    function createCtor(Ctor) {
      return function() {
        var args = arguments;
        switch (args.length) {
          case 0:
            return new Ctor();
          case 1:
            return new Ctor(args[0]);
          case 2:
            return new Ctor(args[0], args[1]);
          case 3:
            return new Ctor(args[0], args[1], args[2]);
          case 4:
            return new Ctor(args[0], args[1], args[2], args[3]);
          case 5:
            return new Ctor(args[0], args[1], args[2], args[3], args[4]);
          case 6:
            return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
          case 7:
            return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        }
        var thisBinding = baseCreate(Ctor.prototype), result = Ctor.apply(thisBinding, args);
        return isObject(result) ? result : thisBinding;
      };
    }
    function createCurry(func, bitmask, arity) {
      var Ctor = createCtor(func);
      function wrapper() {
        var length = arguments.length, args = Array(length), index = length, placeholder = getHolder(wrapper);
        while (index--) {
          args[index] = arguments[index];
        }
        var holders = length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder ? [] : replaceHolders(args, placeholder);
        length -= holders.length;
        if (length < arity) {
          return createRecurry(
            func,
            bitmask,
            createHybrid,
            wrapper.placeholder,
            void 0,
            args,
            holders,
            void 0,
            void 0,
            arity - length
          );
        }
        var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
        return apply(fn, this, args);
      }
      return wrapper;
    }
    function createHybrid(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
      var isAry = bitmask & ARY_FLAG, isBind = bitmask & BIND_FLAG, isBindKey = bitmask & BIND_KEY_FLAG, isCurried = bitmask & (CURRY_FLAG | CURRY_RIGHT_FLAG), isFlip = bitmask & FLIP_FLAG, Ctor = isBindKey ? void 0 : createCtor(func);
      function wrapper() {
        var length = arguments.length, args = Array(length), index = length;
        while (index--) {
          args[index] = arguments[index];
        }
        if (isCurried) {
          var placeholder = getHolder(wrapper), holdersCount = countHolders(args, placeholder);
        }
        if (partials) {
          args = composeArgs(args, partials, holders, isCurried);
        }
        if (partialsRight) {
          args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
        }
        length -= holdersCount;
        if (isCurried && length < arity) {
          var newHolders = replaceHolders(args, placeholder);
          return createRecurry(
            func,
            bitmask,
            createHybrid,
            wrapper.placeholder,
            thisArg,
            args,
            newHolders,
            argPos,
            ary,
            arity - length
          );
        }
        var thisBinding = isBind ? thisArg : this, fn = isBindKey ? thisBinding[func] : func;
        length = args.length;
        if (argPos) {
          args = reorder(args, argPos);
        } else if (isFlip && length > 1) {
          args.reverse();
        }
        if (isAry && ary < length) {
          args.length = ary;
        }
        if (this && this !== root && this instanceof wrapper) {
          fn = Ctor || createCtor(fn);
        }
        return fn.apply(thisBinding, args);
      }
      return wrapper;
    }
    function createPartial(func, bitmask, thisArg, partials) {
      var isBind = bitmask & BIND_FLAG, Ctor = createCtor(func);
      function wrapper() {
        var argsIndex = -1, argsLength = arguments.length, leftIndex = -1, leftLength = partials.length, args = Array(leftLength + argsLength), fn = this && this !== root && this instanceof wrapper ? Ctor : func;
        while (++leftIndex < leftLength) {
          args[leftIndex] = partials[leftIndex];
        }
        while (argsLength--) {
          args[leftIndex++] = arguments[++argsIndex];
        }
        return apply(fn, isBind ? thisArg : this, args);
      }
      return wrapper;
    }
    function createRecurry(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary, arity) {
      var isCurry = bitmask & CURRY_FLAG, newHolders = isCurry ? holders : void 0, newHoldersRight = isCurry ? void 0 : holders, newPartials = isCurry ? partials : void 0, newPartialsRight = isCurry ? void 0 : partials;
      bitmask |= isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG;
      bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);
      if (!(bitmask & CURRY_BOUND_FLAG)) {
        bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
      }
      var result = wrapFunc(func, bitmask, thisArg, newPartials, newHolders, newPartialsRight, newHoldersRight, argPos, ary, arity);
      result.placeholder = placeholder;
      return setWrapToString(result, func, bitmask);
    }
    function createWrap(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
      var isBindKey = bitmask & BIND_KEY_FLAG;
      if (!isBindKey && typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var length = partials ? partials.length : 0;
      if (!length) {
        bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
        partials = holders = void 0;
      }
      ary = ary === void 0 ? ary : nativeMax(toInteger(ary), 0);
      arity = arity === void 0 ? arity : toInteger(arity);
      length -= holders ? holders.length : 0;
      if (bitmask & PARTIAL_RIGHT_FLAG) {
        var partialsRight = partials, holdersRight = holders;
        partials = holders = void 0;
      }
      var newData = [
        func,
        bitmask,
        thisArg,
        partials,
        holders,
        partialsRight,
        holdersRight,
        argPos,
        ary,
        arity
      ];
      func = newData[0];
      bitmask = newData[1];
      thisArg = newData[2];
      partials = newData[3];
      holders = newData[4];
      arity = newData[9] = newData[9] == null ? isBindKey ? 0 : func.length : nativeMax(newData[9] - length, 0);
      if (!arity && bitmask & (CURRY_FLAG | CURRY_RIGHT_FLAG)) {
        bitmask &= ~(CURRY_FLAG | CURRY_RIGHT_FLAG);
      }
      if (!bitmask || bitmask == BIND_FLAG) {
        var result = createBind(func, bitmask, thisArg);
      } else if (bitmask == CURRY_FLAG || bitmask == CURRY_RIGHT_FLAG) {
        result = createCurry(func, bitmask, arity);
      } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !holders.length) {
        result = createPartial(func, bitmask, thisArg, partials);
      } else {
        result = createHybrid.apply(void 0, newData);
      }
      return setWrapToString(result, func, bitmask);
    }
    function getHolder(func) {
      var object = func;
      return object.placeholder;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    function getWrapDetails(source) {
      var match = source.match(reWrapDetails);
      return match ? match[1].split(reSplitDetails) : [];
    }
    function insertWrapDetails(source, details) {
      var length = details.length, lastIndex = length - 1;
      details[lastIndex] = (length > 1 ? "& " : "") + details[lastIndex];
      details = details.join(length > 2 ? ", " : " ");
      return source.replace(reWrapComment, "{\n/* [wrapped with " + details + "] */\n");
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function reorder(array, indexes) {
      var arrLength = array.length, length = nativeMin(indexes.length, arrLength), oldArray = copyArray(array);
      while (length--) {
        var index = indexes[length];
        array[length] = isIndex(index, arrLength) ? oldArray[index] : void 0;
      }
      return array;
    }
    var setWrapToString = !defineProperty ? identity : function(wrapper, reference, bitmask) {
      var source = reference + "";
      return defineProperty(wrapper, "toString", {
        "configurable": true,
        "enumerable": false,
        "value": constant(insertWrapDetails(source, updateWrapDetails(getWrapDetails(source), bitmask)))
      });
    };
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function updateWrapDetails(details, bitmask) {
      arrayEach(wrapFlags, function(pair) {
        var value = "_." + pair[0];
        if (bitmask & pair[1] && !arrayIncludes(details, value)) {
          details.push(value);
        }
      });
      return details.sort();
    }
    var bind = baseRest(function(func, thisArg, partials) {
      var bitmask = BIND_FLAG;
      if (partials.length) {
        var holders = replaceHolders(partials, getHolder(bind));
        bitmask |= PARTIAL_FLAG;
      }
      return createWrap(func, bitmask, thisArg, partials, holders);
    });
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign = value < 0 ? -1 : 1;
        return sign * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }
    function toInteger(value) {
      var result = toFinite(value), remainder = result % 1;
      return result === result ? remainder ? result - remainder : result : 0;
    }
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    function constant(value) {
      return function() {
        return value;
      };
    }
    function identity(value) {
      return value;
    }
    bind.placeholder = {};
    module2.exports = bind;
  }
});

// node_modules/lodash.foreach/index.js
var require_lodash3 = __commonJS({
  "node_modules/lodash.foreach/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    function arrayEach(array, iteratee) {
      var index = -1, length = array ? array.length : 0;
      while (++index < length) {
        if (iteratee(array[index], index, array) === false) {
          break;
        }
      }
      return array;
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    var objectProto = Object.prototype;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var nativeKeys = overArg(Object.keys, Object);
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    var baseEach = createBaseEach(baseForOwn);
    var baseFor = createBaseFor();
    function baseForOwn(object, iteratee) {
      return object && baseFor(object, iteratee, keys);
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty2.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function createBaseEach(eachFunc, fromRight) {
      return function(collection, iteratee) {
        if (collection == null) {
          return collection;
        }
        if (!isArrayLike(collection)) {
          return eachFunc(collection, iteratee);
        }
        var length = collection.length, index = fromRight ? length : -1, iterable = Object(collection);
        while (fromRight ? index-- : ++index < length) {
          if (iteratee(iterable[index], index, iterable) === false) {
            break;
          }
        }
        return collection;
      };
    }
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function forEach(collection, iteratee) {
      var func = isArray(collection) ? arrayEach : baseEach;
      return func(collection, typeof iteratee == "function" ? iteratee : identity);
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function identity(value) {
      return value;
    }
    module2.exports = forEach;
  }
});

// node_modules/lodash.defaults/index.js
var require_lodash4 = __commonJS({
  "node_modules/lodash.defaults/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    function apply(func, thisArg, args) {
      switch (args.length) {
        case 0:
          return func.call(thisArg);
        case 1:
          return func.call(thisArg, args[0]);
        case 2:
          return func.call(thisArg, args[0], args[1]);
        case 3:
          return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    var objectProto = Object.prototype;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var nativeMax = Math.max;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assignInDefaults(objValue, srcValue, key, object) {
      if (objValue === void 0 || eq(objValue, objectProto[key]) && !hasOwnProperty2.call(object, key)) {
        return srcValue;
      }
      return objValue;
    }
    function assignValue(object, key, value) {
      var objValue = object[key];
      if (!(hasOwnProperty2.call(object, key) && eq(objValue, value)) || value === void 0 && !(key in object)) {
        object[key] = value;
      }
    }
    function baseKeysIn(object) {
      if (!isObject(object)) {
        return nativeKeysIn(object);
      }
      var isProto = isPrototype(object), result = [];
      for (var key in object) {
        if (!(key == "constructor" && (isProto || !hasOwnProperty2.call(object, key)))) {
          result.push(key);
        }
      }
      return result;
    }
    function baseRest(func, start) {
      start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
      return function() {
        var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
        while (++index < length) {
          array[index] = args[start + index];
        }
        index = -1;
        var otherArgs = Array(start + 1);
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = array;
        return apply(func, this, otherArgs);
      };
    }
    function copyObject(source, props, object, customizer) {
      object || (object = {});
      var index = -1, length = props.length;
      while (++index < length) {
        var key = props[index];
        var newValue = customizer ? customizer(object[key], source[key], key, object, source) : void 0;
        assignValue(object, key, newValue === void 0 ? source[key] : newValue);
      }
      return object;
    }
    function createAssigner(assigner) {
      return baseRest(function(object, sources) {
        var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
        customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
        if (guard && isIterateeCall(sources[0], sources[1], guard)) {
          customizer = length < 3 ? void 0 : customizer;
          length = 1;
        }
        object = Object(object);
        while (++index < length) {
          var source = sources[index];
          if (source) {
            assigner(object, source, index, customizer);
          }
        }
        return object;
      });
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
        return eq(object[index], value);
      }
      return false;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function nativeKeysIn(object) {
      var result = [];
      if (object != null) {
        for (var key in Object(object)) {
          result.push(key);
        }
      }
      return result;
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
      copyObject(source, keysIn(source), object, customizer);
    });
    var defaults = baseRest(function(args) {
      args.push(void 0, assignInDefaults);
      return apply(assignInWith, void 0, args);
    });
    function keysIn(object) {
      return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
    }
    module2.exports = defaults;
  }
});

// node_modules/nth-check/parse.js
var require_parse2 = __commonJS({
  "node_modules/nth-check/parse.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = parse;
    var re_nthElement = /^([+\-]?\d*n)?\s*(?:([+\-]?)\s*(\d+))?$/;
    function parse(formula) {
      formula = formula.trim().toLowerCase();
      if (formula === "even") {
        return [2, 0];
      } else if (formula === "odd") {
        return [2, 1];
      } else {
        var parsed = formula.match(re_nthElement);
        if (!parsed) {
          throw new SyntaxError("n-th rule couldn't be parsed ('" + formula + "')");
        }
        var a;
        if (parsed[1]) {
          a = parseInt(parsed[1], 10);
          if (isNaN(a)) {
            if (parsed[1].charAt(0) === "-") a = -1;
            else a = 1;
          }
        } else a = 0;
        return [
          a,
          parsed[3] ? parseInt((parsed[2] || "") + parsed[3], 10) : 0
        ];
      }
    }
  }
});

// node_modules/boolbase/index.js
var require_boolbase = __commonJS({
  "node_modules/boolbase/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = {
      trueFunc: function trueFunc() {
        return true;
      },
      falseFunc: function falseFunc() {
        return false;
      }
    };
  }
});

// node_modules/nth-check/compile.js
var require_compile = __commonJS({
  "node_modules/nth-check/compile.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = compile;
    var BaseFuncs = require_boolbase();
    var trueFunc = BaseFuncs.trueFunc;
    var falseFunc = BaseFuncs.falseFunc;
    function compile(parsed) {
      var a = parsed[0], b = parsed[1] - 1;
      if (b < 0 && a <= 0) return falseFunc;
      if (a === -1) return function(pos) {
        return pos <= b;
      };
      if (a === 0) return function(pos) {
        return pos === b;
      };
      if (a === 1) return b < 0 ? trueFunc : function(pos) {
        return pos >= b;
      };
      var bMod = b % a;
      if (bMod < 0) bMod += a;
      if (a > 1) {
        return function(pos) {
          return pos >= b && pos % a === bMod;
        };
      }
      a *= -1;
      return function(pos) {
        return pos <= b && pos % a === bMod;
      };
    }
  }
});

// node_modules/nth-check/index.js
var require_nth_check = __commonJS({
  "node_modules/nth-check/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var parse = require_parse2();
    var compile = require_compile();
    module2.exports = function nthCheck(formula) {
      return compile(parse(formula));
    };
    module2.exports.parse = parse;
    module2.exports.compile = compile;
  }
});

// node_modules/css-select/lib/attributes.js
var require_attributes = __commonJS({
  "node_modules/css-select/lib/attributes.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var DomUtils = require_domutils();
    var hasAttrib = DomUtils.hasAttrib;
    var getAttributeValue = DomUtils.getAttributeValue;
    var falseFunc = require_boolbase().falseFunc;
    var reChars = /[-[\]{}()*+?.,\\^$|#\s]/g;
    var attributeRules = {
      __proto__: null,
      equals: function(next, data) {
        var name2 = data.name, value = data.value;
        if (data.ignoreCase) {
          value = value.toLowerCase();
          return function equalsIC(elem) {
            var attr = getAttributeValue(elem, name2);
            return attr != null && attr.toLowerCase() === value && next(elem);
          };
        }
        return function equals(elem) {
          return getAttributeValue(elem, name2) === value && next(elem);
        };
      },
      hyphen: function(next, data) {
        var name2 = data.name, value = data.value, len = value.length;
        if (data.ignoreCase) {
          value = value.toLowerCase();
          return function hyphenIC(elem) {
            var attr = getAttributeValue(elem, name2);
            return attr != null && (attr.length === len || attr.charAt(len) === "-") && attr.substr(0, len).toLowerCase() === value && next(elem);
          };
        }
        return function hyphen(elem) {
          var attr = getAttributeValue(elem, name2);
          return attr != null && attr.substr(0, len) === value && (attr.length === len || attr.charAt(len) === "-") && next(elem);
        };
      },
      element: function(next, data) {
        var name2 = data.name, value = data.value;
        if (/\s/.test(value)) {
          return falseFunc;
        }
        value = value.replace(reChars, "\\$&");
        var pattern = "(?:^|\\s)" + value + "(?:$|\\s)", flags = data.ignoreCase ? "i" : "", regex = new RegExp(pattern, flags);
        return function element(elem) {
          var attr = getAttributeValue(elem, name2);
          return attr != null && regex.test(attr) && next(elem);
        };
      },
      exists: function(next, data) {
        var name2 = data.name;
        return function exists(elem) {
          return hasAttrib(elem, name2) && next(elem);
        };
      },
      start: function(next, data) {
        var name2 = data.name, value = data.value, len = value.length;
        if (len === 0) {
          return falseFunc;
        }
        if (data.ignoreCase) {
          value = value.toLowerCase();
          return function startIC(elem) {
            var attr = getAttributeValue(elem, name2);
            return attr != null && attr.substr(0, len).toLowerCase() === value && next(elem);
          };
        }
        return function start(elem) {
          var attr = getAttributeValue(elem, name2);
          return attr != null && attr.substr(0, len) === value && next(elem);
        };
      },
      end: function(next, data) {
        var name2 = data.name, value = data.value, len = -value.length;
        if (len === 0) {
          return falseFunc;
        }
        if (data.ignoreCase) {
          value = value.toLowerCase();
          return function endIC(elem) {
            var attr = getAttributeValue(elem, name2);
            return attr != null && attr.substr(len).toLowerCase() === value && next(elem);
          };
        }
        return function end(elem) {
          var attr = getAttributeValue(elem, name2);
          return attr != null && attr.substr(len) === value && next(elem);
        };
      },
      any: function(next, data) {
        var name2 = data.name, value = data.value;
        if (value === "") {
          return falseFunc;
        }
        if (data.ignoreCase) {
          var regex = new RegExp(value.replace(reChars, "\\$&"), "i");
          return function anyIC(elem) {
            var attr = getAttributeValue(elem, name2);
            return attr != null && regex.test(attr) && next(elem);
          };
        }
        return function any(elem) {
          var attr = getAttributeValue(elem, name2);
          return attr != null && attr.indexOf(value) >= 0 && next(elem);
        };
      },
      not: function(next, data) {
        var name2 = data.name, value = data.value;
        if (value === "") {
          return function notEmpty(elem) {
            return !!getAttributeValue(elem, name2) && next(elem);
          };
        } else if (data.ignoreCase) {
          value = value.toLowerCase();
          return function notIC(elem) {
            var attr = getAttributeValue(elem, name2);
            return attr != null && attr.toLowerCase() !== value && next(elem);
          };
        }
        return function not(elem) {
          return getAttributeValue(elem, name2) !== value && next(elem);
        };
      }
    };
    module2.exports = {
      compile: function(next, data, options) {
        if (options && options.strict && (data.ignoreCase || data.action === "not")) throw SyntaxError("Unsupported attribute selector");
        return attributeRules[data.action](next, data);
      },
      rules: attributeRules
    };
  }
});

// node_modules/css-select/lib/pseudos.js
var require_pseudos = __commonJS({
  "node_modules/css-select/lib/pseudos.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var DomUtils = require_domutils();
    var isTag = DomUtils.isTag;
    var getText = DomUtils.getText;
    var getParent = DomUtils.getParent;
    var getChildren = DomUtils.getChildren;
    var getSiblings = DomUtils.getSiblings;
    var hasAttrib = DomUtils.hasAttrib;
    var getName = DomUtils.getName;
    var getAttribute = DomUtils.getAttributeValue;
    var getNCheck = require_nth_check();
    var checkAttrib = require_attributes().rules.equals;
    var BaseFuncs = require_boolbase();
    var trueFunc = BaseFuncs.trueFunc;
    var falseFunc = BaseFuncs.falseFunc;
    function getFirstElement(elems) {
      for (var i = 0; elems && i < elems.length; i++) {
        if (isTag(elems[i])) return elems[i];
      }
    }
    function getAttribFunc(name2, value) {
      var data = { name: name2, value };
      return function attribFunc(next) {
        return checkAttrib(next, data);
      };
    }
    function getChildFunc(next) {
      return function(elem) {
        return !!getParent(elem) && next(elem);
      };
    }
    var filters = {
      contains: function(next, text) {
        return function contains(elem) {
          return next(elem) && getText(elem).indexOf(text) >= 0;
        };
      },
      icontains: function(next, text) {
        var itext = text.toLowerCase();
        return function icontains(elem) {
          return next(elem) && getText(elem).toLowerCase().indexOf(itext) >= 0;
        };
      },
      //location specific methods
      "nth-child": function(next, rule) {
        var func = getNCheck(rule);
        if (func === falseFunc) return func;
        if (func === trueFunc) return getChildFunc(next);
        return function nthChild(elem) {
          var siblings = getSiblings(elem);
          for (var i = 0, pos = 0; i < siblings.length; i++) {
            if (isTag(siblings[i])) {
              if (siblings[i] === elem) break;
              else pos++;
            }
          }
          return func(pos) && next(elem);
        };
      },
      "nth-last-child": function(next, rule) {
        var func = getNCheck(rule);
        if (func === falseFunc) return func;
        if (func === trueFunc) return getChildFunc(next);
        return function nthLastChild(elem) {
          var siblings = getSiblings(elem);
          for (var pos = 0, i = siblings.length - 1; i >= 0; i--) {
            if (isTag(siblings[i])) {
              if (siblings[i] === elem) break;
              else pos++;
            }
          }
          return func(pos) && next(elem);
        };
      },
      "nth-of-type": function(next, rule) {
        var func = getNCheck(rule);
        if (func === falseFunc) return func;
        if (func === trueFunc) return getChildFunc(next);
        return function nthOfType(elem) {
          var siblings = getSiblings(elem);
          for (var pos = 0, i = 0; i < siblings.length; i++) {
            if (isTag(siblings[i])) {
              if (siblings[i] === elem) break;
              if (getName(siblings[i]) === getName(elem)) pos++;
            }
          }
          return func(pos) && next(elem);
        };
      },
      "nth-last-of-type": function(next, rule) {
        var func = getNCheck(rule);
        if (func === falseFunc) return func;
        if (func === trueFunc) return getChildFunc(next);
        return function nthLastOfType(elem) {
          var siblings = getSiblings(elem);
          for (var pos = 0, i = siblings.length - 1; i >= 0; i--) {
            if (isTag(siblings[i])) {
              if (siblings[i] === elem) break;
              if (getName(siblings[i]) === getName(elem)) pos++;
            }
          }
          return func(pos) && next(elem);
        };
      },
      //TODO determine the actual root element
      root: function(next) {
        return function(elem) {
          return !getParent(elem) && next(elem);
        };
      },
      scope: function(next, rule, options, context) {
        if (!context || context.length === 0) {
          return filters.root(next);
        }
        if (context.length === 1) {
          return function(elem) {
            return context[0] === elem && next(elem);
          };
        }
        return function(elem) {
          return context.indexOf(elem) >= 0 && next(elem);
        };
      },
      //jQuery extensions (others follow as pseudos)
      checkbox: getAttribFunc("type", "checkbox"),
      file: getAttribFunc("type", "file"),
      password: getAttribFunc("type", "password"),
      radio: getAttribFunc("type", "radio"),
      reset: getAttribFunc("type", "reset"),
      image: getAttribFunc("type", "image"),
      submit: getAttribFunc("type", "submit")
    };
    var pseudos = {
      empty: function(elem) {
        return !getChildren(elem).some(function(elem2) {
          return isTag(elem2) || elem2.type === "text";
        });
      },
      "first-child": function(elem) {
        return getFirstElement(getSiblings(elem)) === elem;
      },
      "last-child": function(elem) {
        var siblings = getSiblings(elem);
        for (var i = siblings.length - 1; i >= 0; i--) {
          if (siblings[i] === elem) return true;
          if (isTag(siblings[i])) break;
        }
        return false;
      },
      "first-of-type": function(elem) {
        var siblings = getSiblings(elem);
        for (var i = 0; i < siblings.length; i++) {
          if (isTag(siblings[i])) {
            if (siblings[i] === elem) return true;
            if (getName(siblings[i]) === getName(elem)) break;
          }
        }
        return false;
      },
      "last-of-type": function(elem) {
        var siblings = getSiblings(elem);
        for (var i = siblings.length - 1; i >= 0; i--) {
          if (isTag(siblings[i])) {
            if (siblings[i] === elem) return true;
            if (getName(siblings[i]) === getName(elem)) break;
          }
        }
        return false;
      },
      "only-of-type": function(elem) {
        var siblings = getSiblings(elem);
        for (var i = 0, j = siblings.length; i < j; i++) {
          if (isTag(siblings[i])) {
            if (siblings[i] === elem) continue;
            if (getName(siblings[i]) === getName(elem)) return false;
          }
        }
        return true;
      },
      "only-child": function(elem) {
        var siblings = getSiblings(elem);
        for (var i = 0; i < siblings.length; i++) {
          if (isTag(siblings[i]) && siblings[i] !== elem) return false;
        }
        return true;
      },
      //:matches(a, area, link)[href]
      link: function(elem) {
        return hasAttrib(elem, "href");
      },
      visited: falseFunc,
      //seems to be a valid implementation
      //TODO: :any-link once the name is finalized (as an alias of :link)
      //forms
      //to consider: :target
      //:matches([selected], select:not([multiple]):not(> option[selected]) > option:first-of-type)
      selected: function(elem) {
        if (hasAttrib(elem, "selected")) return true;
        else if (getName(elem) !== "option") return false;
        var parent = getParent(elem);
        if (!parent || getName(parent) !== "select" || hasAttrib(parent, "multiple")) return false;
        var siblings = getChildren(parent), sawElem = false;
        for (var i = 0; i < siblings.length; i++) {
          if (isTag(siblings[i])) {
            if (siblings[i] === elem) {
              sawElem = true;
            } else if (!sawElem) {
              return false;
            } else if (hasAttrib(siblings[i], "selected")) {
              return false;
            }
          }
        }
        return sawElem;
      },
      //https://html.spec.whatwg.org/multipage/scripting.html#disabled-elements
      //:matches(
      //  :matches(button, input, select, textarea, menuitem, optgroup, option)[disabled],
      //  optgroup[disabled] > option),
      // fieldset[disabled] * //TODO not child of first <legend>
      //)
      disabled: function(elem) {
        return hasAttrib(elem, "disabled");
      },
      enabled: function(elem) {
        return !hasAttrib(elem, "disabled");
      },
      //:matches(:matches(:radio, :checkbox)[checked], :selected) (TODO menuitem)
      checked: function(elem) {
        return hasAttrib(elem, "checked") || pseudos.selected(elem);
      },
      //:matches(input, select, textarea)[required]
      required: function(elem) {
        return hasAttrib(elem, "required");
      },
      //:matches(input, select, textarea):not([required])
      optional: function(elem) {
        return !hasAttrib(elem, "required");
      },
      //jQuery extensions
      //:not(:empty)
      parent: function(elem) {
        return !pseudos.empty(elem);
      },
      //:matches(h1, h2, h3, h4, h5, h6)
      header: function(elem) {
        var name2 = getName(elem);
        return name2 === "h1" || name2 === "h2" || name2 === "h3" || name2 === "h4" || name2 === "h5" || name2 === "h6";
      },
      //:matches(button, input[type=button])
      button: function(elem) {
        var name2 = getName(elem);
        return name2 === "button" || name2 === "input" && getAttribute(elem, "type") === "button";
      },
      //:matches(input, textarea, select, button)
      input: function(elem) {
        var name2 = getName(elem);
        return name2 === "input" || name2 === "textarea" || name2 === "select" || name2 === "button";
      },
      //input:matches(:not([type!='']), [type='text' i])
      text: function(elem) {
        var attr;
        return getName(elem) === "input" && (!(attr = getAttribute(elem, "type")) || attr.toLowerCase() === "text");
      }
    };
    function verifyArgs(func, name2, subselect) {
      if (subselect === null) {
        if (func.length > 1 && name2 !== "scope") {
          throw new SyntaxError("pseudo-selector :" + name2 + " requires an argument");
        }
      } else {
        if (func.length === 1) {
          throw new SyntaxError("pseudo-selector :" + name2 + " doesn't have any arguments");
        }
      }
    }
    var re_CSS3 = /^(?:(?:nth|last|first|only)-(?:child|of-type)|root|empty|(?:en|dis)abled|checked|not)$/;
    module2.exports = {
      compile: function(next, data, options, context) {
        var name2 = data.name, subselect = data.data;
        if (options && options.strict && !re_CSS3.test(name2)) {
          throw SyntaxError(":" + name2 + " isn't part of CSS3");
        }
        if (typeof filters[name2] === "function") {
          verifyArgs(filters[name2], name2, subselect);
          return filters[name2](next, subselect, options, context);
        } else if (typeof pseudos[name2] === "function") {
          var func = pseudos[name2];
          verifyArgs(func, name2, subselect);
          if (next === trueFunc) return func;
          return function pseudoArgs(elem) {
            return func(elem, subselect) && next(elem);
          };
        } else {
          throw new SyntaxError("unmatched pseudo-class :" + name2);
        }
      },
      filters,
      pseudos
    };
  }
});

// node_modules/css-what/index.js
var require_css_what = __commonJS({
  "node_modules/css-what/index.js"(exports6, module2) {
    "use strict";
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = parse;
    var re_name = /^(?:\\.|[\w\-\u00b0-\uFFFF])+/;
    var re_escape = /\\([\da-f]{1,6}\s?|(\s)|.)/ig;
    var re_attr = /^\s*((?:\\.|[\w\u00b0-\uFFFF\-])+)\s*(?:(\S?)=\s*(?:(['"])([^]*?)\3|(#?(?:\\.|[\w\u00b0-\uFFFF\-])*)|)|)\s*(i)?\]/;
    var actionTypes = {
      __proto__: null,
      "undefined": "exists",
      "": "equals",
      "~": "element",
      "^": "start",
      "$": "end",
      "*": "any",
      "!": "not",
      "|": "hyphen"
    };
    var simpleSelectors = {
      __proto__: null,
      ">": "child",
      "<": "parent",
      "~": "sibling",
      "+": "adjacent"
    };
    var attribSelectors = {
      __proto__: null,
      "#": ["id", "equals"],
      ".": ["class", "element"]
    };
    var unpackPseudos = {
      __proto__: null,
      "has": true,
      "not": true,
      "matches": true
    };
    var stripQuotesFromPseudos = {
      __proto__: null,
      "contains": true,
      "icontains": true
    };
    var quotes = {
      __proto__: null,
      '"': true,
      "'": true
    };
    function funescape(_, escaped, escapedWhitespace) {
      var high = "0x" + escaped - 65536;
      return high !== high || escapedWhitespace ? escaped : (
        // BMP codepoint
        high < 0 ? String.fromCharCode(high + 65536) : (
          // Supplemental Plane codepoint (surrogate pair)
          String.fromCharCode(high >> 10 | 55296, high & 1023 | 56320)
        )
      );
    }
    function unescapeCSS(str) {
      return str.replace(re_escape, funescape);
    }
    function isWhitespace(c) {
      return c === " " || c === "\n" || c === "	" || c === "\f" || c === "\r";
    }
    function parse(selector, options) {
      var subselects = [];
      selector = parseSelector(subselects, selector + "", options);
      if (selector !== "") {
        throw new SyntaxError("Unmatched selector: " + selector);
      }
      return subselects;
    }
    function parseSelector(subselects, selector, options) {
      var tokens = [], sawWS = false, data, firstChar, name2, quot;
      function getName() {
        var sub = selector.match(re_name)[0];
        selector = selector.substr(sub.length);
        return unescapeCSS(sub);
      }
      function stripWhitespace(start) {
        while (isWhitespace(selector.charAt(start))) start++;
        selector = selector.substr(start);
      }
      function isEscaped(pos2) {
        var slashCount = 0;
        while (selector.charAt(--pos2) === "\\") slashCount++;
        return (slashCount & 1) === 1;
      }
      stripWhitespace(0);
      while (selector !== "") {
        firstChar = selector.charAt(0);
        if (isWhitespace(firstChar)) {
          sawWS = true;
          stripWhitespace(1);
        } else if (firstChar in simpleSelectors) {
          tokens.push({ type: simpleSelectors[firstChar] });
          sawWS = false;
          stripWhitespace(1);
        } else if (firstChar === ",") {
          if (tokens.length === 0) {
            throw new SyntaxError("empty sub-selector");
          }
          subselects.push(tokens);
          tokens = [];
          sawWS = false;
          stripWhitespace(1);
        } else {
          if (sawWS) {
            if (tokens.length > 0) {
              tokens.push({ type: "descendant" });
            }
            sawWS = false;
          }
          if (firstChar === "*") {
            selector = selector.substr(1);
            tokens.push({ type: "universal" });
          } else if (firstChar in attribSelectors) {
            selector = selector.substr(1);
            tokens.push({
              type: "attribute",
              name: attribSelectors[firstChar][0],
              action: attribSelectors[firstChar][1],
              value: getName(),
              ignoreCase: false
            });
          } else if (firstChar === "[") {
            selector = selector.substr(1);
            data = selector.match(re_attr);
            if (!data) {
              throw new SyntaxError("Malformed attribute selector: " + selector);
            }
            selector = selector.substr(data[0].length);
            name2 = unescapeCSS(data[1]);
            if (!options || ("lowerCaseAttributeNames" in options ? options.lowerCaseAttributeNames : !options.xmlMode)) {
              name2 = name2.toLowerCase();
            }
            tokens.push({
              type: "attribute",
              name: name2,
              action: actionTypes[data[2]],
              value: unescapeCSS(data[4] || data[5] || ""),
              ignoreCase: !!data[6]
            });
          } else if (firstChar === ":") {
            if (selector.charAt(1) === ":") {
              selector = selector.substr(2);
              tokens.push({ type: "pseudo-element", name: getName().toLowerCase() });
              continue;
            }
            selector = selector.substr(1);
            name2 = getName().toLowerCase();
            data = null;
            if (selector.charAt(0) === "(") {
              if (name2 in unpackPseudos) {
                quot = selector.charAt(1);
                var quoted = quot in quotes;
                selector = selector.substr(quoted + 1);
                data = [];
                selector = parseSelector(data, selector, options);
                if (quoted) {
                  if (selector.charAt(0) !== quot) {
                    throw new SyntaxError("unmatched quotes in :" + name2);
                  } else {
                    selector = selector.substr(1);
                  }
                }
                if (selector.charAt(0) !== ")") {
                  throw new SyntaxError("missing closing parenthesis in :" + name2 + " " + selector);
                }
                selector = selector.substr(1);
              } else {
                var pos = 1, counter = 1;
                for (; counter > 0 && pos < selector.length; pos++) {
                  if (selector.charAt(pos) === "(" && !isEscaped(pos)) counter++;
                  else if (selector.charAt(pos) === ")" && !isEscaped(pos)) counter--;
                }
                if (counter) {
                  throw new SyntaxError("parenthesis not matched");
                }
                data = selector.substr(1, pos - 2);
                selector = selector.substr(pos);
                if (name2 in stripQuotesFromPseudos) {
                  quot = data.charAt(0);
                  if (quot === data.slice(-1) && quot in quotes) {
                    data = data.slice(1, -1);
                  }
                  data = unescapeCSS(data);
                }
              }
            }
            tokens.push({ type: "pseudo", name: name2, data });
          } else if (re_name.test(selector)) {
            name2 = getName();
            if (!options || ("lowerCaseTags" in options ? options.lowerCaseTags : !options.xmlMode)) {
              name2 = name2.toLowerCase();
            }
            tokens.push({ type: "tag", name: name2 });
          } else {
            if (tokens.length && tokens[tokens.length - 1].type === "descendant") {
              tokens.pop();
            }
            addToken(subselects, tokens);
            return selector;
          }
        }
      }
      addToken(subselects, tokens);
      return selector;
    }
    function addToken(subselects, tokens) {
      if (subselects.length > 0 && tokens.length === 0) {
        throw new SyntaxError("empty sub-selector");
      }
      subselects.push(tokens);
    }
  }
});

// node_modules/css-select/lib/general.js
var require_general = __commonJS({
  "node_modules/css-select/lib/general.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var DomUtils = require_domutils();
    var isTag = DomUtils.isTag;
    var getParent = DomUtils.getParent;
    var getChildren = DomUtils.getChildren;
    var getSiblings = DomUtils.getSiblings;
    var getName = DomUtils.getName;
    module2.exports = {
      __proto__: null,
      attribute: require_attributes().compile,
      pseudo: require_pseudos().compile,
      //tags
      tag: function(next, data) {
        var name2 = data.name;
        return function tag(elem) {
          return getName(elem) === name2 && next(elem);
        };
      },
      //traversal
      descendant: function(next, rule, options, context, acceptSelf) {
        return function descendant(elem) {
          if (acceptSelf && next(elem)) return true;
          var found = false;
          while (!found && (elem = getParent(elem))) {
            found = next(elem);
          }
          return found;
        };
      },
      parent: function(next, data, options) {
        if (options && options.strict) throw SyntaxError("Parent selector isn't part of CSS3");
        return function parent(elem) {
          return getChildren(elem).some(test);
        };
        function test(elem) {
          return isTag(elem) && next(elem);
        }
      },
      child: function(next) {
        return function child(elem) {
          var parent = getParent(elem);
          return !!parent && next(parent);
        };
      },
      sibling: function(next) {
        return function sibling(elem) {
          var siblings = getSiblings(elem);
          for (var i = 0; i < siblings.length; i++) {
            if (isTag(siblings[i])) {
              if (siblings[i] === elem) break;
              if (next(siblings[i])) return true;
            }
          }
          return false;
        };
      },
      adjacent: function(next) {
        return function adjacent(elem) {
          var siblings = getSiblings(elem), lastElement;
          for (var i = 0; i < siblings.length; i++) {
            if (isTag(siblings[i])) {
              if (siblings[i] === elem) break;
              lastElement = siblings[i];
            }
          }
          return !!lastElement && next(lastElement);
        };
      },
      universal: function(next) {
        return next;
      }
    };
  }
});

// node_modules/css-select/lib/procedure.json
var require_procedure = __commonJS({
  "node_modules/css-select/lib/procedure.json"(exports6, module2) {
    module2.exports = {
      universal: 50,
      tag: 30,
      attribute: 1,
      pseudo: 0,
      descendant: -1,
      child: -1,
      parent: -1,
      sibling: -1,
      adjacent: -1
    };
  }
});

// node_modules/css-select/lib/sort.js
var require_sort = __commonJS({
  "node_modules/css-select/lib/sort.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = sortByProcedure;
    var procedure = require_procedure();
    var attributes = {
      __proto__: null,
      exists: 10,
      equals: 8,
      not: 7,
      start: 6,
      end: 6,
      any: 5,
      hyphen: 4,
      element: 4
    };
    function sortByProcedure(arr) {
      var procs = arr.map(getProcedure);
      for (var i = 1; i < arr.length; i++) {
        var procNew = procs[i];
        if (procNew < 0) continue;
        for (var j = i - 1; j >= 0 && procNew < procs[j]; j--) {
          var token = arr[j + 1];
          arr[j + 1] = arr[j];
          arr[j] = token;
          procs[j + 1] = procs[j];
          procs[j] = procNew;
        }
      }
    }
    function getProcedure(token) {
      var proc = procedure[token.type];
      if (proc === procedure.attribute) {
        proc = attributes[token.action];
        if (proc === attributes.equals && token.name === "id") {
          proc = 9;
        }
        if (token.ignoreCase) {
          proc >>= 1;
        }
      } else if (proc === procedure.pseudo) {
        if (!token.data) {
          proc = 3;
        } else if (token.name === "has" || token.name === "contains") {
          proc = 0;
        } else if (token.name === "matches" || token.name === "not") {
          proc = 0;
          for (var i = 0; i < token.data.length; i++) {
            if (token.data[i].length !== 1) continue;
            var cur = getProcedure(token.data[i][0]);
            if (cur === 0) {
              proc = 0;
              break;
            }
            if (cur > proc) proc = cur;
          }
          if (token.data.length > 1 && proc > 0) proc -= 1;
        } else {
          proc = 1;
        }
      }
      return proc;
    }
  }
});

// node_modules/css-select/lib/compile.js
var require_compile2 = __commonJS({
  "node_modules/css-select/lib/compile.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = compile;
    module2.exports.compileUnsafe = compileUnsafe;
    module2.exports.compileToken = compileToken;
    var parse = require_css_what();
    var DomUtils = require_domutils();
    var isTag = DomUtils.isTag;
    var Rules = require_general();
    var sortRules = require_sort();
    var BaseFuncs = require_boolbase();
    var trueFunc = BaseFuncs.trueFunc;
    var falseFunc = BaseFuncs.falseFunc;
    var procedure = require_procedure();
    function compile(selector, options, context) {
      var next = compileUnsafe(selector, options, context);
      return wrap(next);
    }
    function wrap(next) {
      return function base(elem) {
        return isTag(elem) && next(elem);
      };
    }
    function compileUnsafe(selector, options, context) {
      var token = parse(selector, options);
      return compileToken(token, options, context);
    }
    function includesScopePseudo(t) {
      return t.type === "pseudo" && (t.name === "scope" || Array.isArray(t.data) && t.data.some(function(data) {
        return data.some(includesScopePseudo);
      }));
    }
    var DESCENDANT_TOKEN = { type: "descendant" };
    var SCOPE_TOKEN = { type: "pseudo", name: "scope" };
    var PLACEHOLDER_ELEMENT = {};
    var getParent = DomUtils.getParent;
    function absolutize(token, context) {
      var hasContext = !!context && !!context.length && context.every(function(e) {
        return e === PLACEHOLDER_ELEMENT || !!getParent(e);
      });
      token.forEach(function(t) {
        if (t.length > 0 && isTraversal(t[0]) && t[0].type !== "descendant") {
        } else if (hasContext && !includesScopePseudo(t)) {
          t.unshift(DESCENDANT_TOKEN);
        } else {
          return;
        }
        t.unshift(SCOPE_TOKEN);
      });
    }
    function compileToken(token, options, context) {
      token = token.filter(function(t) {
        return t.length > 0;
      });
      token.forEach(sortRules);
      var isArrayContext = Array.isArray(context);
      context = options && options.context || context;
      if (context && !isArrayContext) context = [context];
      absolutize(token, context);
      return token.map(function(rules) {
        return compileRules(rules, options, context, isArrayContext);
      }).reduce(reduceRules, falseFunc);
    }
    function isTraversal(t) {
      return procedure[t.type] < 0;
    }
    function compileRules(rules, options, context, isArrayContext) {
      var acceptSelf = isArrayContext && rules[0].name === "scope" && rules[1].type === "descendant";
      return rules.reduce(function(func, rule, index) {
        if (func === falseFunc) return func;
        return Rules[rule.type](func, rule, options, context, acceptSelf && index === 1);
      }, options && options.rootFunc || trueFunc);
    }
    function reduceRules(a, b) {
      if (b === falseFunc || a === trueFunc) {
        return a;
      }
      if (a === falseFunc || b === trueFunc) {
        return b;
      }
      return function combine(elem) {
        return a(elem) || b(elem);
      };
    }
    var Pseudos = require_pseudos();
    var filters = Pseudos.filters;
    var existsOne = DomUtils.existsOne;
    var isTag = DomUtils.isTag;
    var getChildren = DomUtils.getChildren;
    function containsTraversal(t) {
      return t.some(isTraversal);
    }
    filters.not = function(next, token, options, context) {
      var opts = {
        xmlMode: !!(options && options.xmlMode),
        strict: !!(options && options.strict)
      };
      if (opts.strict) {
        if (token.length > 1 || token.some(containsTraversal)) {
          throw new SyntaxError("complex selectors in :not aren't allowed in strict mode");
        }
      }
      var func = compileToken(token, opts, context);
      if (func === falseFunc) return next;
      if (func === trueFunc) return falseFunc;
      return function(elem) {
        return !func(elem) && next(elem);
      };
    };
    filters.has = function(next, token, options) {
      var opts = {
        xmlMode: !!(options && options.xmlMode),
        strict: !!(options && options.strict)
      };
      var context = token.some(containsTraversal) ? [PLACEHOLDER_ELEMENT] : null;
      var func = compileToken(token, opts, context);
      if (func === falseFunc) return falseFunc;
      if (func === trueFunc) return function(elem) {
        return getChildren(elem).some(isTag) && next(elem);
      };
      func = wrap(func);
      if (context) {
        return function has(elem) {
          return next(elem) && (context[0] = elem, existsOne(func, getChildren(elem)));
        };
      }
      return function has(elem) {
        return next(elem) && existsOne(func, getChildren(elem));
      };
    };
    filters.matches = function(next, token, options, context) {
      var opts = {
        xmlMode: !!(options && options.xmlMode),
        strict: !!(options && options.strict),
        rootFunc: next
      };
      return compileToken(token, opts, context);
    };
  }
});

// node_modules/css-select/index.js
var require_css_select = __commonJS({
  "node_modules/css-select/index.js"(exports6, module2) {
    "use strict";
    init_dirname();
    init_buffer2();
    init_process2();
    module2.exports = CSSselect;
    var Pseudos = require_pseudos();
    var DomUtils = require_domutils();
    var findOne = DomUtils.findOne;
    var findAll = DomUtils.findAll;
    var getChildren = DomUtils.getChildren;
    var removeSubsets = DomUtils.removeSubsets;
    var falseFunc = require_boolbase().falseFunc;
    var compile = require_compile2();
    var compileUnsafe = compile.compileUnsafe;
    var compileToken = compile.compileToken;
    function getSelectorFunc(searchFunc) {
      return function select(query, elems, options) {
        if (typeof query !== "function") query = compileUnsafe(query, options, elems);
        if (!Array.isArray(elems)) elems = getChildren(elems);
        else elems = removeSubsets(elems);
        return searchFunc(query, elems);
      };
    }
    var selectAll = getSelectorFunc(function selectAll2(query, elems) {
      return query === falseFunc || !elems || elems.length === 0 ? [] : findAll(query, elems);
    });
    var selectOne = getSelectorFunc(function selectOne2(query, elems) {
      return query === falseFunc || !elems || elems.length === 0 ? null : findOne(query, elems);
    });
    function is(elem, query, options) {
      return (typeof query === "function" ? query : compile(query, options))(elem);
    }
    function CSSselect(query, elems, options) {
      return selectAll(query, elems, options);
    }
    CSSselect.compile = compile;
    CSSselect.filters = Pseudos.filters;
    CSSselect.pseudos = Pseudos.pseudos;
    CSSselect.selectAll = selectAll;
    CSSselect.selectOne = selectOne;
    CSSselect.is = is;
    CSSselect.parse = compile;
    CSSselect.iterate = selectAll;
    CSSselect._compileUnsafe = compileUnsafe;
    CSSselect._compileToken = compileToken;
  }
});

// node_modules/lodash.merge/index.js
var require_lodash5 = __commonJS({
  "node_modules/lodash.merge/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var LARGE_ARRAY_SIZE = 200;
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var HOT_COUNT = 800;
    var HOT_SPAN = 16;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var asyncTag = "[object AsyncFunction]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var nullTag = "[object Null]";
    var objectTag = "[object Object]";
    var proxyTag = "[object Proxy]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var undefinedTag = "[object Undefined]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports6 == "object" && exports6 && !exports6.nodeType && exports6;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        var types = freeModule && freeModule.require && freeModule.require("util").types;
        if (types) {
          return types;
        }
        return freeProcess && freeProcess.binding && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function apply(func, thisArg, args) {
      switch (args.length) {
        case 0:
          return func.call(thisArg);
        case 1:
          return func.call(thisArg, args[0]);
        case 2:
          return func.call(thisArg, args[0], args[1]);
        case 3:
          return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var funcToString = funcProto.toString;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var nativeObjectToString = objectProto.toString;
    var objectCtorString = funcToString.call(Object);
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Buffer3 = moduleExports ? root.Buffer : void 0;
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var allocUnsafe = Buffer3 ? Buffer3.allocUnsafe : void 0;
    var getPrototype = overArg(Object.getPrototypeOf, Object);
    var objectCreate = Object.create;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    var defineProperty = (function() {
      try {
        var func = getNative(Object, "defineProperty");
        func({}, "", {});
        return func;
      } catch (e) {
      }
    })();
    var nativeIsBuffer = Buffer3 ? Buffer3.isBuffer : void 0;
    var nativeMax = Math.max;
    var nativeNow = Date.now;
    var Map = getNative(root, "Map");
    var nativeCreate = getNative(Object, "create");
    var baseCreate = /* @__PURE__ */ (function() {
      function object() {
      }
      return function(proto) {
        if (!isObject(proto)) {
          return {};
        }
        if (objectCreate) {
          return objectCreate(proto);
        }
        object.prototype = proto;
        var result = new object();
        object.prototype = void 0;
        return result;
      };
    })();
    function Hash(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty2.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty2.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      var result = getMapData(this, key)["delete"](key);
      this.size -= result ? 1 : 0;
      return result;
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      var data = getMapData(this, key), size = data.size;
      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function Stack(entries) {
      var data = this.__data__ = new ListCache(entries);
      this.size = data.size;
    }
    function stackClear() {
      this.__data__ = new ListCache();
      this.size = 0;
    }
    function stackDelete(key) {
      var data = this.__data__, result = data["delete"](key);
      this.size = data.size;
      return result;
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var data = this.__data__;
      if (data instanceof ListCache) {
        var pairs = data.__data__;
        if (!Map || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          this.size = ++data.size;
          return this;
        }
        data = this.__data__ = new MapCache(pairs);
      }
      data.set(key, value);
      this.size = data.size;
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
        (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
        isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
        isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
        isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assignMergeValue(object, key, value) {
      if (value !== void 0 && !eq(object[key], value) || value === void 0 && !(key in object)) {
        baseAssignValue(object, key, value);
      }
    }
    function assignValue(object, key, value) {
      var objValue = object[key];
      if (!(hasOwnProperty2.call(object, key) && eq(objValue, value)) || value === void 0 && !(key in object)) {
        baseAssignValue(object, key, value);
      }
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    function baseAssignValue(object, key, value) {
      if (key == "__proto__" && defineProperty) {
        defineProperty(object, key, {
          "configurable": true,
          "enumerable": true,
          "value": value,
          "writable": true
        });
      } else {
        object[key] = value;
      }
    }
    var baseFor = createBaseFor();
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    function baseIsArguments(value) {
      return isObjectLike(value) && baseGetTag(value) == argsTag;
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
    }
    function baseKeysIn(object) {
      if (!isObject(object)) {
        return nativeKeysIn(object);
      }
      var isProto = isPrototype(object), result = [];
      for (var key in object) {
        if (!(key == "constructor" && (isProto || !hasOwnProperty2.call(object, key)))) {
          result.push(key);
        }
      }
      return result;
    }
    function baseMerge(object, source, srcIndex, customizer, stack) {
      if (object === source) {
        return;
      }
      baseFor(source, function(srcValue, key) {
        stack || (stack = new Stack());
        if (isObject(srcValue)) {
          baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
        } else {
          var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack) : void 0;
          if (newValue === void 0) {
            newValue = srcValue;
          }
          assignMergeValue(object, key, newValue);
        }
      }, keysIn);
    }
    function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
      var objValue = safeGet(object, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
      if (stacked) {
        assignMergeValue(object, key, stacked);
        return;
      }
      var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack) : void 0;
      var isCommon = newValue === void 0;
      if (isCommon) {
        var isArr = isArray(srcValue), isBuff = !isArr && isBuffer(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
        newValue = srcValue;
        if (isArr || isBuff || isTyped) {
          if (isArray(objValue)) {
            newValue = objValue;
          } else if (isArrayLikeObject(objValue)) {
            newValue = copyArray(objValue);
          } else if (isBuff) {
            isCommon = false;
            newValue = cloneBuffer(srcValue, true);
          } else if (isTyped) {
            isCommon = false;
            newValue = cloneTypedArray(srcValue, true);
          } else {
            newValue = [];
          }
        } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
          newValue = objValue;
          if (isArguments(objValue)) {
            newValue = toPlainObject(objValue);
          } else if (!isObject(objValue) || isFunction(objValue)) {
            newValue = initCloneObject(srcValue);
          }
        } else {
          isCommon = false;
        }
      }
      if (isCommon) {
        stack.set(srcValue, newValue);
        mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
        stack["delete"](srcValue);
      }
      assignMergeValue(object, key, newValue);
    }
    function baseRest(func, start) {
      return setToString(overRest(func, start, identity), func + "");
    }
    var baseSetToString = !defineProperty ? identity : function(func, string) {
      return defineProperty(func, "toString", {
        "configurable": true,
        "enumerable": false,
        "value": constant(string),
        "writable": true
      });
    };
    function cloneBuffer(buffer, isDeep) {
      if (isDeep) {
        return buffer.slice();
      }
      var length = buffer.length, result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
      buffer.copy(result);
      return result;
    }
    function cloneArrayBuffer(arrayBuffer) {
      var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
      new Uint8Array2(result).set(new Uint8Array2(arrayBuffer));
      return result;
    }
    function cloneTypedArray(typedArray, isDeep) {
      var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
      return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
    }
    function copyArray(source, array) {
      var index = -1, length = source.length;
      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }
    function copyObject(source, props, object, customizer) {
      var isNew = !object;
      object || (object = {});
      var index = -1, length = props.length;
      while (++index < length) {
        var key = props[index];
        var newValue = customizer ? customizer(object[key], source[key], key, object, source) : void 0;
        if (newValue === void 0) {
          newValue = source[key];
        }
        if (isNew) {
          baseAssignValue(object, key, newValue);
        } else {
          assignValue(object, key, newValue);
        }
      }
      return object;
    }
    function createAssigner(assigner) {
      return baseRest(function(object, sources) {
        var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
        customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
        if (guard && isIterateeCall(sources[0], sources[1], guard)) {
          customizer = length < 3 ? void 0 : customizer;
          length = 1;
        }
        object = Object(object);
        while (++index < length) {
          var source = sources[index];
          if (source) {
            assigner(object, source, index, customizer);
          }
        }
        return object;
      });
    }
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    function getRawTag(value) {
      var isOwn = hasOwnProperty2.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = true;
      } catch (e) {
      }
      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    function initCloneObject(object) {
      return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
    }
    function isIndex(value, length) {
      var type = typeof value;
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
        return eq(object[index], value);
      }
      return false;
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function nativeKeysIn(object) {
      var result = [];
      if (object != null) {
        for (var key in Object(object)) {
          result.push(key);
        }
      }
      return result;
    }
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
    function overRest(func, start, transform) {
      start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
      return function() {
        var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
        while (++index < length) {
          array[index] = args[start + index];
        }
        index = -1;
        var otherArgs = Array(start + 1);
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = transform(array);
        return apply(func, this, otherArgs);
      };
    }
    function safeGet(object, key) {
      if (key === "constructor" && typeof object[key] === "function") {
        return;
      }
      if (key == "__proto__") {
        return;
      }
      return object[key];
    }
    var setToString = shortOut(baseSetToString);
    function shortOut(func) {
      var count = 0, lastCalled = 0;
      return function() {
        var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
        lastCalled = stamp;
        if (remaining > 0) {
          if (++count >= HOT_COUNT) {
            return arguments[0];
          }
        } else {
          count = 0;
        }
        return func.apply(void 0, arguments);
      };
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
      return arguments;
    })()) ? baseIsArguments : function(value) {
      return isObjectLike(value) && hasOwnProperty2.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
    };
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    var isBuffer = nativeIsBuffer || stubFalse;
    function isFunction(value) {
      if (!isObject(value)) {
        return false;
      }
      var tag = baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    function isPlainObject(value) {
      if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
        return false;
      }
      var proto = getPrototype(value);
      if (proto === null) {
        return true;
      }
      var Ctor = hasOwnProperty2.call(proto, "constructor") && proto.constructor;
      return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function toPlainObject(value) {
      return copyObject(value, keysIn(value));
    }
    function keysIn(object) {
      return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
    }
    var merge = createAssigner(function(object, source, srcIndex) {
      baseMerge(object, source, srcIndex);
    });
    function constant(value) {
      return function() {
        return value;
      };
    }
    function identity(value) {
      return value;
    }
    function stubFalse() {
      return false;
    }
    module2.exports = merge;
  }
});

// node_modules/cheerio/lib/static.js
var require_static = __commonJS({
  "node_modules/cheerio/lib/static.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var serialize = require_dom_serializer();
    var select = require_css_select();
    var parse = require_parse();
    var _ = {
      merge: require_lodash5(),
      defaults: require_lodash4()
    };
    exports6.load = function(content, options) {
      var Cheerio = require_cheerio();
      options = _.defaults(options || {}, Cheerio.prototype.options);
      var root = parse(content, options);
      var initialize = function(selector, context, r, opts) {
        if (!(this instanceof initialize)) {
          return new initialize(selector, context, r, opts);
        }
        opts = _.defaults(opts || {}, options);
        return Cheerio.call(this, selector, context, r || root, opts);
      };
      initialize.prototype = Object.create(Cheerio.prototype);
      initialize.prototype.constructor = initialize;
      initialize.fn = initialize.prototype;
      initialize.prototype._originalRoot = root;
      _.merge(initialize, exports6);
      initialize._root = root;
      initialize._options = options;
      return initialize;
    };
    function render(that, dom, options) {
      if (!dom) {
        if (that._root && that._root.children) {
          dom = that._root.children;
        } else {
          return "";
        }
      } else if (typeof dom === "string") {
        dom = select(dom, that._root, options);
      }
      return serialize(dom, options);
    }
    exports6.html = function(dom, options) {
      var Cheerio = require_cheerio();
      if (Object.prototype.toString.call(dom) === "[object Object]" && !options && !("length" in dom) && !("type" in dom)) {
        options = dom;
        dom = void 0;
      }
      options = _.defaults(options || {}, this._options, Cheerio.prototype.options);
      return render(this, dom, options);
    };
    exports6.xml = function(dom) {
      var options = _.defaults({ xmlMode: true }, this._options);
      return render(this, dom, options);
    };
    exports6.text = function(elems) {
      if (!elems) {
        elems = this.root();
      }
      var ret = "", len = elems.length, elem;
      for (var i = 0; i < len; i++) {
        elem = elems[i];
        if (elem.type === "text") ret += elem.data;
        else if (elem.children && elem.type !== "comment") {
          ret += exports6.text(elem.children);
        }
      }
      return ret;
    };
    exports6.parseHTML = function(data, context, keepScripts) {
      var parsed;
      if (!data || typeof data !== "string") {
        return null;
      }
      if (typeof context === "boolean") {
        keepScripts = context;
      }
      parsed = this.load(data);
      if (!keepScripts) {
        parsed("script").remove();
      }
      return parsed.root()[0].children.slice();
    };
    exports6.root = function() {
      return this(this._root);
    };
    exports6.contains = function(container, contained) {
      if (contained === container) {
        return false;
      }
      while (contained && contained !== contained.parent) {
        contained = contained.parent;
        if (contained === container) {
          return true;
        }
      }
      return false;
    };
  }
});

// node_modules/lodash.some/index.js
var require_lodash6 = __commonJS({
  "node_modules/lodash.some/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var LARGE_ARRAY_SIZE = 200;
    var FUNC_ERROR_TEXT = "Expected a function";
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var UNORDERED_COMPARE_FLAG = 1;
    var PARTIAL_COMPARE_FLAG = 2;
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var objectTag = "[object Object]";
    var promiseTag = "[object Promise]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
    var reIsPlainProp = /^\w*$/;
    var reLeadingDot = /^\./;
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reEscapeChar = /\\(\\)?/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports6 == "object" && exports6 && !exports6.nodeType && exports6;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        return freeProcess && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function arraySome(array, predicate) {
      var index = -1, length = array ? array.length : 0;
      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }
    function baseProperty(key) {
      return function(object) {
        return object == null ? void 0 : object[key];
      };
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e) {
        }
      }
      return result;
    }
    function mapToArray(map) {
      var index = -1, result = Array(map.size);
      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set) {
      var index = -1, result = Array(set.size);
      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var funcToString = funcProto.toString;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView");
    var Map = getNative(root, "Map");
    var Promise2 = getNative(root, "Promise");
    var Set = getNative(root, "Set");
    var WeakMap = getNative(root, "WeakMap");
    var nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView);
    var mapCtorString = toSource(Map);
    var promiseCtorString = toSource(Promise2);
    var setCtorString = toSource(Set);
    var weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function Hash(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
    }
    function hashDelete(key) {
      return this.has(key) && delete this.__data__[key];
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty2.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty2.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      return getMapData(this, key)["delete"](key);
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      getMapData(this, key).set(key, value);
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function SetCache(values) {
      var index = -1, length = values ? values.length : 0;
      this.__data__ = new MapCache();
      while (++index < length) {
        this.add(values[index]);
      }
    }
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }
    function setCacheHas(value) {
      return this.__data__.has(value);
    }
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;
    function Stack(entries) {
      this.__data__ = new ListCache(entries);
    }
    function stackClear() {
      this.__data__ = new ListCache();
    }
    function stackDelete(key) {
      return this.__data__["delete"](key);
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var cache = this.__data__;
      if (cache instanceof ListCache) {
        var pairs = cache.__data__;
        if (!Map || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          return this;
        }
        cache = this.__data__ = new MapCache(pairs);
      }
      cache.set(key, value);
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    var baseEach = createBaseEach(baseForOwn);
    var baseFor = createBaseFor();
    function baseForOwn(object, iteratee) {
      return object && baseFor(object, iteratee, keys);
    }
    function baseGet(object, path) {
      path = isKey(path, object) ? [path] : castPath(path);
      var index = 0, length = path.length;
      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return index && index == length ? object : void 0;
    }
    function baseGetTag(value) {
      return objectToString.call(value);
    }
    function baseHasIn(object, key) {
      return object != null && key in Object(object);
    }
    function baseIsEqual(value, other, customizer, bitmask, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || !isObject(value) && !isObjectLike(other)) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
    }
    function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
      var objIsArr = isArray(object), othIsArr = isArray(other), objTag = arrayTag, othTag = arrayTag;
      if (!objIsArr) {
        objTag = getTag(object);
        objTag = objTag == argsTag ? objectTag : objTag;
      }
      if (!othIsArr) {
        othTag = getTag(other);
        othTag = othTag == argsTag ? objectTag : othTag;
      }
      var objIsObj = objTag == objectTag && !isHostObject(object), othIsObj = othTag == objectTag && !isHostObject(other), isSameTag = objTag == othTag;
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack());
        return objIsArr || isTypedArray(object) ? equalArrays(object, other, equalFunc, customizer, bitmask, stack) : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
      }
      if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
        var objIsWrapped = objIsObj && hasOwnProperty2.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty2.call(other, "__wrapped__");
        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
          stack || (stack = new Stack());
          return equalFunc(objUnwrapped, othUnwrapped, customizer, bitmask, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack());
      return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
    }
    function baseIsMatch(object, source, matchData, customizer) {
      var index = matchData.length, length = index, noCustomizer = !customizer;
      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (index--) {
        var data = matchData[index];
        if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
          return false;
        }
      }
      while (++index < length) {
        data = matchData[index];
        var key = data[0], objValue = object[key], srcValue = data[1];
        if (noCustomizer && data[2]) {
          if (objValue === void 0 && !(key in object)) {
            return false;
          }
        } else {
          var stack = new Stack();
          if (customizer) {
            var result = customizer(objValue, srcValue, key, object, source, stack);
          }
          if (!(result === void 0 ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack) : result)) {
            return false;
          }
        }
      }
      return true;
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
    }
    function baseIteratee(value) {
      if (typeof value == "function") {
        return value;
      }
      if (value == null) {
        return identity;
      }
      if (typeof value == "object") {
        return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
      }
      return property(value);
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty2.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function baseMatches(source) {
      var matchData = getMatchData(source);
      if (matchData.length == 1 && matchData[0][2]) {
        return matchesStrictComparable(matchData[0][0], matchData[0][1]);
      }
      return function(object) {
        return object === source || baseIsMatch(object, source, matchData);
      };
    }
    function baseMatchesProperty(path, srcValue) {
      if (isKey(path) && isStrictComparable(srcValue)) {
        return matchesStrictComparable(toKey(path), srcValue);
      }
      return function(object) {
        var objValue = get(object, path);
        return objValue === void 0 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, void 0, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
      };
    }
    function basePropertyDeep(path) {
      return function(object) {
        return baseGet(object, path);
      };
    }
    function baseSome(collection, predicate) {
      var result;
      baseEach(collection, function(value, index, collection2) {
        result = predicate(value, index, collection2);
        return !result;
      });
      return !!result;
    }
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function castPath(value) {
      return isArray(value) ? value : stringToPath(value);
    }
    function createBaseEach(eachFunc, fromRight) {
      return function(collection, iteratee) {
        if (collection == null) {
          return collection;
        }
        if (!isArrayLike(collection)) {
          return eachFunc(collection, iteratee);
        }
        var length = collection.length, index = fromRight ? length : -1, iterable = Object(collection);
        while (fromRight ? index-- : ++index < length) {
          if (iteratee(iterable[index], index, iterable) === false) {
            break;
          }
        }
        return collection;
      };
    }
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }
    function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, arrLength = array.length, othLength = other.length;
      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1, result = true, seen = bitmask & UNORDERED_COMPARE_FLAG ? new SetCache() : void 0;
      stack.set(array, other);
      stack.set(other, array);
      while (++index < arrLength) {
        var arrValue = array[index], othValue = other[index];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== void 0) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        if (seen) {
          if (!arraySome(other, function(othValue2, othIndex) {
            if (!seen.has(othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, customizer, bitmask, stack))) {
              return seen.add(othIndex);
            }
          })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
          result = false;
          break;
        }
      }
      stack["delete"](array);
      stack["delete"](other);
      return result;
    }
    function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
      switch (tag) {
        case dataViewTag:
          if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;
        case arrayBufferTag:
          if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
            return false;
          }
          return true;
        case boolTag:
        case dateTag:
        case numberTag:
          return eq(+object, +other);
        case errorTag:
          return object.name == other.name && object.message == other.message;
        case regexpTag:
        case stringTag:
          return object == other + "";
        case mapTag:
          var convert = mapToArray;
        case setTag:
          var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
          convert || (convert = setToArray);
          if (object.size != other.size && !isPartial) {
            return false;
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= UNORDERED_COMPARE_FLAG;
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask, stack);
          stack["delete"](object);
          return result;
        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }
    function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, objProps = keys(object), objLength = objProps.length, othProps = keys(other), othLength = othProps.length;
      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty2.call(other, key))) {
          return false;
        }
      }
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);
      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key], othValue = other[key];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
        }
        if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack) : compared)) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == "constructor");
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor, othCtor = other.constructor;
        if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack["delete"](object);
      stack["delete"](other);
      return result;
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getMatchData(object) {
      var result = keys(object), length = result.length;
      while (length--) {
        var key = result[length], value = object[key];
        result[length] = [key, value, isStrictComparable(value)];
      }
      return result;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map && getTag(new Map()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set && getTag(new Set()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = objectToString.call(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : void 0;
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function hasPath(object, path, hasFunc) {
      path = isKey(path, object) ? [path] : castPath(path);
      var result, index = -1, length = path.length;
      while (++index < length) {
        var key = toKey(path[index]);
        if (!(result = object != null && hasFunc(object, key))) {
          break;
        }
        object = object[key];
      }
      if (result) {
        return result;
      }
      var length = object ? object.length : 0;
      return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
        return eq(object[index], value);
      }
      return false;
    }
    function isKey(value, object) {
      if (isArray(value)) {
        return false;
      }
      var type = typeof value;
      if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function isStrictComparable(value) {
      return value === value && !isObject(value);
    }
    function matchesStrictComparable(key, srcValue) {
      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === srcValue && (srcValue !== void 0 || key in Object(object));
      };
    }
    var stringToPath = memoize(function(string) {
      string = toString(string);
      var result = [];
      if (reLeadingDot.test(string)) {
        result.push("");
      }
      string.replace(rePropName, function(match, number, quote, string2) {
        result.push(quote ? string2.replace(reEscapeChar, "$1") : number || match);
      });
      return result;
    });
    function toKey(value) {
      if (typeof value == "string" || isSymbol(value)) {
        return value;
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function some(collection, predicate, guard) {
      var func = isArray(collection) ? arraySome : baseSome;
      if (guard && isIterateeCall(collection, predicate, guard)) {
        predicate = void 0;
      }
      return func(collection, baseIteratee(predicate, 3));
    }
    function memoize(func, resolver) {
      if (typeof func != "function" || resolver && typeof resolver != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result);
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache)();
      return memoized;
    }
    memoize.Cache = MapCache;
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    function get(object, path, defaultValue) {
      var result = object == null ? void 0 : baseGet(object, path);
      return result === void 0 ? defaultValue : result;
    }
    function hasIn(object, path) {
      return object != null && hasPath(object, path, baseHasIn);
    }
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function identity(value) {
      return value;
    }
    function property(path) {
      return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
    }
    module2.exports = some;
  }
});

// node_modules/cheerio/lib/api/attributes.js
var require_attributes2 = __commonJS({
  "node_modules/cheerio/lib/api/attributes.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var $ = require_static();
    var utils = require_utils();
    var isTag = utils.isTag;
    var domEach = utils.domEach;
    var hasOwn = Object.prototype.hasOwnProperty;
    var camelCase = utils.camelCase;
    var cssCase = utils.cssCase;
    var rspace = /\s+/;
    var dataAttrPrefix = "data-";
    var _ = {
      forEach: require_lodash3(),
      extend: require_lodash(),
      some: require_lodash6()
    };
    var primitives = {
      null: null,
      true: true,
      false: false
    };
    var rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i;
    var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/;
    var getAttr = function(elem, name2) {
      if (!elem || !isTag(elem)) return;
      if (!elem.attribs) {
        elem.attribs = {};
      }
      if (!name2) {
        return elem.attribs;
      }
      if (hasOwn.call(elem.attribs, name2)) {
        return rboolean.test(name2) ? name2 : elem.attribs[name2];
      }
      if (elem.name === "option" && name2 === "value") {
        return $.text(elem.children);
      }
      if (elem.name === "input" && (elem.attribs.type === "radio" || elem.attribs.type === "checkbox") && name2 === "value") {
        return "on";
      }
    };
    var setAttr = function(el, name2, value) {
      if (value === null) {
        removeAttribute(el, name2);
      } else {
        el.attribs[name2] = value + "";
      }
    };
    exports6.attr = function(name2, value) {
      if (typeof name2 === "object" || value !== void 0) {
        if (typeof value === "function") {
          return domEach(this, function(i, el) {
            setAttr(el, name2, value.call(el, i, el.attribs[name2]));
          });
        }
        return domEach(this, function(i, el) {
          if (!isTag(el)) return;
          if (typeof name2 === "object") {
            _.forEach(name2, function(value2, name3) {
              setAttr(el, name3, value2);
            });
          } else {
            setAttr(el, name2, value);
          }
        });
      }
      return getAttr(this[0], name2);
    };
    var getProp = function(el, name2) {
      if (!el || !isTag(el)) return;
      return el.hasOwnProperty(name2) ? el[name2] : rboolean.test(name2) ? getAttr(el, name2) !== void 0 : getAttr(el, name2);
    };
    var setProp = function(el, name2, value) {
      el[name2] = rboolean.test(name2) ? !!value : value;
    };
    exports6.prop = function(name2, value) {
      var i = 0, property;
      if (typeof name2 === "string" && value === void 0) {
        switch (name2) {
          case "style":
            property = this.css();
            _.forEach(property, function(v, p) {
              property[i++] = p;
            });
            property.length = i;
            break;
          case "tagName":
          case "nodeName":
            property = this[0].name.toUpperCase();
            break;
          default:
            property = getProp(this[0], name2);
        }
        return property;
      }
      if (typeof name2 === "object" || value !== void 0) {
        if (typeof value === "function") {
          return domEach(this, function(i2, el) {
            setProp(el, name2, value.call(el, i2, getProp(el, name2)));
          });
        }
        return domEach(this, function(i2, el) {
          if (!isTag(el)) return;
          if (typeof name2 === "object") {
            _.forEach(name2, function(val, name3) {
              setProp(el, name3, val);
            });
          } else {
            setProp(el, name2, value);
          }
        });
      }
    };
    var setData = function(el, name2, value) {
      if (!el.data) {
        el.data = {};
      }
      if (typeof name2 === "object") return _.extend(el.data, name2);
      if (typeof name2 === "string" && value !== void 0) {
        el.data[name2] = value;
      } else if (typeof name2 === "object") {
        _.extend(el.data, name2);
      }
    };
    var readData = function(el, name2) {
      var readAll = arguments.length === 1;
      var domNames, domName, jsNames, jsName, value, idx, length;
      if (readAll) {
        domNames = Object.keys(el.attribs).filter(function(attrName) {
          return attrName.slice(0, dataAttrPrefix.length) === dataAttrPrefix;
        });
        jsNames = domNames.map(function(domName2) {
          return camelCase(domName2.slice(dataAttrPrefix.length));
        });
      } else {
        domNames = [dataAttrPrefix + cssCase(name2)];
        jsNames = [name2];
      }
      for (idx = 0, length = domNames.length; idx < length; ++idx) {
        domName = domNames[idx];
        jsName = jsNames[idx];
        if (hasOwn.call(el.attribs, domName)) {
          value = el.attribs[domName];
          if (hasOwn.call(primitives, value)) {
            value = primitives[value];
          } else if (value === String(Number(value))) {
            value = Number(value);
          } else if (rbrace.test(value)) {
            try {
              value = JSON.parse(value);
            } catch (e) {
            }
          }
          el.data[jsName] = value;
        }
      }
      return readAll ? el.data : value;
    };
    exports6.data = function(name2, value) {
      var elem = this[0];
      if (!elem || !isTag(elem)) return;
      if (!elem.data) {
        elem.data = {};
      }
      if (!name2) {
        return readData(elem);
      }
      if (typeof name2 === "object" || value !== void 0) {
        domEach(this, function(i, el) {
          setData(el, name2, value);
        });
        return this;
      } else if (hasOwn.call(elem.data, name2)) {
        return elem.data[name2];
      }
      return readData(elem, name2);
    };
    exports6.val = function(value) {
      var querying = arguments.length === 0, element = this[0];
      if (!element) return;
      switch (element.name) {
        case "textarea":
          return this.text(value);
        case "input":
          switch (this.attr("type")) {
            case "radio":
              if (querying) {
                return this.attr("value");
              } else {
                this.attr("value", value);
                return this;
              }
              break;
            default:
              return this.attr("value", value);
          }
          return;
        case "select":
          var option = this.find("option:selected"), returnValue;
          if (option === void 0) return void 0;
          if (!querying) {
            if (!this.attr().hasOwnProperty("multiple") && typeof value == "object") {
              return this;
            }
            if (typeof value != "object") {
              value = [value];
            }
            this.find("option").removeAttr("selected");
            for (var i = 0; i < value.length; i++) {
              this.find('option[value="' + value[i] + '"]').attr("selected", "");
            }
            return this;
          }
          returnValue = option.attr("value");
          if (this.attr().hasOwnProperty("multiple")) {
            returnValue = [];
            domEach(option, function(i2, el) {
              returnValue.push(getAttr(el, "value"));
            });
          }
          return returnValue;
        case "option":
          if (!querying) {
            this.attr("value", value);
            return this;
          }
          return this.attr("value");
      }
    };
    var removeAttribute = function(elem, name2) {
      if (!elem.attribs || !hasOwn.call(elem.attribs, name2))
        return;
      delete elem.attribs[name2];
    };
    exports6.removeAttr = function(name2) {
      domEach(this, function(i, elem) {
        removeAttribute(elem, name2);
      });
      return this;
    };
    exports6.hasClass = function(className) {
      return _.some(this, function(elem) {
        var attrs = elem.attribs, clazz = attrs && attrs["class"], idx = -1, end;
        if (clazz) {
          while ((idx = clazz.indexOf(className, idx + 1)) > -1) {
            end = idx + className.length;
            if ((idx === 0 || rspace.test(clazz[idx - 1])) && (end === clazz.length || rspace.test(clazz[end]))) {
              return true;
            }
          }
        }
      });
    };
    exports6.addClass = function(value) {
      if (typeof value === "function") {
        return domEach(this, function(i2, el) {
          var className2 = el.attribs["class"] || "";
          exports6.addClass.call([el], value.call(el, i2, className2));
        });
      }
      if (!value || typeof value !== "string") return this;
      var classNames = value.split(rspace), numElements = this.length;
      for (var i = 0; i < numElements; i++) {
        if (!isTag(this[i])) continue;
        var className = getAttr(this[i], "class"), numClasses, setClass;
        if (!className) {
          setAttr(this[i], "class", classNames.join(" ").trim());
        } else {
          setClass = " " + className + " ";
          numClasses = classNames.length;
          for (var j = 0; j < numClasses; j++) {
            var appendClass = classNames[j] + " ";
            if (setClass.indexOf(" " + appendClass) < 0)
              setClass += appendClass;
          }
          setAttr(this[i], "class", setClass.trim());
        }
      }
      return this;
    };
    var splitClass = function(className) {
      return className ? className.trim().split(rspace) : [];
    };
    exports6.removeClass = function(value) {
      var classes, numClasses, removeAll;
      if (typeof value === "function") {
        return domEach(this, function(i, el) {
          exports6.removeClass.call(
            [el],
            value.call(el, i, el.attribs["class"] || "")
          );
        });
      }
      classes = splitClass(value);
      numClasses = classes.length;
      removeAll = arguments.length === 0;
      return domEach(this, function(i, el) {
        if (!isTag(el)) return;
        if (removeAll) {
          el.attribs.class = "";
        } else {
          var elClasses = splitClass(el.attribs.class), index, changed;
          for (var j = 0; j < numClasses; j++) {
            index = elClasses.indexOf(classes[j]);
            if (index >= 0) {
              elClasses.splice(index, 1);
              changed = true;
              j--;
            }
          }
          if (changed) {
            el.attribs.class = elClasses.join(" ");
          }
        }
      });
    };
    exports6.toggleClass = function(value, stateVal) {
      if (typeof value === "function") {
        return domEach(this, function(i2, el) {
          exports6.toggleClass.call(
            [el],
            value.call(el, i2, el.attribs["class"] || "", stateVal),
            stateVal
          );
        });
      }
      if (!value || typeof value !== "string") return this;
      var classNames = value.split(rspace), numClasses = classNames.length, state = typeof stateVal === "boolean" ? stateVal ? 1 : -1 : 0, numElements = this.length, elementClasses, index;
      for (var i = 0; i < numElements; i++) {
        if (!isTag(this[i])) continue;
        elementClasses = splitClass(this[i].attribs.class);
        for (var j = 0; j < numClasses; j++) {
          index = elementClasses.indexOf(classNames[j]);
          if (state >= 0 && index < 0) {
            elementClasses.push(classNames[j]);
          } else if (state <= 0 && index >= 0) {
            elementClasses.splice(index, 1);
          }
        }
        this[i].attribs.class = elementClasses.join(" ");
      }
      return this;
    };
    exports6.is = function(selector) {
      if (selector) {
        return this.filter(selector).length > 0;
      }
      return false;
    };
  }
});

// node_modules/lodash.reject/index.js
var require_lodash7 = __commonJS({
  "node_modules/lodash.reject/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var LARGE_ARRAY_SIZE = 200;
    var FUNC_ERROR_TEXT = "Expected a function";
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var UNORDERED_COMPARE_FLAG = 1;
    var PARTIAL_COMPARE_FLAG = 2;
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var objectTag = "[object Object]";
    var promiseTag = "[object Promise]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
    var reIsPlainProp = /^\w*$/;
    var reLeadingDot = /^\./;
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reEscapeChar = /\\(\\)?/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports6 == "object" && exports6 && !exports6.nodeType && exports6;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        return freeProcess && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function arrayFilter(array, predicate) {
      var index = -1, length = array ? array.length : 0, resIndex = 0, result = [];
      while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
          result[resIndex++] = value;
        }
      }
      return result;
    }
    function arraySome(array, predicate) {
      var index = -1, length = array ? array.length : 0;
      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }
    function baseProperty(key) {
      return function(object) {
        return object == null ? void 0 : object[key];
      };
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e) {
        }
      }
      return result;
    }
    function mapToArray(map) {
      var index = -1, result = Array(map.size);
      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set) {
      var index = -1, result = Array(set.size);
      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var funcToString = funcProto.toString;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView");
    var Map = getNative(root, "Map");
    var Promise2 = getNative(root, "Promise");
    var Set = getNative(root, "Set");
    var WeakMap = getNative(root, "WeakMap");
    var nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView);
    var mapCtorString = toSource(Map);
    var promiseCtorString = toSource(Promise2);
    var setCtorString = toSource(Set);
    var weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function Hash(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
    }
    function hashDelete(key) {
      return this.has(key) && delete this.__data__[key];
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty2.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty2.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      return getMapData(this, key)["delete"](key);
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      getMapData(this, key).set(key, value);
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function SetCache(values) {
      var index = -1, length = values ? values.length : 0;
      this.__data__ = new MapCache();
      while (++index < length) {
        this.add(values[index]);
      }
    }
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }
    function setCacheHas(value) {
      return this.__data__.has(value);
    }
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;
    function Stack(entries) {
      this.__data__ = new ListCache(entries);
    }
    function stackClear() {
      this.__data__ = new ListCache();
    }
    function stackDelete(key) {
      return this.__data__["delete"](key);
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var cache = this.__data__;
      if (cache instanceof ListCache) {
        var pairs = cache.__data__;
        if (!Map || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          return this;
        }
        cache = this.__data__ = new MapCache(pairs);
      }
      cache.set(key, value);
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    var baseEach = createBaseEach(baseForOwn);
    function baseFilter(collection, predicate) {
      var result = [];
      baseEach(collection, function(value, index, collection2) {
        if (predicate(value, index, collection2)) {
          result.push(value);
        }
      });
      return result;
    }
    var baseFor = createBaseFor();
    function baseForOwn(object, iteratee) {
      return object && baseFor(object, iteratee, keys);
    }
    function baseGet(object, path) {
      path = isKey(path, object) ? [path] : castPath(path);
      var index = 0, length = path.length;
      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return index && index == length ? object : void 0;
    }
    function baseGetTag(value) {
      return objectToString.call(value);
    }
    function baseHasIn(object, key) {
      return object != null && key in Object(object);
    }
    function baseIsEqual(value, other, customizer, bitmask, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || !isObject(value) && !isObjectLike(other)) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
    }
    function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
      var objIsArr = isArray(object), othIsArr = isArray(other), objTag = arrayTag, othTag = arrayTag;
      if (!objIsArr) {
        objTag = getTag(object);
        objTag = objTag == argsTag ? objectTag : objTag;
      }
      if (!othIsArr) {
        othTag = getTag(other);
        othTag = othTag == argsTag ? objectTag : othTag;
      }
      var objIsObj = objTag == objectTag && !isHostObject(object), othIsObj = othTag == objectTag && !isHostObject(other), isSameTag = objTag == othTag;
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack());
        return objIsArr || isTypedArray(object) ? equalArrays(object, other, equalFunc, customizer, bitmask, stack) : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
      }
      if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
        var objIsWrapped = objIsObj && hasOwnProperty2.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty2.call(other, "__wrapped__");
        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
          stack || (stack = new Stack());
          return equalFunc(objUnwrapped, othUnwrapped, customizer, bitmask, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack());
      return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
    }
    function baseIsMatch(object, source, matchData, customizer) {
      var index = matchData.length, length = index, noCustomizer = !customizer;
      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (index--) {
        var data = matchData[index];
        if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
          return false;
        }
      }
      while (++index < length) {
        data = matchData[index];
        var key = data[0], objValue = object[key], srcValue = data[1];
        if (noCustomizer && data[2]) {
          if (objValue === void 0 && !(key in object)) {
            return false;
          }
        } else {
          var stack = new Stack();
          if (customizer) {
            var result = customizer(objValue, srcValue, key, object, source, stack);
          }
          if (!(result === void 0 ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack) : result)) {
            return false;
          }
        }
      }
      return true;
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
    }
    function baseIteratee(value) {
      if (typeof value == "function") {
        return value;
      }
      if (value == null) {
        return identity;
      }
      if (typeof value == "object") {
        return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
      }
      return property(value);
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty2.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function baseMatches(source) {
      var matchData = getMatchData(source);
      if (matchData.length == 1 && matchData[0][2]) {
        return matchesStrictComparable(matchData[0][0], matchData[0][1]);
      }
      return function(object) {
        return object === source || baseIsMatch(object, source, matchData);
      };
    }
    function baseMatchesProperty(path, srcValue) {
      if (isKey(path) && isStrictComparable(srcValue)) {
        return matchesStrictComparable(toKey(path), srcValue);
      }
      return function(object) {
        var objValue = get(object, path);
        return objValue === void 0 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, void 0, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
      };
    }
    function basePropertyDeep(path) {
      return function(object) {
        return baseGet(object, path);
      };
    }
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function castPath(value) {
      return isArray(value) ? value : stringToPath(value);
    }
    function createBaseEach(eachFunc, fromRight) {
      return function(collection, iteratee) {
        if (collection == null) {
          return collection;
        }
        if (!isArrayLike(collection)) {
          return eachFunc(collection, iteratee);
        }
        var length = collection.length, index = fromRight ? length : -1, iterable = Object(collection);
        while (fromRight ? index-- : ++index < length) {
          if (iteratee(iterable[index], index, iterable) === false) {
            break;
          }
        }
        return collection;
      };
    }
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }
    function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, arrLength = array.length, othLength = other.length;
      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1, result = true, seen = bitmask & UNORDERED_COMPARE_FLAG ? new SetCache() : void 0;
      stack.set(array, other);
      stack.set(other, array);
      while (++index < arrLength) {
        var arrValue = array[index], othValue = other[index];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== void 0) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        if (seen) {
          if (!arraySome(other, function(othValue2, othIndex) {
            if (!seen.has(othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, customizer, bitmask, stack))) {
              return seen.add(othIndex);
            }
          })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
          result = false;
          break;
        }
      }
      stack["delete"](array);
      stack["delete"](other);
      return result;
    }
    function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
      switch (tag) {
        case dataViewTag:
          if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;
        case arrayBufferTag:
          if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
            return false;
          }
          return true;
        case boolTag:
        case dateTag:
        case numberTag:
          return eq(+object, +other);
        case errorTag:
          return object.name == other.name && object.message == other.message;
        case regexpTag:
        case stringTag:
          return object == other + "";
        case mapTag:
          var convert = mapToArray;
        case setTag:
          var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
          convert || (convert = setToArray);
          if (object.size != other.size && !isPartial) {
            return false;
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= UNORDERED_COMPARE_FLAG;
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask, stack);
          stack["delete"](object);
          return result;
        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }
    function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, objProps = keys(object), objLength = objProps.length, othProps = keys(other), othLength = othProps.length;
      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty2.call(other, key))) {
          return false;
        }
      }
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);
      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key], othValue = other[key];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
        }
        if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack) : compared)) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == "constructor");
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor, othCtor = other.constructor;
        if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack["delete"](object);
      stack["delete"](other);
      return result;
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getMatchData(object) {
      var result = keys(object), length = result.length;
      while (length--) {
        var key = result[length], value = object[key];
        result[length] = [key, value, isStrictComparable(value)];
      }
      return result;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map && getTag(new Map()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set && getTag(new Set()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = objectToString.call(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : void 0;
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function hasPath(object, path, hasFunc) {
      path = isKey(path, object) ? [path] : castPath(path);
      var result, index = -1, length = path.length;
      while (++index < length) {
        var key = toKey(path[index]);
        if (!(result = object != null && hasFunc(object, key))) {
          break;
        }
        object = object[key];
      }
      if (result) {
        return result;
      }
      var length = object ? object.length : 0;
      return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isKey(value, object) {
      if (isArray(value)) {
        return false;
      }
      var type = typeof value;
      if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function isStrictComparable(value) {
      return value === value && !isObject(value);
    }
    function matchesStrictComparable(key, srcValue) {
      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === srcValue && (srcValue !== void 0 || key in Object(object));
      };
    }
    var stringToPath = memoize(function(string) {
      string = toString(string);
      var result = [];
      if (reLeadingDot.test(string)) {
        result.push("");
      }
      string.replace(rePropName, function(match, number, quote, string2) {
        result.push(quote ? string2.replace(reEscapeChar, "$1") : number || match);
      });
      return result;
    });
    function toKey(value) {
      if (typeof value == "string" || isSymbol(value)) {
        return value;
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function reject(collection, predicate) {
      var func = isArray(collection) ? arrayFilter : baseFilter;
      return func(collection, negate(baseIteratee(predicate, 3)));
    }
    function memoize(func, resolver) {
      if (typeof func != "function" || resolver && typeof resolver != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result);
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache)();
      return memoized;
    }
    memoize.Cache = MapCache;
    function negate(predicate) {
      if (typeof predicate != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      return function() {
        var args = arguments;
        switch (args.length) {
          case 0:
            return !predicate.call(this);
          case 1:
            return !predicate.call(this, args[0]);
          case 2:
            return !predicate.call(this, args[0], args[1]);
          case 3:
            return !predicate.call(this, args[0], args[1], args[2]);
        }
        return !predicate.apply(this, args);
      };
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    function get(object, path, defaultValue) {
      var result = object == null ? void 0 : baseGet(object, path);
      return result === void 0 ? defaultValue : result;
    }
    function hasIn(object, path) {
      return object != null && hasPath(object, path, baseHasIn);
    }
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function identity(value) {
      return value;
    }
    function property(path) {
      return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
    }
    module2.exports = reject;
  }
});

// node_modules/lodash.filter/index.js
var require_lodash8 = __commonJS({
  "node_modules/lodash.filter/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var LARGE_ARRAY_SIZE = 200;
    var FUNC_ERROR_TEXT = "Expected a function";
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var UNORDERED_COMPARE_FLAG = 1;
    var PARTIAL_COMPARE_FLAG = 2;
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var objectTag = "[object Object]";
    var promiseTag = "[object Promise]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
    var reIsPlainProp = /^\w*$/;
    var reLeadingDot = /^\./;
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reEscapeChar = /\\(\\)?/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports6 == "object" && exports6 && !exports6.nodeType && exports6;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        return freeProcess && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function arrayFilter(array, predicate) {
      var index = -1, length = array ? array.length : 0, resIndex = 0, result = [];
      while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
          result[resIndex++] = value;
        }
      }
      return result;
    }
    function arraySome(array, predicate) {
      var index = -1, length = array ? array.length : 0;
      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }
    function baseProperty(key) {
      return function(object) {
        return object == null ? void 0 : object[key];
      };
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e) {
        }
      }
      return result;
    }
    function mapToArray(map) {
      var index = -1, result = Array(map.size);
      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set) {
      var index = -1, result = Array(set.size);
      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var funcToString = funcProto.toString;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView");
    var Map = getNative(root, "Map");
    var Promise2 = getNative(root, "Promise");
    var Set = getNative(root, "Set");
    var WeakMap = getNative(root, "WeakMap");
    var nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView);
    var mapCtorString = toSource(Map);
    var promiseCtorString = toSource(Promise2);
    var setCtorString = toSource(Set);
    var weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function Hash(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
    }
    function hashDelete(key) {
      return this.has(key) && delete this.__data__[key];
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty2.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty2.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      return getMapData(this, key)["delete"](key);
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      getMapData(this, key).set(key, value);
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function SetCache(values) {
      var index = -1, length = values ? values.length : 0;
      this.__data__ = new MapCache();
      while (++index < length) {
        this.add(values[index]);
      }
    }
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }
    function setCacheHas(value) {
      return this.__data__.has(value);
    }
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;
    function Stack(entries) {
      this.__data__ = new ListCache(entries);
    }
    function stackClear() {
      this.__data__ = new ListCache();
    }
    function stackDelete(key) {
      return this.__data__["delete"](key);
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var cache = this.__data__;
      if (cache instanceof ListCache) {
        var pairs = cache.__data__;
        if (!Map || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          return this;
        }
        cache = this.__data__ = new MapCache(pairs);
      }
      cache.set(key, value);
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    var baseEach = createBaseEach(baseForOwn);
    function baseFilter(collection, predicate) {
      var result = [];
      baseEach(collection, function(value, index, collection2) {
        if (predicate(value, index, collection2)) {
          result.push(value);
        }
      });
      return result;
    }
    var baseFor = createBaseFor();
    function baseForOwn(object, iteratee) {
      return object && baseFor(object, iteratee, keys);
    }
    function baseGet(object, path) {
      path = isKey(path, object) ? [path] : castPath(path);
      var index = 0, length = path.length;
      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return index && index == length ? object : void 0;
    }
    function baseGetTag(value) {
      return objectToString.call(value);
    }
    function baseHasIn(object, key) {
      return object != null && key in Object(object);
    }
    function baseIsEqual(value, other, customizer, bitmask, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || !isObject(value) && !isObjectLike(other)) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
    }
    function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
      var objIsArr = isArray(object), othIsArr = isArray(other), objTag = arrayTag, othTag = arrayTag;
      if (!objIsArr) {
        objTag = getTag(object);
        objTag = objTag == argsTag ? objectTag : objTag;
      }
      if (!othIsArr) {
        othTag = getTag(other);
        othTag = othTag == argsTag ? objectTag : othTag;
      }
      var objIsObj = objTag == objectTag && !isHostObject(object), othIsObj = othTag == objectTag && !isHostObject(other), isSameTag = objTag == othTag;
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack());
        return objIsArr || isTypedArray(object) ? equalArrays(object, other, equalFunc, customizer, bitmask, stack) : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
      }
      if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
        var objIsWrapped = objIsObj && hasOwnProperty2.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty2.call(other, "__wrapped__");
        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
          stack || (stack = new Stack());
          return equalFunc(objUnwrapped, othUnwrapped, customizer, bitmask, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack());
      return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
    }
    function baseIsMatch(object, source, matchData, customizer) {
      var index = matchData.length, length = index, noCustomizer = !customizer;
      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (index--) {
        var data = matchData[index];
        if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
          return false;
        }
      }
      while (++index < length) {
        data = matchData[index];
        var key = data[0], objValue = object[key], srcValue = data[1];
        if (noCustomizer && data[2]) {
          if (objValue === void 0 && !(key in object)) {
            return false;
          }
        } else {
          var stack = new Stack();
          if (customizer) {
            var result = customizer(objValue, srcValue, key, object, source, stack);
          }
          if (!(result === void 0 ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack) : result)) {
            return false;
          }
        }
      }
      return true;
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
    }
    function baseIteratee(value) {
      if (typeof value == "function") {
        return value;
      }
      if (value == null) {
        return identity;
      }
      if (typeof value == "object") {
        return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
      }
      return property(value);
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty2.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function baseMatches(source) {
      var matchData = getMatchData(source);
      if (matchData.length == 1 && matchData[0][2]) {
        return matchesStrictComparable(matchData[0][0], matchData[0][1]);
      }
      return function(object) {
        return object === source || baseIsMatch(object, source, matchData);
      };
    }
    function baseMatchesProperty(path, srcValue) {
      if (isKey(path) && isStrictComparable(srcValue)) {
        return matchesStrictComparable(toKey(path), srcValue);
      }
      return function(object) {
        var objValue = get(object, path);
        return objValue === void 0 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, void 0, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
      };
    }
    function basePropertyDeep(path) {
      return function(object) {
        return baseGet(object, path);
      };
    }
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function castPath(value) {
      return isArray(value) ? value : stringToPath(value);
    }
    function createBaseEach(eachFunc, fromRight) {
      return function(collection, iteratee) {
        if (collection == null) {
          return collection;
        }
        if (!isArrayLike(collection)) {
          return eachFunc(collection, iteratee);
        }
        var length = collection.length, index = fromRight ? length : -1, iterable = Object(collection);
        while (fromRight ? index-- : ++index < length) {
          if (iteratee(iterable[index], index, iterable) === false) {
            break;
          }
        }
        return collection;
      };
    }
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }
    function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, arrLength = array.length, othLength = other.length;
      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1, result = true, seen = bitmask & UNORDERED_COMPARE_FLAG ? new SetCache() : void 0;
      stack.set(array, other);
      stack.set(other, array);
      while (++index < arrLength) {
        var arrValue = array[index], othValue = other[index];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== void 0) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        if (seen) {
          if (!arraySome(other, function(othValue2, othIndex) {
            if (!seen.has(othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, customizer, bitmask, stack))) {
              return seen.add(othIndex);
            }
          })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
          result = false;
          break;
        }
      }
      stack["delete"](array);
      stack["delete"](other);
      return result;
    }
    function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
      switch (tag) {
        case dataViewTag:
          if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;
        case arrayBufferTag:
          if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
            return false;
          }
          return true;
        case boolTag:
        case dateTag:
        case numberTag:
          return eq(+object, +other);
        case errorTag:
          return object.name == other.name && object.message == other.message;
        case regexpTag:
        case stringTag:
          return object == other + "";
        case mapTag:
          var convert = mapToArray;
        case setTag:
          var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
          convert || (convert = setToArray);
          if (object.size != other.size && !isPartial) {
            return false;
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= UNORDERED_COMPARE_FLAG;
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask, stack);
          stack["delete"](object);
          return result;
        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }
    function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, objProps = keys(object), objLength = objProps.length, othProps = keys(other), othLength = othProps.length;
      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty2.call(other, key))) {
          return false;
        }
      }
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);
      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key], othValue = other[key];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
        }
        if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack) : compared)) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == "constructor");
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor, othCtor = other.constructor;
        if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack["delete"](object);
      stack["delete"](other);
      return result;
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getMatchData(object) {
      var result = keys(object), length = result.length;
      while (length--) {
        var key = result[length], value = object[key];
        result[length] = [key, value, isStrictComparable(value)];
      }
      return result;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map && getTag(new Map()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set && getTag(new Set()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = objectToString.call(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : void 0;
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function hasPath(object, path, hasFunc) {
      path = isKey(path, object) ? [path] : castPath(path);
      var result, index = -1, length = path.length;
      while (++index < length) {
        var key = toKey(path[index]);
        if (!(result = object != null && hasFunc(object, key))) {
          break;
        }
        object = object[key];
      }
      if (result) {
        return result;
      }
      var length = object ? object.length : 0;
      return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isKey(value, object) {
      if (isArray(value)) {
        return false;
      }
      var type = typeof value;
      if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function isStrictComparable(value) {
      return value === value && !isObject(value);
    }
    function matchesStrictComparable(key, srcValue) {
      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === srcValue && (srcValue !== void 0 || key in Object(object));
      };
    }
    var stringToPath = memoize(function(string) {
      string = toString(string);
      var result = [];
      if (reLeadingDot.test(string)) {
        result.push("");
      }
      string.replace(rePropName, function(match, number, quote, string2) {
        result.push(quote ? string2.replace(reEscapeChar, "$1") : number || match);
      });
      return result;
    });
    function toKey(value) {
      if (typeof value == "string" || isSymbol(value)) {
        return value;
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function filter(collection, predicate) {
      var func = isArray(collection) ? arrayFilter : baseFilter;
      return func(collection, baseIteratee(predicate, 3));
    }
    function memoize(func, resolver) {
      if (typeof func != "function" || resolver && typeof resolver != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result);
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache)();
      return memoized;
    }
    memoize.Cache = MapCache;
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    function get(object, path, defaultValue) {
      var result = object == null ? void 0 : baseGet(object, path);
      return result === void 0 ? defaultValue : result;
    }
    function hasIn(object, path) {
      return object != null && hasPath(object, path, baseHasIn);
    }
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function identity(value) {
      return value;
    }
    function property(path) {
      return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
    }
    module2.exports = filter;
  }
});

// node_modules/lodash.reduce/index.js
var require_lodash9 = __commonJS({
  "node_modules/lodash.reduce/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var LARGE_ARRAY_SIZE = 200;
    var FUNC_ERROR_TEXT = "Expected a function";
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var UNORDERED_COMPARE_FLAG = 1;
    var PARTIAL_COMPARE_FLAG = 2;
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var objectTag = "[object Object]";
    var promiseTag = "[object Promise]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
    var reIsPlainProp = /^\w*$/;
    var reLeadingDot = /^\./;
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reEscapeChar = /\\(\\)?/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports6 == "object" && exports6 && !exports6.nodeType && exports6;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        return freeProcess && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function arrayReduce(array, iteratee, accumulator, initAccum) {
      var index = -1, length = array ? array.length : 0;
      if (initAccum && length) {
        accumulator = array[++index];
      }
      while (++index < length) {
        accumulator = iteratee(accumulator, array[index], index, array);
      }
      return accumulator;
    }
    function arraySome(array, predicate) {
      var index = -1, length = array ? array.length : 0;
      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }
    function baseProperty(key) {
      return function(object) {
        return object == null ? void 0 : object[key];
      };
    }
    function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
      eachFunc(collection, function(value, index, collection2) {
        accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection2);
      });
      return accumulator;
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e) {
        }
      }
      return result;
    }
    function mapToArray(map) {
      var index = -1, result = Array(map.size);
      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set) {
      var index = -1, result = Array(set.size);
      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var funcToString = funcProto.toString;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView");
    var Map = getNative(root, "Map");
    var Promise2 = getNative(root, "Promise");
    var Set = getNative(root, "Set");
    var WeakMap = getNative(root, "WeakMap");
    var nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView);
    var mapCtorString = toSource(Map);
    var promiseCtorString = toSource(Promise2);
    var setCtorString = toSource(Set);
    var weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function Hash(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
    }
    function hashDelete(key) {
      return this.has(key) && delete this.__data__[key];
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty2.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty2.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      return getMapData(this, key)["delete"](key);
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      getMapData(this, key).set(key, value);
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function SetCache(values) {
      var index = -1, length = values ? values.length : 0;
      this.__data__ = new MapCache();
      while (++index < length) {
        this.add(values[index]);
      }
    }
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }
    function setCacheHas(value) {
      return this.__data__.has(value);
    }
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;
    function Stack(entries) {
      this.__data__ = new ListCache(entries);
    }
    function stackClear() {
      this.__data__ = new ListCache();
    }
    function stackDelete(key) {
      return this.__data__["delete"](key);
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var cache = this.__data__;
      if (cache instanceof ListCache) {
        var pairs = cache.__data__;
        if (!Map || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          return this;
        }
        cache = this.__data__ = new MapCache(pairs);
      }
      cache.set(key, value);
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    var baseEach = createBaseEach(baseForOwn);
    var baseFor = createBaseFor();
    function baseForOwn(object, iteratee) {
      return object && baseFor(object, iteratee, keys);
    }
    function baseGet(object, path) {
      path = isKey(path, object) ? [path] : castPath(path);
      var index = 0, length = path.length;
      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return index && index == length ? object : void 0;
    }
    function baseGetTag(value) {
      return objectToString.call(value);
    }
    function baseHasIn(object, key) {
      return object != null && key in Object(object);
    }
    function baseIsEqual(value, other, customizer, bitmask, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || !isObject(value) && !isObjectLike(other)) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
    }
    function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
      var objIsArr = isArray(object), othIsArr = isArray(other), objTag = arrayTag, othTag = arrayTag;
      if (!objIsArr) {
        objTag = getTag(object);
        objTag = objTag == argsTag ? objectTag : objTag;
      }
      if (!othIsArr) {
        othTag = getTag(other);
        othTag = othTag == argsTag ? objectTag : othTag;
      }
      var objIsObj = objTag == objectTag && !isHostObject(object), othIsObj = othTag == objectTag && !isHostObject(other), isSameTag = objTag == othTag;
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack());
        return objIsArr || isTypedArray(object) ? equalArrays(object, other, equalFunc, customizer, bitmask, stack) : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
      }
      if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
        var objIsWrapped = objIsObj && hasOwnProperty2.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty2.call(other, "__wrapped__");
        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
          stack || (stack = new Stack());
          return equalFunc(objUnwrapped, othUnwrapped, customizer, bitmask, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack());
      return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
    }
    function baseIsMatch(object, source, matchData, customizer) {
      var index = matchData.length, length = index, noCustomizer = !customizer;
      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (index--) {
        var data = matchData[index];
        if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
          return false;
        }
      }
      while (++index < length) {
        data = matchData[index];
        var key = data[0], objValue = object[key], srcValue = data[1];
        if (noCustomizer && data[2]) {
          if (objValue === void 0 && !(key in object)) {
            return false;
          }
        } else {
          var stack = new Stack();
          if (customizer) {
            var result = customizer(objValue, srcValue, key, object, source, stack);
          }
          if (!(result === void 0 ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack) : result)) {
            return false;
          }
        }
      }
      return true;
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
    }
    function baseIteratee(value) {
      if (typeof value == "function") {
        return value;
      }
      if (value == null) {
        return identity;
      }
      if (typeof value == "object") {
        return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
      }
      return property(value);
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty2.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function baseMatches(source) {
      var matchData = getMatchData(source);
      if (matchData.length == 1 && matchData[0][2]) {
        return matchesStrictComparable(matchData[0][0], matchData[0][1]);
      }
      return function(object) {
        return object === source || baseIsMatch(object, source, matchData);
      };
    }
    function baseMatchesProperty(path, srcValue) {
      if (isKey(path) && isStrictComparable(srcValue)) {
        return matchesStrictComparable(toKey(path), srcValue);
      }
      return function(object) {
        var objValue = get(object, path);
        return objValue === void 0 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, void 0, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
      };
    }
    function basePropertyDeep(path) {
      return function(object) {
        return baseGet(object, path);
      };
    }
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function castPath(value) {
      return isArray(value) ? value : stringToPath(value);
    }
    function createBaseEach(eachFunc, fromRight) {
      return function(collection, iteratee) {
        if (collection == null) {
          return collection;
        }
        if (!isArrayLike(collection)) {
          return eachFunc(collection, iteratee);
        }
        var length = collection.length, index = fromRight ? length : -1, iterable = Object(collection);
        while (fromRight ? index-- : ++index < length) {
          if (iteratee(iterable[index], index, iterable) === false) {
            break;
          }
        }
        return collection;
      };
    }
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }
    function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, arrLength = array.length, othLength = other.length;
      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1, result = true, seen = bitmask & UNORDERED_COMPARE_FLAG ? new SetCache() : void 0;
      stack.set(array, other);
      stack.set(other, array);
      while (++index < arrLength) {
        var arrValue = array[index], othValue = other[index];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== void 0) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        if (seen) {
          if (!arraySome(other, function(othValue2, othIndex) {
            if (!seen.has(othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, customizer, bitmask, stack))) {
              return seen.add(othIndex);
            }
          })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
          result = false;
          break;
        }
      }
      stack["delete"](array);
      stack["delete"](other);
      return result;
    }
    function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
      switch (tag) {
        case dataViewTag:
          if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;
        case arrayBufferTag:
          if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
            return false;
          }
          return true;
        case boolTag:
        case dateTag:
        case numberTag:
          return eq(+object, +other);
        case errorTag:
          return object.name == other.name && object.message == other.message;
        case regexpTag:
        case stringTag:
          return object == other + "";
        case mapTag:
          var convert = mapToArray;
        case setTag:
          var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
          convert || (convert = setToArray);
          if (object.size != other.size && !isPartial) {
            return false;
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= UNORDERED_COMPARE_FLAG;
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask, stack);
          stack["delete"](object);
          return result;
        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }
    function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, objProps = keys(object), objLength = objProps.length, othProps = keys(other), othLength = othProps.length;
      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty2.call(other, key))) {
          return false;
        }
      }
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);
      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key], othValue = other[key];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
        }
        if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack) : compared)) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == "constructor");
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor, othCtor = other.constructor;
        if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack["delete"](object);
      stack["delete"](other);
      return result;
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getMatchData(object) {
      var result = keys(object), length = result.length;
      while (length--) {
        var key = result[length], value = object[key];
        result[length] = [key, value, isStrictComparable(value)];
      }
      return result;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map && getTag(new Map()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set && getTag(new Set()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = objectToString.call(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : void 0;
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function hasPath(object, path, hasFunc) {
      path = isKey(path, object) ? [path] : castPath(path);
      var result, index = -1, length = path.length;
      while (++index < length) {
        var key = toKey(path[index]);
        if (!(result = object != null && hasFunc(object, key))) {
          break;
        }
        object = object[key];
      }
      if (result) {
        return result;
      }
      var length = object ? object.length : 0;
      return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isKey(value, object) {
      if (isArray(value)) {
        return false;
      }
      var type = typeof value;
      if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function isStrictComparable(value) {
      return value === value && !isObject(value);
    }
    function matchesStrictComparable(key, srcValue) {
      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === srcValue && (srcValue !== void 0 || key in Object(object));
      };
    }
    var stringToPath = memoize(function(string) {
      string = toString(string);
      var result = [];
      if (reLeadingDot.test(string)) {
        result.push("");
      }
      string.replace(rePropName, function(match, number, quote, string2) {
        result.push(quote ? string2.replace(reEscapeChar, "$1") : number || match);
      });
      return result;
    });
    function toKey(value) {
      if (typeof value == "string" || isSymbol(value)) {
        return value;
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function reduce(collection, iteratee, accumulator) {
      var func = isArray(collection) ? arrayReduce : baseReduce, initAccum = arguments.length < 3;
      return func(collection, baseIteratee(iteratee, 4), accumulator, initAccum, baseEach);
    }
    function memoize(func, resolver) {
      if (typeof func != "function" || resolver && typeof resolver != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result);
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache)();
      return memoized;
    }
    memoize.Cache = MapCache;
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    function get(object, path, defaultValue) {
      var result = object == null ? void 0 : baseGet(object, path);
      return result === void 0 ? defaultValue : result;
    }
    function hasIn(object, path) {
      return object != null && hasPath(object, path, baseHasIn);
    }
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function identity(value) {
      return value;
    }
    function property(path) {
      return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
    }
    module2.exports = reduce;
  }
});

// node_modules/cheerio/lib/api/traversing.js
var require_traversing = __commonJS({
  "node_modules/cheerio/lib/api/traversing.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var select = require_css_select();
    var utils = require_utils();
    var domEach = utils.domEach;
    var uniqueSort = require_lib().DomUtils.uniqueSort;
    var isTag = utils.isTag;
    var _ = {
      bind: require_lodash2(),
      forEach: require_lodash3(),
      reject: require_lodash7(),
      filter: require_lodash8(),
      reduce: require_lodash9()
    };
    exports6.find = function(selectorOrHaystack) {
      var elems = _.reduce(this, function(memo, elem) {
        return memo.concat(_.filter(elem.children, isTag));
      }, []);
      var contains = this.constructor.contains;
      var haystack;
      if (selectorOrHaystack && typeof selectorOrHaystack !== "string") {
        if (selectorOrHaystack.cheerio) {
          haystack = selectorOrHaystack.get();
        } else {
          haystack = [selectorOrHaystack];
        }
        return this._make(haystack.filter(function(elem) {
          var idx, len;
          for (idx = 0, len = this.length; idx < len; ++idx) {
            if (contains(this[idx], elem)) {
              return true;
            }
          }
        }, this));
      }
      var options = { __proto__: this.options, context: this.toArray() };
      return this._make(select(selectorOrHaystack, elems, options));
    };
    exports6.parent = function(selector) {
      var set = [];
      domEach(this, function(idx, elem) {
        var parentElem = elem.parent;
        if (parentElem && set.indexOf(parentElem) < 0) {
          set.push(parentElem);
        }
      });
      if (arguments.length) {
        set = exports6.filter.call(set, selector, this);
      }
      return this._make(set);
    };
    exports6.parents = function(selector) {
      var parentNodes = [];
      this.get().reverse().forEach(function(elem) {
        traverseParents(this, elem.parent, selector, Infinity).forEach(
          function(node) {
            if (parentNodes.indexOf(node) === -1) {
              parentNodes.push(node);
            }
          }
        );
      }, this);
      return this._make(parentNodes);
    };
    exports6.parentsUntil = function(selector, filter) {
      var parentNodes = [], untilNode, untilNodes;
      if (typeof selector === "string") {
        untilNode = select(selector, this.parents().toArray(), this.options)[0];
      } else if (selector && selector.cheerio) {
        untilNodes = selector.toArray();
      } else if (selector) {
        untilNode = selector;
      }
      this.toArray().reverse().forEach(function(elem) {
        while (elem = elem.parent) {
          if (untilNode && elem !== untilNode || untilNodes && untilNodes.indexOf(elem) === -1 || !untilNode && !untilNodes) {
            if (isTag(elem) && parentNodes.indexOf(elem) === -1) {
              parentNodes.push(elem);
            }
          } else {
            break;
          }
        }
      }, this);
      return this._make(filter ? select(filter, parentNodes, this.options) : parentNodes);
    };
    exports6.closest = function(selector) {
      var set = [];
      if (!selector) {
        return this._make(set);
      }
      domEach(this, function(idx, elem) {
        var closestElem = traverseParents(this, elem, selector, 1)[0];
        if (closestElem && set.indexOf(closestElem) < 0) {
          set.push(closestElem);
        }
      }.bind(this));
      return this._make(set);
    };
    exports6.next = function(selector) {
      if (!this[0]) {
        return this;
      }
      var elems = [];
      _.forEach(this, function(elem) {
        while (elem = elem.next) {
          if (isTag(elem)) {
            elems.push(elem);
            return;
          }
        }
      });
      return selector ? exports6.filter.call(elems, selector, this) : this._make(elems);
    };
    exports6.nextAll = function(selector) {
      if (!this[0]) {
        return this;
      }
      var elems = [];
      _.forEach(this, function(elem) {
        while (elem = elem.next) {
          if (isTag(elem) && elems.indexOf(elem) === -1) {
            elems.push(elem);
          }
        }
      });
      return selector ? exports6.filter.call(elems, selector, this) : this._make(elems);
    };
    exports6.nextUntil = function(selector, filterSelector) {
      if (!this[0]) {
        return this;
      }
      var elems = [], untilNode, untilNodes;
      if (typeof selector === "string") {
        untilNode = select(selector, this.nextAll().get(), this.options)[0];
      } else if (selector && selector.cheerio) {
        untilNodes = selector.get();
      } else if (selector) {
        untilNode = selector;
      }
      _.forEach(this, function(elem) {
        while (elem = elem.next) {
          if (untilNode && elem !== untilNode || untilNodes && untilNodes.indexOf(elem) === -1 || !untilNode && !untilNodes) {
            if (isTag(elem) && elems.indexOf(elem) === -1) {
              elems.push(elem);
            }
          } else {
            break;
          }
        }
      });
      return filterSelector ? exports6.filter.call(elems, filterSelector, this) : this._make(elems);
    };
    exports6.prev = function(selector) {
      if (!this[0]) {
        return this;
      }
      var elems = [];
      _.forEach(this, function(elem) {
        while (elem = elem.prev) {
          if (isTag(elem)) {
            elems.push(elem);
            return;
          }
        }
      });
      return selector ? exports6.filter.call(elems, selector, this) : this._make(elems);
    };
    exports6.prevAll = function(selector) {
      if (!this[0]) {
        return this;
      }
      var elems = [];
      _.forEach(this, function(elem) {
        while (elem = elem.prev) {
          if (isTag(elem) && elems.indexOf(elem) === -1) {
            elems.push(elem);
          }
        }
      });
      return selector ? exports6.filter.call(elems, selector, this) : this._make(elems);
    };
    exports6.prevUntil = function(selector, filterSelector) {
      if (!this[0]) {
        return this;
      }
      var elems = [], untilNode, untilNodes;
      if (typeof selector === "string") {
        untilNode = select(selector, this.prevAll().get(), this.options)[0];
      } else if (selector && selector.cheerio) {
        untilNodes = selector.get();
      } else if (selector) {
        untilNode = selector;
      }
      _.forEach(this, function(elem) {
        while (elem = elem.prev) {
          if (untilNode && elem !== untilNode || untilNodes && untilNodes.indexOf(elem) === -1 || !untilNode && !untilNodes) {
            if (isTag(elem) && elems.indexOf(elem) === -1) {
              elems.push(elem);
            }
          } else {
            break;
          }
        }
      });
      return filterSelector ? exports6.filter.call(elems, filterSelector, this) : this._make(elems);
    };
    exports6.siblings = function(selector) {
      var parent = this.parent();
      var elems = _.filter(
        parent ? parent.children() : this.siblingsAndMe(),
        _.bind(function(elem) {
          return isTag(elem) && !this.is(elem);
        }, this)
      );
      if (selector !== void 0) {
        return exports6.filter.call(elems, selector, this);
      } else {
        return this._make(elems);
      }
    };
    exports6.children = function(selector) {
      var elems = _.reduce(this, function(memo, elem) {
        return memo.concat(_.filter(elem.children, isTag));
      }, []);
      if (selector === void 0) return this._make(elems);
      return exports6.filter.call(elems, selector, this);
    };
    exports6.contents = function() {
      return this._make(_.reduce(this, function(all, elem) {
        all.push.apply(all, elem.children);
        return all;
      }, []));
    };
    exports6.each = function(fn) {
      var i = 0, len = this.length;
      while (i < len && fn.call(this[i], i, this[i]) !== false) ++i;
      return this;
    };
    exports6.map = function(fn) {
      return this._make(_.reduce(this, function(memo, el, i) {
        var val = fn.call(el, i, el);
        return val == null ? memo : memo.concat(val);
      }, []));
    };
    var makeFilterMethod = function(filterFn) {
      return function(match, container) {
        var testFn;
        container = container || this;
        if (typeof match === "string") {
          testFn = select.compile(match, container.options);
        } else if (typeof match === "function") {
          testFn = function(el, i) {
            return match.call(el, i, el);
          };
        } else if (match.cheerio) {
          testFn = match.is.bind(match);
        } else {
          testFn = function(el) {
            return match === el;
          };
        }
        return container._make(filterFn(this, testFn));
      };
    };
    exports6.filter = makeFilterMethod(_.filter);
    exports6.not = makeFilterMethod(_.reject);
    exports6.has = function(selectorOrHaystack) {
      var that = this;
      return exports6.filter.call(this, function() {
        return that._make(this).find(selectorOrHaystack).length > 0;
      });
    };
    exports6.first = function() {
      return this.length > 1 ? this._make(this[0]) : this;
    };
    exports6.last = function() {
      return this.length > 1 ? this._make(this[this.length - 1]) : this;
    };
    exports6.eq = function(i) {
      i = +i;
      if (i === 0 && this.length <= 1) return this;
      if (i < 0) i = this.length + i;
      return this[i] ? this._make(this[i]) : this._make([]);
    };
    exports6.get = function(i) {
      if (i == null) {
        return Array.prototype.slice.call(this);
      } else {
        return this[i < 0 ? this.length + i : i];
      }
    };
    exports6.index = function(selectorOrNeedle) {
      var $haystack, needle;
      if (arguments.length === 0) {
        $haystack = this.parent().children();
        needle = this[0];
      } else if (typeof selectorOrNeedle === "string") {
        $haystack = this._make(selectorOrNeedle);
        needle = this[0];
      } else {
        $haystack = this;
        needle = selectorOrNeedle.cheerio ? selectorOrNeedle[0] : selectorOrNeedle;
      }
      return $haystack.get().indexOf(needle);
    };
    exports6.slice = function() {
      return this._make([].slice.apply(this, arguments));
    };
    function traverseParents(self2, elem, selector, limit) {
      var elems = [];
      while (elem && elems.length < limit) {
        if (!selector || exports6.filter.call([elem], selector, self2).length) {
          elems.push(elem);
        }
        elem = elem.parent;
      }
      return elems;
    }
    exports6.end = function() {
      return this.prevObject || this._make([]);
    };
    exports6.add = function(other, context) {
      var selection = this._make(other, context);
      var contents = uniqueSort(selection.get().concat(this.get()));
      for (var i = 0; i < contents.length; ++i) {
        selection[i] = contents[i];
      }
      selection.length = contents.length;
      return selection;
    };
    exports6.addBack = function(selector) {
      return this.add(
        arguments.length ? this.prevObject.filter(selector) : this.prevObject
      );
    };
  }
});

// node_modules/lodash.flatten/index.js
var require_lodash10 = __commonJS({
  "node_modules/lodash.flatten/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    function arrayPush(array, values) {
      var index = -1, length = values.length, offset = array.length;
      while (++index < length) {
        array[offset + index] = values[index];
      }
      return array;
    }
    var objectProto = Object.prototype;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var Symbol2 = root.Symbol;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var spreadableSymbol = Symbol2 ? Symbol2.isConcatSpreadable : void 0;
    function baseFlatten(array, depth, predicate, isStrict, result) {
      var index = -1, length = array.length;
      predicate || (predicate = isFlattenable);
      result || (result = []);
      while (++index < length) {
        var value = array[index];
        if (depth > 0 && predicate(value)) {
          if (depth > 1) {
            baseFlatten(value, depth - 1, predicate, isStrict, result);
          } else {
            arrayPush(result, value);
          }
        } else if (!isStrict) {
          result[result.length] = value;
        }
      }
      return result;
    }
    function isFlattenable(value) {
      return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
    }
    function flatten(array) {
      var length = array ? array.length : 0;
      return length ? baseFlatten(array, 1) : [];
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    module2.exports = flatten;
  }
});

// node_modules/cheerio/lib/api/manipulation.js
var require_manipulation2 = __commonJS({
  "node_modules/cheerio/lib/api/manipulation.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var parse = require_parse();
    var $ = require_static();
    var updateDOM = parse.update;
    var evaluate = parse.evaluate;
    var utils = require_utils();
    var domEach = utils.domEach;
    var cloneDom = utils.cloneDom;
    var isHtml = utils.isHtml;
    var slice = Array.prototype.slice;
    var _ = {
      flatten: require_lodash10(),
      bind: require_lodash2(),
      forEach: require_lodash3()
    };
    exports6._makeDomArray = function makeDomArray(elem, clone) {
      if (elem == null) {
        return [];
      } else if (elem.cheerio) {
        return clone ? cloneDom(elem.get(), elem.options) : elem.get();
      } else if (Array.isArray(elem)) {
        return _.flatten(elem.map(function(el) {
          return this._makeDomArray(el, clone);
        }, this));
      } else if (typeof elem === "string") {
        return evaluate(elem, this.options);
      } else {
        return clone ? cloneDom([elem]) : [elem];
      }
    };
    var _insert = function(concatenator) {
      return function() {
        var elems = slice.call(arguments), lastIdx = this.length - 1;
        return domEach(this, function(i, el) {
          var dom, domSrc;
          if (typeof elems[0] === "function") {
            domSrc = elems[0].call(el, i, $.html(el.children));
          } else {
            domSrc = elems;
          }
          dom = this._makeDomArray(domSrc, i < lastIdx);
          concatenator(dom, el.children, el);
        });
      };
    };
    var uniqueSplice = function(array, spliceIdx, spliceCount, newElems, parent) {
      var spliceArgs = [spliceIdx, spliceCount].concat(newElems), prev = array[spliceIdx - 1] || null, next = array[spliceIdx] || null;
      var idx, len, prevIdx, node, oldParent;
      for (idx = 0, len = newElems.length; idx < len; ++idx) {
        node = newElems[idx];
        oldParent = node.parent || node.root;
        prevIdx = oldParent && oldParent.children.indexOf(newElems[idx]);
        if (oldParent && prevIdx > -1) {
          oldParent.children.splice(prevIdx, 1);
          if (parent === oldParent && spliceIdx > prevIdx) {
            spliceArgs[0]--;
          }
        }
        node.root = null;
        node.parent = parent;
        if (node.prev) {
          node.prev.next = node.next || null;
        }
        if (node.next) {
          node.next.prev = node.prev || null;
        }
        node.prev = newElems[idx - 1] || prev;
        node.next = newElems[idx + 1] || next;
      }
      if (prev) {
        prev.next = newElems[0];
      }
      if (next) {
        next.prev = newElems[newElems.length - 1];
      }
      return array.splice.apply(array, spliceArgs);
    };
    exports6.appendTo = function(target) {
      if (!target.cheerio) {
        target = this.constructor.call(this.constructor, target, null, this._originalRoot);
      }
      target.append(this);
      return this;
    };
    exports6.prependTo = function(target) {
      if (!target.cheerio) {
        target = this.constructor.call(this.constructor, target, null, this._originalRoot);
      }
      target.prepend(this);
      return this;
    };
    exports6.append = _insert(function(dom, children, parent) {
      uniqueSplice(children, children.length, 0, dom, parent);
    });
    exports6.prepend = _insert(function(dom, children, parent) {
      uniqueSplice(children, 0, 0, dom, parent);
    });
    exports6.wrap = function(wrapper) {
      var wrapperFn = typeof wrapper === "function" && wrapper, lastIdx = this.length - 1;
      _.forEach(this, _.bind(function(el, i) {
        var parent = el.parent || el.root, siblings = parent.children, dom, index;
        if (!parent) {
          return;
        }
        if (wrapperFn) {
          wrapper = wrapperFn.call(el, i);
        }
        if (typeof wrapper === "string" && !isHtml(wrapper)) {
          wrapper = this.parents().last().find(wrapper).clone();
        }
        dom = this._makeDomArray(wrapper, i < lastIdx).slice(0, 1);
        index = siblings.indexOf(el);
        updateDOM([el], dom[0]);
        uniqueSplice(siblings, index, 0, dom, parent);
      }, this));
      return this;
    };
    exports6.after = function() {
      var elems = slice.call(arguments), lastIdx = this.length - 1;
      domEach(this, function(i, el) {
        var parent = el.parent || el.root;
        if (!parent) {
          return;
        }
        var siblings = parent.children, index = siblings.indexOf(el), domSrc, dom;
        if (index < 0) return;
        if (typeof elems[0] === "function") {
          domSrc = elems[0].call(el, i, $.html(el.children));
        } else {
          domSrc = elems;
        }
        dom = this._makeDomArray(domSrc, i < lastIdx);
        uniqueSplice(siblings, index + 1, 0, dom, parent);
      });
      return this;
    };
    exports6.insertAfter = function(target) {
      var clones = [], self2 = this;
      if (typeof target === "string") {
        target = this.constructor.call(this.constructor, target, null, this._originalRoot);
      }
      target = this._makeDomArray(target);
      self2.remove();
      domEach(target, function(i, el) {
        var clonedSelf = self2._makeDomArray(self2.clone());
        var parent = el.parent || el.root;
        if (!parent) {
          return;
        }
        var siblings = parent.children, index = siblings.indexOf(el);
        if (index < 0) return;
        uniqueSplice(siblings, index + 1, 0, clonedSelf, parent);
        clones.push(clonedSelf);
      });
      return this.constructor.call(this.constructor, this._makeDomArray(clones));
    };
    exports6.before = function() {
      var elems = slice.call(arguments), lastIdx = this.length - 1;
      domEach(this, function(i, el) {
        var parent = el.parent || el.root;
        if (!parent) {
          return;
        }
        var siblings = parent.children, index = siblings.indexOf(el), domSrc, dom;
        if (index < 0) return;
        if (typeof elems[0] === "function") {
          domSrc = elems[0].call(el, i, $.html(el.children));
        } else {
          domSrc = elems;
        }
        dom = this._makeDomArray(domSrc, i < lastIdx);
        uniqueSplice(siblings, index, 0, dom, parent);
      });
      return this;
    };
    exports6.insertBefore = function(target) {
      var clones = [], self2 = this;
      if (typeof target === "string") {
        target = this.constructor.call(this.constructor, target, null, this._originalRoot);
      }
      target = this._makeDomArray(target);
      self2.remove();
      domEach(target, function(i, el) {
        var clonedSelf = self2._makeDomArray(self2.clone());
        var parent = el.parent || el.root;
        if (!parent) {
          return;
        }
        var siblings = parent.children, index = siblings.indexOf(el);
        if (index < 0) return;
        uniqueSplice(siblings, index, 0, clonedSelf, parent);
        clones.push(clonedSelf);
      });
      return this.constructor.call(this.constructor, this._makeDomArray(clones));
    };
    exports6.remove = function(selector) {
      var elems = this;
      if (selector)
        elems = elems.filter(selector);
      domEach(elems, function(i, el) {
        var parent = el.parent || el.root;
        if (!parent) {
          return;
        }
        var siblings = parent.children, index = siblings.indexOf(el);
        if (index < 0) return;
        siblings.splice(index, 1);
        if (el.prev) {
          el.prev.next = el.next;
        }
        if (el.next) {
          el.next.prev = el.prev;
        }
        el.prev = el.next = el.parent = el.root = null;
      });
      return this;
    };
    exports6.replaceWith = function(content) {
      var self2 = this;
      domEach(this, function(i, el) {
        var parent = el.parent || el.root;
        if (!parent) {
          return;
        }
        var siblings = parent.children, dom = self2._makeDomArray(typeof content === "function" ? content.call(el, i, el) : content), index;
        updateDOM(dom, null);
        index = siblings.indexOf(el);
        uniqueSplice(siblings, index, 1, dom, parent);
        el.parent = el.prev = el.next = el.root = null;
      });
      return this;
    };
    exports6.empty = function() {
      domEach(this, function(i, el) {
        _.forEach(el.children, function(el2) {
          el2.next = el2.prev = el2.parent = null;
        });
        el.children.length = 0;
      });
      return this;
    };
    exports6.html = function(str) {
      if (str === void 0) {
        if (!this[0] || !this[0].children) return null;
        return $.html(this[0].children, this.options);
      }
      var opts = this.options;
      domEach(this, function(i, el) {
        _.forEach(el.children, function(el2) {
          el2.next = el2.prev = el2.parent = null;
        });
        var content = str.cheerio ? str.clone().get() : evaluate("" + str, opts);
        updateDOM(content, el);
      });
      return this;
    };
    exports6.toString = function() {
      return $.html(this, this.options);
    };
    exports6.text = function(str) {
      if (str === void 0) {
        return $.text(this);
      } else if (typeof str === "function") {
        return domEach(this, function(i, el) {
          var $el = [el];
          return exports6.text.call($el, str.call(el, i, $.text($el)));
        });
      }
      domEach(this, function(i, el) {
        _.forEach(el.children, function(el2) {
          el2.next = el2.prev = el2.parent = null;
        });
        var elem = {
          data: "" + str,
          type: "text",
          parent: el,
          prev: null,
          next: null,
          children: []
        };
        updateDOM(elem, el);
      });
      return this;
    };
    exports6.clone = function() {
      return this._make(cloneDom(this.get(), this.options));
    };
  }
});

// node_modules/lodash.pick/index.js
var require_lodash11 = __commonJS({
  "node_modules/lodash.pick/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var symbolTag = "[object Symbol]";
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    function apply(func, thisArg, args) {
      switch (args.length) {
        case 0:
          return func.call(thisArg);
        case 1:
          return func.call(thisArg, args[0]);
        case 2:
          return func.call(thisArg, args[0], args[1]);
        case 3:
          return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }
    function arrayMap(array, iteratee) {
      var index = -1, length = array ? array.length : 0, result = Array(length);
      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }
    function arrayPush(array, values) {
      var index = -1, length = values.length, offset = array.length;
      while (++index < length) {
        array[offset + index] = values[index];
      }
      return array;
    }
    var objectProto = Object.prototype;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var Symbol2 = root.Symbol;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var spreadableSymbol = Symbol2 ? Symbol2.isConcatSpreadable : void 0;
    var nativeMax = Math.max;
    function baseFlatten(array, depth, predicate, isStrict, result) {
      var index = -1, length = array.length;
      predicate || (predicate = isFlattenable);
      result || (result = []);
      while (++index < length) {
        var value = array[index];
        if (depth > 0 && predicate(value)) {
          if (depth > 1) {
            baseFlatten(value, depth - 1, predicate, isStrict, result);
          } else {
            arrayPush(result, value);
          }
        } else if (!isStrict) {
          result[result.length] = value;
        }
      }
      return result;
    }
    function basePick(object, props) {
      object = Object(object);
      return basePickBy(object, props, function(value, key) {
        return key in object;
      });
    }
    function basePickBy(object, props, predicate) {
      var index = -1, length = props.length, result = {};
      while (++index < length) {
        var key = props[index], value = object[key];
        if (predicate(value, key)) {
          result[key] = value;
        }
      }
      return result;
    }
    function baseRest(func, start) {
      start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
      return function() {
        var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
        while (++index < length) {
          array[index] = args[start + index];
        }
        index = -1;
        var otherArgs = Array(start + 1);
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = array;
        return apply(func, this, otherArgs);
      };
    }
    function isFlattenable(value) {
      return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
    }
    function toKey(value) {
      if (typeof value == "string" || isSymbol(value)) {
        return value;
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    var pick = baseRest(function(object, props) {
      return object == null ? {} : basePick(object, arrayMap(baseFlatten(props, 1), toKey));
    });
    module2.exports = pick;
  }
});

// node_modules/cheerio/lib/api/css.js
var require_css = __commonJS({
  "node_modules/cheerio/lib/api/css.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var domEach = require_utils().domEach;
    var _ = {
      pick: require_lodash11()
    };
    var toString = Object.prototype.toString;
    exports6.css = function(prop, val) {
      if (arguments.length === 2 || // When `prop` is a "plain" object
      toString.call(prop) === "[object Object]") {
        return domEach(this, function(idx, el) {
          setCss(el, prop, val, idx);
        });
      } else {
        return getCss(this[0], prop);
      }
    };
    function setCss(el, prop, val, idx) {
      if ("string" == typeof prop) {
        var styles = getCss(el);
        if (typeof val === "function") {
          val = val.call(el, idx, styles[prop]);
        }
        if (val === "") {
          delete styles[prop];
        } else if (val != null) {
          styles[prop] = val;
        }
        el.attribs.style = stringify(styles);
      } else if ("object" == typeof prop) {
        Object.keys(prop).forEach(function(k) {
          setCss(el, k, prop[k]);
        });
      }
    }
    function getCss(el, prop) {
      var styles = parse(el.attribs.style);
      if (typeof prop === "string") {
        return styles[prop];
      } else if (Array.isArray(prop)) {
        return _.pick(styles, prop);
      } else {
        return styles;
      }
    }
    function stringify(obj) {
      return Object.keys(obj || {}).reduce(function(str, prop) {
        return str += (str ? " " : "") + prop + ": " + obj[prop] + ";";
      }, "");
    }
    function parse(styles) {
      styles = (styles || "").trim();
      if (!styles) return {};
      return styles.split(";").reduce(function(obj, str) {
        var n = str.indexOf(":");
        if (n < 1 || n === str.length - 1) return obj;
        obj[str.slice(0, n).trim()] = str.slice(n + 1).trim();
        return obj;
      }, {});
    }
  }
});

// node_modules/lodash.map/index.js
var require_lodash12 = __commonJS({
  "node_modules/lodash.map/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var LARGE_ARRAY_SIZE = 200;
    var FUNC_ERROR_TEXT = "Expected a function";
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var UNORDERED_COMPARE_FLAG = 1;
    var PARTIAL_COMPARE_FLAG = 2;
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var objectTag = "[object Object]";
    var promiseTag = "[object Promise]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
    var reIsPlainProp = /^\w*$/;
    var reLeadingDot = /^\./;
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reEscapeChar = /\\(\\)?/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof globalThis == "object" && globalThis && globalThis.Object === Object && globalThis;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports6 == "object" && exports6 && !exports6.nodeType && exports6;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        return freeProcess && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function arrayMap(array, iteratee) {
      var index = -1, length = array ? array.length : 0, result = Array(length);
      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }
    function arraySome(array, predicate) {
      var index = -1, length = array ? array.length : 0;
      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }
    function baseProperty(key) {
      return function(object) {
        return object == null ? void 0 : object[key];
      };
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e) {
        }
      }
      return result;
    }
    function mapToArray(map2) {
      var index = -1, result = Array(map2.size);
      map2.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set) {
      var index = -1, result = Array(set.size);
      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var funcToString = funcProto.toString;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView");
    var Map = getNative(root, "Map");
    var Promise2 = getNative(root, "Promise");
    var Set = getNative(root, "Set");
    var WeakMap = getNative(root, "WeakMap");
    var nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView);
    var mapCtorString = toSource(Map);
    var promiseCtorString = toSource(Promise2);
    var setCtorString = toSource(Set);
    var weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function Hash(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
    }
    function hashDelete(key) {
      return this.has(key) && delete this.__data__[key];
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty2.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty2.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries ? entries.length : 0;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      return getMapData(this, key)["delete"](key);
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      getMapData(this, key).set(key, value);
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function SetCache(values) {
      var index = -1, length = values ? values.length : 0;
      this.__data__ = new MapCache();
      while (++index < length) {
        this.add(values[index]);
      }
    }
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }
    function setCacheHas(value) {
      return this.__data__.has(value);
    }
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;
    function Stack(entries) {
      this.__data__ = new ListCache(entries);
    }
    function stackClear() {
      this.__data__ = new ListCache();
    }
    function stackDelete(key) {
      return this.__data__["delete"](key);
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var cache = this.__data__;
      if (cache instanceof ListCache) {
        var pairs = cache.__data__;
        if (!Map || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          return this;
        }
        cache = this.__data__ = new MapCache(pairs);
      }
      cache.set(key, value);
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    var baseEach = createBaseEach(baseForOwn);
    var baseFor = createBaseFor();
    function baseForOwn(object, iteratee) {
      return object && baseFor(object, iteratee, keys);
    }
    function baseGet(object, path) {
      path = isKey(path, object) ? [path] : castPath(path);
      var index = 0, length = path.length;
      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return index && index == length ? object : void 0;
    }
    function baseGetTag(value) {
      return objectToString.call(value);
    }
    function baseHasIn(object, key) {
      return object != null && key in Object(object);
    }
    function baseIsEqual(value, other, customizer, bitmask, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || !isObject(value) && !isObjectLike(other)) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
    }
    function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
      var objIsArr = isArray(object), othIsArr = isArray(other), objTag = arrayTag, othTag = arrayTag;
      if (!objIsArr) {
        objTag = getTag(object);
        objTag = objTag == argsTag ? objectTag : objTag;
      }
      if (!othIsArr) {
        othTag = getTag(other);
        othTag = othTag == argsTag ? objectTag : othTag;
      }
      var objIsObj = objTag == objectTag && !isHostObject(object), othIsObj = othTag == objectTag && !isHostObject(other), isSameTag = objTag == othTag;
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack());
        return objIsArr || isTypedArray(object) ? equalArrays(object, other, equalFunc, customizer, bitmask, stack) : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
      }
      if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
        var objIsWrapped = objIsObj && hasOwnProperty2.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty2.call(other, "__wrapped__");
        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
          stack || (stack = new Stack());
          return equalFunc(objUnwrapped, othUnwrapped, customizer, bitmask, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack());
      return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
    }
    function baseIsMatch(object, source, matchData, customizer) {
      var index = matchData.length, length = index, noCustomizer = !customizer;
      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (index--) {
        var data = matchData[index];
        if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
          return false;
        }
      }
      while (++index < length) {
        data = matchData[index];
        var key = data[0], objValue = object[key], srcValue = data[1];
        if (noCustomizer && data[2]) {
          if (objValue === void 0 && !(key in object)) {
            return false;
          }
        } else {
          var stack = new Stack();
          if (customizer) {
            var result = customizer(objValue, srcValue, key, object, source, stack);
          }
          if (!(result === void 0 ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack) : result)) {
            return false;
          }
        }
      }
      return true;
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
    }
    function baseIteratee(value) {
      if (typeof value == "function") {
        return value;
      }
      if (value == null) {
        return identity;
      }
      if (typeof value == "object") {
        return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
      }
      return property(value);
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty2.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function baseMap(collection, iteratee) {
      var index = -1, result = isArrayLike(collection) ? Array(collection.length) : [];
      baseEach(collection, function(value, key, collection2) {
        result[++index] = iteratee(value, key, collection2);
      });
      return result;
    }
    function baseMatches(source) {
      var matchData = getMatchData(source);
      if (matchData.length == 1 && matchData[0][2]) {
        return matchesStrictComparable(matchData[0][0], matchData[0][1]);
      }
      return function(object) {
        return object === source || baseIsMatch(object, source, matchData);
      };
    }
    function baseMatchesProperty(path, srcValue) {
      if (isKey(path) && isStrictComparable(srcValue)) {
        return matchesStrictComparable(toKey(path), srcValue);
      }
      return function(object) {
        var objValue = get(object, path);
        return objValue === void 0 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, void 0, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
      };
    }
    function basePropertyDeep(path) {
      return function(object) {
        return baseGet(object, path);
      };
    }
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function castPath(value) {
      return isArray(value) ? value : stringToPath(value);
    }
    function createBaseEach(eachFunc, fromRight) {
      return function(collection, iteratee) {
        if (collection == null) {
          return collection;
        }
        if (!isArrayLike(collection)) {
          return eachFunc(collection, iteratee);
        }
        var length = collection.length, index = fromRight ? length : -1, iterable = Object(collection);
        while (fromRight ? index-- : ++index < length) {
          if (iteratee(iterable[index], index, iterable) === false) {
            break;
          }
        }
        return collection;
      };
    }
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }
    function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, arrLength = array.length, othLength = other.length;
      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1, result = true, seen = bitmask & UNORDERED_COMPARE_FLAG ? new SetCache() : void 0;
      stack.set(array, other);
      stack.set(other, array);
      while (++index < arrLength) {
        var arrValue = array[index], othValue = other[index];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== void 0) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        if (seen) {
          if (!arraySome(other, function(othValue2, othIndex) {
            if (!seen.has(othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, customizer, bitmask, stack))) {
              return seen.add(othIndex);
            }
          })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
          result = false;
          break;
        }
      }
      stack["delete"](array);
      stack["delete"](other);
      return result;
    }
    function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
      switch (tag) {
        case dataViewTag:
          if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;
        case arrayBufferTag:
          if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
            return false;
          }
          return true;
        case boolTag:
        case dateTag:
        case numberTag:
          return eq(+object, +other);
        case errorTag:
          return object.name == other.name && object.message == other.message;
        case regexpTag:
        case stringTag:
          return object == other + "";
        case mapTag:
          var convert = mapToArray;
        case setTag:
          var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
          convert || (convert = setToArray);
          if (object.size != other.size && !isPartial) {
            return false;
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= UNORDERED_COMPARE_FLAG;
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask, stack);
          stack["delete"](object);
          return result;
        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }
    function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG, objProps = keys(object), objLength = objProps.length, othProps = keys(other), othLength = othProps.length;
      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty2.call(other, key))) {
          return false;
        }
      }
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);
      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key], othValue = other[key];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
        }
        if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack) : compared)) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == "constructor");
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor, othCtor = other.constructor;
        if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack["delete"](object);
      stack["delete"](other);
      return result;
    }
    function getMapData(map2, key) {
      var data = map2.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getMatchData(object) {
      var result = keys(object), length = result.length;
      while (length--) {
        var key = result[length], value = object[key];
        result[length] = [key, value, isStrictComparable(value)];
      }
      return result;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map && getTag(new Map()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set && getTag(new Set()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = objectToString.call(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : void 0;
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function hasPath(object, path, hasFunc) {
      path = isKey(path, object) ? [path] : castPath(path);
      var result, index = -1, length = path.length;
      while (++index < length) {
        var key = toKey(path[index]);
        if (!(result = object != null && hasFunc(object, key))) {
          break;
        }
        object = object[key];
      }
      if (result) {
        return result;
      }
      var length = object ? object.length : 0;
      return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isKey(value, object) {
      if (isArray(value)) {
        return false;
      }
      var type = typeof value;
      if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function isStrictComparable(value) {
      return value === value && !isObject(value);
    }
    function matchesStrictComparable(key, srcValue) {
      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === srcValue && (srcValue !== void 0 || key in Object(object));
      };
    }
    var stringToPath = memoize(function(string) {
      string = toString(string);
      var result = [];
      if (reLeadingDot.test(string)) {
        result.push("");
      }
      string.replace(rePropName, function(match, number, quote, string2) {
        result.push(quote ? string2.replace(reEscapeChar, "$1") : number || match);
      });
      return result;
    });
    function toKey(value) {
      if (typeof value == "string" || isSymbol(value)) {
        return value;
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function map(collection, iteratee) {
      var func = isArray(collection) ? arrayMap : baseMap;
      return func(collection, baseIteratee(iteratee, 3));
    }
    function memoize(func, resolver) {
      if (typeof func != "function" || resolver && typeof resolver != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result);
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache)();
      return memoized;
    }
    memoize.Cache = MapCache;
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty2.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    function get(object, path, defaultValue) {
      var result = object == null ? void 0 : baseGet(object, path);
      return result === void 0 ? defaultValue : result;
    }
    function hasIn(object, path) {
      return object != null && hasPath(object, path, baseHasIn);
    }
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function identity(value) {
      return value;
    }
    function property(path) {
      return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
    }
    module2.exports = map;
  }
});

// node_modules/cheerio/lib/api/forms.js
var require_forms = __commonJS({
  "node_modules/cheerio/lib/api/forms.js"(exports6) {
    init_dirname();
    init_buffer2();
    init_process2();
    var submittableSelector = "input,select,textarea,keygen";
    var r20 = /%20/g;
    var rCRLF = /\r?\n/g;
    var _ = {
      map: require_lodash12()
    };
    exports6.serialize = function() {
      var arr = this.serializeArray();
      var retArr = _.map(arr, function(data) {
        return encodeURIComponent(data.name) + "=" + encodeURIComponent(data.value);
      });
      return retArr.join("&").replace(r20, "+");
    };
    exports6.serializeArray = function() {
      var Cheerio = this.constructor;
      return this.map(function() {
        var elem = this;
        var $elem = Cheerio(elem);
        if (elem.name === "form") {
          return $elem.find(submittableSelector).toArray();
        } else {
          return $elem.filter(submittableSelector).toArray();
        }
      }).filter(
        // Verify elements have a name (`attr.name`) and are not disabled (`:disabled`)
        '[name!=""]:not(:disabled):not(:submit, :button, :image, :reset, :file):matches([checked], :not(:checkbox, :radio))'
        // Convert each of the elements to its value(s)
      ).map(function(i, elem) {
        var $elem = Cheerio(elem);
        var name2 = $elem.attr("name");
        var val = $elem.val();
        if (val == null) {
          return null;
        } else {
          if (Array.isArray(val)) {
            return _.map(val, function(val2) {
              return { name: name2, value: val2.replace(rCRLF, "\r\n") };
            });
          } else {
            return { name: name2, value: val.replace(rCRLF, "\r\n") };
          }
        }
      }).get();
    };
  }
});

// node_modules/cheerio/lib/cheerio.js
var require_cheerio = __commonJS({
  "node_modules/cheerio/lib/cheerio.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    var parse = require_parse();
    var isHtml = require_utils().isHtml;
    var _ = {
      extend: require_lodash(),
      bind: require_lodash2(),
      forEach: require_lodash3(),
      defaults: require_lodash4()
    };
    var api = [
      require_attributes2(),
      require_traversing(),
      require_manipulation2(),
      require_css(),
      require_forms()
    ];
    var Cheerio = module2.exports = function(selector, context, root, options) {
      if (!(this instanceof Cheerio)) return new Cheerio(selector, context, root, options);
      this.options = _.defaults(options || {}, this.options);
      if (!selector) return this;
      if (root) {
        if (typeof root === "string") root = parse(root, this.options);
        this._root = Cheerio.call(this, root);
      }
      if (selector.cheerio) return selector;
      if (isNode(selector))
        selector = [selector];
      if (Array.isArray(selector)) {
        _.forEach(selector, _.bind(function(elem, idx) {
          this[idx] = elem;
        }, this));
        this.length = selector.length;
        return this;
      }
      if (typeof selector === "string" && isHtml(selector)) {
        return Cheerio.call(this, parse(selector, this.options).children);
      }
      if (!context) {
        context = this._root;
      } else if (typeof context === "string") {
        if (isHtml(context)) {
          context = parse(context, this.options);
          context = Cheerio.call(this, context);
        } else {
          selector = [context, selector].join(" ");
          context = this._root;
        }
      } else if (!context.cheerio) {
        context = Cheerio.call(this, context);
      }
      if (!context) return this;
      return context.find(selector);
    };
    _.extend(Cheerio, require_static());
    Cheerio.prototype.cheerio = "[cheerio object]";
    Cheerio.prototype.options = {
      withDomLvl1: true,
      normalizeWhitespace: false,
      xmlMode: false,
      decodeEntities: true
    };
    Cheerio.prototype.length = 0;
    Cheerio.prototype.splice = Array.prototype.splice;
    Cheerio.prototype._make = function(dom, context) {
      var cheerio = new this.constructor(dom, context, this._root, this.options);
      cheerio.prevObject = this;
      return cheerio;
    };
    Cheerio.prototype.toArray = function() {
      return this.get();
    };
    api.forEach(function(mod) {
      _.extend(Cheerio.prototype, mod);
    });
    var isNode = function(obj) {
      return obj.name || obj.type === "text" || obj.type === "comment";
    };
  }
});

// node_modules/cheerio/package.json
var require_package = __commonJS({
  "node_modules/cheerio/package.json"(exports6, module2) {
    module2.exports = {
      name: "cheerio",
      version: "0.22.0",
      description: "Tiny, fast, and elegant implementation of core jQuery designed specifically for the server",
      author: "Matt Mueller <mattmuelle@gmail.com> (mat.io)",
      license: "MIT",
      keywords: [
        "htmlparser",
        "jquery",
        "selector",
        "scraper",
        "parser",
        "html"
      ],
      repository: {
        type: "git",
        url: "git://github.com/cheeriojs/cheerio.git"
      },
      main: "./index.js",
      files: [
        "index.js",
        "lib"
      ],
      engines: {
        node: ">= 0.6"
      },
      dependencies: {
        "css-select": "~1.2.0",
        "dom-serializer": "~0.1.0",
        entities: "~1.1.1",
        htmlparser2: "^3.9.1",
        "lodash.assignin": "^4.0.9",
        "lodash.bind": "^4.1.4",
        "lodash.defaults": "^4.0.1",
        "lodash.filter": "^4.4.0",
        "lodash.flatten": "^4.2.0",
        "lodash.foreach": "^4.3.0",
        "lodash.map": "^4.4.0",
        "lodash.merge": "^4.4.0",
        "lodash.pick": "^4.2.1",
        "lodash.reduce": "^4.4.0",
        "lodash.reject": "^4.4.0",
        "lodash.some": "^4.4.0"
      },
      devDependencies: {
        benchmark: "^2.1.0",
        coveralls: "^2.11.9",
        "expect.js": "~0.3.1",
        istanbul: "^0.4.3",
        jsdom: "^9.2.1",
        jquery: "^3.0.0",
        jshint: "^2.9.2",
        mocha: "^2.5.3",
        xyz: "~0.5.0"
      },
      scripts: {
        test: "make test"
      }
    };
  }
});

// node_modules/cheerio/index.js
var require_cheerio2 = __commonJS({
  "node_modules/cheerio/index.js"(exports6, module2) {
    init_dirname();
    init_buffer2();
    init_process2();
    exports6 = module2.exports = require_cheerio();
    exports6.version = require_package().version;
  }
});

// <stdin>
init_dirname();
init_buffer2();
init_process2();
module.exports = require_cheerio2();
