---
layout: post
title: "元宇宙技术架构案例分析：Roblox"
author: "房燕良"
column: "GameDev"
categories: metaverse
mathjax: false
tags: [metaverse]
image:
  path: roblox
  feature: roblox_rendering_engine_architecture.png
  credit: ""
  creditlink: ""
brief: "以 SIGGRAPH 2021 上的演讲 Roblox (Rendering) Engine Architecture 为主要内容来源，了解和学习 Roblox 的技术架构。"
---

元宇宙（metaverse）火了之后，各种文章可以说是铺天盖地，我也一直想搞清楚它到底是一个商业上的概念炒作，还是真的有一些创新的东西。要想搞起一个领域，case study 是一个挺有效的方法，而元宇宙这个领域的话，Roblox 作为引爆点，也是首当其冲成为了我的选择。正好，在 SIGGRAPH 2021 上，Roblox 的图形技术负责人 Angelo Pesce 有一个演讲。下面的内容主要就来自这个演讲，经过了个人的理解和整理，如有偏差，请指正。

这个演讲看想来的整体感受是：Roblox 作为一个元宇宙的“原型”，与传统的游戏引擎、游戏产品是有很大的差别的。虽然它还只是一个“原型”，也不必拘泥于它的设计，但还是有一些值得思考的想法的！

## Roblox 简介

### A Social Network for Creativity

按照 Angelo Pesce 的说法，Roblox 不是一个游戏引擎，也不是某种中间件。 Roblox 也不是虚拟世界：它并没有一个单一的用户共享的虚拟空间，甚至连场景 Lobby（游戏大厅）也没有。

Roblox 提供一个默认的“真实感”的社交空间，包括角色的 3D Avatar、所有对象都支持物理模拟等，希望对创意没有任何限制。他们是希望打造一个“Social Network for Creativity”。Roblox 不像是 Unity3D 或者 Unreal Engine，而是更像 YouTube 或者 Instagram，只不过它的媒体不是视频或图片，而是“**交互式的 3D 虚拟世界**”。

### Roblox 的发展历程

![DynaBlocks](/assets/img/roblox/DynaBlocks.png)

Roblox 的前身是成立于 2004 年的 DynaBlocks，当时的方向是做：Educational Playground。

最早是使用一个叫做 G3D 的商业引擎，后来转向开源引擎 [OGRE](https://www.ogre3d.org/)，现在是使用自研引擎。

## Roblox 总体架构概述

### Virtual World and The Data Model

### 三层计算架构

|        | Client | Server | Cloud |
| --     | --     | --     | --    |
| Power  | Low    | Mid    | High  |
| Latency| Low    | Mid    | High  |


## 开发者工具：Roblox Studio

目前的主流引擎，例如 Unity3D 和 Unreal Engine，他们的编辑器基本定位都是面向专业开发者的，往往需要大概一周左右的学习时间，而 Roblox Studio 号称半小时就可以上手！那么 Roblox Studio 有什么不同的思路呢？

传统的游戏引擎的编辑器，Unity Editor 也好 Unreal Editor，它们大体的思路是：

1. 基于反射信息（Unity使用.Net反射系统，而Unreal基于自定义的一套C++反射系统）编辑场景中对象的各种属性；
2. 针对引擎中提供的各种算法，要求开发者配置、调节这些算法的各种参数。
   
这就要求开发者需要很好的理解引擎中的各种对象的结构、细节信息，理解光照、阴影、后处理算法中的那些参数，并能够掌握它们直接的互相影响。这样一来，即使在“工具化”上做的非常出色的 Unity Editor 来说，也需要较长的学习时间，虽然他们的学习曲线相对平滑，但定位仍是面向专业人员的。

Roblox Studio 作为一款 Metaverse 开发者工具：

1. 他并不是传统的游戏开发工具，而是用来定义一个 virtual world，其基础就是前面提到的“The Data Model”；
2. 他面向的用户是普通大众，包括很多中小学生。

为此，Roblox 采用的核心策略是“**Everything is Tech-Agnostic**”。

## Roblox 渲染引擎架构

前面提到：在 Roblox，用来定义 Virtual world 的 data model 是技术无关的，所以渲染引擎就可以做到很大的缩放性，并随着技术发展的演讲。所谓的“缩放性”就是针对用户的设备能力不同，可以提供不同的细节程度、渲染效果的画面，例如在高端 PC 可以渲染出很好的画面，而在低端的手机上，主要保证可玩性，画面质量是次要的。对于技术演进来说，元宇宙的 Virtual world 的定义可以是确定的，但画面效果可以根据技术的进步不断提高。所以 Angelo Pesce 有另外一个演讲，标题就是 *Rendering the metaverse across space and time* 。

## 参考资料

- [Roblox (Rendering) Engine Architecture, SIGGRAPH 2021](https://enginearchitecture.realtimerendering.com/downloads/reac2021_the_rendering_architecture_of_roblox.pdf)
- [Rendering the metaverse across space and time, Digital Dragons 2020](https://youtu.be/9X9VzEsRm2c)