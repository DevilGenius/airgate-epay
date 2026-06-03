import { jsx as a, jsxs as y, Fragment as Jt } from "react/jsx-runtime";
import { useState as R, useRef as de, useEffect as D, useMemo as Pt, useCallback as Z } from "react";
function Yt(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Q = {}, be, Je;
function Qt() {
  return Je || (Je = 1, be = function() {
    return typeof Promise == "function" && Promise.prototype && Promise.prototype.then;
  }), be;
}
var we = {}, V = {}, Ye;
function G() {
  if (Ye) return V;
  Ye = 1;
  let e;
  const r = [
    0,
    // Not used
    26,
    44,
    70,
    100,
    134,
    172,
    196,
    242,
    292,
    346,
    404,
    466,
    532,
    581,
    655,
    733,
    815,
    901,
    991,
    1085,
    1156,
    1258,
    1364,
    1474,
    1588,
    1706,
    1828,
    1921,
    2051,
    2185,
    2323,
    2465,
    2611,
    2761,
    2876,
    3034,
    3196,
    3362,
    3532,
    3706
  ];
  return V.getSymbolSize = function(t) {
    if (!t) throw new Error('"version" cannot be null or undefined');
    if (t < 1 || t > 40) throw new Error('"version" should be in range from 1 to 40');
    return t * 4 + 17;
  }, V.getSymbolTotalCodewords = function(t) {
    return r[t];
  }, V.getBCHDigit = function(o) {
    let t = 0;
    for (; o !== 0; )
      t++, o >>>= 1;
    return t;
  }, V.setToSJISFunction = function(t) {
    if (typeof t != "function")
      throw new Error('"toSJISFunc" is not a valid function.');
    e = t;
  }, V.isKanjiModeEnabled = function() {
    return typeof e < "u";
  }, V.toSJIS = function(t) {
    return e(t);
  }, V;
}
var Ne = {}, Qe;
function Oe() {
  return Qe || (Qe = 1, (function(e) {
    e.L = { bit: 1 }, e.M = { bit: 0 }, e.Q = { bit: 3 }, e.H = { bit: 2 };
    function r(o) {
      if (typeof o != "string")
        throw new Error("Param is not a string");
      switch (o.toLowerCase()) {
        case "l":
        case "low":
          return e.L;
        case "m":
        case "medium":
          return e.M;
        case "q":
        case "quartile":
          return e.Q;
        case "h":
        case "high":
          return e.H;
        default:
          throw new Error("Unknown EC Level: " + o);
      }
    }
    e.isValid = function(t) {
      return t && typeof t.bit < "u" && t.bit >= 0 && t.bit < 4;
    }, e.from = function(t, n) {
      if (e.isValid(t))
        return t;
      try {
        return r(t);
      } catch {
        return n;
      }
    };
  })(Ne)), Ne;
}
var ve, We;
function Wt() {
  if (We) return ve;
  We = 1;
  function e() {
    this.buffer = [], this.length = 0;
  }
  return e.prototype = {
    get: function(r) {
      const o = Math.floor(r / 8);
      return (this.buffer[o] >>> 7 - r % 8 & 1) === 1;
    },
    put: function(r, o) {
      for (let t = 0; t < o; t++)
        this.putBit((r >>> o - t - 1 & 1) === 1);
    },
    getLengthInBits: function() {
      return this.length;
    },
    putBit: function(r) {
      const o = Math.floor(this.length / 8);
      this.buffer.length <= o && this.buffer.push(0), r && (this.buffer[o] |= 128 >>> this.length % 8), this.length++;
    }
  }, ve = e, ve;
}
var Ce, Ze;
function Zt() {
  if (Ze) return Ce;
  Ze = 1;
  function e(r) {
    if (!r || r < 1)
      throw new Error("BitMatrix size must be defined and greater than 0");
    this.size = r, this.data = new Uint8Array(r * r), this.reservedBit = new Uint8Array(r * r);
  }
  return e.prototype.set = function(r, o, t, n) {
    const i = r * this.size + o;
    this.data[i] = t, n && (this.reservedBit[i] = !0);
  }, e.prototype.get = function(r, o) {
    return this.data[r * this.size + o];
  }, e.prototype.xor = function(r, o, t) {
    this.data[r * this.size + o] ^= t;
  }, e.prototype.isReserved = function(r, o) {
    return this.reservedBit[r * this.size + o];
  }, Ce = e, Ce;
}
var ke = {}, Xe;
function Xt() {
  return Xe || (Xe = 1, (function(e) {
    const r = G().getSymbolSize;
    e.getRowColCoords = function(t) {
      if (t === 1) return [];
      const n = Math.floor(t / 7) + 2, i = r(t), s = i === 145 ? 26 : Math.ceil((i - 13) / (2 * n - 2)) * 2, l = [i - 7];
      for (let c = 1; c < n - 1; c++)
        l[c] = l[c - 1] - s;
      return l.push(6), l.reverse();
    }, e.getPositions = function(t) {
      const n = [], i = e.getRowColCoords(t), s = i.length;
      for (let l = 0; l < s; l++)
        for (let c = 0; c < s; c++)
          l === 0 && c === 0 || // top-left
          l === 0 && c === s - 1 || // bottom-left
          l === s - 1 && c === 0 || n.push([i[l], i[c]]);
      return n;
    };
  })(ke)), ke;
}
var Ee = {}, et;
function en() {
  if (et) return Ee;
  et = 1;
  const e = G().getSymbolSize, r = 7;
  return Ee.getPositions = function(t) {
    const n = e(t);
    return [
      // top-left
      [0, 0],
      // top-right
      [n - r, 0],
      // bottom-left
      [0, n - r]
    ];
  }, Ee;
}
var Se = {}, tt;
function tn() {
  return tt || (tt = 1, (function(e) {
    e.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    const r = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    e.isValid = function(n) {
      return n != null && n !== "" && !isNaN(n) && n >= 0 && n <= 7;
    }, e.from = function(n) {
      return e.isValid(n) ? parseInt(n, 10) : void 0;
    }, e.getPenaltyN1 = function(n) {
      const i = n.size;
      let s = 0, l = 0, c = 0, d = null, h = null;
      for (let m = 0; m < i; m++) {
        l = c = 0, d = h = null;
        for (let g = 0; g < i; g++) {
          let f = n.get(m, g);
          f === d ? l++ : (l >= 5 && (s += r.N1 + (l - 5)), d = f, l = 1), f = n.get(g, m), f === h ? c++ : (c >= 5 && (s += r.N1 + (c - 5)), h = f, c = 1);
        }
        l >= 5 && (s += r.N1 + (l - 5)), c >= 5 && (s += r.N1 + (c - 5));
      }
      return s;
    }, e.getPenaltyN2 = function(n) {
      const i = n.size;
      let s = 0;
      for (let l = 0; l < i - 1; l++)
        for (let c = 0; c < i - 1; c++) {
          const d = n.get(l, c) + n.get(l, c + 1) + n.get(l + 1, c) + n.get(l + 1, c + 1);
          (d === 4 || d === 0) && s++;
        }
      return s * r.N2;
    }, e.getPenaltyN3 = function(n) {
      const i = n.size;
      let s = 0, l = 0, c = 0;
      for (let d = 0; d < i; d++) {
        l = c = 0;
        for (let h = 0; h < i; h++)
          l = l << 1 & 2047 | n.get(d, h), h >= 10 && (l === 1488 || l === 93) && s++, c = c << 1 & 2047 | n.get(h, d), h >= 10 && (c === 1488 || c === 93) && s++;
      }
      return s * r.N3;
    }, e.getPenaltyN4 = function(n) {
      let i = 0;
      const s = n.data.length;
      for (let c = 0; c < s; c++) i += n.data[c];
      return Math.abs(Math.ceil(i * 100 / s / 5) - 10) * r.N4;
    };
    function o(t, n, i) {
      switch (t) {
        case e.Patterns.PATTERN000:
          return (n + i) % 2 === 0;
        case e.Patterns.PATTERN001:
          return n % 2 === 0;
        case e.Patterns.PATTERN010:
          return i % 3 === 0;
        case e.Patterns.PATTERN011:
          return (n + i) % 3 === 0;
        case e.Patterns.PATTERN100:
          return (Math.floor(n / 2) + Math.floor(i / 3)) % 2 === 0;
        case e.Patterns.PATTERN101:
          return n * i % 2 + n * i % 3 === 0;
        case e.Patterns.PATTERN110:
          return (n * i % 2 + n * i % 3) % 2 === 0;
        case e.Patterns.PATTERN111:
          return (n * i % 3 + (n + i) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + t);
      }
    }
    e.applyMask = function(n, i) {
      const s = i.size;
      for (let l = 0; l < s; l++)
        for (let c = 0; c < s; c++)
          i.isReserved(c, l) || i.xor(c, l, o(n, c, l));
    }, e.getBestMask = function(n, i) {
      const s = Object.keys(e.Patterns).length;
      let l = 0, c = 1 / 0;
      for (let d = 0; d < s; d++) {
        i(d), e.applyMask(d, n);
        const h = e.getPenaltyN1(n) + e.getPenaltyN2(n) + e.getPenaltyN3(n) + e.getPenaltyN4(n);
        e.applyMask(d, n), h < c && (c = h, l = d);
      }
      return l;
    };
  })(Se)), Se;
}
var re = {}, nt;
function _t() {
  if (nt) return re;
  nt = 1;
  const e = Oe(), r = [
    // L  M  Q  H
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    1,
    2,
    2,
    4,
    1,
    2,
    4,
    4,
    2,
    4,
    4,
    4,
    2,
    4,
    6,
    5,
    2,
    4,
    6,
    6,
    2,
    5,
    8,
    8,
    4,
    5,
    8,
    8,
    4,
    5,
    8,
    11,
    4,
    8,
    10,
    11,
    4,
    9,
    12,
    16,
    4,
    9,
    16,
    16,
    6,
    10,
    12,
    18,
    6,
    10,
    17,
    16,
    6,
    11,
    16,
    19,
    6,
    13,
    18,
    21,
    7,
    14,
    21,
    25,
    8,
    16,
    20,
    25,
    8,
    17,
    23,
    25,
    9,
    17,
    23,
    34,
    9,
    18,
    25,
    30,
    10,
    20,
    27,
    32,
    12,
    21,
    29,
    35,
    12,
    23,
    34,
    37,
    12,
    25,
    34,
    40,
    13,
    26,
    35,
    42,
    14,
    28,
    38,
    45,
    15,
    29,
    40,
    48,
    16,
    31,
    43,
    51,
    17,
    33,
    45,
    54,
    18,
    35,
    48,
    57,
    19,
    37,
    51,
    60,
    19,
    38,
    53,
    63,
    20,
    40,
    56,
    66,
    21,
    43,
    59,
    70,
    22,
    45,
    62,
    74,
    24,
    47,
    65,
    77,
    25,
    49,
    68,
    81
  ], o = [
    // L  M  Q  H
    7,
    10,
    13,
    17,
    10,
    16,
    22,
    28,
    15,
    26,
    36,
    44,
    20,
    36,
    52,
    64,
    26,
    48,
    72,
    88,
    36,
    64,
    96,
    112,
    40,
    72,
    108,
    130,
    48,
    88,
    132,
    156,
    60,
    110,
    160,
    192,
    72,
    130,
    192,
    224,
    80,
    150,
    224,
    264,
    96,
    176,
    260,
    308,
    104,
    198,
    288,
    352,
    120,
    216,
    320,
    384,
    132,
    240,
    360,
    432,
    144,
    280,
    408,
    480,
    168,
    308,
    448,
    532,
    180,
    338,
    504,
    588,
    196,
    364,
    546,
    650,
    224,
    416,
    600,
    700,
    224,
    442,
    644,
    750,
    252,
    476,
    690,
    816,
    270,
    504,
    750,
    900,
    300,
    560,
    810,
    960,
    312,
    588,
    870,
    1050,
    336,
    644,
    952,
    1110,
    360,
    700,
    1020,
    1200,
    390,
    728,
    1050,
    1260,
    420,
    784,
    1140,
    1350,
    450,
    812,
    1200,
    1440,
    480,
    868,
    1290,
    1530,
    510,
    924,
    1350,
    1620,
    540,
    980,
    1440,
    1710,
    570,
    1036,
    1530,
    1800,
    570,
    1064,
    1590,
    1890,
    600,
    1120,
    1680,
    1980,
    630,
    1204,
    1770,
    2100,
    660,
    1260,
    1860,
    2220,
    720,
    1316,
    1950,
    2310,
    750,
    1372,
    2040,
    2430
  ];
  return re.getBlocksCount = function(n, i) {
    switch (i) {
      case e.L:
        return r[(n - 1) * 4 + 0];
      case e.M:
        return r[(n - 1) * 4 + 1];
      case e.Q:
        return r[(n - 1) * 4 + 2];
      case e.H:
        return r[(n - 1) * 4 + 3];
      default:
        return;
    }
  }, re.getTotalCodewordsCount = function(n, i) {
    switch (i) {
      case e.L:
        return o[(n - 1) * 4 + 0];
      case e.M:
        return o[(n - 1) * 4 + 1];
      case e.Q:
        return o[(n - 1) * 4 + 2];
      case e.H:
        return o[(n - 1) * 4 + 3];
      default:
        return;
    }
  }, re;
}
var Pe = {}, te = {}, at;
function nn() {
  if (at) return te;
  at = 1;
  const e = new Uint8Array(512), r = new Uint8Array(256);
  return (function() {
    let t = 1;
    for (let n = 0; n < 255; n++)
      e[n] = t, r[t] = n, t <<= 1, t & 256 && (t ^= 285);
    for (let n = 255; n < 512; n++)
      e[n] = e[n - 255];
  })(), te.log = function(t) {
    if (t < 1) throw new Error("log(" + t + ")");
    return r[t];
  }, te.exp = function(t) {
    return e[t];
  }, te.mul = function(t, n) {
    return t === 0 || n === 0 ? 0 : e[r[t] + r[n]];
  }, te;
}
var rt;
function an() {
  return rt || (rt = 1, (function(e) {
    const r = nn();
    e.mul = function(t, n) {
      const i = new Uint8Array(t.length + n.length - 1);
      for (let s = 0; s < t.length; s++)
        for (let l = 0; l < n.length; l++)
          i[s + l] ^= r.mul(t[s], n[l]);
      return i;
    }, e.mod = function(t, n) {
      let i = new Uint8Array(t);
      for (; i.length - n.length >= 0; ) {
        const s = i[0];
        for (let c = 0; c < n.length; c++)
          i[c] ^= r.mul(n[c], s);
        let l = 0;
        for (; l < i.length && i[l] === 0; ) l++;
        i = i.slice(l);
      }
      return i;
    }, e.generateECPolynomial = function(t) {
      let n = new Uint8Array([1]);
      for (let i = 0; i < t; i++)
        n = e.mul(n, new Uint8Array([1, r.exp(i)]));
      return n;
    };
  })(Pe)), Pe;
}
var _e, it;
function rn() {
  if (it) return _e;
  it = 1;
  const e = an();
  function r(o) {
    this.genPoly = void 0, this.degree = o, this.degree && this.initialize(this.degree);
  }
  return r.prototype.initialize = function(t) {
    this.degree = t, this.genPoly = e.generateECPolynomial(this.degree);
  }, r.prototype.encode = function(t) {
    if (!this.genPoly)
      throw new Error("Encoder not initialized");
    const n = new Uint8Array(t.length + this.degree);
    n.set(t);
    const i = e.mod(n, this.genPoly), s = this.degree - i.length;
    if (s > 0) {
      const l = new Uint8Array(this.degree);
      return l.set(i, s), l;
    }
    return i;
  }, _e = r, _e;
}
var Be = {}, Te = {}, Me = {}, ot;
function Bt() {
  return ot || (ot = 1, Me.isValid = function(r) {
    return !isNaN(r) && r >= 1 && r <= 40;
  }), Me;
}
var x = {}, st;
function Tt() {
  if (st) return x;
  st = 1;
  const e = "[0-9]+", r = "[A-Z $%*+\\-./:]+";
  let o = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
  o = o.replace(/u/g, "\\u");
  const t = "(?:(?![A-Z0-9 $%*+\\-./:]|" + o + `)(?:.|[\r
]))+`;
  x.KANJI = new RegExp(o, "g"), x.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g"), x.BYTE = new RegExp(t, "g"), x.NUMERIC = new RegExp(e, "g"), x.ALPHANUMERIC = new RegExp(r, "g");
  const n = new RegExp("^" + o + "$"), i = new RegExp("^" + e + "$"), s = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
  return x.testKanji = function(c) {
    return n.test(c);
  }, x.testNumeric = function(c) {
    return i.test(c);
  }, x.testAlphanumeric = function(c) {
    return s.test(c);
  }, x;
}
var lt;
function J() {
  return lt || (lt = 1, (function(e) {
    const r = Bt(), o = Tt();
    e.NUMERIC = {
      id: "Numeric",
      bit: 1,
      ccBits: [10, 12, 14]
    }, e.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 2,
      ccBits: [9, 11, 13]
    }, e.BYTE = {
      id: "Byte",
      bit: 4,
      ccBits: [8, 16, 16]
    }, e.KANJI = {
      id: "Kanji",
      bit: 8,
      ccBits: [8, 10, 12]
    }, e.MIXED = {
      bit: -1
    }, e.getCharCountIndicator = function(i, s) {
      if (!i.ccBits) throw new Error("Invalid mode: " + i);
      if (!r.isValid(s))
        throw new Error("Invalid version: " + s);
      return s >= 1 && s < 10 ? i.ccBits[0] : s < 27 ? i.ccBits[1] : i.ccBits[2];
    }, e.getBestModeForData = function(i) {
      return o.testNumeric(i) ? e.NUMERIC : o.testAlphanumeric(i) ? e.ALPHANUMERIC : o.testKanji(i) ? e.KANJI : e.BYTE;
    }, e.toString = function(i) {
      if (i && i.id) return i.id;
      throw new Error("Invalid mode");
    }, e.isValid = function(i) {
      return i && i.bit && i.ccBits;
    };
    function t(n) {
      if (typeof n != "string")
        throw new Error("Param is not a string");
      switch (n.toLowerCase()) {
        case "numeric":
          return e.NUMERIC;
        case "alphanumeric":
          return e.ALPHANUMERIC;
        case "kanji":
          return e.KANJI;
        case "byte":
          return e.BYTE;
        default:
          throw new Error("Unknown mode: " + n);
      }
    }
    e.from = function(i, s) {
      if (e.isValid(i))
        return i;
      try {
        return t(i);
      } catch {
        return s;
      }
    };
  })(Te)), Te;
}
var ct;
function on() {
  return ct || (ct = 1, (function(e) {
    const r = G(), o = _t(), t = Oe(), n = J(), i = Bt(), s = 7973, l = r.getBCHDigit(s);
    function c(g, f, u) {
      for (let N = 1; N <= 40; N++)
        if (f <= e.getCapacity(N, u, g))
          return N;
    }
    function d(g, f) {
      return n.getCharCountIndicator(g, f) + 4;
    }
    function h(g, f) {
      let u = 0;
      return g.forEach(function(N) {
        const A = d(N.mode, f);
        u += A + N.getBitsLength();
      }), u;
    }
    function m(g, f) {
      for (let u = 1; u <= 40; u++)
        if (h(g, u) <= e.getCapacity(u, f, n.MIXED))
          return u;
    }
    e.from = function(f, u) {
      return i.isValid(f) ? parseInt(f, 10) : u;
    }, e.getCapacity = function(f, u, N) {
      if (!i.isValid(f))
        throw new Error("Invalid QR Code version");
      typeof N > "u" && (N = n.BYTE);
      const A = r.getSymbolTotalCodewords(f), p = o.getTotalCodewordsCount(f, u), C = (A - p) * 8;
      if (N === n.MIXED) return C;
      const B = C - d(N, f);
      switch (N) {
        case n.NUMERIC:
          return Math.floor(B / 10 * 3);
        case n.ALPHANUMERIC:
          return Math.floor(B / 11 * 2);
        case n.KANJI:
          return Math.floor(B / 13);
        case n.BYTE:
        default:
          return Math.floor(B / 8);
      }
    }, e.getBestVersionForData = function(f, u) {
      let N;
      const A = t.from(u, t.M);
      if (Array.isArray(f)) {
        if (f.length > 1)
          return m(f, A);
        if (f.length === 0)
          return 1;
        N = f[0];
      } else
        N = f;
      return c(N.mode, N.getLength(), A);
    }, e.getEncodedBits = function(f) {
      if (!i.isValid(f) || f < 7)
        throw new Error("Invalid QR Code version");
      let u = f << 12;
      for (; r.getBCHDigit(u) - l >= 0; )
        u ^= s << r.getBCHDigit(u) - l;
      return f << 12 | u;
    };
  })(Be)), Be;
}
var Ie = {}, dt;
function sn() {
  if (dt) return Ie;
  dt = 1;
  const e = G(), r = 1335, o = 21522, t = e.getBCHDigit(r);
  return Ie.getEncodedBits = function(i, s) {
    const l = i.bit << 3 | s;
    let c = l << 10;
    for (; e.getBCHDigit(c) - t >= 0; )
      c ^= r << e.getBCHDigit(c) - t;
    return (l << 10 | c) ^ o;
  }, Ie;
}
var Re = {}, Ae, ut;
function ln() {
  if (ut) return Ae;
  ut = 1;
  const e = J();
  function r(o) {
    this.mode = e.NUMERIC, this.data = o.toString();
  }
  return r.getBitsLength = function(t) {
    return 10 * Math.floor(t / 3) + (t % 3 ? t % 3 * 3 + 1 : 0);
  }, r.prototype.getLength = function() {
    return this.data.length;
  }, r.prototype.getBitsLength = function() {
    return r.getBitsLength(this.data.length);
  }, r.prototype.write = function(t) {
    let n, i, s;
    for (n = 0; n + 3 <= this.data.length; n += 3)
      i = this.data.substr(n, 3), s = parseInt(i, 10), t.put(s, 10);
    const l = this.data.length - n;
    l > 0 && (i = this.data.substr(n), s = parseInt(i, 10), t.put(s, l * 3 + 1));
  }, Ae = r, Ae;
}
var Le, ht;
function cn() {
  if (ht) return Le;
  ht = 1;
  const e = J(), r = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    " ",
    "$",
    "%",
    "*",
    "+",
    "-",
    ".",
    "/",
    ":"
  ];
  function o(t) {
    this.mode = e.ALPHANUMERIC, this.data = t;
  }
  return o.getBitsLength = function(n) {
    return 11 * Math.floor(n / 2) + 6 * (n % 2);
  }, o.prototype.getLength = function() {
    return this.data.length;
  }, o.prototype.getBitsLength = function() {
    return o.getBitsLength(this.data.length);
  }, o.prototype.write = function(n) {
    let i;
    for (i = 0; i + 2 <= this.data.length; i += 2) {
      let s = r.indexOf(this.data[i]) * 45;
      s += r.indexOf(this.data[i + 1]), n.put(s, 11);
    }
    this.data.length % 2 && n.put(r.indexOf(this.data[i]), 6);
  }, Le = o, Le;
}
var qe, gt;
function dn() {
  if (gt) return qe;
  gt = 1;
  const e = J();
  function r(o) {
    this.mode = e.BYTE, typeof o == "string" ? this.data = new TextEncoder().encode(o) : this.data = new Uint8Array(o);
  }
  return r.getBitsLength = function(t) {
    return t * 8;
  }, r.prototype.getLength = function() {
    return this.data.length;
  }, r.prototype.getBitsLength = function() {
    return r.getBitsLength(this.data.length);
  }, r.prototype.write = function(o) {
    for (let t = 0, n = this.data.length; t < n; t++)
      o.put(this.data[t], 8);
  }, qe = r, qe;
}
var De, ft;
function un() {
  if (ft) return De;
  ft = 1;
  const e = J(), r = G();
  function o(t) {
    this.mode = e.KANJI, this.data = t;
  }
  return o.getBitsLength = function(n) {
    return n * 13;
  }, o.prototype.getLength = function() {
    return this.data.length;
  }, o.prototype.getBitsLength = function() {
    return o.getBitsLength(this.data.length);
  }, o.prototype.write = function(t) {
    let n;
    for (n = 0; n < this.data.length; n++) {
      let i = r.toSJIS(this.data[n]);
      if (i >= 33088 && i <= 40956)
        i -= 33088;
      else if (i >= 57408 && i <= 60351)
        i -= 49472;
      else
        throw new Error(
          "Invalid SJIS character: " + this.data[n] + `
Make sure your charset is UTF-8`
        );
      i = (i >>> 8 & 255) * 192 + (i & 255), t.put(i, 13);
    }
  }, De = o, De;
}
var xe = { exports: {} }, pt;
function hn() {
  return pt || (pt = 1, (function(e) {
    var r = {
      single_source_shortest_paths: function(o, t, n) {
        var i = {}, s = {};
        s[t] = 0;
        var l = r.PriorityQueue.make();
        l.push(t, 0);
        for (var c, d, h, m, g, f, u, N, A; !l.empty(); ) {
          c = l.pop(), d = c.value, m = c.cost, g = o[d] || {};
          for (h in g)
            g.hasOwnProperty(h) && (f = g[h], u = m + f, N = s[h], A = typeof s[h] > "u", (A || N > u) && (s[h] = u, l.push(h, u), i[h] = d));
        }
        if (typeof n < "u" && typeof s[n] > "u") {
          var p = ["Could not find a path from ", t, " to ", n, "."].join("");
          throw new Error(p);
        }
        return i;
      },
      extract_shortest_path_from_predecessor_list: function(o, t) {
        for (var n = [], i = t; i; )
          n.push(i), o[i], i = o[i];
        return n.reverse(), n;
      },
      find_path: function(o, t, n) {
        var i = r.single_source_shortest_paths(o, t, n);
        return r.extract_shortest_path_from_predecessor_list(
          i,
          n
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(o) {
          var t = r.PriorityQueue, n = {}, i;
          o = o || {};
          for (i in t)
            t.hasOwnProperty(i) && (n[i] = t[i]);
          return n.queue = [], n.sorter = o.sorter || t.default_sorter, n;
        },
        default_sorter: function(o, t) {
          return o.cost - t.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(o, t) {
          var n = { value: o, cost: t };
          this.queue.push(n), this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    e.exports = r;
  })(xe)), xe.exports;
}
var mt;
function gn() {
  return mt || (mt = 1, (function(e) {
    const r = J(), o = ln(), t = cn(), n = dn(), i = un(), s = Tt(), l = G(), c = hn();
    function d(p) {
      return unescape(encodeURIComponent(p)).length;
    }
    function h(p, C, B) {
      const k = [];
      let E;
      for (; (E = p.exec(B)) !== null; )
        k.push({
          data: E[0],
          index: E.index,
          mode: C,
          length: E[0].length
        });
      return k;
    }
    function m(p) {
      const C = h(s.NUMERIC, r.NUMERIC, p), B = h(s.ALPHANUMERIC, r.ALPHANUMERIC, p);
      let k, E;
      return l.isKanjiModeEnabled() ? (k = h(s.BYTE, r.BYTE, p), E = h(s.KANJI, r.KANJI, p)) : (k = h(s.BYTE_KANJI, r.BYTE, p), E = []), C.concat(B, k, E).sort(function(b, S) {
        return b.index - S.index;
      }).map(function(b) {
        return {
          data: b.data,
          mode: b.mode,
          length: b.length
        };
      });
    }
    function g(p, C) {
      switch (C) {
        case r.NUMERIC:
          return o.getBitsLength(p);
        case r.ALPHANUMERIC:
          return t.getBitsLength(p);
        case r.KANJI:
          return i.getBitsLength(p);
        case r.BYTE:
          return n.getBitsLength(p);
      }
    }
    function f(p) {
      return p.reduce(function(C, B) {
        const k = C.length - 1 >= 0 ? C[C.length - 1] : null;
        return k && k.mode === B.mode ? (C[C.length - 1].data += B.data, C) : (C.push(B), C);
      }, []);
    }
    function u(p) {
      const C = [];
      for (let B = 0; B < p.length; B++) {
        const k = p[B];
        switch (k.mode) {
          case r.NUMERIC:
            C.push([
              k,
              { data: k.data, mode: r.ALPHANUMERIC, length: k.length },
              { data: k.data, mode: r.BYTE, length: k.length }
            ]);
            break;
          case r.ALPHANUMERIC:
            C.push([
              k,
              { data: k.data, mode: r.BYTE, length: k.length }
            ]);
            break;
          case r.KANJI:
            C.push([
              k,
              { data: k.data, mode: r.BYTE, length: d(k.data) }
            ]);
            break;
          case r.BYTE:
            C.push([
              { data: k.data, mode: r.BYTE, length: d(k.data) }
            ]);
        }
      }
      return C;
    }
    function N(p, C) {
      const B = {}, k = { start: {} };
      let E = ["start"];
      for (let w = 0; w < p.length; w++) {
        const b = p[w], S = [];
        for (let v = 0; v < b.length; v++) {
          const M = b[v], P = "" + w + v;
          S.push(P), B[P] = { node: M, lastCount: 0 }, k[P] = {};
          for (let T = 0; T < E.length; T++) {
            const _ = E[T];
            B[_] && B[_].node.mode === M.mode ? (k[_][P] = g(B[_].lastCount + M.length, M.mode) - g(B[_].lastCount, M.mode), B[_].lastCount += M.length) : (B[_] && (B[_].lastCount = M.length), k[_][P] = g(M.length, M.mode) + 4 + r.getCharCountIndicator(M.mode, C));
          }
        }
        E = S;
      }
      for (let w = 0; w < E.length; w++)
        k[E[w]].end = 0;
      return { map: k, table: B };
    }
    function A(p, C) {
      let B;
      const k = r.getBestModeForData(p);
      if (B = r.from(C, k), B !== r.BYTE && B.bit < k.bit)
        throw new Error('"' + p + '" cannot be encoded with mode ' + r.toString(B) + `.
 Suggested mode is: ` + r.toString(k));
      switch (B === r.KANJI && !l.isKanjiModeEnabled() && (B = r.BYTE), B) {
        case r.NUMERIC:
          return new o(p);
        case r.ALPHANUMERIC:
          return new t(p);
        case r.KANJI:
          return new i(p);
        case r.BYTE:
          return new n(p);
      }
    }
    e.fromArray = function(C) {
      return C.reduce(function(B, k) {
        return typeof k == "string" ? B.push(A(k, null)) : k.data && B.push(A(k.data, k.mode)), B;
      }, []);
    }, e.fromString = function(C, B) {
      const k = m(C, l.isKanjiModeEnabled()), E = u(k), w = N(E, B), b = c.find_path(w.map, "start", "end"), S = [];
      for (let v = 1; v < b.length - 1; v++)
        S.push(w.table[b[v]].node);
      return e.fromArray(f(S));
    }, e.rawSplit = function(C) {
      return e.fromArray(
        m(C, l.isKanjiModeEnabled())
      );
    };
  })(Re)), Re;
}
var yt;
function fn() {
  if (yt) return we;
  yt = 1;
  const e = G(), r = Oe(), o = Wt(), t = Zt(), n = Xt(), i = en(), s = tn(), l = _t(), c = rn(), d = on(), h = sn(), m = J(), g = gn();
  function f(w, b) {
    const S = w.size, v = i.getPositions(b);
    for (let M = 0; M < v.length; M++) {
      const P = v[M][0], T = v[M][1];
      for (let _ = -1; _ <= 7; _++)
        if (!(P + _ <= -1 || S <= P + _))
          for (let I = -1; I <= 7; I++)
            T + I <= -1 || S <= T + I || (_ >= 0 && _ <= 6 && (I === 0 || I === 6) || I >= 0 && I <= 6 && (_ === 0 || _ === 6) || _ >= 2 && _ <= 4 && I >= 2 && I <= 4 ? w.set(P + _, T + I, !0, !0) : w.set(P + _, T + I, !1, !0));
    }
  }
  function u(w) {
    const b = w.size;
    for (let S = 8; S < b - 8; S++) {
      const v = S % 2 === 0;
      w.set(S, 6, v, !0), w.set(6, S, v, !0);
    }
  }
  function N(w, b) {
    const S = n.getPositions(b);
    for (let v = 0; v < S.length; v++) {
      const M = S[v][0], P = S[v][1];
      for (let T = -2; T <= 2; T++)
        for (let _ = -2; _ <= 2; _++)
          T === -2 || T === 2 || _ === -2 || _ === 2 || T === 0 && _ === 0 ? w.set(M + T, P + _, !0, !0) : w.set(M + T, P + _, !1, !0);
    }
  }
  function A(w, b) {
    const S = w.size, v = d.getEncodedBits(b);
    let M, P, T;
    for (let _ = 0; _ < 18; _++)
      M = Math.floor(_ / 3), P = _ % 3 + S - 8 - 3, T = (v >> _ & 1) === 1, w.set(M, P, T, !0), w.set(P, M, T, !0);
  }
  function p(w, b, S) {
    const v = w.size, M = h.getEncodedBits(b, S);
    let P, T;
    for (P = 0; P < 15; P++)
      T = (M >> P & 1) === 1, P < 6 ? w.set(P, 8, T, !0) : P < 8 ? w.set(P + 1, 8, T, !0) : w.set(v - 15 + P, 8, T, !0), P < 8 ? w.set(8, v - P - 1, T, !0) : P < 9 ? w.set(8, 15 - P - 1 + 1, T, !0) : w.set(8, 15 - P - 1, T, !0);
    w.set(v - 8, 8, 1, !0);
  }
  function C(w, b) {
    const S = w.size;
    let v = -1, M = S - 1, P = 7, T = 0;
    for (let _ = S - 1; _ > 0; _ -= 2)
      for (_ === 6 && _--; ; ) {
        for (let I = 0; I < 2; I++)
          if (!w.isReserved(M, _ - I)) {
            let O = !1;
            T < b.length && (O = (b[T] >>> P & 1) === 1), w.set(M, _ - I, O), P--, P === -1 && (T++, P = 7);
          }
        if (M += v, M < 0 || S <= M) {
          M -= v, v = -v;
          break;
        }
      }
  }
  function B(w, b, S) {
    const v = new o();
    S.forEach(function(I) {
      v.put(I.mode.bit, 4), v.put(I.getLength(), m.getCharCountIndicator(I.mode, w)), I.write(v);
    });
    const M = e.getSymbolTotalCodewords(w), P = l.getTotalCodewordsCount(w, b), T = (M - P) * 8;
    for (v.getLengthInBits() + 4 <= T && v.put(0, 4); v.getLengthInBits() % 8 !== 0; )
      v.putBit(0);
    const _ = (T - v.getLengthInBits()) / 8;
    for (let I = 0; I < _; I++)
      v.put(I % 2 ? 17 : 236, 8);
    return k(v, w, b);
  }
  function k(w, b, S) {
    const v = e.getSymbolTotalCodewords(b), M = l.getTotalCodewordsCount(b, S), P = v - M, T = l.getBlocksCount(b, S), _ = v % T, I = T - _, O = Math.floor(v / T), ee = Math.floor(P / T), Ht = ee + 1, He = O - ee, Kt = new c(He);
    let fe = 0;
    const ae = new Array(T), Ke = new Array(T);
    let pe = 0;
    const Gt = new Uint8Array(w.buffer);
    for (let Y = 0; Y < T; Y++) {
      const ye = Y < I ? ee : Ht;
      ae[Y] = Gt.slice(fe, fe + ye), Ke[Y] = Kt.encode(ae[Y]), fe += ye, pe = Math.max(pe, ye);
    }
    const me = new Uint8Array(v);
    let Ge = 0, U, z;
    for (U = 0; U < pe; U++)
      for (z = 0; z < T; z++)
        U < ae[z].length && (me[Ge++] = ae[z][U]);
    for (U = 0; U < He; U++)
      for (z = 0; z < T; z++)
        me[Ge++] = Ke[z][U];
    return me;
  }
  function E(w, b, S, v) {
    let M;
    if (Array.isArray(w))
      M = g.fromArray(w);
    else if (typeof w == "string") {
      let O = b;
      if (!O) {
        const ee = g.rawSplit(w);
        O = d.getBestVersionForData(ee, S);
      }
      M = g.fromString(w, O || 40);
    } else
      throw new Error("Invalid data");
    const P = d.getBestVersionForData(M, S);
    if (!P)
      throw new Error("The amount of data is too big to be stored in a QR Code");
    if (!b)
      b = P;
    else if (b < P)
      throw new Error(
        `
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: ` + P + `.
`
      );
    const T = B(b, S, M), _ = e.getSymbolSize(b), I = new t(_);
    return f(I, b), u(I), N(I, b), p(I, S, 0), b >= 7 && A(I, b), C(I, T), isNaN(v) && (v = s.getBestMask(
      I,
      p.bind(null, I, S)
    )), s.applyMask(v, I), p(I, S, v), {
      modules: I,
      version: b,
      errorCorrectionLevel: S,
      maskPattern: v,
      segments: M
    };
  }
  return we.create = function(b, S) {
    if (typeof b > "u" || b === "")
      throw new Error("No input text");
    let v = r.M, M, P;
    return typeof S < "u" && (v = r.from(S.errorCorrectionLevel, r.M), M = d.from(S.version), P = s.from(S.maskPattern), S.toSJISFunc && e.setToSJISFunction(S.toSJISFunc)), E(b, M, v, P);
  }, we;
}
var Fe = {}, Ue = {}, bt;
function Mt() {
  return bt || (bt = 1, (function(e) {
    function r(o) {
      if (typeof o == "number" && (o = o.toString()), typeof o != "string")
        throw new Error("Color should be defined as hex string");
      let t = o.slice().replace("#", "").split("");
      if (t.length < 3 || t.length === 5 || t.length > 8)
        throw new Error("Invalid hex color: " + o);
      (t.length === 3 || t.length === 4) && (t = Array.prototype.concat.apply([], t.map(function(i) {
        return [i, i];
      }))), t.length === 6 && t.push("F", "F");
      const n = parseInt(t.join(""), 16);
      return {
        r: n >> 24 & 255,
        g: n >> 16 & 255,
        b: n >> 8 & 255,
        a: n & 255,
        hex: "#" + t.slice(0, 6).join("")
      };
    }
    e.getOptions = function(t) {
      t || (t = {}), t.color || (t.color = {});
      const n = typeof t.margin > "u" || t.margin === null || t.margin < 0 ? 4 : t.margin, i = t.width && t.width >= 21 ? t.width : void 0, s = t.scale || 4;
      return {
        width: i,
        scale: i ? 4 : s,
        margin: n,
        color: {
          dark: r(t.color.dark || "#000000ff"),
          light: r(t.color.light || "#ffffffff")
        },
        type: t.type,
        rendererOpts: t.rendererOpts || {}
      };
    }, e.getScale = function(t, n) {
      return n.width && n.width >= t + n.margin * 2 ? n.width / (t + n.margin * 2) : n.scale;
    }, e.getImageWidth = function(t, n) {
      const i = e.getScale(t, n);
      return Math.floor((t + n.margin * 2) * i);
    }, e.qrToImageData = function(t, n, i) {
      const s = n.modules.size, l = n.modules.data, c = e.getScale(s, i), d = Math.floor((s + i.margin * 2) * c), h = i.margin * c, m = [i.color.light, i.color.dark];
      for (let g = 0; g < d; g++)
        for (let f = 0; f < d; f++) {
          let u = (g * d + f) * 4, N = i.color.light;
          if (g >= h && f >= h && g < d - h && f < d - h) {
            const A = Math.floor((g - h) / c), p = Math.floor((f - h) / c);
            N = m[l[A * s + p] ? 1 : 0];
          }
          t[u++] = N.r, t[u++] = N.g, t[u++] = N.b, t[u] = N.a;
        }
    };
  })(Ue)), Ue;
}
var wt;
function pn() {
  return wt || (wt = 1, (function(e) {
    const r = Mt();
    function o(n, i, s) {
      n.clearRect(0, 0, i.width, i.height), i.style || (i.style = {}), i.height = s, i.width = s, i.style.height = s + "px", i.style.width = s + "px";
    }
    function t() {
      try {
        return document.createElement("canvas");
      } catch {
        throw new Error("You need to specify a canvas element");
      }
    }
    e.render = function(i, s, l) {
      let c = l, d = s;
      typeof c > "u" && (!s || !s.getContext) && (c = s, s = void 0), s || (d = t()), c = r.getOptions(c);
      const h = r.getImageWidth(i.modules.size, c), m = d.getContext("2d"), g = m.createImageData(h, h);
      return r.qrToImageData(g.data, i, c), o(m, d, h), m.putImageData(g, 0, 0), d;
    }, e.renderToDataURL = function(i, s, l) {
      let c = l;
      typeof c > "u" && (!s || !s.getContext) && (c = s, s = void 0), c || (c = {});
      const d = e.render(i, s, c), h = c.type || "image/png", m = c.rendererOpts || {};
      return d.toDataURL(h, m.quality);
    };
  })(Fe)), Fe;
}
var ze = {}, Nt;
function mn() {
  if (Nt) return ze;
  Nt = 1;
  const e = Mt();
  function r(n, i) {
    const s = n.a / 255, l = i + '="' + n.hex + '"';
    return s < 1 ? l + " " + i + '-opacity="' + s.toFixed(2).slice(1) + '"' : l;
  }
  function o(n, i, s) {
    let l = n + i;
    return typeof s < "u" && (l += " " + s), l;
  }
  function t(n, i, s) {
    let l = "", c = 0, d = !1, h = 0;
    for (let m = 0; m < n.length; m++) {
      const g = Math.floor(m % i), f = Math.floor(m / i);
      !g && !d && (d = !0), n[m] ? (h++, m > 0 && g > 0 && n[m - 1] || (l += d ? o("M", g + s, 0.5 + f + s) : o("m", c, 0), c = 0, d = !1), g + 1 < i && n[m + 1] || (l += o("h", h), h = 0)) : c++;
    }
    return l;
  }
  return ze.render = function(i, s, l) {
    const c = e.getOptions(s), d = i.modules.size, h = i.modules.data, m = d + c.margin * 2, g = c.color.light.a ? "<path " + r(c.color.light, "fill") + ' d="M0 0h' + m + "v" + m + 'H0z"/>' : "", f = "<path " + r(c.color.dark, "stroke") + ' d="' + t(h, d, c.margin) + '"/>', u = 'viewBox="0 0 ' + m + " " + m + '"', A = '<svg xmlns="http://www.w3.org/2000/svg" ' + (c.width ? 'width="' + c.width + '" height="' + c.width + '" ' : "") + u + ' shape-rendering="crispEdges">' + g + f + `</svg>
`;
    return typeof l == "function" && l(null, A), A;
  }, ze;
}
var vt;
function yn() {
  if (vt) return Q;
  vt = 1;
  const e = Qt(), r = fn(), o = pn(), t = mn();
  function n(i, s, l, c, d) {
    const h = [].slice.call(arguments, 1), m = h.length, g = typeof h[m - 1] == "function";
    if (!g && !e())
      throw new Error("Callback required as last argument");
    if (g) {
      if (m < 2)
        throw new Error("Too few arguments provided");
      m === 2 ? (d = l, l = s, s = c = void 0) : m === 3 && (s.getContext && typeof d > "u" ? (d = c, c = void 0) : (d = c, c = l, l = s, s = void 0));
    } else {
      if (m < 1)
        throw new Error("Too few arguments provided");
      return m === 1 ? (l = s, s = c = void 0) : m === 2 && !s.getContext && (c = l, l = s, s = void 0), new Promise(function(f, u) {
        try {
          const N = r.create(l, c);
          f(i(N, s, c));
        } catch (N) {
          u(N);
        }
      });
    }
    try {
      const f = r.create(l, c);
      d(null, i(f, s, c));
    } catch (f) {
      d(f);
    }
  }
  return Q.create = r.create, Q.toCanvas = n.bind(null, o.render), Q.toDataURL = n.bind(null, o.renderToDataURL), Q.toString = n.bind(null, function(i, s, l) {
    return t.render(i, l);
  }), Q;
}
var bn = yn();
const It = /* @__PURE__ */ Yt(bn), wn = "/api/v1/ext-user/payment-epay", Nn = "/api/v1/ext/payment-epay";
function vn() {
  try {
    return sessionStorage.getItem("token") || "";
  } catch {
    return "";
  }
}
async function $(e, r, o, t) {
  const n = {};
  o !== void 0 && (n["Content-Type"] = "application/json");
  const i = vn();
  i && (n.Authorization = `Bearer ${i}`);
  const s = t != null && t.admin ? Nn : wn, l = await fetch(s + r, {
    method: e,
    headers: n,
    body: o ? JSON.stringify(o) : void 0
  }), c = await l.text();
  let d = null;
  try {
    d = c ? JSON.parse(c) : null;
  } catch {
  }
  if (!l.ok) {
    const m = d, g = (m == null ? void 0 : m.message) || (d == null ? void 0 : d.error) || `HTTP ${l.status}`;
    throw new Error(g);
  }
  const h = d;
  if (h && typeof h == "object" && "code" in h && "data" in h) {
    if (h.code !== 0)
      throw new Error(h.message || "请求失败");
    return h.data;
  }
  return d;
}
const F = {
  // ============ User ============
  /** 列出当前可用的支付方式（PayMethod，不是 Provider） */
  methods: () => $(
    "GET",
    "/user/methods"
  ),
  createOrder: (e) => $("POST", "/user/orders", e),
  listOrders: (e = 50) => $("GET", `/user/orders?limit=${e}`),
  getOrder: (e) => $("GET", `/user/orders/${encodeURIComponent(e)}`),
  // ============ Admin: 订单 ============
  // email 为子串过滤（后端走 ILIKE %x%）；status='all' 或留空表示不过滤
  adminListOrders: (e = {}) => {
    const r = new URLSearchParams();
    return r.set("page", String(e.page ?? 1)), r.set("page_size", String(e.pageSize ?? 20)), e.email && e.email.trim() && r.set("email", e.email.trim()), e.status && e.status !== "all" && r.set("status", e.status), $("GET", `/admin/orders?${r.toString()}`, void 0, { admin: !0 });
  },
  // ============ Admin: Provider 配置 ============
  adminListProviders: () => $("GET", "/admin/providers", void 0, { admin: !0 }),
  adminUpsertProvider: (e) => $("POST", "/admin/providers", e, { admin: !0 }),
  adminDeleteProvider: (e) => $("DELETE", `/admin/providers/${encodeURIComponent(e)}`, void 0, { admin: !0 }),
  adminReloadProviders: () => $("POST", "/admin/providers/reload", {}, { admin: !0 })
};
function ne(...e) {
  return e.filter(Boolean).join(" ");
}
function ue({ children: e }) {
  return /* @__PURE__ */ a("div", { className: "ag-epay-page", children: e });
}
function W({
  label: e,
  value: r,
  tone: o
}) {
  return /* @__PURE__ */ y("div", { className: "ag-epay-metric", "data-tone": o, children: [
    /* @__PURE__ */ a("div", { className: "ag-epay-metric-label", children: e }),
    /* @__PURE__ */ a("div", { className: "ag-epay-metric-value", children: r })
  ] });
}
function j({
  title: e,
  description: r,
  actions: o,
  children: t
}) {
  return /* @__PURE__ */ y("section", { className: "ag-epay-panel", children: [
    e || r || o ? /* @__PURE__ */ y("div", { className: "ag-epay-panel-header", children: [
      /* @__PURE__ */ y("div", { children: [
        e ? /* @__PURE__ */ a("h2", { className: "ag-epay-panel-title", children: e }) : null,
        r ? /* @__PURE__ */ a("p", { className: "ag-epay-panel-description", children: r }) : null
      ] }),
      o ? /* @__PURE__ */ a("div", { className: "ag-epay-toolbar-actions", children: o }) : null
    ] }) : null,
    /* @__PURE__ */ a("div", { className: "ag-epay-panel-body", children: t })
  ] });
}
function L({
  children: e,
  className: r,
  disabled: o,
  iconOnly: t,
  onClick: n,
  title: i,
  type: s = "button",
  variant: l = "secondary"
}) {
  return /* @__PURE__ */ a(
    "button",
    {
      className: ne(
        "ag-epay-button",
        l === "primary" && "ag-epay-button--primary",
        l === "danger" && "ag-epay-button--danger",
        t && "ag-epay-button--icon",
        r
      ),
      disabled: o,
      onClick: n,
      title: i,
      type: s,
      children: e
    }
  );
}
function Rt({
  ariaLabel: e,
  className: r,
  compact: o,
  onChange: t,
  optionClassName: n,
  options: i,
  popoverClassName: s,
  triggerClassName: l,
  value: c
}) {
  const [d, h] = R(!1), m = de(null), g = i.find((f) => f.value === c);
  return D(() => {
    if (!d) return;
    const f = (N) => {
      m.current && !m.current.contains(N.target) && h(!1);
    }, u = (N) => {
      N.key === "Escape" && h(!1);
    };
    return document.addEventListener("mousedown", f), document.addEventListener("keydown", u), () => {
      document.removeEventListener("mousedown", f), document.removeEventListener("keydown", u);
    };
  }, [d]), /* @__PURE__ */ y("div", { ref: m, className: ne("ag-epay-select", o && "ag-epay-select--compact", r), children: [
    /* @__PURE__ */ y(
      "button",
      {
        "aria-expanded": d,
        "aria-haspopup": "listbox",
        "aria-label": e,
        className: ne("ag-epay-control ag-epay-select-trigger", l),
        "data-open": d || void 0,
        onClick: () => h((f) => !f),
        type: "button",
        children: [
          /* @__PURE__ */ a("span", { className: "ag-epay-select-value", children: (g == null ? void 0 : g.label) ?? "" }),
          /* @__PURE__ */ a(Sn, { className: "ag-epay-select-caret" })
        ]
      }
    ),
    d ? /* @__PURE__ */ a("div", { className: ne("ag-epay-select-popover", s), role: "listbox", children: i.map((f) => {
      const u = f.value === c;
      return /* @__PURE__ */ a(
        "button",
        {
          "aria-selected": u,
          className: ne("ag-epay-select-option", n),
          onClick: () => {
            t(f.value), h(!1);
          },
          role: "option",
          type: "button",
          children: f.label
        },
        f.value
      );
    }) }) : null
  ] });
}
function Cn({
  page: e,
  pageSize: r,
  pageSizeOptions: o,
  total: t,
  totalPages: n,
  onPageChange: i,
  onPageSizeChange: s
}) {
  const l = Math.max(n, 1), c = Pt(() => Bn(e, l), [e, l]), d = Math.max(1, e - 1), h = Math.min(l, e + 1);
  return /* @__PURE__ */ y("div", { className: "ag-epay-pagination ag-table-pagination", children: [
    /* @__PURE__ */ y("div", { className: "ag-epay-pagination-summary ag-table-pagination-summary", children: [
      /* @__PURE__ */ a("span", { children: "共" }),
      /* @__PURE__ */ a("span", { className: "ag-epay-pagination-number ag-table-pagination-number", children: t }),
      /* @__PURE__ */ a("span", { children: "条" }),
      /* @__PURE__ */ a("span", { className: "ag-epay-pagination-separator ag-table-pagination-separator" }),
      /* @__PURE__ */ a("span", { children: "第" }),
      /* @__PURE__ */ a("span", { className: "ag-epay-pagination-number ag-table-pagination-number", children: e }),
      /* @__PURE__ */ a("span", { children: "/" }),
      /* @__PURE__ */ a("span", { className: "ag-epay-pagination-number ag-table-pagination-number", children: l }),
      /* @__PURE__ */ a("span", { children: "页" }),
      /* @__PURE__ */ y("span", { className: "ag-epay-page-size ag-table-page-size", children: [
        /* @__PURE__ */ a("span", { children: "每页" }),
        /* @__PURE__ */ a(
          Rt,
          {
            ariaLabel: "每页条数",
            className: "ag-table-page-size-select",
            compact: !0,
            onChange: (m) => s(Number(m)),
            optionClassName: "ag-table-page-size-option",
            options: o.map((m) => ({ value: String(m), label: String(m) })),
            popoverClassName: "ag-table-page-size-popover",
            triggerClassName: "ag-table-page-size-trigger",
            value: String(r)
          }
        ),
        /* @__PURE__ */ a("span", { children: "条" })
      ] })
    ] }),
    /* @__PURE__ */ y("div", { className: "ag-epay-pagination-links pagination__content", children: [
      /* @__PURE__ */ y(
        "button",
        {
          "aria-label": "上一页",
          className: "ag-epay-page-link ag-epay-page-link--nav pagination__link pagination__link--nav",
          onClick: () => i(d),
          type: "button",
          children: [
            /* @__PURE__ */ a(Pn, { className: "ag-epay-icon" }),
            /* @__PURE__ */ a("span", { children: "上一页" })
          ]
        }
      ),
      c.map((m, g) => m === "..." ? /* @__PURE__ */ a("span", { className: "ag-epay-page-ellipsis pagination__ellipsis", children: "..." }, `ellipsis-${g}`) : /* @__PURE__ */ a(
        "button",
        {
          "aria-current": m === e ? "page" : void 0,
          className: "ag-epay-page-link pagination__link",
          "data-active": m === e ? "true" : void 0,
          onClick: () => i(m),
          type: "button",
          children: m
        },
        m
      )),
      /* @__PURE__ */ y(
        "button",
        {
          "aria-label": "下一页",
          className: "ag-epay-page-link ag-epay-page-link--nav pagination__link pagination__link--nav",
          onClick: () => i(h),
          type: "button",
          children: [
            /* @__PURE__ */ a("span", { children: "下一页" }),
            /* @__PURE__ */ a(_n, { className: "ag-epay-icon" })
          ]
        }
      )
    ] })
  ] });
}
function le({ children: e, tone: r }) {
  return /* @__PURE__ */ a("span", { className: "ag-epay-status", "data-tone": r, children: e });
}
function he({ methods: e, format: r }) {
  return e.length === 0 ? /* @__PURE__ */ a("span", { className: "ag-epay-text-muted", children: "-" }) : /* @__PURE__ */ a("span", { className: "ag-epay-methods", children: e.map((o) => /* @__PURE__ */ a("span", { className: "ag-epay-method-chip", children: r(o) }, o)) });
}
function q({
  children: e,
  tone: r = "muted"
}) {
  return /* @__PURE__ */ a("div", { className: "ag-epay-table-state", "data-tone": r, children: e });
}
function At({
  amountLabel: e,
  methodLabel: r,
  note: o,
  orderNo: t,
  paymentUrl: n,
  qrDataUrl: i
}) {
  return /* @__PURE__ */ y("div", { className: "ag-epay-qr-panel", children: [
    i ? /* @__PURE__ */ a("img", { className: "ag-epay-qr-image", src: i, alt: "付款二维码" }) : /* @__PURE__ */ a("div", { className: "ag-epay-qr-placeholder", children: "生成二维码中..." }),
    /* @__PURE__ */ a("div", { className: "ag-epay-qr-amount", children: e }),
    /* @__PURE__ */ y("div", { className: "ag-epay-qr-method", children: [
      "请使用 ",
      r,
      " 扫码完成付款"
    ] }),
    /* @__PURE__ */ y("div", { className: "ag-epay-qr-order", children: [
      "订单号：",
      /* @__PURE__ */ a("code", { className: "ag-epay-code", children: t })
    ] }),
    /* @__PURE__ */ a("p", { className: "ag-epay-qr-note", children: o }),
    n ? /* @__PURE__ */ y("p", { className: "ag-epay-qr-link-row", children: [
      "扫码不便？",
      " ",
      /* @__PURE__ */ a("a", { className: "ag-epay-payment-link", href: n, target: "_blank", rel: "noreferrer", children: "点此在新窗口打开付款页" })
    ] }) : null
  ] });
}
function oe({
  children: e,
  description: r,
  footer: o,
  onClose: t,
  title: n
}) {
  return D(() => {
    const i = (s) => {
      s.key === "Escape" && t();
    };
    return document.addEventListener("keydown", i), () => document.removeEventListener("keydown", i);
  }, [t]), /* @__PURE__ */ a("div", { className: "ag-epay-modal-backdrop", onClick: t, children: /* @__PURE__ */ y(
    "div",
    {
      "aria-modal": "true",
      className: "ag-epay-modal",
      onClick: (i) => i.stopPropagation(),
      role: "dialog",
      children: [
        /* @__PURE__ */ y("div", { className: "ag-epay-modal-header", children: [
          /* @__PURE__ */ y("div", { children: [
            /* @__PURE__ */ a("h2", { className: "ag-epay-modal-title", children: n }),
            r ? /* @__PURE__ */ a("p", { className: "ag-epay-modal-description", children: r }) : null
          ] }),
          /* @__PURE__ */ a("button", { "aria-label": "关闭", className: "ag-epay-modal-close", onClick: t, type: "button", children: "x" })
        ] }),
        /* @__PURE__ */ a("div", { className: "ag-epay-modal-body", children: /* @__PURE__ */ a("div", { className: "ag-epay-modal-surface", children: e }) }),
        o ? /* @__PURE__ */ a("div", { className: "ag-epay-modal-footer", children: o }) : null
      ]
    }
  ) });
}
function ce({
  children: e,
  description: r,
  label: o,
  required: t
}) {
  return /* @__PURE__ */ y("div", { className: "ag-epay-field", children: [
    /* @__PURE__ */ y("span", { className: "ag-epay-field-label", children: [
      o,
      t ? /* @__PURE__ */ a("span", { className: "ag-epay-field-required", children: "*" }) : null
    ] }),
    e,
    r ? /* @__PURE__ */ a("span", { className: "ag-epay-field-hint", children: r }) : null
  ] });
}
function Lt({
  checked: e,
  label: r,
  onChange: o
}) {
  return /* @__PURE__ */ y("label", { className: "ag-epay-switch", children: [
    /* @__PURE__ */ a("input", { checked: e, onChange: (t) => o(t.target.checked), type: "checkbox" }),
    /* @__PURE__ */ a("span", { className: "ag-epay-switch-control", "aria-hidden": "true" }),
    /* @__PURE__ */ a("span", { children: r })
  ] });
}
function kn({
  candidates: e,
  format: r,
  onChange: o,
  value: t
}) {
  const n = new Set(t.split(",").map((s) => s.trim()).filter(Boolean)), i = (s) => {
    n.has(s) ? n.delete(s) : n.add(s), o(e.filter((l) => n.has(l)).join(","));
  };
  return e.length === 0 ? /* @__PURE__ */ a("span", { className: "ag-epay-field-hint", children: "该协议没有可选的支付方式" }) : /* @__PURE__ */ a("div", { className: "ag-epay-method-options", children: e.map((s) => /* @__PURE__ */ y("label", { className: "ag-epay-method-option", children: [
    /* @__PURE__ */ a(
      "input",
      {
        checked: n.has(s),
        onChange: () => i(s),
        type: "checkbox"
      }
    ),
    r(s)
  ] }, s)) });
}
function qt({ className: e }) {
  return /* @__PURE__ */ y("svg", { className: e, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", children: [
    /* @__PURE__ */ a("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
    /* @__PURE__ */ a("path", { d: "M21 3v5h-5" }),
    /* @__PURE__ */ a("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
    /* @__PURE__ */ a("path", { d: "M8 16H3v5" })
  ] });
}
function En({ className: e }) {
  return /* @__PURE__ */ y("svg", { className: e, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", children: [
    /* @__PURE__ */ a("path", { d: "M5 12h14" }),
    /* @__PURE__ */ a("path", { d: "M12 5v14" })
  ] });
}
function Sn({ className: e }) {
  return /* @__PURE__ */ a("svg", { className: e, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", children: /* @__PURE__ */ a("path", { d: "m6 9 6 6 6-6" }) });
}
function Pn({ className: e }) {
  return /* @__PURE__ */ a("svg", { className: e, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", children: /* @__PURE__ */ a("path", { d: "m15 18-6-6 6-6" }) });
}
function _n({ className: e }) {
  return /* @__PURE__ */ a("svg", { className: e, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", viewBox: "0 0 24 24", children: /* @__PURE__ */ a("path", { d: "m9 18 6-6-6-6" }) });
}
function Bn(e, r) {
  if (r <= 7) return Array.from({ length: r }, (t, n) => n + 1);
  const o = [1];
  e > 3 && o.push("...");
  for (let t = Math.max(2, e - 1); t <= Math.min(r - 1, e + 1); t += 1)
    o.push(t);
  return e < r - 2 && o.push("..."), o.push(r), o;
}
const Tn = [10, 30, 50, 100, 200, 500];
function Mn() {
  const [e, r] = R([]), [o, t] = R(!0), [n, i] = R(null), [s, l] = R(30), [c, d] = R(""), [h, m] = R(!1), [g, f] = R(null), [u, N] = R(null), [A, p] = R(null), C = de(null);
  D(() => {
    F.methods().then((E) => {
      var w;
      r(E.methods || []), (w = E.methods) != null && w.length && d(E.methods[0].key);
    }).catch((E) => i(Ct(E))).finally(() => t(!1));
  }, []), D(() => {
    if (!u || u.status !== "pending") {
      C.current && (window.clearInterval(C.current), C.current = null);
      return;
    }
    const E = async () => {
      try {
        const w = await F.getOrder(u.out_trade_no);
        N(w);
      } catch {
      }
    };
    return C.current = window.setInterval(E, 3e3), () => {
      C.current && (window.clearInterval(C.current), C.current = null);
    };
  }, [u == null ? void 0 : u.out_trade_no, u == null ? void 0 : u.status]), D(() => {
    if (!u) {
      p(null);
      return;
    }
    const E = u.qr_code_content || u.payment_url;
    if (!E) {
      p(null);
      return;
    }
    let w = !1;
    return It.toDataURL(E, { width: 240, margin: 2, errorCorrectionLevel: "M" }).then((b) => {
      w || p(b);
    }).catch(() => {
      w || p(null);
    }), () => {
      w = !0;
    };
  }, [u == null ? void 0 : u.payment_url, u == null ? void 0 : u.qr_code_content]);
  const B = async () => {
    if (f(null), !c) {
      f("请选择支付方式");
      return;
    }
    if (!s || s <= 0) {
      f("请输入有效金额");
      return;
    }
    m(!0);
    try {
      const E = await F.createOrder({ amount: s, method: c, subject: "AirGate 余额充值" });
      N(E);
    } catch (E) {
      f(Ct(E));
    } finally {
      m(!1);
    }
  }, k = () => {
    N(null), f(null);
  };
  return o ? /* @__PURE__ */ a(K, { children: /* @__PURE__ */ a("div", { className: "ag-epay-user-card", children: /* @__PURE__ */ a(q, { children: "加载中..." }) }) }) : n ? /* @__PURE__ */ a(K, { children: /* @__PURE__ */ a("div", { className: "ag-epay-user-card", children: /* @__PURE__ */ y(q, { tone: "danger", children: [
    "加载支付方式失败: ",
    n
  ] }) }) }) : e.length === 0 ? /* @__PURE__ */ a(K, { children: /* @__PURE__ */ a(j, { title: "账户充值", children: /* @__PURE__ */ a("div", { className: "ag-epay-user-card", children: /* @__PURE__ */ a(q, { children: "充值功能暂未开放，请联系管理员。" }) }) }) }) : u ? u.status === "paid" ? /* @__PURE__ */ a(K, { children: /* @__PURE__ */ a(j, { title: "充值成功", children: /* @__PURE__ */ y("div", { className: "ag-epay-user-card ag-epay-user-card--center", children: [
    /* @__PURE__ */ y("p", { className: "ag-epay-result-message", children: [
      "订单 ",
      /* @__PURE__ */ a("code", { className: "ag-epay-code", children: u.out_trade_no }),
      " 已支付，金额",
      " ",
      /* @__PURE__ */ y("span", { className: "ag-epay-result-amount", children: [
        "¥",
        u.amount.toFixed(2)
      ] }),
      " 已入账。"
    ] }),
    /* @__PURE__ */ a("div", { className: "ag-epay-result-actions", children: /* @__PURE__ */ a(L, { variant: "primary", onClick: k, children: "再次充值" }) })
  ] }) }) }) : u.status === "pending" ? /* @__PURE__ */ a(K, { children: /* @__PURE__ */ a(j, { title: "扫码付款", children: /* @__PURE__ */ y("div", { className: "ag-epay-user-card", children: [
    /* @__PURE__ */ a(
      At,
      {
        amountLabel: `¥ ${u.amount.toFixed(2)}`,
        methodLabel: In(u.method),
        note: "支付完成后本页将自动跳转到结果页（每 3 秒检查一次）",
        orderNo: u.out_trade_no,
        paymentUrl: u.payment_url,
        qrDataUrl: A
      }
    ),
    /* @__PURE__ */ a("div", { className: "ag-epay-result-actions", children: /* @__PURE__ */ a(L, { onClick: k, children: "取消" }) })
  ] }) }) }) : /* @__PURE__ */ a(K, { children: /* @__PURE__ */ a(j, { title: `订单已${Rn(u.status)}`, children: /* @__PURE__ */ y("div", { className: "ag-epay-user-card ag-epay-user-card--center", children: [
    /* @__PURE__ */ y("p", { className: "ag-epay-result-message ag-epay-result-message--muted", children: [
      "订单号：",
      /* @__PURE__ */ a("code", { className: "ag-epay-code", children: u.out_trade_no })
    ] }),
    /* @__PURE__ */ a("div", { className: "ag-epay-result-actions", children: /* @__PURE__ */ a(L, { variant: "primary", onClick: k, children: "重新发起" }) })
  ] }) }) }) : /* @__PURE__ */ a(K, { children: /* @__PURE__ */ a(j, { title: "账户充值", children: /* @__PURE__ */ a("div", { className: "ag-epay-user-card", children: /* @__PURE__ */ y("div", { className: "ag-epay-recharge-form", children: [
    /* @__PURE__ */ y("section", { className: "ag-epay-recharge-section", children: [
      /* @__PURE__ */ a("h3", { className: "ag-epay-section-title", children: "选择金额" }),
      /* @__PURE__ */ a("div", { className: "ag-epay-amount-grid", children: Tn.map((E) => /* @__PURE__ */ y(
        "button",
        {
          "aria-pressed": s === E,
          className: "ag-epay-choice-button",
          "data-selected": s === E ? "true" : void 0,
          onClick: () => l(E),
          type: "button",
          children: [
            "¥",
            E
          ]
        },
        E
      )) }),
      /* @__PURE__ */ a(ce, { label: "自定义金额", children: /* @__PURE__ */ y("div", { className: "ag-epay-amount-input-row", children: [
        /* @__PURE__ */ a(
          "input",
          {
            className: "ag-epay-control ag-epay-input ag-epay-amount-input",
            max: 1e4,
            min: 1,
            onChange: (E) => l(Number(E.target.value)),
            step: 1,
            type: "number",
            value: s
          }
        ),
        /* @__PURE__ */ a("span", { className: "ag-epay-field-unit", children: "元" })
      ] }) })
    ] }),
    /* @__PURE__ */ y("section", { className: "ag-epay-recharge-section", children: [
      /* @__PURE__ */ a("h3", { className: "ag-epay-section-title", children: "选择支付方式" }),
      /* @__PURE__ */ a("div", { className: "ag-epay-method-grid", children: e.map((E) => /* @__PURE__ */ a(
        "button",
        {
          "aria-pressed": c === E.key,
          className: "ag-epay-choice-button ag-epay-method-choice",
          "data-selected": c === E.key ? "true" : void 0,
          onClick: () => d(E.key),
          title: E.description,
          type: "button",
          children: E.label
        },
        E.key
      )) })
    ] }),
    g ? /* @__PURE__ */ a("p", { className: "ag-epay-form-error", children: g }) : null,
    /* @__PURE__ */ a(
      L,
      {
        className: "ag-epay-submit-button",
        disabled: h,
        onClick: B,
        variant: "primary",
        children: h ? "处理中..." : "立即支付"
      }
    )
  ] }) }) }) });
}
function K({ children: e }) {
  return /* @__PURE__ */ a(ue, { children: /* @__PURE__ */ a("div", { className: "ag-epay-page-body ag-epay-user-page-body ag-epay-recharge-page", children: e }) });
}
function In(e) {
  return { alipay: "支付宝", wxpay: "微信支付", qqpay: "QQ 钱包" }[e] || e;
}
function Rn(e) {
  return {
    expired: "过期",
    failed: "失败",
    cancelled: "取消",
    refunded: "退款"
  }[e] || e;
}
function Ct(e) {
  return e instanceof Error ? e.message : String(e);
}
function An() {
  const [e, r] = R([]), [o, t] = R(!0), [n, i] = R(null), [s, l] = R(null), [c, d] = R(null), h = de(null), m = () => {
    t(!0), F.listOrders(100).then((u) => r(u.list || [])).catch((u) => i(xn(u))).finally(() => t(!1));
  };
  return D(m, []), D(() => {
    if (!s) {
      d(null);
      return;
    }
    const u = s.qr_code_content || s.payment_url;
    if (!u) {
      d(null);
      return;
    }
    let N = !1;
    return It.toDataURL(u, { width: 240, margin: 2, errorCorrectionLevel: "M" }).then((A) => {
      N || d(A);
    }).catch(() => {
      N || d(null);
    }), () => {
      N = !0;
    };
  }, [s == null ? void 0 : s.payment_url, s == null ? void 0 : s.qr_code_content]), D(() => {
    if (!s || s.status !== "pending") {
      h.current && (window.clearInterval(h.current), h.current = null);
      return;
    }
    return h.current = window.setInterval(async () => {
      try {
        const u = await F.getOrder(s.out_trade_no);
        l(u), u.status !== "pending" && m();
      } catch {
      }
    }, 3e3), () => {
      h.current && (window.clearInterval(h.current), h.current = null);
    };
  }, [s == null ? void 0 : s.out_trade_no, s == null ? void 0 : s.status]), /* @__PURE__ */ a(ue, { children: /* @__PURE__ */ y("div", { className: "ag-epay-page-body ag-epay-user-page-body", children: [
    s ? /* @__PURE__ */ a(
      Ln,
      {
        onClose: () => {
          l(null), d(null);
        },
        order: s,
        qrDataUrl: c
      }
    ) : null,
    /* @__PURE__ */ a(j, { title: "充值记录", children: /* @__PURE__ */ a("div", { className: "ag-epay-table-shell", children: /* @__PURE__ */ a("div", { className: "ag-epay-table-scroll", children: /* @__PURE__ */ y("table", { "aria-label": "充值记录", className: "ag-epay-table ag-epay-user-orders-table", "data-slot": "table", children: [
      /* @__PURE__ */ a("thead", { "data-slot": "thead", children: /* @__PURE__ */ y("tr", { "data-slot": "tr", children: [
        /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "订单号" }),
        /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "金额" }),
        /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "支付方式" }),
        /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "状态" }),
        /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "创建时间" }),
        /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "支付时间" }),
        /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "操作" })
      ] }) }),
      /* @__PURE__ */ a("tbody", { "data-slot": "tbody", children: qn({
        err: n,
        loading: o,
        onContinuePay: (u) => {
          l(u);
        },
        orders: e
      }) })
    ] }) }) }) })
  ] }) });
}
function Ln({
  onClose: e,
  order: r,
  qrDataUrl: o
}) {
  return r.status === "paid" ? /* @__PURE__ */ a(
    oe,
    {
      footer: /* @__PURE__ */ a(L, { variant: "primary", onClick: e, children: "关闭" }),
      onClose: e,
      title: "支付成功",
      children: /* @__PURE__ */ y("p", { className: "ag-epay-result-message", children: [
        "订单 ",
        /* @__PURE__ */ a("code", { className: "ag-epay-code", children: r.out_trade_no }),
        " 已支付",
        " ",
        /* @__PURE__ */ y("span", { className: "ag-epay-result-amount", children: [
          "¥",
          r.amount.toFixed(2)
        ] })
      ] })
    }
  ) : r.status === "pending" ? /* @__PURE__ */ a(
    oe,
    {
      footer: /* @__PURE__ */ a(L, { onClick: e, children: "取消" }),
      onClose: e,
      title: "扫码付款",
      children: /* @__PURE__ */ a(
        At,
        {
          amountLabel: `¥ ${r.amount.toFixed(2)}`,
          methodLabel: Dt(r.method),
          note: "支付完成后将自动刷新（每 3 秒检查一次）",
          orderNo: r.out_trade_no,
          paymentUrl: r.payment_url,
          qrDataUrl: o
        }
      )
    }
  ) : /* @__PURE__ */ a(
    oe,
    {
      footer: /* @__PURE__ */ a(L, { variant: "primary", onClick: e, children: "关闭" }),
      onClose: e,
      title: `订单已${xt(r.status)}`,
      children: /* @__PURE__ */ a("p", { className: "ag-epay-result-message ag-epay-result-message--muted", children: "该订单无法继续支付，请重新发起充值。" })
    }
  );
}
function qn({
  err: e,
  loading: r,
  onContinuePay: o,
  orders: t
}) {
  return e ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 7, "data-slot": "td", children: /* @__PURE__ */ y(q, { tone: "danger", children: [
    "加载失败: ",
    e
  ] }) }) }) : r && t.length === 0 ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 7, "data-slot": "td", children: /* @__PURE__ */ a(q, { children: "加载中..." }) }) }) : t.length === 0 ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 7, "data-slot": "td", children: /* @__PURE__ */ a(q, { children: "暂无充值记录" }) }) }) : t.map((n) => {
    const i = n.status === "pending" && !!(n.qr_code_content || n.payment_url);
    return /* @__PURE__ */ y("tr", { "data-slot": "tr", children: [
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a("code", { className: "ag-epay-code", children: n.out_trade_no }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ y("span", { className: "ag-epay-amount", children: [
        "¥",
        n.amount.toFixed(2)
      ] }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a(he, { format: Dt, methods: [n.method].filter(Boolean) }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a(le, { tone: Dn(n.status), children: xt(n.status) }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a("span", { className: "ag-epay-code", children: kt(n.created_at) }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: n.paid_at ? /* @__PURE__ */ a("span", { className: "ag-epay-code", children: kt(n.paid_at) }) : /* @__PURE__ */ a("span", { className: "ag-epay-text-muted", children: "-" }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: i ? /* @__PURE__ */ a(L, { onClick: () => o(n), children: "继续支付" }) : /* @__PURE__ */ a("span", { className: "ag-epay-text-muted", children: "-" }) })
    ] }, n.id);
  });
}
function Dt(e) {
  return { alipay: "支付宝", wxpay: "微信支付", qqpay: "QQ 钱包" }[e] || e || "-";
}
function xt(e) {
  return {
    pending: "待支付",
    paid: "已支付",
    expired: "已过期",
    failed: "失败",
    cancelled: "已取消",
    refunded: "已退款"
  }[e] || e;
}
function Dn(e) {
  return {
    pending: "warning",
    paid: "success",
    expired: "muted",
    failed: "danger",
    cancelled: "muted",
    refunded: "muted"
  }[e] || "muted";
}
function kt(e) {
  try {
    return new Date(e).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return e;
  }
}
function xn(e) {
  return e instanceof Error ? e.message : String(e);
}
const Et = {
  total: 0,
  paid: 0,
  pending: 0,
  expired: 0,
  failed: 0,
  cancelled: 0,
  refunded: 0,
  total_amount_paid: 0,
  today_amount_paid: 0
}, X = [20, 50, 100], Ft = "payment-epay.admin-orders.page-size", Fn = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
  { value: "expired", label: "已过期" },
  { value: "failed", label: "失败" },
  { value: "cancelled", label: "已取消" },
  { value: "refunded", label: "已退款" }
];
function Un() {
  const [e, r] = R([]), [o, t] = R(0), [n, i] = R(Et), [s, l] = R(!0), [c, d] = R(null), [h, m] = R("all"), [g, f] = R(""), [u, N] = R(1), [A, p] = R(Hn), C = Z(() => {
    l(!0), d(null), F.adminListOrders({ page: u, pageSize: A, email: g, status: h }).then((b) => {
      r(b.list || []), t(b.total || 0), i(b.stats || Et);
    }).catch((b) => d(jn(b))).finally(() => l(!1));
  }, [g, u, A, h]);
  D(() => {
    const S = setTimeout(C, g ? 300 : 0);
    return () => clearTimeout(S);
  }, [g, C]);
  const B = Math.max(1, Math.ceil(o / A)), k = (b) => {
    m(b), N(1);
  }, E = (b) => {
    f(b), N(1);
  }, w = (b) => {
    X.includes(b) && (p(b), Kn(b), N(1));
  };
  return /* @__PURE__ */ a(ue, { children: /* @__PURE__ */ y("div", { className: "ag-epay-page-body", children: [
    /* @__PURE__ */ y("div", { className: "ag-epay-metrics-grid", children: [
      /* @__PURE__ */ a(W, { label: "总订单数", value: ie(n.total) }),
      /* @__PURE__ */ a(W, { label: "已支付", value: ie(n.paid), tone: "success" }),
      /* @__PURE__ */ a(W, { label: "待支付", value: ie(n.pending), tone: "warning" }),
      /* @__PURE__ */ a(W, { label: "已过期", value: ie(n.expired) }),
      /* @__PURE__ */ a(W, { label: "累计收款", value: $e(n.total_amount_paid), tone: "success" }),
      /* @__PURE__ */ a(W, { label: "今日收款", value: $e(n.today_amount_paid), tone: "success" })
    ] }),
    /* @__PURE__ */ y("section", { className: "ag-epay-panel", children: [
      /* @__PURE__ */ y("div", { className: "ag-epay-toolbar", children: [
        /* @__PURE__ */ y("div", { className: "ag-epay-toolbar-group", children: [
          /* @__PURE__ */ a(
            Rt,
            {
              ariaLabel: "订单状态",
              onChange: k,
              options: Fn,
              value: h
            }
          ),
          /* @__PURE__ */ a(
            "input",
            {
              className: "ag-epay-control ag-epay-input ag-epay-email-filter",
              onChange: (b) => E(b.target.value),
              placeholder: "搜索用户邮箱",
              type: "text",
              value: g
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "ag-epay-toolbar-actions", children: /* @__PURE__ */ a(L, { disabled: s, iconOnly: !0, onClick: C, title: "刷新", children: /* @__PURE__ */ a(qt, { className: s ? "ag-epay-icon ag-epay-spin" : "ag-epay-icon" }) }) })
      ] }),
      /* @__PURE__ */ y("div", { className: "ag-epay-table-frame", children: [
        /* @__PURE__ */ a("div", { className: "ag-epay-table-shell", children: /* @__PURE__ */ a("div", { className: "ag-epay-table-scroll", children: /* @__PURE__ */ y("table", { "aria-label": "支付订单", className: "ag-epay-table ag-epay-orders-table", "data-slot": "table", children: [
          /* @__PURE__ */ a("thead", { "data-slot": "thead", children: /* @__PURE__ */ y("tr", { "data-slot": "tr", children: [
            /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "订单号" }),
            /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "用户邮箱" }),
            /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "金额" }),
            /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "支付方式" }),
            /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "服务商" }),
            /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "状态" }),
            /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "创建时间" }),
            /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "支付时间" })
          ] }) }),
          /* @__PURE__ */ a("tbody", { "data-slot": "tbody", children: zn({ err: c, list: e, loading: s }) })
        ] }) }) }),
        /* @__PURE__ */ a("div", { className: "ag-epay-table-footer table__footer", "data-slot": "table-footer", children: /* @__PURE__ */ a(
          Cn,
          {
            onPageChange: N,
            onPageSizeChange: w,
            page: u,
            pageSize: A,
            pageSizeOptions: X,
            total: o,
            totalPages: B
          }
        ) })
      ] })
    ] })
  ] }) });
}
function zn({
  err: e,
  list: r,
  loading: o
}) {
  return e ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 8, "data-slot": "td", children: /* @__PURE__ */ y(q, { tone: "danger", children: [
    "加载失败: ",
    e
  ] }) }) }) : o && r.length === 0 ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 8, "data-slot": "td", children: /* @__PURE__ */ a(q, { children: "加载中..." }) }) }) : r.length === 0 ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 8, "data-slot": "td", children: /* @__PURE__ */ a(q, { children: "暂无订单" }) }) }) : r.map((t) => /* @__PURE__ */ y("tr", { "data-slot": "tr", children: [
    /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a("code", { className: "ag-epay-code", children: t.out_trade_no }) }),
    /* @__PURE__ */ a("td", { "data-slot": "td", children: t.user_email ? /* @__PURE__ */ a("span", { children: t.user_email }) : /* @__PURE__ */ y("span", { className: "ag-epay-text-muted", children: [
      "#",
      t.user_id
    ] }) }),
    /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a("span", { className: "ag-epay-amount", children: $e(t.amount) }) }),
    /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a(he, { format: $n, methods: [t.method].filter(Boolean) }) }),
    /* @__PURE__ */ a("td", { "data-slot": "td", children: t.provider_id ? /* @__PURE__ */ a("code", { className: "ag-epay-code", children: t.provider_id }) : /* @__PURE__ */ a("span", { className: "ag-epay-text-muted", children: "-" }) }),
    /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a(le, { tone: Vn(t.status), children: On(t.status) }) }),
    /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a("span", { className: "ag-epay-code", children: St(t.created_at) }) }),
    /* @__PURE__ */ a("td", { "data-slot": "td", children: t.paid_at ? /* @__PURE__ */ a("span", { className: "ag-epay-code", children: St(t.paid_at) }) : /* @__PURE__ */ a("span", { className: "ag-epay-text-muted", children: "-" }) })
  ] }, t.id));
}
function $n(e) {
  return { alipay: "支付宝", wxpay: "微信支付", qqpay: "QQ 钱包" }[e] || e || "-";
}
function On(e) {
  return {
    pending: "待支付",
    paid: "已支付",
    expired: "已过期",
    failed: "失败",
    cancelled: "已取消",
    refunded: "已退款"
  }[e] || e;
}
function Vn(e) {
  return {
    pending: "warning",
    paid: "success",
    expired: "muted",
    failed: "danger",
    cancelled: "muted",
    refunded: "muted"
  }[e] || "muted";
}
function $e(e) {
  return `¥${e.toFixed(2)}`;
}
function ie(e) {
  return e.toLocaleString("zh-CN");
}
function St(e) {
  try {
    return new Date(e).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return e;
  }
}
function jn(e) {
  return e instanceof Error ? e.message : String(e);
}
function Hn() {
  if (typeof window > "u") return X[0];
  try {
    const e = Number(window.localStorage.getItem(Ft));
    return X.includes(e) ? e : X[0];
  } catch {
    return X[0];
  }
}
function Kn(e) {
  try {
    window.localStorage.setItem(Ft, String(e));
  } catch {
  }
}
const Ut = {
  primary: "oklch(0.9848 0 0)",
  primaryForeground: "oklch(15% 0.0000 0.00)",
  primaryHover: "color-mix(in oklab, oklch(0.9848 0 0) 88%, oklch(15% 0.0000 0.00) 12%)",
  primarySubtle: "color-mix(in oklab, oklch(0.9848 0 0) 14%, transparent)",
  primaryGlow: "color-mix(in oklab, oklch(0.9848 0 0) 22%, transparent)",
  success: "oklch(73.29% 0.1935 120.35)",
  successForeground: "oklch(21.03% 0.0059 120.35)",
  successSubtle: "color-mix(in oklab, oklch(73.29% 0.1935 120.35) 15%, transparent)",
  warning: "oklch(0.8803 0.1348 86.06)",
  warningForeground: "oklch(15% 0.0404 86.06)",
  warningSubtle: "color-mix(in oklab, oklch(0.8803 0.1348 86.06) 15%, transparent)",
  danger: "oklch(0.7044 0.1872 23.19)",
  dangerForeground: "oklch(15% 0.0500 23.19)",
  dangerSubtle: "color-mix(in oklab, oklch(0.7044 0.1872 23.19) 15%, transparent)",
  info: "oklch(0.9848 0 0)",
  infoSubtle: "color-mix(in oklab, oklch(0.9848 0 0) 14%, transparent)",
  defaultBg: "oklch(27.40% 0.0000 0.00)",
  defaultForeground: "oklch(99.11% 0 0)",
  fieldBackground: "oklch(21.03% 0.0000 0.00)",
  fieldForeground: "oklch(99.11% 0.0000 0.00)",
  fieldPlaceholder: "oklch(70.50% 0.0000 0.00)",
  muted: "oklch(70.50% 0.0000 0.00)",
  overlay: "oklch(21.03% 0.0000 0.00)",
  overlayForeground: "oklch(99.11% 0.0000 0.00)",
  scrollbar: "oklch(70.50% 0.0000 0.00)",
  segment: "oklch(39.64% 0.0000 0.00)",
  segmentForeground: "oklch(99.11% 0.0000 0.00)",
  surface: "oklch(21.03% 0.0000 0.00)",
  surfaceForeground: "oklch(99.11% 0.0000 0.00)",
  surfaceSecondary: "oklch(25.70% 0.0000 0.00)",
  surfaceSecondaryForeground: "oklch(99.11% 0.0000 0.00)",
  surfaceTertiary: "oklch(27.21% 0.0000 0.00)",
  surfaceTertiaryForeground: "oklch(99.11% 0.0000 0.00)",
  bgDeep: "oklch(12.00% 0.0000 0.00)",
  bg: "oklch(12.00% 0.0000 0.00)",
  bgElevated: "oklch(21.03% 0.0000 0.00)",
  bgSurface: "oklch(21.03% 0.0000 0.00)",
  bgHover: "oklch(25.70% 0.0000 0.00)",
  bgActive: "oklch(27.21% 0.0000 0.00)",
  border: "oklch(28.00% 0.0000 0.00)",
  borderSubtle: "oklch(25.00% 0.0000 0.00)",
  borderFocus: "oklch(0.9848 0 0)",
  text: "oklch(99.11% 0.0000 0.00)",
  textSecondary: "oklch(70.50% 0.0000 0.00)",
  textTertiary: "oklch(70.50% 0.0000 0.00)",
  textInverse: "oklch(15% 0.0000 0.00)",
  glass: "color-mix(in oklab, oklch(21.03% 0.0000 0.00) 92%, transparent)",
  glassBorder: "oklch(28.00% 0.0000 0.00)",
  shadowSm: "0 0 0 0 transparent inset",
  shadowMd: "0 0 0 0 transparent inset",
  shadowLg: "0 0 1px 0 #ffffff4d inset",
  shadowGlow: "0 0 0 1px color-mix(in oklab, oklch(0.9848 0 0) 18%, transparent)"
}, Gn = {
  radiusSm: "0.25rem",
  radiusMd: "0.25rem",
  radiusLg: "0.25rem",
  radiusXl: "0.25rem",
  fieldRadius: "0.5rem",
  fontSans: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontMono: "'Geist Mono', 'SF Mono', 'Cascadia Code', monospace",
  transition: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  transitionSlow: "400ms cubic-bezier(0.4, 0, 0.2, 1)"
}, Jn = {
  sidebarWidth: "260px",
  sidebarCollapsed: "72px",
  topbarHeight: "64px"
}, Ve = {
  ...Gn,
  ...Jn
}, zt = {
  dark: Ut
};
function Yn(e) {
  return e.replace(/[A-Z]/g, (r) => "-" + r.toLowerCase());
}
function $t(e = "ag") {
  return e.trim() || "ag";
}
function ge(e, r) {
  return `--${e}-${Yn(r)}`;
}
Object.keys(zt.dark).reduce((e, r) => (e[r] = ge("ag", r), e), {});
Object.keys(Ve).reduce((e, r) => (e[r] = ge("ag", r), e), {});
function Ot(e = {}) {
  const r = $t(e.prefix);
  return Object.keys(zt.dark).reduce((o, t) => (o[t] = ge(r, t), o), {});
}
function Vt(e = {}) {
  const r = $t(e.prefix);
  return Object.keys(Ve).reduce((o, t) => (o[t] = ge(r, t), o), {});
}
const Qn = Ot(), Wn = Vt();
function H(e, r = {}) {
  const o = r.prefix ? Ot(r) : Qn, t = r.prefix ? Vt(r) : Wn;
  if (e in o) {
    const i = e;
    return `var(${o[i]}, ${Ut[i]})`;
  }
  const n = e;
  return `var(${t[n]}, ${Ve[n]})`;
}
let Zn = 0;
function Xn() {
  const [e, r] = R([]), o = de(r);
  o.current = r;
  const t = Z((l) => {
    o.current((c) => c.filter((d) => d.id !== l));
  }, []), n = Z((l, c) => {
    const d = Zn++;
    o.current((h) => [...h, { id: d, type: l, text: c }]), setTimeout(() => t(d), 4e3);
  }, [t]), i = Z((l) => n("success", l), [n]), s = Z((l) => n("error", l), [n]);
  return {
    toast: { success: i, error: s },
    Toaster: /* @__PURE__ */ a(ea, { messages: e, onClose: t })
  };
}
function ea({
  messages: e,
  onClose: r
}) {
  return D(() => {
    const o = "airgate-epay-toast-keyframes";
    if (document.getElementById(o)) return;
    const t = document.createElement("style");
    t.id = o, t.textContent = `
@keyframes airgate-epay-toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}`, document.head.appendChild(t);
  }, []), e.length === 0 ? null : /* @__PURE__ */ a("div", { style: na, children: e.map((o) => /* @__PURE__ */ a(ta, { message: o, onClose: () => r(o.id) }, o.id)) });
}
function ta({
  message: e,
  onClose: r
}) {
  const o = e.type === "success", t = H(o ? "success" : "danger"), n = H(o ? "success" : "danger");
  return /* @__PURE__ */ y(
    "div",
    {
      style: {
        ...aa,
        borderColor: n
      },
      children: [
        /* @__PURE__ */ a("span", { style: { ...ra, color: t }, children: o ? "✓" : "✕" }),
        /* @__PURE__ */ a("span", { style: { ...ia, color: H("text") }, children: e.text }),
        /* @__PURE__ */ a("button", { onClick: r, style: oa, "aria-label": "关闭", children: "×" })
      ]
    }
  );
}
const na = {
  position: "fixed",
  top: 20,
  right: 20,
  zIndex: 1e4,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  pointerEvents: "none"
}, aa = {
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 260,
  maxWidth: 400,
  padding: "12px 14px",
  borderRadius: H("radiusLg"),
  border: "1px solid",
  background: H("bgElevated"),
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  animation: "airgate-epay-toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
}, ra = {
  fontSize: 16,
  fontWeight: 700,
  width: 18,
  textAlign: "center",
  flexShrink: 0
}, ia = {
  flex: 1,
  fontSize: 13,
  lineHeight: 1.4
}, oa = {
  flexShrink: 0,
  background: "transparent",
  border: "none",
  color: H("textTertiary"),
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
  width: 18,
  height: 18
};
function jt(e, r) {
  var t;
  const o = window;
  return (t = o.airgate) != null && t.confirm ? o.airgate.confirm(e, r) : Promise.resolve(window.confirm(e));
}
function sa() {
  const [e, r] = R([]), [o, t] = R([]), [n, i] = R(!0), [s, l] = R(null), [c, d] = R(null), { toast: h, Toaster: m } = Xn(), g = Z(() => {
    i(!0), l(null), F.adminListProviders().then((p) => {
      r(p.providers || []), t(p.kinds || []);
    }).catch((p) => l(se(p))).finally(() => i(!1));
  }, []);
  D(() => {
    g();
  }, [g]);
  const f = (p) => {
    d({
      mode: "create",
      id: "",
      kind: p.kind,
      enabled: !0,
      config: ha(p)
    });
  }, u = (p) => {
    d({
      mode: "edit",
      id: p.id,
      originalId: p.id,
      kind: p.kind,
      enabled: p.enabled,
      config: { ...p.config }
    });
  }, N = async (p) => {
    if (await jt(`确认删除服务商 ${p}？此操作无法撤销。`, {
      title: "删除服务商",
      danger: !0
    }))
      try {
        await F.adminDeleteProvider(p), h.success(`已删除 ${p}`), g();
      } catch (B) {
        h.error(`删除失败: ${se(B)}`);
      }
  }, A = async (p) => {
    try {
      await F.adminUpsertProvider({
        id: p.id,
        kind: p.kind,
        enabled: !p.enabled,
        config: p.config
      }), h.success(`${p.id} 已${p.enabled ? "禁用" : "启用"}`), g();
    } catch (C) {
      h.error(`操作失败: ${se(C)}`);
    }
  };
  return /* @__PURE__ */ y(ue, { children: [
    m,
    /* @__PURE__ */ y("div", { className: "ag-epay-page-body", children: [
      /* @__PURE__ */ a(
        j,
        {
          title: "添加服务商",
          description: "同一种服务商类型可创建多个实例，用于多商户号、主备路由或不同支付渠道配置。",
          children: s ? /* @__PURE__ */ y(q, { tone: "danger", children: [
            "加载失败: ",
            s
          ] }) : n && o.length === 0 ? /* @__PURE__ */ a(q, { children: "加载中..." }) : o.length === 0 ? /* @__PURE__ */ a(q, { children: "暂无可添加的服务商类型" }) : /* @__PURE__ */ a("div", { className: "ag-epay-kind-grid", children: o.map((p) => /* @__PURE__ */ y("div", { className: "ag-epay-kind-card", children: [
            /* @__PURE__ */ y("div", { children: [
              /* @__PURE__ */ a("div", { className: "ag-epay-kind-title", children: p.name }),
              /* @__PURE__ */ a("div", { className: "ag-epay-provider-meta", children: p.kind })
            ] }),
            /* @__PURE__ */ a("div", { className: "ag-epay-kind-description", children: p.description }),
            p.technical_detail ? /* @__PURE__ */ a("div", { className: "ag-epay-kind-technical", children: p.technical_detail }) : null,
            /* @__PURE__ */ a(he, { format: je, methods: p.supported_methods }),
            /* @__PURE__ */ y(L, { variant: "primary", onClick: () => f(p), children: [
              /* @__PURE__ */ a(En, { className: "ag-epay-icon" }),
              "添加"
            ] })
          ] }, p.kind)) })
        }
      ),
      /* @__PURE__ */ a(
        j,
        {
          actions: /* @__PURE__ */ a(L, { disabled: n, iconOnly: !0, onClick: g, title: "刷新", children: /* @__PURE__ */ a(qt, { className: n ? "ag-epay-icon ag-epay-spin" : "ag-epay-icon" }) }),
          title: "已配置的服务商实例",
          children: /* @__PURE__ */ a("div", { className: "ag-epay-table-shell", children: /* @__PURE__ */ a("div", { className: "ag-epay-table-scroll", children: /* @__PURE__ */ y("table", { "aria-label": "支付服务商", className: "ag-epay-table ag-epay-providers-table", "data-slot": "table", children: [
            /* @__PURE__ */ a("thead", { "data-slot": "thead", children: /* @__PURE__ */ y("tr", { "data-slot": "tr", children: [
              /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "实例" }),
              /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "类型" }),
              /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "支付方式" }),
              /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "启用状态" }),
              /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "运行状态" }),
              /* @__PURE__ */ a("th", { "data-slot": "th", scope: "col", children: "操作" })
            ] }) }),
            /* @__PURE__ */ a("tbody", { "data-slot": "tbody", children: la({
              err: s,
              loading: n,
              providers: e,
              onDelete: N,
              onEdit: u,
              onToggle: A
            }) })
          ] }) }) })
        }
      ),
      c ? /* @__PURE__ */ a(
        ca,
        {
          editing: c,
          kinds: o,
          onCancel: () => d(null),
          onError: (p) => h.error(p),
          onSaved: (p) => {
            d(null), h.success(p), g();
          }
        }
      ) : null
    ] })
  ] });
}
function la({
  err: e,
  loading: r,
  onDelete: o,
  onEdit: t,
  onToggle: n,
  providers: i
}) {
  return e ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 6, "data-slot": "td", children: /* @__PURE__ */ y(q, { tone: "danger", children: [
    "加载失败: ",
    e
  ] }) }) }) : r && i.length === 0 ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 6, "data-slot": "td", children: /* @__PURE__ */ a(q, { children: "加载中..." }) }) }) : i.length === 0 ? /* @__PURE__ */ a("tr", { className: "ag-epay-table-empty-row", "data-slot": "tr", children: /* @__PURE__ */ a("td", { colSpan: 6, "data-slot": "td", children: /* @__PURE__ */ a(q, { children: "暂未配置任何服务商" }) }) }) : i.map((s) => {
    const l = s.is_running;
    return /* @__PURE__ */ y("tr", { "data-slot": "tr", children: [
      /* @__PURE__ */ y("td", { "data-slot": "td", children: [
        /* @__PURE__ */ a("div", { className: "ag-epay-provider-name", children: s.name || s.id }),
        /* @__PURE__ */ a("div", { className: "ag-epay-provider-meta", children: s.id })
      ] }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a("code", { className: "ag-epay-code", children: s.kind }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a(he, { format: je, methods: s.supported_methods }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a(le, { tone: s.enabled ? "success" : "muted", children: s.enabled ? "已启用" : "已禁用" }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ a(le, { tone: l ? "success" : s.enabled ? "warning" : "muted", children: l ? "运行中" : s.enabled ? "未就绪" : "未参与" }) }),
      /* @__PURE__ */ a("td", { "data-slot": "td", children: /* @__PURE__ */ y("div", { className: "ag-epay-table-actions", children: [
        /* @__PURE__ */ a(L, { onClick: () => t(s), children: "编辑" }),
        /* @__PURE__ */ a(L, { onClick: () => n(s), children: s.enabled ? "禁用" : "启用" }),
        /* @__PURE__ */ a(L, { variant: "danger", onClick: () => o(s.id), children: "删除" })
      ] }) })
    ] }, s.id);
  });
}
function ca({
  editing: e,
  kinds: r,
  onCancel: o,
  onError: t,
  onSaved: n
}) {
  const [i, s] = R(e), [l, c] = R(!1), d = Pt(() => r.find((g) => g.kind === i.kind), [r, i.kind]), h = (g, f) => {
    s((u) => ({
      ...u,
      config: {
        ...u.config,
        [g]: f
      }
    }));
  }, m = async () => {
    if (!d) {
      t("未知的服务商类型");
      return;
    }
    for (const f of d.field_descriptors)
      if (f.required && !i.config[f.key]) {
        t(`「${f.label}」必填`);
        return;
      }
    const g = i.id.trim();
    if (!(i.mode === "edit" && i.originalId && g !== i.originalId && !await jt(
      `确认将实例 ID 从「${i.originalId}」重命名为「${g}」？

所有历史订单的 provider_id 引用会在事务里同步更新；如果第三方支付平台已有待回调订单，旧回调路径会失效。`,
      { title: "重命名服务商 ID", danger: !0 }
    ))) {
      c(!0);
      try {
        const u = (await F.adminUpsertProvider({
          id: g,
          original_id: i.originalId,
          kind: i.kind,
          enabled: i.enabled,
          config: i.config
        })).id || g;
        n(i.mode === "create" ? `已创建 ${u}` : `已更新 ${u}`);
      } catch (f) {
        t(`保存失败: ${se(f)}`);
      } finally {
        c(!1);
      }
    }
  };
  return /* @__PURE__ */ y(
    oe,
    {
      description: i.mode === "edit" ? "修改服务商凭证、启用状态或实例 ID。修改 ID 会同步更新历史订单引用。" : "配置新的支付服务商实例。实例 ID 可留空，由后端自动生成。",
      footer: /* @__PURE__ */ y(Jt, { children: [
        /* @__PURE__ */ a(L, { disabled: l, onClick: o, children: "取消" }),
        /* @__PURE__ */ a(L, { disabled: l, onClick: m, variant: "primary", children: l ? "保存中..." : "保存" })
      ] }),
      onClose: o,
      title: `${i.mode === "create" ? "添加" : "编辑"}服务商 - ${(d == null ? void 0 : d.name) || i.kind}`,
      children: [
        /* @__PURE__ */ a(
          ce,
          {
            description: i.mode === "edit" ? "可修改。改名时后端会在事务中同步更新所有历史订单的 provider_id 引用。" : "可选。留空自动生成，也可以填写 xunhu_main / xunhu_backup 这类便于识别的名称。",
            label: "实例 ID",
            children: /* @__PURE__ */ a(
              "input",
              {
                className: "ag-epay-control ag-epay-input ag-epay-control--mono",
                onChange: (g) => s({ ...i, id: g.target.value }),
                placeholder: i.mode === "create" ? "留空自动生成" : "",
                type: "text",
                value: i.id
              }
            )
          }
        ),
        /* @__PURE__ */ a(ce, { label: "启用状态", children: /* @__PURE__ */ a(
          Lt,
          {
            checked: i.enabled,
            label: "启用后该实例会参与支付路由",
            onChange: (g) => s({ ...i, enabled: g })
          }
        ) }),
        d == null ? void 0 : d.field_descriptors.map((g) => /* @__PURE__ */ a(
          da,
          {
            field: g,
            meta: d,
            onChange: (f) => h(g.key, f),
            value: i.config[g.key] || ""
          },
          g.key
        ))
      ]
    }
  );
}
function da({
  field: e,
  meta: r,
  onChange: o,
  value: t
}) {
  return /* @__PURE__ */ a(ce, { description: e.description, label: e.label, required: e.required, children: ua({ field: e, meta: r, onChange: o, value: t }) });
}
function ua({
  field: e,
  meta: r,
  onChange: o,
  value: t
}) {
  return e.type === "textarea" ? /* @__PURE__ */ a(
    "textarea",
    {
      className: "ag-epay-control ag-epay-textarea ag-epay-control--mono",
      onChange: (n) => o(n.target.value),
      placeholder: e.placeholder,
      value: t
    }
  ) : e.type === "bool" ? /* @__PURE__ */ a(
    Lt,
    {
      checked: t === "true",
      label: t === "true" ? "已开启" : "已关闭",
      onChange: (n) => o(n ? "true" : "false")
    }
  ) : e.type === "method-multi" ? /* @__PURE__ */ a(
    kn,
    {
      candidates: r.supported_methods,
      format: je,
      onChange: o,
      value: t
    }
  ) : /* @__PURE__ */ a(
    "input",
    {
      className: "ag-epay-control ag-epay-input",
      onChange: (n) => o(n.target.value),
      placeholder: e.placeholder,
      type: e.type === "password" ? "password" : e.type === "number" ? "number" : "text",
      value: t
    }
  );
}
function ha(e) {
  const r = {};
  for (const o of e.field_descriptors)
    r[o.key] = o.type === "bool" ? "false" : "";
  return r;
}
function je(e) {
  return { alipay: "支付宝", wxpay: "微信支付", qqpay: "QQ 钱包" }[e] || e;
}
function se(e) {
  return e instanceof Error ? e.message : String(e);
}
const pa = {
  routes: [
    { path: "/recharge", component: Mn },
    { path: "/orders", component: An },
    { path: "/admin/orders", component: Un },
    { path: "/admin/providers", component: sa }
  ]
};
export {
  pa as default
};
