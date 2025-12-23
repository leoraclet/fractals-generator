// Ported to GLSL by N£utr0nys (https://github.com/leoraclet)
// Based on https://www.bealto.com/mp-mandelbrot_fp128-opencl.html

#version 420 core

uniform uvec4 cx, cy;
uniform uvec4 sx, sy;
uniform uvec4 d_z;
uniform float cR;
uniform float cI;

uniform int iterations; // Maximum number of iterations
uniform int fractal;    // Which fractal to draw ?
uniform int color;      // How to color the fractal ?

out vec4 FragColor;     // Pixel color

uvec4 set128(uint v)
{
    // v goes into the least-significant 32 bits
    // Higher limbs are zero.
    return uvec4(v, 0u, 0u, 0u);
}

// ---------------------------------------------------------
// 128-bit Arithmetic for GLSL (OpenCL → GLSL Translation)
// ---------------------------------------------------------

// mul_hi replacement using GLSL's umulExtended()
uint mul_hi(uint a, uint b) {
  uint low;
  uint high;
  umulExtended(a, b, low, high);
  return high;
}

// ---------------------------------------------------------
// inc128 – Increment 128-bit integer
// ---------------------------------------------------------
uvec4 inc128(uvec4 u) {
  bvec4 hb = equal(u, uvec4(0xFFFFFFFFu));
  uvec4 h = uvec4(hb) & uvec4(1u);

  uvec4 c = uvec4((h.y & h.z & h.w & 1u), (h.z & h.w & 1u), (h.w & 1u), 1u);

  return u + c;
}

// ---------------------------------------------------------
// neg128 – Two’s complement negation
// ---------------------------------------------------------
uvec4 neg128(uvec4 u) { return inc128(u ^ uvec4(0xFFFFFFFFu)); }

// ---------------------------------------------------------
// add128 – Add two 128-bit unsigned integers
// ---------------------------------------------------------
uvec4 add128(uvec4 u, uvec4 v) {
  uvec4 s = u + v;

  uvec4 h = uvec4(lessThan(s, u)) & uvec4(1u);
  uvec4 c1 = (h.yzwx & uvec4(1u, 1u, 1u, 0u));

  h = uvec4(equal(s, uvec4(0xFFFFFFFFu)));

  uvec4 c2 = uvec4(((c1.y | (c1.z & h.z)) & h.y), (c1.z & h.z), 0u, 0u);

  return s + c1 + c2;
}

// ---------------------------------------------------------
// shl128 – Left shift by 1 bit
// ---------------------------------------------------------
uvec4 shl128(uvec4 u) {
  uvec4 h = (u >> uvec4(31u)) & uvec4(0u, 1u, 1u, 1u);
  return (u << uvec4(1u)) | h.yzwx;
}

// ---------------------------------------------------------
// shr128 – Right shift by 1 bit
// ---------------------------------------------------------
uvec4 shr128(uvec4 u) {
  uvec4 h =
      (u << uvec4(31u)) & uvec4(0x80000000u, 0x80000000u, 0x80000000u, 0u);
  return (u >> uvec4(1u)) | h.wxyz;
}

// ---------------------------------------------------------
// mul128u – Multiply a 128-bit integer by a 32-bit unsigned int
// ---------------------------------------------------------
uvec4 mul128u(uvec4 u, uint k) {
  uvec4 s1 = u * uvec4(k);
  uvec4 s2 = uvec4(mul_hi(u.y, k), mul_hi(u.z, k), mul_hi(u.w, k), 0u);
  return add128(s1, s2);
}

// ---------------------------------------------------------
// mulfpu – Fixed-point multiply of two 128-bit positive values
// ---------------------------------------------------------
uvec4 mulfpu(uvec4 u, uvec4 v) {
  uvec4 s = uvec4(u.x * v.x, mul_hi(u.y, v.y), u.y * v.y, mul_hi(u.z, v.z));

  uvec4 t1 = uvec4(mul_hi(u.x, v.y), u.x * v.y, mul_hi(u.x, v.w), u.x * v.w);
  uvec4 t2 = uvec4(mul_hi(v.x, u.y), v.x * u.y, mul_hi(v.x, u.w), v.x * u.w);

  s = add128(s, add128(t1, t2));

  t1 = uvec4(0u, mul_hi(u.x, v.z), u.x * v.z, mul_hi(u.y, v.w));
  t2 = uvec4(0u, mul_hi(v.x, u.z), v.x * u.z, mul_hi(v.y, u.w));

  s = add128(s, add128(t1, t2));

  t1 = uvec4(0u, 0u, mul_hi(u.y, v.z), u.y * v.z);
  t2 = uvec4(0u, 0u, mul_hi(v.y, u.z), v.y * u.z);

  s = add128(s, add128(t1, t2));

  return add128(s, uvec4(0u, 0u, 0u, 3u));
}

// ---------------------------------------------------------
// sqrfpu – Fixed-point square of a 128-bit positive value
// ---------------------------------------------------------
uvec4 sqrfpu(uvec4 u) {
  uvec4 s = uvec4(u.x * u.x, mul_hi(u.y, u.y), u.y * u.y, mul_hi(u.z, u.z));

  uvec4 t = uvec4(mul_hi(u.x, u.y), u.x * u.y, mul_hi(u.x, u.w), u.x * u.w);
  s = add128(s, shl128(t));

  t = uvec4(0u, mul_hi(u.x, u.z), u.x * u.z, mul_hi(u.y, u.w));
  s = add128(s, shl128(t));

  t = uvec4(0u, 0u, mul_hi(u.y, u.z), u.y * u.z);
  s = add128(s, shl128(t));

  return add128(s, uvec4(0u, 0u, 0u, 3u));
}

float mandelbrot()
{
    uvec4 xc = add128(add128(mulfpu(uvec4(gl_FragCoord.x, 0, 0, 0), d_z), cx), sx);
    uvec4 yc = add128(add128(mulfpu(uvec4(gl_FragCoord.y, 0, 0, 0), d_z), cy), sy);

    uvec4 x = set128(0);
    uvec4 y = set128(0);

    for(int n = 0; n < iterations; n++)
    {
        uvec4 x2 = sqrfpu(x);
        uvec4 y2 = sqrfpu(y);

        uvec4 aux = add128(x2, y2);
        if (aux.x >= 4u)
            return float(n) + 1. - log(log(aux.x))/log(2.);

        uvec4 twoxy = shl128(mulfpu(x, y));

        x = add128(xc, add128(x2, neg128(y2)));
        y = add128(yc, twoxy);
    }

    return 0.0;
}

float julia()
{
    return 0.0;
}

float burning_ship()
{
    return 0.0;
}

float tricorn()
{
    return 0.0;
}

vec4 newton_1()
{
    return vec4(0.0, 0.0, 0.0, 1.0);
}

vec4 newton_2()
{
    return vec4(0.0, 0.0, 0.0, 1.0);
}

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
