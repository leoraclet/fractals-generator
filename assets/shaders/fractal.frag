// ==================================================== //
//
// Description : Fractals with emulated doubles
// Author      : Léo Raclet
// License     : MIT
// Version     : v1.0.0
//
// ==================================================== //

// Emulation based on GLSL Mandelbrot Shader by Henry Thasler
// (www.thasler.org/blog) and on Fortran-90 double-single package (See
// http://crd.lbl.gov/~dhbailey/mpdist/)

// Smooth coloring based on http://linas.org/art-gallery/escape/escape.html

#version 420

// Turn off nvidia's card optimizations
#pragma optionNV(fastmath off)
#pragma optionNV(fastprecision off)

precision highp float;

uniform float z0, z1;    // Zoom
uniform float w0, w1;    // Screen width
uniform float h0, h1;    // Screen height
uniform float cR, cI;    // Constant
uniform float cx0, cx1;  // Center of the complex plane on the x-axis
uniform float cy0, cy1;  // Center of the complex plane on the y-axis

uniform int iterations;  // Maximum number of iterations
uniform int fractal;     // Which fractal to draw ?
uniform int color;       // How to color the fractal ?
uniform vec2 mousepos;   // Mouse position

out vec4 FragColor;      // Pixel color


// ==================================================== //
// Define color pallets
// ==================================================== //

/*
 * @brief: Sky style
 */

vec4 cp1[6] = {
    vec4(  0.0 / 255,   7.0 / 255, 100.0 / 255, 1.0),
    vec4( 32.0 / 255, 107.0 / 255, 203.0 / 255, 1.0),
    vec4(237.0 / 255, 255.0 / 255, 255.0 / 255, 1.0),
    vec4(255.0 / 255, 170.0 / 255,   0.0 / 255, 1.0),
    vec4(  0.0 / 255,   2.0 / 255,   0.0 / 255, 1.0),
    vec4(  0.0 / 255,   7.0 / 255, 100.0 / 255, 1.0),
};

/*
 * @brief: Fire style
 */

vec4 cp2[5] = {
    vec4( 20.0 / 255,   0.0 / 255,   0.0 / 255, 1.0),
    vec4(255.0 / 255,  20.0 / 255,   0.0 / 255, 1.0),
    vec4(255.0 / 255, 200.0 / 255,   0.0 / 255, 1.0),
    vec4(255.0 / 255,  20.0 / 255,   0.0 / 255, 1.0),
    vec4( 20.0 / 255,   0.0 / 255,   0.0 / 255, 1.0),
};

/*
 * @brief: Electrical style
 */

vec4 cp3[5] = {
    vec4(  0.0 / 255,   0.0 / 255,   0.0 / 255, 1.0),
    vec4(  0.0 / 255,   0.0 / 255, 200.0 / 255, 1.0),
    vec4(255.0 / 255, 255.0 / 255, 255.0 / 255, 1.0),
    vec4(  0.0 / 255,   0.0 / 255, 200.0 / 255, 1.0),
    vec4(  0.0 / 255,   0.0 / 255,   0.0 / 255, 1.0),
};

/*
 * @brief: Gold style
 */

vec4 cp4[5] = {
    vec4( 85.0 / 255,  47.0 / 255,   0.0 / 255, 1.0),
    vec4(255.0 / 255, 171.0 / 255,  12.0 / 255, 1.0),
    vec4(255.0 / 255, 171.0 / 255,  12.0 / 255, 1.0),
    vec4(255.0 / 255, 171.0 / 255,  12.0 / 255, 1.0),
    vec4( 85.0 / 255,  47.0 / 255,   0.0 / 255, 1.0)
};

// ==================================================== //
// Workaround functions to avoid GLSL optimizations
// ==================================================== //

/*
 * @brief: Add two floats. Avoid GLSL optimizations
 *
 * @param a: First float
 * @param b: Second float
 *
 * @return: Sum of the two floats
 */

float f_add(float a, float b)
{
    return mix(a, a + b, b != 0);
}

/*
 * @brief: Subtract two floats. Avoid GLSL optimizations
 *
 * @param a: Float n°1
 * @param b: Float n°2
 *
 * @return: Difference between the two floats
 */

float f_sub(float a, float b)
{
    return mix(a, a - b, b != 0);
}

// ==================================================== //
// Functions to emulate operations on double-single
// ==================================================== //

/*
 * @brief: Create a double-single from a float
 *
 * @param a: Float value
 *
 * @return: Double-single from the float
 */

vec2 ds_set(float a)
{
    vec2 z;

    z.x = a;
    z.y = 0.0;

    return z;
}

/*
 * @brief: Add two double-single
 *
 * @param dsa: Double-single n°1
 * @param dsb: Double-single n°2
 *
 * @return: Sum of the two double-single
 */

vec2 ds_add(vec2 dsa, vec2 dsb)
{
    vec2 dsc;
    float t1, t2, e;

    t1 = f_add(dsa.x, dsb.x);
    e = f_sub(t1, dsa.x);
    t2 = ((dsb.x - e) + (dsa.x - (t1 - e))) + dsa.y + dsb.y;

    dsc.x = f_add(t1, t2);
    dsc.y = t2 - (dsc.x - t1);

    return dsc;
}

/*
 * @brief: Subtract two double-single
 *
 * @param dsa: Double-single n°1
 * @param dsb: Double-single n°2
 *
 * @return: Difference between the two double-single
 */

vec2 ds_sub(vec2 dsa, vec2 dsb)
{
    vec2 dsc;
    float e, t1, t2;

    t1 = f_sub(dsa.x, dsb.x);
    e = f_sub(t1, dsa.x);
    t2 = ((-dsb.x - e) + (dsa.x - (t1 - e))) + dsa.y - dsb.y;

    dsc.x = f_add(t1, t2);
    dsc.y = t2 - (dsc.x - t1);

    return dsc;
}

/*
 * @brief: Mulitply two double-single
 *
 * @param dsa: Double-single n°1
 * @param dsb: Double-single n°2
 *
 * @return: Product of the two double-single
 */

vec2 ds_mul(vec2 dsa, vec2 dsb)
{
    vec2 dsc;
    float c11, c21, c2, e, t1, t2;
    float a1, a2, b1, b2, cona, conb, split = 8193.0;

    cona = dsa.x * split;
    conb = dsb.x * split;
    a1 = cona - f_sub(cona, dsa.x);
    b1 = conb - f_sub(conb, dsb.x);
    a2 = dsa.x - a1;
    b2 = dsb.x - b1;

    c11 = dsa.x * dsb.x;
    c21 = a2 * b2 + (a2 * b1 + (a1 * b2 + (a1 * b1 - c11)));

    c2 = dsa.x * dsb.y + dsa.y * dsb.x;

    t1 = f_add(c11, c2);
    e = f_sub(t1, c11);
    t2 = dsa.y * dsb.y + ((c2 - e) + (c11 - (t1 - e))) + c21;

    dsc.x = f_add(t1, t2);
    dsc.y = t2 - (dsc.x - t1);

    return dsc;
}

/*
 * @brief: Divide two double-single
 *
 * @param dsa: Double-single n°1
 * @param dsb: Double-single n°2
 *
 * @return: Quotient the two double-single
 */

vec2 ds_div(vec2 dsa, vec2 dsb)
{
    vec2 dsc;
    float c11, c21, c2, e, s1, s2, t1, t2, t11, t12, t21, t22;
    float a1, a2, b1, b2, cona, conb, split = 8193.0;

    s1 = dsa.x / dsb.x;

    cona = s1 * split;
    conb = dsb.x * split;
    a1 = cona - f_sub(cona, s1);
    b1 = conb - f_sub(conb, dsb.x);
    a2 = s1 - a1;
    b2 = dsb.x - b1;

    c11 = s1 * dsb.x;
    c21 = (((a1 * b1 - c11) + a1 * b2) + a2 * b1) + a2 * b2;
    c2 = s1 * dsb.y;

    t1 = f_add(c11, c2);
    e = f_sub(t1, c11);
    t2 = ((c2 - e) + (c11 - (t1 - e))) + c21;

    t12 = f_add(t1, t2);
    t22 = t2 - (t12 - t1);

    t11 = f_sub(dsa[0], t12);
    e = t11 - dsa[0];
    t21 = ((-t12 - e) + (dsa.x - (t11 - e))) + dsa.y - t22;

    s2 = (t11 + t21) / dsb.x;

    dsc.x = f_add(s1, s2);
    dsc.y = s2 - (dsc.x - s1);

    return dsc;
}

/*
 * @brief: Compare two double-single
 *
 * @param dsa: Double-single n°1
 * @param dsb: Double-single n°2
 *
 * @return: 1 if @dsa > @dsb; 0 if == ; -1 else
 */

int ds_cmp(vec2 dsa, vec2 dsb)
{
    if (dsa.x < dsb.x) return -1;
    else if (dsa.x == dsb.x)
    {
        if (dsa.y < dsb.y) return -1;
        else if (dsa.y == dsb.y) return 0;
        else return 1;
    }
    else return 1;
}

/*
 * @brief: Square a double-single
 *
 * @param dsa: Double-single
 *
 * @return: Squared double-single
 */

vec2 ds_sqr(vec2 a)
{
    return ds_mul(a, a);
}

// ###########################
// ###########################
//
// TODO: VERIFY !
// https://github.com/BL-highprecision/QD/blob/main/src/dd_real.cpp
//
// ###########################
// ###########################

vec2 ds_round(vec2 a)
{
    return vec2(round(a.x + a.y), 0.0);
}

vec2 ds_ldexp(vec2 a, int exp)
{
  float scale = ldexp(1.0, exp);
  return vec2(a.x * scale, a.y * scale);
}

vec2 ds_sin(vec2 x)
{
  vec2 pi = vec2(3.141592653589793, 1.2246467991473532e-16);
  vec2 two_pi = ds_mul(pi, vec2(2.0, 0.0));
  vec2 n = ds_div(x, two_pi);
  n = ds_round(n);
  vec2 r = ds_sub(x, ds_mul(n, two_pi));

  vec2 r2 = ds_mul(r, r);
  vec2 r3 = ds_mul(r2, r);
  vec2 r5 = ds_mul(r3, r2);
  vec2 r7 = ds_mul(r5, r2);

  vec2 inv6 = vec2(1.66666666666666657e-01, 9.25185853854297066e-18);
  vec2 inv120 = vec2(8.33333333333333322e-03, 1.15648231731787138e-19);
  vec2 inv5040 = vec2(1.98412698412698413e-04, 1.72095582934207053e-22);

  vec2 term1 = r;
  vec2 term2 = ds_mul(r3, inv6);
  vec2 term3 = ds_mul(r5, inv120);
  vec2 term4 = ds_mul(r7, inv5040);

  vec2 result = ds_sub(term1, term2);
  result = ds_add(result, term3);
  result = ds_sub(result, term4);

  return result;
}

vec2 ds_cos(vec2 x)
{
  // Argument reduction: x = x mod (2*pi)
  vec2 pi = vec2(3.141592653589793, 1.2246467991473532e-16);
  vec2 two_pi = ds_mul(pi, vec2(2.0, 0.0));
  vec2 n = ds_div(x, two_pi);
  n = ds_round(n);
  vec2 r = ds_sub(x, ds_mul(n, two_pi));

  // Taylor series for cos(r)
  vec2 r2 = ds_mul(r, r);
  vec2 r4 = ds_mul(r2, r2);
  vec2 r6 = ds_mul(r4, r2);

  // cos(r) ≈ 1 - r2/2 + r4/24 - r6/720
  vec2 inv2 = vec2(5.0e-1, 0.0);
  vec2 inv24 = vec2(4.16666666666666644e-02, 2.31296463463574266e-18);
  vec2 inv720 = vec2(1.38888888888888894e-03, -5.30054395437357706e-20);

  vec2 term1 = vec2(1.0, 0.0);
  vec2 term2 = ds_mul(r2, inv2);
  vec2 term3 = ds_mul(r4, inv24);
  vec2 term4 = ds_mul(r6, inv720);

  vec2 result = ds_sub(term1, term2);
  result = ds_add(result, term3);
  result = ds_sub(result, term4);

  return result;
}

vec2 ds_tan(vec2 x)
{
  vec2 sin_x = ds_sin(x);
  vec2 cos_x = ds_cos(x);
  return ds_div(sin_x, cos_x);
}

vec2 ds_sqrt(vec2 a) {
  if (a.x < 0.0) {
    return vec2(0.0 / 0.0, 0.0);
  }
  if (a.x == 0.0 && a.y == 0.0) {
    return vec2(0.0, 0.0);
  }

  float x = inversesqrt(a.x);
  vec2 ax = ds_mul(a, vec2(x, 0.0));
  vec2 ax_sqr = ds_mul(ax, ax);
  vec2 diff = ds_sub(a, ax_sqr);
  vec2 term = ds_mul(diff, vec2(x * 0.5, 0.0));
  vec2 result = ds_add(ax, term);

  return result;
}

vec2 ds_exp(vec2 a) {
  if (a.x <= -709.0) {
    return vec2(0.0, 0.0);
  }
  if (a.x >= 709.0) {
    return vec2(1.0 / 0.0, 0.0);
  }

  vec2 log2 = vec2(0.6931471805599453, 2.3190468138462996e-17);
  float m = floor(a.x / log2.x + 0.5);
  vec2 r = ds_sub(a, ds_mul(log2, vec2(m, 0.0)));

  vec2 r_sqr = ds_mul(r, r);
  vec2 s = ds_add(r, ds_mul(r_sqr, vec2(0.5, 0.0)));
  vec2 p = ds_mul(r_sqr, r);
  vec2 t = ds_mul(p, vec2(1.66666666666666657e-01, 9.25185853854297066e-18));
  s = ds_add(s, t);
  p = ds_mul(p, r_sqr);
  t = ds_mul(p, vec2(8.33333333333333322e-03, 1.15648231731787138e-19));
  s = ds_add(s, t);

  return ds_ldexp(s, int(m));
}

vec2 ds_log(vec2 a) {
  if (a.x <= 0.0) {
    return vec2(0.0 / 0.0, 0.0);
  }

  float x = log(a.x);
  vec2 exp_x = ds_exp(vec2(x, 0.0));
  vec2 diff = ds_sub(a, exp_x);
  vec2 term = ds_div(diff, exp_x);
  vec2 result = ds_add(vec2(x, 0.0), term);

  return result;
}

vec2 ds_pow(vec2 a, vec2 b) {
  if (a.x == 0.0 && a.y == 0.0 && b.x == 0.0 && b.y == 0.0) {
    return vec2(0.0 / 0.0, 0.0);
  }

  vec2 log_a = ds_log(a);
  vec2 b_log_a = ds_mul(b, log_a);
  vec2 result = ds_exp(b_log_a);

  return result;
}

// ###########################
// ###########################
// ###########################
// ###########################

// ==================================================== //
// Functions to compute operations on double-complex
// ==================================================== //

/*
 * @brief: Add two double-complex
 *
 * @param a: Double-complex n°1
 * @param b: Double-complex n°2
 *
 * @return: Sum of the two double-complex
 */

vec4 dc_add(vec4 a, vec4 b)
{
    return vec4(
        ds_add(a.xy, b.xy),
        ds_add(a.zw, b.zw)
    );
}

/*
 * @brief: Subtract two double-complex
 *
 * @param a: Double-complex n°1
 * @param b: Double-complex n°2
 *
 * @return: Difference between the two double-complex
 */

vec4 dc_sub(vec4 a, vec4 b)
{
    return vec4(
        ds_sub(a.xy, b.xy),
        ds_sub(a.zw, b.zw)
    );
}

/*
 * @brief: Square a double-complex
 *
 * @param a: Double-complex
 *
 * @return: Squared double-complex
 */

vec4 dc_sqr(vec4 a)
{
    return vec4(
        ds_sub(ds_mul(a.xy, a.xy), ds_mul(a.zw, a.zw)),
        ds_mul(ds_mul(a.xy, a.zw), ds_set(2.0))
    );
}

/*
 * @brief: Divide two double-complex
 *
 * @param a: Double-complex n°1
 * @param b: Double-complex n°2
 *
 * @return: Quotient of the two double-complex
 */

vec4 dc_div(vec4 a, vec4 b)
{
    vec2 dn = ds_add(ds_mul(b.xy, b.xy), ds_mul(b.zw, b.zw));

    return vec4(
        ds_div(ds_add(ds_mul(a.xy, b.xy), ds_mul(a.zw, b.zw)), dn),
        ds_div(ds_sub(ds_mul(a.zw, b.xy), ds_mul(a.xy, b.zw)), dn)
    );
}

/*
 * @brief: Distance between two double-complex
 *
 * @param a: Double-complex n°1
 * @param a: Double-complex n°2
 *
 * @return: Distance on complex plane
 */

vec2 dc_len_s(vec4 a, vec4 b)
{
    return ds_add(
        ds_mul(ds_sub(a.xy, b.xy), ds_sub(a.xy, b.xy)),
        ds_mul(ds_sub(a.zw, b.zw), ds_sub(a.zw, b.zw))
    );
}

/*
 * @brief: Multiply double-complex by double-single
 *
 * @param a: Double-complex
 * @param b: Double-single
 *
 * @return: Product of doulbe-complex and the odulbe-single
 */

vec4 dc_mul_d(vec4 a, vec2 b)
{
    return vec4(
        ds_mul(a.xy, b),
        ds_mul(a.zw, b)
    );
}

/*
 * @brief: Multiply two double-complex
 *
 * @param a: Double-complex n°1
 * @param b: Double-complex n°2
 *
 * @return: Product of the two double-complex
 */

vec4 dc_mul_c(vec4 a, vec4 b)
{
    return vec4(
        ds_sub(ds_mul(a.xy, b.xy), ds_mul(a.zw, b.zw)),
        ds_add(ds_mul(a.xy, b.zw), ds_mul(a.zw, b.xy))
    );
}

/*
 * @brief: Cosine of a double complex
 *
 * @param a: Double-complex
 *
 * @return: Cosine value of the two double-complex
 */

vec2 dc_cos(vec4 a)
{
    return vec2(0.0, 0.0);
}

/*
 * @brief: Sinus of a double complex
 *
 * @param a: Double-complex
 *
 * @return: Sinus value of the two double-complex
 */

vec2 dc_sin(vec4 a)
{
    return vec2(0.0, 0.0);
}

/*
 * @brief: Create double-complex from a single double single
 *
 * @param a: Double-single
 *
 * @return: New double-complex from double-single
 */

vec4 dc_set_d(vec2 a)
{
    return vec4(a.x, a.y, 0.0, 0.0);
}

/*
 * @brief: Create double-complex from double-singles
 *
 * @param a: Double-single n°1
 * @param b: Double-single n°2
 *
 * @return: New double-complex from double-singles
 */

vec4 dc_set_c(vec2 a, vec2 b)
{
    return vec4(a.x, a.y, b.x, b.y);
}


// ==================================================== //
// Newton's method polynomials and derivatives
// ==================================================== //

/*
 * @brief: Newton's polynomial function n°1
 *
 * @param a: Double-complex
 *
 * @return: Compute f(z) = z³ - 1
 */

vec4 newton_f1(vec4 a)
{
    return dc_sub(
        dc_mul_c(dc_sqr(a), a),
        dc_set_d(ds_set(1.0))
    );
}

/*
 * @brief: Newton's derivative function n°1
 *
 * @param a: Double-complex
 *
 * @return: Compute f(z) = 3z²
 */

vec4 newton_d1(vec4 a)
{
    return dc_mul_d(
        dc_sqr(a),
        ds_set(3.0)
    );
}

/*
 * @brief: Newton's polynomial function n°1
 *
 * @param a: Double-complex
 *
 * @return: Compute f(z) = z³ - 2z + 2
 */

vec4 newton_f2(vec4 a)
{
    return dc_add(
        dc_sub(dc_mul_c(dc_sqr(a), a), dc_mul_d(a, ds_set(2.0))),
        dc_set_d(ds_set(2.0))
    );
}

/*
 * @brief: Newton's derivative function n°1
 *
 * @param a: Double-complex
 *
 * @return: Compute f(z) = 3z² - 2
 */

vec4 newton_d2(vec4 a)
{
    return dc_sub(
        dc_mul_d(dc_sqr(a), ds_set(3.0)),
        dc_set_d(ds_set(2.0))
    );
}

// ==================================================== //
// Define newton's method polynomials roots
// ==================================================== //

/*
 * Roots of polynomial: z³ - 1
 */

vec4 roots_f1[3] = {
    dc_set_d(ds_set(1.0)),
    dc_set_c(ds_set(-.5), ds_set(+sqrt(3.0) / 2.0)),
    dc_set_c(ds_set(-.5), ds_set(-sqrt(3.0) / 2.0)),
};

/*
 * Roots of polynomial: z³ - 2z + 2
 */

vec4 roots_f2[3] = {
    dc_set_d(ds_set(-1.7693)),
    dc_set_c(ds_set(0.8846), ds_set(+0.5897)),
    dc_set_c(ds_set(0.8846), ds_set(-0.5897)),
};

// ==================================================== //
// Functions to compute fractals's pixel colors
// ==================================================== //

/*
 * @brief: Check if given point is in mandelbulb
 *
 * @return: True if in else False
 */

// bool in_bulb(vec4 c)
// {
//     vec2 x = ds_sqr(ds_add(c.xy, ds_set(1.0)));
//     vec2 y = ds_sqr(c.zw);

//     return ds_cmp(ds_add(x, y), ds_set(0.0625)) == -1;
// }

/*
 * @brief: Compute the mandelbrot set
 *
 * @return: Number of iterations
 */

float mandelbrot()
{
    // Coordinates of current pixel on screen
    vec2 px = ds_set(gl_FragCoord.x);
    vec2 py = ds_set(gl_FragCoord.y);

    // Compute position in complex plane from current pixel
    vec2 cx = ds_add(ds_add(vec2(cx0, cx1), ds_mul(px, vec2(z0, z1))), vec2(w0, w1));
    vec2 cy = ds_add(ds_add(vec2(cy0, cy1), ds_mul(py, vec2(z0, z1))), vec2(h0, h1));

    vec2 zx = cx;
    vec2 zy = cy;

    // Variables to optimize computation
    vec2 zx2 = ds_set(0.0);
    vec2 zy2 = ds_set(0.0);

    vec2 rad = ds_set(4.0);
    vec2 two = ds_set(2.0);

    for (int n = 0; n < iterations; n++)
    {
        vec2 tmp = zx;

        zx = ds_add(ds_sub(ds_mul(zx, zx), ds_mul(zy, zy)), cx);
        zy = ds_add(ds_mul(ds_mul(zy, tmp), two), cy);

        zx2 = ds_mul(zx, zx);
        zy2 = ds_mul(zy, zy);

        if (ds_cmp(ds_add(zx2, zy2), rad) == 1)
        {
            return float(n) + 1 - log(log(length(vec2(zx.x, zy.x)))) / log(2.0);
        }
    }

    return 0.0;
}

/*
 * @brief: Compute the julia set
 *
 * @return: Number of iterations
 */

float julia()
{
    // Coordinates of current pixel on screen
    vec2 px = ds_set(gl_FragCoord.x);
    vec2 py = ds_set(gl_FragCoord.y);

    // Compute position in complex plane from current pixel
    vec2 zx = ds_add(ds_add(vec2(cx0, cx1), ds_mul(px, vec2(z0, z1))), vec2(w0, w1));
    vec2 zy = ds_add(ds_add(vec2(cy0, cy1), ds_mul(py, vec2(z0, z1))), vec2(h0, h1));

    vec2 cx = ds_set(cR);
    vec2 cy = ds_set(cI);

    // Variables to optimize computation
    vec2 zx2 = ds_set(0.0);
    vec2 zy2 = ds_set(0.0);

    vec2 rad = ds_set(4.0);
    vec2 two = ds_set(2.0);

    for (int n = 0; n < iterations; n++)
    {
        vec2 tmp = zx;

        zx = ds_add(ds_sub(ds_mul(zx, zx), ds_mul(zy, zy)), cx);
        zy = ds_add(ds_mul(ds_mul(zy, tmp), two), cy);

        zx2 = ds_mul(zx, zx);
        zy2 = ds_mul(zy, zy);

        if (ds_cmp(ds_add(zx2, zy2), rad) == 1)
        {
            return float(n) + 1 - log(log(length(vec2(zx.x, zy.x)))) / log(2.0);
        }
    }

    return 0.0;
}

/*
 * @brief: Compute the tricorn fractal
 *
 * @return: Number of iterations
 */

float tricorn()
{
    // Coordinates of current pixel on screen
    vec2 px = ds_set(gl_FragCoord.x);
    vec2 py = ds_set(gl_FragCoord.y);

    // Compute position in complex plane from current pixel
    vec2 cx = ds_add(ds_add(vec2(cx0, cx1), ds_mul(px, vec2(z0, z1))), vec2(w0, w1));
    vec2 cy = ds_add(ds_add(vec2(cy0, cy1), ds_mul(py, vec2(z0, z1))), vec2(h0, h1));

    vec2 zx = cx;
    vec2 zy = cy;

    // Variables to optimize computation
    vec2 zx2 = ds_set(0.0);
    vec2 zy2 = ds_set(0.0);

    vec2 rad = ds_set(4.0);
    vec2 two = ds_set(2.0);

    for (int n = 0; n < iterations; n++)
    {
        vec2 tmp = zx;

        zx = ds_add(ds_sub(ds_mul(zx, zx), ds_mul(zy, zy)), cx);
        zy = ds_add(ds_mul(ds_mul(zy, tmp), -two), cy);

        zx2 = ds_mul(zx, zx);
        zy2 = ds_mul(zy, zy);

        if (ds_cmp(ds_add(zx2, zy2), rad) == 1)
        {
            return float(n) + 1 - log(log(length(vec2(zx.x, zy.x)))) / log(2.0);
        }
    }

    return 0.0;
}

/*
 * @brief: Compute the burningship set
 *
 * @return: Number of iterations
 */

float burning_ship()
{
    // Coordinates of current pixel on screen
    vec2 px = ds_set(gl_FragCoord.x);
    vec2 py = ds_set(gl_FragCoord.y);

    // Compute position in complex plane from current pixel
    vec2 cx = ds_add(ds_add(vec2(cx0, cx1), ds_mul(px, vec2(z0, z1))), vec2(w0, w1));
    vec2 cy = ds_add(ds_add(vec2(cy0, cy1), ds_mul(py, vec2(z0, z1))), vec2(h0, h1));

    vec2 zx = cx;
    vec2 zy = cy;

    // Variables to optimize computation
    vec2 zx2 = ds_set(0.0);
    vec2 zy2 = ds_set(0.0);

    vec2 rad = ds_set(4.0);
    vec2 two = ds_set(2.0);

    for (int n = 0; n < iterations; n++)
    {
        vec2 tmp = zx;

        zx = ds_add(ds_sub(ds_mul(zx, zx), ds_mul(zy, zy)), cx);
        zy = ds_add(abs(ds_mul(ds_mul(zy, tmp), two)), cy);

        zx2 = ds_mul(zx, zx);
        zy2 = ds_mul(zy, zy);

        if (ds_cmp(ds_add(zx2, zy2), rad) == 1)
        {
            return float(n) + 1 - log(log(length(vec2(zx.x, zy.x)))) / log(2.0);
        }
    }

    return 0.0;
}

/*
 * @brief: Use newton's method on polynomial n°1
 *
 * @return: Pixel color
 */

vec4 newton_1()
{
    // Coordinates of current pixel on screen
    vec2 px = ds_set(gl_FragCoord.x);
    vec2 py = ds_set(gl_FragCoord.y);

    // Constant
    vec2 m = ds_set(0.0);

    // Compute position in complex plane from current pixel
    vec2 zx = ds_add(ds_add(vec2(cx0, cx1), ds_mul(px, vec2(z0, z1))), vec2(w0, w1));
    vec2 zy = ds_add(ds_add(vec2(cy0, cy1), ds_mul(py, vec2(z0, z1))), vec2(h0, h1));

    vec2 cx = ds_set(0.0);
    vec2 cy = ds_set(0.0);

    // Threshold target
    vec2 threshold = ds_set(0.0001);
    vec2 maxvalue = ds_set(10000.0);

    // Complex number
    vec4 z = dc_set_c(zx, zy);
    vec4 c = dc_set_c(cx, cy);

    for (int n = 0; n < iterations; n++)
    {
        z = dc_sub(z, dc_div(newton_f1(z), newton_d1(z)));
        z = dc_add(z, c);

        if (ds_cmp(z.wx, maxvalue) > 0 || ds_cmp(z.yz, maxvalue) > 0)
          break;

        for (int i = 0; i < roots_f1.length(); i++) {
            float val = 0.0;
            vec2 dist = dc_len_s(z, roots_f1[i]);

            if (ds_cmp(dist, threshold) < 0)
            {
                // Smooth coloring
                val = float(n) - log2(log(dist.x) / log(threshold.x));
                val = 0.6 + 0.4 * cos(0.25 * val);

                // Color based on reached root
                if (i == 0)
                    return vec4(val, 0.0, 0.3 * val, 1.0);
                if (i == 1)
                    return vec4(0.0, val, 0.3 * val, 1.0);
                if (i == 2)
                    return vec4(0.0, 0.3 * val, val, 1.0);
            }
        }
    }

    return vec4(0.0, 0.0, 0.0, 1.0);
}

/*
 * @brief: Use newton's method on polynomial n°2
 *
 * @return: Pixel color
 */

vec4 newton_2()
{
    // Coordinates of current pixel on screen
    vec2 px = ds_set(gl_FragCoord.x);
    vec2 py = ds_set(gl_FragCoord.y);

    // Compute position in complex plane from current pixel
    vec2 zx = ds_add(ds_add(vec2(cx0, cx1), ds_mul(px, vec2(z0, z1))), vec2(w0, w1));
    vec2 zy = ds_add(ds_add(vec2(cy0, cy1), ds_mul(py, vec2(z0, z1))), vec2(h0, h1));

    vec2 cx = ds_set(0.0);
    vec2 cy = ds_set(0.0);

    // Threshold target
    vec2 threshold = ds_set(0.001);

    // Complex number
    vec4 z = dc_set_c(zx, zy);
    vec4 c = dc_set_c(cx, cy);

    for (int n = 0; n < iterations; n++)
    {
        z = dc_sub(z, dc_div(newton_f2(z), newton_d2(z)));
        z = dc_add(z, c);

        for (int i = 0; i < roots_f2.length(); i++)
        {
            float val = 0.0;
            vec2 dist = dc_len_s(z, roots_f2[i]);

            if (ds_cmp(dist, threshold) < 0)
            {
                // Smooth coloring
                val = float(n) - log2(log(dist.x) / log(threshold.x));
                val = 0.6 + 0.4 * cos(0.25 * val);

                // Color based on reached root
                if (i == 0)
                    return vec4(val, 0.0, 0.3 * val, 1.0);
                if (i == 1)
                    return vec4(0.0, val, 0.3 * val, 1.0);
                if (i == 2)
                    return vec4(0.0, 0.3 * val, val, 1.0);
            }
        }
    }

    return vec4(0.0, 0.0, 0.0, 1.0);
}

// ==================================================== //
// How to draw the fractal based on choosed method
// ==================================================== //

vec4 color_from_pallet(float n, int color_pallet)
{
    int nb_colors = 4;
    float val = n / iterations;
    float min_val;
    float max_val;

    if (color_pallet == 1)
        nb_colors = 5;

    for (int i = 0; i < nb_colors; i++)
    {
        min_val = float(i) / nb_colors;
        max_val = float(i + 1) / nb_colors;

        if (val >= min_val && val <= max_val)
        {
            if (color_pallet == 1)
                return mix(cp1[i], cp1[i + 1], (val - min_val) * nb_colors);
            if (color_pallet == 2)
                return mix(cp2[i], cp2[i + 1], (val - min_val) * nb_colors);
            if (color_pallet == 3)
                return mix(cp3[i], cp3[i + 1], (val - min_val) * nb_colors);
            if (color_pallet == 4)
                return mix(cp4[i], cp4[i + 1], (val - min_val) * nb_colors);
            break;
        }
    }

    if (color_pallet == 1)
        return cp1[nb_colors];
    else if (color_pallet == 2)
        return cp2[nb_colors];
    else if (color_pallet == 3)
        return cp3[nb_colors];
    else if (color_pallet == 4)
        return cp4[nb_colors];
}

/*
 * @brief: Compute pixel color based on iterations
 *
 * @param n: Number of iterations
 *
 * @return: Pixel color
 */

vec4 get_color(float n)
{
    // If pixel is in the set
    if (n == 0)
    {
        return vec4(0.0, 0.0, 0.0, 1.0);
    }

    switch (color)
    {
        case 1:
            return vec4(
                (-cos(0.025 * n) + 1.0) / 2.0,
                (-cos(0.080 * n) + 1.0) / 2.0,
                (-cos(0.120 * n) + 1.0) / 2.0,
                1.0
            );
            break;
        case 2:
            return vec4(
                0.5 + 0.5 * sin(n / 32.),
                0.5 + 0.5 * sin(n / 48.),
                0.5 + 0.5 * sin(n / 64.),
                1.0
            );
            break;
        case 0:
            return vec4(1.0, 1.0, 1.0, 1.0);
            break;
        default:
            return color_from_pallet(n, color - 2);
            break;
    }
}

// ==================================================== //
// Main function
// ==================================================== //

void main()
{
    float n = 0;

    // Which fractal to draw
    switch (fractal)
    {
        case 1:
            n = julia();
            break;
        case 2:
            n = burning_ship();
            break;
        case 3:
            n = tricorn();
            break;
        default:
            n = mandelbrot();
            break;
    }

    // How to color the fractal
    // Handle fractals drawn using newton's method
    switch (fractal)
    {
        case 4:
            FragColor = newton_1();
            break;
        case 5:
            FragColor = newton_2();
            break;
        default:
            FragColor = get_color(n);
            break;
    }
}

// ==================================================== //
// ==================================================== //
