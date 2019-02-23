---
layout: page
title: Unity glTF 2.0 Exporter
---

glTF 2.0 已经获得了很多引擎的支持，特别是在 WebGL 领域，包括 Three.js 等流行的引擎都已经支持了 glTF 2.0 格式。在开发我们需要把模型转换成 glTF 格式，目前有了一些工具。我偏爱的一种方式是把模型先导入到 Unity 中，预览 或者 进行场景布局，然后再导出。下面这个 Unity 插件就可以完成这项任务。

### 版本更新

* 最新版：  **2.2.1**
* 更新日期：**2018年6月1日**
* 最新版下载：[https://github.com/neil3d/Unity-glTF-Exporter/releases](https://github.com/neil3d/Unity-glTF-Exporter/releases)
* 源代码Github地址：[https://github.com/neil3d/Unity-glTF-Exporter](https://github.com/neil3d/Unity-glTF-Exporter)

### 使用方法

使用方法也很简单，如下图所示，只需①②③步即可：
1. 点击菜单 Tools -> Export to glTF 2.0
2. 在弹出的页面中输入：导出路径(Export Path)和模型名称(Model properties.Name)，其他选项可以保持默认值
3. 在 Hierarchy 视图中选中想要导出的对象，然后点击按钮[Export Selection]即可。

![unit-gltf-exporter](/assets/img/unity/gltf-exporter.gif)  

### 使用 Three.js 加载导出的模型

* 使用鼠标在下面这个窗口中拖动，可以旋转镜头；
* 使用鼠标滚轮可以缩放镜头。
* 源代码：[gltf-demo.js](./js/gltf-demo.js)
{% include demo/gltf-demo.html %}

