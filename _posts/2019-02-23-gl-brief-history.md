---
layout: post
title: "可视化的OpenGL简史"
author: "景夫"
column: "Graphics"
categories: 3dengine
tags: [3dapi]
image:
  path: opengl
  feature: bye.png
  credit: ""
  creditlink: ""
brief: "使用隔壁组的数据可视化技术为OpenGL做了一个版本历史气泡图，并一起回顾一下OpenGL一路走来的历程，分享一下我与OpenGL的故事。"
---

[2018年6月，苹果公司宣布旗下所有操作系统都不再支持OpenGL](https://www.anandtech.com/show/12894/apple-deprecates-opengl-across-all-oses)，让人不禁叹息。于是想回顾一下OpenGL一路走来的历程。下面这个气泡图是我用[开源数据可视化技术AntV](https://antv.alipay.com)制作的，它显示了OpenGL家族历次版本更新的时间线，鼠标指向版本可以弹出tips，显示版本特性。

{% include demo/gl-version-viz.html %}

### OpenGL简史

上世纪90年代，计算机图形还没有进入消费级市场，但高端图形工作站已经进入业界，当时SGI（Silicon Graphics, Inc.）在这个领域当处于领先地位。我们熟悉的《侏罗纪公园》（1993年上映）就是使用 SGI 图形工作站渲染的。SGI拥有专利性的图形API，叫做IRIS GL。后来SGI高瞻远瞩的看到可移植性的重要，于是他们决定对IRIS GL进行修改，并把它当作一种开放标准，这就是1992年6月所发布的OpenGL 1.0版本！同年，由SGI发起成立了 OpenGL架构评审委员会，即OpenGL ARB（Architecture Review Board），初始成员包括康佰（Compaq），IBM，Intel，微软 以及DEC，后来不断有其他公司加入，包括 HP，nVidia，ATI等等。

1993年底DOOM发布，眼看3D游戏已经势不可挡，三位SGI的天才工程师离职创办了 3dfx Interactive，并于1995年11月推出首款3D加速卡VOODOO！虽然是SGI的老人儿，但3dfx对OpenGL一点都不感冒 ，一心推动自己私有的图形API--Glide，这是OpenGL第一个强劲的对手。在1996年3月的E3大展上，共有15个支持VOODOO硬件加速的游戏展出，震撼了业界。

1996年6月id Softwar的经典FPS游戏Quake发布，并立即成为一股热潮！但是id Software的灵魂人物约翰·卡马克拒绝使用3dfx Glide，并于第二年1月推出使用OpenGL加速光栅化渲染的GLQuake。不能支持最热门的3D游戏，3dfx即使在加速卡硬件市场占有85%，也是无比尴尬的！最终3dfx不得不将Glide再封装一层来兼容OpenGL（MiniGL）来化解这一窘境。在VOODOO加速卡发布15个月之后，它总算赶上了Quake这班车。这已经揭示了3dfx Glide API是没有前途的！有了Quake这样顶级游戏的支持，OpenGL在上世纪90年代成为了无可争议的业界标准。2000年9月，3dfx才决定加入OpenGL ARB，可惜为时已晚。3dfx盛极而衰，2001年1月公司轰然解体，其芯片、专利、品牌皆有NVIDIA收购（现在N卡所使用的SLI多显卡级联技术，最早就出现在3dfx的VOODOO 2加速卡上）。

干掉3dfx Glide之后，OpenGL却迎来了真正的挑战者：Direct3D！  

早在1995年微软发布DirectX 1.0的时候就已经包含了Direct3D，但并没有引起业界足够的重视。直到1997年8月发布的DirectX 5.0，对Direct3D进行了重大升级，提供了立即模式和保留模式两种编程模式，业界终于看到了微软对3D API的野心。以卡马克为首的游戏开发者非常不愿意看到3D API标准的分裂，一时间Direct3D反对之声四起，其中包括卡马克在他著名的.plan文件中对Direct3D的吐槽，以及著名的公开信“An Open Letter to Microsoft: Do the Right Thing for the 3D Game Industry”，但这一切都无法动摇Direct3D日益增长的地位，其中也是有一些原因的：

* 微软虽然也官僚，但执行力和效率仍然比OpenGL ARB高很多；
* Direct3D选了与OpenGL相反的方向：它选择贴近硬件。适逢GPU从出生到爆发式增长的快速迭代时期，这种方式是更合适的；
* 微软的Win32 API当时正值鼎盛时期，以此为基础，微软当年是无往不利；

Direct3D 5.0并不是一个成功的版本，它提供的保留模式显得高不成低不就。直到2000年12月Direct3D 8.0率先支持了可编程渲染管线，当时的Pixel Shader 1.1和Vertex Shader 1.1都需要使用汇编语言编写，随后又迅速升级为Direct3D 8.1，支持Pixel Shader 1.4。仅仅两年之后的Direct3D 9.0就支持了高级Shader编程语言：HLSL，以及Shader Model 2.0。可编程渲染管线对于实时渲染无疑是革命性的，Shader刚刚出现时功能极其羸弱，例如Pixel Shader 1.1仅支持12条指令，但它更新迭代的特别快。

可编程渲染管线的高速发展和OpenGL ARB的低效率形成了鲜明的对比！在这段高速发展期，OpenGL落伍了。支持高级Shader编程语言的OpenGL 2.0直到2004年9月才推出，足足比Direct3D 9.0晚了将近两年！可以想象NVIDIA，ATI等巨头都是想把自己的强项技术加入到OpenGL新版标准中，或者阻止对方这样做，所以扯皮的过程非常消耗时间。:worried:

2006年7月31日，OpenGL ARB宣布将OpenGL标准的控制权转交给Khronos Group。Khronos Group是一个非盈利组织，它和OpenGL ARB的成员有很多交集。OpenGL的嵌入式版本的子集OpenGL ES，其1.0于2003年7月28日由该组织发布。OpenGL ES后来成为了移动端图形标准，也使得OpenGL家族焕发了第二次青春，直到2014年新的挑战者Metal的出现。

### 亲历OpenGL历史

我在大学虽然学了图形学课程，但走上工作岗位之后，发现中间还是有很大的Gap。此时非常幸运翻到了《OpenGL超级宝典》这本书，当时我看的是它的第二版，对应的是OpenGL 1.2。这是一本被名字耽误了的好书，内容翔实，阅读体验流畅，比"红宝书"读起来轻松很多。正是这本书和OpenGL的友好性，帮我开启了3D编程的大门。读完这本书，顺手就写了一个桌球游戏，放到一个国外的共享软件网站，没想到还买了1千多美元呢，哈哈！:moneybag:

在后来的实际项目开发中，我一直想使用OpenGL。印象最深的就是等待OpenGL 2.0。那时候正在准备从头构建一个3D引擎，用于MMORPG项目《功夫世界》的开发。还好没有死等，选择了DirectX 9.0，不过DirectX 9.0c确实也是一代经典！3D编程大神约翰·卡马克本也是OpenGL的坚定支持者，但是在2011年接受采访的时候也改口说"[Direct3D现在已经比OpenGL更好了](https://www.tomshardware.com/news/john-Carmack-DirectX-OpenGL-API-Doom,12372.html)"。

十年之后，加入蚂蚁金融，从事图形相关的开发，搞了1年多WebGL。对GL家族API还是倍感亲切的，不过相关标准的制定进展仍然是龟速。虽然WebGL标准是依据OpenGL ES来制定，但它总要比对应的OpenGL ES版本晚上4，5年的时间！:disappointed:

最近几年新一代图形API风云骤起：

* 2014年3月的GDC大会，微软发布DirectX 12
* 同年6月的WWDC，苹果公司发布了自己的图形API：Metal
* 次年3月的GDC大会Khronos Group宣布了Vulkan API，被称为OpenGL的继任者

为什么连OpenGL的管理组织Khronos都急着去设计全新的图形API，而不是集中力量其中升级OpenGL呢？我想有一下几点原因：

* 成也萧何败也萧何，OpenGL对软件开发者特别友好，也就代表它对硬件厂商并不友好。这在早期可能不是太大的问题，但随着GPU越来越强大、越来越复杂，GL驱动这一层也越来越厚。OpenGL显示驱动要维护所有的状态，对API调用进行各种检查，导致Draw Call的额外负担过重。虽然后面加入Draw Instance，Vertex Array Object等来减少API调用，但都是打补丁，不能根本性解决问题。
![wwdc2015-metal](/assets/img/opengl/wwdc2015-metal.gif)
* 由于被设计为一个整体的状态机，所以OpenGL API不支持多线程。在CPU走向多核之后，并行编程越来越重要，这就成了一个明显的缺点。

所以，是时候开始Vulkan，Metal或者DirectX 12啦！

### 参考资料

* Wiki-MiniGL，[https://en.wikipedia.org/wiki/MiniGL](https://en.wikipedia.org/wiki/MiniGL)
* Wiki-OpenGL，[https://en.wikipedia.org/wiki/OpenGL](https://en.wikipedia.org/wiki/OpenGL)
* [About the OpenGL ARB](https://www.opengl.org/archives/about/arb/)
* [OpenGL ARB to Pass Control of OpenGL Specification to Khronos Group](https://www.khronos.org/news/press/opengl_arb_to_pass_control_of_opengl_specification_to_khronos_group)
* Khronos Group，"[Vulkan - The Future of High-performance Graphics](https://youtu.be/QF7gENO6CI8)"，GDC 2015
* Chris Hecker，"[An Open Letter to Microsoft: Do the Right Thing for the 3D Game Industry](http://chrishecker.com/images/3/33/Gdmogl.pdf)"，1997


