---
layout: post
title: "Unreal Cook Book"
author: "燕良"
categories: unreal
tags: [unreal]
image:
  path: ucookbook
  feature: cover.jpg
  credit: Epic Games
  creditlink: "unrealengine.com"
brief: "虚幻4的一些常用功能、技巧的例子。"
---

**这些例子保存在一个项目中，所有资源和代码都可以从这里下载：**[https://github.com/neil3d/UnrealCookBook](https://github.com/neil3d/UnrealCookBook)

## 动态改变材质的颜色等参数

项目常见需求之一就是在运行时，根据游戏逻辑或者其他奇葩需求动态改变对象的外观，其中一些需要动态改变材质的某些参数，例如颜色值，贴图等。这个例子请下载完整项目，打开项目后，启动“DynamicMaterialInstance/DynamicMaterial.umap”地图文件即可运行。

在虚幻4引擎中完成这个非常简便，主要分为三步：

### 创建包含材质参数的Material


![mtl_d1](/assets/img/ucookbook/mtl_d1.jpg)

如上图所示，我创建了一个非常简单的材质，其中包含“MColor”这样一个vector3的参数。

### 创建Dynamic Material Instance

接下来就要创建Dynamic Material Instance对象，一般可以在对象的Construction Script中完成，如下图所示，我们创建了一个Dynamic Material Instance Object，并把它保存到了“MyMaterial”变量中：

![mtl_d2](/assets/img/ucookbook/mtl_d2.jpg)

### 在运行时修改材质参数

接下来我们就可以调用Dynamic Material Instance的接口，来动态修改材质的参数，主要是下面三个：

![mtl_d3](/assets/img/ucookbook/mtl_d3.jpg)


在下面这个例子中，在按下键盘数字键1的时候，动态修改了前面那个材质的“MColor”参数：

![mtl_d4](/assets/img/ucookbook/mtl_d4.jpg)

