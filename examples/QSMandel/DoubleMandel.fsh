#version 120
#extension GL_ARB_gpu_shader_fp64: enable

uniform int iterations;
uniform int frame;
uniform float radius;

uniform dvec2 d_c;
uniform dvec2 d_s;
uniform double d_z;

float dmandel(void)
{
 dvec2 c = d_c + dvec2(gl_FragCoord.xy)*d_z + d_s;
 dvec2 z = c;

  for(int n=0; n<iterations; n++)
	{
	z = dvec2(z.x*z.x - z.y*z.y, 2.0lf*z.x*z.y) + c;
	if(length(vec2(z.x,z.y)) > radius) 
		{
		return(float(n) + 1. - log(log(length(vec2(z.x,z.y))))/log(2.));	// http://linas.org/art-gallery/escape/escape.html
		}	
	}
  return 0.;
}

void main()
{
  float n = dmandel(); 

  gl_FragColor = vec4((-cos(0.025*n)+1.0)/2.0, 
					  (-cos(0.08*n)+1.0)/2.0, 
					  (-cos(0.12*n)+1.0)/2.0, 
				       1.0);
}
