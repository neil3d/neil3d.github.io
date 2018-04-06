---
layout: post
title: "3D引擎数据结构与glTF(4): BIN"
author: "燕良"
categories: 3dengine
tags: [glTF, WebGL, Bin]
image:
  path: gltf
  feature: 2018-bin.jpg
  credit: ""
  creditlink: ""
brief: "针对顶点缓冲、Index缓冲等数据，glTF 提供一个高效的二进制存储方式。"
---

### glTF 文件组织回顾

glTF 是一种***面向实时渲染***的内容标准格式，类似于顶点缓冲、Index 缓冲这些数据它会以一个二进制文件的形式保存，这样，应用程序加载 glTF 内容时就可以把这些 Buffer 直接传递到图形API，而不需要再对它们进行解析或者转换，从而达到高效的目的。前面几章我们主要是讲 “.gltf” 文件中的 JSON 对象的内容，这里我们就介绍一下 glTF 中的 “.bin” 的使用。

![gltf-bin-glsl-png](/assets/img/gltf/2017-gltf-files.png)  

如上图所示 glTF 资源可以带一个 .bin 文件，用来存储几何数据（顶点、索引），动画数据，Skin。

### glTF 中的二进制数据

上文书我们讲到 glTF 的 Mesh 数据中的 Vertex Attribute 和 Index Buffer 都不是直接存储在 JSON 文件中的，而是通过另外一个二进制文件存储的。 接下来，本文就讲一下在 glTF 中的二进制数据存储。

下面这段数据截取在一个 glTF 的 JOSN数据：

``` json
    "buffers": [
        {
            "byteLength": 648,
            "uri": "Box0.bin"
        }
    ],
    "bufferViews": [
        {
            "buffer": 0,
            "byteOffset": 0,
            "byteLength": 576,
            "byteStride": 12,
            "target": 34962
        }
    ],
    "accessors": [
        {
            "bufferView": 0,
            "byteOffset": 0,
            "componentType": 5123,
            "count": 36,
            "type": "SCALAR"
        }
    ]
```

这几个字段就组成了 glTF 的二进制数据处理机制：  
* buffers：每个成员对应一个二进制文件（.bin），单个 bin 文件可以包含多个顶点缓冲+索引缓冲；
* bufferViews：每个成员对应一个 buffer 中的一段数据，这段数据应该是一个顶点缓冲或者一个索引缓冲（ARRAY_BUFFERELEMENT_ARRAY_BUFFER）
* accessors：