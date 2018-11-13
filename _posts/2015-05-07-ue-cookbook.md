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
----------

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

## Unreal C++ 创建对象的的几种姿势  
----------

这个DEMO演示了在C++代码中，创建UE4的常见类型的对象，包括Actor，ActorComponent，加载资源等。打开项目后，启动“CreateObjectDemo/CreateObjectDemoMap.umap”地图文件即可运行。

### 创建组件

在UE4中，为Actor创建组件，可以使用UObject::CreateDefaultSubobject()模板函数，这个函数只能在构造函数中调用。如下所示：

``` cpp
	/* <CreateObjectDemo>
	 * 创建Component对象，要使用CreateDefaultSubobject模板函数
	 */
	MyComponent = CreateDefaultSubobject<UMyActorComponent>(TEXT("MyComponent"));
```

### 加载资源对象

在UE4中，项目中的所有资源文件，不要看做是文件，而要理解为“静态对象”：也就是对象序列化的产物。加载项目资源可以使用“UObject::StaticLoadObject()”函数，其中重要的参数为对象的Name，而不是文件路径。UE底层提供文件读取功能，无论资源文件是存储我独立的.uasset文件，还是存储到.PAK文件中，对于上层都不需要关心。

``` cpp
	/* <CreateObjectDemo>
	 * 加载模型、贴图等对象，使用StaticLoadObject函数
	 */
	UStaticMesh* SM_Vase = Cast<UStaticMesh>(StaticLoadObject(UStaticMesh::StaticClass(),
		NULL,
		TEXT("/Game/Assets/StaticMeshes/SM_Vase"))
		);

	StaticMeshComponent = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("StaticMeshComponent"));
	StaticMeshComponent->SetStaticMesh(SM_Vase);
```

### 创建Actor对象

创建Actor对象，需要使用UWorld::SpawnActor()接口，如下所示：

``` cpp
	/* <CreateObjectDemo>
	 * 创建AActor派生类对象不要用NewObject或者new，而要用UWorld::SpawnActor()
	 */
	UWorld* World = GetWorld();
	FVector pos(150, 0, 20);

	AMyActor* MyActor = World->SpawnActor<AMyActor>(pos, FRotator::ZeroRotator);
```

### 创建UObject对象

如果你有UObject的派生类（非Actor、非ActorComponent），那你可以使用NewObject()模板函数来创建其实例对象。

``` cpp
	/* <CreateObjectDemo>
	 * 使用NewObject模板函数，来创建UObject派生类对象
	*/
	MyObject = NewObject<UMyObject>();
```

## 神奇的Spline Mesh  
----------

### 啥是Spline Mesh

虚幻4引擎和Unity3D一个主要的不同就是：虚幻4引擎提供了非常非常多的各种功能。这是因为EPIC也开发游戏，而且是很成功的大作。他们会把游戏项目中一些验证过、可被其他开发者重用的功能整合到引擎层。所以虚幻4引擎要学习的东西非常多，但是如果你掌握的越多，做起项目来很可能就约轻松。：）

本文就介绍虚幻4引擎中的一个很好玩的组件：Spline和Spline Mesh。Spline就是一个曲线，你可以在编辑器中添加控制点，移动控制点，设置控制点的切线等；而Spline Mesh把一个Static Mesh绑定到指定的Spline曲线上，**并且根据曲线对Mesh进行扭曲变形**。这个功能，可以用来快速制作赛车的车道、河流，管道，绳子/链子等，如下图所示。

![Spline Mesh Demo](/assets/img/ucookbook/spline1.jpg)

上述Demo中的黄色管道是由Spline Mesh Component动态组建的，而初始的素材只是下面这一节管子。

![Static Mesh Pipe](/assets/img/ucookbook/spline2.jpg)

打开此项目之后，请见“SplineMeshDemo”目录。

### 功能实现详解

上述这个神奇的功能通过一个简单的Blueprint实现。  

首先，我们需要创建一个基类为Actor的Blueprint类，然后添加一个Spline组件。这个组件用来在编辑器中编辑曲线。  

然后，我们在Construction Script中，检测这个Spline有几段，为每一段动态添加一个SplineMesh组件。如下面的Blueprint所示。新添加的Spline Mesh需要Attach到父节点，并且受到指定其起点、终点、切线等信息。  

![Splie Pipe Demo BP](/assets/img/ucookbook/spline3.jpg)