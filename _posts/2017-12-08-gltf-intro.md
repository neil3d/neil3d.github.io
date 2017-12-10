---
layout: post
title: "3D引擎数据结构与glTF:简介"
author: "燕良"
categories: 3dengine
tags: [glTF, WebGL]
image:
  path: gltf
  feature: 2016-gltf-jpeg-of-3d.jpg
  credit: Khronos Group
  creditlink: ""
brief: "glTF是Khronos Group制定的一套3D内容的格式标准，包括场景、Mesh、动画、材质等方面。通过学习它，可以对3D引擎中的核心数据结构有一个基础的的理解，对于深入掌握3D引擎技术有很大的帮助。"
---

不是有句老话讲“程序 = 算法 + 数据结构”嘛，对于3D引擎来说也是这样。学习和掌握3D引擎中的核心数据有哪些，它们直接的关系是怎样等等问题，对于理解3D引擎的架构和图形渲染关系都有着非常大的帮助。然而，现在的商业3D引擎非常复杂，想要通过学习其源代码嘛非常困难，那么你就这样放弃了吗？ :wink: 我们需要一个合适的方式切入。  
  
### 那么，什么是glTF呢？  

直接去研读Unreal Engine的源代码，对于没有基础的同学来说，确实太困难了。想要对3D引擎内部有一些必要的了解，glTF是一个很好的切入点。学习glTF也是具有实用价值的，已经有越来越多的引擎支持这种格式，另外还可以顺便学一下英语。:smile:

glTF是什么呢？  
* glTF即GL Transmission Format的缩写；
* glTF是一种3D内容的格式标准，由Khronos Group管理；（Khronos Group还管理着OpenGL系列、OpenCL等重要的行业标准）
* glTF的设计是**面向实时渲染应用**的，尽量提供可以直接传输给图形API的数据形式，不再需要二次转换；
* glTF对OpenGL ES、WebGL非常友好；
* glTF的目标是：3D领域的JPEG；
* 作为一个标准，自2015年10月发布（glTF 1.0）以来，已经得到了业界广泛的认可，你可以相信它的水平；
* glTF目前最新版本为2.0已于2017年6月正式发布。

### 为什么还需要一个3D内容格式标准？

所谓的内容格式标准，可以粗略的理解为“文件格式”，就像我们常用的Wavefont OBJ、Autodesk FBX等。既然已经有了那么多文件格式了，干嘛还要设计一个新的呢？这主要是因为那些格式并不是针对实时渲染设计的，例如FBX或者COLLADA都是针对建模工具之间交互数据使用的。现在的主流3D引擎，例如Unity3D、Unreal Engine，它们都需要一个import的过程把FBX等格式转换成为内部的对象，然后使用对象序列化机制来存储3D场景、模型、材质等。这些引擎它们都有自己的存储方式，而且都是私有的，并不公开。

我们熟悉的大神卡马克也曾经呼吁建立实时渲染的3D内容格式的标准。如果没有一种标准格式的话，每个3D引擎都要实现自己的文件导入、转换工具，用来和3DS MAX、Maya、Blender等工具对接；而有了glTF这一标准之后，一切可以变得简单很多。
  
![contentPipelineWithGltf](/assets/img/gltf/2017-contentPipelineWithGltf.png)  

### glTF都包含哪些数据

从逻辑的角度，它包含所有常用的、必须的数据：
* glTF包括场景定义数据，它使用SceneGraph，也就是一个树来定义场景；场景中的节点包含Transform矩阵（也就是位置、旋转、缩放）、父子关系的描述，以及包含的功能（mesh、camera等）；
* 包含mesh和skin数据，通过它们你可以加载静态模型和骨骼模型；
* 包含动画数据，通过定义场景中节点的运动来定义动画，这些节点可以用来组成骨架结构（Skeleton），也可以直接控制节点中的mesh做刚体运动；
* 包含Morph Target（也称作Blend Shape）模型动画数据；
* 包含材质定义；在glTF 1.0中，包含一个technique的定义，相对于Unity3D中的ShaderLab，或者D3D中的effect文件；

glTF标准所定义的上述数据，从物理结构上了由以下几个文件组成：  
![gltf-bin-glsl-png](/assets/img/gltf/2017-gltf-files.png)  
* 一个JSON文本文件，作为整个标准的核心，描述场景结构，数据对应关系等；
* 一个二进制文件，用来存储Vertex Buffer、Index Buffer等，这些数据可以直接通过OpenGL或者WebGL API直接上传到显示驱动，无需再做解析和转换；
* 还包含所引用的shader文件、贴图文件等；
  
### 本系列文章

通过上面的简单介绍，你可能对于glTF已经比较糊涂了，哈哈，因为我也没打算三两句把它说清楚。我将通过一系列文章讲述glTF的各方面的数据是如何组织的，以及如果通过图形API去实现整个glTF定义的场景的渲染。完整掌握了这些知识，你自己动手实现一个基本的3D渲染引擎应该是可以的。 :smile:

### 参考资料
* [glTF官方网站](https://www.khronos.org/gltf)
* [glTF 2.0 标准文档](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md)
* [glTF 1.0 标准文档](https://github.com/KhronosGroup/glTF/blob/master/specification/1.0/README.md)
