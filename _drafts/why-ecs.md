---
layout: post
title: "ECS 与面向数据的设计"
author: "燕良"
categories: 3dengine
tags: [ECS]
image:
  path: ecs
  feature: cover.jpg
  credit: 
  creditlink: ""
brief: "《守望先锋》使用了 ECS 的架构方式，但是为什么 ECS 会成为一个更好的架构呢？这篇文章就来讲一下 ECS 背后的‘面向数据的设计（Data-Oriented Design）’，你将会明白这个 Why。"
---

来自"玻璃渣"的 Timothy Ford 在 GDC 2017 大会做了一个专题演讲“《守望先锋》架构设计与网络同步（Overwatch Gameplay Architecture and Netcode）”，其中介绍的 ECS 架构一时引起众多关注。在转过年来的 Unity 2018 新版中也支持了 ECS 架构，并且做了很多比较，结合其新的 Job System 性能有大幅提升！

![overwatch](/assets/img/ecs/overwatch.png){: .center-image }

ECS - Entity, Component, System 这一系列概念都是非常简单清晰的，那么为什么 ECS 会成为游戏行业的主流设计思想呢？这还要从‘面向数据的设计（Data-Oriented Design）’讲起。ECS 是一种‘面向数据的设计’在咱们游戏、引擎行业中的成功应用，要想理解“WHY”，就必须要理解‘面向数据的设计’这一思想！

## 面向数据的设计

现代的程序设计思想要求我们以计算机的方式去解决问题（而不是以人脑的方式），‘面向数据的设计’思想可以说是沿着这个方向又前进了一大步。这种程序设计的思想的出现和流行和计算机硬件的发展是息息相关的。乔布斯曾经引用过 Alan Kay 的一句名言说软件开发者必须关系硬件。下面我就结合计算机硬件的发展现状来说明一下这种设计思路的优势在哪里，也就是说为什么 ECS 之类是更好的设计！

### 内存与 CPU 的性能差距

![cpu-ram-gap](/assets/img/ecs/cpu-ram-gap.png){: .center-image }

在过去几十年 CPU 的工作频率得到了快速提升，而内存（DRAM）的工作频率提升却没有那么快！我作为一个电脑 DIY 玩家是有切身体会的，选购主板、内存、CPU的时候，有两个常见的概念：外频和倍频！外频也就是系统总线工作的频率。例如我家里这台电脑的总线速率是**1GHz**，CPU 的主频是**3.2GHz**，倍频为32，而内存主频只有**800MHz**。CPU通过**倍频机制**工作在更高的主频之上。从下面这张图，我们可以非常直观的看出内存与 CPU 之间的性能差距。

![cpu-z](/assets/img/ecs/cpu-z.png){: .center-image }

> 从上面的截图中我们还看到一个 DRAM “充电”的指标，我们都知道 DRAM 必须以一定频率充电才能保持其存储的内容不丢失。Oculus 现任的首席科学家迈克尔·亚伯拉什（Michael Abrash）在早年就写个一篇文章，讲图形程序优化的。其中讲到一个技巧就是计算每个汇编指令的时钟周期，然后手动排列汇编指令，避开这个 DRAM “充电”时间。因为在 DRAM 充电的时候是无法进行读写操作的！优化到如此程度，实在令人咋舌！

对于 CPU 来说“内存”已经是一个非常缓慢的设备了！为了少被内存拖后腿，CPU 内部集成了越来越多的 Cache。

CPU 的内存预读取、Cache 对于我们软件开发者都是透明的，为了验证这个点上的性能差异，我写了一个小小的测试程序。这个测试程序分别以“基于组件的对象设计”和“基于数据的设计”两种方式，对 5000 个 GameObject 或者叫做 Entity 的 Transform 矩阵进行计算。核心的计算代码都是一样的，最重要的差别就是 Transform 数据的内存布局不同。测试的结果十分惊人，在我的电脑上前者要比后者慢 2.8 倍！这个测试程序的代码请见：[https://github.com/neil3d/GLab/tree/master/ECSProfile](https://github.com/neil3d/GLab/tree/master/ECSProfile) 。

### 多核与并行编程

2005年 Herb Sutter 发表了著名的文章：*The Free Lunch Is Over*。

OpenMP
Intel Threading Building Blocks

## 回顾 ECS

通过理解“面向数据的设计”，我们就可以对 ECS 架构有一个更清晰的认识：不仅知道“是什么”，还知道了“为什么”。

* 与“基于组件的对象设计”不同，ECS 架构中的 Component 只包含数据。例如使用 C++ 编程的话，Component就可以是 POD 类型（Plain Old Data）。Entity 也不是面向对象那样把组件、行为封装起来，而是只对应一个 ID。整个这个机制的设计使得所有组件可以在 World 中统一管理的时候，可以使用连续的内存布局，大大提高 CPU 的 Cache 命中率。
* System 对于组件数据的“读写”是可以明确定义的。从这个数据的读写就可以分析出系统之间的依赖关系，形成一个 DAG。基于这种分析也就可以确定那些系统是可以并行执行的！典型的就是 Unity3D 的 JobSystem。