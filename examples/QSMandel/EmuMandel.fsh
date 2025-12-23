#version 120
// GLSL Mandelbrot Shader by Henry Thasler (www.thasler.org/blog)

uniform int iterations;
uniform float frame;
uniform float radius;

uniform float ds_z0, ds_z1;
uniform float ds_w0, ds_w1;
uniform float ds_h0, ds_h1;
uniform float ds_cx0, ds_cx1;
uniform float ds_cy0, ds_cy1;

// To create false data dependencies to avoid nvidia aggressive
// math optimization (which can't be turned off on Linux), we 
// can hide value of x with e.g. x*one, or, possibly faster on
// some GPUs, (one==1?x:0). On NVidia GeForce GTX 750 Ti the
// former appears to work a bit faster, so here's the define
#define hide(x) (x*one)
uniform float one;

// Emulation based on Fortran-90 double-single package. See http://crd-legacy.lbl.gov/~dhbailey/mpdist/
// Add: res = ds_add(a, b) => res = a + b
vec2 ds_add (vec2 dsa, vec2 dsb)
{
vec2 dsc;
float t1, t2, e;

 t1 = dsa.x + dsb.x;
 e = hide(t1) - dsa.x;
 t2 = ((dsb.x - e) + (dsa.x - (t1 - e))) + dsa.y + dsb.y;

 dsc.x = t1 + t2;
 dsc.y = t2 - (hide(dsc.x) - t1);
 return dsc;
}

// Subtract: res = ds_sub(a, b) => res = a - b
vec2 ds_sub (vec2 dsa, vec2 dsb)
{
vec2 dsc;
float e, t1, t2;

 t1 = dsa.x - dsb.x;
 e = hide(t1) - dsa.x;
 t2 = ((-dsb.x - e) + (dsa.x - (t1 - e))) + dsa.y - dsb.y;

 dsc.x = t1 + t2;
 dsc.y = t2 - (hide(dsc.x) - t1);
 return dsc;
}

// Compare: res = -1 if a < b
//              = 0 if a == b
//              = 1 if a > b
float ds_compare(vec2 dsa, vec2 dsb)
{
 if (dsa.x < dsb.x) return -1.;
 else if (dsa.x == dsb.x) 
	{
	if (dsa.y < dsb.y) return -1.;
	else if (dsa.y == dsb.y) return 0.;
	else return 1.;
	}
 else return 1.;
}

// Multiply: res = ds_mul(a, b) => res = a * b
vec2 ds_mul (vec2 dsa, vec2 dsb)
{
vec2 dsc;
float c11, c21, c2, e, t1, t2;
float a1, a2, b1, b2, cona, conb, split = 8193.;

 cona = dsa.x * split;
 conb = dsb.x * split;
 a1 = cona - (hide(cona) - dsa.x);
 b1 = conb - (hide(conb) - dsb.x);
 a2 = dsa.x - a1;
 b2 = dsb.x - b1;

 c11 = dsa.x * dsb.x;
 c21 = a2 * b2 + (a2 * b1 + (a1 * b2 + (a1 * b1 - c11)));

 c2 = dsa.x * dsb.y + dsa.y * dsb.x;

 t1 = c11 + c2;
 e = t1 - hide(c11);
 t2 = dsa.y * dsb.y + ((c2 - e) + (c11 - (t1 - e))) + c21;
 
 dsc.x = t1 + t2;
 dsc.y = t2 - (hide(dsc.x) - t1);
 
 return dsc;
}

// create double-single number from float
vec2 ds_set(float a)
{
 vec2 z;
 z.x = a;
 z.y = 0.0;
 return z;
}

float emandel(void)
{
  vec2 e_tx = ds_set(gl_FragCoord.x);
  vec2 e_ty = ds_set(gl_FragCoord.y);
  
  // compute position in complex plane from current pixel
  vec2 cx = ds_add(ds_add(vec2(ds_cx0, ds_cx1),ds_mul(e_tx,vec2(ds_z0, ds_z1))),vec2(ds_w0, ds_w1));  
  vec2 cy = ds_add(ds_add(vec2(ds_cy0, ds_cy1),ds_mul(e_ty,vec2(ds_z0, ds_z1))),vec2(ds_h0, ds_h1));  
  
  vec2 tmp;
  
  vec2 zx = cx;
  vec2 zy = cy;
  vec2 two = ds_set(2.0); 
  
  vec2 e_radius = ds_set(radius*radius);

  for(int n=0; n<iterations; n++)
	{
	tmp = zx;
	zx = ds_add(ds_sub(ds_mul(zx, zx), ds_mul(zy, zy)), cx);
	zy = ds_add(ds_mul(ds_mul(zy, tmp), two), cy);
	if( ds_compare(ds_add(ds_mul(zx, zx), ds_mul(zy, zy)), e_radius)>0.) 
		{
		return(float(n) + 1. - log(log(length(vec2(zx.x, zy.x))))/log(2.));	// http://linas.org/art-gallery/escape/escape.html
		}	
	}
  return 0.;
}


void main()
{
  float n = emandel(); 

  gl_FragColor = vec4((-cos(0.025*n)+1.0)/2.0, 
					  (-cos(0.08*n)+1.0)/2.0, 
					  (-cos(0.12*n)+1.0)/2.0, 
				       1.0);
}
