---
layout: post
title: "深入Unreal蓝图开发：理解蓝图技术架构"
author: "燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, blueprint]
image:
  path: ucookbook
  feature: cover3.jpg
brief: "这篇博客主要是深入理解蓝图整个流程的的底层机制，包括节点编辑、编译、字节码解释执行。理解了这些，对前面几篇所讲的蓝图扩展，可以有一个更清晰的认识"
---

通过前面几篇博客谈了几种常用的蓝图节点的扩展方式，其中也对蓝图的底层机制进行了部分的解析，但是还不够整体。这篇文章谈一下目前我对蓝图技术架构的整体性的理解，包括蓝图从编辑到运行时到整个过程。

### 蓝图的发展历程

蓝图是一个突破性的创新，它能够让游戏设计师亲手创造自己想要的“游戏体验”。使用可视化编程的方式，可以大大的加速那种“以体验为核心”的游戏开发的迭代速度，这是一次大胆的尝试，无疑也是一次成功的尝试！（蓝图对于国内流行的那种“以数值成长为核心，以挖坑为目的”的游戏开发，可能没有那么大的意义）

就像很多其他的创新一样，它也是有一个渐进的过程的。它的萌芽就是Unreal Engine 3时代的Kismet。在Unreal Engine 3中，Unreal Script还是主要开发语言，但是可以使用Kismet为关卡添加可视化的事件处理脚本，类似于今天的Level Blueprint。

![Kismet Attach Event](/assets/img/ucookbook/bp_in_depth/kismet_attach_event.jpg)

> Unreal Engine 3 官方文档：[Kismet Visual Scripting](https://docs.unrealengine.com/udk/Three/KismetHome.html)

Blueprint这个名字很可能是UE4开发了一大半之后才定的。这就是为啥UE4源码里面那么多蓝图相关的模块都以Kismet命名，连蓝图节点的基类也是class UK2Node啦，又有少量模块用的是Blueprint这个名字，其实指代的都是同一系统。

![Kismet in UE4](/assets/img/ucookbook/bp_in_depth/kisment_in_ue4.png)

### 以实例理解蓝图的整个机制

这篇博客的目的是把蓝图的整个体系结构完整的梳理一遍，但是如果只是将框架图之类的，一来太抽象，二来和实际代码结合不够，所以我打算以“案例分析”的方式，从一个最简单的蓝图入手，讲解每一步的实际机制是怎样的。

这个案例很简单
* 新建一个从Actor派生的蓝图
* 在它的Event Graph中，编辑BeginPlay事件，调用PrintString，显示一个Hello World！

![Blueprint Case Study](/assets/img/ucookbook/bp_in_depth/case_study.png)

#### 新建蓝图：BP_HelloWorld

![New Blueprint](/assets/img/ucookbook/bp_in_depth/new_bp.gif)

#### 双击打开BP_HelloWorld

![Open Blueprint](/assets/img/ucookbook/bp_in_depth/open_bp.gif)

#### 添加节点：PrintString

![Add Node](/assets/img/ucookbook/bp_in_depth/add_node.gif)

#### 点击[Compile]按钮：编译蓝图

![Compile Blueprint](/assets/img/ucookbook/bp_in_depth/compile_bp.gif)


#### 点击[Save]按钮：保存蓝图

![Save Blueprint](/assets/img/ucookbook/bp_in_depth/save_bp.gif)


#### 把BP_HelloWorld拖放到关卡中

![Instance Blueprint](/assets/img/ucookbook/bp_in_depth/instance_bp.gif)


#### 点击[Play]按钮：运行蓝图

![Run Blueprint](/assets/img/ucookbook/bp_in_depth/run_bp.gif)


### Case Study：解析BeginPlay事件

### 小结一下

在本系列前面几篇博客，我们已经掌握了常用的蓝图扩展的编程方式，但是整个感觉讲的还不是很通透。特别是[使用NodeHandler实现蓝图节点](/unreal/bp_node_handler.html)的过程，实际上是扩展了蓝图的编译过程。如果对蓝图的整体机制没有一个很好的理解，就难说彻底掌握了蓝图的深入开发技术。这篇博客就来弥补这个不足，我将从蓝图的编辑、编译、字节码解释执行这整个过程来带你加深对Unreal蓝图技术的理解！

> 前方高能：这不是一篇看实例代码，讲解操作过程的博客。要回答上面的问题，就必须理解蓝图编辑、编译以及字节码解释执行的过程，所以请做好思想准备。

蓝图，Blueprint，我们大多数时候都是从一个很高层的概念的角度来说这个词：**它是一种可视化脚本，可以用Graph的方式来组织“表达式”节点，并控制执行流程，来实现游戏逻辑的开发**。

如果作为一个Gameplay层面的开发者，这样理解也就够了；但是，如果作为一个引擎层的开发者，想要深度扩展蓝图，那我们就要下沉到代码的层面来理解整个蓝图系统了！

蓝图是一个满复杂的系统，我也不能说对它的理解有多面全面和深入，只能说把自己开发中所理解到的一些东西来谈一下。对于这个复杂度很高的系统，我还是使用“复杂度分解”的老办法，把它拆分成编辑，编译，解释执行这三大模块，具体看看它的内部机制。

### 蓝图的编辑过程

让我们从头开始：从编辑流程来说，**蓝图是一种资源（Asset），它的资源属性主要是通过class UBlueprint这个类实现的**（当然，蓝图还是别的东西，后面会谈到）。`class UBlueprint`是一个UObject的派生类。理论上任何UObject都可以作为一个Asset Object，它的创建、存储、对象引用关系等都遵循Unreal Editor的资源管理机制：  
* 当我们在编辑器中新建一个蓝图的时候，Unreal Editor会调用`UBlueprintFactory::FactoryCreateNew()`来创建一个新的`UBlueprint`对象；
* 当我们在Content Browser中双击一个已有的蓝图时，Unreal Editor会调用`FAssetTypeActions_Blueprint::OpenAssetEditor()`来加载这个UBlueprint对象，并生成、初始化一个`IBlueprintEditor`实例，也就是我们天天在用的蓝图编辑器。

>【相关引擎源码】
> 1. class UBlueprint： Source/Runtime/Engine/Classes/Engine/Blueprint.h
> 1. class UBlueprintFactory：Source/Editor/UnrealEd/Classes/Factories/BlueprintFactory.h
> 1. class FAssetTypeActions_Blueprint：Source/Developer/AssetTools/Public/AssetTypeActions/AssetTypeActions_Blueprint.h

当一个打包好的游戏运行的时候，引擎通过UObject通用的加载机制来加载UBlueprint对象实例（会去除掉WITH_EDITOR宏所包含的部分）。


然后，我们顺着class UBlueprint这根藤摸下去：**对于蓝图编辑器来说，蓝图是一个Graph；class UBlueprint的WITH_EDITOR部分的代码的核心是管理一系列的UEdGraph对象**。

我们在蓝图编辑器里面的每放入一个蓝图节点，就会对应的生成一个`class UEdGraphNode`的派生类对象，例如[本系列的中篇](/unreal/bp_dynamic_pin.html)里面自己所实现的：`class UBPNode_SaySomething : public UK2Node`（你猜对了：`UK2Node`是从`UEdGraphNode`派生的）。`UEdGraphNode`会管理多个“针脚”，也就是`class UEdGraphPin`对象。编辑蓝图的过程，主要就是就是创建这些对象，并连接/断开这些针脚对象等。引擎中有一批核心的`class UK2Node`的派生类，也就是引擎默认提供的那些蓝图节点，具体见下图：

![Blueprint Node classes](/assets/img/ucookbook/custom_node/bp_in_depth_10.png){: .center-image }

> 【相关引擎源码】
> 1. UEdGraph相关代码目录：Source/Runtime/Engine/Classes/EdGraph
> 1. 引擎提供的蓝图节点相关代码目录：Source/Editor/BlueprintGraph/Class


### 蓝图的编译过程


上面说的这个EdGraph的对象，主要是用来可视化编辑，蓝图要执行的话，就**需要把这个EdGraph对象编译成字节码，编译的结果就是一个UBlueprintGeneratedClass对象**，这个编译出来的对象保存在UBlueprint的父类中：`UBlueprintCore::GeneratedClass`。那么，下面我们将进入深水区啦，来看看蓝图的编译过程吧！

- TODO：蓝图编译过程

我们接着往下走：对于引擎的Runtime来说，**蓝图也可以说就是一个UBlueprintGeneratedClass对象**。要理解这个UBlueprintGeneratedClass对象，就必须对它的基类UClass有一个很好的理解。

- TODO：What is UBlueprintGeneratedClass

ew
修改工程里面的：DefaultEngine.ini，增加一下两行：
[Kismet]
CompileDisplaysBinaryBackend=true
就可以在OutputLog窗口里看到编译出的字节码，来验证我们上述猜想。


### 蓝图字节码的解释执行

首先我们看一下蓝图的字节码长什么样子吧。 在*CoreUObject/Public/UObject/Script.h*这个文件中有一个“enum EExprToken”，这个枚举就是蓝图的字节码定义。如果学过汇编语言或者.Net CLR IL的话，对这些东西并不会陌生：

```cpp
//
// Evaluatable expression item types.
//
enum EExprToken
{
  ...
  EX_Return = 0x04,	// Return from function.
  EX_Jump = 0x06,	// Goto a local address in code.
  EX_JumpIfNot  = 0x07,	// Goto if not expression.
  EX_Let  = 0x0F,	// Assign an arbitrary size value to a variable.

  EX_LocalVirtualFunction = 0x45, // Special instructions to quickly call a virtual function that we know is going to run only locally
  EX_LocalFinalFunction = 0x46, // Special instructions to quickly call a final function that we know is going to run only locally
  ...
};
```

这些字节码又是怎样被解释执行的呢？这部分功能完全是由UObject这个巨大的基类来完成的，并没有一个单独的Blueprint VM之类的模块。这个不必吐槽，这是Unreal的传统，从Unreal第一代的Unreal Script就是这样的。引擎中使用一个全局查找表，把上述字节码映射到函数指针。在运行时，从一个字节码数组中逐个取出字节码，并查找函数指针，进行调用，也就完成了所谓的“字节码解释执行”的过程。

具体的说，引擎定义了一个全局变量：“FNativeFuncPtr GNatives[EX_Max]”，它保存了一个“字节码到FNativeFuncPtr”的查找表。在引擎中通过“DEFINE_FUNCTION”、“IMPLEMENT_VM_FUNCTION”来定义蓝图字节码对应的C++函数，并注册到这个全局映射表中，例如字节码“EX_Jump”对应的函数：

```cpp
DEFINE_FUNCTION(UObject::execJump)
{
	CHECK_RUNAWAY;

	// Jump immediate.
	CodeSkipSizeType Offset = Stack.ReadCodeSkipCount();
	Stack.Code = &Stack.Node->Script[Offset];
}
IMPLEMENT_VM_FUNCTION( EX_Jump, execJump );
```

字节码解释执行的过程在“ProcessLocalScriptFunction()”函数中。它使用一个循环`	while (*Stack.Code != EX_Return)`从当前的栈上取出每个字节码，也就是UFunction对象中的那个“TArray<uint8> Script”成员中的每个元素，解释字节码的代码十分直观：

```cpp
void FFrame::Step(UObject* Context, RESULT_DECL)
{
	int32 B = *Code++;
	(GNatives[B])(Context,*this,RESULT_PARAM);
}
```

> 【相关引擎源码】
> 1. CoreUObject/Public/UObject/Script.h
> 1. CoreUObject/Private/Uobject/ScriptCore.h

### Case Study: BeginPlay

下面我们通过一个最简单的例子，来看看上述3个步骤具体是怎样处理的。我们拉一个最简单的蓝图，从Actor派生，命名为：BP_MyActor，只加一点简单的功能：

![Blueprint Sample](/assets/img/ucookbook/custom_node/bp_in_depth_20.png){: .center-image }

好，我们从头说起：蓝图编辑器中的BeginPlay()对应的并不是AActor::BeginPlay()，而是AActor::ReceiveBeginPlay()这个事件，我们看一下它的声明：

```cpp
/** Event when play begins for this actor. */
UFUNCTION(BlueprintImplementableEvent, meta=(DisplayName = "BeginPlay"))
void ReceiveBeginPlay();
```

从这个声明可以看出：
1. `DisplayName = "BeginPlay"`，它只是看上去叫做“BeginPlay”，但是和AActor::BeginPlay()函数是两个东西。AActor::BeginPlay()是C++的实现，并在里面调用了ReceiveBeginPlay()；
1. ReceiveBeginPlay()是一个“用蓝图实现的事件”，这种函数我们不需要使用C++写它的函数体。它的函数体由UBT生成。生成的代码如下：

```cpp
static FName NAME_AActor_ReceiveBeginPlay = FName(TEXT("ReceiveBeginPlay"));
void AActor::ReceiveBeginPlay()
{
	ProcessEvent(FindFunctionChecked(NAME_AActor_ReceiveBeginPlay),NULL);
}
```

这段自动生成的代码实际上是做了两件事：
1. 找到名为“ReceiveBeginPlay”的UFunction对象；
1. 执行“ProcessEvent”函数。

我们先来看一下这个“FindFunctionChecked()”操作，它的调用过程如下：
* UObject::FindFunctionChecked()，this==BP_MyActor对象实例
  * UObject::FindFunction()，其实现为：`GetClass()->FindFunctionByName(InName)`
    * UClass::FindFunctionByName()，this==BP_MyActor的UClass对象实例；在这个例子中，this的类型为UClass的子类：UBlueprintGeneratedClass；
    * 上述函数就返回了“ReceiveBeginPlay”对应的一个UFunction对象指针；

在这个例子中，返回的UFunction对象，对应的就是一个“Kismet callable function”（代码注释里的说法），或者是说“蓝图函数”，其字节码就定义在在它的父类UStruct上：`	TArray<uint8> UStruct::Script`。也就是上图，我们在蓝图编辑器中拉的那个Graph。

接下来，这个UFunction对象作为参数，调用了“AActor::ProcessEvent()”函数，这个函数是父类：UObject::ProcessEvent()的一个简单封装，后者就是字节码解释执行的重点部分了！在我们这个例子中，这个函数做了以下几件核心的事情：
1. 创建了一个 FFrame 对象，这个对象就是执行这个UFunction所需要的的“栈”对象，他内部保存了一个“uint8* Code”指针，相当于汇编语言的PC，指向当前需要的字节码；
2. 调用这个UFunction::Invoke()，this就是刚才找到的那个代表“ReceiveBeginPlay”的UFunction对象；
3. 调用“ProcessLocalScriptFunction()”函数，解释执行字节码。




最终，通过解释执行每一个Code，找到“Print String”对应的UFunction对象，并执行它，也就完成了这个蓝图的执行。



### 小结一下

OK，罗里吧嗦说了这么多，下面让我们用简练的语言**概述一下上面的内容**：  
1. 蓝图首先作为一种引擎的Asset对象，可以被Unreal Editor的Asset机制所管理，并且可以被Blueprint Editor来编辑；
1. 在Blueprint Editor中，蓝图以一种UEdGraph派生类（TODO）对象的方式被Graph Editor来编辑；
1. 蓝图通过编译过程，生成一个UClass的派生类对象，即UBlueprintGeneratedClass对象实例；这个实例对象就像C++的UObject派生类对应的UClass那样，拥有UProperty和UFunction；
1. 与C++生成的UClass不同的是，这些UFunction可能会使用蓝图字节码；
1. 在运行时，并不存在一个单独的“蓝图虚拟机”模块，蓝图字节码的解释执行完全是有UObject这个巨大的基类来完成的；
1. 每个字节码对应一个Native函数指针，通过GNatives[ByteCode]查找、调用；
1. UObject通过解释执行蓝图脚本字节码，调用相应的C++实现的Thunk函数来完成具体的操作；

### 参考资料

* [官方文档：Blueprint Compiler Overview](https://docs.unrealengine.com/en-US/Engine/Blueprints/TechnicalGuide/Compiler/index.html)
