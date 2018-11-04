---
layout: post
title: "理解PBR：从原理到实现（上）"
author: "燕良"
categories: unreal
tags: [PBR, unreal]
image:
  path: pbr
  feature: cover_theory.jpg
  credit: ""
  creditlink: ""
brief: "以反射率方程为线索，理解 PBR 技术集合中的各个技术点，进而理解整个 PBR 的原理，以及虚幻4引擎中的实现方案。上半部分，主要是理解其原理。"
---

## PBR 从离线渲染进入游戏引擎

基于物理的渲染，即 PBR，Physically Based Rendering，这个技术名词最早是有马特·法尔（Matt Pharr）在他的知名著作中提出，这本书就是《Physically Based Rendering：From Theory To Implementation》，此书首次出版是在2004年。在2014年，此书的三位作者马特·法尔（Matt Pharr）、格雷戈·汉弗莱斯（Greg Humphreys）和帕特·汉拉汉（Pat Hanrahan）获得了第19届奥斯卡金像奖科技成果奖（Scientific and Technical Academy Award）[^1]。 目前此书的第三版已经发布了在线版本：[http://www.pbr-book.org](http://www.pbr-book.org) 。这本书中提出的技术方案最开始是应用于离线渲染领域，典型的就是迪斯尼的金属工作流（Metallic Workflow）。

[^1]: [19 SCIENTIFIC AND TECHNICAL ACHIEVEMENTS TO BE HONORED WITH ACADEMY AWARDS®](https://www.oscars.org/news/19-scientific-and-technical-achievements-be-honored-academy-awardsr)

在2006年的 SIGGRAPH 大会上纳蒂·霍夫曼（Naty Hoffman）等人进行了一场名为：SIGGRAPH 2006 Course: Physically-Based Reflectance for Games 的专题演讲，当时他还在顽皮狗（Naughty Dog）工作。纳蒂·霍夫曼对于 PBR 进入实时渲染领域十分热心，在 SIGGRAPH 2010 大会上，他再次组织一个关于 PBR 的专场：[SIGGRAPH 2010 Course: Physically-Based Shading Models in Film and Game Production](http://renderwonk.com/publications/s2010-shading-course/)。这次的演讲引起了业界强烈的反响，PBR 成为热门话题！在后面的几年中，来自Ubisoft、迪斯尼、皮克斯、Epic Games、EA、Unity 等公司的牛人们轮番登场，在 SIGGRAPH 大会介绍他们对在电影、动画片、游戏中应用 PBR 技术的进展。对游戏行业影响最大的应该算是布瑞恩·卡里斯（Brian Karis）在 SIGGRAPH 2013 所做的演讲：Real Shading in Unreal Engine 4。虚幻4（Unreal Engine 4）并不是游戏业界第一个使用 PBR 技术的引擎，但是凭借**虚幻引擎**的影响力，以及后来免费、开源的大力推广，在行业内产生了无可替代的影响力。另外，2014年 EA 的 DICE 工作室所做的关于寒霜引擎（Frostbite Engine）的演讲：[Moving Frostbite to PBR](https://www.ea.com/frostbite/news/moving-frostbite-to-pb) 也十分精彩！  

PBR 对于现代 3D 引擎十分重要，它使得实时渲染突破了被常年诟病的“塑料感”，我们有了金属、皮革、瓷器！以从业者的角度看，更重要的是：它使我们可以把材质与光照解耦。也就是说一个 PBR 材质，在不同的光照环境下都应该得到正确的渲染结果，这让 3D 美术工作者可以更方便的调节对象的材质，并使得材质更具备通用性。

那么，它是怎么做到的呢？下面我就带你领略这一突破是如何完成的。我们首先要从物理、数学的层面来理解其原理，然后我们再来学习虚幻4中的实现方案。

## 理解 PBR 的原理

我们必须先明确一个事情：**PBR 并不是“一项”技术，它是由一系列技术的集合**，并不断改进的结果。从原理到实现方案，整体来看是很复杂的，但是如果你先把每一项技术搞明白，再看清楚它们是怎么串起来的，就容易理解多了。把所有珍珠串起来的这根金线就是“反射率方程（The Reflectance Equation）”，它是一个特殊的渲染方程（Render Equation）。下面我就以反射率方程为线索，讲述 PBR 背后的物理和数学原理。

![render_eq](/assets/img/pbr/render_eq.png)  

> 渲染方程（Render Equation）  
>	James T. Kajiya 在 SIGGRAPH 1986 中发表的论文《The Rendering Equation》中提出了这个概念。它不是一个渲染算法，而是高屋建瓴的用一个方程描述光能在场景中的转播。它给出了一个渲染的顶层抽象定义，是一个理论上的完美结果，实际中的各种渲染计算过程可以认为是它的某种近似。

下面我们就看一下反射率方程：  

$$
L_o(p, v) = \int\limits_H L_i(p,l) f(l, v) n \cdot l dl
$$

这个公式中的符号含义：
* $$L$$：辐射率（Radiance），这是一个物理概念，下面我用一小节专门解释
* $$p$$：
* $$\omega_o$$：
* $$\omega_i$$：
* $$f_r$$：
* $$\int\limits_{\Omega} ... d\omega_i$$：
* $$n$$：这个最简单了，就是$$p$$点所在平面的法向量啦

这个公式挺复杂，我们先概括的从物理层面来理解一下它。它的含义是这样的： $$p$$ 点在 $$\omega_o$$ 方向上的**辐射率**，或者说从$$\omega_o$$ 方向观察 $$p$$ 点反射出来的**辐射率**，**等于**在以平面法线$$n$$为轴所环绕的半球域（Hemisphere）内所有入射光的辐射率，乘以入射角度衰减（$$n \cdot \omega_i $$），并受到 BRDF 的约束，即乘以$$f_r(p,\omega_i,\omega_o)$$。

想要更好的理解上面这个反射率方程，我们需要对上面涉及到的几个基础概念进行进一步的解释。

### 能量守恒

渲染方程的物理基础是能量守恒定律。简单来说就是，光接触物体表面后，会发生三种现象：反射、折射、吸收。排除自发光的情况，反射光 + 折射光 ≤ 入射光。  

### 辐射率（Radiance）

### BRDF

BRDF 就是 Bidirectional Reflective Distribution Function 的缩写，中文译为**双向反射分布函数**。  

这个函数计算给定方向上的反射光的亮度与入射光在物体表面产生的照度的比率，它的计算结果是一个$$[0, 1]$$之间的值。这样说有点抽象，举一个最简单的例子吧。对于一个完美的镜面反射来说，我们可以按照几何光学来计算任何一个入射光$$\omega_i$$的反射方向$$\omega_o$$，那么 BRDF 应该只在这个反射方向上返回 1.0，其他任何方向上都应该得到 0.0 的结果。

### 立体角（Solid Angle）

## Cook-Torrance BRDF

现在的 PBR 实时渲染引擎基本上都使用 Cook-Torrance BRDF 反射模型。这个模型是由当时就职于卢卡斯影业（Lucasfilm Ltd.）的 Robert L. Cook（现为皮克斯高级技术副总裁）和康奈尔大学（Cornell University）的 Kenneth E. Torrance 合作提出的，论文名为《*A Reflectance Model for Computer Graphics*》[^2]。这是一个较 Blinn-Phong 更完善的模型，但是它本质上仍然是一个经验模型，并不像 Radiosity 那样本质是物理正确的（只是无法求解，只能用 Progressive 的方式求近似解）。

[^2]: [ACM Digital Library, ID=357293](https://dl.acm.org/citation.cfm?id=357293)

这个反射模型包含漫反射和镜面反射量部分：  

$$
R_{bd} = k_d R_d +  k_s R_s
$$  

其中$$k_d+k_s=1.0$$，$$R_d$$和$$R_s$$和物体的材质有关。对于漫反射的计算 $$R_d$$ ，在虚幻4引擎中，布瑞恩·卡里斯进行了很多尝试，最终认为 Lambertian 漫反射模型已经足够好了。

$$
R_d = \frac{c_{diff}}{\pi}
$$

其中 $$c$$ 就是物体的固有色。  

Cook-Torrance 反射模型中的镜面反射$$R_s$$计算公式如下：

$$
R_s = \frac{D(h)F(l,h)G(l,v,h)}{4 (n \cdot l)(n \cdot v)}
$$

其中D、G、F分别是三个函数：
* D：微平面在平面上的分布函数
* G：计算微平面由于互相遮挡而产生的衰减
* F：菲涅尔项

我们先来看一下在Cook-Torrance 反射模型中这三项是如何计算的。要想很好的理解D、G两项，还需要讲一下微表面理论。

### 微平面模型（The Microfacet Model）

![microgeometry](/assets/img/pbr/microgeometry.png)

微平面理论认为，从微观角度看，物体表面是由一些细小的平面组成的。微观到什么程度呢，大概可以理解为可见光波长大小的尺度。这些细小的平面，就叫做微平面（Microfacets）。越光滑的表面，这些微平面排列的越规则，越粗糙的表面，这些微平面排列的越不规则。在图形学中，我们可以从统计学的角度使用粗糙度（Roughness）这样一个估算的参数来描述这一现象。

![rough_smooth](/assets/img/pbr/rough_smooth.png)

### 镜面反射$$R_s$$中的$$D$$、$$F$$、$$G$$

#### D：微表面分布函数（Normal distribution function）

我们先来看一下$$D$$项，即微表面分布函数。假设表面的宏观法向量为 N，这个函数计算所有微平面中法向量与 N 一致的微平面的比例。例如，如果有 20% 的微表面的法向量与 N 一致，则这个函数返回 0.2 。这个函数又有很多不同的模型，在这里我们主要看一下虚幻4所采用的 Trowbridge-Reitz GGX 模型：

$$
D(h) = \frac{\alpha^2}{\pi((n \cdot h)^2 (\alpha^2 - 1) + 1)^2}
$$

其中：
* $$n$$ 为表面的宏观法向量
* $$h$$ 为
* $$\alpha$$ 为表面的粗糙度参数

#### G：几何遮挡因子（Geometric Occlusion Factor）

虚幻4使用 Schlick 模型计算此项，具体公式为：

$$
k = \frac{((Roughness + 1)^2}{8}  
$$

$$
G_1(v) = \frac{n \cdot v}{(n \cdot v)(1 - k) + k }
$$

$$
G(l, v, h) = G_1(1) G_1(v)
$$

#### F：菲涅尔项（Fresnel Factor）

$$
F(v, h) = F_0 +(1-F_0)2^{(-5.55473(v \cdot h)-6.98316)(v \cdot h)}
$$


## 总结

我们以反射率方程为线索，梳理了 PBR 的理论基础，重点是数学部分。至于如何在实时渲染中实现这个复杂的数学计算呢？这个积分如何求解呢？我将在下一篇文章中分享我对虚幻4引擎的 PBR 实现的理解。本文中的公式来自[Cook-Torrance的论文](/assets/pdf/cookpaper.pdf)，以及布瑞恩·卡里斯（Brian Karis）在 SIGGRAPH 2013 所做的演讲：[Real Shading in Unreal Engine 4](/assets/pdf/s2013_pbs_epic_notes_v2.pdf)

