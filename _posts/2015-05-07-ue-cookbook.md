---
layout: post
title: "Unreal Cook Book"
author: "房燕良"
column: "Unreal Engine"
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

## 数据驱动  
----------

DEMO运行：Content/DataDemo/DataDemoMap  

在游戏开发中经常要用到数据驱动，俗称“策划拉表”。在虚幻4引擎中，有多种方式处理数据，在这里我就介绍最常用的两种。

### 虚幻4内建的表格导入机制

假设策划同学有以下这样一个数据表，用来存储道具相关的信息：

|	Name | Damage | Price | Desc
|--------|:--------|:--------|:--------|:
|	Shanker	| 707  | 6395 | Warmongering Gladiator's Shanker
|	Ripper	| 814  | 6400 |	Tournament Gladiator's Ripper
|	Chopper	| 407  | 3976 |	Warmongering Combatant's Chopper

想要导入这个数据表的话，首先需要定义一个与这个表结构相对应的数据结构。如果使用C++编程的话，需要创建一个FTableRowBase的派生类；使用Blueprint的话，就创建一个标准的结构体就可以了。下图就是我为这个表格创建的Blueprint Struct。

![ItemDef](/assets/img/ucookbook/data1.jpg)

然后，上述表格需要存成CSV格式。然后，你就可以把这个CSV文件拖放到引擎的Content Browser中了。在数据导入的设置中，把数据类型设置成我们这个结构体：ItemDef。

![Import CSV](/assets/img/ucookbook/data2.jpg)

最后，我们就可以使用GetDataTableRowNames和GetDataTableRow这两个蓝图节点来读取这个表格数据了。具体的蓝图如下：

![BP_DataDriven](/assets/img/ucookbook/data3.jpg)

如果看不清图片的话，请下载工程文件吧。：）

### 虚幻4的DataAsset

另外一个常见的需求是我们需要在引擎编辑器中编辑一些常用的数据对象，这些数据并不需要批量配置，但需要方便灵活的修改。在Unity3D中提供了ScriptObject来做这类事请，而在虚幻4中提供了DataAsset，也是同样的目的，使用方法也十分类似。
首先我们需要创建一个UDataAsset的派生类，用这个类来管理一组数据：

```cpp
/**
 * 演示使用DataAsset来处理数据
 */
UCLASS(Blueprintable, Category="DataDemo")
class UNREALCOOKBOOK_API UQuestDataAsset : public UDataAsset
{
	GENERATED_BODY()
public:
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "DataDemo")
	FString QuestSetName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "DataDemo")
	TArray<FQuestDef> QuestArray;
};
```

有了这个类之后，在Content Browser的New Asset菜单-->杂项里面选择“DataAsset”，就会弹出下面这个窗口，窗口中就多出了我们这个类：

![New Data Ssset](/assets/img/ucookbook/data4.jpg)

-  创建了这个DataAsset之后，就可以用引擎内置的编辑器来编辑它：
![Edit Data Asset](/assets/img/ucookbook/data5.jpg) 
 
-  编辑好之后，我们就可以在Blueprint中使用LoadAsset节点来加载它：
![Load Data Asset](/assets/img/ucookbook/data6.jpg)
 

> 相关官方文档：https://docs.unrealengine.com/latest/INT/Gameplay/DataDriven

## VR应用中的焦点目标拾取  
---------

在目前的VR应用中，特别是Cardboard类游戏中，经常用到的一个功能就是“检测玩家视线焦点对准的物体”。在虚幻4中，我们可以使用Line Trace来非常方便的实现这一功能。


### DEMO源代码

打开项目后，启动“FocusActor/FocusActorMap.umap”地图文件即可运行。在这个DEMO中，当玩家视线对准杯子或者花瓶的时候，对象顶部会出现一个文字。

![VR Demo](/assets/img/ucookbook/vr1.jpeg)

### 功能实现

在上述DEMO中，我使用“/Game/FocusActor/Blueprints/BP_FocusActor_Player”来实现视线检测的功能。


首先在Tick的时候进行LineTrace：

![BP Focus](/assets/img/ucookbook/vr2.jpeg)

在Line Trace到可交互的物体后，使用一个OnFocusActor自定义事件，来处理焦点对象变化的逻辑：

![LineTrace](/assets/img/ucookbook/vr3.jpeg)

上图代码的基本流程是：先调用老的FocusActor的LostFocus事件；再调用新的FocusActor的OnFocus事件。


---------
