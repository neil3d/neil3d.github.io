---
layout: post
title: "理解PBR：从原理到实现（下）"
author: "燕良"
categories: unreal
tags: [PBR, unreal]
mathjax: true
image:
  path: pbr
  feature: cover_unreal.png
  credit: ""
  creditlink: ""
brief: "前面的文章我们讲了虚幻4中的反射率方程，及其各个部分的公式，这篇文章我们就来讲明白这个方程是如何在实时渲染中求解的！"
---

在前面的文章中我们已经明白了虚幻4中所使用的反射率方程，其中复杂的部分是 Cook-Torrance BRDF，我们把它带入整个积分，回顾一下完整的反射率方程。

$$
L_o(p, v) = \int\limits_H (k_d\frac{c_{diff}}{\pi} + k_s\frac{D(h)F(l,h)G(l,v,h)}{4 (n \cdot l)(n \cdot v)})L_i(p,l) n \cdot l dl
$$

这样复杂的积分是无法求**解析解**的，只能通过数值计算方法求**数值解**，在图形领域常用的方法有“蒙特卡罗方法”、“黎曼和”，在后面用到的时候，我会详细讲。对于实时渲染来说，我们还需要祭出我们最常用的两大法宝：预计算和糊弄，咳咳，说错了，近似，approximation！我们还需要另外一个重要的技术，就是 IBL，即Image Based Lighting！把它们组装起来：**我们通过数值计算方法，把上面这个积分进行恰当的近似，并把其中的一部分进行预计算，存储到一个 Cube Map 上。在实时渲染的时候，通过采样 Cube Map 取得 $$l$$ 方向上的这些预计算值，求出上述积分的近似的数值解！**

下面我们就分预计算和实时渲染这两部分，来讲虚幻4中是如何求解这个积分的。这两部分都是基于Image Based Lighting实现的，所以我们要先把它讲一下。

## Image Based Lighting

## 预计算过程

## 实时渲染中的实现