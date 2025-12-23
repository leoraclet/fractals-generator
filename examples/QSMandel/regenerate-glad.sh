#!/bin/sh

cd "`dirname $0`/glad"
glad --out-path=. --generator=c --omit-khrplatform --api="gl=3.0" --profile=core --extensions=GL_ARB_gpu_shader_fp64
