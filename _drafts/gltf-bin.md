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

### glTF 中的二进制数据

``` json
    "accessors": [
        {
            "bufferView": 0,
            "byteOffset": 0,
            "componentType": 5123,
            "count": 36,
            "type": "SCALAR"
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
    "buffers": [
        {
            "byteLength": 648,
            "uri": "Box0.bin"
        }
    ]
```