#version 120
// GLSL Mandelbrot Shader by Henry Thasler (www.thasler.org/blog)

uniform int iterations;
uniform float frame;
uniform float radius;

uniform float f_cx, f_cy;
uniform float f_sx, f_sy;
uniform float f_z;

float fmandel(void)
{
  vec2 c = vec2(f_cx, f_cy) + gl_FragCoord.xy*f_z + vec2(f_sx,f_sy);
  vec2 z=c;

  for(int n=0; n<iterations; n++)
	{
	z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
	if(length(z) > radius) 
		{
		return(float(n) + 1. - log(log(length(z)))/log(2.));	// http://linas.org/art-gallery/escape/escape.html
		}	
	}
  return 0.;
}

void main()
{
  float n = fmandel(); 

  gl_FragColor = vec4((-cos(0.025*n)+1.0)/2.0, 
					  (-cos(0.08*n)+1.0)/2.0, 
					  (-cos(0.12*n)+1.0)/2.0, 
				       1.0);
}
