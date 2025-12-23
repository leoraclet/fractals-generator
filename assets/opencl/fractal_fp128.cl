// ===================================================== //
// ===================================================== //

// Based on https://www.bealto.com/mp-mandelbrot_fp128-opencl.html

// Increment U
uint4 inc128(uint4 u) {
  // Compute all carries to add
  int4 h =
      (u == (uint4)(0xFFFFFFFF)); // Note that == sets ALL bits if true [6.3.d]
  uint4 c = (uint4)(h.y & h.z & h.w & 1, h.z & h.w & 1, h.w & 1, 1);
  return u + c;
}

// Return -U
uint4 neg128(uint4 u) {
  return inc128(u ^ (uint4)(0xFFFFFFFF)); // (1 + ~U) is two's complement
}

// Return U+V
uint4 add128(uint4 u, uint4 v) {
  uint4 s = u + v;
  uint4 h = (uint4)(s < u);
  uint4 c1 = h.yzwx & (uint4)(1, 1, 1, 0); // Carry from U+V
  h = (uint4)(s == (uint4)(0xFFFFFFFF));
  uint4 c2 = (uint4)((c1.y | (c1.z & h.z)) & h.y, c1.z & h.z, 0,
                     0); // Propagated carry
  return s + c1 + c2;
}

// Return U<<1
uint4 shl128(uint4 u) {
  uint4 h = (u >> (uint4)(31)) & (uint4)(0, 1, 1, 1); // Bits to move up
  return (u << (uint4)(1)) | h.yzwx;
}

// Return U>>1
uint4 shr128(uint4 u) {
  uint4 h = (u << (uint4)(31)) &
            (uint4)(0x80000000, 0x80000000, 0x80000000, 0); // Bits to move down
  return (u >> (uint4)(1)) | h.wxyz;
}

// Return U*K.
// U MUST be positive.
uint4 mul128u(uint4 u, uint k) {
  uint4 s1 = u * (uint4)(k);
  uint4 s2 = (uint4)(mul_hi(u.y, k), mul_hi(u.z, k), mul_hi(u.w, k), 0);
  return add128(s1, s2);
}

// Return U*V truncated to keep the position of the decimal point.
// U and V MUST be positive.
uint4 mulfpu(uint4 u, uint4 v) {
  // Diagonal coefficients
  uint4 s = (uint4)(u.x * v.x, mul_hi(u.y, v.y), u.y * v.y, mul_hi(u.z, v.z));
  // Off-diagonal
  uint4 t1 = (uint4)(mul_hi(u.x, v.y), u.x * v.y, mul_hi(u.x, v.w), u.x * v.w);
  uint4 t2 = (uint4)(mul_hi(v.x, u.y), v.x * u.y, mul_hi(v.x, u.w), v.x * u.w);
  s = add128(s, add128(t1, t2));
  t1 = (uint4)(0, mul_hi(u.x, v.z), u.x * v.z, mul_hi(u.y, v.w));
  t2 = (uint4)(0, mul_hi(v.x, u.z), v.x * u.z, mul_hi(v.y, u.w));
  s = add128(s, add128(t1, t2));
  t1 = (uint4)(0, 0, mul_hi(u.y, v.z), u.y * v.z);
  t2 = (uint4)(0, 0, mul_hi(v.y, u.z), v.y * u.z);
  s = add128(s, add128(t1, t2));
  // Add 3 to compensate truncation
  return add128(s, (uint4)(0, 0, 0, 3));
}

// Return U*U truncated to keep the position of the decimal point.
// U MUST be positive.
uint4 sqrfpu(uint4 u) {
  // Diagonal coefficients
  uint4 s = (uint4)(u.x * u.x, mul_hi(u.y, u.y), u.y * u.y, mul_hi(u.z, u.z));
  // Off-diagonal
  uint4 t = (uint4)(mul_hi(u.x, u.y), u.x * u.y, mul_hi(u.x, u.w), u.x * u.w);
  s = add128(s, shl128(t));
  t = (uint4)(0, mul_hi(u.x, u.z), u.x * u.z, mul_hi(u.y, u.w));
  s = add128(s, shl128(t));
  t = (uint4)(0, 0, mul_hi(u.y, u.z), u.y * u.z);
  s = add128(s, shl128(t));
  // Add 3 to compensate truncation
  return add128(s, (uint4)(0, 0, 0, 3));
}

// ===================================================== //
// ===================================================== //

__kernel void mandelbrot_fp128(__global uint *a, __global uint *colormap,
                               __constant uint *coords, int nx, int ny,
                               int offset, int lda, int leftXSign, int topYSign,
                               int maxIt) {
  // Convert inputs
  uint4 leftX = vload4(0, coords);
  uint4 topY = vload4(1, coords);
  uint4 stepX = vload4(2, coords);
  uint4 stepY = vload4(3, coords);

  if (leftXSign < 0)
    leftX = neg128(leftX);
  if (topYSign < 0)
    topY = neg128(topY);

  for (int iy = 0; iy < ny; iy++)
    for (int ix = 0; ix < nx; ix++) {
      int xpix = get_global_id(0) * nx + ix;
      int ypix = get_global_id(1) * ny + iy;
      uint4 xc =
          add128(leftX, mul128(stepX, xpix)); // xc = leftX + xpix * stepX;
      uint4 yc = add128(
          topY, neg128(mul128(stepY, ypix))); // yc = topY - ypix * stepY;

      int it = 0;
      uint4 x = set128(0);
      uint4 y = set128(0);
      for (it = 0; it < maxIt; it++) {
        uint4 x2 = sqrfp(x);        // x2 = x^2
        uint4 y2 = sqrfp(y);        // y2 = y^2
        uint4 aux = add128(x2, y2); // x^2+y^2
        if (aux.x >= 4)
          break;                                // Out!
        uint4 twoxy = shl128(mulfp(x, y));      // 2*x*y
        x = add128(xc, add128(x2, neg128(y2))); // x' = xc+x^2-y^2
        y = add128(yc, twoxy);                  // y' = yc+2*x*y
      }
      uint color = (it < maxIt) ? colormap[it] : 0xFF000000;
      a[offset + xpix + lda * ypix] = color;
    }
}
