---
layout: post
title: "OpenGL简史"
author: "燕良"
categories: 3dengine
tags: [3dapi]
image:
  path: opengl
  feature: bye.png
  credit: ""
  creditlink: ""
brief: "使用隔壁组的数据可视化技术为OpenGL做了一个版本历史气泡图，并一起回顾一下OpenGL一路走来的历程，分享一下我与OpenGL的故事。"
---

[2018年6月，苹果公司宣布旗下所有操作系统都不再支持OpenGL](https://www.anandtech.com/show/12894/apple-deprecates-opengl-across-all-oses)，让人不禁叹息。于是想回顾一下OpenGL一路走来的历程。下面这个气泡图是我用[开源数据可视化技术AntV](https://antv.alipay.com)制作的，它显示了OpenGL历次版本更新的时间线，鼠标指向版本可以弹出tips，显示版本特性。

{% include demo/gl-version-viz.html %}

### OpenGL简史

上世纪90年代，计算机图形还没有进入消费级市场，但高端图形工作站已经进入业界，当时SGI在这个领域当时处于领先地位。SGI拥有专利性的图形API，叫做IRIS GL。后来SGI高瞻远瞩的看到可移植性的重要，于是他们决定对IRIS GL进行修改，并把它当作一种开放标准，这就是199 年6月所发布的OpenGL 1.0版本！同年，由SGI发起成立了 OpenGL架构评审委员会，即OpenGL ARB（Architecture Review Board），初始成员包括康佰（Compaq），IBM，Intel，微软 以及DEC，后来不断有其他公司加入，包括 HP，nVidia，ATI等等。

TODO：3dfx glide与OpenGL的竞争
TODO：卡马克对glide的抵制
TODO：Direct3D与OpenGL的竞争，业界对D3D的抵制
TODO：OpenGL 2.0的失败，以及ARB的解散，Khronos Group的由来？
TODO：移动端与OpenGL ES
TODO：前端与WebGL


### 亲历OpenGL历史

在大学虽然有一年的图形学课程，但走上工作岗位之后，发现中间还是有很大的gap。此时非常幸运翻到了《OpenGL超级宝典》这本书。这上一本被名字耽误了的好书，内容翔实，阅读流畅，比"红宝书"读起来轻松很多。正是这本书和OpenGL的友好性，帮我开启了3D编程的大门。读完这本书，顺手就写了一个桌球游戏，放到一个国外的共享软件网站，没想到还买了1千多美元呢，哈哈！

在后来的实际项目开发中，我一直想使用OpenGL。印象最深的就是等待OpenGL 2.0，但是他比相同技术等级的（支持高级Shader语言，Shader Model 3）DirectX 9.0，足足晚了2年多。那时候正在准备从头构建一个3D引擎，用于MMORPG项目《功夫世界》的开发。还好没有死等，选择了DirectX 9.0，不过DirectX 9.0c确实也是一代经典！当时OpenGL标准是由OpenGL ARB管理，这个组织由多个厂商联合组成。可以想象NVIDIA，ATI等巨头都是想把自己的强项技术加入到标准中，或者阻止对方这样做，所以扯皮的过程非常消耗时间。3D编程大神约翰·卡马克本也是OpenGL的坚定支持者，在Direct3D刚刚推出的时候，还在反对者的公开信上签过字，但是在2011年接受采访的时候也说"[Direct3D现在已经比OpenGL更好了](https://www.tomshardware.com/news/john-Carmack-DirectX-OpenGL-API-Doom,12372.html)"。


十年之后，加入蚂蚁金融，搞了1年多WebGL开发。对GL家族API还是倍感亲切的，不过相关标准的制定进展仍然是龟速。虽然WebGL标准是依据OpenGL ES来制定，但它总要比对应的OpenGL ES版本晚上4，5年的时间！

最近几年新一代图形API风云骤起：

* 2014年3月的GDC大会，微软发布DirectX 12
* 同年6月的WWDC，苹果公司发布了自己的图形API：Metal
* 次年3月的GDC大会Khronos Group宣布了Vulkan API

为什么连OpenGL的管理组织Khronos都急着去设计全新的图形API，而不是集中力量其中升级OpenGL呢？我想有一下几点原因：

* 成也萧何败也萧何，OpenGL对软件开发者特别友好，也就代表它对硬件厂商并不友好。OpenGL显示驱动要维护所有的状态，对API调用进行各种检查，导致Draw Call的额外负担过重。虽然后面加入Draw Instance，Vertex Array Object等来减少API调用，但都是打补丁，不能根本性解决问题。
* 由于被设计为一个整体的状态机，所以OpenGL API不支持多线程。在CPU走向多核之后，并行编程越来越重要，这就成了一个明显的缺点。

所以，是时候开始Vulkan，Metal或者DirectX 12啦！

### 参考资料

* Wiki-OpenGL, https://en.wikipedia.org/wiki/OpenGL
* Khronos Group，"[Vulkan - The Future of High-performance Graphics](https://youtu.be/QF7gENO6CI8)"，GDC 2015
* Chris Hecker，"[An Open Letter to Microsoft: Do the Right Thing for the 3D Game Industry](http://chrishecker.com/images/3/33/Gdmogl.pdf)"，1997


