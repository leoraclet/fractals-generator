#version 420 core
#extension GL_ARB_gpu_shader_fp64 : enable

#ifdef GL_ARB_gpu_shader_fp64
// Code that uses the extension.

uniform double cx, cy;
uniform double sx, sy;
uniform double mx, my;
uniform double d_z;
uniform float cR;
uniform float cI;

uniform int iterations; // Maximum number of iterations
uniform int fractal; // Which fractal to draw ?
uniform int color; // How to color the fractal ?

out vec4 FragColor; // Pixel color

// ==================================================== //
// Define color pallets
// ==================================================== //

/*
 * @brief: Sky style
 */

vec4 cp1[6] = {
        vec4(0.0 / 255, 7.0 / 255, 100.0 / 255, 1.0),
        vec4(32.0 / 255, 107.0 / 255, 203.0 / 255, 1.0),
        vec4(237.0 / 255, 255.0 / 255, 255.0 / 255, 1.0),
        vec4(255.0 / 255, 170.0 / 255, 0.0 / 255, 1.0),
        vec4(0.0 / 255, 2.0 / 255, 0.0 / 255, 1.0),
        vec4(0.0 / 255, 7.0 / 255, 100.0 / 255, 1.0),
    };

/*
 * @brief: Fire style
 */

vec4 cp2[5] = {
        vec4(20.0 / 255, 0.0 / 255, 0.0 / 255, 1.0),
        vec4(255.0 / 255, 20.0 / 255, 0.0 / 255, 1.0),
        vec4(255.0 / 255, 200.0 / 255, 0.0 / 255, 1.0),
        vec4(255.0 / 255, 20.0 / 255, 0.0 / 255, 1.0),
        vec4(20.0 / 255, 0.0 / 255, 0.0 / 255, 1.0),
    };

/*
 * @brief: Electrical style
 */

vec4 cp3[5] = {
        vec4(0.0 / 255, 0.0 / 255, 0.0 / 255, 1.0),
        vec4(0.0 / 255, 0.0 / 255, 200.0 / 255, 1.0),
        vec4(255.0 / 255, 255.0 / 255, 255.0 / 255, 1.0),
        vec4(0.0 / 255, 0.0 / 255, 200.0 / 255, 1.0),
        vec4(0.0 / 255, 0.0 / 255, 0.0 / 255, 1.0),
    };

/*
 * @brief: Gold style
 */

vec4 cp4[5] = {
        vec4(85.0 / 255, 47.0 / 255, 0.0 / 255, 1.0),
        vec4(255.0 / 255, 171.0 / 255, 12.0 / 255, 1.0),
        vec4(255.0 / 255, 171.0 / 255, 12.0 / 255, 1.0),
        vec4(255.0 / 255, 171.0 / 255, 12.0 / 255, 1.0),
        vec4(85.0 / 255, 47.0 / 255, 0.0 / 255, 1.0)
    };

// ==================================================== //
// Functions to compute fractals's pixel colors
// ==================================================== //

/*
 * @brief: Compute the mandelbrot set
 *
 * @return: Number of iterations
 */

float mandelbrot()
{
    dvec2 d_c = dvec2(cx, cy);
    dvec2 d_s = dvec2(sx, sy);

    dvec2 c = d_c + dvec2(gl_FragCoord.xy) * d_z + d_s;
    dvec2 z = c;

    for (int n = 0; n < iterations; n++)
    {
        z = dvec2(z.x * z.x - z.y * z.y, 2.0lf * z.x * z.y) + c;
        if (length(vec2(z.x, z.y)) > 4.0)
        {
            return float(n) + 1. - log(log(length(vec2(z.x, z.y)))) / log(2.);
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
    dvec2 d_c = dvec2(cx, cy);
    dvec2 d_s = dvec2(sx, sy);

    dvec2 z = d_c + dvec2(gl_FragCoord.xy) * d_z + d_s;
    dvec2 c = dvec2(cR, cI);

    for (int n = 0; n < iterations; n++)
    {
        z = dvec2(z.x * z.x - z.y * z.y, 2.0lf * z.x * z.y) + c;
        if (length(vec2(z.x, z.y)) > 4.0)
        {
            return float(n) + 1. - log(log(length(vec2(z.x, z.y)))) / log(2.);
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
    dvec2 d_c = dvec2(cx, cy);
    dvec2 d_s = dvec2(sx, sy);

    dvec2 c = d_c + dvec2(gl_FragCoord.xy) * d_z + d_s;
    dvec2 z = c;

    for (int n = 0; n < iterations; n++)
    {
        z = dvec2(z.x * z.x - z.y * z.y, -2.0lf * z.x * z.y) + c;
        if (length(vec2(z.x, z.y)) > 4.0)
        {
            return float(n) + 1. - log(log(length(vec2(z.x, z.y)))) / log(2.);
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
    dvec2 d_c = dvec2(cx, cy);
    dvec2 d_s = dvec2(sx, sy);

    dvec2 c = d_c + dvec2(gl_FragCoord.xy) * d_z + d_s;
    dvec2 z = c;

    for (int n = 0; n < iterations; n++)
    {
        z = dvec2(z.x * z.x - z.y * z.y, abs(2.0lf * z.x * z.y)) + c;
        if (length(vec2(z.x, z.y)) > 4.0)
        {
            return float(n) + 1. - log(log(length(vec2(z.x, z.y)))) / log(2.);
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
    return vec4(0.0, 0.0, 0.0, 1.0);
}

/*
 * @brief: Use newton's method on polynomial n°2
 *
 * @return: Pixel color
 */

vec4 newton_2()
{
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

#endif // GL_ARB_gpu_shader_fp64
