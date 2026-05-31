import { jsx as c, jsxs as m, Fragment as le } from "react/jsx-runtime";
import { useState as P, useRef as se, useEffect as z, useCallback as Z, useMemo as ln } from "react";
function an(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Q = {}, he, Qe;
function sn() {
  return Qe || (Qe = 1, he = function() {
    return typeof Promise == "function" && Promise.prototype && Promise.prototype.then;
  }), he;
}
var pe = {}, W = {}, Xe;
function G() {
  if (Xe) return W;
  Xe = 1;
  let e;
  const i = [
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
  return W.getSymbolSize = function(r) {
    if (!r) throw new Error('"version" cannot be null or undefined');
    if (r < 1 || r > 40) throw new Error('"version" should be in range from 1 to 40');
    return r * 4 + 17;
  }, W.getSymbolTotalCodewords = function(r) {
    return i[r];
  }, W.getBCHDigit = function(l) {
    let r = 0;
    for (; l !== 0; )
      r++, l >>>= 1;
    return r;
  }, W.setToSJISFunction = function(r) {
    if (typeof r != "function")
      throw new Error('"toSJISFunc" is not a valid function.');
    e = r;
  }, W.isKanjiModeEnabled = function() {
    return typeof e < "u";
  }, W.toSJIS = function(r) {
    return e(r);
  }, W;
}
var ye = {}, Ze;
function Ve() {
  return Ze || (Ze = 1, (function(e) {
    e.L = { bit: 1 }, e.M = { bit: 0 }, e.Q = { bit: 3 }, e.H = { bit: 2 };
    function i(l) {
      if (typeof l != "string")
        throw new Error("Param is not a string");
      switch (l.toLowerCase()) {
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
          throw new Error("Unknown EC Level: " + l);
      }
    }
    e.isValid = function(r) {
      return r && typeof r.bit < "u" && r.bit >= 0 && r.bit < 4;
    }, e.from = function(r, n) {
      if (e.isValid(r))
        return r;
      try {
        return i(r);
      } catch {
        return n;
      }
    };
  })(ye)), ye;
}
var me, et;
function cn() {
  if (et) return me;
  et = 1;
  function e() {
    this.buffer = [], this.length = 0;
  }
  return e.prototype = {
    get: function(i) {
      const l = Math.floor(i / 8);
      return (this.buffer[l] >>> 7 - i % 8 & 1) === 1;
    },
    put: function(i, l) {
      for (let r = 0; r < l; r++)
        this.putBit((i >>> l - r - 1 & 1) === 1);
    },
    getLengthInBits: function() {
      return this.length;
    },
    putBit: function(i) {
      const l = Math.floor(this.length / 8);
      this.buffer.length <= l && this.buffer.push(0), i && (this.buffer[l] |= 128 >>> this.length % 8), this.length++;
    }
  }, me = e, me;
}
var be, tt;
function dn() {
  if (tt) return be;
  tt = 1;
  function e(i) {
    if (!i || i < 1)
      throw new Error("BitMatrix size must be defined and greater than 0");
    this.size = i, this.data = new Uint8Array(i * i), this.reservedBit = new Uint8Array(i * i);
  }
  return e.prototype.set = function(i, l, r, n) {
    const t = i * this.size + l;
    this.data[t] = r, n && (this.reservedBit[t] = !0);
  }, e.prototype.get = function(i, l) {
    return this.data[i * this.size + l];
  }, e.prototype.xor = function(i, l, r) {
    this.data[i * this.size + l] ^= r;
  }, e.prototype.isReserved = function(i, l) {
    return this.reservedBit[i * this.size + l];
  }, be = e, be;
}
var Se = {}, nt;
function un() {
  return nt || (nt = 1, (function(e) {
    const i = G().getSymbolSize;
    e.getRowColCoords = function(r) {
      if (r === 1) return [];
      const n = Math.floor(r / 7) + 2, t = i(r), a = t === 145 ? 26 : Math.ceil((t - 13) / (2 * n - 2)) * 2, s = [t - 7];
      for (let d = 1; d < n - 1; d++)
        s[d] = s[d - 1] - a;
      return s.push(6), s.reverse();
    }, e.getPositions = function(r) {
      const n = [], t = e.getRowColCoords(r), a = t.length;
      for (let s = 0; s < a; s++)
        for (let d = 0; d < a; d++)
          s === 0 && d === 0 || // top-left
          s === 0 && d === a - 1 || // bottom-left
          s === a - 1 && d === 0 || n.push([t[s], t[d]]);
      return n;
    };
  })(Se)), Se;
}
var xe = {}, rt;
function fn() {
  if (rt) return xe;
  rt = 1;
  const e = G().getSymbolSize, i = 7;
  return xe.getPositions = function(r) {
    const n = e(r);
    return [
      // top-left
      [0, 0],
      // top-right
      [n - i, 0],
      // bottom-left
      [0, n - i]
    ];
  }, xe;
}
var we = {}, ot;
function gn() {
  return ot || (ot = 1, (function(e) {
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
    const i = {
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
      const t = n.size;
      let a = 0, s = 0, d = 0, f = null, p = null;
      for (let h = 0; h < t; h++) {
        s = d = 0, f = p = null;
        for (let y = 0; y < t; y++) {
          let S = n.get(h, y);
          S === f ? s++ : (s >= 5 && (a += i.N1 + (s - 5)), f = S, s = 1), S = n.get(y, h), S === p ? d++ : (d >= 5 && (a += i.N1 + (d - 5)), p = S, d = 1);
        }
        s >= 5 && (a += i.N1 + (s - 5)), d >= 5 && (a += i.N1 + (d - 5));
      }
      return a;
    }, e.getPenaltyN2 = function(n) {
      const t = n.size;
      let a = 0;
      for (let s = 0; s < t - 1; s++)
        for (let d = 0; d < t - 1; d++) {
          const f = n.get(s, d) + n.get(s, d + 1) + n.get(s + 1, d) + n.get(s + 1, d + 1);
          (f === 4 || f === 0) && a++;
        }
      return a * i.N2;
    }, e.getPenaltyN3 = function(n) {
      const t = n.size;
      let a = 0, s = 0, d = 0;
      for (let f = 0; f < t; f++) {
        s = d = 0;
        for (let p = 0; p < t; p++)
          s = s << 1 & 2047 | n.get(f, p), p >= 10 && (s === 1488 || s === 93) && a++, d = d << 1 & 2047 | n.get(p, f), p >= 10 && (d === 1488 || d === 93) && a++;
      }
      return a * i.N3;
    }, e.getPenaltyN4 = function(n) {
      let t = 0;
      const a = n.data.length;
      for (let d = 0; d < a; d++) t += n.data[d];
      return Math.abs(Math.ceil(t * 100 / a / 5) - 10) * i.N4;
    };
    function l(r, n, t) {
      switch (r) {
        case e.Patterns.PATTERN000:
          return (n + t) % 2 === 0;
        case e.Patterns.PATTERN001:
          return n % 2 === 0;
        case e.Patterns.PATTERN010:
          return t % 3 === 0;
        case e.Patterns.PATTERN011:
          return (n + t) % 3 === 0;
        case e.Patterns.PATTERN100:
          return (Math.floor(n / 2) + Math.floor(t / 3)) % 2 === 0;
        case e.Patterns.PATTERN101:
          return n * t % 2 + n * t % 3 === 0;
        case e.Patterns.PATTERN110:
          return (n * t % 2 + n * t % 3) % 2 === 0;
        case e.Patterns.PATTERN111:
          return (n * t % 3 + (n + t) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + r);
      }
    }
    e.applyMask = function(n, t) {
      const a = t.size;
      for (let s = 0; s < a; s++)
        for (let d = 0; d < a; d++)
          t.isReserved(d, s) || t.xor(d, s, l(n, d, s));
    }, e.getBestMask = function(n, t) {
      const a = Object.keys(e.Patterns).length;
      let s = 0, d = 1 / 0;
      for (let f = 0; f < a; f++) {
        t(f), e.applyMask(f, n);
        const p = e.getPenaltyN1(n) + e.getPenaltyN2(n) + e.getPenaltyN3(n) + e.getPenaltyN4(n);
        e.applyMask(f, n), p < d && (d = p, s = f);
      }
      return s;
    };
  })(we)), we;
}
var re = {}, it;
function Ft() {
  if (it) return re;
  it = 1;
  const e = Ve(), i = [
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
  ], l = [
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
  return re.getBlocksCount = function(n, t) {
    switch (t) {
      case e.L:
        return i[(n - 1) * 4 + 0];
      case e.M:
        return i[(n - 1) * 4 + 1];
      case e.Q:
        return i[(n - 1) * 4 + 2];
      case e.H:
        return i[(n - 1) * 4 + 3];
      default:
        return;
    }
  }, re.getTotalCodewordsCount = function(n, t) {
    switch (t) {
      case e.L:
        return l[(n - 1) * 4 + 0];
      case e.M:
        return l[(n - 1) * 4 + 1];
      case e.Q:
        return l[(n - 1) * 4 + 2];
      case e.H:
        return l[(n - 1) * 4 + 3];
      default:
        return;
    }
  }, re;
}
var ve = {}, te = {}, lt;
function hn() {
  if (lt) return te;
  lt = 1;
  const e = new Uint8Array(512), i = new Uint8Array(256);
  return (function() {
    let r = 1;
    for (let n = 0; n < 255; n++)
      e[n] = r, i[r] = n, r <<= 1, r & 256 && (r ^= 285);
    for (let n = 255; n < 512; n++)
      e[n] = e[n - 255];
  })(), te.log = function(r) {
    if (r < 1) throw new Error("log(" + r + ")");
    return i[r];
  }, te.exp = function(r) {
    return e[r];
  }, te.mul = function(r, n) {
    return r === 0 || n === 0 ? 0 : e[i[r] + i[n]];
  }, te;
}
var at;
function pn() {
  return at || (at = 1, (function(e) {
    const i = hn();
    e.mul = function(r, n) {
      const t = new Uint8Array(r.length + n.length - 1);
      for (let a = 0; a < r.length; a++)
        for (let s = 0; s < n.length; s++)
          t[a + s] ^= i.mul(r[a], n[s]);
      return t;
    }, e.mod = function(r, n) {
      let t = new Uint8Array(r);
      for (; t.length - n.length >= 0; ) {
        const a = t[0];
        for (let d = 0; d < n.length; d++)
          t[d] ^= i.mul(n[d], a);
        let s = 0;
        for (; s < t.length && t[s] === 0; ) s++;
        t = t.slice(s);
      }
      return t;
    }, e.generateECPolynomial = function(r) {
      let n = new Uint8Array([1]);
      for (let t = 0; t < r; t++)
        n = e.mul(n, new Uint8Array([1, i.exp(t)]));
      return n;
    };
  })(ve)), ve;
}
var Ce, st;
function yn() {
  if (st) return Ce;
  st = 1;
  const e = pn();
  function i(l) {
    this.genPoly = void 0, this.degree = l, this.degree && this.initialize(this.degree);
  }
  return i.prototype.initialize = function(r) {
    this.degree = r, this.genPoly = e.generateECPolynomial(this.degree);
  }, i.prototype.encode = function(r) {
    if (!this.genPoly)
      throw new Error("Encoder not initialized");
    const n = new Uint8Array(r.length + this.degree);
    n.set(r);
    const t = e.mod(n, this.genPoly), a = this.degree - t.length;
    if (a > 0) {
      const s = new Uint8Array(this.degree);
      return s.set(t, a), s;
    }
    return t;
  }, Ce = i, Ce;
}
var ke = {}, Te = {}, Ee = {}, ct;
function qt() {
  return ct || (ct = 1, Ee.isValid = function(i) {
    return !isNaN(i) && i >= 1 && i <= 40;
  }), Ee;
}
var N = {}, dt;
function Ut() {
  if (dt) return N;
  dt = 1;
  const e = "[0-9]+", i = "[A-Z $%*+\\-./:]+";
  let l = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
  l = l.replace(/u/g, "\\u");
  const r = "(?:(?![A-Z0-9 $%*+\\-./:]|" + l + `)(?:.|[\r
]))+`;
  N.KANJI = new RegExp(l, "g"), N.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g"), N.BYTE = new RegExp(r, "g"), N.NUMERIC = new RegExp(e, "g"), N.ALPHANUMERIC = new RegExp(i, "g");
  const n = new RegExp("^" + l + "$"), t = new RegExp("^" + e + "$"), a = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
  return N.testKanji = function(d) {
    return n.test(d);
  }, N.testNumeric = function(d) {
    return t.test(d);
  }, N.testAlphanumeric = function(d) {
    return a.test(d);
  }, N;
}
var ut;
function J() {
  return ut || (ut = 1, (function(e) {
    const i = qt(), l = Ut();
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
    }, e.getCharCountIndicator = function(t, a) {
      if (!t.ccBits) throw new Error("Invalid mode: " + t);
      if (!i.isValid(a))
        throw new Error("Invalid version: " + a);
      return a >= 1 && a < 10 ? t.ccBits[0] : a < 27 ? t.ccBits[1] : t.ccBits[2];
    }, e.getBestModeForData = function(t) {
      return l.testNumeric(t) ? e.NUMERIC : l.testAlphanumeric(t) ? e.ALPHANUMERIC : l.testKanji(t) ? e.KANJI : e.BYTE;
    }, e.toString = function(t) {
      if (t && t.id) return t.id;
      throw new Error("Invalid mode");
    }, e.isValid = function(t) {
      return t && t.bit && t.ccBits;
    };
    function r(n) {
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
    e.from = function(t, a) {
      if (e.isValid(t))
        return t;
      try {
        return r(t);
      } catch {
        return a;
      }
    };
  })(Te)), Te;
}
var ft;
function mn() {
  return ft || (ft = 1, (function(e) {
    const i = G(), l = Ft(), r = Ve(), n = J(), t = qt(), a = 7973, s = i.getBCHDigit(a);
    function d(y, S, u) {
      for (let C = 1; C <= 40; C++)
        if (S <= e.getCapacity(C, u, y))
          return C;
    }
    function f(y, S) {
      return n.getCharCountIndicator(y, S) + 4;
    }
    function p(y, S) {
      let u = 0;
      return y.forEach(function(C) {
        const L = f(C.mode, S);
        u += L + C.getBitsLength();
      }), u;
    }
    function h(y, S) {
      for (let u = 1; u <= 40; u++)
        if (p(y, u) <= e.getCapacity(u, S, n.MIXED))
          return u;
    }
    e.from = function(S, u) {
      return t.isValid(S) ? parseInt(S, 10) : u;
    }, e.getCapacity = function(S, u, C) {
      if (!t.isValid(S))
        throw new Error("Invalid QR Code version");
      typeof C > "u" && (C = n.BYTE);
      const L = i.getSymbolTotalCodewords(S), g = l.getTotalCodewordsCount(S, u), k = (L - g) * 8;
      if (C === n.MIXED) return k;
      const M = k - f(C, S);
      switch (C) {
        case n.NUMERIC:
          return Math.floor(M / 10 * 3);
        case n.ALPHANUMERIC:
          return Math.floor(M / 11 * 2);
        case n.KANJI:
          return Math.floor(M / 13);
        case n.BYTE:
        default:
          return Math.floor(M / 8);
      }
    }, e.getBestVersionForData = function(S, u) {
      let C;
      const L = r.from(u, r.M);
      if (Array.isArray(S)) {
        if (S.length > 1)
          return h(S, L);
        if (S.length === 0)
          return 1;
        C = S[0];
      } else
        C = S;
      return d(C.mode, C.getLength(), L);
    }, e.getEncodedBits = function(S) {
      if (!t.isValid(S) || S < 7)
        throw new Error("Invalid QR Code version");
      let u = S << 12;
      for (; i.getBCHDigit(u) - s >= 0; )
        u ^= a << i.getBCHDigit(u) - s;
      return S << 12 | u;
    };
  })(ke)), ke;
}
var Be = {}, gt;
function bn() {
  if (gt) return Be;
  gt = 1;
  const e = G(), i = 1335, l = 21522, r = e.getBCHDigit(i);
  return Be.getEncodedBits = function(t, a) {
    const s = t.bit << 3 | a;
    let d = s << 10;
    for (; e.getBCHDigit(d) - r >= 0; )
      d ^= i << e.getBCHDigit(d) - r;
    return (s << 10 | d) ^ l;
  }, Be;
}
var Re = {}, Ie, ht;
function Sn() {
  if (ht) return Ie;
  ht = 1;
  const e = J();
  function i(l) {
    this.mode = e.NUMERIC, this.data = l.toString();
  }
  return i.getBitsLength = function(r) {
    return 10 * Math.floor(r / 3) + (r % 3 ? r % 3 * 3 + 1 : 0);
  }, i.prototype.getLength = function() {
    return this.data.length;
  }, i.prototype.getBitsLength = function() {
    return i.getBitsLength(this.data.length);
  }, i.prototype.write = function(r) {
    let n, t, a;
    for (n = 0; n + 3 <= this.data.length; n += 3)
      t = this.data.substr(n, 3), a = parseInt(t, 10), r.put(a, 10);
    const s = this.data.length - n;
    s > 0 && (t = this.data.substr(n), a = parseInt(t, 10), r.put(a, s * 3 + 1));
  }, Ie = i, Ie;
}
var Me, pt;
function xn() {
  if (pt) return Me;
  pt = 1;
  const e = J(), i = [
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
  function l(r) {
    this.mode = e.ALPHANUMERIC, this.data = r;
  }
  return l.getBitsLength = function(n) {
    return 11 * Math.floor(n / 2) + 6 * (n % 2);
  }, l.prototype.getLength = function() {
    return this.data.length;
  }, l.prototype.getBitsLength = function() {
    return l.getBitsLength(this.data.length);
  }, l.prototype.write = function(n) {
    let t;
    for (t = 0; t + 2 <= this.data.length; t += 2) {
      let a = i.indexOf(this.data[t]) * 45;
      a += i.indexOf(this.data[t + 1]), n.put(a, 11);
    }
    this.data.length % 2 && n.put(i.indexOf(this.data[t]), 6);
  }, Me = l, Me;
}
var Ae, yt;
function wn() {
  if (yt) return Ae;
  yt = 1;
  const e = J();
  function i(l) {
    this.mode = e.BYTE, typeof l == "string" ? this.data = new TextEncoder().encode(l) : this.data = new Uint8Array(l);
  }
  return i.getBitsLength = function(r) {
    return r * 8;
  }, i.prototype.getLength = function() {
    return this.data.length;
  }, i.prototype.getBitsLength = function() {
    return i.getBitsLength(this.data.length);
  }, i.prototype.write = function(l) {
    for (let r = 0, n = this.data.length; r < n; r++)
      l.put(this.data[r], 8);
  }, Ae = i, Ae;
}
var _e, mt;
function vn() {
  if (mt) return _e;
  mt = 1;
  const e = J(), i = G();
  function l(r) {
    this.mode = e.KANJI, this.data = r;
  }
  return l.getBitsLength = function(n) {
    return n * 13;
  }, l.prototype.getLength = function() {
    return this.data.length;
  }, l.prototype.getBitsLength = function() {
    return l.getBitsLength(this.data.length);
  }, l.prototype.write = function(r) {
    let n;
    for (n = 0; n < this.data.length; n++) {
      let t = i.toSJIS(this.data[n]);
      if (t >= 33088 && t <= 40956)
        t -= 33088;
      else if (t >= 57408 && t <= 60351)
        t -= 49472;
      else
        throw new Error(
          "Invalid SJIS character: " + this.data[n] + `
Make sure your charset is UTF-8`
        );
      t = (t >>> 8 & 255) * 192 + (t & 255), r.put(t, 13);
    }
  }, _e = l, _e;
}
var Pe = { exports: {} }, bt;
function Cn() {
  return bt || (bt = 1, (function(e) {
    var i = {
      single_source_shortest_paths: function(l, r, n) {
        var t = {}, a = {};
        a[r] = 0;
        var s = i.PriorityQueue.make();
        s.push(r, 0);
        for (var d, f, p, h, y, S, u, C, L; !s.empty(); ) {
          d = s.pop(), f = d.value, h = d.cost, y = l[f] || {};
          for (p in y)
            y.hasOwnProperty(p) && (S = y[p], u = h + S, C = a[p], L = typeof a[p] > "u", (L || C > u) && (a[p] = u, s.push(p, u), t[p] = f));
        }
        if (typeof n < "u" && typeof a[n] > "u") {
          var g = ["Could not find a path from ", r, " to ", n, "."].join("");
          throw new Error(g);
        }
        return t;
      },
      extract_shortest_path_from_predecessor_list: function(l, r) {
        for (var n = [], t = r; t; )
          n.push(t), l[t], t = l[t];
        return n.reverse(), n;
      },
      find_path: function(l, r, n) {
        var t = i.single_source_shortest_paths(l, r, n);
        return i.extract_shortest_path_from_predecessor_list(
          t,
          n
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(l) {
          var r = i.PriorityQueue, n = {}, t;
          l = l || {};
          for (t in r)
            r.hasOwnProperty(t) && (n[t] = r[t]);
          return n.queue = [], n.sorter = l.sorter || r.default_sorter, n;
        },
        default_sorter: function(l, r) {
          return l.cost - r.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(l, r) {
          var n = { value: l, cost: r };
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
    e.exports = i;
  })(Pe)), Pe.exports;
}
var St;
function kn() {
  return St || (St = 1, (function(e) {
    const i = J(), l = Sn(), r = xn(), n = wn(), t = vn(), a = Ut(), s = G(), d = Cn();
    function f(g) {
      return unescape(encodeURIComponent(g)).length;
    }
    function p(g, k, M) {
      const b = [];
      let v;
      for (; (v = g.exec(M)) !== null; )
        b.push({
          data: v[0],
          index: v.index,
          mode: k,
          length: v[0].length
        });
      return b;
    }
    function h(g) {
      const k = p(a.NUMERIC, i.NUMERIC, g), M = p(a.ALPHANUMERIC, i.ALPHANUMERIC, g);
      let b, v;
      return s.isKanjiModeEnabled() ? (b = p(a.BYTE, i.BYTE, g), v = p(a.KANJI, i.KANJI, g)) : (b = p(a.BYTE_KANJI, i.BYTE, g), v = []), k.concat(M, b, v).sort(function(T, R) {
        return T.index - R.index;
      }).map(function(T) {
        return {
          data: T.data,
          mode: T.mode,
          length: T.length
        };
      });
    }
    function y(g, k) {
      switch (k) {
        case i.NUMERIC:
          return l.getBitsLength(g);
        case i.ALPHANUMERIC:
          return r.getBitsLength(g);
        case i.KANJI:
          return t.getBitsLength(g);
        case i.BYTE:
          return n.getBitsLength(g);
      }
    }
    function S(g) {
      return g.reduce(function(k, M) {
        const b = k.length - 1 >= 0 ? k[k.length - 1] : null;
        return b && b.mode === M.mode ? (k[k.length - 1].data += M.data, k) : (k.push(M), k);
      }, []);
    }
    function u(g) {
      const k = [];
      for (let M = 0; M < g.length; M++) {
        const b = g[M];
        switch (b.mode) {
          case i.NUMERIC:
            k.push([
              b,
              { data: b.data, mode: i.ALPHANUMERIC, length: b.length },
              { data: b.data, mode: i.BYTE, length: b.length }
            ]);
            break;
          case i.ALPHANUMERIC:
            k.push([
              b,
              { data: b.data, mode: i.BYTE, length: b.length }
            ]);
            break;
          case i.KANJI:
            k.push([
              b,
              { data: b.data, mode: i.BYTE, length: f(b.data) }
            ]);
            break;
          case i.BYTE:
            k.push([
              { data: b.data, mode: i.BYTE, length: f(b.data) }
            ]);
        }
      }
      return k;
    }
    function C(g, k) {
      const M = {}, b = { start: {} };
      let v = ["start"];
      for (let x = 0; x < g.length; x++) {
        const T = g[x], R = [];
        for (let w = 0; w < T.length; w++) {
          const A = T[w], E = "" + x + w;
          R.push(E), M[E] = { node: A, lastCount: 0 }, b[E] = {};
          for (let I = 0; I < v.length; I++) {
            const B = v[I];
            M[B] && M[B].node.mode === A.mode ? (b[B][E] = y(M[B].lastCount + A.length, A.mode) - y(M[B].lastCount, A.mode), M[B].lastCount += A.length) : (M[B] && (M[B].lastCount = A.length), b[B][E] = y(A.length, A.mode) + 4 + i.getCharCountIndicator(A.mode, k));
          }
        }
        v = R;
      }
      for (let x = 0; x < v.length; x++)
        b[v[x]].end = 0;
      return { map: b, table: M };
    }
    function L(g, k) {
      let M;
      const b = i.getBestModeForData(g);
      if (M = i.from(k, b), M !== i.BYTE && M.bit < b.bit)
        throw new Error('"' + g + '" cannot be encoded with mode ' + i.toString(M) + `.
 Suggested mode is: ` + i.toString(b));
      switch (M === i.KANJI && !s.isKanjiModeEnabled() && (M = i.BYTE), M) {
        case i.NUMERIC:
          return new l(g);
        case i.ALPHANUMERIC:
          return new r(g);
        case i.KANJI:
          return new t(g);
        case i.BYTE:
          return new n(g);
      }
    }
    e.fromArray = function(k) {
      return k.reduce(function(M, b) {
        return typeof b == "string" ? M.push(L(b, null)) : b.data && M.push(L(b.data, b.mode)), M;
      }, []);
    }, e.fromString = function(k, M) {
      const b = h(k, s.isKanjiModeEnabled()), v = u(b), x = C(v, M), T = d.find_path(x.map, "start", "end"), R = [];
      for (let w = 1; w < T.length - 1; w++)
        R.push(x.table[T[w]].node);
      return e.fromArray(S(R));
    }, e.rawSplit = function(k) {
      return e.fromArray(
        h(k, s.isKanjiModeEnabled())
      );
    };
  })(Re)), Re;
}
var xt;
function Tn() {
  if (xt) return pe;
  xt = 1;
  const e = G(), i = Ve(), l = cn(), r = dn(), n = un(), t = fn(), a = gn(), s = Ft(), d = yn(), f = mn(), p = bn(), h = J(), y = kn();
  function S(x, T) {
    const R = x.size, w = t.getPositions(T);
    for (let A = 0; A < w.length; A++) {
      const E = w[A][0], I = w[A][1];
      for (let B = -1; B <= 7; B++)
        if (!(E + B <= -1 || R <= E + B))
          for (let _ = -1; _ <= 7; _++)
            I + _ <= -1 || R <= I + _ || (B >= 0 && B <= 6 && (_ === 0 || _ === 6) || _ >= 0 && _ <= 6 && (B === 0 || B === 6) || B >= 2 && B <= 4 && _ >= 2 && _ <= 4 ? x.set(E + B, I + _, !0, !0) : x.set(E + B, I + _, !1, !0));
    }
  }
  function u(x) {
    const T = x.size;
    for (let R = 8; R < T - 8; R++) {
      const w = R % 2 === 0;
      x.set(R, 6, w, !0), x.set(6, R, w, !0);
    }
  }
  function C(x, T) {
    const R = n.getPositions(T);
    for (let w = 0; w < R.length; w++) {
      const A = R[w][0], E = R[w][1];
      for (let I = -2; I <= 2; I++)
        for (let B = -2; B <= 2; B++)
          I === -2 || I === 2 || B === -2 || B === 2 || I === 0 && B === 0 ? x.set(A + I, E + B, !0, !0) : x.set(A + I, E + B, !1, !0);
    }
  }
  function L(x, T) {
    const R = x.size, w = f.getEncodedBits(T);
    let A, E, I;
    for (let B = 0; B < 18; B++)
      A = Math.floor(B / 3), E = B % 3 + R - 8 - 3, I = (w >> B & 1) === 1, x.set(A, E, I, !0), x.set(E, A, I, !0);
  }
  function g(x, T, R) {
    const w = x.size, A = p.getEncodedBits(T, R);
    let E, I;
    for (E = 0; E < 15; E++)
      I = (A >> E & 1) === 1, E < 6 ? x.set(E, 8, I, !0) : E < 8 ? x.set(E + 1, 8, I, !0) : x.set(w - 15 + E, 8, I, !0), E < 8 ? x.set(8, w - E - 1, I, !0) : E < 9 ? x.set(8, 15 - E - 1 + 1, I, !0) : x.set(8, 15 - E - 1, I, !0);
    x.set(w - 8, 8, 1, !0);
  }
  function k(x, T) {
    const R = x.size;
    let w = -1, A = R - 1, E = 7, I = 0;
    for (let B = R - 1; B > 0; B -= 2)
      for (B === 6 && B--; ; ) {
        for (let _ = 0; _ < 2; _++)
          if (!x.isReserved(A, B - _)) {
            let U = !1;
            I < T.length && (U = (T[I] >>> E & 1) === 1), x.set(A, B - _, U), E--, E === -1 && (I++, E = 7);
          }
        if (A += w, A < 0 || R <= A) {
          A -= w, w = -w;
          break;
        }
      }
  }
  function M(x, T, R) {
    const w = new l();
    R.forEach(function(_) {
      w.put(_.mode.bit, 4), w.put(_.getLength(), h.getCharCountIndicator(_.mode, x)), _.write(w);
    });
    const A = e.getSymbolTotalCodewords(x), E = s.getTotalCodewordsCount(x, T), I = (A - E) * 8;
    for (w.getLengthInBits() + 4 <= I && w.put(0, 4); w.getLengthInBits() % 8 !== 0; )
      w.putBit(0);
    const B = (I - w.getLengthInBits()) / 8;
    for (let _ = 0; _ < B; _++)
      w.put(_ % 2 ? 17 : 236, 8);
    return b(w, x, T);
  }
  function b(x, T, R) {
    const w = e.getSymbolTotalCodewords(T), A = s.getTotalCodewordsCount(T, R), E = w - A, I = s.getBlocksCount(T, R), B = w % I, _ = I - B, U = Math.floor(w / I), ee = Math.floor(E / I), nn = ee + 1, Ge = U - ee, rn = new d(Ge);
    let de = 0;
    const ne = new Array(I), Je = new Array(I);
    let ue = 0;
    const on = new Uint8Array(x.buffer);
    for (let Y = 0; Y < I; Y++) {
      const ge = Y < _ ? ee : nn;
      ne[Y] = on.slice(de, de + ge), Je[Y] = rn.encode(ne[Y]), de += ge, ue = Math.max(ue, ge);
    }
    const fe = new Uint8Array(w);
    let Ye = 0, $, F;
    for ($ = 0; $ < ue; $++)
      for (F = 0; F < I; F++)
        $ < ne[F].length && (fe[Ye++] = ne[F][$]);
    for ($ = 0; $ < Ge; $++)
      for (F = 0; F < I; F++)
        fe[Ye++] = Je[F][$];
    return fe;
  }
  function v(x, T, R, w) {
    let A;
    if (Array.isArray(x))
      A = y.fromArray(x);
    else if (typeof x == "string") {
      let U = T;
      if (!U) {
        const ee = y.rawSplit(x);
        U = f.getBestVersionForData(ee, R);
      }
      A = y.fromString(x, U || 40);
    } else
      throw new Error("Invalid data");
    const E = f.getBestVersionForData(A, R);
    if (!E)
      throw new Error("The amount of data is too big to be stored in a QR Code");
    if (!T)
      T = E;
    else if (T < E)
      throw new Error(
        `
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: ` + E + `.
`
      );
    const I = M(T, R, A), B = e.getSymbolSize(T), _ = new r(B);
    return S(_, T), u(_), C(_, T), g(_, R, 0), T >= 7 && L(_, T), k(_, I), isNaN(w) && (w = a.getBestMask(
      _,
      g.bind(null, _, R)
    )), a.applyMask(w, _), g(_, R, w), {
      modules: _,
      version: T,
      errorCorrectionLevel: R,
      maskPattern: w,
      segments: A
    };
  }
  return pe.create = function(T, R) {
    if (typeof T > "u" || T === "")
      throw new Error("No input text");
    let w = i.M, A, E;
    return typeof R < "u" && (w = i.from(R.errorCorrectionLevel, i.M), A = f.from(R.version), E = a.from(R.maskPattern), R.toSJISFunc && e.setToSJISFunction(R.toSJISFunc)), v(T, A, w, E);
  }, pe;
}
var Le = {}, ze = {}, wt;
function Wt() {
  return wt || (wt = 1, (function(e) {
    function i(l) {
      if (typeof l == "number" && (l = l.toString()), typeof l != "string")
        throw new Error("Color should be defined as hex string");
      let r = l.slice().replace("#", "").split("");
      if (r.length < 3 || r.length === 5 || r.length > 8)
        throw new Error("Invalid hex color: " + l);
      (r.length === 3 || r.length === 4) && (r = Array.prototype.concat.apply([], r.map(function(t) {
        return [t, t];
      }))), r.length === 6 && r.push("F", "F");
      const n = parseInt(r.join(""), 16);
      return {
        r: n >> 24 & 255,
        g: n >> 16 & 255,
        b: n >> 8 & 255,
        a: n & 255,
        hex: "#" + r.slice(0, 6).join("")
      };
    }
    e.getOptions = function(r) {
      r || (r = {}), r.color || (r.color = {});
      const n = typeof r.margin > "u" || r.margin === null || r.margin < 0 ? 4 : r.margin, t = r.width && r.width >= 21 ? r.width : void 0, a = r.scale || 4;
      return {
        width: t,
        scale: t ? 4 : a,
        margin: n,
        color: {
          dark: i(r.color.dark || "#000000ff"),
          light: i(r.color.light || "#ffffffff")
        },
        type: r.type,
        rendererOpts: r.rendererOpts || {}
      };
    }, e.getScale = function(r, n) {
      return n.width && n.width >= r + n.margin * 2 ? n.width / (r + n.margin * 2) : n.scale;
    }, e.getImageWidth = function(r, n) {
      const t = e.getScale(r, n);
      return Math.floor((r + n.margin * 2) * t);
    }, e.qrToImageData = function(r, n, t) {
      const a = n.modules.size, s = n.modules.data, d = e.getScale(a, t), f = Math.floor((a + t.margin * 2) * d), p = t.margin * d, h = [t.color.light, t.color.dark];
      for (let y = 0; y < f; y++)
        for (let S = 0; S < f; S++) {
          let u = (y * f + S) * 4, C = t.color.light;
          if (y >= p && S >= p && y < f - p && S < f - p) {
            const L = Math.floor((y - p) / d), g = Math.floor((S - p) / d);
            C = h[s[L * a + g] ? 1 : 0];
          }
          r[u++] = C.r, r[u++] = C.g, r[u++] = C.b, r[u] = C.a;
        }
    };
  })(ze)), ze;
}
var vt;
function En() {
  return vt || (vt = 1, (function(e) {
    const i = Wt();
    function l(n, t, a) {
      n.clearRect(0, 0, t.width, t.height), t.style || (t.style = {}), t.height = a, t.width = a, t.style.height = a + "px", t.style.width = a + "px";
    }
    function r() {
      try {
        return document.createElement("canvas");
      } catch {
        throw new Error("You need to specify a canvas element");
      }
    }
    e.render = function(t, a, s) {
      let d = s, f = a;
      typeof d > "u" && (!a || !a.getContext) && (d = a, a = void 0), a || (f = r()), d = i.getOptions(d);
      const p = i.getImageWidth(t.modules.size, d), h = f.getContext("2d"), y = h.createImageData(p, p);
      return i.qrToImageData(y.data, t, d), l(h, f, p), h.putImageData(y, 0, 0), f;
    }, e.renderToDataURL = function(t, a, s) {
      let d = s;
      typeof d > "u" && (!a || !a.getContext) && (d = a, a = void 0), d || (d = {});
      const f = e.render(t, a, d), p = d.type || "image/png", h = d.rendererOpts || {};
      return f.toDataURL(p, h.quality);
    };
  })(Le)), Le;
}
var Ne = {}, Ct;
function Bn() {
  if (Ct) return Ne;
  Ct = 1;
  const e = Wt();
  function i(n, t) {
    const a = n.a / 255, s = t + '="' + n.hex + '"';
    return a < 1 ? s + " " + t + '-opacity="' + a.toFixed(2).slice(1) + '"' : s;
  }
  function l(n, t, a) {
    let s = n + t;
    return typeof a < "u" && (s += " " + a), s;
  }
  function r(n, t, a) {
    let s = "", d = 0, f = !1, p = 0;
    for (let h = 0; h < n.length; h++) {
      const y = Math.floor(h % t), S = Math.floor(h / t);
      !y && !f && (f = !0), n[h] ? (p++, h > 0 && y > 0 && n[h - 1] || (s += f ? l("M", y + a, 0.5 + S + a) : l("m", d, 0), d = 0, f = !1), y + 1 < t && n[h + 1] || (s += l("h", p), p = 0)) : d++;
    }
    return s;
  }
  return Ne.render = function(t, a, s) {
    const d = e.getOptions(a), f = t.modules.size, p = t.modules.data, h = f + d.margin * 2, y = d.color.light.a ? "<path " + i(d.color.light, "fill") + ' d="M0 0h' + h + "v" + h + 'H0z"/>' : "", S = "<path " + i(d.color.dark, "stroke") + ' d="' + r(p, f, d.margin) + '"/>', u = 'viewBox="0 0 ' + h + " " + h + '"', L = '<svg xmlns="http://www.w3.org/2000/svg" ' + (d.width ? 'width="' + d.width + '" height="' + d.width + '" ' : "") + u + ' shape-rendering="crispEdges">' + y + S + `</svg>
`;
    return typeof s == "function" && s(null, L), L;
  }, Ne;
}
var kt;
function Rn() {
  if (kt) return Q;
  kt = 1;
  const e = sn(), i = Tn(), l = En(), r = Bn();
  function n(t, a, s, d, f) {
    const p = [].slice.call(arguments, 1), h = p.length, y = typeof p[h - 1] == "function";
    if (!y && !e())
      throw new Error("Callback required as last argument");
    if (y) {
      if (h < 2)
        throw new Error("Too few arguments provided");
      h === 2 ? (f = s, s = a, a = d = void 0) : h === 3 && (a.getContext && typeof f > "u" ? (f = d, d = void 0) : (f = d, d = s, s = a, a = void 0));
    } else {
      if (h < 1)
        throw new Error("Too few arguments provided");
      return h === 1 ? (s = a, a = d = void 0) : h === 2 && !a.getContext && (d = s, s = a, a = void 0), new Promise(function(S, u) {
        try {
          const C = i.create(s, d);
          S(t(C, a, d));
        } catch (C) {
          u(C);
        }
      });
    }
    try {
      const S = i.create(s, d);
      f(null, t(S, a, d));
    } catch (S) {
      f(S);
    }
  }
  return Q.create = i.create, Q.toCanvas = n.bind(null, l.render), Q.toDataURL = n.bind(null, l.renderToDataURL), Q.toString = n.bind(null, function(t, a, s) {
    return r.render(t, s);
  }), Q;
}
var In = Rn();
const Ot = /* @__PURE__ */ an(In), Ht = {
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
}, Mn = {
  radiusSm: "0.25rem",
  radiusMd: "0.25rem",
  radiusLg: "0.25rem",
  radiusXl: "0.25rem",
  fieldRadius: "0.5rem",
  fontSans: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontMono: "'Geist Mono', 'SF Mono', 'Cascadia Code', monospace",
  transition: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  transitionSlow: "400ms cubic-bezier(0.4, 0, 0.2, 1)"
}, An = {
  sidebarWidth: "260px",
  sidebarCollapsed: "72px",
  topbarHeight: "64px"
}, Ke = {
  ...Mn,
  ...An
}, jt = {
  dark: Ht
};
function _n(e) {
  return e.replace(/[A-Z]/g, (i) => "-" + i.toLowerCase());
}
function Vt(e = "ag") {
  return e.trim() || "ag";
}
function ce(e, i) {
  return `--${e}-${_n(i)}`;
}
Object.keys(jt.dark).reduce((e, i) => (e[i] = ce("ag", i), e), {});
Object.keys(Ke).reduce((e, i) => (e[i] = ce("ag", i), e), {});
function Kt(e = {}) {
  const i = Vt(e.prefix);
  return Object.keys(jt.dark).reduce((l, r) => (l[r] = ce(i, r), l), {});
}
function Gt(e = {}) {
  const i = Vt(e.prefix);
  return Object.keys(Ke).reduce((l, r) => (l[r] = ce(i, r), l), {});
}
const Pn = Kt(), Ln = Gt();
function o(e, i = {}) {
  const l = i.prefix ? Kt(i) : Pn, r = i.prefix ? Gt(i) : Ln;
  if (e in l) {
    const t = e;
    return `var(${l[t]}, ${Ht[t]})`;
  }
  const n = e;
  return `var(${r[n]}, ${Ke[n]})`;
}
const zn = "/api/v1/ext-user/payment-epay", Nn = "/api/v1/ext/payment-epay";
async function q(e, i, l, r) {
  const n = {};
  l !== void 0 && (n["Content-Type"] = "application/json");
  const t = localStorage.getItem("token");
  t && (n.Authorization = `Bearer ${t}`);
  const a = r != null && r.admin ? Nn : zn, s = await fetch(a + i, {
    method: e,
    headers: n,
    body: l ? JSON.stringify(l) : void 0
  }), d = await s.text();
  let f = null;
  try {
    f = d ? JSON.parse(d) : null;
  } catch {
  }
  if (!s.ok) {
    const h = f, y = (h == null ? void 0 : h.message) || (f == null ? void 0 : f.error) || `HTTP ${s.status}`;
    throw s.status === 401 && (localStorage.removeItem("token"), window.location.href = "/login"), new Error(y);
  }
  const p = f;
  if (p && typeof p == "object" && "code" in p && "data" in p) {
    if (p.code !== 0)
      throw new Error(p.message || "请求失败");
    return p.data;
  }
  return f;
}
const D = {
  // ============ User ============
  /** 列出当前可用的支付方式（PayMethod，不是 Provider） */
  methods: () => q(
    "GET",
    "/user/methods"
  ),
  createOrder: (e) => q("POST", "/user/orders", e),
  listOrders: (e = 50) => q("GET", `/user/orders?limit=${e}`),
  getOrder: (e) => q("GET", `/user/orders/${encodeURIComponent(e)}`),
  // ============ Admin: 订单 ============
  // email 为子串过滤（后端走 ILIKE %x%）；status='all' 或留空表示不过滤
  adminListOrders: (e = {}) => {
    const i = new URLSearchParams();
    return i.set("page", String(e.page ?? 1)), i.set("page_size", String(e.pageSize ?? 20)), e.email && e.email.trim() && i.set("email", e.email.trim()), e.status && e.status !== "all" && i.set("status", e.status), q("GET", `/admin/orders?${i.toString()}`, void 0, { admin: !0 });
  },
  // ============ Admin: Provider 配置 ============
  adminListProviders: () => q("GET", "/admin/providers", void 0, { admin: !0 }),
  adminUpsertProvider: (e) => q("POST", "/admin/providers", e, { admin: !0 }),
  adminDeleteProvider: (e) => q("DELETE", `/admin/providers/${encodeURIComponent(e)}`, void 0, { admin: !0 }),
  adminReloadProviders: () => q("POST", "/admin/providers/reload", {}, { admin: !0 })
};
function Dn() {
  const [e, i] = P([]), [l, r] = P(!0), [n, t] = P(null), [a, s] = P(30), [d, f] = P(""), [p, h] = P(!1), [y, S] = P(null), [u, C] = P(null), [L, g] = P(null), k = se(null);
  z(() => {
    D.methods().then((v) => {
      var x;
      i(v.methods || []), (x = v.methods) != null && x.length && f(v.methods[0].key);
    }).catch((v) => t(String((v == null ? void 0 : v.message) || v))).finally(() => r(!1));
  }, []), z(() => {
    if (!u || u.status !== "pending") {
      k.current && (window.clearInterval(k.current), k.current = null);
      return;
    }
    const v = async () => {
      try {
        const x = await D.getOrder(u.out_trade_no);
        C(x);
      } catch {
      }
    };
    return k.current = window.setInterval(v, 3e3), () => {
      k.current && (window.clearInterval(k.current), k.current = null);
    };
  }, [u == null ? void 0 : u.out_trade_no, u == null ? void 0 : u.status]), z(() => {
    if (!u) {
      g(null);
      return;
    }
    const v = u.qr_code_content || u.payment_url;
    if (!v) {
      g(null);
      return;
    }
    let x = !1;
    return Ot.toDataURL(v, { width: 240, margin: 2, errorCorrectionLevel: "M" }).then((T) => {
      x || g(T);
    }).catch(() => {
      x || g(null);
    }), () => {
      x = !0;
    };
  }, [u == null ? void 0 : u.payment_url, u == null ? void 0 : u.qr_code_content]);
  const M = async () => {
    if (S(null), !d) {
      S("请选择支付方式");
      return;
    }
    if (!a || a <= 0) {
      S("请输入有效金额");
      return;
    }
    h(!0);
    try {
      const v = await D.createOrder({ amount: a, method: d, subject: "AirGate 余额充值" });
      C(v);
    } catch (v) {
      S(String(v.message || v));
    } finally {
      h(!1);
    }
  }, b = () => {
    C(null), S(null);
  };
  return l ? /* @__PURE__ */ c("div", { style: j, children: /* @__PURE__ */ c("div", { style: Tt, children: "加载中..." }) }) : n ? /* @__PURE__ */ c("div", { style: j, children: /* @__PURE__ */ m("div", { style: { ...Tt, color: o("danger") }, children: [
    "加载支付方式失败: ",
    n
  ] }) }) : e.length === 0 ? /* @__PURE__ */ c("div", { style: j, children: /* @__PURE__ */ c("div", { style: ie, children: /* @__PURE__ */ c("p", { style: { color: o("textSecondary"), margin: 0, textAlign: "center" }, children: "充值功能暂未开放，请联系管理员。" }) }) }) : u ? u.status === "paid" ? /* @__PURE__ */ m("div", { style: j, children: [
    /* @__PURE__ */ c("h2", { style: oe, children: "充值成功" }),
    /* @__PURE__ */ m("div", { style: ie, children: [
      /* @__PURE__ */ m("p", { style: { margin: 0, color: o("text") }, children: [
        "订单 ",
        /* @__PURE__ */ c("code", { style: $e, children: u.out_trade_no }),
        " 已支付，金额",
        " ",
        /* @__PURE__ */ m("strong", { style: { color: o("success") }, children: [
          "¥",
          u.amount.toFixed(2)
        ] }),
        " 已入账。"
      ] }),
      /* @__PURE__ */ c("button", { style: { ...De, marginTop: 20 }, onClick: b, children: "再次充值" })
    ] })
  ] }) : u.status === "pending" ? /* @__PURE__ */ m("div", { style: j, children: [
    /* @__PURE__ */ c("h2", { style: oe, children: "扫码付款" }),
    /* @__PURE__ */ m("div", { style: jn, children: [
      L ? /* @__PURE__ */ c("img", { src: L, alt: "付款二维码", style: Bt }) : /* @__PURE__ */ c("div", { style: { ...Bt, display: "flex", alignItems: "center", justifyContent: "center", color: o("textTertiary") }, children: "生成二维码中..." }),
      /* @__PURE__ */ m("div", { style: Vn, children: [
        "¥ ",
        u.amount.toFixed(2)
      ] }),
      /* @__PURE__ */ m("div", { style: { color: o("textSecondary"), fontSize: 13 }, children: [
        "请使用 ",
        $n(u.method),
        " 扫码完成付款"
      ] }),
      /* @__PURE__ */ m("div", { style: { marginTop: 8, color: o("textTertiary"), fontSize: 12 }, children: [
        "订单号：",
        /* @__PURE__ */ c("code", { style: $e, children: u.out_trade_no })
      ] }),
      /* @__PURE__ */ c("p", { style: { textAlign: "center", color: o("textTertiary"), fontSize: 13, marginTop: 20, marginBottom: 0 }, children: "支付完成后本页将自动跳转到结果页（每 3 秒检查一次）" }),
      u.payment_url && /* @__PURE__ */ m("p", { style: { textAlign: "center", fontSize: 12, marginTop: 8, marginBottom: 0 }, children: [
        "扫码不便？",
        " ",
        /* @__PURE__ */ c("a", { href: u.payment_url, target: "_blank", rel: "noreferrer", style: { color: o("primary"), textDecoration: "none" }, children: "点此在新窗口打开付款页 →" })
      ] }),
      /* @__PURE__ */ c("button", { style: { ...Hn, marginTop: 20 }, onClick: b, children: "取消" })
    ] })
  ] }) : /* @__PURE__ */ m("div", { style: j, children: [
    /* @__PURE__ */ m("h2", { style: oe, children: [
      "订单已",
      Fn(u.status)
    ] }),
    /* @__PURE__ */ m("div", { style: ie, children: [
      /* @__PURE__ */ m("p", { style: { margin: 0, color: o("textSecondary") }, children: [
        "订单号：",
        /* @__PURE__ */ c("code", { style: $e, children: u.out_trade_no })
      ] }),
      /* @__PURE__ */ c("button", { style: { ...De, marginTop: 20 }, onClick: b, children: "重新发起" })
    ] })
  ] }) : /* @__PURE__ */ m("div", { style: j, children: [
    /* @__PURE__ */ c("h2", { style: oe, children: "账户充值" }),
    /* @__PURE__ */ m("div", { style: ie, children: [
      /* @__PURE__ */ m("section", { children: [
        /* @__PURE__ */ c("h3", { style: Et, children: "选择金额" }),
        /* @__PURE__ */ c("div", { style: { display: "flex", flexWrap: "wrap", gap: 10 }, children: [10, 30, 50, 100, 200, 500].map((v) => /* @__PURE__ */ m(
          "button",
          {
            type: "button",
            onClick: () => s(v),
            style: a === v ? Un : Jt,
            children: [
              "¥",
              v
            ]
          },
          v
        )) }),
        /* @__PURE__ */ m("div", { style: { marginTop: 16, display: "flex", alignItems: "center", gap: 8, color: o("textSecondary"), fontSize: 13 }, children: [
          /* @__PURE__ */ c("span", { children: "自定义金额" }),
          /* @__PURE__ */ c(
            "input",
            {
              type: "number",
              min: 1,
              max: 1e4,
              step: 1,
              value: a,
              onChange: (v) => s(Number(v.target.value)),
              style: On
            }
          ),
          /* @__PURE__ */ c("span", { children: "元" })
        ] })
      ] }),
      /* @__PURE__ */ m("section", { style: qn, children: [
        /* @__PURE__ */ c("h3", { style: Et, children: "选择支付方式" }),
        /* @__PURE__ */ c("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" }, children: e.map((v) => /* @__PURE__ */ c(
          "button",
          {
            type: "button",
            onClick: () => f(v.key),
            style: d === v.key ? Wn : Yt,
            title: v.description,
            children: v.label
          },
          v.key
        )) })
      ] }),
      y && /* @__PURE__ */ c("p", { style: { color: o("danger"), marginTop: 16, fontSize: 13 }, children: y }),
      /* @__PURE__ */ c(
        "button",
        {
          type: "button",
          onClick: M,
          disabled: p,
          style: { ...De, marginTop: 24, width: "100%", opacity: p ? 0.6 : 1 },
          children: p ? "处理中..." : "立即支付"
        }
      )
    ] })
  ] });
}
function $n(e) {
  switch (e) {
    case "alipay":
      return "支付宝";
    case "wxpay":
      return "微信支付";
    default:
      return e;
  }
}
function Fn(e) {
  switch (e) {
    case "expired":
      return "过期";
    case "failed":
      return "失败";
    case "cancelled":
      return "取消";
    case "refunded":
      return "退款";
    default:
      return e;
  }
}
const j = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "24px 24px 48px",
  color: o("text")
}, oe = {
  margin: "0 0 20px",
  fontSize: 22,
  fontWeight: 600,
  color: o("text"),
  letterSpacing: "-0.01em"
}, Tt = {
  padding: "40px 0",
  textAlign: "center",
  color: o("textSecondary")
}, ie = {
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusLg"),
  background: o("bgSurface"),
  padding: "24px"
}, qn = {
  marginTop: 28
}, Et = {
  margin: "0 0 12px",
  fontSize: 13,
  fontWeight: 600,
  color: o("textSecondary"),
  textTransform: "uppercase",
  letterSpacing: "0.04em"
}, Jt = {
  minWidth: 88,
  padding: "12px 18px",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: o("bg"),
  color: o("text"),
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 500,
  transition: o("transition")
}, Un = {
  ...Jt,
  borderColor: o("primary"),
  background: o("primarySubtle"),
  color: o("primary"),
  fontWeight: 600
}, Yt = {
  minWidth: 140,
  padding: "16px 24px",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: o("bgElevated"),
  color: o("text"),
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
  transition: o("transition")
}, Wn = {
  ...Yt,
  borderColor: o("primary"),
  background: o("primarySubtle"),
  color: o("primary"),
  fontWeight: 600
}, On = {
  padding: "8px 12px",
  width: 140,
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: o("bgElevated"),
  color: o("text"),
  fontSize: 14,
  outline: "none"
}, De = {
  padding: "12px 28px",
  border: "none",
  borderRadius: o("radiusMd"),
  background: o("primary"),
  color: o("textInverse"),
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: o("transition")
}, Hn = {
  padding: "10px 24px",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: o("bgElevated"),
  color: o("text"),
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: o("transition")
}, jn = {
  padding: "28px 24px",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusLg"),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: o("bgSurface")
}, Bt = {
  width: 240,
  height: 240,
  background: o("bgElevated"),
  padding: 8,
  borderRadius: o("radiusMd")
}, Vn = {
  marginTop: 20,
  fontSize: 32,
  fontWeight: 700,
  color: o("text"),
  fontFamily: o("fontMono"),
  letterSpacing: "-0.02em"
}, $e = {
  fontFamily: o("fontMono"),
  fontSize: "0.9em",
  padding: "1px 6px",
  borderRadius: 4,
  background: o("bg"),
  color: o("textSecondary")
};
function Kn() {
  const [e, i] = P([]), [l, r] = P(!0), [n, t] = P(null), [a, s] = P(null), [d, f] = P(null), p = se(null), h = () => {
    r(!0), D.listOrders(100).then((u) => i(u.list || [])).catch((u) => t(String((u == null ? void 0 : u.message) || u))).finally(() => r(!1));
  };
  z(h, []), z(() => {
    if (!a) {
      f(null);
      return;
    }
    const u = a.qr_code_content || a.payment_url;
    if (!u) {
      f(null);
      return;
    }
    let C = !1;
    return Ot.toDataURL(u, { width: 240, margin: 2, errorCorrectionLevel: "M" }).then((L) => {
      C || f(L);
    }).catch(() => {
      C || f(null);
    }), () => {
      C = !0;
    };
  }, [a == null ? void 0 : a.payment_url, a == null ? void 0 : a.qr_code_content]), z(() => {
    if (!a || a.status !== "pending") {
      p.current && (window.clearInterval(p.current), p.current = null);
      return;
    }
    return p.current = window.setInterval(async () => {
      try {
        const u = await D.getOrder(a.out_trade_no);
        s(u), u.status !== "pending" && h();
      } catch {
      }
    }, 3e3), () => {
      p.current && (window.clearInterval(p.current), p.current = null);
    };
  }, [a == null ? void 0 : a.out_trade_no, a == null ? void 0 : a.status]);
  const y = (u) => {
    s(u);
  }, S = () => {
    s(null), f(null);
  };
  return l ? /* @__PURE__ */ c("div", { style: Fe, children: /* @__PURE__ */ c("div", { style: At, children: "加载中..." }) }) : n ? /* @__PURE__ */ c("div", { style: Fe, children: /* @__PURE__ */ m("div", { style: { ...At, color: o("danger") }, children: [
    "加载失败: ",
    n
  ] }) }) : /* @__PURE__ */ m("div", { style: Fe, children: [
    a && /* @__PURE__ */ c("div", { style: nr, onClick: S, children: /* @__PURE__ */ c("div", { style: rr, onClick: (u) => u.stopPropagation(), children: a.status === "paid" ? /* @__PURE__ */ m(le, { children: [
      /* @__PURE__ */ c("h3", { style: { margin: "0 0 12px", color: o("success") }, children: "支付成功" }),
      /* @__PURE__ */ m("p", { style: { margin: 0, color: o("text"), fontSize: 14 }, children: [
        "订单 ",
        /* @__PURE__ */ c("code", { style: qe, children: a.out_trade_no }),
        " 已支付",
        " ",
        /* @__PURE__ */ m("strong", { children: [
          "¥",
          a.amount.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ c("button", { style: { ..._t, marginTop: 16 }, onClick: S, children: "关闭" })
    ] }) : a.status === "pending" ? /* @__PURE__ */ m(le, { children: [
      /* @__PURE__ */ c("h3", { style: { margin: "0 0 12px", color: o("text") }, children: "扫码付款" }),
      d ? /* @__PURE__ */ c("img", { src: d, alt: "付款二维码", style: { width: 240, height: 240, borderRadius: 8 } }) : /* @__PURE__ */ c("div", { style: { width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: o("textTertiary"), border: `1px solid ${o("glassBorder")}`, borderRadius: 8 }, children: "生成二维码中..." }),
      /* @__PURE__ */ m("div", { style: { marginTop: 12, fontWeight: 600, fontSize: 20, color: o("text") }, children: [
        "¥ ",
        a.amount.toFixed(2)
      ] }),
      /* @__PURE__ */ m("div", { style: { color: o("textSecondary"), fontSize: 13, marginTop: 4 }, children: [
        "请使用 ",
        Rt(a.method),
        " 扫码完成付款"
      ] }),
      /* @__PURE__ */ m("div", { style: { marginTop: 6, color: o("textTertiary"), fontSize: 12 }, children: [
        "订单号：",
        /* @__PURE__ */ c("code", { style: qe, children: a.out_trade_no })
      ] }),
      /* @__PURE__ */ c("p", { style: { color: o("textTertiary"), fontSize: 12, marginTop: 12, marginBottom: 0 }, children: "支付完成后将自动刷新（每 3 秒检查一次）" }),
      a.payment_url && /* @__PURE__ */ m("p", { style: { fontSize: 12, marginTop: 6, marginBottom: 0 }, children: [
        "扫码不便？",
        " ",
        /* @__PURE__ */ c("a", { href: a.payment_url, target: "_blank", rel: "noreferrer", style: { color: o("primary"), textDecoration: "none" }, children: "点此在新窗口打开付款页 →" })
      ] }),
      /* @__PURE__ */ c("button", { style: { ...or, marginTop: 16 }, onClick: S, children: "取消" })
    ] }) : /* @__PURE__ */ m(le, { children: [
      /* @__PURE__ */ m("h3", { style: { margin: "0 0 12px", color: o("textSecondary") }, children: [
        "订单已",
        It(a.status)
      ] }),
      /* @__PURE__ */ c("p", { style: { margin: 0, color: o("textSecondary"), fontSize: 14 }, children: "该订单无法继续支付，请重新发起充值。" }),
      /* @__PURE__ */ c("button", { style: { ..._t, marginTop: 16 }, onClick: S, children: "关闭" })
    ] }) }) }),
    /* @__PURE__ */ c("div", { style: Jn, children: e.length === 0 ? /* @__PURE__ */ c("p", { style: Yn, children: "暂无充值记录" }) : /* @__PURE__ */ c("div", { style: Qn, children: /* @__PURE__ */ m("table", { style: Xn, children: [
      /* @__PURE__ */ c("thead", { children: /* @__PURE__ */ m("tr", { children: [
        /* @__PURE__ */ c("th", { style: V, children: "订单号" }),
        /* @__PURE__ */ c("th", { style: V, children: "金额" }),
        /* @__PURE__ */ c("th", { style: V, children: "支付方式" }),
        /* @__PURE__ */ c("th", { style: V, children: "状态" }),
        /* @__PURE__ */ c("th", { style: V, children: "创建时间" }),
        /* @__PURE__ */ c("th", { style: V, children: "支付时间" }),
        /* @__PURE__ */ c("th", { style: V, children: "操作" })
      ] }) }),
      /* @__PURE__ */ c("tbody", { children: e.map((u, C) => /* @__PURE__ */ m("tr", { style: Zn(C), children: [
        /* @__PURE__ */ c("td", { style: K, children: /* @__PURE__ */ c("code", { style: qe, children: u.out_trade_no }) }),
        /* @__PURE__ */ m("td", { style: { ...K, fontWeight: 600 }, children: [
          "¥",
          u.amount.toFixed(2)
        ] }),
        /* @__PURE__ */ c("td", { style: K, children: Rt(u.method) }),
        /* @__PURE__ */ c("td", { style: { ...K, color: Gn(u.status), fontWeight: 600 }, children: It(u.status) }),
        /* @__PURE__ */ c("td", { style: { ...K, color: o("textSecondary") }, children: Mt(u.created_at) }),
        /* @__PURE__ */ c("td", { style: { ...K, color: o("textSecondary") }, children: u.paid_at ? Mt(u.paid_at) : "-" }),
        /* @__PURE__ */ c("td", { style: K, children: u.status === "pending" && (u.qr_code_content || u.payment_url) ? /* @__PURE__ */ c("button", { style: ir, onClick: () => y(u), children: "继续支付" }) : null })
      ] }, u.id)) })
    ] }) }) })
  ] });
}
function Rt(e) {
  return { alipay: "支付宝", wxpay: "微信支付" }[e] || e || "-";
}
function It(e) {
  return {
    pending: "待支付",
    paid: "已支付",
    expired: "已过期",
    failed: "失败",
    cancelled: "已取消",
    refunded: "已退款"
  }[e] || e;
}
function Gn(e) {
  return {
    pending: o("warning"),
    paid: o("success"),
    expired: o("textTertiary"),
    failed: o("danger"),
    cancelled: o("textTertiary"),
    refunded: o("textTertiary")
  }[e] || "inherit";
}
function Mt(e) {
  try {
    return new Date(e).toLocaleString();
  } catch {
    return e;
  }
}
const Fe = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "24px 24px 48px",
  color: o("text")
}, At = {
  padding: "40px 0",
  textAlign: "center",
  color: o("textSecondary")
}, Jn = {
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusLg"),
  background: o("bgElevated"),
  padding: "8px 0",
  overflow: "hidden"
}, Yn = {
  color: o("textTertiary"),
  textAlign: "center",
  padding: "40px 0",
  fontSize: 14
}, Qn = {
  overflowX: "auto"
}, Xn = {
  width: "100%",
  borderCollapse: "collapse"
};
function Zn(e) {
  return e % 2 === 0 ? er : tr;
}
const er = {
  background: o("bgSurface")
}, tr = {
  background: o("bgHover")
}, V = {
  textAlign: "left",
  padding: "10px 16px",
  borderBottom: `1px solid ${o("glassBorder")}`,
  background: o("bgSurface"),
  color: o("textSecondary"),
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap"
}, K = {
  padding: "12px 16px",
  borderBottom: `1px solid ${o("glassBorder")}`,
  fontSize: 13,
  color: o("text"),
  whiteSpace: "nowrap"
}, qe = {
  fontSize: 12,
  fontFamily: o("fontMono"),
  color: o("textSecondary")
}, nr = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1e3
}, rr = {
  background: o("bgElevated"),
  borderRadius: o("radiusLg"),
  padding: "32px",
  textAlign: "center",
  minWidth: 320,
  maxWidth: 400,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
}, _t = {
  padding: "8px 24px",
  border: "none",
  borderRadius: o("radiusMd"),
  background: o("primary"),
  color: "#fff",
  fontSize: 14,
  cursor: "pointer"
}, or = {
  padding: "8px 24px",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: "transparent",
  color: o("textSecondary"),
  fontSize: 14,
  cursor: "pointer"
}, ir = {
  padding: "4px 12px",
  border: `1px solid ${o("primary")}`,
  borderRadius: o("radiusMd"),
  background: "transparent",
  color: o("primary"),
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap"
}, Pt = {
  total: 0,
  paid: 0,
  pending: 0,
  expired: 0,
  failed: 0,
  cancelled: 0,
  refunded: 0,
  total_amount_paid: 0,
  today_amount_paid: 0
}, lr = [10, 20, 50, 100], ar = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
  { value: "expired", label: "已过期" },
  { value: "failed", label: "失败" },
  { value: "cancelled", label: "已取消" },
  { value: "refunded", label: "已退款" }
];
function sr() {
  const [e, i] = P([]), [l, r] = P(0), [n, t] = P(Pt), [a, s] = P(!0), [d, f] = P(null), [p, h] = P("all"), [y, S] = P(""), [u, C] = P(1), [L, g] = P(20), k = Z(() => {
    s(!0), f(null), D.adminListOrders({ page: u, pageSize: L, email: y, status: p }).then((b) => {
      i(b.list || []), r(b.total || 0), t(b.stats || Pt);
    }).catch((b) => f(String((b == null ? void 0 : b.message) || b))).finally(() => s(!1));
  }, [u, L, y, p]);
  z(() => {
    const v = setTimeout(k, y ? 300 : 0);
    return () => clearTimeout(v);
  }, [k, y]), z(() => {
    C(1);
  }, [p, y, L]);
  const M = Math.max(1, Math.ceil(l / L));
  return /* @__PURE__ */ m("div", { style: pr, children: [
    /* @__PURE__ */ m("div", { style: yr, children: [
      /* @__PURE__ */ c(X, { label: "总订单数", value: n.total }),
      /* @__PURE__ */ c(X, { label: "已支付", value: n.paid, accent: o("success") }),
      /* @__PURE__ */ c(X, { label: "待支付", value: n.pending, accent: o("warning") }),
      /* @__PURE__ */ c(X, { label: "已过期", value: n.expired }),
      /* @__PURE__ */ c(X, { label: "累计收款", value: `¥${n.total_amount_paid.toFixed(2)}`, accent: o("success") }),
      /* @__PURE__ */ c(X, { label: "今日收款", value: `¥${n.today_amount_paid.toFixed(2)}`, accent: o("success") })
    ] }),
    /* @__PURE__ */ m("div", { style: xr, children: [
      /* @__PURE__ */ m("div", { style: wr, children: [
        /* @__PURE__ */ c(
          Qt,
          {
            value: p,
            onChange: h,
            options: ar,
            style: vr
          }
        ),
        /* @__PURE__ */ c(
          "input",
          {
            type: "text",
            value: y,
            onChange: (b) => S(b.target.value),
            placeholder: "搜索用户邮箱",
            style: { ...Ar, width: 240 }
          }
        ),
        /* @__PURE__ */ c(fr, { onClick: k, loading: a })
      ] }),
      d ? /* @__PURE__ */ m("p", { style: { ...Ue, color: o("danger") }, children: [
        "加载失败: ",
        d
      ] }) : a && e.length === 0 ? /* @__PURE__ */ c("p", { style: Ue, children: "加载中..." }) : e.length === 0 ? /* @__PURE__ */ c("p", { style: Ue, children: "暂无订单" }) : /* @__PURE__ */ c("div", { style: _r, children: /* @__PURE__ */ m("table", { style: Pr, children: [
        /* @__PURE__ */ c("thead", { children: /* @__PURE__ */ m("tr", { children: [
          /* @__PURE__ */ c("th", { style: O, children: "订单号" }),
          /* @__PURE__ */ c("th", { style: O, children: "用户邮箱" }),
          /* @__PURE__ */ c("th", { style: O, children: "金额" }),
          /* @__PURE__ */ c("th", { style: O, children: "支付方式" }),
          /* @__PURE__ */ c("th", { style: O, children: "服务商" }),
          /* @__PURE__ */ c("th", { style: O, children: "状态" }),
          /* @__PURE__ */ c("th", { style: O, children: "创建时间" }),
          /* @__PURE__ */ c("th", { style: O, children: "支付时间" })
        ] }) }),
        /* @__PURE__ */ c("tbody", { children: e.map((b, v) => /* @__PURE__ */ m("tr", { style: Lr(v), children: [
          /* @__PURE__ */ c("td", { style: H, children: /* @__PURE__ */ c("code", { style: Dr, children: b.out_trade_no }) }),
          /* @__PURE__ */ c("td", { style: H, children: b.user_email ? /* @__PURE__ */ c("span", { style: { color: o("text") }, children: b.user_email }) : /* @__PURE__ */ m("span", { style: { color: o("textTertiary") }, children: [
            "#",
            b.user_id
          ] }) }),
          /* @__PURE__ */ m("td", { style: { ...H, fontWeight: 600 }, children: [
            "¥",
            b.amount.toFixed(2)
          ] }),
          /* @__PURE__ */ c("td", { style: H, children: cr(b.method) }),
          /* @__PURE__ */ c("td", { style: { ...H, color: o("textSecondary") }, children: b.provider_id || "-" }),
          /* @__PURE__ */ c("td", { style: { ...H, color: ur(b.status), fontWeight: 600 }, children: dr(b.status) }),
          /* @__PURE__ */ c("td", { style: { ...H, color: o("textSecondary") }, children: Lt(b.created_at) }),
          /* @__PURE__ */ c("td", { style: { ...H, color: o("textSecondary") }, children: b.paid_at ? Lt(b.paid_at) : "-" })
        ] }, b.id)) })
      ] }) }),
      /* @__PURE__ */ c(
        gr,
        {
          page: u,
          pageSize: L,
          total: l,
          totalPages: M,
          onPageChange: C,
          onPageSizeChange: g
        }
      )
    ] })
  ] });
}
function X({ label: e, value: i, accent: l }) {
  return /* @__PURE__ */ m("div", { style: mr, children: [
    /* @__PURE__ */ c("div", { style: br, children: e }),
    /* @__PURE__ */ c("div", { style: { ...Sr, color: l || o("text") }, children: i })
  ] });
}
function cr(e) {
  return { alipay: "支付宝", wxpay: "微信支付" }[e] || e || "-";
}
function dr(e) {
  return {
    pending: "待支付",
    paid: "已支付",
    expired: "已过期",
    failed: "失败",
    cancelled: "已取消",
    refunded: "已退款"
  }[e] || e;
}
function ur(e) {
  return {
    pending: o("warning"),
    paid: o("success"),
    expired: o("textTertiary"),
    failed: o("danger"),
    cancelled: o("textTertiary"),
    refunded: o("textTertiary")
  }[e] || "inherit";
}
function Lt(e) {
  try {
    return new Date(e).toLocaleString();
  } catch {
    return e;
  }
}
function fr({ onClick: e, loading: i }) {
  const [l, r] = P(!1);
  return /* @__PURE__ */ m(le, { children: [
    /* @__PURE__ */ c("style", { children: "@keyframes ag-epay-spin { to { transform: rotate(360deg); } }" }),
    /* @__PURE__ */ c(
      "button",
      {
        type: "button",
        "aria-label": "刷新",
        onClick: e,
        disabled: i,
        onMouseEnter: () => r(!0),
        onMouseLeave: () => r(!1),
        style: {
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          border: `1px solid ${o("glassBorder")}`,
          borderRadius: 10,
          background: l ? o("bgHover") : "transparent",
          color: o(l ? "textSecondary" : "textTertiary"),
          cursor: i ? "not-allowed" : "pointer",
          opacity: i ? 0.6 : 1,
          transition: o("transition"),
          padding: 0
        },
        children: /* @__PURE__ */ m(
          "svg",
          {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            style: {
              animation: i ? "ag-epay-spin 1s linear infinite" : void 0
            },
            children: [
              /* @__PURE__ */ c("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
              /* @__PURE__ */ c("path", { d: "M21 3v5h-5" }),
              /* @__PURE__ */ c("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
              /* @__PURE__ */ c("path", { d: "M8 16H3v5" })
            ]
          }
        )
      }
    )
  ] });
}
function Qt({
  value: e,
  options: i,
  onChange: l,
  style: r
}) {
  const [n, t] = P(!1), a = se(null), s = i.find((d) => d.value === e);
  return z(() => {
    if (!n) return;
    const d = (f) => {
      a.current && !a.current.contains(f.target) && t(!1);
    };
    return document.addEventListener("mousedown", d), () => document.removeEventListener("mousedown", d);
  }, [n]), /* @__PURE__ */ m("div", { ref: a, style: Cr, children: [
    /* @__PURE__ */ m(
      "button",
      {
        type: "button",
        style: { ...r, ...kr, ...n ? Tr : null },
        "aria-haspopup": "listbox",
        "aria-expanded": n,
        onClick: () => t((d) => !d),
        children: [
          /* @__PURE__ */ c("span", { style: Er, children: (s == null ? void 0 : s.label) ?? "" }),
          /* @__PURE__ */ c("span", { "aria-hidden": "true", style: Br, children: "v" })
        ]
      }
    ),
    n && /* @__PURE__ */ c("div", { role: "listbox", style: Rr, children: i.map((d) => {
      const f = d.value === e;
      return /* @__PURE__ */ c(
        "button",
        {
          type: "button",
          role: "option",
          "aria-selected": f,
          style: { ...Ir, ...f ? Mr : null },
          onClick: () => {
            l(d.value), t(!1);
          },
          children: d.label
        },
        d.value
      );
    }) })
  ] });
}
function gr({ page: e, pageSize: i, total: l, totalPages: r, onPageChange: n, onPageSizeChange: t }) {
  const a = hr(e, r);
  return /* @__PURE__ */ m("div", { style: $r, children: [
    /* @__PURE__ */ m("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
      /* @__PURE__ */ m("span", { style: Fr, children: [
        "共 ",
        l,
        " 条 · 第 ",
        e,
        "/",
        r,
        " 页"
      ] }),
      /* @__PURE__ */ c(
        Qt,
        {
          value: String(i),
          onChange: (s) => t(Number(s)),
          options: lr.map((s) => ({ value: String(s), label: `${s} 条/页` })),
          style: qr
        }
      )
    ] }),
    /* @__PURE__ */ m("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
      /* @__PURE__ */ c(
        "button",
        {
          type: "button",
          "aria-label": "上一页",
          style: zt(e <= 1),
          disabled: e <= 1,
          onClick: () => n(e - 1),
          children: "‹"
        }
      ),
      a.map(
        (s, d) => s === "..." ? /* @__PURE__ */ c("span", { style: Wr, children: "···" }, `e-${d}`) : /* @__PURE__ */ c(
          "button",
          {
            type: "button",
            style: s === e ? Ur : Xt,
            onClick: () => n(s),
            children: s
          },
          s
        )
      ),
      /* @__PURE__ */ c(
        "button",
        {
          type: "button",
          "aria-label": "下一页",
          style: zt(e >= r),
          disabled: e >= r,
          onClick: () => n(e + 1),
          children: "›"
        }
      )
    ] })
  ] });
}
function hr(e, i) {
  if (i <= 7) return Array.from({ length: i }, (r, n) => n + 1);
  const l = [1];
  e > 3 && l.push("...");
  for (let r = Math.max(2, e - 1); r <= Math.min(i - 1, e + 1); r++)
    l.push(r);
  return e < i - 2 && l.push("..."), l.push(i), l;
}
const pr = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "24px 24px 48px",
  color: o("text")
}, yr = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 20
}, mr = {
  padding: "18px 20px",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusLg"),
  background: o("bgSurface")
}, br = {
  fontSize: 12,
  color: o("textSecondary"),
  fontWeight: 500,
  letterSpacing: "0.02em"
}, Sr = {
  fontSize: 26,
  fontWeight: 700,
  marginTop: 8,
  letterSpacing: "-0.02em"
}, xr = {
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusLg"),
  background: o("bgSurface"),
  padding: "20px 20px 8px"
}, wr = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
  flexWrap: "wrap"
}, vr = {
  padding: "8px 12px",
  minWidth: 140,
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: o("bgElevated"),
  color: o("text"),
  fontSize: 13
}, Cr = {
  position: "relative",
  display: "inline-block"
}, kr = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  fontFamily: "inherit",
  cursor: "pointer",
  outline: "none"
}, Tr = {
  borderColor: o("primary"),
  boxShadow: `0 0 0 3px ${o("primarySubtle")}`
}, Er = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
}, Br = {
  flexShrink: 0,
  color: o("textTertiary"),
  fontSize: 10,
  lineHeight: 1
}, Rr = {
  position: "absolute",
  left: 0,
  top: "calc(100% + 6px)",
  zIndex: 20,
  display: "flex",
  flexDirection: "column",
  minWidth: "100%",
  width: "max-content",
  maxHeight: 260,
  padding: 6,
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: o("bgSurface"),
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.28)",
  overflowY: "auto"
}, Ir = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: o("textSecondary"),
  fontFamily: "inherit",
  fontSize: 13,
  lineHeight: 1.35,
  textAlign: "left",
  whiteSpace: "nowrap",
  cursor: "pointer"
}, Mr = {
  background: o("primarySubtle"),
  color: o("primary"),
  fontWeight: 600
}, Ar = {
  padding: "8px 12px",
  width: 200,
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: o("bgElevated"),
  color: o("text"),
  fontSize: 13,
  outline: "none"
}, Ue = {
  color: o("textTertiary"),
  textAlign: "center",
  padding: "40px 0",
  fontSize: 14
}, _r = {
  overflowX: "auto",
  margin: "0 -20px"
}, Pr = {
  width: "100%",
  borderCollapse: "collapse"
};
function Lr(e) {
  return e % 2 === 0 ? zr : Nr;
}
const zr = {
  background: o("bgSurface")
}, Nr = {
  background: o("bgHover")
}, O = {
  textAlign: "left",
  padding: "10px 16px",
  borderTop: `1px solid ${o("glassBorder")}`,
  borderBottom: `1px solid ${o("glassBorder")}`,
  background: o("bgSurface"),
  color: o("textSecondary"),
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap"
}, H = {
  padding: "12px 16px",
  borderBottom: `1px solid ${o("glassBorder")}`,
  fontSize: 13,
  color: o("text"),
  whiteSpace: "nowrap"
}, Dr = {
  fontSize: 12,
  fontFamily: o("fontMono"),
  color: o("textSecondary")
}, $r = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 4px 6px",
  flexWrap: "wrap",
  gap: 12
}, Fr = {
  fontSize: 12,
  color: o("textTertiary"),
  fontFamily: o("fontMono")
}, qr = {
  fontSize: 12,
  color: o("textSecondary"),
  background: "transparent",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: 6,
  padding: "2px 8px",
  cursor: "pointer",
  outline: "none"
}, Xt = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: o("textSecondary"),
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  transition: o("transition")
}, Ur = {
  ...Xt,
  background: o("primary"),
  color: o("textInverse"),
  fontWeight: 600
};
function zt(e) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: o("textSecondary"),
    fontSize: 18,
    lineHeight: 1,
    cursor: e ? "not-allowed" : "pointer",
    opacity: e ? 0.3 : 1,
    transition: o("transition")
  };
}
const Wr = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  color: o("textTertiary"),
  fontSize: 12
};
let Or = 0;
function Hr() {
  const [e, i] = P([]), l = se(i);
  l.current = i;
  const r = Z((s) => {
    l.current((d) => d.filter((f) => f.id !== s));
  }, []), n = Z((s, d) => {
    const f = Or++;
    l.current((p) => [...p, { id: f, type: s, text: d }]), setTimeout(() => r(f), 4e3);
  }, [r]), t = Z((s) => n("success", s), [n]), a = Z((s) => n("error", s), [n]);
  return {
    toast: { success: t, error: a },
    Toaster: /* @__PURE__ */ c(jr, { messages: e, onClose: r })
  };
}
function jr({
  messages: e,
  onClose: i
}) {
  return z(() => {
    const l = "airgate-epay-toast-keyframes";
    if (document.getElementById(l)) return;
    const r = document.createElement("style");
    r.id = l, r.textContent = `
@keyframes airgate-epay-toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}`, document.head.appendChild(r);
  }, []), e.length === 0 ? null : /* @__PURE__ */ c("div", { style: Kr, children: e.map((l) => /* @__PURE__ */ c(Vr, { message: l, onClose: () => i(l.id) }, l.id)) });
}
function Vr({
  message: e,
  onClose: i
}) {
  const l = e.type === "success", r = o(l ? "success" : "danger"), n = o(l ? "success" : "danger");
  return /* @__PURE__ */ m(
    "div",
    {
      style: {
        ...Gr,
        borderColor: n
      },
      children: [
        /* @__PURE__ */ c("span", { style: { ...Jr, color: r }, children: l ? "✓" : "✕" }),
        /* @__PURE__ */ c("span", { style: { ...Yr, color: o("text") }, children: e.text }),
        /* @__PURE__ */ c("button", { onClick: i, style: Qr, "aria-label": "关闭", children: "×" })
      ]
    }
  );
}
const Kr = {
  position: "fixed",
  top: 20,
  right: 20,
  zIndex: 1e4,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  pointerEvents: "none"
}, Gr = {
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 260,
  maxWidth: 400,
  padding: "12px 14px",
  borderRadius: o("radiusLg"),
  border: "1px solid",
  background: o("bgElevated"),
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  animation: "airgate-epay-toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
}, Jr = {
  fontSize: 16,
  fontWeight: 700,
  width: 18,
  textAlign: "center",
  flexShrink: 0
}, Yr = {
  flex: 1,
  fontSize: 13,
  lineHeight: 1.4
}, Qr = {
  flexShrink: 0,
  background: "transparent",
  border: "none",
  color: o("textTertiary"),
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
  width: 18,
  height: 18
};
function Zt(e, i) {
  var r;
  const l = window;
  return (r = l.airgate) != null && r.confirm ? l.airgate.confirm(e, i) : Promise.resolve(window.confirm(e));
}
function Xr() {
  const [e, i] = P([]), [l, r] = P([]), [n, t] = P(!0), [a, s] = P(null), [d, f] = P(null), { toast: p, Toaster: h } = Hr(), y = Z(() => {
    t(!0), s(null), D.adminListProviders().then((g) => {
      i(g.providers || []), r(g.kinds || []);
    }).catch((g) => s(String((g == null ? void 0 : g.message) || g))).finally(() => t(!1));
  }, []);
  z(y, [y]);
  const S = (g) => {
    f({
      mode: "create",
      id: "",
      kind: g.kind,
      enabled: !0,
      config: to(g)
    });
  }, u = (g) => {
    f({
      mode: "edit",
      id: g.id,
      originalId: g.id,
      kind: g.kind,
      enabled: g.enabled,
      config: { ...g.config }
    });
  }, C = async (g) => {
    if (await Zt(`确认删除服务商 ${g}？此操作无法撤销。`, { title: "删除服务商", danger: !0 }))
      try {
        await D.adminDeleteProvider(g), p.success(`已删除 ${g}`), y();
      } catch (k) {
        p.error("删除失败: " + k.message);
      }
  }, L = async (g) => {
    try {
      await D.adminUpsertProvider({
        id: g.id,
        kind: g.kind,
        enabled: !g.enabled,
        config: g.config
      }), p.success(`${g.id} 已${g.enabled ? "禁用" : "启用"}`), y();
    } catch (k) {
      p.error("操作失败: " + k.message);
    }
  };
  return n ? /* @__PURE__ */ c("div", { style: Oe, children: /* @__PURE__ */ c("div", { style: Nt, children: "加载中..." }) }) : a ? /* @__PURE__ */ c("div", { style: Oe, children: /* @__PURE__ */ m("div", { style: { ...Nt, color: o("danger") }, children: [
    "加载失败: ",
    a
  ] }) }) : /* @__PURE__ */ m("div", { style: Oe, children: [
    h,
    /* @__PURE__ */ m("div", { style: $t, children: [
      /* @__PURE__ */ c("h3", { style: Dt, children: "添加服务商" }),
      /* @__PURE__ */ c("p", { style: no, children: "每种类型的服务商可以创建多个实例（例如 xunhu_main / xunhu_backup），便于多商户号或主备切换。" }),
      /* @__PURE__ */ c("div", { style: ro, children: l.map((g) => /* @__PURE__ */ m("div", { style: oo, children: [
        /* @__PURE__ */ c("div", { style: { fontWeight: 600, color: o("text"), fontSize: 15 }, children: g.name }),
        /* @__PURE__ */ c("div", { style: { fontSize: 12, color: o("textSecondary"), marginTop: 6 }, children: g.description }),
        /* @__PURE__ */ m("div", { style: { fontSize: 12, color: o("textTertiary"), marginTop: 8 }, children: [
          "支持: ",
          g.supported_methods.map(je).join(" / ")
        ] }),
        /* @__PURE__ */ c("button", { style: { ...tn, marginTop: 12, width: "100%" }, onClick: () => S(g), children: "+ 添加" })
      ] }, g.kind)) })
    ] }),
    /* @__PURE__ */ m("div", { style: $t, children: [
      /* @__PURE__ */ c("h3", { style: Dt, children: "已配置的服务商实例" }),
      e.length === 0 ? /* @__PURE__ */ c("p", { style: ao, children: "暂未配置任何服务商。请在上方点「+ 添加」选择类型。" }) : /* @__PURE__ */ c("div", { style: io, children: e.map((g) => /* @__PURE__ */ m("div", { style: lo, children: [
        /* @__PURE__ */ m("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
          /* @__PURE__ */ m("div", { children: [
            /* @__PURE__ */ c("div", { style: { fontWeight: 600, color: o("text"), fontSize: 15 }, children: g.name || g.id }),
            /* @__PURE__ */ m("div", { style: { fontSize: 12, color: o("textTertiary"), marginTop: 4, fontFamily: o("fontMono") }, children: [
              g.id,
              " · ",
              g.kind
            ] })
          ] }),
          /* @__PURE__ */ c("span", { style: g.is_running ? en : so, children: g.is_running ? "运行中" : g.enabled ? "已启用未就绪" : "已禁用" })
        ] }),
        /* @__PURE__ */ m("div", { style: { fontSize: 12, color: o("textSecondary"), marginTop: 12 }, children: [
          "支持: ",
          g.supported_methods.map(je).join(" / ")
        ] }),
        /* @__PURE__ */ m("div", { style: { display: "flex", gap: 8, marginTop: 16 }, children: [
          /* @__PURE__ */ c("button", { style: ae, onClick: () => u(g), children: "编辑" }),
          /* @__PURE__ */ c("button", { style: ae, onClick: () => L(g), children: g.enabled ? "禁用" : "启用" }),
          /* @__PURE__ */ c("button", { style: { ...ae, color: o("danger") }, onClick: () => C(g.id), children: "删除" })
        ] })
      ] }, g.id)) })
    ] }),
    d && /* @__PURE__ */ c(
      Zr,
      {
        editing: d,
        kinds: l,
        onCancel: () => f(null),
        onSaved: (g) => {
          f(null), p.success(g), y();
        },
        onError: (g) => p.error(g)
      }
    )
  ] });
}
function Zr({
  editing: e,
  kinds: i,
  onCancel: l,
  onSaved: r,
  onError: n
}) {
  const [t, a] = P(e), [s, d] = P(!1), f = ln(() => i.find((h) => h.kind === t.kind), [i, t.kind]), p = async () => {
    if (!f) {
      n("未知的服务商类型");
      return;
    }
    for (const h of f.field_descriptors)
      if (h.required && !t.config[h.key]) {
        n(`「${h.label}」必填`);
        return;
      }
    if (!(t.mode === "edit" && t.originalId && t.id.trim() !== t.originalId && !await Zt(
      `确认将实例 ID 从「${t.originalId}」重命名为「${t.id.trim()}」？

所有历史订单的 provider_id 引用会在事务里同步更新；如果该商户号在第三方支付平台已经下过单，
已发出去的回调地址（含原 ID）会失效——平台未来回调请求会路由不到本服务。`,
      { title: "重命名服务商 ID", danger: !0 }
    ))) {
      d(!0);
      try {
        const y = (await D.adminUpsertProvider({
          id: t.id.trim(),
          original_id: t.originalId,
          kind: t.kind,
          enabled: t.enabled,
          config: t.config
        })).id || t.id.trim();
        r(t.mode === "create" ? `已创建 ${y}` : `已更新 ${y}`);
      } catch (h) {
        n("保存失败: " + h.message);
      } finally {
        d(!1);
      }
    }
  };
  return /* @__PURE__ */ c("div", { style: fo, onClick: l, children: /* @__PURE__ */ m("div", { style: go, onClick: (h) => h.stopPropagation(), children: [
    /* @__PURE__ */ m("div", { style: ho, children: [
      /* @__PURE__ */ m("h3", { style: { margin: 0, fontSize: 16, fontWeight: 600 }, children: [
        t.mode === "create" ? "添加" : "编辑",
        "服务商 - ",
        (f == null ? void 0 : f.name) || t.kind
      ] }),
      /* @__PURE__ */ c("button", { style: po, onClick: l, children: "×" })
    ] }),
    /* @__PURE__ */ m("div", { style: yo, children: [
      /* @__PURE__ */ c(
        We,
        {
          label: "实例 ID",
          description: t.mode === "edit" ? "可修改。改名时后端会在事务里同步更新所有历史订单的 provider_id 引用，回调路径也会立即指向新名字。" : "可选。留空则自动生成 epay_xunhu_1 之类的序号；也可以填一个有意义的名字如 xunhu_main / xunhu_backup 便于多商户号区分。",
          children: /* @__PURE__ */ c(
            "input",
            {
              type: "text",
              value: t.id,
              onChange: (h) => a({ ...t, id: h.target.value }),
              placeholder: t.mode === "create" ? "留空自动生成" : "",
              style: { ...He, fontFamily: o("fontMono"), fontSize: 12 }
            }
          )
        }
      ),
      /* @__PURE__ */ c(We, { label: "启用", children: /* @__PURE__ */ m("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [
        /* @__PURE__ */ c(
          "input",
          {
            type: "checkbox",
            checked: t.enabled,
            onChange: (h) => a({ ...t, enabled: h.target.checked })
          }
        ),
        /* @__PURE__ */ c("span", { style: { fontSize: 13, color: o("textSecondary") }, children: "勾选后该服务商参与支付路由" })
      ] }) }),
      f == null ? void 0 : f.field_descriptors.map((h) => /* @__PURE__ */ c(We, { label: h.label, description: h.description, required: h.required, children: h.type === "textarea" ? /* @__PURE__ */ c(
        "textarea",
        {
          value: t.config[h.key] || "",
          onChange: (y) => a({ ...t, config: { ...t.config, [h.key]: y.target.value } }),
          placeholder: h.placeholder,
          style: { ...He, minHeight: 120, fontFamily: o("fontMono"), fontSize: 12 }
        }
      ) : h.type === "bool" ? /* @__PURE__ */ c("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: /* @__PURE__ */ c(
        "input",
        {
          type: "checkbox",
          checked: t.config[h.key] === "true",
          onChange: (y) => a({ ...t, config: { ...t.config, [h.key]: y.target.checked ? "true" : "false" } })
        }
      ) }) : h.type === "method-multi" ? /* @__PURE__ */ c(
        eo,
        {
          candidates: f.supported_methods,
          value: t.config[h.key] || "",
          onChange: (y) => a({ ...t, config: { ...t.config, [h.key]: y } })
        }
      ) : /* @__PURE__ */ c(
        "input",
        {
          type: h.type === "password" ? "password" : h.type === "number" ? "number" : "text",
          value: t.config[h.key] || "",
          onChange: (y) => a({ ...t, config: { ...t.config, [h.key]: y.target.value } }),
          placeholder: h.placeholder,
          style: He
        }
      ) }, h.key))
    ] }),
    /* @__PURE__ */ m("div", { style: mo, children: [
      /* @__PURE__ */ c("button", { style: ae, onClick: l, disabled: s, children: "取消" }),
      /* @__PURE__ */ c("button", { style: tn, onClick: p, disabled: s, children: s ? "保存中..." : "保存" })
    ] })
  ] }) });
}
function eo({
  candidates: e,
  value: i,
  onChange: l
}) {
  const r = new Set(i.split(",").map((t) => t.trim()).filter(Boolean)), n = (t) => {
    r.has(t) ? r.delete(t) : r.add(t);
    const a = e.filter((s) => r.has(s)).join(",");
    l(a);
  };
  return /* @__PURE__ */ m("div", { style: { display: "flex", flexWrap: "wrap", gap: 12 }, children: [
    e.map((t) => {
      const a = r.has(t);
      return /* @__PURE__ */ m(
        "label",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            border: `1px solid ${o(a ? "primary" : "glassBorder")}`,
            borderRadius: o("radiusMd"),
            background: o(a ? "primarySubtle" : "bg"),
            color: o(a ? "primary" : "text"),
            cursor: "pointer",
            fontSize: 13,
            fontWeight: a ? 600 : 400,
            transition: "all 0.15s"
          },
          children: [
            /* @__PURE__ */ c(
              "input",
              {
                type: "checkbox",
                checked: a,
                onChange: () => n(t),
                style: { margin: 0 }
              }
            ),
            je(t)
          ]
        },
        t
      );
    }),
    e.length === 0 && /* @__PURE__ */ c("span", { style: { fontSize: 12, color: o("textTertiary") }, children: "该协议没有可选的支付方式" })
  ] });
}
function We({
  label: e,
  description: i,
  required: l,
  children: r
}) {
  return /* @__PURE__ */ m("div", { style: { marginBottom: 16 }, children: [
    /* @__PURE__ */ m("label", { style: co, children: [
      e,
      l && /* @__PURE__ */ c("span", { style: { color: o("danger"), marginLeft: 4 }, children: "*" })
    ] }),
    r,
    i && /* @__PURE__ */ c("div", { style: uo, children: i })
  ] });
}
function je(e) {
  return { alipay: "支付宝", wxpay: "微信支付" }[e] || e;
}
function to(e) {
  const i = {};
  for (const l of e.field_descriptors)
    l.type === "bool" ? i[l.key] = "false" : i[l.key] = "";
  return i;
}
const Oe = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "24px 24px 48px",
  color: o("text")
}, Nt = {
  padding: "40px 0",
  textAlign: "center",
  color: o("textSecondary")
}, no = {
  margin: "4px 0 16px",
  fontSize: 13,
  color: o("textSecondary")
}, Dt = {
  margin: "0 0 12px",
  fontSize: 14,
  fontWeight: 600,
  color: o("text"),
  textTransform: "uppercase",
  letterSpacing: "0.04em"
}, $t = {
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusLg"),
  background: o("bgSurface"),
  padding: 20,
  marginBottom: 20
}, ro = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 12
}, oo = {
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  padding: 16,
  background: o("bgElevated")
}, io = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: 12
}, lo = {
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  padding: 16,
  background: o("bgElevated")
}, ao = {
  color: o("textTertiary"),
  textAlign: "center",
  padding: "24px 0",
  fontSize: 14
}, en = {
  padding: "2px 8px",
  borderRadius: 4,
  background: o("successSubtle"),
  color: o("success"),
  fontSize: 11,
  fontWeight: 600
}, so = {
  ...en,
  background: o("warningSubtle"),
  color: o("warning")
}, ae = {
  padding: "6px 14px",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: "transparent",
  color: o("text"),
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500
}, tn = {
  padding: "8px 16px",
  border: "none",
  borderRadius: o("radiusMd"),
  background: o("primary"),
  color: o("textInverse"),
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
}, He = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusMd"),
  background: o("bgElevated"),
  color: o("text"),
  fontSize: 13,
  boxSizing: "border-box"
}, co = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: o("textSecondary"),
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.03em"
}, uo = {
  marginTop: 6,
  fontSize: 11,
  color: o("textTertiary")
}, fo = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1e3
}, go = {
  width: 600,
  maxWidth: "92vw",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  background: o("bgSurface"),
  border: `1px solid ${o("glassBorder")}`,
  borderRadius: o("radiusLg"),
  overflow: "hidden"
}, ho = {
  padding: "16px 20px",
  borderBottom: `1px solid ${o("glassBorder")}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
}, po = {
  background: "transparent",
  border: "none",
  color: o("textSecondary"),
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1
}, yo = {
  padding: 20,
  overflowY: "auto",
  flex: 1
}, mo = {
  padding: "12px 20px",
  borderTop: `1px solid ${o("glassBorder")}`,
  display: "flex",
  justifyContent: "flex-end",
  gap: 8
}, xo = {
  routes: [
    { path: "/recharge", component: Dn },
    { path: "/orders", component: Kn },
    { path: "/admin/orders", component: sr },
    { path: "/admin/providers", component: Xr }
  ]
};
export {
  xo as default
};
