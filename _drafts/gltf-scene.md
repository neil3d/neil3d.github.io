---
layout: post
title: "3D引擎数据结构与glTF(2): Scene Graph"
author: "燕良"
categories: 3dengine
tags: [glTF, WebGL, SceneGraph]
image:
  path: gltf
  feature: 2017-scene-graph.jpg
  credit: Khronos Group
  creditlink: ""
brief: "在这篇文章中我们将介绍 Scene Graph 的概念，以及在 glTF 标准中是如何定义 Scene Graph 数据的。"
---

### 图形学中的 Scene Graph

Local Space 与 World Space

### 游戏引擎中的 Scene Graph

![unity_scene](/assets/img/gltf/2017-unity-scene.png)  

先来看一下 Unity3D引擎吧。在 Unity Editor 中我们可以直观的从 Hierarchy 视图中看到整个 Scene Graph 结构。当你移动移动一个 GameObject 时，它下面的所有子节点也会跟随它一起移动。  从代码的角度看，场景节点中的父子关系并不由 GameObject 负责管理，而是由 Transform 组件去完成。 想要指定或者改变对象的父子关系就需要调用 Transform.SetParent()，这个函数的第二个参数为“bool worldPositionStays”，也就是保持对象在世界空间中的位置不变。你可以思考一下，如果要你实现这个API，你怎么写？

在 Unreal Engine 4 中也有 Scene Graph 概念的实现，情况与 Unity3D 非常类似。Unreal Editor中的“World Outliner”视图，也直观的展现了当前场景的层次结构。 AActor 在场景中的层次结构是由 USceneComponent 组成父子关系来实现的。  

### glTF 定义的 Scene Graph 数据

![gltf_scene_graph](/assets/img/gltf/2017-gltf-scenegraph.png)  

在glTF标准中也使用 Scene Graph 的概念。首先，一个glTF数据可以包含零到多个 scene ，每个场景都是由 node 组成的一个树形层次结构。

在前面一篇文章的[glTF简介](/3dengine/gltf-intro.html)中，我们讲到了 glTF 的核心数据是由一个 JSON 格式的文本文件定义的。 下面我们就先看一下 glTF 中场景的定义：
``` json
{
    "scenes": [
        {
            "nodes": [0]
        }
    ],
    "scene": 0,    
    "nodes": [
        {
            "name": "root"
            "children": [1]
        },
        {
            "name": "box"
            "mesh": 0
        }
    ],
}
```

上面这段 JSON 数据定义了一个 Object ，它有三个重要的字段：
* scenes：是一个对象数组，定义这个 glTF 数据中有几个场景，每个场景是一个对象，包含 name 和 nodes 两个字段。nodes 是一个数组，通常只有一个元素，它指定这个场景的根节点；
* scene：这个字段指定默认渲染哪个场景；
* nodes：是一个对象数组，包含所有的节点数据。

其中，节点是构成 Scene Graph 的核心数据，下面我们再看一下 node 的数据构成。node 可以拥有可选字段：
* name：名称，字符串；
* children：是一个数组，定义当前这个 node 包含哪些子节点；
* transform数据，可以是一个 “matrix” 字段，定义一个4x4的矩阵；也可以由“translation”、“rotation”、“scale ”三个分量来定义。
* mesh：指定当前节点引用哪个 mesh 对象来渲染；
* camera：指定当前节点引用哪个摄像机；

理解了 Scene Graph 的概念之后，再看上述的 glTF 场景数据定义就很直观了。看到这儿，场景的数据结构应该清晰了，但是目前这个场景还没包含任何实际的功能，在下一节，我们将看一看 glTF 中如何实现摄像机的定义。

### glTF 样例数据

本文中所引用的 JSON 内容来自下面这个样例数据，你可以下载这个完整的 glTF 资源查看一下整体数据的样子。

* 只包含一个 Node 的简单场景
  * [Box](/assets/img/gltf/box.zip)    
  * ![gltf_box](/assets/img/gltf/2017-gltf-box.png)  

* 卡车模型的场景，包含多个 Node ，组成层次结构
  * [Cesium Milk Truck](/assets/img/gltf/truck.zip)  
  * ![gltf_truck](/assets/img/gltf/2017-gltf-truck.gif)  
