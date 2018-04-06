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

如上图所示 glTF 资源可以带一个或者多个 .bin 文件，用来存储几何数据（顶点、索引），动画数据，Skin。 在前面一章，我们讲 Mesh 数据的时候，就讲到 顶点数据对应的是一个 index，下面我们就将一下具体怎么从这个 index 找到对应的二进制数据。

### glTF 中的二进制数据

首先，我们需要找到对应的 “.bin” 文件：

* 在 ".gltf" 的 JSON 数据中有一个 "buffers" 字段，里面定义了这个 glTF 所包含的所有 .bin 文件，例如下面这样：
``` json
    "buffers": [
        {
            "byteLength": 648,
            "uri": "Box0.bin"
        }
    ]
```
* 通过 buffers 字段中的 "uri"，我们就可以加载 glTF 指定的 .bin 文件了。
* 另外，这个 "uri" 字段也可以通过 base64 编码的方式，嵌入一些比较小的二进制数据块。

这个 .bin 文件可以将很多顶点缓冲、动画数据都打包在一个文件中，那么，接下来就需要 buffer view 和 accessor 来找到特定的数据了。  

Buffer View 就是指定 .bin 文件中的一段二进制数据，它可以对应一个 Vertex Buffer 或者 Index Buffer 等，如下面这个例子所示。我们可以看到，每个 Buffer View 还有一个 target 字段，它可以是 GL_ARRAY_BUFFER 或者 GL_ELEMENT_ARRAY_BUFFER。
``` json
    "bufferViews": [
        {
            "buffer": 0,
            "byteOffset": 0,
            "byteLength": 576,
            "byteStride": 12,
            "target": 34962
        }
    ]
```

最后，顶点属性或者 Index 对应的是 accessor，它定义了对应的 buffer view，和一些数据类型信息等，如下面这个 json 所示。
``` json
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

### 总结一下

Mesh、Animation 等对应的二进制数据都是通过索引一个 accessor 来定义的，而 accessor 定义里数据类型信息以及它所对应的 buffer view，然后 buffer view 定义里自己对应的 buffer 中的哪一块，最后 buffer 对应 .bin 文件数据。:smile: