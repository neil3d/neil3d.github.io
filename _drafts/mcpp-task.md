---
layout: post
title: "虚幻4与现代C++：基于Task的并行编程"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover3.png
  credit: ""
  creditlink: ""
brief: "基于Task的并行编程是现代C++的一个趋势，虚幻4中的TaskGraph也是这样一个方向。这个博客就讲一下 TaskGraph 怎么用。"
---

## Part 1
C++ 20 Task Blocks, PPL, TBB简介
http://www.modernescpp.com/index.php/task-blocks

http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2015/n4411.pdf

![task-blocks](/assets/img/mcpp/fork_join.png)

## Part 2
讲清楚 Unreal TaskGraph 怎么用，不讲怎么实现

### Part 2.1
分析引擎中怎么用：SkeletonMesh、Particle
