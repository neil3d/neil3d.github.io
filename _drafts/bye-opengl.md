---
layout: post
title: "再见，亲爱的OpenGL"
author: "燕良"
categories: 3dengine
tags: [3dapi]
image:
  path: opengl
  feature: bye.png
  credit: ""
  creditlink: ""
brief: "OpenGL对软件开发者非常友好，但成也萧何败也萧何，随着GPU的高速发展，OpenGL也越来越力不从心。OpenGL在我学习3D编程的道路上给过我非常大的帮助，但是时候说再见了。"
---

[2018年6月，苹果公司宣布旗下所有操作系统都不再支持OpenGL](https://www.anandtech.com/show/12894/apple-deprecates-opengl-across-all-oses)，而在Windows系统上，OpenGL也早就名存实亡。还记得刚毕业那年，一本《OpenGL超级宝典》帮我从学校的图形学过渡到了实际的3D编程，OpenGL对我们软件开发者是非常友好的。在随后的工作中虽然一直使用Direct3D开发，但我是喜欢OpenGL的。我整理了OpenGL历史版本的更新记录，并用我们部门的[开源数据可视化技术G2](https://antv.alipay.com/zh-cn/g2/3.x/index.html)，制作了下面这个图表。

{% include demo/gl-version-viz.html %}

从上面这个图表不难看出OpenGL的版本更新频率已经明显下降，自从2014年之后只更新了一次。曾经被寄以厚望的WebGL，也是举步维艰啊。虽然WebGL标准是依据OpenGL ES来制定，但它总要比对应的OpenGL ES晚上4，5年的时间！

2014年3月的GDC大会，微软发布DirectX 12，同年6月的WWDC，苹果公司发布了自己的图形API：Metal，次年3月的GDC大会Khronos Group宣布了Vulkan API。为什么连OpenGL的管理组织Khronos都急着去设计全新的图形API，而不是集中力量其中升级OpenGL呢？我想有一下几点原因：

* 成也萧何败也萧何，OpenGL对软件开发者特别友好，也就代表它对硬件厂商并不友好。OpenGL显示驱动要维护所有的状态，对API调用进行各种检查，导致Draw Call的额外负担过重。虽然后面加入Draw Instance，Vertex Array Object等来减少API调用，但都是打补丁，不能根本性解决问题。
* 由于被设计为一个整体的状态机，所以OpenGL API不支持多线程。在CPU走向多核之后，并行编程越来越重要，这就成了一个明显的缺点。

所以，是时候开始Vulkan，Metal或者DirectX 12啦！

### OpenGL简史

下面我们就一起回顾一下OpenGL的发展历程。

* 早期由OpenGL ARB管理，这个组织由多个厂商组成。可以想象NVIDIA，ATI等巨头都是想把自己的强项技术加入到标准中，或者阻止对方这样做，所以扯皮的过程非常消耗时间。3D编程大神约翰·卡马克本是OpenGL的支持者，在Direct3D刚刚推出的时候，还在反对者的公开信上签过字，但是在2011年接受采访的时候也说"[Direct3D现在已经比OpenGL更好了](https://www.tomshardware.com/news/john-Carmack-DirectX-OpenGL-API-Doom,12372.html)"。

### OpenGL ES

### WebGL

### 参考资料

* [Working with Metal: Fundamentals](https://developer.apple.com/videos/play/wwdc2014/604/)，WWDC 2014
* Khronos Group，"[Vulkan - The Future of High-performance Graphics](https://youtu.be/QF7gENO6CI8)"，GDC 2015
* Chris Hecker，"[An Open Letter to Microsoft: Do the Right Thing for the 3D Game Industry](http://chrishecker.com/images/3/33/Gdmogl.pdf)"，1997


