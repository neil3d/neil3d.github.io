---
layout: page
title: 虚幻4动画贴图插件
---

# 虚幻4动画贴图插件
---

GIF使用最多256色调色板，感觉和虚幻4的高大上定位颇为违和，所以EPIC官方并没有支持它；但是，偶尔在UMG或者材质中使用一下动画的需求还是有的。这时候，如果能方便的导入GIF动画文件，也不失为一种便利。

基于上面的需求，开发了一个小的虚幻4插件：它创建了一种新的贴图类型--AnimatedTexture，在任何支持Texture的接口上都可以使用，包括材质、UMG等。目前支持了导入GIF动画，将来可能增加其他动画文件的支持。

它的特点是非常轻量级，对于一些小的需求，就没有必要启用重量级的Media Framework啦！

#### 版本更新

* 最新版：0.4.2
* 更新日期：2019年12月
* EPIC Marketplace：[https://www.unrealengine.com/marketplace/zh-CN/slug/animated-texture-with-gif-importer](https://www.unrealengine.com/marketplace/zh-CN/slug/animated-texture-with-gif-importer)
* GitHub下载：[https://github.com/neil3d/UnrealAnimatedTexturePlugin/releases](https://github.com/neil3d/UnrealAnimatedTexturePlugin/releases)
* Demo工程：[https://github.com/neil3d/UnrealAnimatedTextureDemo](https://github.com/neil3d/UnrealAnimatedTextureDemo)

#### 主要功能

* 将动画GIF文件导入的虚幻4项目中，生成一个插件定义的AnimatedTexture资源对象
* 支持GIF透明、interlace等特性
* AnimatedTexture用法和Texture2D几乎一致，支持材质、UMG，可以在Texture Editor中编辑属性
* AnimatedTexture具有完整的播放控制API
* 支持引擎版本：4.21至4.24

![anim texture demo](/assets/img/unreal/plugins/demo-anim-texture.gif)  
