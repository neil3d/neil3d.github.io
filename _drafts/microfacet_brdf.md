---
layout: post
title: "微表面模型“考古”"
author: "房燕良"
column: "3dengine"
categories: unreal
mathjax: true
tags: [3dengine, unreal]
image:
  path: raytracing
  feature: cover_01.jpg
  credit: ""
  creditlink: ""
brief: "聊聊微表面模型的来龙去脉，看看它是如何在计算机图形学和图形引擎中发展起来的。"
---

微表面模型这些年非常流行，无论是在离线渲染还是游戏引擎中有大量的应用。这项技术是怎么发展起来的呢？我把之前看过的一些资料整理汇总了一下，加上自己的一点推测，大概有了下面这样一个脉络，欢迎批评指正。

## 从理论物理到图形学

微表面理论的提出可以追溯到 1967 年。提出这个理论的文章为*Theory for Off-Specular Reflection From Roughened Surfaces*，作者为 Kenneth Torrance 和 E. M. Sparrow，所以也被称为 Torrance-Sparrow 模型。从这篇文章的发表年度，其实就可以看出，这并不是一篇计算机图形学领域的论文。是的，它是**理论物理**领域的。

顺带说一下，BRDF 这个概念，据我所知，来源于一篇名为*Geometrical Considerations and Nomenclature for Reflectance*的文章，同样也是理论物理领域的。

那么理论物理里面的这些概念，有是怎么进入计算机图形学的呢？

这个问题还是可以从人的角度去看一下，图形学中普遍使用微表面模型现在普遍被称为 Cook-Torrance 模型。Torrance 可以说是一位跨界的大师，是**获得了图形学成就奖的物理学家**。早在 1977 年他就和 Jim Blinn（对，就是那个 Blinn-Phong 里面的 Blinn）首次在图形学中实现了微表面模型，后来，在1980年，又与 Rob Cook 合作了一个更完善的版本，也就是我们现在熟知的 Cook-Torrance 模型，文章的标题为*A Reflectance Model for Computer Graphics*。

详见：[1994 Computer Graphics Achievement Award: Kenneth E. Torrance](https://www.siggraph.org/1994-computer-graphics-achievement-award-kenneth-e-torrance/)

## 微表面模型中的概率分布函数

下面这个公式也就是我们所说的微表面模型：

$$
f(\bm \omega_i, \bm \omega_o) = \frac{F(\bm \omega_i, \bm h) G(\bm \omega_i, \bm \omega_o) D(\bm h)}{4 (\bm \omega_i \cdot \bm n) (\bm \omega_o \cdot \bm n)}
$$

其中分子是由三个函数的成绩组成的，分别是：
- F：菲涅尔项（Fresnel term）
- G：几何衰减项（Geometric attenuation term），或者阴影遮蔽项（shadowing-masking term）
- N：法线分布函数（Normal Distribution Function）

为了让这个帖子不至于太水，我们还可以查看一下虚幻4引擎中的 Shader 代码，看一下现代引擎中常用的一些 F、G、N 的实现方案。打开“{引擎安装目录}\Engine\Shaders\Private\BRDF.ush” 即可找到相关的实现代码。

### F-菲涅尔项

菲涅尔现象是一种光线现象，使用固定的公式来计算，实时渲染中是办使用 Schlick 近似方案：*Schlick 1994, "An Inexpensive BRDF Model for Physically-Based Rendering"*。  

可以参加上述 Shader 文件中的 `float3 F_Schlick( float3 SpecularColor, float VoH )` 和 `float3 F_Fresnel( float3 SpecularColor, float VoH )` 函数。这个不是重点，就略过了。

### G、N 项

G 和 N 两者则是某种概率分布函数。

关于**N-发现分布函数**，虚幻4引擎中实现了：
- Beckmann 1963, "The scattering of electromagnetic waves from rough surfaces"
- Blinn 1977, "Models of light reflection for computer synthesized pictures"
- GGX / Trowbridge-Reitz, Walter et al. 2007, "Microfacet models for refraction through rough surfaces"
- Anisotropic GGX, Burley 2012, "Physically-Based Shading at Disney"

关于**G-几何衰减项**，虚幻4引擎中实现了：
- Smith 1967, "Geometrical shadowing of a random rough surface"
- Neumann et al. 1999, "Compact metallic reflectance models"
- Kelemen 2001, "A microfacet based coupled specular-matte brdf model with importance sampling"
- Appoximation of joint Smith term for GGX, Heitz 2014, "Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs"

我们可以先来看一下 Beckmann：
$$
  Beckmann(h) = \frac{1}{\pi \alpha^2 cos^4 \theta_h} e^{-tan^2 \theta_h/ \alpha^2}
$$

Smith:
$$
G(\bm \omega_i, \bm \omega_o) = G_1(\omega_i) G_1(\omega_o) \\
G_1(\bm v) = \begin{cases} \frac{2}{1 + \sqrt{1 + \alpha^2tan^2(\theta_v)}} & \text{if } \bm v \cdot \bm n > 0 \\ 0 & \text{otherwise} \end{cases} \\
\theta_v = cos^{-1}(\bm v \cdot \bm n)
$$

如果把上面的公式跟高斯分布的公式放一起，就会发现他们有几分相似:
$$
  f_X(x) = \frac{1}{\sqrt{2\pi\sigma^2}} e ^{-(x-\mu)^2/(2 \sigma^2)}
$$
