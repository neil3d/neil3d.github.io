---
layout: post
title: "用\"历史的发展的\"眼光看 PBR"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
mathjax: true
tags: [PBR, unreal]
image:
  path: raytracing
  feature: cover_02.jpg
  credit: ""
  creditlink: ""
brief: "PBR 流行了这么久了，网上各种帖子也非常多，那么从技术角度说，到底什么是 PBR 呢？"
---

**到底什么是 PBR ？** 
- 能量守恒就是“基于物理”了吗？
- PBR 就是迪斯尼那套金属工作流吗？
- “Metallic, Roughness...”就是 PBR 了吗？

**到底什么是 PBR ？** 这个问题值得多问几次，不过，在这里我并不想正面回答这个问题，因为我的理解还不够。

我整理了一些资料放到我的 GitHub 上，看完这些内容你会有自己的答案 :joy:
- **[Awesome Physically Based Rendering](https://github.com/neil3d/awesome-pbr)** 

另外，我还在做一个业余的小项目，还没有完成，但也可参考：
- **[光线追踪50年](https://github.com/neil3d/50YearsOfRayTracing)**。

我个人一直对“技术发展史”兴趣浓厚，我尝试沿着《Physically Based Rendering》一书中的 *[A Brief History of Physically Based Rendering](http://www.pbr-book.org/3ed-2018/Introduction/A_Brief_History_of_Physically_Based_Rendering.html)* 小节来理一下 PBR 的发展历程。

1980年 Turner Whitted 的《An improved illumination model for shaded display》文章中，首次使用 Ray Tracing 来计算反射、折射等全局效果。而 Ray 这个概念可以回溯到 1968 年 Arthur Appel 的 《Some techniques for shading machine renderings of solids》一文。虽然当时 Appel 并没有使用 Ray Casting 这个词，但这篇文章被公认为光线追踪算法的开山之作，他首次把 Ray 作为一种可计算的方式提出，并使用了“光线可逆”假设，还有 Shadow Ray，这些概念都沿用至今。(Ray Casting 这个名词则是 Scott Roth 1980年的文章《Ray Casting for Modeling Solids》中首次提出的)

现在主流的“微表面模型”早在1981年就由 Cook 和 Torrance 在他们的文章《A reflectance model for computer graphics》中提出了。

1984年 Goral 等人提出“辐射度方法”（Radiosity）之后的那几年被称为“Radiosity Years”。这是首先出现的“基于物理”的全局光照方法。记得当年（2005年前后），在开发《功夫世界》的时候，用了 Progressive Radiosity 算法来生成 Light Map，当时就觉得非常震撼。Radiosity 方法基于热能传递(thermal transfer)的思想，这个跟后来基于“辐射度量学(Radiometry)”的方法，明显是有点绕远了。当然，这只是“事后诸葛亮”啦。

就在那几年，另外一批人在沿着光线追踪的路子在研究。1986年 [James Kajiya](https://www.microsoft.com/en-us/research/people/kajiya/) 发表了他的知名文章《The rendering equation》。”渲染方程“，现在被奉为经典，Gold Standard for Rendering。不过，当时并没有“石破天惊”，甚至颇有质疑。首先是这个方法的计算量巨大：渲染两个球的简单场景，256*256像素，在当时价值 28 万美元的 IBM 4341 机器上上需要运行7个小时。来看看当时这么NB的机器长什么样子吧：

![IBM 4341](/assets/img/RTH/IBM4341.jpg){: .center-image }  

其次，蒙特卡洛方法的噪点问题，当时看很难解决。所以，整体上，当时“渲染方程”、“Path Tracing”这个路子，并不像当时热门的 Radiosity 方法那样吸引人。


下图是我尝试写的一个最简单的 Path Tracer（100行左右），你可以直观的理解一下“噪点”的问题。

![Simple Path Tracer](/assets/img/RTH/kajiya/simple-path-tracer.png)

另外一个有趣的事情是，在 1984 (也就是在 Kajiya 那篇文章发表的前两年)年Robert Cook就发表了《Distributed Ray Tracing》一文。和《The rendering equation》对照的话，会发现这两篇文章的前面一半很像。Cook 率先把之前的所有渲染方法归纳为一个 Reflection Equation，只不过 Kajiya 转向了完全严谨的数学。以至于，现在“渲染也有了正确与否”：理论上说，只有“Unbiased”和“Biased but consistent”这两种情况是正确的。

我尝试复现了 Cook 这篇文章中的算法，渲染效果很不错，而且非常非常简洁：渲染核心代码150行，加上其他通用模块可能也就一千行左右，就实现了“Soft shadow”、“Depth of field”、“Glossy reflection”、“Motion blur”这么多效果。有兴趣的同学，可以看一下我的代码：[Distributed Ray Tracing - Robert Cook et al., 1984](https://github.com/neil3d/50YearsOfRayTracing/tree/master/1984.Cook) 。

![Distributed Ray Tracing](/assets/img/RTH/cook/ScreenShot-final.png)

在 1990 年代，有一批牛人开始沿着蒙特卡洛的路子不断推进，经常出现的名字包括 Arvo、Kirk、Shirley，还有 Veach 。整个过程也是渐进的，包括将经典的 Phong Reflection Model 修改为“能量守恒”的方式、蒙特卡洛方法计算直接光照、BRDF重要性采样等。在 1997 年 Veach 的 “multiple importance sampling”是一个关键性进展。

下面就是修改后的 Phong reflection model，大家可以直观的感受一下：  

$$
f_r(x, \Theta_i, \Theta_o) = k_d \frac{1}{\pi} + k_s \frac{n + 2}{2\pi} cos^n\alpha
$$

 我把这些早期工作画成了一个时间线：

![research timeline](/assets/img/RTH/research.png)
  
在 2001 年的 SIGGRAPH 大会上，有一个《State of the Art in Monte Carlo Ray Tracing for Realistic Image Synthesis》的 Course。在这里 Marcos Fajardo 展示了 Arnold 渲染器早期版本生成的图片.

![Vehicles](/assets/img/RTH/vehicles.png)




后面 PBR 开始真正流行起来，从 2010 年至今，几乎每年 SIGGRAPH 都有相关的 Course，我已经将相关资料的链接整理到了这个库中，大家可以去看看：[Awesome Physically Based Rendering](https://github.com/neil3d/awesome-pbr) 。
