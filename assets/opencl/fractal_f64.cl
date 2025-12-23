// ===================================================== //
// ===================================================== //

// Based on
// https://streamhpc.com/blog/2013-10-17/writing-opencl-code-single-double-precision/
// itself based on https://www.bealto.com/gpu-fft2_real-type.html

#if defined(cl_khr_fp64)
#pragma OPENCL EXTENSION cl_khr_fp64 : enable
#define DOUBLE_SUPPORT_AVAILABLE
#elif defined(cl_amd_fp64)
#pragma OPENCL EXTENSION cl_amd_fp64 : enable
#define DOUBLE_SUPPORT_AVAILABLE
#endif

#if defined(DOUBLE_SUPPORT_AVAILABLE)

// double
typedef double real_t;
typedef double2 real2_t;
typedef double3 real3_t;
typedef double4 real4_t;
typedef double8 real8_t;
typedef double16 real16_t;
#define PI 3.14159265358979323846

#else

// float
typedef float real_t;
typedef float2 real2_t;
typedef float3 real3_t;
typedef float4 real4_t;
typedef float8 real8_t;
typedef float16 real16_t;
#define PI 3.14159265359f

#endif

// ===================================================== //
// Basic utilities
// ===================================================== //

// Based on
// https://github.com/angeluriot/2D_fractals_generator/blob/master/shaders/compute/cl_compute_shader.cl

float modulo(float a, float b) { return a - b * floor(a / b); }

real_t modulus_square(real2_t z) { return z.x * z.x + z.y * z.y; }

real_t modulus(real2_t z) { return sqrt(z.x * z.x + z.y * z.y); }

real_t argument_from_modulus(real2_t z, real_t mod) {
  if (mod == 0.)
    return 0.;

  if (z.y >= 0.)
    return acos(z.x / mod);

  else
    return 2. * PI - acos(z.x / mod);
}

real_t argument(real2_t z) { return argument_from_modulus(z, modulus(z)); }

real2_t add(real2_t z_1, real2_t z_2) {
  return (real2_t)(z_1.x + z_2.x, z_1.y + z_2.y);
}

real2_t add_3(real2_t z_1, real2_t z_2, real2_t z_3) {
  return add(add(z_1, z_2), z_3);
}

real2_t subtract(real2_t z_1, real2_t z_2) {
  return (real2_t)(z_1.x - z_2.x, z_1.y - z_2.y);
}

real2_t multiply(real2_t z_1, real2_t z_2) {
  return (real2_t)(z_1.x * z_2.x - z_1.y * z_2.y,
                   z_1.x * z_2.y + z_1.y * z_2.x);
}

real2_t multiply_real(real2_t z, real_t n) {
  return (real2_t)(z.x * n, z.y * n);
}

real2_t multiply_3(real2_t z_1, real2_t z_2, real2_t z_3) {
  return multiply(multiply(z_1, z_2), z_3);
}

real2_t divide(real2_t z_1, real2_t z_2) {
  real_t mod_2 = modulus_2(z_2);

  if (mod_2 == 0.)
    return (real2_t)(0., 0.);

  return (real2_t)((z_1.x * z_2.x + z_1.y * z_2.y) / mod_2,
                   (z_1.y * z_2.x - z_1.x * z_2.y) / mod_2);
}

real2_t divide_real(real2_t z, real_t n) { return (real2_t)(z.x / n, z.y / n); }

real2_t square(real2_t z) { return multiply(z, z); }

float4 get_color(float iterations, float max_iterations,
                 __global float4 *pallet, int colors_nb) {
  float value = iterations / max_iterations;
  float4 color = (float4)(1.f, 1.f, 1.f, 1.f);

  float min_value;
  float max_value;

  for (int i = 0; i < (int)colors_nb; i++) {
    min_value = (float)i / colors_nb;
    max_value = (float)(i + 1) / colors_nb;

    if (value >= min_value && value <= max_value) {
      color = mix(pallet[i], pallet[i + 1], (value - min_value) * colors_nb);
      break;
    }
  }

  return color;
}

// ===================================================== //
// Fractal functions
// ===================================================== //

__kernel void julia(__global float4 *pixels, float c_r, float c_i,
                    int max_iterations, real_t position_x, real_t position_y,
                    real_t width, real_t height, __global float4 *pallet,
                    int colors_nb, float color_range, float color_shift,
                    int smooth) {

  float smooth_value = (float)i + 1. - log(log(length(number))) / log(2.);
  int shifted_i =
      (int)(i + color_shift * (int)((float)max_iterations / color_mod)) %
      max_iterations;
  real_t shifted_smooth_value =
      (int)(floor(smooth_value) +
            color_shift * (int)((float)max_iterations / color_mod)) %
          max_iterations +
      (smooth_value - floor(smooth_value));

  if (i == max_iterations)
    color = (float4)(0.f, 0.f, 0.f, 1.f);
  else if (colors_nb == -1)
    color = get_color(i % 6, 6, pallet, 6);
  else if (colors_nb == -2)
    color = get_color(i % 2, 2, pallet, 2);
  else if (smooth == 1)
    color = get_color(
        modulo(shifted_smooth_value, (float)max_iterations / color_mod),
        (float)max_iterations / color_mod, pallet, colors_nb);
  else
    color = get_color(shifted_i % (max_iterations / (int)color_mod),
                      max_iterations / (int)color_mod, pallet, colors_nb);

  pixels[get_global_id(1) * get_global_size(0) + get_global_id(0)] = color;
}