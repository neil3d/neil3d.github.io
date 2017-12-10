---
layout: post
title: "3D引擎数据结构与glTF:场景"
author: "燕良"
categories: 3dengine
tags: [glTF, WebGL, SceneGraph]
image:
  path: gltf
  feature: 2016-gltf-jpeg-of-3d.jpg
  credit: Khronos Group
  creditlink: ""
brief: "在这篇文章中我们将介绍 Scene Graph 的概念，以及在 glTF 标准中是如何定义场景的。"
---

### 图形学中的 Scene Graph

### 游戏引擎中的 Scene Graph

先来看一下 Unity3D引擎吧。在 Unity Editor 中我们可以直观的从 Hierarchy 视图中看到整个Scene Graph结构。当你移动移动一个 GameObject 时，它下面的所有子节点也会跟随它一起移动。  从代码的角度看，场景节点中的父子关系并不由 GameObject 负责管理，而是由Transform组件去完成。
keep world

在 Unreal Engine 4 中也有 Scene Graph 概念的实现，情况与 Unity3D 非常类似。 AActor 并没有父子关系，而由 USceneComponent 组成父子关系。  

### glTF定义的 Scene Graph 数据

在前面一篇文章的[glTF简介](./gltf-intro.md)中，我们讲到了glTF的核心数据是由一个JSON格式的文本文件定义的。我们先看一下下面这个最简单的glTF JSON文件，它定义了一个场景，其中包含一个根节点和一个摄像机。
``` json
{
  "scene":{
    "nodes":"hello"
  }
}
```