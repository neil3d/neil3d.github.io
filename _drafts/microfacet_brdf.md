---
layout: post
title: "微表面模型\“考古\”"
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

微表面理论的提出可以追溯到 1967 年。提出这个理论的文章为*Theory for Off-Specular Reflection From Roughened Surfaces*，作者为 Kenneth Torrance 和 E. M. Sparrow，所以也被称为 Torrance-Sparrow 。从这篇文章的发表年度，其实就可以看出，这并不是一篇计算机图形学领域的论文。是的，它是理论物理领域的。

顺带说一下，BRDF 这个概念，据我所知，来源于一篇名为*Geometrical Considerations and Nomenclature for Reflectance*的文章，同样也是理论物理领域的。

那么理论物理里面的这些概念，有是怎么进入计算机图形学的呢？

这个问题还是可以从人的角度去看一下，图形学中普遍使用微表面模型现在普遍被称为 Cook-Torrance 模型。Torrance 可以说是一位跨界的大师，是获得了图形学成就奖的物理学家。早在 1977 年他就和 Jim Blinn（对，就是那个 Blinn-Phong 里面的 Blinn）首次在图形学中实现了微表面模型，后来，在1980年，又与 Rob Cook 合作了一个更完善的版本，也就是我们现在熟知的 Cook-Torrance 模型，文章的标题为*A Reflectance Model for Computer Graphics*。

详见：[1994 Computer Graphics Achievement Award: Kenneth E. Torrance](https://www.siggraph.org/1994-computer-graphics-achievement-award-kenneth-e-torrance/)

## 关于 NDF 项

$$
f(\bm \omega_i, \bm \omega_o) = \frac{F(\bm \omega_i, \bm h) G(\bm \omega_i, \bm \omega_o) D(\bm h)}{4 (\bm \omega_i \cdot \bm n) (\bm \omega_o \cdot \bm n)}
$$


GGX，《Microfacet Models for Refraction through Rough Surfaces》

$$
D(\bm h) = \frac{\alpha^2}{\pi cos^4(\theta_h) (\alpha^2 + tan^2(\theta_h))^2}
$$