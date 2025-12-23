(() => {
    var e = {
        982: () => {
            var e = document.getElementById("modal"), t = document.getElementById("openModal"), n = document.getElementsByClassName("close")[0];
            t.onclick = function () {
                e.style.display = "block";
            }, n.onclick = function () {
                e.style.display = "none";
            }, window.onclick = function (t) {
                t.target == e && (e.style.display = "none");
            };
        }
    }, t = {};
    function n(r) {
        if (t[r]) return t[r].exports;
        var i = t[r] = { exports: {} };
        return e[r](i, i.exports, n), i.exports;
    }
    (() => {
        "use strict";
        n(982);
        class e {
            constructor(e, t, n) {
                this.left = e, this.op = t, this.right = n;
            }
        }
        class t {
            constructor(e) {
                this.type = e.type, this.value = e.value;
            }
        }
        class r {
            constructor(e) {
                this.type = e.type, this.value = e.value;
            }
        }
        class i {
            constructor(e) {
                this.inside = e;
            }
        }
        class s {
            constructor(e, t) {
                this.type = e.type, this.val = e.value, this.input = t;
            }
        }
        const a = { ADD: 0, SUB: 0, MUL: 1, DIV: 1, POW: 2 };
        class o {
            constructor(e, t) {
                this.type = e, this.value = t;
            }
            toString() {
                return `Token(${this.type}, ${this.value})`;
            }
        }
        class c {
            constructor(e) {
                this.str = e, this.currentPos = 0, this.currentChar = e[this.currentPos];
            }
            getNextToken() {
                for (; null != this.currentChar;) {
                    let e = this.currentChar;
                    if (" " != e) {
                        if (!isNaN(e)) return new o("NUM", this.number());
                        if (1 === e.length && e.match(/[a-z]/i)) {
                            let e = this.string();
                            return e.length > 1 ? new o("FUNC", e) : new o("VAR", e);
                        }
                        if ("+" == e) return this.advance(), new o("ADD", "+");
                        if ("-" == e) return this.advance(), new o("SUB", "-");
                        if ("*" == e) return this.advance(), new o("MUL", "*");
                        if ("/" == e) return this.advance(), new o("DIV", "/");
                        if ("^" == e) return this.advance(), new o("POW", "^");
                        if ("(" == e) return this.advance(), new o("LP", "(");
                        if (")" == e) return this.advance(), new o("RP", ")");
                        console.error("Unrecognized Char:", e);
                    } else this.skipWhitespace();
                }
                return new o("EOF", null);
            }
            advance() {
                this.currentPos += 1, this.currentPos > this.str.length - 1 ? this.currentChar = null : this.currentChar = this.str[this.currentPos];
            }
            number() {
                let e = "";
                for (; null != this.currentChar && !isNaN(this.currentChar);) e += this.currentChar, this.advance();
                return parseFloat(e);
            }
            string() {
                let e = "";
                for (; null != this.currentChar && (1 === this.currentChar.length && this.currentChar.match(/[a-z]/i));) e += this.currentChar, this.advance();
                return e;
            }
            skipWhitespace() {
                for (; null != this.currentChar && " " == this.currentChar;) this.advance();
            }
        }
        class l {
            constructor(e) {
                this.lexer = e, this.currentToken = e.getNextToken();
            }
            error(e) {
                throw e;
            }
            eat(e) {
                this.currentToken.type == e ? this.currentToken = this.lexer.getNextToken() : this.error(`Incorrect Token Eaten: Expected ${e} but got ${this.currentToken.type}`);
            }
            parse() {
                return this.expression();
            }
            expression() {
                let n, c = this.currentToken;
                if ("FUNC" == c.type) {
                    let e = c;
                    this.eat("FUNC"), n = new s(e, this.expression());
                }
                "LP" == c.type && (this.eat("LP"), n = new i(this.expression())), ["NUM", "VAR"].includes(c.type) && ("NUM" == c.type ? n = new t(c) : "VAR" == c.type && (n = new r(c)), this.eat(n.type));
                let u, l = this.currentToken;
                if (["RP", "EOF"].includes(l.type)) return this.eat(l.type), n;
                if ("LP" == l.type) {
                    if (n instanceof t || n instanceof r || n instanceof i) return new e(n, new o("MUL", "*"), this.expression());
                } else if ("FUNC" == l.type) return this.eat("FUNC"), new e(n, new o("MUL", "*"), new s(l, this.expression()));
                if ("VAR" == l.type ? (u = l, l = new o("MUL", "*")) : this.eat(l.type), u = this.expression(), u instanceof t || u instanceof r) return new e(n, l, u);
                if (u instanceof e) {
                    if (a[l.type] > a[u.op.type]) {
                        let t = new e(n, l, u.left);
                        return new e(t, u.op, u.right);
                    }
                    return new e(n, l, u);
                }
                return u instanceof i || u instanceof s ? new e(n, l, u) : undefined;
            }
        }
        function h(n) {
            if (n instanceof e) {
                let e;
                switch (n.op.type) {
                    case "ADD":
                        e = "c_add";
                        break;
                    case "SUB":
                        e = "c_sub";
                        break;
                    case "MUL":
                        e = "c_mul";
                        break;
                    case "DIV":
                        e = "c_div";
                        break;
                    case "POW":
                        e = "c_pow";
                }
                return `${e}(${h(n.left)},${h(n.right)})`;
            }
            if (n instanceof t) return `complex(${n.value}, 0.0)`;
            if (n instanceof r) return n.value;
            if (n instanceof s) {
                let e;
                switch (n.val) {
                    case "sin":
                        e = "c_sin";
                        break;
                    case "cos":
                        e = "c_cos";
                }
                return `${e}(${h(n.input)})`;
            }
            return n instanceof i ? h(n.inside) : undefined;
        }
        function f(n, a) {
            if (n instanceof e) {
                if ("MUL" == n.op.type && "NUM" == n.left.type) return new e(n.left, n.op, f(n.right, a));
                if ("POW" == n.op.type && "VAR" == n.left.type && "NUM" == n.right.type) return new e(n.right, new o("MUL", "*"), new e(n.left, n.op, new t(new o("NUM", n.right.value - 1))));
                if (["ADD", "SUB"].includes(n.op.type)) return new e(f(n.left, a), n.op, f(n.right, a));
            }
            if (n instanceof t) return new t(new o("NUM", 0));
            if (n instanceof r) return n.value == a.value ? new t(new o("NUM", 1)) : new t(new o("NUM", 0));
            if (n instanceof s) {
                let r = f(n.input, a), i = n.val;
                switch (i) {
                    case "sin":
                        return new e(r, new o("MUL", "*"), new s(new o("FUNC", "cos"), n.input));
                    case "cos":
                        let a = new e(r, new o("MUL", "*"), new s(new o("FUNC", "sin"), n.input));
                        return new e(new t(new o("NUM", -1)), new o("MUL", "*"), a);
                    default:
                        console.error("Can't take derivative of function", i);
                }
            }
            return n instanceof i ? f(n.inside, a) : undefined;
        }
        function p(e, t, n) {
            let r = e.createShader(t);
            if (e.shaderSource(r, n), e.compileShader(r), e.getShaderParameter(r, e.COMPILE_STATUS)) return r;
            console.log(e.getShaderInfoLog(r)), e.deleteShader(r);
        }
        function w(e, t, n, r, i) {
            let s = e.getUniformLocation(t, r);
            "1f" === n ? e.uniform1f(s, i) : "2f" === n ? e.uniform2f(s, i[0], i[1]) : "3f" === n && e.uniform3f(s, i[0], i[1], i[2]);
        }
        var d = document.getElementById("canvas");
        const g = d.getContext("webgl2");
        var y, v, m = "z^3 + m";
        function U(e) {
            let [t, n] = function (e) {
                let t = new c(e), n = new l(t).parse(), i = f(n, new r(new o("VAR", "z")));
                return [h(n), h(i)];
            }(e), i = v;
            return i = i.replaceAll("complex(0, 0);//%%f%%", t), i = i.replaceAll("complex(0, 0);//%%fp%%", n), i;
        }
        function A() {
            if (!y || !v) return void console.warn("Vertex or Fragment code not loaded yet!");
            let e, t = U(m), n = p(g, g.VERTEX_SHADER, y), r = p(g, g.FRAGMENT_SHADER, t);
            try {
                e = function (e, t, n) {
                    let r = e.createProgram();
                    try {
                        e.attachShader(r, t), e.attachShader(r, n);
                    } catch (e) {
                        throw "Didn't compile!";
                    }
                    if (e.linkProgram(r), e.getProgramParameter(r, e.LINK_STATUS)) return r;
                    e.deleteProgram(r);
                }(g, n, r);
            } catch (e) {
                throw "Didn't compile!";
            }
            let i = g.getAttribLocation(e, "a_position"), s = g.createBuffer();
            g.bindBuffer(g.ARRAY_BUFFER, s), g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), g.STATIC_DRAW);
            let a = g.createVertexArray();
            g.bindVertexArray(a), g.enableVertexAttribArray(i);
            let o = g.FLOAT;
            g.vertexAttribPointer(i, 2, o, false, 0, 0), function (e) {
                const t = e.clientWidth, n = e.clientHeight;
                (e.width !== t || e.height !== n) && (e.width = t, e.height = n);
            }(d), g.viewport(0, 0, g.canvas.width, g.canvas.height), g.clearColor(0, 0, 0, 0), g.clear(g.COLOR_BUFFER_BIT), g.useProgram(e), g.bindVertexArray(a);
            let c = g.getParameter(g.CURRENT_PROGRAM);
            w(g, c, "1f", "width", g.canvas.width), w(g, c, "1f", "height", g.canvas.height), C();
        }
        function C() {
            let e = d.getContext("webgl2"), t = e.TRIANGLES;
            e.drawArrays(t, 0, 6), window.requestAnimationFrame(C);
        }
        document.addEventListener("mousemove", e => {
            if ("block" == modal.style.display) return;
            let t = d.getContext("webgl2"), n = t.getParameter(t.CURRENT_PROGRAM);
            n && w(t, n, "2f", "mousepos", [e.clientX, e.clientY]);
        });
        let x = document.getElementById("function");
        function N(e) {
            x.style.backgroundColor = e ? "#F78167" : "#FFF";
        }
        x.value = m, x.addEventListener("change", e => {
            m = x.value, canvas.getContext("webgl2").deleteProgram(undefined);
            try {
                A(), N(false);
            } catch (e) {
                console.log(e), N(true);
            }
        }), async function () {
            y = await (await fetch("./vertex_shader.vert")).text(), v = await (await fetch("./fragment_shader.frag")).text(), A();
        }();
    })();
})();
