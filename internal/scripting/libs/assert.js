var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
function unimplemented(name) {
  throw new Error("Node.js process " + name + " is not supported by JSPM core outside of Node.js");
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
function _linkedBinding(name) {
  unimplemented("_linkedBinding");
}
function dlopen(name) {
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
function listeners(name) {
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
    binding = function(name) {
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
    var e, m2;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? nBytes - 1 : 0;
    var d2 = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d2;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d2, nBits -= 8) {
    }
    m2 = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;
    for (; nBits > 0; m2 = m2 * 256 + buffer[offset + i], i += d2, nBits -= 8) {
    }
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m2 ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m2 = m2 + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m2 * Math.pow(2, e - mLen);
  };
  exports$1.write = function(buffer, value, offset, isLE, mLen, nBytes) {
    var e, m2, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    var i = isLE ? 0 : nBytes - 1;
    var d2 = isLE ? 1 : -1;
    var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
      m2 = isNaN(value) ? 1 : 0;
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
        m2 = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m2 = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m2 = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }
    for (; mLen >= 8; buffer[offset + i] = m2 & 255, i += d2, m2 /= 256, mLen -= 8) {
    }
    e = e << mLen | m2;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 255, i += d2, e /= 256, eLen -= 8) {
    }
    buffer[offset + i - d2] |= s * 128;
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
  function swap(b, n, m2) {
    const i = b[n];
    b[n] = b[m2];
    b[m2] = i;
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
  E("ERR_BUFFER_OUT_OF_BOUNDS", function(name) {
    if (name) {
      return `${name} is outside of buffer bounds`;
    }
    return "Attempt to access memory outside buffer bounds";
  }, RangeError);
  E("ERR_INVALID_ARG_TYPE", function(name, actual) {
    return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
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
  function validateNumber(value, name) {
    if (typeof value !== "number") {
      throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
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
  var doEval = function doEval2(name) {
    var value;
    if (name === "%AsyncFunction%") {
      value = getEvalledConstructor("async function () {}");
    } else if (name === "%GeneratorFunction%") {
      value = getEvalledConstructor("function* () {}");
    } else if (name === "%AsyncGeneratorFunction%") {
      value = getEvalledConstructor("async function* () {}");
    } else if (name === "%AsyncGenerator%") {
      var fn = doEval2("%AsyncGeneratorFunction%");
      if (fn) {
        value = fn.prototype;
      }
    } else if (name === "%AsyncIteratorPrototype%") {
      var gen = doEval2("%AsyncGenerator%");
      if (gen && getProto) {
        value = getProto(gen.prototype);
      }
    }
    INTRINSICS[name] = value;
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
  var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
    var intrinsicName = name;
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
        throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
      }
      return {
        alias,
        name: intrinsicName,
        value
      };
    }
    throw new $SyntaxError("intrinsic " + name + " does not exist!");
  };
  exports$7 = function GetIntrinsic(name, allowMissing) {
    if (typeof name !== "string" || name.length === 0) {
      throw new $TypeError("intrinsic name must be a non-empty string");
    }
    if (arguments.length > 1 && typeof allowMissing !== "boolean") {
      throw new $TypeError('"allowMissing" argument must be a boolean');
    }
    if ($exec(/^%?[^%]*%?$/, name) === null) {
      throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    }
    var parts = stringToPath(name);
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
            throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
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
  if (_dewExec$22) return exports$22;
  _dewExec$22 = true;
  var GetIntrinsic = dew$7();
  var define = dew$4();
  var hasDescriptors = dew$3()();
  var gOPD = dew$5();
  var $TypeError = dew$e();
  var $floor = GetIntrinsic("%Math.floor%");
  exports$22 = function setFunctionLength(fn, length) {
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
  return exports$22;
}
function dew$12() {
  if (_dewExec$12) return exports$12;
  _dewExec$12 = true;
  var bind = dew$9();
  var GetIntrinsic = dew$7();
  var setFunctionLength = dew$22();
  var $TypeError = dew$e();
  var $apply = GetIntrinsic("%Function.prototype.apply%");
  var $call = GetIntrinsic("%Function.prototype.call%");
  var $reflectApply = GetIntrinsic("%Reflect.apply%", true) || bind.call($call, $apply);
  var $defineProperty = dew$6();
  var $max = GetIntrinsic("%Math.max%");
  exports$12 = function callBind(originalFunction) {
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
    $defineProperty(exports$12, "apply", {
      value: applyBind
    });
  } else {
    exports$12.apply = applyBind;
  }
  return exports$12;
}
function dew2() {
  if (_dewExec2) return exports4;
  _dewExec2 = true;
  var GetIntrinsic = dew$7();
  var callBind = dew$12();
  var $indexOf = callBind(GetIntrinsic("String.prototype.indexOf"));
  exports4 = function callBoundIntrinsic(name, allowMissing) {
    var intrinsic = GetIntrinsic(name, !!allowMissing);
    if (typeof intrinsic === "function" && $indexOf(name, ".prototype.") > -1) {
      return callBind(intrinsic);
    }
    return intrinsic;
  };
  return exports4;
}
var exports$k, _dewExec$k, exports$j, _dewExec$j, exports$i, _dewExec$i, exports$h, _dewExec$h, exports$g, _dewExec$g, exports$f, _dewExec$f, exports$e, _dewExec$e, exports$d, _dewExec$d, exports$c, _dewExec$c, exports$b, _dewExec$b, exports$a, _dewExec$a, exports$9, _dewExec$9, exports$8, _dewExec$8, exports$7, _dewExec$7, exports$6, _dewExec$6, exports$5, _dewExec$5, exports$4, _dewExec$4, exports$3, _dewExec$3, exports$22, _dewExec$22, exports$12, _dewExec$12, exports4, _dewExec2;
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
    exports$22 = {};
    _dewExec$22 = false;
    exports$12 = {};
    _dewExec$12 = false;
    exports4 = {};
    _dewExec2 = false;
  }
});

// node_modules/@jspm/core/nodelibs/browser/chunk-CkFCi-G1.js
function dew3() {
  if (_dewExec3) return exports5;
  _dewExec3 = true;
  if (typeof Object.create === "function") {
    exports5 = function inherits2(ctor, superCtor) {
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
    exports5 = function inherits2(ctor, superCtor) {
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
  return exports5;
}
var exports5, _dewExec3;
var init_chunk_CkFCi_G1 = __esm({
  "node_modules/@jspm/core/nodelibs/browser/chunk-CkFCi-G1.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    exports5 = {};
    _dewExec3 = false;
  }
});

// node_modules/@jspm/core/nodelibs/browser/chunk-DEMDiNwt.js
function unimplemented2(name) {
  throw new Error("Node.js process " + name + " is not supported by JSPM core outside of Node.js");
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
function _linkedBinding2(name) {
  unimplemented2("_linkedBinding");
}
function dlopen2(name) {
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
function on2() {
  return process2;
}
function listeners2(name) {
  return [];
}
var queue2, draining2, currentQueue2, queueIndex2, title2, arch2, platform2, env2, argv2, execArgv2, version2, versions2, emitWarning2, binding2, umask2, cwd2, chdir2, release2, _rawDebug2, moduleLoadList2, domain2, _exiting2, config2, reallyExit2, _kill2, cpuUsage2, resourceUsage2, memoryUsage2, kill2, exit2, openStdin2, allowedNodeEnvironmentFlags2, features2, _fatalExceptions2, setUncaughtExceptionCaptureCallback2, _tickCallback2, _debugProcess2, _debugEnd2, _startProfilerIdleNotifier2, _stopProfilerIdleNotifier2, stdout2, stderr2, stdin2, abort2, pid2, ppid2, execPath2, debugPort2, argv02, _preload_modules2, setSourceMapsEnabled2, _performance2, nowOffset, nanoPerSec2, _maxListeners2, _events2, _eventsCount2, addListener2, once2, off2, removeListener2, removeAllListeners2, emit2, prependListener2, prependOnceListener2, process2;
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
    binding2 = function(name) {
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
    addListener2 = on2;
    once2 = on2;
    off2 = on2;
    removeListener2 = on2;
    removeAllListeners2 = on2;
    emit2 = noop2;
    prependListener2 = on2;
    prependOnceListener2 = on2;
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
      on: on2,
      addListener: addListener2,
      once: once2,
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
  var callBound = dew2();
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
  var callBind = dew$12();
  var callBound = dew2();
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
      function(getter, name) {
        if (!found) {
          try {
            getter(value);
            found = $slice(name, 1);
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
function dew$13() {
  if (_dewExec$13) return exports$23;
  _dewExec$13 = true;
  exports$23 = function isBuffer2(arg) {
    return arg && typeof arg === "object" && typeof arg.copy === "function" && typeof arg.fill === "function" && typeof arg.readUInt8 === "function";
  };
  return exports$23;
}
function dew4() {
  if (_dewExec4) return exports$13;
  _dewExec4 = true;
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
  exports$13.format = function(f) {
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
  exports$13.deprecate = function(fn, msg) {
    if (typeof process$1 !== "undefined" && process$1.noDeprecation === true) {
      return fn;
    }
    if (typeof process$1 === "undefined") {
      return function() {
        return exports$13.deprecate(fn, msg).apply(this || _global, arguments);
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
  exports$13.debuglog = function(set) {
    set = set.toUpperCase();
    if (!debugs[set]) {
      if (debugEnvRegex.test(set)) {
        var pid3 = process$1.pid;
        debugs[set] = function() {
          var msg = exports$13.format.apply(exports$13, arguments);
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
      exports$13._extend(ctx, opts);
    }
    if (isUndefined2(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined2(ctx.depth)) ctx.depth = 2;
    if (isUndefined2(ctx.colors)) ctx.colors = false;
    if (isUndefined2(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }
  exports$13.inspect = inspect2;
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
    value.inspect !== exports$13.inspect && // Also filter out any prototype objects using the circular check.
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
        var name = value.name ? ": " + value.name : "";
        return ctx.stylize("[Function" + name + "]", "special");
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
    var name, str, desc;
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
      name = "[" + key + "]";
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
    if (isUndefined2(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }
      name = JSON.stringify("" + key);
      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.slice(1, -1);
        name = ctx.stylize(name, "name");
      } else {
        name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, "string");
      }
    }
    return name + ": " + str;
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
  exports$13.types = dew$23();
  function isArray2(ar) {
    return Array.isArray(ar);
  }
  exports$13.isArray = isArray2;
  function isBoolean2(arg) {
    return typeof arg === "boolean";
  }
  exports$13.isBoolean = isBoolean2;
  function isNull2(arg) {
    return arg === null;
  }
  exports$13.isNull = isNull2;
  function isNullOrUndefined2(arg) {
    return arg == null;
  }
  exports$13.isNullOrUndefined = isNullOrUndefined2;
  function isNumber2(arg) {
    return typeof arg === "number";
  }
  exports$13.isNumber = isNumber2;
  function isString2(arg) {
    return typeof arg === "string";
  }
  exports$13.isString = isString2;
  function isSymbol2(arg) {
    return typeof arg === "symbol";
  }
  exports$13.isSymbol = isSymbol2;
  function isUndefined2(arg) {
    return arg === void 0;
  }
  exports$13.isUndefined = isUndefined2;
  function isRegExp2(re) {
    return isObject2(re) && objectToString(re) === "[object RegExp]";
  }
  exports$13.isRegExp = isRegExp2;
  exports$13.types.isRegExp = isRegExp2;
  function isObject2(arg) {
    return typeof arg === "object" && arg !== null;
  }
  exports$13.isObject = isObject2;
  function isDate2(d2) {
    return isObject2(d2) && objectToString(d2) === "[object Date]";
  }
  exports$13.isDate = isDate2;
  exports$13.types.isDate = isDate2;
  function isError2(e) {
    return isObject2(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
  }
  exports$13.isError = isError2;
  exports$13.types.isNativeError = isError2;
  function isFunction2(arg) {
    return typeof arg === "function";
  }
  exports$13.isFunction = isFunction2;
  function isPrimitive2(arg) {
    return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || // ES6 symbol
    typeof arg === "undefined";
  }
  exports$13.isPrimitive = isPrimitive2;
  exports$13.isBuffer = dew$13();
  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }
  function pad(n) {
    return n < 10 ? "0" + n.toString(10) : n.toString(10);
  }
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function timestamp() {
    var d2 = /* @__PURE__ */ new Date();
    var time = [pad(d2.getHours()), pad(d2.getMinutes()), pad(d2.getSeconds())].join(":");
    return [d2.getDate(), months[d2.getMonth()], time].join(" ");
  }
  exports$13.log = function() {
    console.log("%s - %s", timestamp(), exports$13.format.apply(exports$13, arguments));
  };
  exports$13.inherits = dew3();
  exports$13._extend = function(origin, add) {
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
  exports$13.promisify = function promisify2(original) {
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
  exports$13.promisify.custom = kCustomPromisifiedSymbol;
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
  exports$13.callbackify = callbackify2;
  return exports$13;
}
var exports$c2, _dewExec$b2, exports$b2, _dewExec$a2, exports$a2, _dewExec$92, exports$92, _dewExec$82, exports$82, _dewExec$72, exports$72, _dewExec$62, exports$62, _dewExec$52, _global$2, exports$52, _dewExec$42, _global$1, exports$42, _dewExec$32, exports$32, _dewExec$23, exports$23, _dewExec$13, exports$13, _dewExec4, _global, exports6, _extend, callbackify, debuglog, deprecate, format, inherits, inspect, isArray, isBoolean, isBuffer, isDate, isError, isFunction, isNull, isNullOrUndefined, isNumber, isObject, isPrimitive, isRegExp, isString, isSymbol, isUndefined, log, promisify, types, TextEncoder, TextDecoder;
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
    exports$23 = {};
    _dewExec$13 = false;
    exports$13 = {};
    _dewExec4 = false;
    _global = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : globalThis;
    exports6 = dew4();
    exports6["format"];
    exports6["deprecate"];
    exports6["debuglog"];
    exports6["inspect"];
    exports6["types"];
    exports6["isArray"];
    exports6["isBoolean"];
    exports6["isNull"];
    exports6["isNullOrUndefined"];
    exports6["isNumber"];
    exports6["isString"];
    exports6["isSymbol"];
    exports6["isUndefined"];
    exports6["isRegExp"];
    exports6["isObject"];
    exports6["isDate"];
    exports6["isError"];
    exports6["isFunction"];
    exports6["isPrimitive"];
    exports6["isBuffer"];
    exports6["log"];
    exports6["inherits"];
    exports6["_extend"];
    exports6["promisify"];
    exports6["callbackify"];
    _extend = exports6._extend;
    callbackify = exports6.callbackify;
    debuglog = exports6.debuglog;
    deprecate = exports6.deprecate;
    format = exports6.format;
    inherits = exports6.inherits;
    inspect = exports6.inspect;
    isArray = exports6.isArray;
    isBoolean = exports6.isBoolean;
    isBuffer = exports6.isBuffer;
    isDate = exports6.isDate;
    isError = exports6.isError;
    isFunction = exports6.isFunction;
    isNull = exports6.isNull;
    isNullOrUndefined = exports6.isNullOrUndefined;
    isNumber = exports6.isNumber;
    isObject = exports6.isObject;
    isPrimitive = exports6.isPrimitive;
    isRegExp = exports6.isRegExp;
    isString = exports6.isString;
    isSymbol = exports6.isSymbol;
    isUndefined = exports6.isUndefined;
    log = exports6.log;
    promisify = exports6.promisify;
    types = exports6.types;
    TextEncoder = exports6.TextEncoder = globalThis.TextEncoder;
    TextDecoder = exports6.TextDecoder = globalThis.TextDecoder;
  }
});

// node_modules/@jspm/core/nodelibs/browser/assert.js
var assert_exports = {};
__export(assert_exports, {
  AssertionError: () => AssertionError,
  deepEqual: () => deepEqual,
  deepStrictEqual: () => deepStrictEqual,
  default: () => exports7,
  doesNotReject: () => doesNotReject,
  doesNotThrow: () => doesNotThrow,
  equal: () => equal,
  fail: () => fail,
  ifError: () => ifError,
  notDeepEqual: () => notDeepEqual,
  notDeepStrictEqual: () => notDeepStrictEqual,
  notEqual: () => notEqual,
  notStrictEqual: () => notStrictEqual,
  ok: () => ok,
  rejects: () => rejects,
  strict: () => strict,
  strictEqual: () => strictEqual,
  throws: () => throws
});
function dew$h2() {
  if (_dewExec$h2) return exports$i2;
  _dewExec$h2 = true;
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  function _createClass(Constructor, protoProps, staticProps) {
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    Object.defineProperty(subClass, "prototype", {
      writable: false
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }
  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
      o2.__proto__ = p2;
      return o2;
    };
    return _setPrototypeOf(o, p);
  }
  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();
    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived), result;
      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;
        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }
      return _possibleConstructorReturn(this, result);
    };
  }
  function _possibleConstructorReturn(self2, call) {
    if (call && (_typeof(call) === "object" || typeof call === "function")) {
      return call;
    } else if (call !== void 0) {
      throw new TypeError("Derived constructors may only return object or undefined");
    }
    return _assertThisInitialized(self2);
  }
  function _assertThisInitialized(self2) {
    if (self2 === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self2;
  }
  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;
    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
      return true;
    } catch (e) {
      return false;
    }
  }
  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
      return o2.__proto__ || Object.getPrototypeOf(o2);
    };
    return _getPrototypeOf(o);
  }
  var codes = {};
  var assert3;
  var util;
  function createErrorType(code, message, Base) {
    if (!Base) {
      Base = Error;
    }
    function getMessage(arg1, arg2, arg3) {
      if (typeof message === "string") {
        return message;
      } else {
        return message(arg1, arg2, arg3);
      }
    }
    var NodeError = /* @__PURE__ */ (function(_Base) {
      _inherits(NodeError2, _Base);
      var _super = _createSuper(NodeError2);
      function NodeError2(arg1, arg2, arg3) {
        var _this;
        _classCallCheck(this, NodeError2);
        _this = _super.call(this, getMessage(arg1, arg2, arg3));
        _this.code = code;
        return _this;
      }
      return _createClass(NodeError2);
    })(Base);
    codes[code] = NodeError;
  }
  function oneOf(expected, thing) {
    if (Array.isArray(expected)) {
      var len = expected.length;
      expected = expected.map(function(i) {
        return String(i);
      });
      if (len > 2) {
        return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(", "), ", or ") + expected[len - 1];
      } else if (len === 2) {
        return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
      } else {
        return "of ".concat(thing, " ").concat(expected[0]);
      }
    } else {
      return "of ".concat(thing, " ").concat(String(expected));
    }
  }
  function startsWith(str, search, pos) {
    return str.substr(0, search.length) === search;
  }
  function endsWith(str, search, this_len) {
    if (this_len === void 0 || this_len > str.length) {
      this_len = str.length;
    }
    return str.substring(this_len - search.length, this_len) === search;
  }
  function includes(str, search, start) {
    if (typeof start !== "number") {
      start = 0;
    }
    if (start + search.length > str.length) {
      return false;
    } else {
      return str.indexOf(search, start) !== -1;
    }
  }
  createErrorType("ERR_AMBIGUOUS_ARGUMENT", 'The "%s" argument is ambiguous. %s', TypeError);
  createErrorType("ERR_INVALID_ARG_TYPE", function(name, expected, actual) {
    if (assert3 === void 0) assert3 = dew5();
    assert3(typeof name === "string", "'name' must be a string");
    var determiner;
    if (typeof expected === "string" && startsWith(expected, "not ")) {
      determiner = "must not be";
      expected = expected.replace(/^not /, "");
    } else {
      determiner = "must be";
    }
    var msg;
    if (endsWith(name, " argument")) {
      msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, "type"));
    } else {
      var type = includes(name, ".") ? "property" : "argument";
      msg = 'The "'.concat(name, '" ').concat(type, " ").concat(determiner, " ").concat(oneOf(expected, "type"));
    }
    msg += ". Received type ".concat(_typeof(actual));
    return msg;
  }, TypeError);
  createErrorType("ERR_INVALID_ARG_VALUE", function(name, value) {
    var reason = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "is invalid";
    if (util === void 0) util = exports6;
    var inspected = util.inspect(value);
    if (inspected.length > 128) {
      inspected = "".concat(inspected.slice(0, 128), "...");
    }
    return "The argument '".concat(name, "' ").concat(reason, ". Received ").concat(inspected);
  }, TypeError);
  createErrorType("ERR_INVALID_RETURN_VALUE", function(input, name, value) {
    var type;
    if (value && value.constructor && value.constructor.name) {
      type = "instance of ".concat(value.constructor.name);
    } else {
      type = "type ".concat(_typeof(value));
    }
    return "Expected ".concat(input, ' to be returned from the "').concat(name, '"') + " function but got ".concat(type, ".");
  }, TypeError);
  createErrorType("ERR_MISSING_ARGS", function() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    if (assert3 === void 0) assert3 = dew5();
    assert3(args.length > 0, "At least one arg needs to be specified");
    var msg = "The ";
    var len = args.length;
    args = args.map(function(a) {
      return '"'.concat(a, '"');
    });
    switch (len) {
      case 1:
        msg += "".concat(args[0], " argument");
        break;
      case 2:
        msg += "".concat(args[0], " and ").concat(args[1], " arguments");
        break;
      default:
        msg += args.slice(0, len - 1).join(", ");
        msg += ", and ".concat(args[len - 1], " arguments");
        break;
    }
    return "".concat(msg, " must be specified");
  }, TypeError);
  exports$i2.codes = codes;
  return exports$i2;
}
function dew$g2() {
  if (_dewExec$g2) return exports$h2;
  _dewExec$g2 = true;
  var process$1 = process2;
  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function(r2) {
        return Object.getOwnPropertyDescriptor(e, r2).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
        _defineProperty(e, r2, t[r2]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
        Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
      });
    }
    return e;
  }
  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return _typeof(key) === "symbol" ? key : String(key);
  }
  function _toPrimitive(input, hint) {
    if (_typeof(input) !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== void 0) {
      var res = prim.call(input, hint || "default");
      if (_typeof(res) !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    Object.defineProperty(subClass, "prototype", {
      writable: false
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }
  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();
    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived), result;
      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;
        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }
      return _possibleConstructorReturn(this, result);
    };
  }
  function _possibleConstructorReturn(self2, call) {
    if (call && (_typeof(call) === "object" || typeof call === "function")) {
      return call;
    } else if (call !== void 0) {
      throw new TypeError("Derived constructors may only return object or undefined");
    }
    return _assertThisInitialized(self2);
  }
  function _assertThisInitialized(self2) {
    if (self2 === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self2;
  }
  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? /* @__PURE__ */ new Map() : void 0;
    _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
      if (Class2 === null || !_isNativeFunction(Class2)) return Class2;
      if (typeof Class2 !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }
      if (typeof _cache !== "undefined") {
        if (_cache.has(Class2)) return _cache.get(Class2);
        _cache.set(Class2, Wrapper);
      }
      function Wrapper() {
        return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
      }
      Wrapper.prototype = Object.create(Class2.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class2);
    };
    return _wrapNativeSuper(Class);
  }
  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) {
      _construct = Reflect.construct.bind();
    } else {
      _construct = function _construct2(Parent2, args2, Class2) {
        var a = [null];
        a.push.apply(a, args2);
        var Constructor = Function.bind.apply(Parent2, a);
        var instance = new Constructor();
        if (Class2) _setPrototypeOf(instance, Class2.prototype);
        return instance;
      };
    }
    return _construct.apply(null, arguments);
  }
  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;
    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
      return true;
    } catch (e) {
      return false;
    }
  }
  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }
  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
      o2.__proto__ = p2;
      return o2;
    };
    return _setPrototypeOf(o, p);
  }
  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
      return o2.__proto__ || Object.getPrototypeOf(o2);
    };
    return _getPrototypeOf(o);
  }
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  var _require = exports6, inspect2 = _require.inspect;
  var _require2 = dew$h2(), ERR_INVALID_ARG_TYPE = _require2.codes.ERR_INVALID_ARG_TYPE;
  function endsWith(str, search, this_len) {
    if (this_len === void 0 || this_len > str.length) {
      this_len = str.length;
    }
    return str.substring(this_len - search.length, this_len) === search;
  }
  function repeat(str, count) {
    count = Math.floor(count);
    if (str.length == 0 || count == 0) return "";
    var maxCount = str.length * count;
    count = Math.floor(Math.log(count) / Math.log(2));
    while (count) {
      str += str;
      count--;
    }
    str += str.substring(0, maxCount - str.length);
    return str;
  }
  var blue = "";
  var green = "";
  var red = "";
  var white = "";
  var kReadableOperator = {
    deepStrictEqual: "Expected values to be strictly deep-equal:",
    strictEqual: "Expected values to be strictly equal:",
    strictEqualObject: 'Expected "actual" to be reference-equal to "expected":',
    deepEqual: "Expected values to be loosely deep-equal:",
    equal: "Expected values to be loosely equal:",
    notDeepStrictEqual: 'Expected "actual" not to be strictly deep-equal to:',
    notStrictEqual: 'Expected "actual" to be strictly unequal to:',
    notStrictEqualObject: 'Expected "actual" not to be reference-equal to "expected":',
    notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
    notEqual: 'Expected "actual" to be loosely unequal to:',
    notIdentical: "Values identical but not reference-equal:"
  };
  var kMaxShortLength = 10;
  function copyError(source) {
    var keys = Object.keys(source);
    var target = Object.create(Object.getPrototypeOf(source));
    keys.forEach(function(key) {
      target[key] = source[key];
    });
    Object.defineProperty(target, "message", {
      value: source.message
    });
    return target;
  }
  function inspectValue(val) {
    return inspect2(val, {
      compact: false,
      customInspect: false,
      depth: 1e3,
      maxArrayLength: Infinity,
      // Assert compares only enumerable properties (with a few exceptions).
      showHidden: false,
      // Having a long line as error is better than wrapping the line for
      // comparison for now.
      // TODO(BridgeAR): `breakLength` should be limited as soon as soon as we
      // have meta information about the inspected properties (i.e., know where
      // in what line the property starts and ends).
      breakLength: Infinity,
      // Assert does not detect proxies currently.
      showProxy: false,
      sorted: true,
      // Inspect getters as we also check them when comparing entries.
      getters: true
    });
  }
  function createErrDiff(actual, expected, operator) {
    var other = "";
    var res = "";
    var lastPos = 0;
    var end = "";
    var skipped = false;
    var actualInspected = inspectValue(actual);
    var actualLines = actualInspected.split("\n");
    var expectedLines = inspectValue(expected).split("\n");
    var i = 0;
    var indicator = "";
    if (operator === "strictEqual" && _typeof(actual) === "object" && _typeof(expected) === "object" && actual !== null && expected !== null) {
      operator = "strictEqualObject";
    }
    if (actualLines.length === 1 && expectedLines.length === 1 && actualLines[0] !== expectedLines[0]) {
      var inputLength = actualLines[0].length + expectedLines[0].length;
      if (inputLength <= kMaxShortLength) {
        if ((_typeof(actual) !== "object" || actual === null) && (_typeof(expected) !== "object" || expected === null) && (actual !== 0 || expected !== 0)) {
          return "".concat(kReadableOperator[operator], "\n\n") + "".concat(actualLines[0], " !== ").concat(expectedLines[0], "\n");
        }
      } else if (operator !== "strictEqualObject") {
        var maxLength = process$1.stderr && process$1.stderr.isTTY ? process$1.stderr.columns : 80;
        if (inputLength < maxLength) {
          while (actualLines[0][i] === expectedLines[0][i]) {
            i++;
          }
          if (i > 2) {
            indicator = "\n  ".concat(repeat(" ", i), "^");
            i = 0;
          }
        }
      }
    }
    var a = actualLines[actualLines.length - 1];
    var b = expectedLines[expectedLines.length - 1];
    while (a === b) {
      if (i++ < 2) {
        end = "\n  ".concat(a).concat(end);
      } else {
        other = a;
      }
      actualLines.pop();
      expectedLines.pop();
      if (actualLines.length === 0 || expectedLines.length === 0) break;
      a = actualLines[actualLines.length - 1];
      b = expectedLines[expectedLines.length - 1];
    }
    var maxLines = Math.max(actualLines.length, expectedLines.length);
    if (maxLines === 0) {
      var _actualLines = actualInspected.split("\n");
      if (_actualLines.length > 30) {
        _actualLines[26] = "".concat(blue, "...").concat(white);
        while (_actualLines.length > 27) {
          _actualLines.pop();
        }
      }
      return "".concat(kReadableOperator.notIdentical, "\n\n").concat(_actualLines.join("\n"), "\n");
    }
    if (i > 3) {
      end = "\n".concat(blue, "...").concat(white).concat(end);
      skipped = true;
    }
    if (other !== "") {
      end = "\n  ".concat(other).concat(end);
      other = "";
    }
    var printedLines = 0;
    var msg = kReadableOperator[operator] + "\n".concat(green, "+ actual").concat(white, " ").concat(red, "- expected").concat(white);
    var skippedMsg = " ".concat(blue, "...").concat(white, " Lines skipped");
    for (i = 0; i < maxLines; i++) {
      var cur = i - lastPos;
      if (actualLines.length < i + 1) {
        if (cur > 1 && i > 2) {
          if (cur > 4) {
            res += "\n".concat(blue, "...").concat(white);
            skipped = true;
          } else if (cur > 3) {
            res += "\n  ".concat(expectedLines[i - 2]);
            printedLines++;
          }
          res += "\n  ".concat(expectedLines[i - 1]);
          printedLines++;
        }
        lastPos = i;
        other += "\n".concat(red, "-").concat(white, " ").concat(expectedLines[i]);
        printedLines++;
      } else if (expectedLines.length < i + 1) {
        if (cur > 1 && i > 2) {
          if (cur > 4) {
            res += "\n".concat(blue, "...").concat(white);
            skipped = true;
          } else if (cur > 3) {
            res += "\n  ".concat(actualLines[i - 2]);
            printedLines++;
          }
          res += "\n  ".concat(actualLines[i - 1]);
          printedLines++;
        }
        lastPos = i;
        res += "\n".concat(green, "+").concat(white, " ").concat(actualLines[i]);
        printedLines++;
      } else {
        var expectedLine = expectedLines[i];
        var actualLine = actualLines[i];
        var divergingLines = actualLine !== expectedLine && (!endsWith(actualLine, ",") || actualLine.slice(0, -1) !== expectedLine);
        if (divergingLines && endsWith(expectedLine, ",") && expectedLine.slice(0, -1) === actualLine) {
          divergingLines = false;
          actualLine += ",";
        }
        if (divergingLines) {
          if (cur > 1 && i > 2) {
            if (cur > 4) {
              res += "\n".concat(blue, "...").concat(white);
              skipped = true;
            } else if (cur > 3) {
              res += "\n  ".concat(actualLines[i - 2]);
              printedLines++;
            }
            res += "\n  ".concat(actualLines[i - 1]);
            printedLines++;
          }
          lastPos = i;
          res += "\n".concat(green, "+").concat(white, " ").concat(actualLine);
          other += "\n".concat(red, "-").concat(white, " ").concat(expectedLine);
          printedLines += 2;
        } else {
          res += other;
          other = "";
          if (cur === 1 || i === 0) {
            res += "\n  ".concat(actualLine);
            printedLines++;
          }
        }
      }
      if (printedLines > 20 && i < maxLines - 2) {
        return "".concat(msg).concat(skippedMsg, "\n").concat(res, "\n").concat(blue, "...").concat(white).concat(other, "\n") + "".concat(blue, "...").concat(white);
      }
    }
    return "".concat(msg).concat(skipped ? skippedMsg : "", "\n").concat(res).concat(other).concat(end).concat(indicator);
  }
  var AssertionError2 = /* @__PURE__ */ (function(_Error, _inspect$custom) {
    _inherits(AssertionError3, _Error);
    var _super = _createSuper(AssertionError3);
    function AssertionError3(options) {
      var _this;
      _classCallCheck(this, AssertionError3);
      if (_typeof(options) !== "object" || options === null) {
        throw new ERR_INVALID_ARG_TYPE("options", "Object", options);
      }
      var message = options.message, operator = options.operator, stackStartFn = options.stackStartFn;
      var actual = options.actual, expected = options.expected;
      var limit = Error.stackTraceLimit;
      Error.stackTraceLimit = 0;
      if (message != null) {
        _this = _super.call(this, String(message));
      } else {
        if (process$1.stderr && process$1.stderr.isTTY) {
          if (process$1.stderr && process$1.stderr.getColorDepth && process$1.stderr.getColorDepth() !== 1) {
            blue = "\x1B[34m";
            green = "\x1B[32m";
            white = "\x1B[39m";
            red = "\x1B[31m";
          } else {
            blue = "";
            green = "";
            white = "";
            red = "";
          }
        }
        if (_typeof(actual) === "object" && actual !== null && _typeof(expected) === "object" && expected !== null && "stack" in actual && actual instanceof Error && "stack" in expected && expected instanceof Error) {
          actual = copyError(actual);
          expected = copyError(expected);
        }
        if (operator === "deepStrictEqual" || operator === "strictEqual") {
          _this = _super.call(this, createErrDiff(actual, expected, operator));
        } else if (operator === "notDeepStrictEqual" || operator === "notStrictEqual") {
          var base = kReadableOperator[operator];
          var res = inspectValue(actual).split("\n");
          if (operator === "notStrictEqual" && _typeof(actual) === "object" && actual !== null) {
            base = kReadableOperator.notStrictEqualObject;
          }
          if (res.length > 30) {
            res[26] = "".concat(blue, "...").concat(white);
            while (res.length > 27) {
              res.pop();
            }
          }
          if (res.length === 1) {
            _this = _super.call(this, "".concat(base, " ").concat(res[0]));
          } else {
            _this = _super.call(this, "".concat(base, "\n\n").concat(res.join("\n"), "\n"));
          }
        } else {
          var _res = inspectValue(actual);
          var other = "";
          var knownOperators = kReadableOperator[operator];
          if (operator === "notDeepEqual" || operator === "notEqual") {
            _res = "".concat(kReadableOperator[operator], "\n\n").concat(_res);
            if (_res.length > 1024) {
              _res = "".concat(_res.slice(0, 1021), "...");
            }
          } else {
            other = "".concat(inspectValue(expected));
            if (_res.length > 512) {
              _res = "".concat(_res.slice(0, 509), "...");
            }
            if (other.length > 512) {
              other = "".concat(other.slice(0, 509), "...");
            }
            if (operator === "deepEqual" || operator === "equal") {
              _res = "".concat(knownOperators, "\n\n").concat(_res, "\n\nshould equal\n\n");
            } else {
              other = " ".concat(operator, " ").concat(other);
            }
          }
          _this = _super.call(this, "".concat(_res).concat(other));
        }
      }
      Error.stackTraceLimit = limit;
      _this.generatedMessage = !message;
      Object.defineProperty(_assertThisInitialized(_this), "name", {
        value: "AssertionError [ERR_ASSERTION]",
        enumerable: false,
        writable: true,
        configurable: true
      });
      _this.code = "ERR_ASSERTION";
      _this.actual = actual;
      _this.expected = expected;
      _this.operator = operator;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(_assertThisInitialized(_this), stackStartFn);
      }
      _this.stack;
      _this.name = "AssertionError";
      return _possibleConstructorReturn(_this);
    }
    _createClass(AssertionError3, [{
      key: "toString",
      value: function toString() {
        return "".concat(this.name, " [").concat(this.code, "]: ").concat(this.message);
      }
    }, {
      key: _inspect$custom,
      value: function value(recurseTimes, ctx) {
        return inspect2(this, _objectSpread(_objectSpread({}, ctx), {}, {
          customInspect: false,
          depth: 0
        }));
      }
    }]);
    return AssertionError3;
  })(/* @__PURE__ */ _wrapNativeSuper(Error), inspect2.custom);
  exports$h2 = AssertionError2;
  return exports$h2;
}
function dew$f2() {
  if (_dewExec$f2) return exports$g2;
  _dewExec$f2 = true;
  var toStr = Object.prototype.toString;
  exports$g2 = function isArguments(value) {
    var str = toStr.call(value);
    var isArgs = str === "[object Arguments]";
    if (!isArgs) {
      isArgs = str !== "[object Array]" && value !== null && typeof value === "object" && typeof value.length === "number" && value.length >= 0 && toStr.call(value.callee) === "[object Function]";
    }
    return isArgs;
  };
  return exports$g2;
}
function dew$e2() {
  if (_dewExec$e2) return exports$f2;
  _dewExec$e2 = true;
  var keysShim;
  if (!Object.keys) {
    var has = Object.prototype.hasOwnProperty;
    var toStr = Object.prototype.toString;
    var isArgs = dew$f2();
    var isEnumerable = Object.prototype.propertyIsEnumerable;
    var hasDontEnumBug = !isEnumerable.call({
      toString: null
    }, "toString");
    var hasProtoEnumBug = isEnumerable.call(function() {
    }, "prototype");
    var dontEnums = ["toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "constructor"];
    var equalsConstructorPrototype = function(o) {
      var ctor = o.constructor;
      return ctor && ctor.prototype === o;
    };
    var excludedKeys = {
      $applicationCache: true,
      $console: true,
      $external: true,
      $frame: true,
      $frameElement: true,
      $frames: true,
      $innerHeight: true,
      $innerWidth: true,
      $onmozfullscreenchange: true,
      $onmozfullscreenerror: true,
      $outerHeight: true,
      $outerWidth: true,
      $pageXOffset: true,
      $pageYOffset: true,
      $parent: true,
      $scrollLeft: true,
      $scrollTop: true,
      $scrollX: true,
      $scrollY: true,
      $self: true,
      $webkitIndexedDB: true,
      $webkitStorageInfo: true,
      $window: true
    };
    var hasAutomationEqualityBug = (function() {
      if (typeof window === "undefined") {
        return false;
      }
      for (var k in window) {
        try {
          if (!excludedKeys["$" + k] && has.call(window, k) && window[k] !== null && typeof window[k] === "object") {
            try {
              equalsConstructorPrototype(window[k]);
            } catch (e) {
              return true;
            }
          }
        } catch (e) {
          return true;
        }
      }
      return false;
    })();
    var equalsConstructorPrototypeIfNotBuggy = function(o) {
      if (typeof window === "undefined" || !hasAutomationEqualityBug) {
        return equalsConstructorPrototype(o);
      }
      try {
        return equalsConstructorPrototype(o);
      } catch (e) {
        return false;
      }
    };
    keysShim = function keys(object) {
      var isObject2 = object !== null && typeof object === "object";
      var isFunction2 = toStr.call(object) === "[object Function]";
      var isArguments = isArgs(object);
      var isString2 = isObject2 && toStr.call(object) === "[object String]";
      var theKeys = [];
      if (!isObject2 && !isFunction2 && !isArguments) {
        throw new TypeError("Object.keys called on a non-object");
      }
      var skipProto = hasProtoEnumBug && isFunction2;
      if (isString2 && object.length > 0 && !has.call(object, 0)) {
        for (var i = 0; i < object.length; ++i) {
          theKeys.push(String(i));
        }
      }
      if (isArguments && object.length > 0) {
        for (var j = 0; j < object.length; ++j) {
          theKeys.push(String(j));
        }
      } else {
        for (var name in object) {
          if (!(skipProto && name === "prototype") && has.call(object, name)) {
            theKeys.push(String(name));
          }
        }
      }
      if (hasDontEnumBug) {
        var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);
        for (var k = 0; k < dontEnums.length; ++k) {
          if (!(skipConstructor && dontEnums[k] === "constructor") && has.call(object, dontEnums[k])) {
            theKeys.push(dontEnums[k]);
          }
        }
      }
      return theKeys;
    };
  }
  exports$f2 = keysShim;
  return exports$f2;
}
function dew$d2() {
  if (_dewExec$d2) return exports$e2;
  _dewExec$d2 = true;
  var slice = Array.prototype.slice;
  var isArgs = dew$f2();
  var origKeys = Object.keys;
  var keysShim = origKeys ? function keys(o) {
    return origKeys(o);
  } : dew$e2();
  var originalKeys = Object.keys;
  keysShim.shim = function shimObjectKeys() {
    if (Object.keys) {
      var keysWorksWithArguments = (function() {
        var args = Object.keys(arguments);
        return args && args.length === arguments.length;
      })(1, 2);
      if (!keysWorksWithArguments) {
        Object.keys = function keys(object) {
          if (isArgs(object)) {
            return originalKeys(slice.call(object));
          }
          return originalKeys(object);
        };
      }
    } else {
      Object.keys = keysShim;
    }
    return Object.keys || keysShim;
  };
  exports$e2 = keysShim;
  return exports$e2;
}
function dew$c2() {
  if (_dewExec$c2) return exports$d2;
  _dewExec$c2 = true;
  var objectKeys = dew$d2();
  var hasSymbols = dew$k()();
  var callBound = dew2();
  var toObject = Object;
  var $push = callBound("Array.prototype.push");
  var $propIsEnumerable = callBound("Object.prototype.propertyIsEnumerable");
  var originalGetSymbols = hasSymbols ? Object.getOwnPropertySymbols : null;
  exports$d2 = function assign(target, source1) {
    if (target == null) {
      throw new TypeError("target must be an object");
    }
    var to = toObject(target);
    if (arguments.length === 1) {
      return to;
    }
    for (var s = 1; s < arguments.length; ++s) {
      var from = toObject(arguments[s]);
      var keys = objectKeys(from);
      var getSymbols = hasSymbols && (Object.getOwnPropertySymbols || originalGetSymbols);
      if (getSymbols) {
        var syms = getSymbols(from);
        for (var j = 0; j < syms.length; ++j) {
          var key = syms[j];
          if ($propIsEnumerable(from, key)) {
            $push(keys, key);
          }
        }
      }
      for (var i = 0; i < keys.length; ++i) {
        var nextKey = keys[i];
        if ($propIsEnumerable(from, nextKey)) {
          var propValue = from[nextKey];
          to[nextKey] = propValue;
        }
      }
    }
    return to;
  };
  return exports$d2;
}
function dew$b3() {
  if (_dewExec$b3) return exports$c3;
  _dewExec$b3 = true;
  var implementation = dew$c2();
  var lacksProperEnumerationOrder = function() {
    if (!Object.assign) {
      return false;
    }
    var str = "abcdefghijklmnopqrst";
    var letters = str.split("");
    var map = {};
    for (var i = 0; i < letters.length; ++i) {
      map[letters[i]] = letters[i];
    }
    var obj = Object.assign({}, map);
    var actual = "";
    for (var k in obj) {
      actual += k;
    }
    return str !== actual;
  };
  var assignHasPendingExceptions = function() {
    if (!Object.assign || !Object.preventExtensions) {
      return false;
    }
    var thrower = Object.preventExtensions({
      1: 2
    });
    try {
      Object.assign(thrower, "xy");
    } catch (e) {
      return thrower[1] === "y";
    }
    return false;
  };
  exports$c3 = function getPolyfill() {
    if (!Object.assign) {
      return implementation;
    }
    if (lacksProperEnumerationOrder()) {
      return implementation;
    }
    if (assignHasPendingExceptions()) {
      return implementation;
    }
    return Object.assign;
  };
  return exports$c3;
}
function dew$a3() {
  if (_dewExec$a3) return exports$b3;
  _dewExec$a3 = true;
  var numberIsNaN = function(value) {
    return value !== value;
  };
  exports$b3 = function is(a, b) {
    if (a === 0 && b === 0) {
      return 1 / a === 1 / b;
    }
    if (a === b) {
      return true;
    }
    if (numberIsNaN(a) && numberIsNaN(b)) {
      return true;
    }
    return false;
  };
  return exports$b3;
}
function dew$93() {
  if (_dewExec$93) return exports$a3;
  _dewExec$93 = true;
  var implementation = dew$a3();
  exports$a3 = function getPolyfill() {
    return typeof Object.is === "function" ? Object.is : implementation;
  };
  return exports$a3;
}
function dew$83() {
  if (_dewExec$83) return exports$93;
  _dewExec$83 = true;
  var keys = dew$d2();
  var hasSymbols = typeof Symbol === "function" && typeof /* @__PURE__ */ Symbol("foo") === "symbol";
  var toStr = Object.prototype.toString;
  var concat = Array.prototype.concat;
  var defineDataProperty = dew$4();
  var isFunction2 = function(fn) {
    return typeof fn === "function" && toStr.call(fn) === "[object Function]";
  };
  var supportsDescriptors = dew$3()();
  var defineProperty = function(object, name, value, predicate) {
    if (name in object) {
      if (predicate === true) {
        if (object[name] === value) {
          return;
        }
      } else if (!isFunction2(predicate) || !predicate()) {
        return;
      }
    }
    if (supportsDescriptors) {
      defineDataProperty(object, name, value, true);
    } else {
      defineDataProperty(object, name, value);
    }
  };
  var defineProperties = function(object, map) {
    var predicates = arguments.length > 2 ? arguments[2] : {};
    var props = keys(map);
    if (hasSymbols) {
      props = concat.call(props, Object.getOwnPropertySymbols(map));
    }
    for (var i = 0; i < props.length; i += 1) {
      defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
    }
  };
  defineProperties.supportsDescriptors = !!supportsDescriptors;
  exports$93 = defineProperties;
  return exports$93;
}
function dew$73() {
  if (_dewExec$73) return exports$83;
  _dewExec$73 = true;
  var getPolyfill = dew$93();
  var define = dew$83();
  exports$83 = function shimObjectIs() {
    var polyfill = getPolyfill();
    define(Object, {
      is: polyfill
    }, {
      is: function testObjectIs() {
        return Object.is !== polyfill;
      }
    });
    return polyfill;
  };
  return exports$83;
}
function dew$63() {
  if (_dewExec$63) return exports$73;
  _dewExec$63 = true;
  var define = dew$83();
  var callBind = dew$12();
  var implementation = dew$a3();
  var getPolyfill = dew$93();
  var shim = dew$73();
  var polyfill = callBind(getPolyfill(), Object);
  define(polyfill, {
    getPolyfill,
    implementation,
    shim
  });
  exports$73 = polyfill;
  return exports$73;
}
function dew$53() {
  if (_dewExec$53) return exports$63;
  _dewExec$53 = true;
  exports$63 = function isNaN2(value) {
    return value !== value;
  };
  return exports$63;
}
function dew$43() {
  if (_dewExec$43) return exports$53;
  _dewExec$43 = true;
  var implementation = dew$53();
  exports$53 = function getPolyfill() {
    if (Number.isNaN && Number.isNaN(NaN) && !Number.isNaN("a")) {
      return Number.isNaN;
    }
    return implementation;
  };
  return exports$53;
}
function dew$33() {
  if (_dewExec$33) return exports$43;
  _dewExec$33 = true;
  var define = dew$83();
  var getPolyfill = dew$43();
  exports$43 = function shimNumberIsNaN() {
    var polyfill = getPolyfill();
    define(Number, {
      isNaN: polyfill
    }, {
      isNaN: function testIsNaN() {
        return Number.isNaN !== polyfill;
      }
    });
    return polyfill;
  };
  return exports$43;
}
function dew$24() {
  if (_dewExec$24) return exports$33;
  _dewExec$24 = true;
  var callBind = dew$12();
  var define = dew$83();
  var implementation = dew$53();
  var getPolyfill = dew$43();
  var shim = dew$33();
  var polyfill = callBind(getPolyfill(), Number);
  define(polyfill, {
    getPolyfill,
    implementation,
    shim
  });
  exports$33 = polyfill;
  return exports$33;
}
function dew$14() {
  if (_dewExec$14) return exports$24;
  _dewExec$14 = true;
  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }
  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }
  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
    return arr2;
  }
  function _iterableToArrayLimit(r, l) {
    var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
    if (null != t) {
      var e, n, i, u, a = [], f = true, o = false;
      try {
        if (i = (t = t.call(r)).next, 0 === l) ;
        else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
      } catch (r2) {
        o = true, n = r2;
      } finally {
        try {
          if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
        } finally {
          if (o) throw n;
        }
      }
      return a;
    }
  }
  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  var regexFlagsSupported = /a/g.flags !== void 0;
  var arrayFromSet = function arrayFromSet2(set) {
    var array = [];
    set.forEach(function(value) {
      return array.push(value);
    });
    return array;
  };
  var arrayFromMap = function arrayFromMap2(map) {
    var array = [];
    map.forEach(function(value, key) {
      return array.push([key, value]);
    });
    return array;
  };
  var objectIs = Object.is ? Object.is : dew$63();
  var objectGetOwnPropertySymbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols : function() {
    return [];
  };
  var numberIsNaN = Number.isNaN ? Number.isNaN : dew$24();
  function uncurryThis(f) {
    return f.call.bind(f);
  }
  var hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
  var propertyIsEnumerable = uncurryThis(Object.prototype.propertyIsEnumerable);
  var objectToString = uncurryThis(Object.prototype.toString);
  var _require$types = exports6.types, isAnyArrayBuffer = _require$types.isAnyArrayBuffer, isArrayBufferView = _require$types.isArrayBufferView, isDate2 = _require$types.isDate, isMap = _require$types.isMap, isRegExp2 = _require$types.isRegExp, isSet = _require$types.isSet, isNativeError = _require$types.isNativeError, isBoxedPrimitive = _require$types.isBoxedPrimitive, isNumberObject = _require$types.isNumberObject, isStringObject = _require$types.isStringObject, isBooleanObject = _require$types.isBooleanObject, isBigIntObject = _require$types.isBigIntObject, isSymbolObject = _require$types.isSymbolObject, isFloat32Array = _require$types.isFloat32Array, isFloat64Array = _require$types.isFloat64Array;
  function isNonIndex(key) {
    if (key.length === 0 || key.length > 10) return true;
    for (var i = 0; i < key.length; i++) {
      var code = key.charCodeAt(i);
      if (code < 48 || code > 57) return true;
    }
    return key.length === 10 && key >= Math.pow(2, 32);
  }
  function getOwnNonIndexProperties(value) {
    return Object.keys(value).filter(isNonIndex).concat(objectGetOwnPropertySymbols(value).filter(Object.prototype.propertyIsEnumerable.bind(value)));
  }
  function compare(a, b) {
    if (a === b) {
      return 0;
    }
    var x = a.length;
    var y = b.length;
    for (var i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break;
      }
    }
    if (x < y) {
      return -1;
    }
    if (y < x) {
      return 1;
    }
    return 0;
  }
  var kStrict = true;
  var kLoose = false;
  var kNoIterator = 0;
  var kIsArray = 1;
  var kIsSet = 2;
  var kIsMap = 3;
  function areSimilarRegExps(a, b) {
    return regexFlagsSupported ? a.source === b.source && a.flags === b.flags : RegExp.prototype.toString.call(a) === RegExp.prototype.toString.call(b);
  }
  function areSimilarFloatArrays(a, b) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    for (var offset = 0; offset < a.byteLength; offset++) {
      if (a[offset] !== b[offset]) {
        return false;
      }
    }
    return true;
  }
  function areSimilarTypedArrays(a, b) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    return compare(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength)) === 0;
  }
  function areEqualArrayBuffers(buf1, buf2) {
    return buf1.byteLength === buf2.byteLength && compare(new Uint8Array(buf1), new Uint8Array(buf2)) === 0;
  }
  function isEqualBoxedPrimitive(val1, val2) {
    if (isNumberObject(val1)) {
      return isNumberObject(val2) && objectIs(Number.prototype.valueOf.call(val1), Number.prototype.valueOf.call(val2));
    }
    if (isStringObject(val1)) {
      return isStringObject(val2) && String.prototype.valueOf.call(val1) === String.prototype.valueOf.call(val2);
    }
    if (isBooleanObject(val1)) {
      return isBooleanObject(val2) && Boolean.prototype.valueOf.call(val1) === Boolean.prototype.valueOf.call(val2);
    }
    if (isBigIntObject(val1)) {
      return isBigIntObject(val2) && BigInt.prototype.valueOf.call(val1) === BigInt.prototype.valueOf.call(val2);
    }
    return isSymbolObject(val2) && Symbol.prototype.valueOf.call(val1) === Symbol.prototype.valueOf.call(val2);
  }
  function innerDeepEqual(val1, val2, strict2, memos) {
    if (val1 === val2) {
      if (val1 !== 0) return true;
      return strict2 ? objectIs(val1, val2) : true;
    }
    if (strict2) {
      if (_typeof(val1) !== "object") {
        return typeof val1 === "number" && numberIsNaN(val1) && numberIsNaN(val2);
      }
      if (_typeof(val2) !== "object" || val1 === null || val2 === null) {
        return false;
      }
      if (Object.getPrototypeOf(val1) !== Object.getPrototypeOf(val2)) {
        return false;
      }
    } else {
      if (val1 === null || _typeof(val1) !== "object") {
        if (val2 === null || _typeof(val2) !== "object") {
          return val1 == val2;
        }
        return false;
      }
      if (val2 === null || _typeof(val2) !== "object") {
        return false;
      }
    }
    var val1Tag = objectToString(val1);
    var val2Tag = objectToString(val2);
    if (val1Tag !== val2Tag) {
      return false;
    }
    if (Array.isArray(val1)) {
      if (val1.length !== val2.length) {
        return false;
      }
      var keys1 = getOwnNonIndexProperties(val1);
      var keys2 = getOwnNonIndexProperties(val2);
      if (keys1.length !== keys2.length) {
        return false;
      }
      return keyCheck(val1, val2, strict2, memos, kIsArray, keys1);
    }
    if (val1Tag === "[object Object]") {
      if (!isMap(val1) && isMap(val2) || !isSet(val1) && isSet(val2)) {
        return false;
      }
    }
    if (isDate2(val1)) {
      if (!isDate2(val2) || Date.prototype.getTime.call(val1) !== Date.prototype.getTime.call(val2)) {
        return false;
      }
    } else if (isRegExp2(val1)) {
      if (!isRegExp2(val2) || !areSimilarRegExps(val1, val2)) {
        return false;
      }
    } else if (isNativeError(val1) || val1 instanceof Error) {
      if (val1.message !== val2.message || val1.name !== val2.name) {
        return false;
      }
    } else if (isArrayBufferView(val1)) {
      if (!strict2 && (isFloat32Array(val1) || isFloat64Array(val1))) {
        if (!areSimilarFloatArrays(val1, val2)) {
          return false;
        }
      } else if (!areSimilarTypedArrays(val1, val2)) {
        return false;
      }
      var _keys = getOwnNonIndexProperties(val1);
      var _keys2 = getOwnNonIndexProperties(val2);
      if (_keys.length !== _keys2.length) {
        return false;
      }
      return keyCheck(val1, val2, strict2, memos, kNoIterator, _keys);
    } else if (isSet(val1)) {
      if (!isSet(val2) || val1.size !== val2.size) {
        return false;
      }
      return keyCheck(val1, val2, strict2, memos, kIsSet);
    } else if (isMap(val1)) {
      if (!isMap(val2) || val1.size !== val2.size) {
        return false;
      }
      return keyCheck(val1, val2, strict2, memos, kIsMap);
    } else if (isAnyArrayBuffer(val1)) {
      if (!areEqualArrayBuffers(val1, val2)) {
        return false;
      }
    } else if (isBoxedPrimitive(val1) && !isEqualBoxedPrimitive(val1, val2)) {
      return false;
    }
    return keyCheck(val1, val2, strict2, memos, kNoIterator);
  }
  function getEnumerables(val, keys) {
    return keys.filter(function(k) {
      return propertyIsEnumerable(val, k);
    });
  }
  function keyCheck(val1, val2, strict2, memos, iterationType, aKeys) {
    if (arguments.length === 5) {
      aKeys = Object.keys(val1);
      var bKeys = Object.keys(val2);
      if (aKeys.length !== bKeys.length) {
        return false;
      }
    }
    var i = 0;
    for (; i < aKeys.length; i++) {
      if (!hasOwnProperty(val2, aKeys[i])) {
        return false;
      }
    }
    if (strict2 && arguments.length === 5) {
      var symbolKeysA = objectGetOwnPropertySymbols(val1);
      if (symbolKeysA.length !== 0) {
        var count = 0;
        for (i = 0; i < symbolKeysA.length; i++) {
          var key = symbolKeysA[i];
          if (propertyIsEnumerable(val1, key)) {
            if (!propertyIsEnumerable(val2, key)) {
              return false;
            }
            aKeys.push(key);
            count++;
          } else if (propertyIsEnumerable(val2, key)) {
            return false;
          }
        }
        var symbolKeysB = objectGetOwnPropertySymbols(val2);
        if (symbolKeysA.length !== symbolKeysB.length && getEnumerables(val2, symbolKeysB).length !== count) {
          return false;
        }
      } else {
        var _symbolKeysB = objectGetOwnPropertySymbols(val2);
        if (_symbolKeysB.length !== 0 && getEnumerables(val2, _symbolKeysB).length !== 0) {
          return false;
        }
      }
    }
    if (aKeys.length === 0 && (iterationType === kNoIterator || iterationType === kIsArray && val1.length === 0 || val1.size === 0)) {
      return true;
    }
    if (memos === void 0) {
      memos = {
        val1: /* @__PURE__ */ new Map(),
        val2: /* @__PURE__ */ new Map(),
        position: 0
      };
    } else {
      var val2MemoA = memos.val1.get(val1);
      if (val2MemoA !== void 0) {
        var val2MemoB = memos.val2.get(val2);
        if (val2MemoB !== void 0) {
          return val2MemoA === val2MemoB;
        }
      }
      memos.position++;
    }
    memos.val1.set(val1, memos.position);
    memos.val2.set(val2, memos.position);
    var areEq = objEquiv(val1, val2, strict2, aKeys, memos, iterationType);
    memos.val1.delete(val1);
    memos.val2.delete(val2);
    return areEq;
  }
  function setHasEqualElement(set, val1, strict2, memo) {
    var setValues = arrayFromSet(set);
    for (var i = 0; i < setValues.length; i++) {
      var val2 = setValues[i];
      if (innerDeepEqual(val1, val2, strict2, memo)) {
        set.delete(val2);
        return true;
      }
    }
    return false;
  }
  function findLooseMatchingPrimitives(prim) {
    switch (_typeof(prim)) {
      case "undefined":
        return null;
      case "object":
        return void 0;
      case "symbol":
        return false;
      case "string":
        prim = +prim;
      // Loose equal entries exist only if the string is possible to convert to
      // a regular number and not NaN.
      // Fall through
      case "number":
        if (numberIsNaN(prim)) {
          return false;
        }
    }
    return true;
  }
  function setMightHaveLoosePrim(a, b, prim) {
    var altValue = findLooseMatchingPrimitives(prim);
    if (altValue != null) return altValue;
    return b.has(altValue) && !a.has(altValue);
  }
  function mapMightHaveLoosePrim(a, b, prim, item, memo) {
    var altValue = findLooseMatchingPrimitives(prim);
    if (altValue != null) {
      return altValue;
    }
    var curB = b.get(altValue);
    if (curB === void 0 && !b.has(altValue) || !innerDeepEqual(item, curB, false, memo)) {
      return false;
    }
    return !a.has(altValue) && innerDeepEqual(item, curB, false, memo);
  }
  function setEquiv(a, b, strict2, memo) {
    var set = null;
    var aValues = arrayFromSet(a);
    for (var i = 0; i < aValues.length; i++) {
      var val = aValues[i];
      if (_typeof(val) === "object" && val !== null) {
        if (set === null) {
          set = /* @__PURE__ */ new Set();
        }
        set.add(val);
      } else if (!b.has(val)) {
        if (strict2) return false;
        if (!setMightHaveLoosePrim(a, b, val)) {
          return false;
        }
        if (set === null) {
          set = /* @__PURE__ */ new Set();
        }
        set.add(val);
      }
    }
    if (set !== null) {
      var bValues = arrayFromSet(b);
      for (var _i = 0; _i < bValues.length; _i++) {
        var _val = bValues[_i];
        if (_typeof(_val) === "object" && _val !== null) {
          if (!setHasEqualElement(set, _val, strict2, memo)) return false;
        } else if (!strict2 && !a.has(_val) && !setHasEqualElement(set, _val, strict2, memo)) {
          return false;
        }
      }
      return set.size === 0;
    }
    return true;
  }
  function mapHasEqualEntry(set, map, key1, item1, strict2, memo) {
    var setValues = arrayFromSet(set);
    for (var i = 0; i < setValues.length; i++) {
      var key2 = setValues[i];
      if (innerDeepEqual(key1, key2, strict2, memo) && innerDeepEqual(item1, map.get(key2), strict2, memo)) {
        set.delete(key2);
        return true;
      }
    }
    return false;
  }
  function mapEquiv(a, b, strict2, memo) {
    var set = null;
    var aEntries = arrayFromMap(a);
    for (var i = 0; i < aEntries.length; i++) {
      var _aEntries$i = _slicedToArray(aEntries[i], 2), key = _aEntries$i[0], item1 = _aEntries$i[1];
      if (_typeof(key) === "object" && key !== null) {
        if (set === null) {
          set = /* @__PURE__ */ new Set();
        }
        set.add(key);
      } else {
        var item2 = b.get(key);
        if (item2 === void 0 && !b.has(key) || !innerDeepEqual(item1, item2, strict2, memo)) {
          if (strict2) return false;
          if (!mapMightHaveLoosePrim(a, b, key, item1, memo)) return false;
          if (set === null) {
            set = /* @__PURE__ */ new Set();
          }
          set.add(key);
        }
      }
    }
    if (set !== null) {
      var bEntries = arrayFromMap(b);
      for (var _i2 = 0; _i2 < bEntries.length; _i2++) {
        var _bEntries$_i = _slicedToArray(bEntries[_i2], 2), _key = _bEntries$_i[0], item = _bEntries$_i[1];
        if (_typeof(_key) === "object" && _key !== null) {
          if (!mapHasEqualEntry(set, a, _key, item, strict2, memo)) return false;
        } else if (!strict2 && (!a.has(_key) || !innerDeepEqual(a.get(_key), item, false, memo)) && !mapHasEqualEntry(set, a, _key, item, false, memo)) {
          return false;
        }
      }
      return set.size === 0;
    }
    return true;
  }
  function objEquiv(a, b, strict2, keys, memos, iterationType) {
    var i = 0;
    if (iterationType === kIsSet) {
      if (!setEquiv(a, b, strict2, memos)) {
        return false;
      }
    } else if (iterationType === kIsMap) {
      if (!mapEquiv(a, b, strict2, memos)) {
        return false;
      }
    } else if (iterationType === kIsArray) {
      for (; i < a.length; i++) {
        if (hasOwnProperty(a, i)) {
          if (!hasOwnProperty(b, i) || !innerDeepEqual(a[i], b[i], strict2, memos)) {
            return false;
          }
        } else if (hasOwnProperty(b, i)) {
          return false;
        } else {
          var keysA = Object.keys(a);
          for (; i < keysA.length; i++) {
            var key = keysA[i];
            if (!hasOwnProperty(b, key) || !innerDeepEqual(a[key], b[key], strict2, memos)) {
              return false;
            }
          }
          if (keysA.length !== Object.keys(b).length) {
            return false;
          }
          return true;
        }
      }
    }
    for (i = 0; i < keys.length; i++) {
      var _key2 = keys[i];
      if (!innerDeepEqual(a[_key2], b[_key2], strict2, memos)) {
        return false;
      }
    }
    return true;
  }
  function isDeepEqual(val1, val2) {
    return innerDeepEqual(val1, val2, kLoose);
  }
  function isDeepStrictEqual(val1, val2) {
    return innerDeepEqual(val1, val2, kStrict);
  }
  exports$24 = {
    isDeepEqual,
    isDeepStrictEqual
  };
  return exports$24;
}
function dew5() {
  if (_dewExec5) return exports$14;
  _dewExec5 = true;
  var process$1 = process2;
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  function _createClass(Constructor, protoProps, staticProps) {
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  var _require = dew$h2(), _require$codes = _require.codes, ERR_AMBIGUOUS_ARGUMENT = _require$codes.ERR_AMBIGUOUS_ARGUMENT, ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE = _require$codes.ERR_INVALID_ARG_VALUE, ERR_INVALID_RETURN_VALUE = _require$codes.ERR_INVALID_RETURN_VALUE, ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS;
  var AssertionError2 = dew$g2();
  var _require2 = exports6, inspect2 = _require2.inspect;
  var _require$types = exports6.types, isPromise = _require$types.isPromise, isRegExp2 = _require$types.isRegExp;
  var objectAssign = dew$b3()();
  var objectIs = dew$93()();
  var RegExpPrototypeTest = dew2()("RegExp.prototype.test");
  var isDeepEqual;
  var isDeepStrictEqual;
  function lazyLoadComparison() {
    var comparison = dew$14();
    isDeepEqual = comparison.isDeepEqual;
    isDeepStrictEqual = comparison.isDeepStrictEqual;
  }
  var warned = false;
  var assert3 = exports$14 = ok2;
  var NO_EXCEPTION_SENTINEL = {};
  function innerFail(obj) {
    if (obj.message instanceof Error) throw obj.message;
    throw new AssertionError2(obj);
  }
  function fail2(actual, expected, message, operator, stackStartFn) {
    var argsLen = arguments.length;
    var internalMessage;
    if (argsLen === 0) {
      internalMessage = "Failed";
    } else if (argsLen === 1) {
      message = actual;
      actual = void 0;
    } else {
      if (warned === false) {
        warned = true;
        var warn = process$1.emitWarning ? process$1.emitWarning : console.warn.bind(console);
        warn("assert.fail() with more than one argument is deprecated. Please use assert.strictEqual() instead or only pass a message.", "DeprecationWarning", "DEP0094");
      }
      if (argsLen === 2) operator = "!=";
    }
    if (message instanceof Error) throw message;
    var errArgs = {
      actual,
      expected,
      operator: operator === void 0 ? "fail" : operator,
      stackStartFn: stackStartFn || fail2
    };
    if (message !== void 0) {
      errArgs.message = message;
    }
    var err = new AssertionError2(errArgs);
    if (internalMessage) {
      err.message = internalMessage;
      err.generatedMessage = true;
    }
    throw err;
  }
  assert3.fail = fail2;
  assert3.AssertionError = AssertionError2;
  function innerOk(fn, argLen, value, message) {
    if (!value) {
      var generatedMessage = false;
      if (argLen === 0) {
        generatedMessage = true;
        message = "No value argument passed to `assert.ok()`";
      } else if (message instanceof Error) {
        throw message;
      }
      var err = new AssertionError2({
        actual: value,
        expected: true,
        message,
        operator: "==",
        stackStartFn: fn
      });
      err.generatedMessage = generatedMessage;
      throw err;
    }
  }
  function ok2() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    innerOk.apply(void 0, [ok2, args.length].concat(args));
  }
  assert3.ok = ok2;
  assert3.equal = function equal2(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (actual != expected) {
      innerFail({
        actual,
        expected,
        message,
        operator: "==",
        stackStartFn: equal2
      });
    }
  };
  assert3.notEqual = function notEqual2(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (actual == expected) {
      innerFail({
        actual,
        expected,
        message,
        operator: "!=",
        stackStartFn: notEqual2
      });
    }
  };
  assert3.deepEqual = function deepEqual2(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (isDeepEqual === void 0) lazyLoadComparison();
    if (!isDeepEqual(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "deepEqual",
        stackStartFn: deepEqual2
      });
    }
  };
  assert3.notDeepEqual = function notDeepEqual2(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (isDeepEqual === void 0) lazyLoadComparison();
    if (isDeepEqual(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "notDeepEqual",
        stackStartFn: notDeepEqual2
      });
    }
  };
  assert3.deepStrictEqual = function deepStrictEqual2(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (isDeepEqual === void 0) lazyLoadComparison();
    if (!isDeepStrictEqual(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "deepStrictEqual",
        stackStartFn: deepStrictEqual2
      });
    }
  };
  assert3.notDeepStrictEqual = notDeepStrictEqual2;
  function notDeepStrictEqual2(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (isDeepEqual === void 0) lazyLoadComparison();
    if (isDeepStrictEqual(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "notDeepStrictEqual",
        stackStartFn: notDeepStrictEqual2
      });
    }
  }
  assert3.strictEqual = function strictEqual2(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (!objectIs(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "strictEqual",
        stackStartFn: strictEqual2
      });
    }
  };
  assert3.notStrictEqual = function notStrictEqual2(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (objectIs(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "notStrictEqual",
        stackStartFn: notStrictEqual2
      });
    }
  };
  var Comparison = /* @__PURE__ */ _createClass(function Comparison2(obj, keys, actual) {
    var _this = this;
    _classCallCheck(this, Comparison2);
    keys.forEach(function(key) {
      if (key in obj) {
        if (actual !== void 0 && typeof actual[key] === "string" && isRegExp2(obj[key]) && RegExpPrototypeTest(obj[key], actual[key])) {
          _this[key] = actual[key];
        } else {
          _this[key] = obj[key];
        }
      }
    });
  });
  function compareExceptionKey(actual, expected, key, message, keys, fn) {
    if (!(key in actual) || !isDeepStrictEqual(actual[key], expected[key])) {
      if (!message) {
        var a = new Comparison(actual, keys);
        var b = new Comparison(expected, keys, actual);
        var err = new AssertionError2({
          actual: a,
          expected: b,
          operator: "deepStrictEqual",
          stackStartFn: fn
        });
        err.actual = actual;
        err.expected = expected;
        err.operator = fn.name;
        throw err;
      }
      innerFail({
        actual,
        expected,
        message,
        operator: fn.name,
        stackStartFn: fn
      });
    }
  }
  function expectedException(actual, expected, msg, fn) {
    if (typeof expected !== "function") {
      if (isRegExp2(expected)) return RegExpPrototypeTest(expected, actual);
      if (arguments.length === 2) {
        throw new ERR_INVALID_ARG_TYPE("expected", ["Function", "RegExp"], expected);
      }
      if (_typeof(actual) !== "object" || actual === null) {
        var err = new AssertionError2({
          actual,
          expected,
          message: msg,
          operator: "deepStrictEqual",
          stackStartFn: fn
        });
        err.operator = fn.name;
        throw err;
      }
      var keys = Object.keys(expected);
      if (expected instanceof Error) {
        keys.push("name", "message");
      } else if (keys.length === 0) {
        throw new ERR_INVALID_ARG_VALUE("error", expected, "may not be an empty object");
      }
      if (isDeepEqual === void 0) lazyLoadComparison();
      keys.forEach(function(key) {
        if (typeof actual[key] === "string" && isRegExp2(expected[key]) && RegExpPrototypeTest(expected[key], actual[key])) {
          return;
        }
        compareExceptionKey(actual, expected, key, msg, keys, fn);
      });
      return true;
    }
    if (expected.prototype !== void 0 && actual instanceof expected) {
      return true;
    }
    if (Error.isPrototypeOf(expected)) {
      return false;
    }
    return expected.call({}, actual) === true;
  }
  function getActual(fn) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE("fn", "Function", fn);
    }
    try {
      fn();
    } catch (e) {
      return e;
    }
    return NO_EXCEPTION_SENTINEL;
  }
  function checkIsPromise(obj) {
    return isPromise(obj) || obj !== null && _typeof(obj) === "object" && typeof obj.then === "function" && typeof obj.catch === "function";
  }
  function waitForActual(promiseFn) {
    return Promise.resolve().then(function() {
      var resultPromise;
      if (typeof promiseFn === "function") {
        resultPromise = promiseFn();
        if (!checkIsPromise(resultPromise)) {
          throw new ERR_INVALID_RETURN_VALUE("instance of Promise", "promiseFn", resultPromise);
        }
      } else if (checkIsPromise(promiseFn)) {
        resultPromise = promiseFn;
      } else {
        throw new ERR_INVALID_ARG_TYPE("promiseFn", ["Function", "Promise"], promiseFn);
      }
      return Promise.resolve().then(function() {
        return resultPromise;
      }).then(function() {
        return NO_EXCEPTION_SENTINEL;
      }).catch(function(e) {
        return e;
      });
    });
  }
  function expectsError(stackStartFn, actual, error, message) {
    if (typeof error === "string") {
      if (arguments.length === 4) {
        throw new ERR_INVALID_ARG_TYPE("error", ["Object", "Error", "Function", "RegExp"], error);
      }
      if (_typeof(actual) === "object" && actual !== null) {
        if (actual.message === error) {
          throw new ERR_AMBIGUOUS_ARGUMENT("error/message", 'The error message "'.concat(actual.message, '" is identical to the message.'));
        }
      } else if (actual === error) {
        throw new ERR_AMBIGUOUS_ARGUMENT("error/message", 'The error "'.concat(actual, '" is identical to the message.'));
      }
      message = error;
      error = void 0;
    } else if (error != null && _typeof(error) !== "object" && typeof error !== "function") {
      throw new ERR_INVALID_ARG_TYPE("error", ["Object", "Error", "Function", "RegExp"], error);
    }
    if (actual === NO_EXCEPTION_SENTINEL) {
      var details = "";
      if (error && error.name) {
        details += " (".concat(error.name, ")");
      }
      details += message ? ": ".concat(message) : ".";
      var fnType = stackStartFn.name === "rejects" ? "rejection" : "exception";
      innerFail({
        actual: void 0,
        expected: error,
        operator: stackStartFn.name,
        message: "Missing expected ".concat(fnType).concat(details),
        stackStartFn
      });
    }
    if (error && !expectedException(actual, error, message, stackStartFn)) {
      throw actual;
    }
  }
  function expectsNoError(stackStartFn, actual, error, message) {
    if (actual === NO_EXCEPTION_SENTINEL) return;
    if (typeof error === "string") {
      message = error;
      error = void 0;
    }
    if (!error || expectedException(actual, error)) {
      var details = message ? ": ".concat(message) : ".";
      var fnType = stackStartFn.name === "doesNotReject" ? "rejection" : "exception";
      innerFail({
        actual,
        expected: error,
        operator: stackStartFn.name,
        message: "Got unwanted ".concat(fnType).concat(details, "\n") + 'Actual message: "'.concat(actual && actual.message, '"'),
        stackStartFn
      });
    }
    throw actual;
  }
  assert3.throws = function throws2(promiseFn) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }
    expectsError.apply(void 0, [throws2, getActual(promiseFn)].concat(args));
  };
  assert3.rejects = function rejects2(promiseFn) {
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
      args[_key3 - 1] = arguments[_key3];
    }
    return waitForActual(promiseFn).then(function(result) {
      return expectsError.apply(void 0, [rejects2, result].concat(args));
    });
  };
  assert3.doesNotThrow = function doesNotThrow2(fn) {
    for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
      args[_key4 - 1] = arguments[_key4];
    }
    expectsNoError.apply(void 0, [doesNotThrow2, getActual(fn)].concat(args));
  };
  assert3.doesNotReject = function doesNotReject2(fn) {
    for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
      args[_key5 - 1] = arguments[_key5];
    }
    return waitForActual(fn).then(function(result) {
      return expectsNoError.apply(void 0, [doesNotReject2, result].concat(args));
    });
  };
  assert3.ifError = function ifError2(err) {
    if (err !== null && err !== void 0) {
      var message = "ifError got unwanted exception: ";
      if (_typeof(err) === "object" && typeof err.message === "string") {
        if (err.message.length === 0 && err.constructor) {
          message += err.constructor.name;
        } else {
          message += err.message;
        }
      } else {
        message += inspect2(err);
      }
      var newErr = new AssertionError2({
        actual: err,
        expected: null,
        operator: "ifError",
        message,
        stackStartFn: ifError2
      });
      var origStack = err.stack;
      if (typeof origStack === "string") {
        var tmp2 = origStack.split("\n");
        tmp2.shift();
        var tmp1 = newErr.stack.split("\n");
        for (var i = 0; i < tmp2.length; i++) {
          var pos = tmp1.indexOf(tmp2[i]);
          if (pos !== -1) {
            tmp1 = tmp1.slice(0, pos);
            break;
          }
        }
        newErr.stack = "".concat(tmp1.join("\n"), "\n").concat(tmp2.join("\n"));
      }
      throw newErr;
    }
  };
  function internalMatch(string, regexp, message, fn, fnName) {
    if (!isRegExp2(regexp)) {
      throw new ERR_INVALID_ARG_TYPE("regexp", "RegExp", regexp);
    }
    var match = fnName === "match";
    if (typeof string !== "string" || RegExpPrototypeTest(regexp, string) !== match) {
      if (message instanceof Error) {
        throw message;
      }
      var generatedMessage = !message;
      message = message || (typeof string !== "string" ? 'The "string" argument must be of type string. Received type ' + "".concat(_typeof(string), " (").concat(inspect2(string), ")") : (match ? "The input did not match the regular expression " : "The input was expected to not match the regular expression ") + "".concat(inspect2(regexp), ". Input:\n\n").concat(inspect2(string), "\n"));
      var err = new AssertionError2({
        actual: string,
        expected: regexp,
        message,
        operator: fnName,
        stackStartFn: fn
      });
      err.generatedMessage = generatedMessage;
      throw err;
    }
  }
  assert3.match = function match(string, regexp, message) {
    internalMatch(string, regexp, message, match, "match");
  };
  assert3.doesNotMatch = function doesNotMatch(string, regexp, message) {
    internalMatch(string, regexp, message, doesNotMatch, "doesNotMatch");
  };
  function strict2() {
    for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }
    innerOk.apply(void 0, [strict2, args.length].concat(args));
  }
  assert3.strict = objectAssign(strict2, assert3, {
    equal: assert3.strictEqual,
    deepEqual: assert3.deepStrictEqual,
    notEqual: assert3.notStrictEqual,
    notDeepEqual: assert3.notDeepStrictEqual
  });
  assert3.strict.strict = assert3.strict;
  return exports$14;
}
var exports$i2, _dewExec$h2, exports$h2, _dewExec$g2, exports$g2, _dewExec$f2, exports$f2, _dewExec$e2, exports$e2, _dewExec$d2, exports$d2, _dewExec$c2, exports$c3, _dewExec$b3, exports$b3, _dewExec$a3, exports$a3, _dewExec$93, exports$93, _dewExec$83, exports$83, _dewExec$73, exports$73, _dewExec$63, exports$63, _dewExec$53, exports$53, _dewExec$43, exports$43, _dewExec$33, exports$33, _dewExec$24, exports$24, _dewExec$14, exports$14, _dewExec5, exports7, AssertionError, deepEqual, deepStrictEqual, doesNotReject, doesNotThrow, equal, fail, ifError, notDeepEqual, notDeepStrictEqual, notEqual, notStrictEqual, ok, rejects, strict, strictEqual, throws;
var init_assert = __esm({
  "node_modules/@jspm/core/nodelibs/browser/assert.js"() {
    init_dirname();
    init_buffer2();
    init_process2();
    init_util();
    init_chunk_DEMDiNwt();
    init_chunk_DtcTpLWz();
    init_chunk_CkFCi_G1();
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
    exports$b3 = {};
    _dewExec$a3 = false;
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
    exports$24 = {};
    _dewExec$14 = false;
    exports$14 = {};
    _dewExec5 = false;
    exports7 = dew5();
    AssertionError = exports7.AssertionError;
    deepEqual = exports7.deepEqual;
    deepStrictEqual = exports7.deepStrictEqual;
    doesNotReject = exports7.doesNotReject;
    doesNotThrow = exports7.doesNotThrow;
    equal = exports7.equal;
    fail = exports7.fail;
    ifError = exports7.ifError;
    notDeepEqual = exports7.notDeepEqual;
    notDeepStrictEqual = exports7.notDeepStrictEqual;
    notEqual = exports7.notEqual;
    notStrictEqual = exports7.notStrictEqual;
    ok = exports7.ok;
    rejects = exports7.rejects;
    strict = exports7.strict;
    strictEqual = exports7.strictEqual;
    throws = exports7.throws;
  }
});

// <stdin>
init_dirname();
init_buffer2();
init_process2();
var m = (init_assert(), __toCommonJS(assert_exports));
var d = m && m.default !== void 0 ? m.default : m;
if (m && m.default !== void 0 && d && typeof d === "object") {
  for (const k in m) {
    if (k !== "default" && d[k] === void 0) {
      try {
        d[k] = m[k];
      } catch (e) {
      }
    }
  }
}
if (false) {
  d.EventEmitter = d;
}
module.exports = d;
