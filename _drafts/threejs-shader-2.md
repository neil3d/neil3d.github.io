---
layout: post
title: "Three.js 材质系统解析(2)：Shader 代码"
author: "燕良"
categories: 3dengine
tags: [glTF, WebGL, ThreeJS]
image:
  path: threejs
  feature: cover1.png
  credit: Khronos Group
  creditlink: ""
brief: "Shader 代码的组织方式。"
---

## ShaderLib


``` glsl

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() {

	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <skinbase_vertex>

	#ifdef USE_ENVMAP

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

	#endif

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>

	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>

}

``` 

## ShaderChunk

## 创建 WebGLProgram

## 初始化材质对象