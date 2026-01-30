---
layout: post
title: "Render Graph：新一代渲染引擎的核心"
author: "景夫"
categories: 3dengine
tags: [rendergraph]
image:
  path: rendergraph
  feature: falcor_cover.png
  credit: ""
  creditlink: ""
brief: "Render Graph 这个概念必将成为新一代渲染引擎的核心，这篇文章就来谈谈我对它的理解。Render Graph 是什么？为什么需要 Render Graph？"
---

NVIDIA 有一个开源的实时渲染的研究性开源框架，叫做 Falcor。在2018年11月21日 Falcor 发布的3.2版本中添加了一个非常有意思的东西：Render Graph System，这正好也是我近期一直在关注的一个主题。

Render Graph 也被称为 Frame Graph，它是一个非常棒的概念！它不仅能够方便上层根据需求定义渲染流程，更重要的是，它能够发挥新一代图形 API 的多线程渲染优势。Render Graph 必将成为新一代渲染引擎的核心框架。

趁着这个春节假期，我整理了这篇博客，分享我的学习心得和思考。

### Render Graph 是什么？

### Render Graph 为什么更好？

#### 3D引擎的面临通用性和可定制化

Unity3D 2018.1 beta 引入了 Scriptable Render Pipeline，简称 SRP，并提供 Lightweight Pipeline  和 HD Pipeline 作为内置的系统默认选择。

#### 新一代图形 API 对引擎开发提出更高的要求


### 参考资料

* [NVIDIA Falcor](https://developer.nvidia.com/falcor)
* [FrameGraph: Extensible Rendering Architecture in Frostbite](https://www.ea.com/frostbite/news/framegraph-extensible-rendering-architecture-in-frostbite)
* [Advanced Graphics Tech: Moving to DirectX 12: Lessons Learned](https://www.gdcvault.com/play/1024656/Advanced-Graphics-Tech-Moving-to)
* [Unity Scriptable Render Pipeline Overview](https://blogs.unity3d.com/cn/2018/01/31/srp-overview)