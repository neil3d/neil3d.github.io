---
layout: post
title: "DXR 实时光线追踪技术概览"
author: "景夫"
column: "Graphics"
categories: 3dengine
tags: [raytracing, SIGGRAPH]
image:
  path: s2018
  feature: antg.png
  credit: ""
  creditlink: ""
brief: "DirectX Raytracing 渲染管线介绍。"
---

长久以来“光栅化（rasterization）”一直统治着实时渲染领域，其实并不是说这种渲染方式有多么的好，主要是因为它更便于实现硬件加速。光栅化渲染的基本算法很简单，但是要想达到好的渲染效果，就需要不断打补丁。你想要阴影吗？那你需要一种特殊的算法实现。你想要反射、折射吗？每个都需要一个特殊的方式去实现，更不要提全局照明了。这些不禁让我想起早些年“固定渲染管线”显卡发展到鼎盛的时候，图形程序员不得不调整各种参数添加 Environment Map、Bump Map等等，后来“可编程渲染管线”推出，那些 tricky 的做法都没必要了。而现在 GPU 越来越强大，性能在不断提高，也更具通用计算能力。另一方面 low level 图形 API 的出现也让图形程序员有更多的想象空间去控制 GPU，这一切都在将实时渲染技术推向下一代：Real-time ray tracing。这可是几十年来实时渲染、游戏渲染技术领域最大的进步！  
NVIDIA 已经在 8 月份的 SIGGRAPH 2018 大会上发布了新的图灵架构 GPU，新一代消费级 GeForce 显卡也已经呼之欲出！新架构的最大亮点无疑是支持 Real-time ray tracing 硬件加速以及使用 AI 技术对光线追踪的计算结果进行降噪！下面这篇文章就主要介绍一下 DirectX Ray Tracing 定义的这个渲染管线长什么样。

DirectX Raytracing（以下简称 DXR ）并不是一套全新的 API，而是在 DirectX 12 的一个新的 feature。它主要引入了这么四个新的东西：  

1. Acceleration Structure
2. 一个新的 Command List 方法：DispatchRays ，它用来了启动 Ray Tracing 的渲染流程；
3. 一系列在 Ray Tracing Pipeline 过程中的 Shader 类型：
    * Ray generation shader
    * Intersection shader
    * Miss shader
    * Closest-hit shader
    * Any-hit shader
4. Raytracing pipeline state  

下面就其中的重点部分做一个详细的介绍。

## Acceleration Structure

顾名思义，为了加速光线与场景的相交运算，需要把场景中的几何体用一种特殊的方式组织，一般是某种空间分割算法处理后的结果，在 DXR 里面这个数据结构就被称为 "Acceleration Structure". 这个数据结构由 DXR 负责生成，通过调用 BuildRaytracingAccelerationStructure() 函数。

这个数据结构分为两层：
* Top-Level acceleration structures 是对象实例级别的，每个实例可以包含一个 Transform 矩阵。 
* Bottom-level acceleration structures 是集合体级别的，对于传统的三角形 Mesh，它使用 bounding volume hierarchy (BVH) 树形数据结构来管理这些三角形。
场景中的动画更新时，一般更新 Top-Level hierarchy 就可以了，所以效率是很高的。今年的 SIGGRAPH 还有一个相关的 Paper，有兴趣的话可以看看：[MergeTree: A Fast Hardware HLBVH Constructor for Animated Ray Tracing](/assets/img/s2018/a169-viitanen.pdf)。

![Two-level hierarchy](/assets/img/s2018/acceleration-structures.png)   
*Acceleration Structure 的两个层级（图片来自 NVIDIA）*

## DXR Shaders

因为 Ray tracing 的计算过程和光栅化是完全不同的，所以 vertex shader, geometry shader, pixel shader 那些就都可以撇到一边儿了！DXR 引入了一系列新的 Shader 类型，上面已经列出了。下面就通过一个最简单的例子，来体会一些这些 Shader 类型吧。下面这段 Shader 代码完成了一个最简单的 Ray tracing 的渲染：有模型的地方渲染成红色，没有模型的地方把背景设置为蓝色。

``` hlsl
RWTexture<float4> gOutTex;

struct RayPayload { 
    float3 color; 
};

[shader(“miss”)]
void MyMiss(inout RayPayload payload) {
    payload.color = float3( 0, 0, 1 );
}

[shader(“closesthit”)]
void MyClosestHit(inout RayPayload data, BuiltinIntersectAttribs attribs) {
    data.color = float3( 1, 0, 0 );
}

[shader(“raygeneration”)]
void MyRayGen() {
    uint2 curPixel = DispatchRaysIndex().xy;
    float3 pixelRayDir = normalize( getRayDirFromPixelID( curPixel ) );

    RayDesc ray = {
        gCamera.posW, 
        0.0f, 
        pixelRayDir, 
        1e+38f 
    };

    RayPayload payload = { 
        float3(0, 0, 0) 
    };

    TraceRay( gRtScene, RAY_FLAG_NONE, 0xFF, 0, 1, 0, ray, payload );
    
    outTex[curPixel] = float4( payload.color, 1.0f );
}
```
*（代码来自 Chris Wyman, NVIDIA）*

下面就具体看一下这段代码中的几个函数：  

* MyRayGen()  
    这个函数是一个 Ray generation shader，当 DispatchRays() API 被调用后会自动启动，它有点像咱们 C 语言中的 main() 函数，控制整个 Ray tracing 的流程。一般情况下，它会使用新增的内置 shader 函数 TraceRay() 进行光线追踪的计算，计算结果会返回到最后一个参数中，即上面例子中的 RayPayload payload。这个结构应该包含一个颜色值，作为着色计算的结果。最后，把这个结果写入到 Render Target中。
* MyClosestHit()  
    它的类型是 Closest-hit shader，这是执行材质 Shading 的地方。值得注意的是，你在这个 Shader 中还是可以调用 TraceRay() 函数进行递归的光线追踪，也可以调用很多次 TraceRay() 来通过蒙特卡洛方法去计算 AO 等，总之这个是非常灵活的。
* MyMiss()  
    它的类型是 Miss shader，顾名思义，当光线没有和场景中的任何几何体产生碰撞的时候，这个 Shader 会被调用。这个 Shader 一般用来实现背景的绘制，例如天空等。
  
我们还有两个类型的 Shader 没有涉及到：  

* Intersection shader  
    这个 Shader 是用来定义光线和场景的相交计算的。系统默认提供了光线与三角形 Mesh 的相交运算，如果你需要检测与球体、参数化曲面等特殊计算的时候，可以通过这个 Shader 进行自定义。
* Any-hit shader  
    这是一个疑问句：Any hit？当光线和几何体产生了碰撞的时候，会调用这个 Shader 来询问是否真的产生了 hit。这个一般用来实现 Alpha Mask 效果。

## DXR Pipelline

![The ray tracing pipeline](/assets/img/s2018/raytracing-pipeline.png)  
*The ray tracing pipeline（图片来自 Chris Wyman, NVIDIA）*

在了解了上述的 Shader 各自负责的计算之后，通过上图就可以很直观的了解整个 DXR Pipeline 的流程了。其中绿色的部分，是系统实现的，是可以被 GPU 加速的，我们可以通过 API 去控制。蓝色的部分是可以通过 Shader 编程去实现的。上面列出的那些 Shader 就是一条光线所需的计算流程，这个流程在 GPU 中会并行执行。这些 Shader 之间可以通过 ray playload 结构体数据进行通信，这是一个用户自定义的数据结构。它作为一个 inout 参数传递给 TraceRay() 函数，在  Closest-hit shader 和 Miss shader 都可以对它进行修改。

## 结束语

Real-time ray tracing 是不是让你无比振奋啊！是不是已经想跃跃欲试了呢？如果你对图形技术有极高的热情、有信心挑战实时渲染领域的前沿技术，那么现在有一个很好机会再召唤你！蚂蚁金服·图形与数字艺术实验室正在招聘图形开发专家，美术设计师，期待各路达人加入！可以直接联系博主本人，发送简历到 **neil3d (at) 126.com** 。这是一个有诚意的招聘贴，求转发！[具体的职位列表和职位描述请见这个语雀文档](https://www.yuque.com/jingfu/job/glqin8)。  

## 参考资料

* [GDC 2018: DirectX Raytracing](https://channel9.msdn.com/Events/GDC/GDC-2018/05)
* [Announcing Microsoft DirectX Raytracing!](https://blogs.msdn.microsoft.com/directx/2018/03/19/announcing-microsoft-directx-raytracing)
* [SIGGRAPH 2018 Course: "Introduction to DirectX Raytracing"](http://intro-to-dxr.cwyman.org)
* [D3D12 Raytracing Functional Spec v0.09](http://intro-to-dxr.cwyman.org/spec/DXR_FunctionalSpec_v0.09.docx)
* [D3D12 Raytracing Samples Github](https://github.com/Microsoft/DirectX-Graphics-Samples/tree/master/Samples/Desktop/D3D12Raytracing)
* [Introduction to NVIDIA RTX and DirectX Ray Tracing](https://devblogs.nvidia.com/introduction-nvidia-rtx-directx-ray-tracing/)