---
layout: post
title: "理解PBR：从原理到实现（上）"
author: "燕良"
categories: unreal
tags: [PBR, unreal]
image:
  path: pbr
  feature: cover.jpg
  credit: ""
  creditlink: ""
brief: "以反射率方程为线索，理解 PBR 技术集合中的各个技术点，进而理解整个 PBR 的原理，以及虚幻4中的实现方案。"
---

## PBR 进入游戏引擎

基于物理的渲染，即 PBR，Physically Based Rendering，这个技术名词最早是有马特·法尔（Matt Pharr）在他的知名著作中提出，这本书就是《Physically Based Rendering：From Theory To Implementation》，此书首次出版是在2004年。在2014年，此书的三位作者马特·法尔（Matt Pharr）、格雷戈·汉弗莱斯（Greg Humphreys）和帕特·汉拉汉（Pat Hanrahan）获得了第19届奥斯卡金像奖科技成果奖（Scientific and Technical Academy Award）[^1]。 目前此书的第三版已经发布了在线版本：[http://www.pbr-book.org](http://www.pbr-book.org) 。这本书中提出的技术方案最开始是应用于离线渲染领域，典型的就是迪斯尼的金属工作流（Metallic Workflow）。

[^1]: [19 SCIENTIFIC AND TECHNICAL ACHIEVEMENTS TO BE HONORED WITH ACADEMY AWARDS®](https://www.oscars.org/news/19-scientific-and-technical-achievements-be-honored-academy-awardsr)

在2006年的 SIGGRAPH 大会上纳蒂·霍夫曼（Naty Hoffman）等人进行了一场名为：SIGGRAPH 2006 Course: Physically-Based Reflectance for Games 的专题演讲，当时他还在顽皮狗（Naughty Dog）工作。纳蒂·霍夫曼对于 PBR 进入实时渲染领域十分热心，在 SIGGRAPH 2010 大会上，他再次组织一个关于 PBR 的专场：[SIGGRAPH 2010 Course: Physically-Based Shading Models in Film and Game Production](http://renderwonk.com/publications/s2010-shading-course/)。这次的演讲引起了业界强烈的反响，PBR 成为热门话题！在后面的几年中，来自Ubisoft、迪斯尼、皮克斯、Epic Games、EA、Unity 等公司的牛人们轮番登场，在 SIGGRAPH 大会介绍他们对在电影、动画片、游戏中应用 PBR 技术的进展。对游戏行业影响最大的应该算是布瑞恩·卡里斯（Brian Karis）在 SIGGRAPH 2013 所做的演讲：[Real Shading in Unreal Engine 4](https://blog.selfshadow.com/publications/s2013-shading-course) 。虚幻4（Unreal Engine 4）并不是游戏业界第一个使用 PBR 技术的引擎，但是凭借**虚幻引擎**的影响力，以及后来免费、开源的大力推广，在行业内产生了无可替代的影响力。另外，2014年 EA 的 DICE 工作室所做的关于寒霜引擎（Frostbite Engine）的演讲：[Moving Frostbite to PBR](https://www.ea.com/frostbite/news/moving-frostbite-to-pb) 也十分精彩！  

PBR 对于现代 3D 引擎十分重要，它使得实时渲染突破了被常年诟病的“塑料感”，我们有了金属、皮革、瓷器！以从业者的角度看，更重要的是：它使我们可以把材质与光照解耦。也就是说一个 PBR 材质，在不同的光照环境下都应该得到正确的渲染结果，这让 3D 美术工作者可以更方便的调节对象的材质，并使得材质更具备通用性。

那么，它是怎么做到的呢？下面我就带你领略这一突破是如何完成的。我们首先要从物理、数学的层面来理解其原理，然后我们再来学习虚幻4中的实现方案。

## 理解 PBR 的原理

我们必须先明确一个事情：**PBR 并不是“一项”技术，它是由一系列技术的集合**，并不断改进的结果。从原理到实现方案，整体来看是很复杂的，但是如果你先把每一项技术搞明白，再看清楚它们是怎么串起来的，就容易理解多了。把所有珍珠串起来的这根金线就是“反射率方程（The Reflectance Equation）”，它是一个特殊的渲染方程（Render Equation）。下面我就以反射率方程为线索，讲述 PBR 背后的物理和数学原理。

![render_eq](/assets/img/pbr/render_eq.png)  

> 渲染方程（Render Equation）  
>	James T. Kajiya 在 SIGGRAPH 1986 中发表的论文《The Rendering Equation》中提出了这个概念。它不是一个渲染算法，而是高屋建瓴的用一个方程描述光能在场景中的转播。它给出了一个渲染的顶层抽象定义，是一个理论上的完美结果，实际中的各种渲染计算过程可以认为是它的某种近似。

下面我们就看一下反射率方程：
$$
L_o(p,\omega_o) = \int\limits_{\Omega} L_i(p,\omega_i) \cdot n \cdot \omega_i \cdot f_r(p,\omega_i,\omega_o)  d\omega_i
$$
这个公式中的符号含义：
* $$L$$：辐射率（Radiance）
* $$p$$
* $$\omega_o$$
* $$\omega_i$$
* $$f_r$$
* $$\int\limits_{\Omega} ... d\omega_i$$
* $$n$$

这个公式挺复杂，我们先从概括的物理层面来理解一下它。它的含义是这样的： $$p$$ 点在 $$\omega_o$$ 方向上的**辐射率**，或者说从$$\omega_o$$ 方向观察 $$p$$ 点反射出来的**辐射率**，**等于**在以平面法线$$n$$为轴所环绕的半球域（Hemisphere）内所有入射光的辐射率，乘以入射角度衰减（$$n \cdot \omega_i $$），并受到 BRDF 的约束，即乘以$$f_r(p,\omega_i,\omega_o)$$。

想要更好的理解上面这个反射率方程，我们需要对上面涉及到的几个基础概念进行进一步的解释。

### 能量守恒

渲染方程的物理基础是能量守恒定律。简单来说就是，光接触物体表面后，会发生三种现象：反射、折射、吸收。排除自发光的情况，反射光 + 折射光 ≤ 入射光。  

### 辐射率（Radiance）

### BRDF

BRDF 就是 Bidirectional Reflective Distribution Function 的缩写，中文译为**双向反射分布函数**，它是一个方程，它的计算结果是一个$$[0, 1]$$之间的值。

### 立体角（Solid Angle）

## Cook-Torrance BRDF

### 微表面模型（The Microfacet Model）
