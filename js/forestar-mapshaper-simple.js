(function () {

  var utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get toArray () { return toArray; },
    get default () { return utils; },
    get isFunction () { return isFunction; },
    get isObject () { return isObject; },
    get clamp () { return clamp; },
    get isArray () { return isArray; },
    get isNumber () { return isNumber; },
    get isInteger () { return isInteger; },
    get isString () { return isString; },
    get defaults () { return defaults; },
    get extend () { return extend; },
    get pluralSuffix () { return pluralSuffix; },
    get copyElements () { return copyElements; },
    get initializeArray () { return initializeArray; },
    get createBuffer () { return createBuffer; },
    get pluck () { return pluck; },
  });
  var Buffer = require('buffer').Buffer; // works with browserify

  function pluck(arr, key) {
    return arr.map(function(obj) {
      return obj[key];
    });
  }

  function initializeArray(arr, init) {
    for (var i=0, len=arr.length; i<len; i++) {
      arr[i] = init;
    }
    return arr;
  }

  function pluralSuffix(count) {
    return count != 1 ? 's' : '';
  }


  function clamp(val, min, max) {
    return val < min ? min : (val > max ? max : val);
  }

  function isArray(obj) {
    return Array.isArray(obj);
  }

  // NaN -> true
  function isNumber(obj) {
    // return toString.call(obj) == '[object Number]'; // ie8 breaks?
    return obj != null && obj.constructor == Number;
  }

  function isInteger(obj) {
    return isNumber(obj) && ((obj | 0) === obj);
  }

  function isString(obj) {
    return obj != null && obj.toString === String.prototype.toString;
    // TODO: replace w/ something better.
  }

  // Convert an array-like object to an Array, or make a copy if @obj is an Array
  function toArray(obj) {
    var arr;
    if (!isArrayLike(obj)) error("toArray() requires an array-like object");
    try {
      arr = Array.prototype.slice.call(obj, 0); // breaks in ie8
    } catch(e) {
      // support ie8
      arr = [];
      for (var i=0, n=obj.length; i<n; i++) {
        arr[i] = obj[i];
      }
    }
    return arr;
  }

  // Array like: has length property, is numerically indexed and mutable.
  // TODO: try to detect objects with length property but no indexed data elements
  function isArrayLike(obj) {
    if (!obj) return false;
    if (isArray(obj)) return true;
    if (isString(obj)) return false;
    if (obj.length === 0) return true;
    if (obj.length > 0) return true;
    return false;
  }


  function defaults(dest) {
    for (var i=1, n=arguments.length; i<n; i++) {
      var src = arguments[i] || {};
      for (var key in src) {
        if (key in dest === false && src.hasOwnProperty(key)) {
          dest[key] = src[key];
        }
      }
    }
    return dest;
  }

  function extend(o) {
    var dest = o || {},
        n = arguments.length,
        key, i, src;
    for (i=1; i<n; i++) {
      src = arguments[i] || {};
      for (key in src) {
        if (src.hasOwnProperty(key)) {
          dest[key] = src[key];
        }
      }
    }
    return dest;
  }

  function repeatString(src, n) {
    var str = "";
    for (var i=0; i<n; i++)
      str += src;
    return str;
  }

  function addThousandsSep(str) {
    var fmt = '',
        start = str[0] == '-' ? 1 : 0,
        dec = str.indexOf('.'),
        end = str.length,
        ins = (dec == -1 ? end : dec) - 3;
    while (ins > start) {
      fmt = ',' + str.substring(ins, end) + fmt;
      end = ins;
      ins -= 3;
    }
    return str.substring(0, end) + fmt;
  }

  function numToStr(num, decimals) {
    return decimals >= 0 ? num.toFixed(decimals) : String(num);
  }

  function getGenericComparator(asc) {
    asc = asc !== false;
    return function(a, b) {
      var retn = 0;
      if (b == null) {
        retn = a == null ? 0 : -1;
      } else if (a == null) {
        retn = 1;
      } else if (a < b) {
        retn = asc ? -1 : 1;
      } else if (a > b) {
        retn = asc ? 1 : -1;
      } else if (a !== a) {
        retn = 1;
      } else if (b !== b) {
        retn = -1;
      }
      return retn;
    };
  }

  function formatValue(val, matches) {
    var flags = matches[1];
    var padding = matches[2];
    var decimals = matches[3] ? parseInt(matches[3].substr(1)) : void 0;
    var type = matches[4];
    var isString = type == 's',
        isHex = type == 'x' || type == 'X',
        isInt = type == 'd' || type == 'i',
        isFloat = type == 'f',
        isNumber = !isString;

    var sign = "",
        padDigits = 0,
        isZero = false,
        isNeg = false;

    var str, padChar, padStr;
    if (isString) {
      str = String(val);
    }
    else if (isHex) {
      str = val.toString(16);
      if (type == 'X')
        str = str.toUpperCase();
    }
    else if (isNumber) {
      str = numToStr(val, isInt ? 0 : decimals);
      if (str[0] == '-') {
        isNeg = true;
        str = str.substr(1);
      }
      isZero = parseFloat(str) == 0;
      if (flags.indexOf("'") != -1 || flags.indexOf(',') != -1) {
        str = addThousandsSep(str);
      }
      if (!isZero) { // BUG: sign is added when num rounds to 0
        if (isNeg) {
          sign = "\u2212"; // U+2212
        } else if (flags.indexOf('+') != -1) {
          sign = '+';
        }
      }
    }

    if (padding) {
      var strLen = str.length + sign.length;
      var minWidth = parseInt(padding, 10);
      if (strLen < minWidth) {
        padDigits = minWidth - strLen;
        padChar = flags.indexOf('0') == -1 ? ' ' : '0';
        padStr = repeatString(padChar, padDigits);
      }
    }

    if (padDigits == 0) {
      str = sign + str;
    } else if (padChar == '0') {
      str = sign + padStr + str;
    } else {
      str = padStr + sign + str;
    }
    return str;
  }

  // Get a function for interpolating formatted values into a string.
  function formatter(fmt) {
    var codeRxp = /%([\',+0]*)([1-9]?)((?:\.[1-9])?)([sdifxX%])/g;
    var literals = [],
        formatCodes = [],
        startIdx = 0,
        prefix = "",
        matches = codeRxp.exec(fmt),
        literal;

    while (matches) {
      literal = fmt.substring(startIdx, codeRxp.lastIndex - matches[0].length);
      if (matches[0] == '%%') {
        prefix += literal + '%';
      } else {
        literals.push(prefix + literal);
        prefix = '';
        formatCodes.push(matches);
      }
      startIdx = codeRxp.lastIndex;
      matches = codeRxp.exec(fmt);
    }
    literals.push(prefix + fmt.substr(startIdx));

    return function() {
      var str = literals[0],
          n = arguments.length;
      if (n != formatCodes.length) {
        error("[format()] Data does not match format string; format:", fmt, "data:", arguments);
      }
      for (var i=0; i<n; i++) {
        str += formatValue(arguments[i], formatCodes[i]) + literals[i+1];
      }
      return str;
    };
  }

  function createBuffer(arg, arg2) {
    if (isInteger(arg)) {
      return Buffer.allocUnsafe ? Buffer.allocUnsafe(arg) : new Buffer(arg);
    } else {
      // check allocUnsafe to make sure Buffer.from() will accept strings (it didn't before Node v5.10)
      return Buffer.from && Buffer.allocUnsafe ? Buffer.from(arg, arg2) : new Buffer(arg, arg2);
    }
  }

  function copyElements(src, i, dest, j, n, rev) {
    if (src === dest && j > i) error ("copy error");
    var inc = 1,
        offs = 0;
    if (rev) {
      inc = -1;
      offs = n - 1;
    }
    for (var k=0; k<n; k++, offs += inc) {
      dest[k + j] = src[i + offs];
    }
  }

  /**
   * FORESTAR: 上下文对象
   */
  var context = createContext(); // command context (persist for the current command cycle)

  /**
   * FORESTAR:获取上下文属性状态
   */
  function getStateVar(key) {
    return context[key];
  }

   /**
   * FORESTAR:设置上下文属性状态
   */
  function setStateVar(key, val) {
    context[key] = val;
  }

  /**
   * FORESTAR: 创建上下文对象
   */
  function createContext() {
    return {
      DEBUG: false,
      QUIET: false,
      VERBOSE: false,
      defs: {},
      input_files: []
    };
  }

  function UserError(msg) {
    var err = new Error(msg);
    err.name = 'UserError';
    return err;
  }

  var Logging = /*#__PURE__*/Object.freeze({
    __proto__: null,
    // enableLogging: enableLogging,
    // loggingEnabled: loggingEnabled,
    error: error,
    stop: stop,
    message: message,
    /*setLoggingFunctions: setLoggingFunctions,*/
    print: print,
    verbose: verbose,
    // debug: debug,
    // printError: printError,
    UserError: UserError,
    // formatStringsAsGrid: formatStringsAsGrid,
    // formatLogArgs: formatLogArgs,
    // logArgs: logArgs
  });

  var _error = function() {
    var msg = utils.toArray(arguments).join(' ');
    throw new Error(msg);
  };

  // Handle an unexpected condition (internal error)
  function error() {
    _error.apply(null, utils.toArray(arguments));
  }

  var _stop = function() {
    throw new UserError(formatLogArgs(arguments));
  };

  /**
   *   FORESTAR: 停止导入
   */
  // Handle an error caused by invalid input or misuse of API
  //// TODO
  function stop () {
    _stop.apply(null, utils.toArray(arguments));
  }

  var LOGGING = false;
  var STDOUT = false; // use stdout for status messages

  // expose so GUI can use it
  function formatLogArgs(args) {
    return utils.toArray(args).join(' ');
  }

  function logArgs(args) {
    if (LOGGING && !getStateVar('QUIET') && utils.isArrayLike(args)) {
      (!STDOUT && console.error || console.log).call(console, formatLogArgs(args));
    }
  }

  var _message = function() {
    logArgs(arguments);
  };

  function messageArgs(args) {
    var arr = utils.toArray(args);
    var cmd = getStateVar('current_command');
    if (cmd && cmd != 'help') {
      arr.unshift('[' + cmd + ']');
    }
    return arr;
  }
  /**
   * FORESTAR: message （状态消息）
   */
  // Print a status message
  function message() {
    _message.apply(null, messageArgs(arguments));
  }

  /**
   * FORESTAR: verbose （多余参数处理）
   */
  function verbose() {
    if (getStateVar('VERBOSE')) {
      message.apply(null, arguments);
    }
  }

  function absArcId(arcId) {
    return arcId >= 0 ? arcId : ~arcId;
  }

  /**
   * FORESTAR:计算数据所在的四至数据
   * @param {*} xx 
   * @param {*} yy 
   * @param {*} start 
   * @param {*} len 
   */
  function calcArcBounds(xx, yy, start, len) {
    var i = start | 0,
        n = isNaN(len) ? xx.length - i : len + i,
        x, y, xmin, ymin, xmax, ymax;
    if (n > 0) {
      xmin = xmax = xx[i];
      ymin = ymax = yy[i];
    }
    for (i++; i<n; i++) {
      x = xx[i];
      y = yy[i];
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
    return [xmin, ymin, xmax, ymax];
  }

  function Bounds() {
    if (arguments.length > 0) {
      this.setBounds.apply(this, arguments);
    }
  }

  Bounds.prototype.toString = function() {
    return JSON.stringify({
      xmin: this.xmin,
      xmax: this.xmax,
      ymin: this.ymin,
      ymax: this.ymax
    });
  };

  Bounds.prototype.toArray = function() {
    return this.hasBounds() ? [this.xmin, this.ymin, this.xmax, this.ymax] : [];
  };

  Bounds.prototype.hasBounds = function() {
    return this.xmin <= this.xmax && this.ymin <= this.ymax;
  };

  Bounds.prototype.sameBounds =
      Bounds.prototype.equals = function(bb) {
        return bb && this.xmin === bb.xmin && this.xmax === bb.xmax &&
            this.ymin === bb.ymin && this.ymax === bb.ymax;
      };

  Bounds.prototype.width = function() {
    return (this.xmax - this.xmin) || 0;
  };

  Bounds.prototype.height = function() {
    return (this.ymax - this.ymin) || 0;
  };

  Bounds.prototype.area = function() {
    return this.width() * this.height() || 0;
  };

  Bounds.prototype.empty = function() {
    this.xmin = this.ymin = this.xmax = this.ymax = void 0;
    return this;
  };

  Bounds.prototype.setBounds = function(a, b, c, d) {
    if (arguments.length == 1) {
      // assume first arg is a Bounds or array
      if (utils.isArrayLike(a)) {
        b = a[1];
        c = a[2];
        d = a[3];
        a = a[0];
      } else {
        b = a.ymin;
        c = a.xmax;
        d = a.ymax;
        a = a.xmin;
      }
    }

    this.xmin = a;
    this.ymin = b;
    this.xmax = c;
    this.ymax = d;
    if (a > c || b > d) this.update();
    // error("Bounds#setBounds() min/max reversed:", a, b, c, d);
    return this;
  };


  Bounds.prototype.centerX = function() {
    var x = (this.xmin + this.xmax) * 0.5;
    return x;
  };

  Bounds.prototype.centerY = function() {
    var y = (this.ymax + this.ymin) * 0.5;
    return y;
  };

  Bounds.prototype.containsPoint = function(x, y) {
    if (x >= this.xmin && x <= this.xmax &&
        y <= this.ymax && y >= this.ymin) {
      return true;
    }
    return false;
  };

  // intended to speed up slightly bubble symbol detection; could use intersects() instead
  // TODO: fix false positive where circle is just outside a corner of the box
  Bounds.prototype.containsBufferedPoint =
      Bounds.prototype.containsCircle = function(x, y, buf) {
        if ( x + buf > this.xmin && x - buf < this.xmax ) {
          if ( y - buf < this.ymax && y + buf > this.ymin ) {
            return true;
          }
        }
        return false;
      };

  Bounds.prototype.intersects = function(bb) {
    if (bb.xmin <= this.xmax && bb.xmax >= this.xmin &&
        bb.ymax >= this.ymin && bb.ymin <= this.ymax) {
      return true;
    }
    return false;
  };

  Bounds.prototype.contains = function(bb) {
    if (bb.xmin >= this.xmin && bb.ymax <= this.ymax &&
        bb.xmax <= this.xmax && bb.ymin >= this.ymin) {
      return true;
    }
    return false;
  };

  Bounds.prototype.shift = function(x, y) {
    this.setBounds(this.xmin + x,
        this.ymin + y, this.xmax + x, this.ymax + y);
  };

  Bounds.prototype.padBounds = function(a, b, c, d) {
    this.xmin -= a;
    this.ymin -= b;
    this.xmax += c;
    this.ymax += d;
  };

  // Rescale the bounding box by a fraction. TODO: implement focus.
  // @param {number} pct Fraction of original extents
  // @param {number} pctY Optional amount to scale Y
  //
  Bounds.prototype.scale = function(pct, pctY) { /*, focusX, focusY*/
    var halfWidth = (this.xmax - this.xmin) * 0.5;
    var halfHeight = (this.ymax - this.ymin) * 0.5;
    var kx = pct - 1;
    var ky = pctY === undefined ? kx : pctY - 1;
    this.xmin -= halfWidth * kx;
    this.ymin -= halfHeight * ky;
    this.xmax += halfWidth * kx;
    this.ymax += halfHeight * ky;
  };

  // Return a bounding box with the same extent as this one.
  Bounds.prototype.cloneBounds = // alias so child classes can override clone()
      Bounds.prototype.clone = function() {
        return new Bounds(this.xmin, this.ymin, this.xmax, this.ymax);
      };

  Bounds.prototype.clearBounds = function() {
    this.setBounds(new Bounds());
  };

  Bounds.prototype.mergePoint = function(x, y) {
    if (this.xmin === void 0) {
      this.setBounds(x, y, x, y);
    } else {
      // this works even if x,y are NaN
      if (x < this.xmin)  this.xmin = x;
      else if (x > this.xmax)  this.xmax = x;

      if (y < this.ymin) this.ymin = y;
      else if (y > this.ymax) this.ymax = y;
    }
  };

  // expands either x or y dimension to match @aspect (width/height ratio)
  // @focusX, @focusY (optional): expansion focus, as a fraction of width and height
  Bounds.prototype.fillOut = function(aspect, focusX, focusY) {
    if (arguments.length < 3) {
      focusX = 0.5;
      focusY = 0.5;
    }
    var w = this.width(),
        h = this.height(),
        currAspect = w / h,
        pad;
    if (isNaN(aspect) || aspect <= 0) {
      // error condition; don't pad
    } else if (currAspect < aspect) { // fill out x dimension
      pad = h * aspect - w;
      this.xmin -= (1 - focusX) * pad;
      this.xmax += focusX * pad;
    } else {
      pad = w / aspect - h;
      this.ymin -= (1 - focusY) * pad;
      this.ymax += focusY * pad;
    }
    return this;
  };

  Bounds.prototype.update = function() {
    var tmp;
    if (this.xmin > this.xmax) {
      tmp = this.xmin;
      this.xmin = this.xmax;
      this.xmax = tmp;
    }
    if (this.ymin > this.ymax) {
      tmp = this.ymin;
      this.ymin = this.ymax;
      this.ymax = tmp;
    }
  };

  Bounds.prototype.transform = function(t) {
    this.xmin = this.xmin * t.mx + t.bx;
    this.xmax = this.xmax * t.mx + t.bx;
    this.ymin = this.ymin * t.my + t.by;
    this.ymax = this.ymax * t.my + t.by;
    this.update();
    return this;
  };

  // Returns a Transform object for mapping this onto Bounds @b2
  // @flipY (optional) Flip y-axis coords, for converting to/from pixel coords
  //
  Bounds.prototype.getTransform = function(b2, flipY) {
    var t = new Transform();
    t.mx = b2.width() / this.width() || 1; // TODO: better handling of 0 w,h
    t.bx = b2.xmin - t.mx * this.xmin;
    if (flipY) {
      t.my = -b2.height() / this.height() || 1;
      t.by = b2.ymax - t.my * this.ymin;
    } else {
      t.my = b2.height() / this.height() || 1;
      t.by = b2.ymin - t.my * this.ymin;
    }
    return t;
  };

  Bounds.prototype.mergeCircle = function(x, y, r) {
    if (r < 0) r = -r;
    this.mergeBounds([x - r, y - r, x + r, y + r]);
  };

  Bounds.prototype.mergeBounds = function(bb) {
    var a, b, c, d;
    if (bb instanceof Bounds) {
      a = bb.xmin;
      b = bb.ymin;
      c = bb.xmax;
      d = bb.ymax;
    } else if (arguments.length == 4) {
      a = arguments[0];
      b = arguments[1];
      c = arguments[2];
      d = arguments[3];
    } else if (bb.length == 4) {
      // assume array: [xmin, ymin, xmax, ymax]
      a = bb[0];
      b = bb[1];
      c = bb[2];
      d = bb[3];
    } else {
      error("Bounds#mergeBounds() invalid argument:", bb);
    }

    if (this.xmin === void 0) {
      this.setBounds(a, b, c, d);
    } else {
      if (a < this.xmin) this.xmin = a;
      if (b < this.ymin) this.ymin = b;
      if (c > this.xmax) this.xmax = c;
      if (d > this.ymax) this.ymax = d;
    }
    return this;
  };

  //
  // var PolygonGeom = /*#__PURE__*/Object.freeze({
  //   __proto__: null,
  //   calcPolsbyPopperCompactness: calcPolsbyPopperCompactness,
  //   calcSchwartzbergCompactness: calcSchwartzbergCompactness,
  //   getPathWinding: getPathWinding,
  //   getShapeArea: getShapeArea,
  //   getPlanarShapeArea: getPlanarShapeArea,
  //   getSphericalShapeArea: getSphericalShapeArea,
  //   testPointInPolygon: testPointInPolygon,
  //   testPointInRing: testPointInRing,
  //   testRayIntersection: testRayIntersection,
  //   getRayIntersection: getRayIntersection,
  //   getPathArea: getPathArea,
  //   getSphericalPathArea: getSphericalPathArea,
  //   getPlanarPathArea2: getPlanarPathArea2,
  //   getPlanarPathArea: getPlanarPathArea,
  //   getPathPerimeter: getPathPerimeter,
  //   getShapePerimeter: getShapePerimeter,
  //   getSphericalShapePerimeter: getSphericalShapePerimeter,
  //   getPlanarPathPerimeter: getPlanarPathPerimeter,
  //   getSphericalPathPerimeter: getSphericalPathPerimeter
  // });

  //
  // var SegmentGeom = /*#__PURE__*/Object.freeze({
  //   __proto__: null,
  //   segmentIntersection: segmentIntersection,
  //   findClosestPointOnSeg: findClosestPointOnSeg,
  //   orient2D: orient2D,
  //   segmentHit: segmentHit
  // });
  //
  // var PathUtils = /*#__PURE__*/Object.freeze({
  //   __proto__: null,
  //   getAvgSegment: getAvgSegment,
  //   getAvgSegment2: getAvgSegment2,
  //   getDirectedArcPresenceTest: getDirectedArcPresenceTest,
  //   getArcPresenceTest: getArcPresenceTest,
  //   countArcsInShapes: countArcsInShapes,
  //   getPathBounds: getPathBounds$1,
  //   findShapesByArcId: findShapesByArcId,
  //   reversePath: reversePath,
  //   clampIntervalByPct: clampIntervalByPct,
  //   findNextRemovableVertex: findNextRemovableVertex,
  //   forEachArcId: forEachArcId,
  //   forEachSegmentInShape: forEachSegmentInShape,
  //   forEachSegmentInPath: forEachSegmentInPath,
  //   traversePaths: traversePaths,
  //   filterEmptyArcs: filterEmptyArcs,
  //   getPathMetadata: getPathMetadata,
  //   quantizeArcs: quantizeArcs
  // });

  //
  // var ShapeUtils = /*#__PURE__*/Object.freeze({
  //   __proto__: null,
  //   cloneShape: cloneShape,
  //   cloneShapes: cloneShapes,
  //   forEachShapePart: forEachShapePart,
  //   editShapes: editShapes,
  //   editShapeParts: editShapeParts,
  //   findMaxPartCount: findMaxPartCount
  // });

  // Ex. convert UTF-8 to utf8
  function standardizeEncodingName(enc) {
    return (enc || '').toLowerCase().replace(/[_-]/g, '');
  }

  // List of encodings supported by iconv-lite:
  // https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings
  function getNativeEncoder(enc) {
    var encoder = null;
    enc = standardizeEncodingName(enc);
    if (enc != 'utf8') {
      // TODO: support more encodings if TextEncoder is available
      return null;
    }
    if (typeof TextEncoder != 'undefined') {
      encoder = new TextEncoder(enc);
    }
    return function(str) {
      // Convert Uint8Array from encoder to Buffer (fix for issue #216)
      return encoder ? Buffer.from(encoder.encode(str).buffer) : utils.createBuffer(str, enc);
    };
  }

  function getNativeDecoder(enc) {
    var decoder = null;
    enc = standardizeEncodingName(enc);
    if (enc != 'utf8') {
      // TODO: support more encodings if TextDecoder is available
      return null;
    }
    if (typeof TextDecoder != 'undefined') {
      decoder = new TextDecoder(enc);
    }
    return function(buf) {
      return decoder ? decoder.decode(buf) : buf.toString(enc);
    };
  }

  /**
   * FORESTAR: iconv
   */
  var iconv = require('iconv-lite');
  var toUtf8 = getNativeEncoder('utf8');
  var fromUtf8 = getNativeDecoder('utf8');

  /**
   * FORESTAR: encodingIsUtf8 （utf8编码）
   * @param {*} enc 
   */
  function encodingIsUtf8(enc) {
    // treating utf-8 as default
    return !enc || /^utf-?8$/i.test(String(enc));
  }

  /**
   * FORESTAR: buffer数据转字符串
   */
  // Similar to Buffer#toString(); tries to speed up utf8 conversion in
  // web browser (when using browserify Buffer shim)
   //// TODO
  function bufferToString(buf, enc, start, end) {
    if (start >= 0) {
      buf = buf.slice(start, end);
    }
    return decodeString(buf, enc);
  }

  /**
   * FORESTAR: buffer解码为字符串
   * @param {*} buf 
   * @param {*} enc 
   */
  // @buf a Node Buffer
  function decodeString(buf, enc) {
    var str;
    if (encodingIsUtf8(enc)) {
      str = fromUtf8(buf);
    } else {
      str = iconv.decode(buf, enc);
    }
    return str;
  }

  var Encodings = /*#__PURE__*/Object.freeze({
    __proto__: null,
    // getEncodings: getEncodings,
    // validateEncoding: validateEncoding,
    // stringsAreAscii: stringsAreAscii,
    // stringIsAscii: stringIsAscii,
    encodingIsUtf8: encodingIsUtf8,
    // encodingIsAsciiCompat: encodingIsAsciiCompat,
    // standardizeEncodingName: standardizeEncodingName,
    bufferToString: bufferToString,
    encodeString: encodeString,
    decodeString: decodeString,
    // encodingIsSupported: encodingIsSupported,
    // trimBOM: trimBOM,
    // printEncodings: printEncodings
  });

  /**
   * FORESTAR: 修复属性字段
   * @param {*} records 
   */
  // Fill out a data table with undefined values
  // The undefined members will disappear when records are exported as JSON,
  // but will show up when fields are listed using Object.keys()
  function fixInconsistentFields(records) {
    var fields = findIncompleteFields(records);
    patchMissingFields(records, fields);
  }

  /**
   * FORESTAR: 找出全部属性字段
   * @param {*} records 
   */
  function findIncompleteFields(records) {
    var counts = {},
        i, j, keys;
    for (i=0; i<records.length; i++) {
      keys = Object.keys(records[i] || {});
      for (j=0; j<keys.length; j++) {
        counts[keys[j]] = (counts[keys[j]] | 0) + 1;
      }
    }
    return Object.keys(counts).filter(function(k) {return counts[k] < records.length;});
  }

  /**
   * FORESTAR: 修补遗漏属性字段
   * @param {*} records 
   * @param {*} fields 
   */
  function patchMissingFields(records, fields) {
    var rec, i, j, f;
    for (i=0; i<records.length; i++) {
      rec = records[i] || (records[i] = {});
      for (j=0; j<fields.length; j++) {
        f = fields[j];
        if (f in rec === false) {
          rec[f] = undefined;
        }
      }
    }
  }

  var DataUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    // copyRecord: copyRecord,
    // getValueType: getValueType,
    fixInconsistentFields: fixInconsistentFields,
    // fieldListContainsAll: fieldListContainsAll,
    // getColumnType: getColumnType,
    // deleteFields: deleteFields,
    // isInvalidFieldName: isInvalidFieldName,
    // getUniqFieldNames: getUniqFieldNames,
    // getUniqFieldValues: getUniqFieldValues,
    // applyFieldOrder: applyFieldOrder,
    // findFieldNames: findFieldNames
  });

  /**
   * FORESTAR: 要素个数统计
   * @param lyr
   * @returns {number}
   */
  ////TODO
  function getFeatureCount(lyr) {
    var count = 0;
    if (lyr.data) {
      count = lyr.data.size();
    } else if (lyr.shapes) {
      count = lyr.shapes.length;
    }
    return count;
  }

  // Not a general-purpose deep copy function
  function copyRecord(o) {
    var o2 = {}, key, val;
    if (!o) return null;
    for (key in o) {
      if (o.hasOwnProperty(key)) {
        val = o[key];
        if (val == o) {
          // avoid infinite recursion if val is a circular reference, by copying all properties except key
          val = utils.extend({}, val);
          delete val[key];
        }
        o2[key] = val && val.constructor === Object ? copyRecord(val) : val;
      }
    }
    return o2;
  }


  function applyFieldOrder(arr, option) {
    if (option == 'ascending') {
      arr.sort(function(a, b) {
        return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
      });
    }
    return arr;
  }

  function findFieldNames(records, order) {
    var first = records[0];
    var names = first ? Object.keys(first) : [];
    return applyFieldOrder(names, order);
  }

  /**
   * FORESTAR: DataTable 数据对象
   * @param obj
   * @constructor
   */
  function DataTable(obj) {
    var records;
    if (utils.isArray(obj)) {
      records = obj;
    } else {
      records = [];
      // integer object: create empty records
      if (utils.isInteger(obj)) {
        for (var i=0; i<obj; i++) {
          records.push({});
        }
      } else if (obj) {
        error("Invalid DataTable constructor argument:", obj);
      }
    }

    this.getRecords = function() {
      return records;
    };

    // Same-name method in ShapefileTable doesn't require parsing the entire DBF file
    this.getReadOnlyRecordAt = function(i) {
      return copyRecord(records[i]); // deep-copies plain objects but not other constructed objects
    };
  }

  DataTable.prototype = {

    fieldExists: function(name) {
      return utils.contains(this.getFields(), name);
    },

    toString: function() {return JSON.stringify(this);},

    toJSON: function() {
      return this.getRecords();
    },

    addField: function(name, init) {
      var useFunction = utils.isFunction(init);
      if (!utils.isNumber(init) && !utils.isString(init) && !useFunction) {
        error("DataTable#addField() requires a string, number or function for initialization");
      }
      if (this.fieldExists(name)) error("DataTable#addField() tried to add a field that already exists:", name);
      // var dataFieldRxp = /^[a-zA-Z_][a-zA-Z_0-9]*$/;
      // if (!dataFieldRxp.test(name)) error("DataTable#addField() invalid field name:", name);

      this.getRecords().forEach(function(obj, i) {
        obj[name] = useFunction ? init(obj, i) : init;
      });
    },

    getRecordAt: function(i) {
      return this.getRecords()[i];
    },

    addIdField: function() {
      this.addField('FID', function(obj, i) {
        return i;
      });
    },

    deleteField: function(f) {
      this.getRecords().forEach(function(o) {
        delete o[f];
      });
    },

    getFields: function() {
      return findFieldNames(this.getRecords());
    },

    isEmpty: function() {
      return this.getFields().length === 0 || this.size() === 0;
    },

    update: function(f) {
      var records = this.getRecords();
      for (var i=0, n=records.length; i<n; i++) {
        records[i] = f(records[i], i);
      }
    },

    clone: function() {
      // TODO: this could be sped up using a record constructor function
      // (see getRecordConstructor() in DbfReader)
      var records2 = this.getRecords().map(copyRecord);
      return new DataTable(records2);
    },

    size: function() {
      return this.getRecords().length;
    }
  };

  /**
   * FORESTAR: 根据类型查分要素
   * 
   * @param {*} shapes 
   * @param {*} properties 
   * @param {*} types 
   */
  // Divide a collection of features with mixed types into layers of a single type
  // (Used for importing TopoJSON and GeoJSON features)
  function divideFeaturesByType(shapes, properties, types) {
    var typeSet = utils.uniq(types);
    var layers = typeSet.map(function(geoType) {
      var p = [],
          s = [],
          dataNulls = 0,
          rec;
      for (var i=0, n=shapes.length; i<n; i++) {
        if (types[i] != geoType) continue;
        if (geoType) s.push(shapes[i]);
        rec = properties[i];
        p.push(rec);
        if (!rec) dataNulls++;
      }
      return {
        geometry_type: geoType,
        shapes: s,
        data: dataNulls < s.length ? new DataTable(p) : null
      };
    });
    return layers;
  }

  /**
   * FORESTAR: 解决循环依赖问题
   */
  // moving this here from mapshaper-path-utils to avoid circular dependency
  function getArcPresenceTest2(layers, arcs) {
    var counts = countArcsInLayers(layers, arcs);
    return function(arcId) {
      return counts[absArcId(arcId)] > 0;
    };
  }

  function layerHasPaths(lyr) {
    return (lyr.geometry_type == 'polygon' || lyr.geometry_type == 'polyline') &&
        layerHasNonNullShapes(lyr);
  }

  function layerHasPoints(lyr) {
    return lyr.geometry_type == 'point' && layerHasNonNullShapes(lyr);
  }

  function layerHasNonNullShapes(lyr) {
    return utils.some(lyr.shapes || [], function(shp) {
      return !!shp;
    });
  }

  function traversePaths(shapes, cbArc, cbPart, cbShape) {
    var segId = 0;
    shapes.forEach(function(parts, shapeId) {
      if (!parts || parts.length === 0) return; // null shape
      var arcIds, arcId;
      if (cbShape) {
        cbShape(shapeId);
      }
      for (var i=0, m=parts.length; i<m; i++) {
        arcIds = parts[i];
        if (cbPart) {
          cbPart({
            i: i,
            shapeId: shapeId,
            shape: parts,
            arcs: arcIds
          });
        }

        if (cbArc) {
          for (var j=0, n=arcIds.length; j<n; j++, segId++) {
            arcId = arcIds[j];
            cbArc({
              i: j,
              shapeId: shapeId,
              partId: i,
              arcId: arcId,
              segId: segId
            });
          }
        }
      }
    });
  }

  // @counts A typed array for accumulating count of each abs arc id
  //   (assume it won't overflow)
  function countArcsInShapes(shapes, counts) {
    traversePaths(shapes, null, function(obj) {
      var arcs = obj.arcs,
          id;
      for (var i=0; i<arcs.length; i++) {
        id = arcs[i];
        if (id < 0) id = ~id;
        counts[id]++;
      }
    });
  }


  /**
   * FORESTAR: 解决循环依赖问题
   */
  // Count arcs in a collection of layers
  function countArcsInLayers(layers, arcs) {
    var counts = new Uint32Array(arcs.size());
    layers.filter(layerHasPaths).forEach(function(lyr) {
      countArcsInShapes(lyr.shapes, counts);
    });
    return counts;
  }

  var LayerUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    // insertFieldValues: insertFieldValues,
    // getLayerDataTable: getLayerDataTable,
    // layerHasGeometry: layerHasGeometry,
    layerHasPaths: layerHasPaths,
    // layerHasPoints: layerHasPoints,
    // layerHasNonNullShapes: layerHasNonNullShapes,
    // deleteFeatureById: deleteFeatureById,
    // transformPointsInLayer: transformPointsInLayer,
    getFeatureCount: getFeatureCount,
    // layerIsEmpty: layerIsEmpty,
    // requireDataField: requireDataField,
    // requireDataFields: requireDataFields,
    // layerTypeMessage: layerTypeMessage,
    // requirePointLayer: requirePointLayer,
    // requirePolylineLayer: requirePolylineLayer,
    // requirePolygonLayer: requirePolygonLayer,
    // requirePathLayer: requirePathLayer,
    // getLayerSourceFile: getLayerSourceFile,
    divideFeaturesByType: divideFeaturesByType,
    // getOutputLayer: getOutputLayer,
    // copyLayer: copyLayer,
    // filterPathLayerByArcIds: filterPathLayerByArcIds,
    // copyLayerShapes: copyLayerShapes,
    // countMultiPartFeatures: countMultiPartFeatures,
    getArcPresenceTest2: getArcPresenceTest2,
    countArcsInLayers: countArcsInLayers,
    // getLayerBounds: getLayerBounds,
    // isolateLayer: isolateLayer,
    // initDataTable: initDataTable
  });

  /**
   * FORESTAR: 获取图形的结束点
   * @param {*} layers 
   * @param {*} arcs 
   */
  // Test if the second endpoint of an arc is the endpoint of any path in any layer
  function getPathEndpointTest(layers, arcs) {
    var index = new Uint8Array(arcs.size());
    layers.forEach(function(lyr) {
      if (layerHasPaths(lyr)) {
        lyr.shapes.forEach(addShape);
      }
    });

    function addShape(shape) {
      forEachShapePart(shape, addPath);
    }

    function addPath(path) {
      addEndpoint(~path[0]);
      addEndpoint(path[path.length - 1]);
    }

    function addEndpoint(arcId) {
      var absId = absArcId(arcId);
      var fwd = absId == arcId;
      index[absId] |= fwd ? 1 : 2;
    }

    return function(arcId) {
      var absId = absArcId(arcId);
      var fwd = absId == arcId;
      var code = index[absId];
      return fwd ? (code & 1) == 1 : (code & 2) == 2;
    };
  }

  var PathEndpoints = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getPathEndpointTest: getPathEndpointTest
  });

  // Get function to Hash an x, y point to a non-negative integer
  function getXYHash(size) {
    var buf = new ArrayBuffer(16),
        floats = new Float64Array(buf),
        uints = new Uint32Array(buf),
        lim = size | 0;
    if (lim > 0 === false) {
      throw new Error("Invalid size param: " + size);
    }

    return function(x, y) {
      var u = uints, h;
      floats[0] = x;
      floats[1] = y;
      h = u[0] ^ u[1];
      h = h << 5 ^ h >> 7 ^ u[2] ^ u[3];
      return (h & 0x7fffffff) % lim;
    };
  }

  function initHashChains(xx, yy) {
    // Performance doesn't improve much above ~1.3 * point count
    var n = xx.length,
        m = Math.floor(n * 1.3) || 1,
        hash = getXYHash(m),
        hashTable = new Int32Array(m),
        chainIds = new Int32Array(n), // Array to be filled with chain data
        key, j, i, x, y;

    for (i=0; i<n; i++) {
      x = xx[i];
      y = yy[i];
      if (x != x || y != y) {
        j = -1; // NaN coord: no hash entry, one-link chain
      } else {
        key = hash(x, y);
        j = hashTable[key] - 1; // coord ids are 1-based in hash table; 0 used as null value.
        hashTable[key] = i + 1;
      }
      chainIds[i] = j >= 0 ? j : i; // first item in a chain points to self
    }
    return chainIds;
  }

  /**
   * FORESTAR: 初始化xx,yy对应的点链
   * @param xx
   * @param yy
   * @returns {Int32Array}
   */
  function initPointChains(xx, yy) {
    var chainIds = initHashChains(xx, yy),
        j, next, prevMatchId, prevUnmatchId;

    // disentangle, reverse and close the chains created by initHashChains()
    for (var i = xx.length-1; i>=0; i--) {
      next = chainIds[i];
      if (next >= i) continue;
      prevMatchId = i;
      prevUnmatchId = -1;
      do {
        j = next;
        next = chainIds[j];
        if (yy[j] == yy[i] && xx[j] == xx[i]) {
          chainIds[j] = prevMatchId;
          prevMatchId = j;
        } else {
          if (prevUnmatchId > -1) {
            chainIds[prevUnmatchId] = j;
          }
          prevUnmatchId = j;
        }
      } while (next < j);
      if (prevUnmatchId > -1) {
        // Make sure last unmatched entry is terminated
        chainIds[prevUnmatchId] = prevUnmatchId;
      }
      chainIds[i] = prevMatchId; // close the chain
    }
    return chainIds;
  }

  // Coordinate iterators
  //
  // Interface:
  //   properties: x, y
  //   method: hasNext()
  //
  // Usage:
  //   while (iter.hasNext()) {
  //     iter.x, iter.y; // do something w/ x & y
  //   }

  // Iterate over an array of [x, y] points
  //
  function PointIter(points) {
    var n = points.length,
        i = 0,
        iter = {
          x: 0,
          y: 0,
          hasNext: hasNext
        };
    function hasNext() {
      if (i >= n) return false;
      iter.x = points[i][0];
      iter.y = points[i][1];
      i++;
      return true;
    }
    return iter;
  }


  // Constructor takes arrays of coords: xx, yy, zz (optional)
  //
  function ArcIter(xx, yy) {
    this._i = 0;
    this._n = 0;
    this._inc = 1;
    this._xx = xx;
    this._yy = yy;
    this.i = 0;
    this.x = 0;
    this.y = 0;
  }

  ArcIter.prototype.init = function(i, len, fw) {
    if (fw) {
      this._i = i;
      this._inc = 1;
    } else {
      this._i = i + len - 1;
      this._inc = -1;
    }
    this._n = len;
    return this;
  };

  ArcIter.prototype.hasNext = function() {
    var i = this._i;
    if (this._n > 0) {
      this._i = i + this._inc;
      this.x = this._xx[i];
      this.y = this._yy[i];
      this.i = i;
      this._n--;
      return true;
    }
    return false;
  };

  function FilteredArcIter(xx, yy, zz) {
    var _zlim = 0,
        _i = 0,
        _inc = 1,
        _stop = 0;

    this.init = function(i, len, fw, zlim) {
      _zlim = zlim || 0;
      if (fw) {
        _i = i;
        _inc = 1;
        _stop = i + len;
      } else {
        _i = i + len - 1;
        _inc = -1;
        _stop = i - 1;
      }
      return this;
    };

    this.hasNext = function() {
      // using local vars is significantly faster when skipping many points
      var zarr = zz,
          i = _i,
          j = i,
          zlim = _zlim,
          stop = _stop,
          inc = _inc;
      if (i == stop) return false;
      do {
        j += inc;
      } while (j != stop && zarr[j] < zlim);
      _i = j;
      this.x = xx[i];
      this.y = yy[i];
      this.i = i;
      return true;
    };
  }

   
  /**
   * FORESTAR: ShapeIter对象
   */
  // Iterate along a path made up of one or more arcs.
  //
  function ShapeIter(arcs) {
    this._arcs = arcs;
    this._i = 0;
    this._n = 0;
    this.x = 0;
    this.y = 0;
  }

   /**
   * FORESTAR: ShapeIter对象函数
   */
  ShapeIter.prototype.hasNext = function() {
    var arc = this._arc;
    if (this._i < this._n === false) {
      return false;
    }
    if (arc.hasNext()) {
      this.x = arc.x;
      this.y = arc.y;
      return true;
    }
    this.nextArc();
    return this.hasNext();
  };

   /**
   * FORESTAR: ShapeIter对象函数
   */
  ShapeIter.prototype.init = function(ids) {
    this._ids = ids;
    this._n = ids.length;
    this.reset();
    return this;
  };

   /**
   * FORESTAR: ShapeIter对象函数
   */
  ShapeIter.prototype.nextArc = function() {
    var i = this._i + 1;
    if (i < this._n) {
      this._arc = this._arcs.getArcIter(this._ids[i]);
      if (i > 0) this._arc.hasNext(); // skip first point
    }
    this._i = i;
  };

   /**
   * FORESTAR: ShapeIter对象函数
   */
  ShapeIter.prototype.reset = function() {
    this._i = -1;
    this.nextArc();
  };

  var ShapeIter$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    PointIter: PointIter,
    ArcIter: ArcIter,
    FilteredArcIter: FilteredArcIter,
    ShapeIter: ShapeIter
  });

  /**
   * FORESTAR: ArcCollection 经纬度点集合处理arc对象
   */
  // An interface for managing a collection of paths.
  // Constructor signatures:
  //
  // ArcCollection(arcs)
  //    arcs is an array of polyline arcs; each arc is an array of points: [[x0, y0], [x1, y1], ... ]
  //
  // ArcCollection(nn, xx, yy)
  //    nn is an array of arc lengths; xx, yy are arrays of concatenated coords;
  function ArcCollection() {
    var _xx, _yy,  // coordinates data
        _ii, _nn,  // indexes, sizes
        _zz, _zlimit = 0, // simplification
        _bb, _allBounds, // bounding boxes
        _arcIter, _filteredArcIter; // path iterators

    if (arguments.length == 1) {
      initLegacyArcs(arguments[0]);  // want to phase this out
    } else if (arguments.length == 3) {
      initXYData.apply(this, arguments);
    } else {
      error("ArcCollection() Invalid arguments");
    }

    /**
     * FORESTAR: 初始化传承数据
     * @param {*} arcs 
     */
    function initLegacyArcs(arcs) {
      var xx = [], yy = [];
      var nn = arcs.map(function(points) {
        var n = points ? points.length : 0;
        for (var i=0; i<n; i++) {
          xx.push(points[i][0]);
          yy.push(points[i][1]);
        }
        return n;
      });
      initXYData(nn, xx, yy);
    }

    /**
     * FORESTAR:初始化XY数据
     * 
     * @param {*} nn 
     * @param {*} xx 
     * @param {*} yy 
     */
    function initXYData(nn, xx, yy) {
      var size = nn.length;
      if (nn instanceof Array) nn = new Uint32Array(nn);
      if (xx instanceof Array) xx = new Float64Array(xx);
      if (yy instanceof Array) yy = new Float64Array(yy);
      _xx = xx;
      _yy = yy;
      _nn = nn;
      _zz = null;
      _zlimit = 0;
      _filteredArcIter = null;

      // generate array of starting idxs of each arc
      _ii = new Uint32Array(size);
      for (var idx = 0, j=0; j<size; j++) {
        _ii[j] = idx;
        idx += nn[j];
      }

      if (idx != _xx.length || _xx.length != _yy.length) {
        error("ArcCollection#initXYData() Counting error");
      }

      initBounds();
      // Pre-allocate some path iterators for repeated use.
      _arcIter = new ArcIter(_xx, _yy);
      return this;
    }

    /**
     * FORESTAR:初始化ZData
     * @param {*} zz 
     */
    function initZData(zz) {
      if (!zz) {
        _zz = null;
        _zlimit = 0;
        _filteredArcIter = null;
      } else {
        if (zz.length != _xx.length) error("ArcCollection#initZData() mismatched arrays");
        if (zz instanceof Array) zz = new Float64Array(zz);
        _zz = zz;
        _filteredArcIter = new FilteredArcIter(_xx, _yy, _zz);
      }
    }

    /**
     * FORESTAR:初始化四至范围数组
     */
    function initBounds() {
      var data = calcArcBounds2(_xx, _yy, _nn);
      _bb = data.bb;
      _allBounds = data.bounds;
    }

    /**
     * FORESTAR:计算数据所在的四至数据
     * 
     * @param {*} xx 
     * @param {*} yy 
     * @param {*} nn 
     */
    function calcArcBounds2(xx, yy, nn) {
      var numArcs = nn.length,
          bb = new Float64Array(numArcs * 4),
          bounds = new Bounds(),
          arcOffs = 0,
          arcLen,
          j, b;
      for (var i=0; i<numArcs; i++) {
        arcLen = nn[i];
        if (arcLen > 0) {
          j = i * 4;
          b = calcArcBounds(xx, yy, arcOffs, arcLen);
          bb[j++] = b[0];
          bb[j++] = b[1];
          bb[j++] = b[2];
          bb[j] = b[3];
          arcOffs += arcLen;
          bounds.mergeBounds(b);
        }
      }
      return {
        bb: bb,
        bounds: bounds
      };
    }

    /**
     * FORESTAR:更新端点数据
     */
    this.updateVertexData = function(nn, xx, yy, zz) {
      initXYData(nn, xx, yy);
      initZData(zz || null);
    };

    /**
     * FORESTAR:获取端点数据
     */
    // Give access to raw data arrays...
    this.getVertexData = function() {
      return {
        xx: _xx,
        yy: _yy,
        zz: _zz,
        bb: _bb,
        nn: _nn,
        ii: _ii
      };
    };

    /**
     * FORESTAR:复制ARC数据
     */
    this.getCopy = function() {
      var copy = new ArcCollection(new Int32Array(_nn), new Float64Array(_xx),
          new Float64Array(_yy));
      if (_zz) {
        copy.setThresholds(new Float64Array(_zz));
        copy.setRetainedInterval(_zlimit);
      }
      return copy;
    };

    /**
     * FORESTAR:获取过滤点数量
     */
    function getFilteredPointCount() {
      var zz = _zz, z = _zlimit;
      if (!zz || !z) return this.getPointCount();
      var count = 0;
      for (var i=0, n = zz.length; i<n; i++) {
        if (zz[i] >= z) count++;
      }
      return count;
    }

    /**
     * FORESTAR:获取过滤端点数据
     */
    function getFilteredVertexData() {
      var len2 = getFilteredPointCount();
      var arcCount = _nn.length;
      var xx2 = new Float64Array(len2),
          yy2 = new Float64Array(len2),
          zz2 = new Float64Array(len2),
          nn2 = new Int32Array(arcCount),
          i=0, i2 = 0,
          n, n2;

      for (var arcId=0; arcId < arcCount; arcId++) {
        n2 = 0;
        n = _nn[arcId];
        for (var end = i+n; i < end; i++) {
          if (_zz[i] >= _zlimit) {
            xx2[i2] = _xx[i];
            yy2[i2] = _yy[i];
            zz2[i2] = _zz[i];
            i2++;
            n2++;
          }
        }
        if (n2 == 1) {
          error("Collapsed arc");
          // This should not happen (endpoints should be z == Infinity)
          // Could handle like this, instead of throwing an error:
          // n2 = 0;
          // xx2.pop();
          // yy2.pop();
          // zz2.pop();
        } else if (n2 === 0) {
          // collapsed arc... ignoring
        }
        nn2[arcId] = n2;
      }
      return {
        xx: xx2,
        yy: yy2,
        zz: zz2,
        nn: nn2
      };
    }

    /**
     * FORESTAR:获取过滤端点数据
     */
    this.getFilteredCopy = function() {
      if (!_zz || _zlimit === 0) return this.getCopy();
      var data = getFilteredVertexData();
      var copy = new ArcCollection(data.nn, data.xx, data.yy);
      copy.setThresholds(data.zz);
      return copy;
    };

     /**
     * FORESTAR: arc转数组
     */
    // Return arcs as arrays of [x, y] points (intended for testing).
    this.toArray = function() {
      var arr = [];
      this.forEach(function(iter) {
        var arc = [];
        while (iter.hasNext()) {
          arc.push([iter.x, iter.y]);
        }
        arr.push(arc);
      });
      return arr;
    };

    /**
     * FORESTAR: arc转JSON
     */
    this.toJSON = function() {
      return this.toArray();
    };

     /**
     * FORESTAR: 遍历arc分段
     */
    // @cb function(i, j, xx, yy)
    this.forEachArcSegment = function(arcId, cb) {
      var fw = arcId >= 0,
          absId = fw ? arcId : ~arcId,
          zlim = this.getRetainedInterval(),
          n = _nn[absId],
          step = fw ? 1 : -1,
          v1 = fw ? _ii[absId] : _ii[absId] + n - 1,
          v2 = v1,
          xx = _xx, yy = _yy, zz = _zz,
          count = 0;

      for (var j = 1; j < n; j++) {
        v2 += step;
        if (zlim === 0 || zz[v2] >= zlim) {
          cb(v1, v2, xx, yy);
          v1 = v2;
          count++;
        }
      }
      return count;
    };

    /**
     * FORESTAR: 遍历arc分段
     */
    // @cb function(i, j, xx, yy)
    this.forEachSegment = function(cb) {
      var count = 0;
      for (var i=0, n=this.size(); i<n; i++) {
        count += this.forEachArcSegment(i, cb);
      }
      return count;
    };

    /**
     * FORESTAR:转换点数据
     */
    this.transformPoints = function(f) {
      var xx = _xx, yy = _yy, arcId = -1, n = 0, p;
      for (var i=0, len=xx.length; i<len; i++, n--) {
        while (n === 0) {
          n = _nn[++arcId];
        }
        p = f(xx[i], yy[i], arcId);
        if (p) {
          xx[i] = p[0];
          yy[i] = p[1];
        }
      }
      initBounds();
    };

    /**
     * FORESTAR:遍历
     */
    // Return an ArcIter object for each path in the dataset
    //
    this.forEach = function(cb) {
      for (var i=0, n=this.size(); i<n; i++) {
        cb(this.getArcIter(i), i);
      }
    };

    /**
     * FORESTAR:遍历2
     */
    // Iterate over arcs with access to low-level data
    //
    this.forEach2 = function(cb) {
      for (var arcId=0, n=this.size(); arcId<n; arcId++) {
        cb(_ii[arcId], _nn[arcId], _xx, _yy, _zz, arcId);
      }
    };

    /**
     * FORESTAR:遍历3
     */
    this.forEach3 = function(cb) {
      var start, end, xx, yy, zz;
      for (var arcId=0, n=this.size(); arcId<n; arcId++) {
        start = _ii[arcId];
        end = start + _nn[arcId];
        xx = _xx.subarray(start, end);
        yy = _yy.subarray(start, end);
        if (_zz) zz = _zz.subarray(start, end);
        cb(xx, yy, zz, arcId);
      }
    };

    /**
     * FORESTAR:过滤arc
     */
    // Remove arcs that don't pass a filter test and re-index arcs
    // Return array mapping original arc ids to re-indexed ids. If arr[n] == -1
    // then arc n was removed. arr[n] == m indicates that the arc at n was
    // moved to index m.
    // Return null if no arcs were re-indexed (and no arcs were removed)
    //
    this.filter = function(cb) {
      var test = function(i) {
        return cb(this.getArcIter(i), i);
      }.bind(this);
      return this.deleteArcs(test);
    };

    /**
     * FORESTAR:删除arc
     */
    this.deleteArcs = function(test) {
      var n = this.size(),
          map = new Int32Array(n),
          goodArcs = 0,
          goodPoints = 0;
      for (var i=0; i<n; i++) {
        if (test(i)) {
          map[i] = goodArcs++;
          goodPoints += _nn[i];
        } else {
          map[i] = -1;
        }
      }
      if (goodArcs < n) {
        condenseArcs(map);
      }
      return map;
    };

    /**
     * FORESTAR: 压缩arcs
     * @param {*} map 
     */
    function condenseArcs(map) {
      var goodPoints = 0,
          goodArcs = 0,
          copyElements = utils.copyElements,
          k, arcLen;
      for (var i=0, n=map.length; i<n; i++) {
        k = map[i];
        arcLen = _nn[i];
        if (k > -1) {
          copyElements(_xx, _ii[i], _xx, goodPoints, arcLen);
          copyElements(_yy, _ii[i], _yy, goodPoints, arcLen);
          if (_zz) copyElements(_zz, _ii[i], _zz, goodPoints, arcLen);
          _nn[k] = arcLen;
          goodPoints += arcLen;
          goodArcs++;
        }
      }

      initXYData(_nn.subarray(0, goodArcs), _xx.subarray(0, goodPoints),
          _yy.subarray(0, goodPoints));
      if (_zz) initZData(_zz.subarray(0, goodPoints));
    }

    /**
     * FORESTAR: coordinates去重
     */
    this.dedupCoords = function() {
      var arcId = 0, i = 0, i2 = 0,
          arcCount = this.size(),
          zz = _zz,
          arcLen, arcLen2;
      while (arcId < arcCount) {
        arcLen = _nn[arcId];
        arcLen2 = dedupArcCoords(i, i2, arcLen, _xx, _yy, zz);
        _nn[arcId] = arcLen2;
        i += arcLen;
        i2 += arcLen2;
        arcId++;
      }
      if (i > i2) {
        initXYData(_nn, _xx.subarray(0, i2), _yy.subarray(0, i2));
        if (zz) initZData(zz.subarray(0, i2));
      }
      return i - i2;
    };

    /**
     * FORESTAR: 获取端点位置
     */
    this.getVertex = function(arcId, nth) {
      var i = this.indexOfVertex(arcId, nth);
      return {
        x: _xx[i],
        y: _yy[i]
      };
    };

    /**
     * FORESTAR: 获取端点位置索引
     */
    // @nth: index of vertex. ~(idx) starts from the opposite endpoint
    this.indexOfVertex = function(arcId, nth) {
      var absId = arcId < 0 ? ~arcId : arcId,
          len = _nn[absId];
      if (nth < 0) nth = len + nth;
      if (absId != arcId) nth = len - nth - 1;
      if (nth < 0 || nth >= len) error("[ArcCollection] out-of-range vertex id");
      return _ii[absId] + nth;
    };

    /**
     * FORESTAR: 判断arc是否闭合[存在闭合图形]
     */
    // Tests if arc endpoints have same x, y coords
    // (arc may still have collapsed);
    this.arcIsClosed = function(arcId) {
      var i = this.indexOfVertex(arcId, 0),
          j = this.indexOfVertex(arcId, -1);
      return i != j && _xx[i] == _xx[j] && _yy[i] == _yy[j];
    };

    /**
     * FORESTAR: 判断arc第一个分段和最后一个分段是否相同
     */
    // Tests if first and last segments mirror each other
    // A 3-vertex arc with same endpoints tests true
    this.arcIsLollipop = function(arcId) {
      var len = this.getArcLength(arcId),
          i, j;
      if (len <= 2 || !this.arcIsClosed(arcId)) return false;
      i = this.indexOfVertex(arcId, 1);
      j = this.indexOfVertex(arcId, -2);
      return _xx[i] == _xx[j] && _yy[i] == _yy[j];
    };

    /**
     * FORESTAR: 判断arc是否简化
     */
    this.arcIsDegenerate = function(arcId) {
      var iter = this.getArcIter(arcId);
      var i = 0,
          x, y;
      while (iter.hasNext()) {
        if (i > 0) {
          if (x != iter.x || y != iter.y) return false;
        }
        x = iter.x;
        y = iter.y;
        i++;
      }
      return true;
    };

    this.getArcLength = function(arcId) {
      return _nn[absArcId(arcId)];
    };

     /**
     * FORESTAR: 获取arc迭代对象
     */
    this.getArcIter = function(arcId) {
      var fw = arcId >= 0,
          i = fw ? arcId : ~arcId,
          iter = _zz && _zlimit ? _filteredArcIter : _arcIter;
      if (i >= _nn.length) {
        error("#getArcId() out-of-range arc id:", arcId);
      }
      return iter.init(_ii[i], _nn[i], fw, _zlimit);
    };

     /**
     * FORESTAR: 获取shape迭代对象
     */
    this.getShapeIter = function(ids) {
      return new ShapeIter(this).init(ids);
    };

    /**
     * FORESTAR: 设置简化函数的阈值
     */
    // Add simplification data to the dataset
    // @thresholds is either a single typed array or an array of arrays of removal thresholds for each arc;
    //
    this.setThresholds = function(thresholds) {
      var n = this.getPointCount(),
          zz = null;
      if (!thresholds) {
        // nop
      } else if (thresholds.length == n) {
        zz = thresholds;
      } else if (thresholds.length == this.size()) {
        zz = flattenThresholds(thresholds, n);
      } else {
        error("Invalid threshold data");
      }
      initZData(zz);
      return this;
    };

    /**
     * FORESTAR: 获取普通阈值
     */
    function flattenThresholds(arr, n) {
      var zz = new Float64Array(n),
          i = 0;
      arr.forEach(function(arr) {
        for (var j=0, n=arr.length; j<n; i++, j++) {
          zz[i] = arr[j];
        }
      });
      if (i != n) error("Mismatched thresholds");
      return zz;
    }

     /**
     * FORESTAR: 标记函数
     */
    // bake in current simplification level, if any
    this.flatten = function() {
      if (_zlimit > 0) {
        var data = getFilteredVertexData();
        this.updateVertexData(data.nn, data.xx, data.yy);
        _zlimit = 0;
      } else {
        _zz = null;
      }
    };

     /**
     * FORESTAR: 标记函数
     */
    this.getRetainedInterval = function() {
      return _zlimit;
    };

     /**
     * FORESTAR: 标记函数
     */
    this.setRetainedInterval = function(z) {
      _zlimit = z;
      return this;
    };

     /**
     * FORESTAR: 标记函数
     */
    this.getRetainedPct = function() {
      return this.getPctByThreshold(_zlimit);
    };

     /**
     * FORESTAR: 标记函数
     */
    this.setRetainedPct = function(pct) {
      if (pct >= 1) {
        _zlimit = 0;
      } else {
        _zlimit = this.getThresholdByPct(pct);
        _zlimit = clampIntervalByPct(_zlimit, pct);
      }
      return this;
    };

     /**
     * FORESTAR: 标记函数
     */
    // Return array of z-values that can be removed for simplification
    //
    this.getRemovableThresholds = function(nth) {
      if (!_zz) error("[arcs] Missing simplification data.");
      var skip = nth | 1,
          arr = new Float64Array(Math.ceil(_zz.length / skip)),
          z;
      for (var i=0, j=0, n=this.getPointCount(); i<n; i+=skip) {
        z = _zz[i];
        if (z != Infinity) {
          arr[j++] = z;
        }
      }
      return arr.subarray(0, j);
    };

     /**
     * FORESTAR: 标记函数
     */
    this.getArcThresholds = function(arcId) {
      if (!(arcId >= 0 && arcId < this.size())) {
        error("[arcs] Invalid arc id:", arcId);
      }
      var start = _ii[arcId],
          end = start + _nn[arcId];
      return _zz.subarray(start, end);
    };

     /**
     * FORESTAR: 标记函数
     */
    // nth (optional): sample every nth threshold (use estimate for speed)
    this.getPctByThreshold = function(val, nth) {
      var arr, rank, pct;
      if (val > 0) {
        arr = this.getRemovableThresholds(nth);
        rank = utils.findRankByValue(arr, val);
        pct = arr.length > 0 ? 1 - (rank - 1) / arr.length : 1;
      } else {
        pct = 1;
      }
      return pct;
    };

     /**
     * FORESTAR: 标记函数
     */
    // nth (optional): sample every nth threshold (use estimate for speed)
    this.getThresholdByPct = function(pct, nth) {
      return getThresholdByPct(pct, this, nth);
    };

     /**
     * FORESTAR: 标记函数
     */
    this.arcIntersectsBBox = function(i, b1) {
      var b2 = _bb,
          j = i * 4;
      return b2[j] <= b1[2] && b2[j+2] >= b1[0] && b2[j+3] >= b1[1] && b2[j+1] <= b1[3];
    };

     /**
     * FORESTAR: 标记函数
     */
    this.arcIsContained = function(i, b1) {
      var b2 = _bb,
          j = i * 4;
      return b2[j] >= b1[0] && b2[j+2] <= b1[2] && b2[j+1] >= b1[1] && b2[j+3] <= b1[3];
    };

     /**
     * FORESTAR: 标记函数
     */
    this.arcIsSmaller = function(i, units) {
      var bb = _bb,
          j = i * 4;
      return bb[j+2] - bb[j] < units && bb[j+3] - bb[j+1] < units;
    };

     /**
     * FORESTAR: 标记函数
     */
    // TODO: allow datasets in lat-lng coord range to be flagged as planar
    this.isPlanar = function() {
      return !probablyDecimalDegreeBounds(this.getBounds());
    };

     /**
     * FORESTAR: 标记函数
     */
    this.size = function() {
      return _ii && _ii.length || 0;
    };

     /**
     * FORESTAR: 标记函数
     */
    this.getPointCount = function() {
      return _xx && _xx.length || 0;
    };

    this.getFilteredPointCount = getFilteredPointCount;

     /**
     * FORESTAR: 标记函数
     */
    this.getBounds = function() {
      return _allBounds.clone();
    };

     /**
     * FORESTAR: 标记函数
     */
    this.getSimpleShapeBounds = function(arcIds, bounds) {
      bounds = bounds || new Bounds();
      for (var i=0, n=arcIds.length; i<n; i++) {
        this.mergeArcBounds(arcIds[i], bounds);
      }
      return bounds;
    };

     /**
     * FORESTAR: 标记函数
     */
    this.getSimpleShapeBounds2 = function(arcIds, arr) {
      var bbox = arr || [],
          bb = _bb,
          id = absArcId(arcIds[0]) * 4;
      bbox[0] = bb[id];
      bbox[1] = bb[++id];
      bbox[2] = bb[++id];
      bbox[3] = bb[++id];
      for (var i=1, n=arcIds.length; i<n; i++) {
        id = absArcId(arcIds[i]) * 4;
        if (bb[id] < bbox[0]) bbox[0] = bb[id];
        if (bb[++id] < bbox[1]) bbox[1] = bb[id];
        if (bb[++id] > bbox[2]) bbox[2] = bb[id];
        if (bb[++id] > bbox[3]) bbox[3] = bb[id];
      }
      return bbox;
    };

     /**
     * FORESTAR: 标记函数
     */
    // TODO: move this and similar methods out of ArcCollection
    this.getMultiShapeBounds = function(shapeIds, bounds) {
      bounds = bounds || new Bounds();
      if (shapeIds) { // handle null shapes
        for (var i=0, n=shapeIds.length; i<n; i++) {
          this.getSimpleShapeBounds(shapeIds[i], bounds);
        }
      }
      return bounds;
    };

     /**
     * FORESTAR: 标记函数
     */
    this.mergeArcBounds = function(arcId, bounds) {
      if (arcId < 0) arcId = ~arcId;
      var offs = arcId * 4;
      bounds.mergeBounds(_bb[offs], _bb[offs+1], _bb[offs+2], _bb[offs+3]);
    };
  }

  /**
   * FORESTAR: coordinates去重
   */
  // Remove duplicate coords and NaNs
  function dedupArcCoords(src, dest, arcLen, xx, yy, zz) {
    var n = 0, n2 = 0; // counters
    var x, y, i, j, keep;
    while (n < arcLen) {
      j = src + n;
      x = xx[j];
      y = yy[j];
      keep = x == x && y == y && (n2 === 0 || x != xx[j-1] || y != yy[j-1]);
      if (keep) {
        i = dest + n2;
        xx[i] = x;
        yy[i] = y;
        n2++;
      }
      if (zz && n2 > 0 && (keep || zz[j] > zz[i])) {
        zz[i] = zz[j];
      }
      n++;
    }
    return n2 > 1 ? n2 : 0;
  }

  /**
    * FORESTAR: NodeCollection 过滤节点集合
    */
  // @arcs ArcCollection
  // @filter Optional filter function, arcIds that return false are excluded
  //
  function NodeCollection(arcs, filter) {
    if (Array.isArray(arcs)) {
      arcs = new ArcCollection(arcs);
    }
    var arcData = arcs.getVertexData(),
        nn = arcData.nn,
        xx = arcData.xx,
        yy = arcData.yy,
        nodeData;

    // Accessor function for arcs
    Object.defineProperty(this, 'arcs', {value: arcs});

    var toArray = this.toArray = function() {
      var chains = getNodeChains(),
          flags = new Uint8Array(chains.length),
          arr = [];
      utils.forEach(chains, function(nextIdx, thisIdx) {
        var node, x, y, p;
        if (flags[thisIdx] == 1) return;
        p = getEndpoint(thisIdx);
        if (!p) return; // endpoints of an excluded arc
        node = {coordinates: p, arcs: []};
        arr.push(node);
        while (flags[thisIdx] != 1) {
          node.arcs.push(chainToArcId(thisIdx));
          flags[thisIdx] = 1;
          thisIdx = chains[thisIdx];
        }
      });
      return arr;
    };

    this.size = function() {
      return this.toArray().length;
    };

    this.findDanglingEndpoints = function() {
      var chains = getNodeChains(),
          arr = [], p;
      for (var i=0, n=chains.length; i<n; i++) {
        if (chains[i] != i) continue; // endpoint attaches to a node
        p = getEndpoint(i);
        if (!p) continue; // endpoint belongs to an excluded arc
        arr.push({
          point: p,
          arc: chainToArcId(i)
        });
      }
      return arr;
    };

    this.detachAcyclicArcs = function() {
      var chains = getNodeChains(),
          count = 0,
          fwd, rev;
      for (var i=0, n=chains.length; i<n; i+= 2) {
        fwd = i == chains[i];
        rev = i + 1 == chains[i + 1];
        // detach arcs that are disconnected at one end or the other
        if ((fwd || rev) && !linkIsDetached(i)) {
          this.detachArc(chainToArcId(i));
          count++;
        }
      }
      if (count > 0) {
        // removing one acyclic arc could expose another -- need another pass
        count += this.detachAcyclicArcs();
      }
      return count;
    };

    this.detachArc = function(arcId) {
      unlinkDirectedArc(arcId);
      unlinkDirectedArc(~arcId);
    };

    this.forEachConnectedArc = function(arcId, cb) {
      var nextId = nextConnectedArc(arcId),
          i = 0;
      while (nextId != arcId) {
        cb(nextId, i++);
        nextId = nextConnectedArc(nextId);
      }
    };

    // Receives an arc id for an arc that enters a node.
    // Returns an array of ids of all other arcs that are connected to the same node.
    //    Returned ids lead into the node (as opposed to outwards from it)
    // An optional filter function receives the directed id (positive or negative)
    //    of each connected arc and excludes arcs for which the filter returns false.
    //    The filter is also applied to the initial arc; if false, no arcs are returned.
    //
    this.getConnectedArcs = function(arcId, filter) {
      var ids = [];
      var filtered = !!filter;
      var nextId = nextConnectedArc(arcId);
      if (filtered && !filter(arcId)) {
        // return ids;
      }
      while (nextId != arcId) {
        if (!filtered || filter(nextId)) {
          ids.push(nextId);
        }
        nextId = nextConnectedArc(nextId);
      }
      return ids;
    };

    // Returns the id of the first identical arc or @arcId if none found
    // TODO: find a better function name
    this.findDuplicateArc = function(arcId) {
      var nextId = nextConnectedArc(arcId),
          match = arcId;
      while (nextId != arcId) {
        if (testArcMatch(arcId, nextId)) {
          if (absArcId(nextId) < absArcId(match)) match = nextId;
        }
        nextId = nextConnectedArc(nextId);
      }
      return match;
    };

    /**
     * FORESTAR:获取结束点
     * @param {*} chainId 
     */
    // returns null if link has been removed from node collection
    function getEndpoint(chainId) {
      return linkIsDetached(chainId) ? null : [nodeData.xx[chainId], nodeData.yy[chainId]];
    }

     /**
     * FORESTAR:linkIsDetached
     * @param {*} chainId 
     */
    function linkIsDetached(chainId) {
      return isNaN(nodeData.xx[chainId]);
    }

    /**
     * FORESTAR:unlinkDirectedArc
     * @param {*} chainId 
     */
    function unlinkDirectedArc(arcId) {
      var chainId = arcToChainId(arcId),
          chains = getNodeChains(),
          nextId = chains[chainId],
          prevId = prevChainId(chainId);
      nodeData.xx[chainId] = NaN;
      nodeData.yy[chainId] = NaN;
      chains[chainId] = chainId;
      chains[prevId] = nextId;
    }

    /**
     * FORESTAR: chainToArcId
     */
    function chainToArcId(chainId) {
      var absId = chainId >> 1;
      return chainId & 1 == 1 ? absId : ~absId;
    }

    /**
     * FORESTAR:arcToChainId
     * @param {*} arcId 
     */
    function arcToChainId(arcId) {
      var fw = arcId >= 0;
      return fw ? arcId * 2 + 1 : (~arcId) * 2; // if fw, use end, if rev, use start
    }

    /**
     * FORESTAR: 节点链
     */
    function getNodeChains() {
      if (!nodeData) {
        nodeData = findNodeTopology(arcs, filter);
        if (nn.length * 2 != nodeData.chains.length) error("[NodeCollection] count error");
      }
      return nodeData.chains;
    }

    function testArcMatch(a, b) {
      var absA = a >= 0 ? a : ~a,
          absB = b >= 0 ? b : ~b,
          lenA = nn[absA];
      if (lenA < 2) {
        // Don't throw error on collapsed arcs -- assume they will be handled
        //   appropriately downstream.
        // error("[testArcMatch() defective arc; len:", lenA);
        return false;
      }
      if (lenA != nn[absB]) return false;
      if (testVertexMatch(a, b, -1) &&
          testVertexMatch(a, b, 1) &&
          testVertexMatch(a, b, -2)) {
        return true;
      }
      return false;
    }

    function testVertexMatch(a, b, i) {
      var ai = arcs.indexOfVertex(a, i),
          bi = arcs.indexOfVertex(b, i);
      return xx[ai] == xx[bi] && yy[ai] == yy[bi];
    }

    // return arcId of next arc in the chain, pointed towards the shared vertex
    function nextConnectedArc(arcId) {
      var chainId = arcToChainId(arcId),
          chains =  getNodeChains(),
          nextChainId = chains[chainId];
      if (!(nextChainId >= 0 && nextChainId < chains.length)) {
        // console.log('arcId:', arcId, 'chainId:', chainId, 'next chain id:', nextChainId)
        error("out-of-range chain id");
      }
      return chainToArcId(nextChainId);
    }

    /**
     * FORESTAR: arcToChainId
     * @param {*} chainId 
     */
    function prevChainId(chainId) {
      var chains = getNodeChains(),
          prevId = chainId,
          nextId = chains[chainId];
      while (nextId != chainId) {
        prevId = nextId;
        nextId = chains[nextId];
        if (nextId == prevId) error("Node indexing error");
      }
      return prevId;
    }

    // expose functions for testing
    this.internal = {
      testArcMatch: testArcMatch,
      testVertexMatch: testVertexMatch
    };
  }

  /**
    * FORESTAR: findNodeTopology
    */
  function findNodeTopology(arcs, filter) {
    var n = arcs.size() * 2,
        xx2 = new Float64Array(n),
        yy2 = new Float64Array(n),
        ids2 = new Int32Array(n);

    arcs.forEach2(function(i, n, xx, yy, zz, arcId) {
      var start = i,
          end = i + n - 1,
          start2 = arcId * 2,
          end2 = start2 + 1,
          ax = xx[start],
          ay = yy[start],
          bx = xx[end],
          by = yy[end];
      if (filter && !filter(arcId)) {
        ax = ay = bx = by = NaN;
      }

      xx2[start2] = ax;
      yy2[start2] = ay;
      ids2[start2] = arcId;
      xx2[end2] = bx;
      yy2[end2] = by;
      ids2[end2] = arcId;
    });

    var chains = initPointChains(xx2, yy2);
    return {
      xx: xx2,
      yy: yy2,
      ids: ids2,
      chains: chains
    };
  }

  /**
   * FORESTAR:分解arcs 的dataset
   */
  // Dissolve arcs that can be merged without affecting topology of layers
  // remove arcs that are not referenced by any layer; remap arc ids
  // in layers. (dataset.arcs is replaced).
  function dissolveArcs(dataset) {
    var arcs = dataset.arcs,
        layers = dataset.layers.filter(layerHasPaths);

    if (!arcs || !layers.length) {
      dataset.arcs = null;
      return;
    }

    var arcsCanDissolve = getArcDissolveTest(layers, arcs),
        newArcs = [],
        totalPoints = 0,
        arcIndex = new Int32Array(arcs.size()), // maps old arc ids to new ids
        arcStatus = new Uint8Array(arcs.size());
        // arcStatus: 0 = unvisited, 1 = dropped, 2 = remapped, 3 = remapped + reversed
    layers.forEach(function(lyr) {
      // modify copies of the original shapes; original shapes should be unmodified
      // (need to test this)
      lyr.shapes = lyr.shapes.map(function(shape) {
        return editShapeParts(shape && shape.concat(), translatePath);
      });
    });
    dataset.arcs = dissolveArcCollection(arcs, newArcs, totalPoints);

    /**
     * FORESTAR:转化图形路径
     * 
     * @param {*} path 
     */
    function translatePath(path) {
      var pointCount = 0;
      var newPath = [];
      var newArc, arcId, absId, arcLen, fw, newArcId;

      for (var i=0, n=path.length; i<n; i++) {
        arcId = path[i];
        absId = absArcId(arcId);
        fw = arcId === absId;

        if (arcs.arcIsDegenerate(arcId)) {
          // arc has collapsed -- skip
        } else if (arcStatus[absId] !== 0) {
          // arc has already been translated -- skip
          newArc = null;
        } else {
          arcLen = arcs.getArcLength(arcId);

          if (newArc && arcsCanDissolve(path[i-1], arcId)) {
            if (arcLen > 0) {
              arcLen--; // shared endpoint not counted;
            }
            newArc.push(arcId);  // arc data is appended to previous arc
            arcStatus[absId] = 1; // arc is dropped from output
          } else {
            // start a new dissolved arc
            newArc = [arcId];
            arcIndex[absId] = newArcs.length;
            newArcs.push(newArc);
            arcStatus[absId] = fw ? 2 : 3; // 2: unchanged; 3: reversed
          }
          pointCount += arcLen;
        }

        if (arcStatus[absId] > 1) {
          // arc is retained (and renumbered) in the dissolved path -- add to path
          newArcId = arcIndex[absId];
          if (fw && arcStatus[absId] == 3 || !fw && arcStatus[absId] == 2) {
            newArcId = ~newArcId;
          }
          newPath.push(newArcId);
        }
      }
      totalPoints += pointCount;
      return newPath;
    }
  }

  /**
   * FORESTAR: 分解arc集合数据
   */
  function dissolveArcCollection(arcs, newArcs, newLen) {
    var nn2 = new Uint32Array(newArcs.length),
        xx2 = new Float64Array(newLen),
        yy2 = new Float64Array(newLen),
        src = arcs.getVertexData(),
        zz2 = src.zz ? new Float64Array(newLen) : null,
        interval = arcs.getRetainedInterval(),
        offs = 0;

    newArcs.forEach(function(newArc, newId) {
      newArc.forEach(function(oldId, i) {
        extendDissolvedArc(oldId, newId);
      });
    });

    return new ArcCollection(nn2, xx2, yy2).setThresholds(zz2).setRetainedInterval(interval);

    /**
     * FORESTAR: 扩展分解arc
     * @param {*} oldId 
     * @param {*} newId 
     */
    function extendDissolvedArc(oldId, newId) {
      var absId = absArcId(oldId),
          rev = oldId < 0,
          n = src.nn[absId],
          i = src.ii[absId],
          n2 = nn2[newId];

      if (n > 0) {
        if (n2 > 0) {
          n--;
          if (!rev) i++;
        }
        utils.copyElements(src.xx, i, xx2, offs, n, rev);
        utils.copyElements(src.yy, i, yy2, offs, n, rev);
        if (zz2) utils.copyElements(src.zz, i, zz2, offs, n, rev);
        nn2[newId] += n;
        offs += n;
      }
    }
  }

  /**
   * FORESTAR: 测试是否有两个arrs可以合并
   * @param {*} layers 
   * @param {*} arcs 
   */
  // Test whether two arcs can be merged together
  function getArcDissolveTest(layers, arcs) {
    var nodes = new NodeCollection(arcs, getArcPresenceTest2(layers, arcs)),
        // don't allow dissolving through endpoints of polyline paths
        lineLayers = layers.filter(function(lyr) {return lyr.geometry_type == 'polyline';}),
        testLineEndpoint = getPathEndpointTest(lineLayers, arcs),
        linkCount, lastId;

    return function(id1, id2) {
      if (id1 == id2 || id1 == ~id2) {
        verbose("Unexpected arc sequence:", id1, id2);
        return false; // This is unexpected; don't try to dissolve, anyway
      }
      linkCount = 0;
      nodes.forEachConnectedArc(id1, countLink);
      return linkCount == 1 && lastId == ~id2 && !testLineEndpoint(id1) && !testLineEndpoint(~id2);
    };

    function countLink(arcId, i) {
      linkCount++;
      lastId = arcId;
    }
  }

  var ArcDissolve = /*#__PURE__*/Object.freeze({
    __proto__: null,
    dissolveArcs: dissolveArcs,
    getArcDissolveTest: getArcDissolveTest
  });

  // utility functions for datasets

  /**
   * FORESTAR:分割数据集作为对应的图层
   * @param {*} dataset 
   */
  // Split into datasets with one layer each
  function splitDataset(dataset) {
    return dataset.layers.map(function(lyr) {
      var split = {
        arcs: dataset.arcs,
        layers: [lyr],
        info: dataset.info
      };
      dissolveArcs(split); // replace arcs with filtered + dissolved copy
      return split;
    });
  }

   /**
   * FORESTAR: 完整拷贝layers数据
   * @param {*} dataset 
   */
  // clone all layers, make a filtered copy of arcs
  function copyDataset(dataset) {
    var d2 = utils.extend({}, dataset);
    d2.layers = d2.layers.map(copyLayer);
    if (d2.arcs) {
      d2.arcs = d2.arcs.getFilteredCopy();
    }
    return d2;
  }

  /**
   * FORESTAR: 浅拷贝dataset的 coordinates数据
   * @param {*} dataset 
   */
  // clone coordinate data, shallow-copy attribute data
  function copyDatasetForExport(dataset) {
    var d2 = utils.extend({}, dataset);
    d2.layers = d2.layers.map(copyLayerShapes);
    if (d2.arcs) {
      d2.arcs = d2.arcs.getFilteredCopy();
    }
    return d2;
  }

  /**
   * FORESTAR：bom数据编码
   * @param {*} bytes 
   */
  //// TODO
  function detectEncodingFromBOM(bytes) {
    // utf8 EF BB BF
    // utf16be FE FF
    // utf16le FF FE
    var n = bytes.length;
    if (n >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF) return 'utf16be';
    if (n >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE) return 'utf16le';
    if (n >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF) return 'utf8';
    return '';
  }

  /**
   * FORESTAR: 导入dbf文件
   * 
   * @param {*} buf 
   * @param {*} o 
   */
  //// TODO
  function importDbfTable(buf, o) {
    var opts = o || {};
    return new ShapefileTable(buf, opts.encoding);
  }

  // Truncate and/or uniqify a name (if relevant params are present)
  function adjustFieldName(name, maxLen, i) {
    var name2, suff;
    maxLen = maxLen || 256;
    if (!i) {
      name2 = name.substr(0, maxLen);
    } else {
      suff = String(i);
      if (suff.length == 1) {
        suff = '_' + suff;
      }
      name2 = name.substr(0, maxLen - suff.length) + suff;
    }
    return name2;
  }

  function encodeString(str, enc) {
    // TODO: faster ascii encoding?
    var buf;
    if (encodingIsUtf8(enc)) {
      buf = toUtf8(str);
    } else {
      buf = iconv.encode(str, enc);
    }
    return buf;
  }

  // Truncate and/or uniqify a name (if relevant params are present)
  function adjustEncodedFieldName(name, maxLen, i, encoding) {
    var suff = i ? String(i) : '';
    var name2 = name + suff;
    var buf = encodeString(name2, encoding);
    if (buf.length > (maxLen || 256)) {
      name = name.substr(0, name.length - 1);
      return adjustEncodedFieldName(name, maxLen, i, encoding);
    }
    return name2;
  }

  // Resolve name conflicts in field names by appending numbers
  // @fields Array of field names
  // @maxLen (optional) Maximum chars in name
  //
  function getUniqFieldNames(fields, maxLen, encoding) {
    var used = {};
    return fields.map(function(name) {
      var i = 0,
          validName;
      do {
        validName = encoding && encoding != 'ascii' ?
            adjustEncodedFieldName(name, maxLen, i, encoding) :
            adjustFieldName(name, maxLen, i);
        i++;
      } while ((validName in used) ||
      // don't replace an existing valid field name with a truncated name
      name != validName && utils.contains(fields, validName));
      used[validName] = true;
      return validName;
    });
  }

  // cf. http://code.google.com/p/stringencoding/
  //
  // @src is a Buffer or ArrayBuffer or filename
  //
  function DbfReader(src, encodingArg) {
    if (utils.isString(src)) {
      error("[DbfReader] Expected a buffer, not a string");
    }
    var bin = new BinArray(src);
    var header = readHeader(bin);

    // encoding and fields are set on first access
    var fields;
    var encoding;

    this.size = function() {return header.recordCount;};

    this.readRow = function(i) {
      // create record reader on-the-fly
      // (delays encoding detection until we need to read data)
      return getRecordReader()(i);
    };

    this.getFields = getFieldNames;

    this.getBuffer = function() {return bin.buffer();};

    this.deleteField = function(f) {
      prepareToRead();
      fields = fields.filter(function(field) {
        return field.name != f;
      });
    };

    this.readRows = function() {
      var reader = getRecordReader();
      var data = [];
      for (var r=0, n=this.size(); r<n; r++) {
        data.push(reader(r));
      }
      return data;
    };

    // Prepare to read from table:
    // * determine encoding
    // * convert encoded field names to strings
    //   (DBF standard is ascii names, but ArcGIS etc. support encoded names)
    //
    function prepareToRead() {
      if (fields) return; // already initialized
      var headerEncoding = 'ascii';
      initEncoding();
      if (getNonAsciiHeaders().length > 0) {
        headerEncoding = getEncoding();
      }
      fields = header.fields.map(function(f) {
        var copy = utils.extend({}, f);
        copy.name = decodeString(f.namebuf, headerEncoding);
        return copy;
      });
      // Uniqify header names
      getUniqFieldNames(utils.pluck(fields, 'name')).forEach(function(name2, i) {
        fields[i].name = name2;
      });
    }

    function readHeader(bin) {
      bin.position(0).littleEndian();
      var header = {
        version: bin.readInt8(),
        updateYear: bin.readUint8(),
        updateMonth: bin.readUint8(),
        updateDay: bin.readUint8(),
        recordCount: bin.readUint32(),
        dataOffset: bin.readUint16(),
        recordSize: bin.readUint16(),
        incompleteTransaction: bin.skipBytes(2).readUint8(),
        encrypted: bin.readUint8(),
        mdx: bin.skipBytes(12).readUint8(),
        ldid: bin.readUint8()
      };
      var colOffs = 1; // first column starts on second byte of record
      var field;
      bin.skipBytes(2);
      header.fields = [];

      // Detect header terminator (LF is standard, CR has been seen in the wild)
      while (bin.peek() != 0x0D && bin.peek() != 0x0A && bin.position() < header.dataOffset - 1) {
        field = readFieldHeader(bin);
        field.columnOffset = colOffs;
        header.fields.push(field);
        colOffs += field.size;
      }
      if (colOffs != header.recordSize) {
        error("Record length mismatch; header:", header.recordSize, "detected:", colOffs);
      }
      if (bin.peek() != 0x0D) {
        message('Found a non-standard DBF header terminator (' + bin.peek() + '). DBF file may be corrupted.');
      }

      return header;
    }

    function readFieldHeader(bin) {
      var buf = utils.createBuffer(11);
      var chars = readStringBytes(bin, 11, buf);
      return {
        // name: bin.readCString(11),
        namebuf: utils.createBuffer(buf.slice(0, chars)),
        type: String.fromCharCode(bin.readUint8()),
        address: bin.readUint32(),
        size: bin.readUint8(),
        decimals: bin.readUint8(),
        id: bin.skipBytes(2).readUint8(),
        position: bin.skipBytes(2).readUint8(),
        indexFlag: bin.skipBytes(7).readUint8()
      };
    }

    function getFieldNames() {
      prepareToRead();
      return utils.pluck(fields, 'name');
    }

    function getRowOffset(r) {
      return header.dataOffset + header.recordSize * r;
    }

    function initEncoding() {
      encoding = encodingArg || findStringEncoding();
      if (!encoding) {
        // fall back to utf8 if detection fails (so GUI can continue without further errors)
        encoding = 'utf8';
        stop("Unable to auto-detect the text encoding of the DBF file.\n" + ENCODING_PROMPT);
      }
    }

    function getEncoding() {
      if (!encoding) initEncoding();
      return encoding;
    }

    // Create new record objects using object literal syntax
    // (Much faster in v8 and other engines than assigning a series of properties
    //  to an object)
    function getRecordConstructor() {
      var args = getFieldNames().map(function(name, i) {
        return JSON.stringify(name) + ': arguments[' + i + ']';
      });
      return new Function('return {' + args.join(',') + '};');
    }

    function findEofPos(bin) {
      var pos = bin.size() - 1;
      if (bin.peek(pos) != 0x1A) { // last byte may or may not be EOF
        pos++;
      }
      return pos;
    }

    function getRecordReader() {
      prepareToRead();
      var readers = fields.map(getFieldReader),
          eofOffs = findEofPos(bin),
          create = getRecordConstructor(),
          values = [];

      return function readRow(r) {
        var offs = getRowOffset(r),
            fieldOffs, field;
        for (var c=0, cols=fields.length; c<cols; c++) {
          field = fields[c];
          fieldOffs = offs + field.columnOffset;
          if (fieldOffs + field.size > eofOffs) {
            stop('Invalid DBF file: encountered end-of-file while reading data');
          }
          bin.position(fieldOffs);
          values[c] = readers[c](bin, field.size);
        }
        return create.apply(null, values);
      };
    }

    function bufferContainsHighBit(buf, n) {
      for (var i=0; i<n; i++) {
        if (buf[i] >= 128) return true;
      }
      return false;
    }

    // @f Field metadata from dbf header
    function getFieldReader(f) {
      var type = f.type,
          r = null;
      if (type == 'I') {
        r = readInt;
      } else if (type == 'F' || type == 'N') {
        r = getNumberReader();
      } else if (type == 'L') {
        r = readBool;
      } else if (type == 'D') {
        r = readDate;
      } else if (type == 'C') {
        r = getStringReader(getEncoding());
      } else {
        message("Field \"" + f.name + "\" has an unsupported type (" + f.type + ") -- converting to null values");
        r = function() {return null;};
      }
      return r;
    }

    function findStringEncoding() {
      var ldid = header.ldid,
          codepage = lookupCodePage(ldid),
          samples = getNonAsciiSamples(50),
          only7bit = samples.length === 0,
          encoding, msg;

      // First, check the ldid (language driver id) (an obsolete way to specify which
      // codepage to use for text encoding.)
      // ArcGIS up to v.10.1 sets ldid and encoding based on the 'locale' of the
      // user's Windows system :P
      //
      if (codepage && ldid != 87) {
        // if 8-bit data is found and codepage is detected, use the codepage,
        // except ldid 87, which some GIS software uses regardless of encoding.
        encoding = codepage;
      } else if (only7bit) {
        // Text with no 8-bit chars should be compatible with 7-bit ascii
        // (Most encodings are supersets of ascii)
        encoding = 'ascii';
      }

      // As a last resort, try to guess the encoding:
      if (!encoding) {
        encoding = detectEncoding(samples);
      }

      // Show a sample of decoded text if non-ascii-range text has been found
      if (encoding && samples.length > 0) {
        msg = decodeSamples(encoding, samples);
        msg = formatStringsAsGrid(msg.split('\n'));
        msg = "\nSample text containing non-ascii characters:" + (msg.length > 60 ? '\n' : '') + msg;
        msg = "Detected DBF text encoding: " + encoding + (encoding in encodingNames ? " (" + encodingNames[encoding] + ")" : "") + msg;
        message(msg);
      }
      return encoding;
    }

    function getNonAsciiHeaders() {
      var arr = [];
      header.fields.forEach(function(f) {
        if (bufferContainsHighBit(f.namebuf, f.namebuf.length)) {
          arr.push(f.namebuf);
        }
      });
      return arr;
    }

    // Return up to @size buffers containing text samples
    // with at least one byte outside the 7-bit ascii range.
    function getNonAsciiSamples(size) {
      var samples = [];
      var stringFields = header.fields.filter(function(f) {
        return f.type == 'C';
      });
      var buf = utils.createBuffer(256);
      var index = {};
      var f, chars, sample, hash;
      // include non-ascii field names, if any
      samples = getNonAsciiHeaders();
      for (var r=0, rows=header.recordCount; r<rows; r++) {
        for (var c=0, cols=stringFields.length; c<cols; c++) {
          if (samples.length >= size) break;
          f = stringFields[c];
          bin.position(getRowOffset(r) + f.columnOffset);
          chars = readStringBytes(bin, f.size, buf);
          if (chars > 0 && bufferContainsHighBit(buf, chars)) {
            sample = utils.createBuffer(buf.slice(0, chars)); //
            hash = sample.toString('hex');
            if (hash in index === false) { // avoid duplicate samples
              index[hash] = true;
              samples.push(sample);
            }
          }
        }
      }
      return samples;
    }
  }

  function lookupCodePage(lid) {
     var i = languageIds.indexOf(lid);
     return i == -1 ? null : languageIds[i+1];
  }

  function readStringBytes(bin, size, buf) {
    var start = bin.position();
    var count = 0, c;
    for (var i=0; i<size; i++) {
      c = bin.readUint8();
      // treating 0 as C-style string terminator (observed in-the-wild)
      // TODO: in some encodings (e.g. utf-16) the 0-byte occurs in other
      //   characters than the NULL character (ascii 0). The following code
      //   should be changed to support non-ascii-compatible encodings
      if (c === 0) break;
      if (count > 0 || c != 32) { // ignore leading spaces (e.g. DBF numbers)
        buf[count++] = c;
      }
    }
    // ignore trailing spaces (DBF string fields are typically r-padded w/ spaces)
    while (count > 0 && buf[count-1] == 32) {
      count--;
    }
    bin.position(start + size);
    return count;
  }

  function getStringReader(arg) {
    var encoding = arg || 'ascii';
    var slug = standardizeEncodingName(encoding);
    var buf = utils.createBuffer(256);
    var inNode = typeof module == 'object';

    // optimization -- use (fast) native Node conversion if available
    if (inNode && (slug == 'utf8' || slug == 'ascii')) {
      return function(bin, size) {
        var n = readStringBytes(bin, size, buf);
        return buf.toString(slug, 0, n);
      };
    }

    return function readEncodedString(bin, size) {
      var n = readStringBytes(bin, size, buf),
          str = '', i, c;
      // optimization: fall back to text decoder only if string contains non-ascii bytes
      // (data files of any encoding typically contain mostly ascii fields)
      // TODO: verify this assumption - some supported encodings may not be ascii-compatible
      for (i=0; i<n; i++) {
        c = buf[i];
        if (c > 127) {
          return bufferToString(buf, encoding, 0, n);
        }
        str += String.fromCharCode(c);
      }
      return str;
    };
  }

  function getNumberReader() {
      var read = getStringReader('ascii');
      return function readNumber(bin, size) {
        var str = read(bin, size);
        var val;
        if (str.indexOf(',') >= 0) {
          str = str.replace(',', '.'); // handle comma decimal separator
        }
        val = parseFloat(str);
        return isNaN(val) ? null : val;
      };
   }

  function readInt(bin, size) {
      return bin.readInt32();
  }

  function readBool(bin, size) {
      var c = bin.readCString(size),
          val = null;
      if (/[ty]/i.test(c)) val = true;
      else if (/[fn]/i.test(c)) val = false;
      return val;
   }

   function readDate(bin, size) {
      var str = bin.readCString(size),
          yr = str.substr(0, 4),
          mo = str.substr(4, 2),
          day = str.substr(6, 2);
      return new Date(Date.UTC(+yr, +mo - 1, +day));
  }

  function convertValueToString(s) {
    return s === undefined || s === null ? '' : String(s);
  }

  // Truncate and dedup field names
  //
  function convertFieldNames(names, encoding) {
    var names2 = getUniqFieldNames(names.map(cleanFieldName), 10, encoding);
    names2.forEach(function(name2, i) {
      if (names[i] != name2) {
        message('Changed field name from "' + names[i] + '" to "' + name2 + '"');
      }
    });
    return names2;
  }

  function discoverFieldType(arr, name) {
    var val;
    for (var i=0, n=arr.length; i<n; i++) {
      val = arr[i][name];
      if (utils.isString(val)) return "C";
      if (utils.isNumber(val)) return "N";
      if (utils.isBoolean(val)) return "L";
      if (val instanceof Date) return "D";
      if (val) return (typeof val);
    }
    return null;
  }

  function getDecimalFormatter(size, decimals) {
    // TODO: find better way to handle nulls
    var nullValue = ' '; // ArcGIS may use 0
    return function(val) {
      // TODO: handle invalid values better
      var valid = utils.isFiniteNumber(val),
          strval = valid ? val.toFixed(decimals) : String(nullValue);
      return utils.lpad(strval, size, ' ');
    };
  }

  function getNumericFieldInfo(arr, name) {
    var min = 0,
        max = 0,
        k = 1,
        power = 1,
        decimals = 0,
        eps = 1e-15,
        val;
    for (var i=0, n=arr.length; i<n; i++) {
      val = arr[i][name];
      if (!utils.isFiniteNumber(val)) {
        continue;
      }
      if (val < min || val > max) {
        if (val < min) min = val;
        if (val > max) max = val;
        while (Math.abs(val) >= power) {
          power *= 10;
          eps *= 10;
        }
      }
      while (Math.abs(Math.round(val * k) - val * k) > eps) {
        if (decimals == 15) { // dbf limit
          // TODO: round overflowing values ?
          break;
        }
        decimals++;
        eps *= 10;
        k *= 10;
      }
    }
    return {
      decimals: decimals,
      min: min,
      max: max
    };
  }

  // try to remove partial multi-byte characters from the end of an encoded string.
  function truncateEncodedString(buf, encoding, maxLen) {
    var truncated = buf.slice(0, maxLen);
    var len = maxLen;
    var tmp, str;
    while (len > 0 && len >= maxLen - 3) {
      tmp = len == maxLen ? truncated : buf.slice(0, len);
      str = decodeString(tmp, encoding);
      if (str.charAt(str.length-1) != '\ufffd') {
        truncated = tmp;
        break;
      }
      len--;
    }
    return truncated;
  }

  function initStringField(info, arr, name, encoding) {
    var formatter = encoding == 'ascii' ? encodeValueAsAscii : getStringWriterEncoded(encoding);
    var size = 0;
    var truncated = 0;
    var buffers = arr.map(function(rec) {
      var strval = convertValueToString(rec[name]);
      var buf = formatter(strval);
      if (buf.length > MAX_STRING_LEN) {
        if (encoding == 'ascii') {
          buf = buf.subarray(0, MAX_STRING_LEN);
        } else {
          buf = truncateEncodedString(buf, encoding, MAX_STRING_LEN);
        }
        truncated++;
      }
      size = Math.max(size, buf.length);
      return buf;
    });
    info.size = size;
    info.write = function(i, bin) {
      var buf = buffers[i],
          n = Math.min(size, buf.length),
          dest = bin._bytes,
          pos = bin.position(),
          j;
      for (j=0; j<n; j++) {
        dest[j + pos] = buf[j];
      }
      bin.position(pos + size);
    };
    if (truncated > 0) {
      info.warning = 'Truncated ' + truncated + ' string' + (truncated == 1 ? '' : 's') + ' to fit the 254-byte limit';
    }
  }

  function initNumericField(info, arr, name) {
    var MAX_FIELD_SIZE = 18,
        data, size;

    data = getNumericFieldInfo(arr, name);
    info.decimals = data.decimals;
    size = Math.max(data.max.toFixed(info.decimals).length,
        data.min.toFixed(info.decimals).length);
    if (size > MAX_FIELD_SIZE) {
      size = MAX_FIELD_SIZE;
      info.decimals -= size - MAX_FIELD_SIZE;
      if (info.decimals < 0) {
        error ("Dbf#getFieldInfo() Out-of-range error.");
      }
    }
    info.size = size;

    var formatter = getDecimalFormatter(size, info.decimals);
    info.write = function(i, bin) {
      var rec = arr[i],
          str = formatter(rec[name]);
      if (str.length < size) {
        str = utils.lpad(str, size, ' ');
      }
      bin.writeString(str, size);
    };
  }

  function initBooleanField(info, arr, name) {
    info.size = 1;
    info.write = function(i, bin) {
      var val = arr[i][name],
          c;
      if (val === true) c = 'T';
      else if (val === false) c = 'F';
      else c = '?';
      bin.writeString(c);
    };
  }

  function initDateField(info, arr, name) {
    info.size = 8;
    info.write = function(i, bin) {
      var d = arr[i][name],
          str;
      if (d instanceof Date === false) {
        str = '00000000';
      } else {
        str = utils.lpad(d.getUTCFullYear(), 4, '0') +
            utils.lpad(d.getUTCMonth() + 1, 2, '0') +
            utils.lpad(d.getUTCDate(), 2, '0');
      }
      bin.writeString(str);
    };
  }

  function getFieldInfo(arr, name, encoding) {
    var type = discoverFieldType(arr, name),
        info = {
          type: type,
          decimals: 0
        };
    if (type == 'N') {
      initNumericField(info, arr, name);
    } else if (type == 'C') {
      initStringField(info, arr, name, encoding);
    } else if (type == 'L') {
      initBooleanField(info, arr, name);
    } else if (type == 'D') {
      initDateField(info, arr, name);
    } else {
      // Treat null fields as empty numeric fields; this way, they will be imported
      // again as nulls.
      info.size = 0;
      info.type = 'N';
      if (type) {
        info.warning = 'Unable to export ' + type + '-type data, writing null values';
      }
      info.write = function() {};
    }
    return info;
  }

  function exportRecords(records, encoding, fieldOrder) {
    var rows = records.length;
    var fields = findFieldNames(records, fieldOrder);
    var dataEncoding = encoding || 'utf8';
    var headerEncoding = stringIsAscii(fields.join('')) ? 'ascii' : dataEncoding;
    var fieldNames = convertFieldNames(fields, headerEncoding);
    var fieldBuffers = encodeFieldNames(fieldNames, headerEncoding); // array of 11-byte buffers
    var fieldData = fields.map(function(name, i) {
      var info = getFieldInfo(records, name, dataEncoding);
      if (info.warning) {
        message('[' + name + '] ' + info.warning);
      }
      return info;
    });

    var headerBytes = getHeaderSize(fieldData.length),
        recordBytes = getRecordSize(utils.pluck(fieldData, 'size')),
        fileBytes = headerBytes + rows * recordBytes + 1;

    var buffer = new ArrayBuffer(fileBytes);
    var bin = new BinArray(buffer).littleEndian();
    var now = new Date();

    // write header
    bin.writeUint8(3);
    bin.writeUint8(now.getFullYear() - 1900);
    bin.writeUint8(now.getMonth() + 1);
    bin.writeUint8(now.getDate());
    bin.writeUint32(rows);
    bin.writeUint16(headerBytes);
    bin.writeUint16(recordBytes);
    bin.skipBytes(17);
    bin.writeUint8(0); // language flag; TODO: improve this
    bin.skipBytes(2);


    // field subrecords
    fieldData.reduce(function(recordOffset, obj, i) {
      // bin.writeCString(obj.name, 11);
      bin.writeBuffer(fieldBuffers[i], 11, 0);
      bin.writeUint8(obj.type.charCodeAt(0));
      bin.writeUint32(recordOffset);
      bin.writeUint8(obj.size);
      bin.writeUint8(obj.decimals);
      bin.skipBytes(14);
      return recordOffset + obj.size;
    }, 1);

    bin.writeUint8(0x0d); // "field descriptor terminator"
    if (bin.position() != headerBytes) {
      error("Dbf#exportRecords() header size mismatch; expected:", headerBytes, "written:", bin.position());
    }

    records.forEach(function(rec, i) {
      var start = bin.position();
      bin.writeUint8(0x20); // delete flag; 0x20 valid 0x2a deleted
      for (var j=0, n=fieldData.length; j<n; j++) {
        fieldData[j].write(i, bin);
      }
      if (bin.position() - start != recordBytes) {
        error("#exportRecords() Error exporting record:", rec);
      }
    });

    bin.writeUint8(0x1a); // end-of-file

    if (bin.position() != fileBytes) {
      error("Dbf#exportRecords() file size mismatch; expected:", fileBytes, "written:", bin.position());
    }
    return buffer;
  }

    // DBF format references:
    // http://www.dbf2002.com/dbf-file-format.html
    // http://www.digitalpreservation.gov/formats/fdd/fdd000325.shtml
    // http://www.clicketyclick.dk/databases/xbase/format/index.html
    // http://www.clicketyclick.dk/databases/xbase/format/data_types.html

    // source: http://webhelp.esri.com/arcpad/8.0/referenceguide/index.htm#locales/task_code.htm
  var languageIds = [0x01,'437',0x02,'850',0x03,'1252',0x08,'865',0x09,'437',0x0A,'850',0x0B,'437',0x0D,'437',0x0E,'850',0x0F,'437',0x10,'850',0x11,'437',0x12,'850',0x13,'932',0x14,'850',0x15,'437',0x16,'850',0x17,'865',0x18,'437',0x19,'437',0x1A,'850',0x1B,'437',0x1C,'863',0x1D,'850',0x1F,'852',0x22,'852',0x23,'852',0x24,'860',0x25,'850',0x26,'866',0x37,'850',0x40,'852',0x4D,'936',0x4E,'949',0x4F,'950',0x50,'874',0x57,'1252',0x58,'1252',0x59,'1252',0x64,'852',0x65,'866',0x66,'865',0x67,'861',0x6A,'737',0x6B,'857',0x6C,'863',0x78,'950',0x79,'949',0x7A,'936',0x7B,'932',0x7C,'874',0x86,'737',0x87,'852',0x88,'857',0xC8,'1250',0xC9,'1251',0xCA,'1254',0xCB,'1253',0xCC,'1257'];

  var Dbf = {};
  var MAX_STRING_LEN = 254;

  Dbf.MAX_STRING_LEN = MAX_STRING_LEN;
  Dbf.convertValueToString = convertValueToString;
  Dbf.convertFieldNames = convertFieldNames;
  Dbf.discoverFieldType = discoverFieldType;
  Dbf.getDecimalFormatter = getDecimalFormatter;
  Dbf.getNumericFieldInfo = getNumericFieldInfo;
  Dbf.truncateEncodedString = truncateEncodedString;
  Dbf.getFieldInfo = getFieldInfo;
  Dbf.exportRecords = exportRecords;


  /**
   * FORESTAR: ShapefileTable对象
   * @param {*} buf 
   * @param {*} encoding 
   */
  // Implements the DataTable api for DBF file data.
  // We avoid touching the raw DBF field data if possible. This way, we don't need
  // to parse the DBF at all in common cases, like importing a Shapefile, editing
  // just the shapes and exporting in Shapefile format.
  // TODO: consider accepting just the filename, so buffer doesn't consume memory needlessly.
  //
  // TODO
  function ShapefileTable(buf, encoding) {
    var reader = new DbfReader(buf, encoding),
        altered = false,
        table;

    function getTable() {
      if (!table) {
        // export DBF records on first table access
        table = new DataTable(reader.readRows());
        reader = null;
        buf = null; // null out references to DBF data for g.c.
      }
      return table;
    }

    this.exportAsDbf = function(opts) {
      // export original dbf bytes if possible, for performance
      var useOriginal = !!reader && !altered && !opts.field_order && !opts.encoding;
      if (useOriginal) return reader.getBuffer();
      return Dbf.exportRecords(getTable().getRecords(), opts.encoding, opts.field_order);
    };

    this.getReadOnlyRecordAt = function(i) {
      return reader ? reader.readRow(i) : table.getReadOnlyRecordAt(i);
    };

    this.deleteField = function(f) {
      if (table) {
        table.deleteField(f);
      } else {
        altered = true;
        reader.deleteField(f);
      }
    };

    this.getRecords = function() {
      return getTable().getRecords();
    };

    this.getFields = function() {
      return reader ? reader.getFields() : table.getFields();
    };

    this.isEmpty = function() {
      return reader ? this.size() === 0 : table.isEmpty();
    };

    this.size = function() {
      return reader ? reader.size() : table.size();
    };
  }

  Object.assign(ShapefileTable.prototype, DataTable.prototype);

  var DbfImport = /*#__PURE__*/Object.freeze({
    __proto__: null,
    importDbfTable: importDbfTable,
    ShapefileTable: ShapefileTable
  });

  var ShpType = {
    NULL: 0,
    POINT: 1,
    POLYLINE: 3,
    POLYGON: 5,
    MULTIPOINT: 8,
    POINTZ: 11,
    POLYLINEZ: 13,
    POLYGONZ: 15,
    MULTIPOINTZ: 18,
    POINTM: 21,
    POLYLINEM: 23,
    POLYGONM: 25,
    MULIPOINTM: 28,
    MULTIPATCH: 31 // not supported
  };

  ShpType.isPolygonType = function(t) {
    return t == 5 || t == 15 || t == 25;
  };

  ShpType.isPolylineType = function(t) {
    return t == 3 || t == 13 || t == 23;
  };

  ShpType.isMultiPartType = function(t) {
    return ShpType.isPolygonType(t) || ShpType.isPolylineType(t);
  };

  ShpType.isMultiPointType = function(t) {
    return t == 8 || t == 18 || t == 28;
  };

  ShpType.isZType = function(t) {
    return [11,13,15,18].includes(t);
  };

  ShpType.isMType = function(t) {
    return ShpType.isZType(t) || [21,23,25,28].includes(t);
  };

  ShpType.hasBounds = function(t) {
    return ShpType.isMultiPartType(t) || ShpType.isMultiPointType(t);
  };

  /**
   * FORESTAR: translateShapefileType(翻译shp文件类型)
   */
  function translateShapefileType(shpType) {
    if ([ShpType.POLYGON, ShpType.POLYGONM, ShpType.POLYGONZ].includes(shpType)) {
      return 'polygon';//面
    } else if ([ShpType.POLYLINE, ShpType.POLYLINEM, ShpType.POLYLINEZ].includes(shpType)) {
      return 'polyline';//线
    } else if ([ShpType.POINT, ShpType.POINTM, ShpType.POINTZ,
        ShpType.MULTIPOINT, ShpType.MULTIPOINTM, ShpType.MULTIPOINTZ].includes(shpType)) {
      return 'point';//点
    }
    return null;
  }

  /**
   * FORESTAR: 支持shapefile类型的值
   * 
   * @param {*} t 
   */
  function isSupportedShapefileType(t) {
    return [0,1,3,5,8,11,13,15,18,21,23,25,28].includes(t);
  }

  var ShpCommon = /*#__PURE__*/Object.freeze({
    __proto__: null,
    translateShapefileType: translateShapefileType,
    isSupportedShapefileType: isSupportedShapefileType
  });

  var NullRecord = function() {
    return {
      isNull: true,
      pointCount: 0,
      partCount: 0,
      byteLength: 12
    };
  };


  /**
   * FORESTAR: 替换文件扩展名
   * @param path
   * @param ext
   * @returns {string}
   */
  function replaceFileExtension(path, ext) {
    var info = parseLocalPath(path);
    return info.pathbase + '.' + ext;
  }

  /**
   * FORESTAR: 获取文件路径分隔符
   * @param path
   * @returns {string}
   */
  ////TODO
  function getPathSep(path) {
    // TODO: improve
    return path.indexOf('/') == -1 && path.indexOf('\\') != -1 ? '\\' : '/';
  }

  /**
   * FORESTAR: 解析文件本地路径
   * @param path
   */
  // Parse the path to a file without using Node
  // Assumes: not a directory path
  ////TODO
  function parseLocalPath(path) {
    var obj = {},
        sep = getPathSep(path),
        parts = path.split(sep),
        i;

    if (parts.length == 1) {
      obj.filename = parts[0];
      obj.directory = "";
    } else {
      obj.filename = parts.pop();
      obj.directory = parts.join(sep);
    }
    i = obj.filename.lastIndexOf('.');
    if (i > -1) {
      obj.extension = obj.filename.substr(i + 1);
      obj.basename = obj.filename.substr(0, i);
      obj.pathbase = path.substr(0, path.lastIndexOf('.'));
    } else {
      obj.extension = "";
      obj.basename = obj.filename;
      obj.pathbase = path;
    }
    return obj;
  }

  /**
   * FORESTAR: getFileBase（获取文件名）
   * @param path
   * @returns {*|string}
   */
  ////TODO
  function getFileBase(path) {
    return parseLocalPath(path).basename;
  }

  /**
   * FORESTAR: getFileExtension（获取文件扩展名）
   * @param path
   * @returns {*|string}
   */
  ////TODO
  function getFileExtension(path) {
    return parseLocalPath(path).extension;
  }

  /**
   * FORESTAR: getPathBase（获取文件基本路径）
   * @param path
   * @returns {*|string}
   */
  ////TODO
  function getPathBase(path) {
    return parseLocalPath(path).pathbase;
  }

  /**
   * FORESTAR: getOutputFileBase（获取公共文件名）
   * @param names
   * @returns {*}
   */
  function getCommonFileBase(names) {
    return names.reduce(function(memo, name, i) {
      if (i === 0) {
        memo = getFileBase(name);
      } else {
        memo = utils.mergeNames(memo, name);
      }
      return memo;
    }, "");
  }

  /**
   * FORESTAR: getOutputFileBase（文件输出基本路径）
   * @param dataset
   * @returns {*|Array|string}
   */
  function getOutputFileBase(dataset) {
    var inputFiles = dataset.info && dataset.info.input_files;
    return inputFiles && getCommonFileBase(inputFiles) || 'output';
  }

  var FilenameUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    /**
     * FORESTAR: replaceFileExtension（替换文件扩展名）
     */
    replaceFileExtension: replaceFileExtension,
    /**
     * FORESTAR: parseLocalPath（解析文件本地路径）
     */
    parseLocalPath: parseLocalPath,
    /**
     * FORESTAR: getFileBase（获取文件名）
     */
    getFileBase: getFileBase,
    /**
     * FORESTAR: getFileExtension（获取文件扩展名）
     */
    getFileExtension: getFileExtension,
    /**
     * FORESTAR: getPathBase（获取文件基础路径）
     */
    getPathBase: getPathBase,
    /**
     * FORESTAR: getCommonFileBase（获取公共文件名）
     */
    getCommonFileBase: getCommonFileBase,
    /**
     * FORESTAR: getOutputFileBase（获取文件输出路径）
     */
    getOutputFileBase: getOutputFileBase
  });

  /**
   * FORESTAR: readFirstChars（读取开始部分字符）
   * 
   * @param {*} reader 
   * @param {*} n 
   */
   //// TODO
  function readFirstChars(reader, n) {
    return bufferToString(reader.readSync(0, Math.min(n || 1000, reader.size())));
  }

  /**
   *
   * FORESTAR: BufferReader buffer读取工具类
   * @param src
   * @constructor
   */
  // Same interface as FileReader, for reading from a Buffer or ArrayBuffer instead of a file.
  //// TODO
  function BufferReader(src) {
    var bufSize = src.byteLength || src.length,
        binArr, buf;

    this.readToBinArray = function(start, length) {
      if (bufSize < start + length) error("Out-of-range error");
      if (!binArr) binArr = new BinArray(src);
      binArr.position(start);
      return binArr;
    };

    this.toString = function(enc) {
      return bufferToString(buffer(), enc);
    };

    this.readSync = function(start, length) {
      // TODO: consider using a default length like FileReader
      return buffer().slice(start, length || bufSize);
    };

    function buffer() {
      if (!buf) {
        buf = (src instanceof ArrayBuffer) ? utils.createBuffer(src) : src;
      }
      return buf;
    }

    this.findString = FileReader.prototype.findString;
    this.expandBuffer = function() {return this;};
    this.size = function() {return bufSize;};
    this.close = function() {};
  }

  /**
   * FORESTAR: FileReader文件读取对象
   * @param {*} path 
   * @param {*} opts 
   */
   //// TODO
  function FileReader(path, opts) {
    var fs = require('fs'),
        fileLen = fs.statSync(path).size,
        DEFAULT_CACHE_LEN = opts && opts.cacheSize || 0x1000000, // 16MB
        DEFAULT_BUFFER_LEN = opts && opts.bufferSize || 0x40000, // 256K
        fd, cacheOffs, cache, binArr;

    getStateVar('input_files').push(path); // bit of a kludge

    this.expandBuffer = function() {
      DEFAULT_BUFFER_LEN *= 2;
      return this;
    };

    // Read to BinArray (for compatibility with ShpReader)
    this.readToBinArray = function(start, length) {
      if (updateCache(start, length)) {
        binArr = new BinArray(cache);
      }
      binArr.position(start - cacheOffs);
      return binArr;
    };

    // Read to Buffer
    this.readSync = function(start, length) {
      if (length > 0 === false) {
        // use default (but variable) size if length is not specified
        length = DEFAULT_BUFFER_LEN;
        if (start + length > fileLen) {
          length = fileLen - start; // truncate at eof
        }
        if (length === 0) {
          return utils.createBuffer(0); // kludge to allow reading up to eof
        }
      }
      updateCache(start, length);
      return cache.slice(start - cacheOffs, start - cacheOffs + length);
    };

    this.size = function() {
      return fileLen;
    };

    this.toString = function(enc) {
      // TODO: use fd
      return cli.readFile(path, enc || 'utf8');
    };

    this.close = function() {
      if (fd) {
        fs.closeSync(fd);
        fd = null;
        cache = null;
      }
    };

    // Receive offset and length of byte string that must be read
    // Return true if cache was updated, or false
    function updateCache(fileOffs, bufLen) {
      var headroom = fileLen - fileOffs,
          bytesRead, bytesToRead;
      if (headroom < bufLen || headroom < 0) {
        error("Tried to read past end-of-file");
      }
      if (cache && fileOffs >= cacheOffs && cacheOffs + cache.length >= fileOffs + bufLen) {
        return false;
      }
      bytesToRead = Math.max(DEFAULT_CACHE_LEN, bufLen);
      if (headroom < bytesToRead) {
        bytesToRead = headroom;
      }
      if (!cache || bytesToRead != cache.length) {
        cache = utils.createBuffer(bytesToRead);
      }
      if (!fd) {
        fd = fs.openSync(path, 'r');
      }
      bytesRead = fs.readSync(fd, cache, 0, bytesToRead, fileOffs);
      cacheOffs = fileOffs;
      if (bytesRead != bytesToRead) error("Error reading file");
      return true;
    }
  }

  FileReader.prototype.findString = function (str, maxLen) {
    var len = Math.min(this.size(), maxLen || this.size());
    var buf = this.readSync(0, len);
    var strLen = str.length;
    var n = buf.length - strLen;
    var firstByte = str.charCodeAt(0);
    var i;
    for (i=0; i < n; i++) {
      if (buf[i] == firstByte && buf.toString('utf8', i, i + strLen) == str) {
        return {
          offset: i + strLen,
          text: buf.toString('utf8', 0, i)
        };
      }
    }
    return null;
  };

  var FileReader$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    readFirstChars: readFirstChars,
    // Reader2: Reader2,
    BufferReader: BufferReader,
    FileReader: FileReader
  });

  // Returns a constructor function for a shape record class with
  //   properties and methods for reading coordinate data.
  //
  // Record properties
  //   type, isNull, byteLength, pointCount, partCount (all types)
  //
  // Record methods
  //   read(), readPoints() (all types)
  //   readBounds(), readCoords()  (all but single point types)
  //   readPartSizes() (polygon and polyline types)
  //   readZBounds(), readZ() (Z types except POINTZ)
  //   readMBounds(), readM(), hasM() (M and Z types, except POINT[MZ])
  //
  function ShpRecordClass(type) {
    var hasBounds = ShpType.hasBounds(type),
        hasParts = ShpType.isMultiPartType(type),
        hasZ = ShpType.isZType(type),
        hasM = ShpType.isMType(type),
        singlePoint = !hasBounds,
        mzRangeBytes = singlePoint ? 0 : 16,
        constructor;

    if (type === 0) {
      return NullRecord;
    }

    // @bin is a BinArray set to the first data byte of a shape record
    constructor = function ShapeRecord(bin, bytes) {
      var pos = bin.position();
      this.id = bin.bigEndian().readUint32();
      this.type = bin.littleEndian().skipBytes(4).readUint32();
      if (this.type === 0) {
        return new NullRecord();
      }
      if (bytes > 0 !== true || (this.type != type && this.type !== 0)) {
        error("Unable to read a shape -- .shp file may be corrupted");
      }
      this.byteLength = bytes; // bin.readUint32() * 2 + 8; // bytes in content section + 8 header bytes
      if (singlePoint) {
        this.pointCount = 1;
        this.partCount = 1;
      } else {
        bin.skipBytes(32); // skip bbox
        this.partCount = hasParts ? bin.readUint32() : 1;
        this.pointCount = bin.readUint32();
      }
      this._data = function() {
        return bin.position(pos);
      };
    };

    // base prototype has methods shared by all Shapefile types except NULL type
    // (Type-specific methods are mixed in below)
    var proto = {
      // return offset of [x, y] point data in the record
      _xypos: function() {
        var offs = 12; // skip header & record type
        if (!singlePoint) offs += 4; // skip point count
        if (hasBounds) offs += 32;
        if (hasParts) offs += 4 * this.partCount + 4; // skip part count & index
        return offs;
      },

      readCoords: function() {
        if (this.pointCount === 0) return null;
        var partSizes = this.readPartSizes(),
            xy = this._data().skipBytes(this._xypos());

        return partSizes.map(function(pointCount) {
          return xy.readFloat64Array(pointCount * 2);
        });
      },

      readXY: function() {
        if (this.pointCount === 0) return new Float64Array(0);
        return this._data().skipBytes(this._xypos()).readFloat64Array(this.pointCount * 2);
      },

      readPoints: function() {
        var xy = this.readXY(),
            zz = hasZ ? this.readZ() : null,
            mm = hasM && this.hasM() ? this.readM() : null,
            points = [], p;

        for (var i=0, n=xy.length / 2; i<n; i++) {
          p = [xy[i*2], xy[i*2+1]];
          if (zz) p.push(zz[i]);
          if (mm) p.push(mm[i]);
          points.push(p);
        }
        return points;
      },

      // Return an array of point counts in each part
      // Parts containing zero points are skipped (Shapefiles with zero-point
      // parts are out-of-spec but exist in the wild).
      readPartSizes: function() {
        var sizes = [];
        var partLen, startId, bin;
        if (this.pointCount === 0) {
          // no parts
        } else if (this.partCount == 1) {
          // single-part type or multi-part type with one part
          sizes.push(this.pointCount);
        } else {
          // more than one part
          startId = 0;
          bin = this._data().skipBytes(56); // skip to second entry in part index
          for (var i=0, n=this.partCount; i<n; i++) {
            partLen = (i < n - 1 ? bin.readUint32() : this.pointCount) - startId;
            if (partLen > 0) {
              sizes.push(partLen);
              startId += partLen;
            }
          }
        }
        return sizes;
      }
    };

    var singlePointProto = {
      read: function() {
        var n = 2;
        if (hasZ) n++;
        if (this.hasM()) n++;
        return this._data().skipBytes(12).readFloat64Array(n);
      },

      stream: function(sink) {
        var src = this._data().skipBytes(12);
        sink.addPoint(src.readFloat64(), src.readFloat64());
        sink.endPath();
      }
    };

    var multiCoordProto = {
      readBounds: function() {
        return this._data().skipBytes(12).readFloat64Array(4);
      },

      stream: function(sink) {
        var sizes = this.readPartSizes(),
            xy = this.readXY(),
            i = 0, j = 0, n;
        while (i < sizes.length) {
          n = sizes[i];
          while (n-- > 0) {
            sink.addPoint(xy[j++], xy[j++]);
          }
          sink.endPath();
          i++;
        }
        if (xy.length != j) error('Counting error');
      },

      // TODO: consider switching to this simpler functino
      stream2: function(sink) {
        var sizes = this.readPartSizes(),
            bin = this._data().skipBytes(this._xypos()),
            i = 0, n;
        while (i < sizes.length) {
          n = sizes[i];
          while (n-- > 0) {
            sink.addPoint(bin.readFloat64(), bin.readFloat64());
          }
          sink.endPath();
          i++;
        }
      },

      read: function() {
        var parts = [],
            sizes = this.readPartSizes(),
            points = this.readPoints();
        for (var i=0, n = sizes.length - 1; i<n; i++) {
          parts.push(points.splice(0, sizes[i]));
        }
        parts.push(points);
        return parts;
      }
    };

    var mProto = {
      _mpos: function() {
        var pos = this._xypos() + this.pointCount * 16;
        if (hasZ) {
          pos += this.pointCount * 8 + mzRangeBytes;
        }
        return pos;
      },

      readMBounds: function() {
        return this.hasM() ? this._data().skipBytes(this._mpos()).readFloat64Array(2) : null;
      },

      // TODO: group into parts, like readCoords()
      readM: function() {
        return this.hasM() ? this._data().skipBytes(this._mpos() + mzRangeBytes).readFloat64Array(this.pointCount) : null;
      },

      // Test if this record contains M data
      // (according to the Shapefile spec, M data is optional in a record)
      //
      hasM: function() {
        var bytesWithoutM = this._mpos(),
            bytesWithM = bytesWithoutM + this.pointCount * 8 + mzRangeBytes;
        if (this.byteLength == bytesWithoutM) {
          return false;
        } else if (this.byteLength == bytesWithM) {
          return true;
        } else {
          error("#hasM() Counting error");
        }
      }
    };

    var zProto = {
      _zpos: function() {
        return this._xypos() + this.pointCount * 16;
      },

      readZBounds: function() {
        return this._data().skipBytes(this._zpos()).readFloat64Array(2);
      },

      // TODO: group into parts, like readCoords()
      readZ: function() {
        return this._data().skipBytes(this._zpos() + mzRangeBytes).readFloat64Array(this.pointCount);
      }
    };

    if (singlePoint) {
      Object.assign(proto, singlePointProto);
    } else {
      Object.assign(proto, multiCoordProto);
    }
    if (hasZ) Object.assign(proto, zProto);
    if (hasM) Object.assign(proto, mProto);

    constructor.prototype = proto;
    proto.constructor = constructor;
    return constructor;
  }

  /**
   * FORESTAR: ShpReader （shp文件读取类）
   * @param {*} shpSrc 
   * @param {*} shxSrc 
   */
  // Read data from a .shp file
  // @src is an ArrayBuffer, Node.js Buffer or filename
  //
  //    // Example: iterating using #nextShape()
  //    var reader = new ShpReader(buf), s;
  //    while (s = reader.nextShape()) {
  //      // process the raw coordinate data yourself...
  //      var coords = s.readCoords(); // [[x,y,x,y,...], ...] Array of parts
  //      var zdata = s.readZ();  // [z,z,...]
  //      var mdata = s.readM();  // [m,m,...] or null
  //      // .. or read the shape into nested arrays
  //      var data = s.read();
  //    }
  //
  //    // Example: reading records using a callback
  //    var reader = new ShpReader(buf);
  //    reader.forEachShape(function(s) {
  //      var data = s.read();
  //    });
  //
  //// TODO
  function ShpReader(shpSrc, shxSrc) {
    if (this instanceof ShpReader === false) {
      return new ShpReader(shpSrc, shxSrc);
    }

    var shapeObjects=[];// 存储图形数据
    var shpFile = utils.isString(shpSrc) ? new FileReader(shpSrc) : new BufferReader(shpSrc);
    var header = parseHeader(shpFile.readToBinArray(0, 100));
    var shpSize = shpFile.size();
    var RecordClass = new ShpRecordClass(header.type);
    var shpOffset, recordCount, skippedBytes;
    var shxBin, shxFile;

    if (shxSrc) {
      shxFile = utils.isString(shxSrc) ? new FileReader(shxSrc) : new BufferReader(shxSrc);
      shxBin = shxFile.readToBinArray(0, shxFile.size()).bigEndian();
    }

    reset();

    this.getShapeObjects = function(){
      return shapeObjects;
    }

    this.header = function() {
      return header;
    };

    this.header = function() {
      return header;
    };

    // Callback interface: for each record in a .shp file, pass a
    //   record object to a callback function
    //
    this.forEachShape = function(callback) {
      var shape = this.nextShape();
      while (shape) {
        callback(shape);
        shape = this.nextShape();
      }
    };

    // Iterator interface for reading shape records
    this.nextShape = function() {
      var shape = readNextShape();
      if (!shape) {
        if (skippedBytes > 0) {
          // Encountered in files from natural earth v2.0.0:
          // ne_10m_admin_0_boundary_lines_land.shp
          // ne_110m_admin_0_scale_rank.shp
          verbose("Skipped over " + skippedBytes + " non-data bytes in the .shp file.");
        }
        shpFile.close();
        reset();
      }
      if(shape){
        shapeObjects.push({id:shape.id,type:shape.type,partCount:shape.partCount,pointCount:shape.pointCount,coordinates:JSON.stringify(shape.readPoints())});
      }
      return shape;
    };

    function readNextShape() {
      var expectedId = recordCount + 1; // Shapefile ids are 1-based
      var shape, offset;
      if (done()) return null;
      if (shxBin) {
        shxBin.position(100 + recordCount * 8);
        offset = shxBin.readUint32() * 2;
        if (offset > shpOffset) {
          skippedBytes += offset - shpOffset;
        }
      } else {
        offset = shpOffset;
      }
      shape = readShapeAtOffset(offset);
      if (!shape) {
        // Some in-the-wild .shp files contain junk bytes between records. This
        // is a problem if the .shx index file is not present.
        // Here, we try to scan past the junk to find the next record.
        shape = huntForNextShape(offset, expectedId);
      }
      if (shape) {
        if (shape.id < expectedId) {
          message("Found a Shapefile record with the same id as a previous record (" + shape.id + ") -- skipping.");
          return readNextShape();
        } else if (shape.id > expectedId) {
          stop("Shapefile contains an out-of-sequence record. Possible data corruption -- bailing.");
        }
        recordCount++;
      }
      return shape || null;
    }

    function done() {
      if (shxFile && shxFile.size() <= 100 + recordCount * 8) return true;
      if (shpOffset + 12 > shpSize) return true;
      return false;
    }

    function reset() {
      shpOffset = 100;
      skippedBytes = 0;
      recordCount = 0;
    }

    function parseHeader(bin) {
      var header = {
        signature: bin.bigEndian().readUint32(),
        byteLength: bin.skipBytes(20).readUint32() * 2,
        version: bin.littleEndian().readUint32(),
        type: bin.readUint32(),
        bounds: bin.readFloat64Array(4), // xmin, ymin, xmax, ymax
        zbounds: bin.readFloat64Array(2),
        mbounds: bin.readFloat64Array(2)
      };

      if (header.signature != 9994) {
        error("Not a valid .shp file");
      }

      if (!isSupportedShapefileType(header.type)) {
        error("Unsupported .shp type:", header.type);
      }

      if (header.byteLength != shpFile.size()) {
        error("File size of .shp doesn't match size in header");
      }

      return header;
    }

    function readShapeAtOffset(offset) {
      var shape = null,
          recordSize, recordType, recordId, goodSize, goodType, bin;

      if (offset + 12 <= shpSize) {
        bin = shpFile.readToBinArray(offset, 12);
        recordId = bin.bigEndian().readUint32();
        // record size is bytes in content section + 8 header bytes
        recordSize = bin.readUint32() * 2 + 8;
        recordType = bin.littleEndian().readUint32();
        goodSize = offset + recordSize <= shpSize && recordSize >= 12;
        goodType = recordType === 0 || recordType == header.type;
        if (goodSize && goodType) {
          bin = shpFile.readToBinArray(offset, recordSize);
          shape = new RecordClass(bin, recordSize);
          shpOffset = offset + shape.byteLength; // advance read position
        }
      }
      return shape;
    }

    // TODO: add tests
    // Try to scan past unreadable content to find next record
    function huntForNextShape(start, id) {
      var offset = start + 4,
          shape = null,
          bin, recordId, recordType, count;
      while (offset + 12 <= shpSize) {
        bin = shpFile.readToBinArray(offset, 12);
        recordId = bin.bigEndian().readUint32();
        recordType = bin.littleEndian().skipBytes(4).readUint32();
        if (recordId == id && (recordType == header.type || recordType === 0)) {
          // we have a likely position, but may still be unparsable
          shape = readShapeAtOffset(offset);
          break;
        }
        offset += 4; // try next integer position
      }
      count = shape ? offset - start : shpSize - start;
      // debug('Skipped', count, 'bytes', shape ? 'before record ' + id : 'at the end of the file');
      skippedBytes += count;
      return shape;
    }
  }

  ShpReader.prototype.type = function() {
    return this.header().type;
  };

  ShpReader.prototype.getCounts = function() {
    var counts = {
      nullCount: 0,
      partCount: 0,
      shapeCount: 0,
      pointCount: 0
    };
    this.forEachShape(function(shp) {
      if (shp.isNull) counts.nullCount++;
      counts.pointCount += shp.pointCount;
      counts.partCount += shp.partCount;
      counts.shapeCount++;
    });
    return counts;
  };

  /**
   * FORESTAR: parseMeasure（解析计算）
   * @param m
   */
  // throws an error if measure is non-parsable
  function parseMeasure(m) {
    var o = parseMeasure2(m);
    if (isNaN(o.value)) {
      stop('Invalid parameter:', m);
    }
    return o;
  }

  /**
   * FORESTAR: parseMeasure2（解析计算）
   * @param m
   */
  // returns NaN value if value is non-parsable
  function parseMeasure2(m) {
    var s = utils.isString(m) ? m : '';
    var match = /(sq|)([a-z]+)(2|)$/i.exec(s); // units rxp
    var o = {};
    if (utils.isNumber(m)) {
      o.value = m;
    } else if (s === '') {
      o.value = NaN;
    } else if (match) {
      o.units = UNITS_LOOKUP[match[2].toLowerCase()];
      o.areal = !!(match[1] || match[3]);
      o.value = Number(s.substring(0, s.length - match[0].length));
      if (!o.units && !isNaN(o.value)) {
        // throw error if string contains a number followed by unrecognized units string
        stop('Unknown units: ' + match[0]);
      }
    } else {
      o.value = Number(s);
    }
    return o;
  }

  /**
   * FORESTAR: 转换参数
   * @param opt
   * @param crs
   * @returns {number}
   */
  // Same as convertDistanceParam(), except:
  //   in the case of latlong datasets, coordinates are unitless (instead of meters),
  //   and parameters with units trigger an error
   //// TODO
  function convertIntervalParam(opt, crs) {
    var o = parseMeasure(opt);
    var k = getIntervalConversionFactor(o.units, crs);
    if (o.units && crs && crs.is_latlong) {
      stop('Parameter does not support distance units with latlong datasets');
    }
    if (o.areal) {
      stop('Expected a distance, received an area:', opt);
    }
    return o.value * k;
  }

  var Units = /*#__PURE__*/Object.freeze({
    __proto__: null,
    // getIntervalConversionFactor: getIntervalConversionFactor,
    parseMeasure: parseMeasure,
    parseMeasure2: parseMeasure2,
    // convertAreaParam: convertAreaParam,
    // convertDistanceParam: convertDistanceParam,
    convertIntervalParam: convertIntervalParam,
    // convertIntervalPair: convertIntervalPair,
    // convertFourSides: convertFourSides,
    // getAreaLabel: getAreaLabel
  });

  /**
   * FORESTAR:获取round值函数
   * 
   * @param {*} inc  
   */
  // inc: Rounding incrememnt (e.g. 0.001 rounds to thousandths)
  //// TODO
  function getRoundingFunction(inc) {
    if (!utils.isNumber(inc) || inc === 0) {
      error("Rounding increment must be a non-zero number.");
    }
    var inv = 1 / inc;
    if (inv > 1) inv = Math.round(inv);
    return function(x) {
      return Math.round(x * inv) / inv;
      // these alternatives show rounding error after JSON.stringify()
      // return Math.round(x / inc) / inv;
      // return Math.round(x / inc) * inc;
      // return Math.round(x * inv) * inc;
    };
  }

  // function roundToSignificantDigits(n, d) {
  //   return +n.toPrecision(d);
  // }

  var Rounding = /*#__PURE__*/Object.freeze({
    __proto__: null,
   /* getBoundsPrecisionForDisplay: getBoundsPrecisionForDisplay,
    getRoundedCoordString: getRoundedCoordString,
    getRoundedCoords: getRoundedCoords,
    roundPoints: roundPoints,
    setCoordinatePrecision: setCoordinatePrecision,*/
    getRoundingFunction: getRoundingFunction,
    /*roundToSignificantDigits: roundToSignificantDigits*/
  });

  // function snapCoords(arcs, threshold) {
  //   var avgDist = getAvgSegment(arcs),
  //       autoSnapDist = avgDist * 0.0025,
  //       snapDist = autoSnapDist;
  //
  //   if (threshold > 0) {
  //     snapDist = threshold;
  //     message(utils.format("Applying snapping threshold of %s -- %.6f times avg. segment length", threshold, threshold / avgDist));
  //   }
  //   var snapCount = snapCoordsByInterval(arcs, snapDist);
  //   if (snapCount > 0) arcs.dedupCoords();
  //   message(utils.format("Snapped %s point%s", snapCount, utils.pluralSuffix(snapCount)));
  // }

  /**
   * FORESTAR: 导入后清除路径
   * @param dataset
   * @param opts
   */
  // Apply snapping, remove duplicate coords and clean up defective paths in a dataset
  // Assumes that any CRS info has been added to the dataset
  // @opts: import options
   //// TODO
  function cleanPathsAfterImport(dataset, opts) {
   /* var arcs = dataset.arcs;
    var snapDist;
    if (opts.snap || opts.auto_snap || opts.snap_interval) { // auto_snap is older name
      if (opts.snap_interval) {
        snapDist = convertIntervalParam(opts.snap_interval, getDatasetCRS(dataset));
      }
      if (arcs) {
        snapCoords(arcs, snapDist);
      }
    }
    dataset.layers.forEach(function(lyr) {
      if (layerHasPaths(lyr)) {
        cleanShapes(lyr.shapes, arcs, lyr.geometry_type);
      }
    });*/
  }

  // // Clean polygon or polyline shapes (in-place)
  // //
  // function cleanShapes(shapes, arcs, type) {
  //   for (var i=0, n=shapes.length; i<n; i++) {
  //     shapes[i] = cleanShape(shapes[i], arcs, type);
  //   }
  // }
  //
  // // Remove defective arcs and zero-area polygon rings
  // // Remove simple polygon spikes of form: [..., id, ~id, ...]
  // // Don't remove duplicate points
  // // Don't check winding order of polygon rings
  // function cleanShape(shape, arcs, type) {
  //   return editShapeParts(shape, function(path) {
  //     var cleaned = cleanPath(path, arcs);
  //     if (type == 'polygon' && cleaned) {
  //       removeSpikesInPath(cleaned); // assumed by addIntersectionCuts()
  //       if (geom.getPlanarPathArea(cleaned, arcs) === 0) {
  //         cleaned = null;
  //       }
  //     }
  //     return cleaned;
  //   });
  // }
  //
  // function cleanPath(path, arcs) {
  //   var nulls = 0;
  //   for (var i=0, n=path.length; i<n; i++) {
  //     if (arcs.arcIsDegenerate(path[i])) {
  //       nulls++;
  //       path[i] = null;
  //     }
  //   }
  //   return nulls > 0 ? path.filter(function(id) {return id !== null;}) : path;
  // }


  // Remove pairs of ids where id[n] == ~id[n+1] or id[0] == ~id[n-1];
  // (in place)
  function removeSpikesInPath(ids) {
    var n = ids.length;
    if (n >= 2) {
      if (ids[0] == ~ids[n-1]) {
        ids.pop();
        ids.shift();
      } else {
        for (var i=1; i<n; i++) {
          if (ids[i-1] == ~ids[i]) {
            ids.splice(i-1, 2);
            break;
          }
        }
      }
      if (ids.length < n) {
        removeSpikesInPath(ids);
      }
    }
  }

  // function pointHasValidCoords(p) {
  //   // The Shapefile spec states that "measures" less then -1e38 indicate null values
  //   // This should not apply to coordinate data, but in-the-wild Shapefiles have been
  //   // seen with large negative values indicating null coordinates.
  //   // This test catches these and also NaNs, but does not detect other kinds of
  //   // invalid coords
  //   return p[0] > -1e38 && p[1] > -1e38;
  // }

  /**
   * FORESTAR: PathImportStream 图形导入流对象
   * @param {*} drain 
   */
  // Accumulates points in buffers until #endPath() is called
  // @drain callback: function(xarr, yarr, size) {}
  //
  function PathImportStream(drain) {
    var buflen = 10000,
        xx = new Float64Array(buflen),
        yy = new Float64Array(buflen),
        i = 0;

    /**
     * 结束点标记
     */
    this.endPath = function() {
      drain(xx, yy, i);
      i = 0;
    };

     /**
      * 点添加
      */
    this.addPoint = function(x, y) {
      if (i >= buflen) {
        buflen = Math.ceil(buflen * 1.3);
        xx = utils.extendBuffer(xx, buflen);
        yy = utils.extendBuffer(yy, buflen);
      }
      xx[i] = x;
      yy[i] = y;
      i++;
    };
  }

  /**
   * FORESTAR: PathImporter路径导入对象
   * @param {*} opts 
   */
  // Import path data from a non-topological source (Shapefile, GeoJSON, etc)
  // in preparation for identifying topology.
  // @opts.reserved_points -- estimate of points in dataset, for pre-allocating buffers
  //// TODO
  function PathImporter(opts) {
    var bufSize = opts.reserved_points > 0 ? opts.reserved_points : 20000,
        xx = new Float64Array(bufSize),
        yy = new Float64Array(bufSize),
        /**
         * FORESTAR: 用于记录核心shape对象
         */
        shapeObjects = [],
        shapes = [],
        properties = [],
        /**
         * FORESTAR: 多部分分段数据
         */
        nn = [],
        types = [],
        collectionType = opts.type || null, // possible values: polygon, polyline, point
        round = null,
        pathId = -1,
        shapeId = -1,
        pointId = 0,
        dupeCount = 0,
        openRingCount = 0;

    if (opts.precision) {
      round = getRoundingFunction(opts.precision);
    }

    // mix in #addPoint() and #endPath() methods
    utils.extend(this, new PathImportStream(importPathCoords));

    /**
     * FORESTAR: 设置shape设置(扩展)
     */
    this.setShapeObjects = function(shapesData){
      shapeObjects = shapesData;
    }

    /**
     * FORESTAR: 获取shape设置(扩展)
     */
    this.getShapeObjects=function(){
      return shapeObjects;
    }

    /**
     * FORESTAR: 开始shape设置
     */
    this.startShape = function(d) {
      shapes[++shapeId] = null;
      if (d) properties[shapeId] = d;
    };

    /**
     * FORESTAR: 导入线
     */
    this.importLine = function(points) {
      if (points.length < 2) {
        verbose("Skipping a defective line");
        return;
      }
      setShapeType('polyline');
      this.importPath(points);
    };

    /**
     * FORESTAR: 导入点
     */
    this.importPoints = function(points) {
      setShapeType('point');
      points = points.filter(pointHasValidCoords);
      if (round) {
        points.forEach(function(p) {
          p[0] = round(p[0]);
          p[1] = round(p[1]);
        });
      }
      points.forEach(appendToShape);
    };

    /**
     * FORESTAR: 导入闭合图形(面)
     */
    this.importRing = function(points, isHole) {
      var area = geom.getPlanarPathArea2(points);
      if (!area || points.length < 4) {
        verbose("Skipping a defective ring");
        return;
      }
      setShapeType('polygon');
      if (isHole === true && area > 0 || isHole === false && area < 0) {
        // GeoJSON rings may be either direction -- no point in logging reversal
        // verbose("Reversing", isHole ? "a CW hole" : "a CCW ring");
        points.reverse();
      }
      this.importPath(points);
    };

    /**
     * FORESTAR: 导入路径
     */
    // Import an array of [x, y] Points
    this.importPath = function importPath(points) {
      var p;
      for (var i=0, n=points.length; i<n; i++) {
        p = points[i];
        this.addPoint(p[0], p[1]);
      }
      this.endPath();
    };

    // Return imported dataset
    // Apply any requested snapping and rounding
    // Remove duplicate points, check for ring inversions
    //
    this.done = function() {
      var that = this;
      var arcs;
      var layers;
      var lyr = {name: ''};
      var snapDist;

      if (dupeCount > 0) {
        // 去掉重复点
        verbose(utils.format("Removed %,d duplicate point%s", dupeCount, utils.pluralSuffix(dupeCount)));
      }
      if (openRingCount > 0) {
        // 关闭polygon实现闭合图形
        message(utils.format("Closed %,d open polygon ring%s", openRingCount, utils.pluralSuffix(openRingCount)));
      }
      if (pointId > 0) {
         if (pointId < xx.length) {
          xx = xx.subarray(0, pointId);
          yy = yy.subarray(0, pointId);
        }
        arcs = new ArcCollection(nn, xx, yy);

        //if (opts.snap || opts.auto_snap || opts.snap_interval) { // auto_snap is older name
        //  internal.snapCoords(arcs, opts.snap_interval);
        //}
      }

      if (collectionType == 'mixed') {
        layers = divideFeaturesByType(shapes, properties, types);

      } else {
        lyr = {geometry_type: collectionType};
        if (collectionType) {
          lyr.shapes = shapes;
        }
        if (properties.length > 0) {
          lyr.data = new DataTable(properties);
        }
        layers = [lyr];
      }

      layers.forEach(function(lyr) {
        //if (internal.layerHasPaths(lyr)) {
          //internal.cleanShapes(lyr.shapes, arcs, lyr.geometry_type);
        //}
        if (lyr.data) {
          // 修复不一致属性字段
          fixInconsistentFields(lyr.data.getRecords());
        }
      });

      return {
        // 返回shap支持的类型
        ShpType: ShpType,
        // 返回shape可解析对象
        shapeObjects: that.getShapeObjects(),
        arcs: arcs || null,
        info: {},
        layers: layers
      };
    };

    /**
     * FORESTAR：设置shape类型
     * @param {s} t 
     */
    function setShapeType(t) {
      var currType = shapeId < types.length ? types[shapeId] : null;
      if (!currType) {
        types[shapeId] = t;
        if (!collectionType) {
          collectionType = t;
        } else if (t != collectionType) {
          collectionType = 'mixed';
        }
      } else if (currType != t) {
        stop("Unable to import mixed-geometry GeoJSON features");
      }
    }

    function checkBuffers(needed) {
      if (needed > xx.length) {
        var newLen = Math.max(needed, Math.ceil(xx.length * 1.5));
        xx = utils.extendBuffer(xx, newLen, pointId);
        yy = utils.extendBuffer(yy, newLen, pointId);
      }
    }

    /**
     * FORESTAR: 追加部分到shape
     * @param {*} part 
     */
    function appendToShape(part) {
      var currShape = shapes[shapeId] || (shapes[shapeId] = []);
      currShape.push(part);
    }

    /**
     * FORESTAR: 追加路径点
     * @param {*} n 
     */
    function appendPath(n) {
      pathId++;
      nn[pathId] = n;
      appendToShape([pathId]);
    }

    /**
     * FORESTAR: 导入轨迹点
     * @param {*} xsrc 
     * @param {*} ysrc 
     * @param {*} n 
     */
    function importPathCoords(xsrc, ysrc, n) {
      var count = 0;
      var x, y, prevX, prevY;
      checkBuffers(pointId + n);
      for (var i=0; i<n; i++) {
        x = xsrc[i];
        y = ysrc[i];
        if (round) {
          x = round(x);
          y = round(y);
        }
        if (i > 0 && x == prevX && y == prevY) {
          dupeCount++;
        } else {
          xx[pointId] = x;
          yy[pointId] = y;
          pointId++;
          count++;
        }
        prevY = y;
        prevX = x;
      }

      // check for open rings
      if (collectionType == 'polygon' && count > 0) {
        if (xsrc[0] != xsrc[n-1] || ysrc[0] != ysrc[n-1]) {
          checkBuffers(pointId + 1);
          xx[pointId] = xsrc[0];
          yy[pointId] = ysrc[0];
          openRingCount++;
          pointId++;
          count++;
        }
      }

      appendPath(count);
    }
  }

  var PathImport = /*#__PURE__*/Object.freeze({
    __proto__: null,
    cleanPathsAfterImport: cleanPathsAfterImport,
    /*pointHasValidCoords: pointHasValidCoords,*/
    PathImporter: PathImporter
  });

  /**
   * FORESTAR: importShp （导入shp文件）
   * @param {*} shp 
   * @param {*} shx 
   * @param {*} opts 
   */
  // Read Shapefile data from a file, ArrayBuffer or Buffer
  // @shp, @shx: filename or buffer
  //// TODO
  function importShp(shp, shx, opts) {
    var reader = new ShpReader(shp, shx),
        shpType = reader.type(),
        type = translateShapefileType(shpType),
        importOpts = utils.defaults({
          type: type,
          reserved_points: Math.round(reader.header().byteLength / 16)
        }, opts),
        importer = new PathImporter(importOpts);

    if (!isSupportedShapefileType(shpType)) {
      stop("Unsupported Shapefile type:", shpType);
    }
    if (ShpType.isZType(shpType)) {
      message("Warning: Shapefile Z data will be lost.");
    } else if (ShpType.isMType(shpType)) {
      message("Warning: Shapefile M data will be lost.");
    }

    // TODO: test cases: null shape; non-null shape with no valid parts
    reader.forEachShape(function(shp) {
      importer.startShape();
      if (shp.isNull) {
        // skip
      } else if (type == 'point') {
        importer.importPoints(shp.readPoints());
      } else {
        shp.stream(importer);
        // shp.stream2(importer);
      }
    });
    var shapeObjects = reader.getShapeObjects();
    importer.setShapeObjects(shapeObjects);
    return importer.done();
  }

  var ShpImport = /*#__PURE__*/Object.freeze({
    __proto__: null,
    importShp: importShp
  });

  /**
   * FORESTAR: 输入文件类型判定
   * @param file
   * @returns {*}
   */
  // Guess the type of a data file from file extension, or return null if not sure
  //// TODO
  function guessInputFileType(file) {
    var ext = getFileExtension(file || '').toLowerCase(),
        type = null;
    if (ext == 'dbf' || ext == 'shp' || ext == 'prj' || ext == 'shx') {
      type = ext;
    } else if (/json$/.test(ext)) {
      type = 'json';
    } else if (ext == 'csv' || ext == 'tsv' || ext == 'txt' || ext == 'tab') {
      type = 'text';
    }
    return type;
  }

  /**
   * FORESTAR: 判定输入文件内容类型
   * @param content
   * @returns {string}
   */
  ////TODO
  function guessInputContentType(content) {
    var type = null;
    if (utils.isString(content)) {
      type = stringLooksLikeJSON(content) ? 'json' : 'text';
    } else if (utils.isObject(content) && content.type || utils.isArray(content)) {
      type = 'json';
    }
    return type;
  }

  /**
   * FORESTAR: 判定输入文件类型
   * @param file
   * @param content
   * @returns {string}
   */
  ////TODO
  function guessInputType(file, content) {
    return guessInputFileType(file) || guessInputContentType(content);
  }

  /**
   * FORESTAR: stringLooksLikeJSON（字符串类型匹配）
   * @param str
   * @returns {boolean}
   */
  function stringLooksLikeJSON(str) {
    return /^\s*[{[]/.test(String(str));
  }

  /**
   * FORESTAR: couldBeDsvFile（是否可作为dsv文件）
   * @param name
   * @returns {boolean}
   */
  ////TODO
  function couldBeDsvFile(name) {
    var ext = getFileExtension(name).toLowerCase();
    return /csv|tsv|txt$/.test(ext);
  }

  /**
   *  FORESTAR: isZipFile（是否zip压缩文件）
   * @param file
   * @returns {boolean}
   */
  ////TODO
  function isZipFile(file) {
    return /\.zip$/i.test(file);
  }

  // function isSupportedOutputFormat(fmt) {
  //   var types = ['geojson', 'topojson', 'json', 'dsv', 'dbf', 'shapefile', 'svg'];
  //   return types.indexOf(fmt) > -1;
  // }

  // function getFormatName(fmt) {
  //   return {
  //     geojson: 'GeoJSON',
  //     topojson: 'TopoJSON',
  //     json: 'JSON records',
  //     dsv: 'CSV',
  //     dbf: 'DBF',
  //     shapefile: 'Shapefile',
  //     svg: 'SVG'
  //   }[fmt] || '';
  // }

  /**
   * FORESTAR: isSupportedBinaryInputType（是否支持二进制输入文件）
   * @param path
   * @returns {boolean}
   */
  // Assumes file at @path is one of Mapshaper's supported file types
  ////TODO
  function isSupportedBinaryInputType(path) {
    var ext = getFileExtension(path).toLowerCase();
    return ext == 'shp' || ext == 'shx' || ext == 'dbf'; // GUI also supports zip files
  }

  // // Detect extensions of some unsupported file types, for cmd line validation
  // function filenameIsUnsupportedOutputType(file) {
  //   var rxp = /\.(shx|prj|xls|xlsx|gdb|sbn|sbx|xml|kml)$/i;
  //   return rxp.test(file);
  // }

  /**
   * FORESTAR: 文件类型
   *
   * @type {Readonly<{guessInputFileType: (function(*=): *), __proto__: null, isZipFile: (function(*=): boolean), guessInputContentType: (function(*=): *), getFormatName: (function(*): (*|string)), guessInputType: (function(*=, *=): (string|string)), isSupportedOutputFormat: (function(*=): boolean), stringLooksLikeJSON: (function(*=): boolean), isSupportedBinaryInputType: (function(*=): boolean), filenameIsUnsupportedOutputType: (function(*=): boolean), couldBeDsvFile: (function(*=): boolean)}>}
   */
  var FileTypes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    /**
     * FORESTAR: guessInputFileType（验证导入文件类型）
     */
    guessInputFileType: guessInputFileType,
    /**
     * FORESTAR: guessInputContentType（验证导入文件内容类型）
     */
    guessInputContentType: guessInputContentType,
    /**
     * FORESTAR: guessInputType（验证导入类型）
     */
    guessInputType: guessInputType,
    /**
     * FORESTAR: stringLooksLikeJSON（字符串模糊匹配）
     */
    stringLooksLikeJSON: stringLooksLikeJSON,
    /**
     * FORESTAR: couldBeDsvFile（是否可作为dsv文件）
     */
    couldBeDsvFile: couldBeDsvFile,
    /**
     * FORESTAR: isZipFile（是否zip压缩文件）
     */
    isZipFile: isZipFile,
    // isSupportedOutputFormat: isSupportedOutputFormat,
    // getFormatName: getFormatName,
    /**
     * FORESTAR: isSupportedBinaryInputType（是否支持二进制输入文件）
     */
    isSupportedBinaryInputType: isSupportedBinaryInputType,
    // filenameIsUnsupportedOutputType: filenameIsUnsupportedOutputType
  });

  function buffersAreIdentical(a, b) {
    var alen = BinArray.bufferSize(a);
    var blen = BinArray.bufferSize(b);
    if (alen != blen) {
      return false;
    }
    for (var i=0; i<alen; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  // Wrapper for DataView class for more convenient reading and writing of
  //   binary data; Remembers endianness and read/write position.
  // Has convenience methods for copying from buffers, etc.
  //
  function BinArray(buf, le) {
    if (utils.isNumber(buf)) {
      buf = new ArrayBuffer(buf);
    } else if (typeof Buffer == 'function' && buf instanceof Buffer) {
      // Since node 0.10, DataView constructor doesn't accept Buffers,
      //   so need to copy Buffer to ArrayBuffer
      buf = BinArray.toArrayBuffer(buf);
    }
    if (buf instanceof ArrayBuffer == false) {
      error("BinArray constructor takes an integer, ArrayBuffer or Buffer argument");
    }
    this._buffer = buf;
    this._bytes = new Uint8Array(buf);
    this._view = new DataView(buf);
    this._idx = 0;
    this._le = le !== false;
  }

  BinArray.bufferToUintArray = function(buf, wordLen) {
    if (wordLen == 4) return new Uint32Array(buf);
    if (wordLen == 2) return new Uint16Array(buf);
    if (wordLen == 1) return new Uint8Array(buf);
    error("BinArray.bufferToUintArray() invalid word length:", wordLen);
  };

  BinArray.uintSize = function(i) {
    return i & 1 || i & 2 || 4;
  };

  BinArray.bufferCopy = function(dest, destId, src, srcId, bytes) {
    srcId = srcId || 0;
    bytes = bytes || src.byteLength - srcId;
    if (dest.byteLength - destId < bytes)
      error("Buffer overflow; tried to write:", bytes);

    // When possible, copy buffer data in multi-byte chunks... Added this for faster copying of
    // shapefile data, which is aligned to 32 bits.
    var wordSize = Math.min(BinArray.uintSize(bytes), BinArray.uintSize(srcId),
        BinArray.uintSize(dest.byteLength), BinArray.uintSize(destId),
        BinArray.uintSize(src.byteLength));

    var srcArr = BinArray.bufferToUintArray(src, wordSize),
        destArr = BinArray.bufferToUintArray(dest, wordSize),
        count = bytes / wordSize,
        i = srcId / wordSize,
        j = destId / wordSize;

    while (count--) {
      destArr[j++] = srcArr[i++];
    }
    return bytes;
  };

  BinArray.toArrayBuffer = function(src) {
    var n = src.length,
        dest = new ArrayBuffer(n),
        view = new Uint8Array(dest);
    for (var i=0; i<n; i++) {
      view[i] = src[i];
    }
    return dest;
  };

  // Return length in bytes of an ArrayBuffer or Buffer
  //
  BinArray.bufferSize = function(buf) {
    return (buf instanceof ArrayBuffer ?  buf.byteLength : buf.length | 0);
  };

  BinArray.prototype = {
    size: function() {
      return this._buffer.byteLength;
    },

    littleEndian: function() {
      this._le = true;
      return this;
    },

    bigEndian: function() {
      this._le = false;
      return this;
    },

    buffer: function() {
      return this._buffer;
    },

    bytesLeft: function() {
      return this._buffer.byteLength - this._idx;
    },

    skipBytes: function(bytes) {
      this._idx += (bytes + 0);
      return this;
    },

    readUint8: function() {
      return this._bytes[this._idx++];
    },

    writeUint8: function(val) {
      this._bytes[this._idx++] = val;
      return this;
    },

    readInt8: function() {
      return this._view.getInt8(this._idx++);
    },

    writeInt8: function(val) {
      this._view.setInt8(this._idx++, val);
      return this;
    },

    readUint16: function() {
      var val = this._view.getUint16(this._idx, this._le);
      this._idx += 2;
      return val;
    },

    writeUint16: function(val) {
      this._view.setUint16(this._idx, val, this._le);
      this._idx += 2;
      return this;
    },

    readUint32: function() {
      var val = this._view.getUint32(this._idx, this._le);
      this._idx += 4;
      return val;
    },

    writeUint32: function(val) {
      this._view.setUint32(this._idx, val, this._le);
      this._idx += 4;
      return this;
    },

    readInt32: function() {
      var val = this._view.getInt32(this._idx, this._le);
      this._idx += 4;
      return val;
    },

    writeInt32: function(val) {
      this._view.setInt32(this._idx, val, this._le);
      this._idx += 4;
      return this;
    },

    readFloat64: function() {
      var val = this._view.getFloat64(this._idx, this._le);
      this._idx += 8;
      return val;
    },

    writeFloat64: function(val) {
      this._view.setFloat64(this._idx, val, this._le);
      this._idx += 8;
      return this;
    },

    // Returns a Float64Array containing @len doubles
    //
    readFloat64Array: function(len) {
      var bytes = len * 8,
          i = this._idx,
          buf = this._buffer,
          arr;
      // Inconsistent: first is a view, second a copy...
      if (i % 8 === 0) {
        arr = new Float64Array(buf, i, len);
      } else if (buf.slice) {
        arr = new Float64Array(buf.slice(i, i + bytes));
      } else { // ie10, etc
        var dest = new ArrayBuffer(bytes);
        BinArray.bufferCopy(dest, 0, buf, i, bytes);
        arr = new Float64Array(dest);
      }
      this._idx += bytes;
      return arr;
    },

    readUint32Array: function(len) {
      var arr = [];
      for (var i=0; i<len; i++) {
        arr.push(this.readUint32());
      }
      return arr;
    },

    peek: function(i) {
      return this._view.getUint8(i >= 0 ? i : this._idx);
    },

    position: function(i) {
      if (i != null) {
        this._idx = i;
        return this;
      }
      return this._idx;
    },

    readCString: function(fixedLen, asciiOnly) {
      var str = "",
          count = fixedLen >= 0 ? fixedLen : this.bytesLeft();
      while (count > 0) {
        var byteVal = this.readUint8();
        count--;
        if (byteVal == 0) {
          break;
        } else if (byteVal > 127 && asciiOnly) {
          str = null;
          break;
        }
        str += String.fromCharCode(byteVal);
      }

      if (fixedLen > 0 && count > 0) {
        this.skipBytes(count);
      }
      return str;
    },

    writeString: function(str, maxLen) {
      var bytesWritten = 0,
          charsToWrite = str.length,
          cval;
      if (maxLen) {
        charsToWrite = Math.min(charsToWrite, maxLen);
      }
      for (var i=0; i<charsToWrite; i++) {
        cval = str.charCodeAt(i);
        if (cval > 127) {
          // Unicode value beyond ascii range
          cval = '?'.charCodeAt(0);
        }
        this.writeUint8(cval);
        bytesWritten++;
      }
      return bytesWritten;
    },

    writeCString: function(str, fixedLen) {
      var maxChars = fixedLen ? fixedLen - 1 : null,
          bytesWritten = this.writeString(str, maxChars);

      this.writeUint8(0); // terminator
      bytesWritten++;

      if (fixedLen) {
        while (bytesWritten < fixedLen) {
          this.writeUint8(0);
          bytesWritten++;
        }
      }
      return this;
    },

    writeBuffer: function(buf, bytes, startIdx) {
      this._idx += BinArray.bufferCopy(this._buffer, this._idx, buf, startIdx, bytes);
      return this;
    }
  };

  var BinArray$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    buffersAreIdentical: buffersAreIdentical,
    BinArray: BinArray
  });


  function simplifyArcsFast(arcs, dist) {
    var xx = [],
        yy = [],
        nn = [],
        count;
    for (var i=0, n=arcs.size(); i<n; i++) {
      count = simplifyPathFast([i], arcs, dist, xx, yy);
      if (count == 1) {
        count = 0;
        xx.pop();
        yy.pop();
      }
      nn.push(count);
    }
    return new ArcCollection(nn, xx, yy);
  }

  function simplifyPolygonFast(shp, arcs, dist) {
    if (!shp || !dist) return null;
    var xx = [],
        yy = [],
        nn = [],
        shp2 = [];

    shp.forEach(function(path) {
      var count = simplifyPathFast(path, arcs, dist, xx, yy);
      while (count < 4 && count > 0) {
        xx.pop();
        yy.pop();
        count--;
      }
      if (count > 0) {
        shp2.push([nn.length]);
        nn.push(count);
      }
    });
    return {
      shape: shp2.length > 0 ? shp2 : null,
      arcs: new ArcCollection(nn, xx, yy)
    };
  }


  var SimplifyFast = /*#__PURE__*/Object.freeze({
    __proto__: null,
    simplifyArcsFast: simplifyArcsFast,
    simplifyPolygonFast: simplifyPolygonFast
  });


  /**
   * FORESTAR: dsv文件导入
   * @param {*} data 
   * @param {*} opts 
   */
  // Convert a string, buffer or file containing delimited text into a dataset obj.
  //// TODO
  function importDelim2(data, opts) {

    // TODO: remove duplication with importJSON()
    var readFromFile = !data.content && data.content !== '',
        content = data.content,
        filter, reader, records, delimiter, table, encoding;
    opts = opts || {};

    // // read content of all but very large files into a buffer
    // if (readFromFile && cli.fileSize(data.filename) < 2e9) {
    //   content = cli.readFile(data.filename);
    //   readFromFile = false;
    // }

    if (readFromFile) {
      reader = new FileReader(data.filename);
    } else if (content instanceof ArrayBuffer || content instanceof Buffer) {
      // Web API may import as ArrayBuffer, to support larger files
      reader = new BufferReader(content);
      content = null;
    } else if (utils.isString(content)) {
      // import as string
    } else {
      error("Unexpected object type");
    }

    if (reader) {
      encoding = detectEncodingFromBOM(reader.readSync(0, Math.min(reader.size(), 3)));
      // Files in some encodings have to be converted to strings before parsing
      // Other encodings are similar enough to ascii that CSV can be parsed
      // byte-by-byte.
      if (encoding == 'utf16be' || encoding == 'utf16le') {
        content = trimBOM(reader.toString(encoding));
        reader = null;
      } else if (opts.encoding && !encodingIsAsciiCompat(opts.encoding)) {
        content = reader.toString(opts.encoding);
        reader = null;
      }
    }

    if (reader) {
      delimiter = guessDelimiter(readFirstChars(reader, 2000));
      records = readDelimRecords(reader, delimiter, opts);
    } else {
      delimiter = guessDelimiter(content);
      records = readDelimRecordsFromString(content, delimiter, opts);
    }
    if (records.length === 0) {
      message("Unable to read any data records");
    }
    adjustRecordTypes(records, opts);
    table = new DataTable(records);
    deleteFields(table, isInvalidFieldName);
    return {
      layers: [{data: table}],
      info: {input_delimiter: delimiter}
    };
  }


  /**
   * FORESTAR: 识别为JSON字符串
   * @param {*} str 
   * @param {*} opts 
   */
  // Identify JSON type from the initial subset of a JSON string
  //// TODO
  function identifyJSONString(str, opts) {
    var maxChars = 1000;
    var fmt = null;
    if (str.length > maxChars) str = str.substr(0, maxChars);
    str = str.replace(/\s/g, '');
    if (opts && opts.json_path) {
      fmt = 'json'; // TODO: make json_path compatible with other types
    } else if (/^\[[{\]]/.test(str)) {
      // empty array or array of objects
      fmt = 'json';
    } else if (/"arcs":\[|"objects":\{|"transform":\{/.test(str)) {
      fmt =  'topojson';
    } else if (/^\{"/.test(str)) {
      fmt = 'geojson';
    }
    return fmt;
  }

  /**
   * FORESTAR: 识别为JSON对象
   * @param {*} o
   */
  function identifyJSONObject(o) {
    var fmt = null;
    if (!o) {
      //
    } else if (o.type == 'Topology') {
      fmt = 'topojson';
    } else if (o.type) {
      fmt = 'geojson';
    } else if (utils.isArray(o)) {
      fmt = 'json';
    }
    return fmt;
  }

  /**
   * FORESTAR: 导入geoJSON文件
   * @param {*} fileReader 
   * @param {*} opts 
   */
   //// TODO
  function importGeoJSONFile(fileReader, opts) {
    var importer = new GeoJSONParser(opts);
    new GeoJSONReader(fileReader).readObjects(importer.parseObject);
    return importer.done();
  }

  /**
   * FORESTAR: readJSONFile（读取geojson）
   *
   * @param reader
   * @param opts
   * @returns {{content: string}|{format: string, dataset: *}}
   */
  // Parse GeoJSON directly from a binary data source (supports parsing larger files
  // than the maximum JS string length) or return a string with the entire
  // contents of the file.
  // reader: a binary file reader
   //// TODO
  function readJSONFile(reader, opts) {
    var str = readFirstChars(reader, 1000);
    var type = identifyJSONString(str, opts);
    var dataset, retn;
    if (type == 'geojson') { // consider only for larger files
      dataset = importGeoJSONFile(reader, opts);
      retn = {
        dataset: dataset,
        format: 'geojson'
      };
    } else {
      retn = {
        // content: cli.readFile(path, 'utf8')}
        content: reader.toString('utf8')
      };
    }
    reader.close();
    return retn;
  }

  /**
   * FORESTAR: importJSON （导入JSON）
   * @param {*} data 
   * @param {*} opts 
   */
   //// TODO
  function importJSON(data, opts) {
    var content = data.content,
        filename = data.filename,
        retn = {filename: filename},
        reader, fmt;

    if (!content) {
      reader = new FileReader(filename);
    } else if (content instanceof ArrayBuffer) {
      // Web API imports JSON as ArrayBuffer, to support larger files
      if (content.byteLength < 1e7) {
        // content = utils.createBuffer(content).toString();
        content = bufferToString(utils.createBuffer(content));
      } else {
        reader = new BufferReader(content);
        content = null;
      }
    }

    if (reader) {
      data = readJSONFile(reader, opts);
      if (data.dataset) {
        retn.dataset = data.dataset;
        retn.format = data.format;
      } else {
        content = data.content;
      }
    }

    if (content) {
      if (utils.isString(content)) {
        try {
          content = JSON.parse(content); // ~3sec for 100MB string
        } catch(e) {
          // stop("Unable to parse JSON");
          stop('JSON parsing error --', e.message);
        }
      }
      if (opts.json_path) {
        content = selectFromObject(content, opts.json_path);
        fmt = identifyJSONObject(content, opts);
        if (!fmt) {
          stop('Unexpected object type at JSON path:', opts.json_path);
        }
      } else {
        fmt = identifyJSONObject(content, opts);
      }
      if (fmt == 'topojson') {
        retn.dataset = importTopoJSON(content, opts);
      } else if (fmt == 'geojson') {
        retn.dataset = importGeoJSON(content, opts);
      } else if (fmt == 'json') {
        retn.dataset = importJSONTable(content, opts);
      } else {
        stop("Unknown JSON format");
      }
      retn.format = fmt;
    }

    return retn;
  }

  // path: path from top-level to the target object
  function selectFromObject(o, path) {
    var arrayRxp = /(.*)\[([0-9]+)\]$/; // array bracket notation w/ index
    var separator = path.indexOf('/') > 0 ? '/' : '.';
    var parts = path.split(separator);
    var subpath, array, match;
    while (parts.length > 0) {
      subpath = parts.shift();
      match = arrayRxp.exec(subpath);
      if (match) {
        array = o[match[1]];
        o = array && array[+match[2]] || null;
      } else {
        o = o[subpath];
      }
      if (!o) return null;
    }
    return o;
  }

  var JsonImport = /*#__PURE__*/Object.freeze({
    __proto__: null,
    identifyJSONString: identifyJSONString,
    identifyJSONObject: identifyJSONObject,
    importGeoJSONFile: importGeoJSONFile,
    importJSON: importJSON
  });

  // Used for building topology
  //
  function ArcIndex(pointCount) {
    var hashTableSize = Math.floor(pointCount * 0.25 + 1),
        hash = getXYHash(hashTableSize),
        hashTable = new Int32Array(hashTableSize),
        chainIds = [],
        arcs = [],
        arcPoints = 0;

    utils.initializeArray(hashTable, -1);

    this.addArc = function(xx, yy) {
      var end = xx.length - 1,
          key = hash(xx[end], yy[end]),
          chainId = hashTable[key],
          arcId = arcs.length;
      hashTable[key] = arcId;
      arcs.push([xx, yy]);
      arcPoints += xx.length;
      chainIds.push(chainId);
      return arcId;
    };

     /**
     * FORESTAR: 查找重复的arc
     */
    // Look for a previously generated arc with the same sequence of coords, but in the
    // opposite direction. (This program uses the convention of CW for space-enclosing rings, CCW for holes,
    // so coincident boundaries should contain the same points in reverse sequence).
    //
    this.findDuplicateArc = function(xx, yy, start, end, getNext, getPrev) {
      // First, look for a reverse match
      var arcId = findArcNeighbor(xx, yy, start, end, getNext);
      if (arcId === null) {
        // Look for forward match
        // (Abnormal topology, but we're accepting it because in-the-wild
        // Shapefiles sometimes have duplicate paths)
        arcId = findArcNeighbor(xx, yy, end, start, getPrev);
      } else {
        arcId = ~arcId;
      }
      return arcId;
    };

     /**
     * FORESTAR: 查找相邻的arc
     */
    function findArcNeighbor(xx, yy, start, end, getNext) {
      var next = getNext(start),
          key = hash(xx[start], yy[start]),
          arcId = hashTable[key],
          arcX, arcY, len;

      while (arcId != -1) {
        // check endpoints and one segment...
        // it would be more rigorous but slower to identify a match
        // by comparing all segments in the coordinate sequence
        arcX = arcs[arcId][0];
        arcY = arcs[arcId][1];
        len = arcX.length;
        if (arcX[0] === xx[end] && arcX[len-1] === xx[start] && arcX[len-2] === xx[next] &&
            arcY[0] === yy[end] && arcY[len-1] === yy[start] && arcY[len-2] === yy[next]) {
          return arcId;
        }
        arcId = chainIds[arcId];
      }
      return null;
    }

    this.getVertexData = function() {
      var xx = new Float64Array(arcPoints),
          yy = new Float64Array(arcPoints),
          nn = new Uint32Array(arcs.length),
          copied = 0,
          arc, len;
      for (var i=0, n=arcs.length; i<n; i++) {
        arc = arcs[i];
        len = arc[0].length;
        utils.copyElements(arc[0], 0, xx, copied, len);
        utils.copyElements(arc[1], 0, yy, copied, len);
        nn[i] = len;
        copied += len;
      }
      return {
        xx: xx,
        yy: yy,
        nn: nn
      };
    };
  }

  /**
   * FORESTAR: 线面转为拓扑结构数据
   * @param dataset
   */
  // Converts all polygon and polyline paths in a dataset to a topological format
  // (in-place)
  //// TODO
  function buildTopology(dataset) {
    if (!dataset.arcs) return;
    var raw = dataset.arcs.getVertexData(),
        cooked = buildPathTopology(raw.nn, raw.xx, raw.yy);
    dataset.arcs.updateVertexData(cooked.nn, cooked.xx, cooked.yy);
    dataset.layers.forEach(function(lyr) {
      if (lyr.geometry_type == 'polyline' || lyr.geometry_type == 'polygon') {
        lyr.shapes = replaceArcIds(lyr.shapes, cooked.paths);
      }
    });
  }

  // buildPathTopology() converts non-topological paths into
  // a topological format
  //
  // Arguments:
  //    xx: [Array|Float64Array],   // x coords of each point in the dataset
  //    yy: [Array|Float64Array],   // y coords ...
  //    nn: [Array]  // length of each path
  //
  // (x- and y-coords of all paths are concatenated into two arrays)
  //
  // Returns:
  // {
  //    xx, yy (array)   // coordinate data
  //    nn: (array)      // points in each arc
  //    paths: (array)   // Paths are arrays of one or more arc id.
  // }
  //
  // Negative arc ids in the paths array indicate a reversal of arc -(id + 1)
  //
  /**
   * FORESTAR: 构建路径拓扑结构
   * @param nn
   * @param xx
   * @param yy
   * @returns {{xx, yy, nn}}
   */
  //// TODO
  function buildPathTopology(nn, xx, yy) {
    var pointCount = xx.length,
        chainIds = initPointChains(xx, yy),
        pathIds = initPathIds(pointCount, nn),
        index = new ArcIndex(pointCount),
        slice = usingTypedArrays() ? xx.subarray : Array.prototype.slice,
        paths, retn;
    paths = convertPaths(nn);
    retn = index.getVertexData();
    retn.paths = paths;
    return retn;

    function usingTypedArrays() {
      return !!(xx.subarray && yy.subarray);
    }

    function convertPaths(nn) {
      var paths = [],
          pointId = 0,
          pathLen;
      for (var i=0, len=nn.length; i<len; i++) {
        pathLen = nn[i];
        paths.push(pathLen < 2 ? null : convertPath(pointId, pointId + pathLen - 1));
        pointId += pathLen;
      }
      return paths;
    }

    function nextPoint(id) {
      var partId = pathIds[id],
          nextId = id + 1;
      if (nextId < pointCount && pathIds[nextId] === partId) {
        return id + 1;
      }
      var len = nn[partId];
      return sameXY(id, id - len + 1) ? id - len + 2 : -1;
    }

    function prevPoint(id) {
      var partId = pathIds[id],
          prevId = id - 1;
      if (prevId >= 0 && pathIds[prevId] === partId) {
        return id - 1;
      }
      var len = nn[partId];
      return sameXY(id, id + len - 1) ? id + len - 2 : -1;
    }

    function sameXY(a, b) {
      return xx[a] == xx[b] && yy[a] == yy[b];
    }

    // Convert a non-topological path to one or more topological arcs
    // @start, @end are ids of first and last points in the path
    // TODO: don't allow id ~id pairs
    //
    function convertPath(start, end) {
      var arcIds = [],
          firstNodeId = -1,
          arcStartId;

      // Visit each point in the path, up to but not including the last point
      for (var i = start; i < end; i++) {
        if (pointIsArcEndpoint(i)) {
          if (firstNodeId > -1) {
            arcIds.push(addEdge(arcStartId, i));
          } else {
            firstNodeId = i;
          }
          arcStartId = i;
        }
      }

      // Identify the final arc in the path
      if (firstNodeId == -1) {
        // Not in an arc, i.e. no nodes have been found...
        // Assuming that path is either an island or is congruent with one or more rings
        arcIds.push(addRing(start, end));
      }
      else if (firstNodeId == start) {
        // path endpoint is a node;
        if (!pointIsArcEndpoint(end)) {
          error("Topology error"); // TODO: better error handling
        }
        arcIds.push(addEdge(arcStartId, i));
      } else {
        // final arc wraps around
        arcIds.push(addSplitEdge(arcStartId, end, start + 1, firstNodeId));
      }
      return arcIds;
    }

    /**
     * FORESTAR: 是否是一个图形的结束点
     */
    // Test if a point @id is an endpoint of a topological path
    function pointIsArcEndpoint(id) {
      var id2 = chainIds[id],
          prev = prevPoint(id),
          next = nextPoint(id),
          prev2, next2;
      if (prev == -1 || next == -1) {
        // @id is an endpoint if it is the start or end of an open path
        return true;
      }
      while (id != id2) {
        prev2 = prevPoint(id2);
        next2 = nextPoint(id2);
        if (prev2 == -1 || next2 == -1 || brokenEdge(prev, next, prev2, next2)) {
          // there is a discontinuity at @id -- point is arc endpoint
          return true;
        }
        id2 = chainIds[id2];
      }
      return false;
    }

    // a and b are two vertices with the same x, y coordinates
    // test if the segments on either side of them are also identical
    function brokenEdge(aprev, anext, bprev, bnext) {
      var apx = xx[aprev],
          anx = xx[anext],
          bpx = xx[bprev],
          bnx = xx[bnext],
          apy = yy[aprev],
          any = yy[anext],
          bpy = yy[bprev],
          bny = yy[bnext];
      if (apx == bnx && anx == bpx && apy == bny && any == bpy ||
          apx == bpx && anx == bnx && apy == bpy && any == bny) {
        return false;
      }
      return true;
    }

    function mergeArcParts(src, startId, endId, startId2, endId2) {
      var len = endId - startId + endId2 - startId2 + 2,
          ArrayClass = usingTypedArrays() ? Float64Array : Array,
          dest = new ArrayClass(len),
          j = 0, i;
      for (i=startId; i <= endId; i++) {
        dest[j++] = src[i];
      }
      for (i=startId2; i <= endId2; i++) {
        dest[j++] = src[i];
      }
      return dest;
    }

    function addSplitEdge(start1, end1, start2, end2) {
      var arcId = index.findDuplicateArc(xx, yy, start1, end2, nextPoint, prevPoint);
      if (arcId === null) {
        arcId = index.addArc(mergeArcParts(xx, start1, end1, start2, end2),
            mergeArcParts(yy, start1, end1, start2, end2));
      }
      return arcId;
    }

     /**
     * FORESTAR: 添加闭合图形边界
     */
    function addEdge(start, end) {
      // search for a matching edge that has already been generated
      var arcId = index.findDuplicateArc(xx, yy, start, end, nextPoint, prevPoint);
      if (arcId === null) {
        arcId = index.addArc(slice.call(xx, start, end + 1),
            slice.call(yy, start, end + 1));
      }
      return arcId;
    }

    /**
     * FORESTAR: 添加闭合图形
     */
    function addRing(startId, endId) {
      var chainId = chainIds[startId],
          pathId = pathIds[startId],
          arcId;

      while (chainId != startId) {
        if (pathIds[chainId] < pathId) {
          break;
        }
        chainId = chainIds[chainId];
      }

      if (chainId == startId) {
        return addEdge(startId, endId);
      }

      for (var i=startId; i<endId; i++) {
        arcId = index.findDuplicateArc(xx, yy, i, i, nextPoint, prevPoint);
        if (arcId !== null) return arcId;
      }
      error("Unmatched ring; id:", pathId, "len:", nn[pathId]);
    }
  }


  // Create a lookup table for path ids; path ids are indexed by point id
  //
  function initPathIds(size, pathSizes) {
    var pathIds = new Int32Array(size),
        j = 0;
    for (var pathId=0, pathCount=pathSizes.length; pathId < pathCount; pathId++) {
      for (var i=0, n=pathSizes[pathId]; i<n; i++, j++) {
        pathIds[j] = pathId;
      }
    }
    return pathIds;
  }

  /**
   * FORESTAR: 替换arcIds
   */
  //// TODO
  function replaceArcIds(src, replacements) {
    return src.map(function(shape) {
      return replaceArcsInShape(shape, replacements);
    });

    function replaceArcsInShape(shape, replacements) {
      if (!shape) return null;
      return shape.map(function(path) {
        return replaceArcsInPath(path, replacements);
      });
    }

    function replaceArcsInPath(path, replacements) {
      return path.reduce(function(memo, id) {
        var abs = absArcId(id);
        var topoPath = replacements[abs];
        if (topoPath) {
          if (id < 0) {
            topoPath = topoPath.concat(); // TODO: need to copy?
            reversePath(topoPath);
          }
          for (var i=0, n=topoPath.length; i<n; i++) {
            memo.push(topoPath[i]);
          }
        }
        return memo;
      }, []);
    }
  }

  var Topology = /*#__PURE__*/Object.freeze({
    __proto__: null,
    buildTopology: buildTopology,
    buildPathTopology: buildPathTopology
  });

  /**
   * FORESTAR: importContent （导入文件内容）
   * @param obj
   * @param opts
   * @returns {{layers: Array, info: {prj: *}}|{layers, info}|{arcs}}
   */
  // Parse content of one or more input files and return a dataset
  // @obj: file data, indexed by file type
  // File data objects have two properties:
  //    content: Buffer, ArrayBuffer, String or Object
  //    filename: String or null
  //
  //// TODO
  function importContent(obj, opts) {
    var dataset, content, fileFmt, data;
    opts = opts || {};
    if (obj.json) {
      data = importJSON(obj.json, opts);
      fileFmt = data.format;
      dataset = data.dataset;
      cleanPathsAfterImport(dataset, opts);

    } else if (obj.text) {
      fileFmt = 'dsv';
      data = obj.text;
      dataset = importDelim2(data, opts);

    } else if (obj.shp) {
      fileFmt = 'shapefile';
      data = obj.shp;
      dataset = importShapefile(obj, opts);
      cleanPathsAfterImport(dataset, opts);

    } else if (obj.dbf) {
      fileFmt = 'dbf';
      data = obj.dbf;
      dataset = importDbf(obj, opts);

    } else if (obj.prj) {
      // added for -proj command source
      fileFmt = 'prj';
      data = obj.prj;
      dataset = {layers: [], info: {prj: data.content}};
    }

    if (!dataset) {
      stop("Missing an expected input type");
    }

    // Convert to topological format, if needed
    if (dataset.arcs && !opts.no_topology && fileFmt != 'topojson') {
      buildTopology(dataset);
    }

    // Use file basename for layer name, except TopoJSON, which uses object names
    if (fileFmt != 'topojson') {
      dataset.layers.forEach(function(lyr) {
        setLayerName(lyr, filenameToLayerName(data.filename || ''));
      });
    }

    // Add input filename and format to the dataset's 'info' object
    // (this is useful when exporting if format or name has not been specified.)
    if (data.filename) {
      dataset.info.input_files = [data.filename];
    }
    dataset.info.input_formats = [fileFmt];
    return dataset;
  }

  // Deprecated (included for compatibility with older tests)
  function importFileContent(content, filename, opts) {
    var type = guessInputType(filename, content),
        input = {};
    input[type] = {filename: filename, content: content};
    return importContent(input, opts);
  }


  /**
   * FORESTAR: importShapefile （导入shp文件）
   */
  //// TODO
  function importShapefile(obj, opts) {
    var shpSrc = obj.shp.content || obj.shp.filename, // read from a file if (binary) content is missing
        shxSrc = obj.shx ? obj.shx.content || obj.shx.filename : null,
        dataset = importShp(shpSrc, shxSrc, opts),
        lyr = dataset.layers[0],
        dbf;
    if (obj.dbf) {
      dbf = importDbf(obj, opts);
      utils.extend(dataset.info, dbf.info);
      lyr.data = dbf.layers[0].data;
      if (lyr.shapes && lyr.data.size() != lyr.shapes.length) {
        message("Mismatched .dbf and .shp record count -- possible data loss.");
      }
    }
    if (obj.prj) {
      dataset.info.prj = obj.prj.content;
    }
    return dataset;
  }

  /**
   * 
   * FORESTAR: importDbf （导入dbf文件）
   *
   * @param {*} input 
   * @param {*} opts 
   */
  //// TODO
  function importDbf(input, opts) {
    var table;
    opts = utils.extend({}, opts);
    if (input.cpg && !opts.encoding) {
      opts.encoding = input.cpg.content;
    }
    table = importDbfTable(input.dbf.content, opts);
    return {
      info: {},
      layers: [{data: table}]
    };
  }

  /**
   * FORESTAR: 文件名改为图层名
   * @param {*} path 
   */
  //// TODO
  function filenameToLayerName(path) {
    var name = 'layer1';
    var obj = parseLocalPath(path);
    if (obj.basename && obj.extension) { // exclude paths like '/dev/stdin'
      name = obj.basename;
    }
    return name;
  }

  /**
   * FORESTAR：设置图层名称
   * @param {*} lyr 
   * @param {*} path 
   */
  // initialize layer name using filename
  //// TODO
  function setLayerName(lyr, path) {
    if (!lyr.name) {
      lyr.name = getFileBase(path);
    }
  }

  var Import = /*#__PURE__*/Object.freeze({
    __proto__: null,
    /**
     * FORESTAR: importContent（导入内容）
     */
    importContent: importContent,
    importFileContent: importFileContent
  });



  var cmd = {}; // command functions get added to this object


  // Let the web UI replace importFile() with a browser-friendly version
  function replaceImportFile(func) {
    _importFile = func;
  }

  function importFile(path, opts) {
    return _importFile(path, opts);
  }

  var _importFile = function(path, opts) {
    var fileType = guessInputFileType(path),
        input = {},
        encoding = opts && opts.encoding || null,
        cache = opts && opts.input || null,
        cached = cache && (path in cache),
        content;

    cli.checkFileExists(path, cache);
    if (fileType == 'shp' && !cached) {
      // let ShpReader read the file (supports larger files)
      content = null;

    } else if (fileType == 'json' && !cached) {
      // postpone reading of JSON files, to support incremental parsing
      content = null;

    } else if (fileType == 'text' && !cached) {
      // content = cli.readFile(path); // read from buffer
      content = null; // read from file, to support largest files (see mapshaper-delim-import.js)

    } else if (fileType && isSupportedBinaryInputType(path)) {
      content = cli.readFile(path, null, cache);
      if (utils.isString(content)) {
        // Fix for issue #264 (applyCommands() input is file path instead of binary content)
        stop('Expected binary content, received a string');
      }

    } else if (fileType) { // string type
      content = cli.readFile(path, encoding || 'utf-8', cache);

    } else { // type can't be inferred from filename -- try reading as text
      content = cli.readFile(path, encoding || 'utf-8', cache);
      fileType = guessInputContentType(content);
      if (fileType == 'text' && content.indexOf('\ufffd') > -1) {
        // invalidate string data that contains the 'replacement character'
        fileType = null;
      }
    }

    if (!fileType) {
      stop(getUnsupportedFileMessage(path));
    }
    input[fileType] = {filename: path, content: content};
    content = null; // for g.c.
    if (fileType == 'shp' || fileType == 'dbf') {
      readShapefileAuxFiles(path, input, cache);
    }
    if (fileType == 'shp' && !input.dbf) {
      message(utils.format("[%s] .dbf file is missing - shapes imported without attribute data.", path));
    }
    return importContent(input, opts);
  };

  function getUnsupportedFileMessage(path) {
    var ext = getFileExtension(path);
    var msg = 'Unable to import ' + path;
    if (ext.toLowerCase() == 'zip') {
      msg += ' (ZIP files must be unpacked before running mapshaper)';
    } else {
      msg += ' (unknown file type)';
    }
    return msg;
  }

  function readShapefileAuxFiles(path, obj, cache) {
    var dbfPath = replaceFileExtension(path, 'dbf');
    var shxPath = replaceFileExtension(path, 'shx');
    var cpgPath = replaceFileExtension(path, 'cpg');
    var prjPath = replaceFileExtension(path, 'prj');
    if (cli.isFile(prjPath, cache)) {
      obj.prj = {filename: prjPath, content: cli.readFile(prjPath, 'utf-8', cache)};
    }
    if (cli.isFile(shxPath, cache)) {
      obj.shx = {filename: shxPath, content: cli.readFile(shxPath, null, cache)};
    }
    if (!obj.dbf && cli.isFile(dbfPath, cache)) {
      obj.dbf = {filename: dbfPath, content: cli.readFile(dbfPath, null, cache)};
    }
    if (obj.dbf && cli.isFile(cpgPath, cache)) {
      obj.cpg = {filename: cpgPath, content: cli.readFile(cpgPath, 'utf-8', cache).trim()};
    }
  }

  var FileImport = /*#__PURE__*/Object.freeze({
    __proto__: null,
   /* replaceImportFile: replaceImportFile,*/
    importFile: importFile
  });


  var internal = {};
  var coreAPI ={};
  Object.assign(internal, {

    Dbf,
    DbfReader,
    // DouglasPeucker,
    // geojson: GeoJSON,
    ShpType,
    // topojson: TopoJSON,
    //Visvalingam,
    ArcCollection,
    //Bounds,
    // clipIterByBounds,
    // CommandParser,
    DataTable,
    // editArcs,
    // GeoJSONReader,
    // Heap,
    NodeCollection,
    // parseDMS,
    // PathIndex,
    // PolygonIndex,
    ShpReader,
    //Transform
  });

  Object.assign(internal,
    // AnchorPoints,
    // ArcClassifier,
    // ArcDissolve,
    // Bbox2Clipping,
    BinArray$1,
    // BufferCommon,
    // Calc,
    // CalcUtils,
    // Catalog$1,
    // ClipErase,
    // ClipPoints,
    // Colorizer,
    // CustomProjections,
    // DataAggregation,
    // DatasetUtils,
    DataUtils,
    DbfImport,
    // DelimExport,
    // DelimImport,
    // DelimReader,
    Encodings,
    // Explode,
    // Export,
    // Expressions,
    // FileExport,
    FileImport,
    FilenameUtils,
    FileReader$1,
    FileTypes,
    // FilterGeom,
    // Frame,
    // Furniture,
    // Geodesic,
    // GeojsonExport,
    // GeojsonImport,
    Import,
    // Info,
    // IntersectionCuts,
    // Join,
    // JoinCalc,
    // JoinFilter,
    // JoinTables,
    // JsonImport,
    // JsonTable,
    // KeepShapes,
    // LatLon,
    LayerUtils,
    // Lines,
    Logging,
    // MergeFiles,
    // Merging,
    // MosaicIndex$1,
    // OptionParsingUtils,
    // OutputFormat,
    // OverlayUtils,
    // ParseCommands,
    // PathBuffer,
    PathEndpoints,
    // PathExport,
    // Pathfinder,
    // PathfinderUtils,
    // PathImport,
    // PathRepair,
    // PathUtils,
    // PixelTransform,
    // PointPolygonJoin,
    // Points,
    // PointUtils,
    // PolygonDissolve,
    // PolygonDissolve2,
    // PolygonHoles,
    // PolygonMosaic,
    // PolygonNeighbors,
    // PolygonRepair,
    // PolygonTiler$1,
    // PolylineClipping,
    // PostSimplifyRepair,
    // Proj,
    // Projections,
    // Rectangle,
    Rounding,
    // RunCommands,
    // Scalebar,
    // SegmentIntersection,
    ShapeIter$1,
    // ShapeUtils,
    ShpCommon,
    // ShpExport,
    ShpImport,
    // Simplify,
    SimplifyFast,
    // SimplifyPct,
    // Slivers,
    // Snapping,
    // SourceUtils,
    // Split,
    // State,
    // Stringify,
    // Svg,
    // SvgProperties,
    // Symbols,
    // TargetUtils,
    // TopojsonExport,
    // TopojsonImport,
    Topology,
    Units
    // SvgHatch
  );

  // The entry point for the core mapshaper module
  var moduleAPI = Object.assign({
   /* cli, geom,*/ utils, internal,importFile
    // Adding importFile() for compatibility with old tests; todo: rewrite tests
  }, cmd, coreAPI);  // Adding command functions to the top-level module API, for test compatibility

  if (typeof module === "object" && module.exports) {
    module.exports = moduleAPI;
  } else if (typeof window === "object" && window) {
    window.mapshaper = moduleAPI;
  }

}());
