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
  feature: landing_background.jpeg
  credit: ""
  creditlink: ""
brief: "以 SIGGRAPH 2021 上的演讲 Roblox (Rendering) Engine Architecture 为主要内容来源，了解和学习 Roblox 的技术架构。"
---

元宇宙（metaverse）火了之后，各种文章可以说是铺天盖地，我也一直想搞清楚它到底是一个商业上的概念炒作，还是真的有一些创新的东西。元宇宙这个领域的话，Roblox 作为引爆点，是一个满好的 case study 的选项。正好，在 SIGGRAPH 2021 上，Roblox 的图形技术负责人 Angelo Pesce 有一个演讲。下面的内容主要就来自这个演讲，经过了个人的理解和整理，如有偏差，请指正。

这个演讲看想来的整体感受是：Roblox 作为一个元宇宙的“原型”，与传统的游戏引擎、游戏产品是有很大的差别的。虽然它还只是一个“原型”，也不必拘泥于它的设计，但还是有一些值得思考的想法的！

## Roblox 简介

Roblox 已经进入国内市场，叫做“罗布乐思”。界面和画风是这个样子的，大家可以感受一下。

TODO：添加截图

SIGGRAPH 2021 的演讲中，讲者主要从“**他们是如何定位 Roblox的**”，以及“**Roblox 的发展回顾**”两个方面来对 Roblox 进行介绍的。

### A Social Network for Creativity

按照 Angelo Pesce 的说法，Roblox 不是一个游戏引擎，也不是某种中间件。 Roblox 也不是虚拟世界：它并没有一个单一的用户共享的虚拟空间，甚至连 Lobby（游戏大厅）也没有。

Roblox 提供一个默认的“真实感”的社交空间，包括角色的 3D Avatar、所有对象都支持物理模拟等，希望对创意没有任何限制。他们是希望打造一个“Social Network for Creativity”。Roblox 不像是 Unity3D 或者 Unreal Engine，而是更像 YouTube 或者 Instagram，只不过它的媒体不是视频或图片，而是“**交互式的 3D 虚拟世界**”。

### Roblox 的发展历程

![DynaBlocks](/assets/img/roblox/DynaBlocks.png)

Roblox 的前身是成立于 2004 年的 DynaBlocks，当时的方向是做：Educational Playground。

图形技术方面，最早是使用一个叫做 G3D 的商业引擎，后来转向开源引擎 [OGRE](https://www.ogre3d.org/)，现在是使用自研引擎。

## Roblox 总体架构概述

前面讲到 Roblox 的定位是**以“交互式 3D 虚拟世界”为媒体的社交网络**，所以总体架构的介绍，也是围绕这**虚拟世界**来展开的：
1. Roblox 中的虚拟世界的组成方式，以及核心的特性等；
2. 定义这些虚拟世界的数据模型，也就是他们的 Data Model；
3. 通过客户端、服务端、云端三层计算架构来实现这些虚拟世界及其配套的支撑服务；

### Virtual World  

下面就看一下 Roblox 的虚拟世界。

虚拟世界是由很多高层的元素组成的（Worlds are described with high level primitives），在 Roblox 叫做 **Parts**。个人理解：这里的 primitive 并不是图形层面的图元，而是更 high level 的概念，叫做 Parts 一开始觉得有点突兀，看完后面的介绍就觉得自然了。

最早 Roblox 只提供一些常见的几何体的 Parts，例如球、圆柱、Box等。这些 Parts 支持贴图、CSG 操作、精确的碰撞检测。（所谓的 CSG，即Constructive solid geometry，中文译作“结构实体建模”，是一种通过对基础图元进行多层次的集合运算来进行建模的技术）

后来，有加入了 MeshParts，在2021年又增加 Skinning 的功能。另外，还支持地形、粒子系统、Beam、拖尾特效等。特别提出的是，这些 Parts 的材质（Materials）不只是包含渲染所需的贴图/Shader信息，还包括物理、音效等属性数据。

个人理解：所谓的 High Level 的材质，是定义说这个对象是木头的？还是铁的？有了这个定义之后，渲染、物理、音效都可以根据自己的需要去从实现，而用户则不需要关注类似粗糙度、摩擦系数等具体技术层面的参数。

Roblox 虚拟世界的一个核心设计是：Everything is Dynamic！

- 所有对象默认都是支持物理模拟的
- 99.9% 的对象属性是可以通过脚本动态修改的

这给渲染引擎也提出了不同于传统游戏引擎的调整，这个在后面渲染架构一节详谈。

关于组成虚拟世界的 Parts，可以通过一些具体的例子更直观的理解一下。

TODO: 添加视频中的例子的抓图

### The Data Model

每个虚拟世界是有一个单独的数据模型来描述的。这个数据模型整体上是一个多根的树状结构，类似于 HTML DOM，这些根节点包括各种常用的 Services，如下图所示。
TODO：添加 截图

上图中显示了多个根节点：
- Workspace
- Lighting
- ServerStorage
- etc.

这个数据模型通过内部的一种被称为 RBXL 的数据格式来存储。类似于游戏引擎，也支持脚本语言编程。它的脚本是使用 [Lua*u*](https://luau-lang.org/)。

这个数据模型是原生的 Client/Server 结构的：
- 完整的数据模型只保存在服务端，客户端并不掌握整个数据模型
  - 数据安全方面的考虑，客户端无法下载完整的游戏/世界的源代码、无法注入脚本等
- 服务端按需把客户端需要的对象数据 streamming 下来
  - 同一个世界，不同的客户端可能收到不同版本的数据，例如根据设备的渲染能力不同，而选择不同的对象或属性

### 三层计算架构

|        | Client | Server | Cloud |
| --     | --     | --     | --    |
| Power  | Low    | Mid    | High  |
| Latency| Low    | Mid    | High  |

个人理解：“网络复制（replicate）”是指一种网络同步机制，讲者没有讲细节，可以参考虚幻引擎的 Replication 系统。网络复制可以分为两种：
- 对象属性复制：当对象的属性数据变化后，自动通过网络同步到其他主机。例如玩家A被砍了一刀，HP由100变化为80，这个数值会在 Server 端计算，并修改玩家A这个对象的数据；所有客户端上的玩家A对象的这个数值也经由 replication 机制同步修改；
- 对象方法 Replication：简单理解，就是 RPC。


## 开发者工具：Roblox Studio

目前的主流引擎，例如 Unity3D 和 Unreal Engine，他们的编辑器基本定位都是面向专业开发者的，往往需要大概一周左右的学习时间才能上手，而 Roblox Studio 号称半小时就可以上手！那么 Roblox Studio 有什么不同的思路呢？

传统的游戏引擎的编辑器，Unity Editor 也好 Unreal Editor，它们大体的思路是：

1. 基于反射信息（Unity使用.Net反射系统，而Unreal基于自定义的一套C++反射系统）编辑场景中对象的各种属性；
2. 针对引擎中提供的各种算法，要求开发者配置、调节这些算法的各种参数。
   
这就要求开发者需要很好的理解引擎中的各种对象的结构、细节信息，理解光照、阴影、后处理算法中的那些参数，并能够掌握它们直接的互相影响。这样一来，即使在“工具化”上做的非常出色的 Unity Editor 来说，也需要较长的学习时间，虽然它的学习曲线相对平滑，但定位仍是面向专业人员的。

Roblox Studio 作为一款 Metaverse 开发者工具：

1. 他并不是传统的游戏开发工具，而是用来定义一个 virtual world，其基础就是前面提到的“The Data Model”；
2. 他面向的用户是普通大众，包括很多中小学生。（后面的设计思路完全体现了“客户第一”的指导思想。:D）

为此，Roblox 采用的核心策略是“**Everything is Tech-Agnostic**”，这主要表现为以下这几个方面：
- 用户是使用高层的概念来构建虚拟世界，而不是技术角度的元素（Build worlds with high-level, universal concepts）；
- 不需要用户进行这种优化方面的设置，例如 Portals、Probes 等
- 不需要用户进行技术参数设置，例如 Shadow-map bias 等
- etc.

**Tech-Agnostic 带来的好处**可以从两侧来看：
- 从内容开发者这一侧，大幅降低了学习的门槛。前面也提到了，传统游戏引擎，一套光照、阴影、后处理的参数调节把多人专业人士都搞懵了。
- 从 Roblox 的技术发展的这一次看，这使得它的技术可以做到很大的**缩放性**，并**随着技术发展而迭代**，特别是图形渲染这块。也就是说元宇宙的 Virtual world 的定义可以是确定的，但画面效果可以根据技术的进步不断提高。所以 Angelo Pesce 有另外一个演讲，标题就是 *Rendering the metaverse across space and time* 。

当然，上述这样的做法也给整个底层的架构设计提出了一系列的难题，下面就看看渲染引擎的面临的问题，以及它的解决思路。

## Roblox 渲染引擎架构

前面看到 Roblox 的画风是比较“写意”的，也许会觉得这东西的渲染技术还有什么需要介绍的嘛？其实，真不要小看它，还真是有一些不同的东西的：

1. 所有东西都是动态的，也就是说传统的游戏引擎中那些常用的预计算的技术是全都不能用的；
2. 整个世界是有数量很大的 Parts 组成的（而且是动态的），这就需要特殊的运行时的渲染优化机制；
3. Tech-Agnostic: 不需要开发者进行场景优化设计、技术参数调节等，这些都需要渲染引擎根据当前的平台特性进行最优化的匹配；
4. Roblox 可以运行在多个平台，包括 PC 和 手机，如何发挥出高端平台的优势，又要在低端平台上保障可玩性，工程上的挑战也是很大的；
5. 前面提到的三层计算架构，其复杂性也是一个挑战；

针对于 1、2、3，也就是：“虚拟世界中的 Parts 数量很大、并且是动态的，还不提供用户的优化提交” 这三个问题，Roblox 使用 **Clusters** 机制来进行优化。所谓的 Cluster 基本思路就是按照一定的算法，把世界中的一些 Parts 对象合并到一起渲染。设计的目标是 Data Model 中对象的个数与 Draw Call 的比例为：100比1，也就是平均100个Parts调用一次 Draw Call。这样做是基于一个假设：**虽然整个场景是完全动态的，但对于某一帧来说，只有少量对象是变化了的。

Roblox 目前支持几种 Cluster ：

- FastCluster
  - 使用一种启发式的方，对空间进行分割，把子空间内的 Parts 对象聚合在一起，
  - 将子空间内的对象合并成一个单独的 Vertex Buffer+Index Buffer
  - Reclustering 是很耗时的，它会分摊到多帧来渐进式的构造
  - 这种方式支持所有的设备
- InstanceCluster
  - 对于支持硬件 Instancing 绘制的设备，则可以使用 InstanceCluster
  - Big win：更少的内存/显存，可以渲染更大的视野
- SmoothCluster
  - 用来渲染地形
- 还有其他的

另外，特殊模块可以直接调用 Draw Call，例如粒子系统，GUI等。

针对于 4，也就是：“需要跑在各种各样的设备上，各种设备的算力、渲染能力差异很大”这个问题，Roblox 渲染引擎的主要策略是**侧重系统的可缩放性**。所谓的“缩放性”就是针对用户的设备能力不同，可以提供不同的细节程度、渲染效果的画面，例如在高端 PC 可以渲染出很好的画面，而在低端的手机上，主要保证可玩性，画面质量是次要的。

针对问题4的另外一个策略是“Time-slice everything”，也就是针对每个计算来说（例如灯光 Probes 生成）在每帧给予固定的时间片作为预算，进行多帧增量式的计算，直至最终完成。

## 参考资料

- [Roblox (Rendering) Engine Architecture, SIGGRAPH 2021](https://enginearchitecture.realtimerendering.com/downloads/reac2021_the_rendering_architecture_of_roblox.pdf)
- [Rendering the metaverse across space and time, Digital Dragons 2020](https://youtu.be/9X9VzEsRm2c)
- https://roblox.cn/studio/