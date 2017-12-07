---
layout: post
title: "3D引擎数据结构与glTF:简介"
author: "燕良"
categories: 3dengine
tags: [glTF, WebGL]
image:
  feature: 2016-gltf-jpeg-of-3d.jpg
  credit: Khronos Group
  creditlink: ""
---

> 【**内容概要**】  
> glTF是Khronos Group制定的一套3D场景数据的标准，包括场景、Mesh、动画、材质等方面。通过学习它，可以对3D引擎中的核心数据结构有一个基础的的理解，对于深入掌握3D引擎技术有很大的帮助。  
  
不是有句老话讲“程序 = 算法 + 数据结构”嘛，对于3D引擎来说也是这样。学习和掌握3D引擎中的核心数据有哪些，它们直接的关系是怎样等等问题，对于理解3D引擎的架构和图形渲染关系都有着非常大的帮助。然而，现在的商业3D引擎非常复杂，想要通过学习其源代码嘛非常困难，那么你就这样放弃了吗？ :wink: 我们需要一个合适的方式切入。  
  
### 那么，什么是glTF呢  

直接去研读Unreal Engine的源代码，对于没有基础的同学来说，确实太困难了。想要对3D引擎内部有一些必要的了解，glTF是一个很好的切入点。glTF是什么呢？  
* glTF即GL Transmission Format；
* glTF是一种3D内容的格式标准，由Khronos Group管理；（Khronos Group还管理着OpenGL系列、OpenCL等重要的行业标准）
* glTF的设计是**面向实时渲染应用**的，尽量提供可以直接传输给图形API的数据形式，不再需要二次转换；
* glTF对OpenGL ES、WebGL非常友好；对于Metal、Vulkan也完全无障碍；
* glTF的目标是：3D领域的JPEG；
* 作为一个标准，自2015年10月发布以来，已经得到了业界广泛的认可，你可以相信它的水平；

### glTF都包含哪些数据

从逻辑的角度，它包含所有常用的、必须的数据：
* glTF包括场景定义数据，它使用SceneGraph，也就是一个树来定义场景；场景中的节点包含Transform矩阵（也就是位置、旋转、缩放）、父子关系的描述，以及包含的功能（mesh、camera等）；
* 包含mesh和skin数据，通过它们你可以加载静态模型和骨骼模型；
* 包含动画数据，通过定义场景中节点的运动来定义动画，这些节点可以用来组成骨架结构（Skeleton），也可以直接控制节点中的mesh做刚体运动；
* 包含Morph Target（也称作Blend Shape）模型动画数据；
* 包含材质定义；在glTF 1.0中，包含一个technique的定义，相对于Unity3D中的ShaderLab，或者D3D中的effect文件；

glTF标准所定义的上述数据，从物理结构上了由以下几个文件组成：  
![gltf-bin-glsl-png]({{ site.github.url }}/assets/img/2017-gltf-files.png)  
* 一个JSON文本文件，作为整个标准的核心，描述场景结构，数据对应关系等；
* 一个二进制文件，用来存储Vertex Buffer、Index Buffer等，这些数据可以直接通过OpenGL或者WebGL API直接上传到显示驱动，无需再做解析和转换；
* 还包含所引用的shader文件、贴图文件等；
  
### 本系列文章

通过上面的简单介绍，你可能对于glTF已经比较糊涂了，哈哈，因为我也没打算三两句把它说清楚。我将通过一系列文章讲述glTF的各方面的数据是如何组织的，以及如果通过图形API去实现整个glTF定义的场景的渲染。完整掌握了这些知识，你自己动手实现一个基本的3D渲染引擎应该是可以的。 :smile: 

### 参考资料
* [glTF官方网站](https://www.khronos.org/gltf)
* [glTF详细教程](https://github.com/KhronosGroup/glTF-Tutorials/blob/master/gltfTutorial/README.md)