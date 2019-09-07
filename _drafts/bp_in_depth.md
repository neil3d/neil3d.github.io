---
layout: post
title: "深入Unreal蓝图开发：自定义蓝图节点(下)"
author: "燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, blueprint]
image:
  path: ucookbook
  feature: cover3.jpg
brief: "除了ExpandNode，还有另外一种重要的蓝图扩展方式，就是Node Handler。"
---

通过前面的文章，我们已经能够创建自己的蓝图节点，并可以动态添加、删除Pins，但是感觉好像有什么地方不太对劲啊。你发现没有？前面两篇博客中，我们自定义的蓝图节点都是通过`UK2Node::ExpandNode()`来实现节点的具体功能，然而，这个函数只不过是在内部创建了一些其他的节点，然后把自己的Pins重新连接到新建的节点的Pin之上，本质上这个过程手动连线也可以做啊！  

如果，我们需要做一个全新的蓝图功能节点，无法用现有节点组合完成呢？那要怎么办呢？要想搞明白这个问题，我们就需要加深对蓝图底层的的理解啦！

> 前方高能：这不是一篇看实例代码，讲解操作过程的博客。要回答上面的问题，就必须理解蓝图虚拟机、蓝图编译过程，所以请做好思想准备。


### 重新理解蓝图

蓝图，Blueprint，我们大多数时候都是从一个很高层的概念的角度来说这个词：**它是一种可视化脚本，可以用Graph的方式来组织“表达式”节点，并控制执行流程，来实现游戏逻辑的开发**。

如果作为一个Gameplay层面的开发者，这样理解也就够了；但是，如果作为一个引擎层的开发者，想要深度扩展蓝图，那我们就要下沉到代码的层面来理解整个蓝图系统了！

蓝图是一个蛮复杂的系统，我也不能说对它的理解有多面全面和深入，只能说把自己开发中所理解到的一些东西来谈一下。对于这个复杂度很高的系统，我还是使用“复杂度分解”的老办法，把它拆分成几个部分，具体看看它的内部机制。


首先我们从最容易理解的部分入手：从编辑流程来说，**蓝图是一种资源（Asset），它的资源属性主要是通过class UBlueprint这个类实现的**（当然，蓝图还是别的东西，后面会谈到）。`class UBlueprint`是一个UObject的派生类。理论上任何UObject都可以作为一个Asset Object，它的创建、存储、对象引用关系等都遵循Unreal Editor的资源管理机制：  
* 当我们在编辑器中新建一个蓝图的时候，Unreal Editor会调用`UBlueprintFactory::FactoryCreateNew()`来创建一个新的`UBlueprint`对象；
* 当我们在Content Browser中双击一个已有的蓝图时，Unreal Editor会调用`FAssetTypeActions_Blueprint::OpenAssetEditor()`来加载这个UBlueprint对象，并生成、初始化一个`IBlueprintEditor`实例，也就是我们天天在用的蓝图编辑器。

【相关引擎源码】
1. class UBlueprint： Source/Runtime/Engine/Classes/Engine/Blueprint.h
1. class UBlueprintFactory：Source/Editor/UnrealEd/Classes/Factories/BlueprintFactory.h
1. class FAssetTypeActions_Blueprint：Source/Developer/AssetTools/Public/AssetTypeActions/AssetTypeActions_Blueprint.h

当一个打包好的游戏运行的时候，引擎通过UObject通用的加载机制来加载UBlueprint对象实例。发布版本的话，会去除掉WITH_EDITOR宏所包含的部分。


然后，我们顺着class UBlueprint这根藤摸下去：**对于蓝图编辑器来说，蓝图是一个Graph；class UBlueprint的WITH_EDITOR部分的代码的核心是管理一系列的UEdGraph对象**。

我们在蓝图编辑器里面的每放入一个蓝图节点，就会对应的生成一个`UEdGraphNode`的派生类对象，例如[本系列的中篇](/unreal/bp_dynamic_pin.html)里面自己所实现的：`class UBPNode_SaySomething : public UK2Node`（你猜对了：`UK2Node`是从`UEdGraphNode`派生的）。`UEdGraphNode`会管理多个“针脚”，也就是`class UEdGraphPin`对象。编辑蓝图的过程，主要就是就是创建这些对象，并连接/断开这些针脚对象等。引擎中有一批核心的`UK2Node`的派生类，也就是引擎默认提供的那些蓝图节点，具体见下图：

![Blueprint Node classes](/assets/img/ucookbook/custom_node/bp_in_depth_10.png)

【相关引擎源码】
1. UEdGraph相关代码目录：Source/Runtime/Engine/Classes/EdGraph
1. 引擎提供的蓝图节点相关代码目录：Source/Editor/BlueprintGraph/Class


上面说的这个EdGraph的对象，主要是用来可视化编辑，蓝图要执行的话，就**需要把这个EdGraph对象编译成字节码，编译的结果就是一个UBlueprintGeneratedClass对象**，这个编译出来的对象保存在UBlueprint的父类中：`UBlueprintCore::GeneratedClass`。那么，下面我们将进入深水区啦，来看看蓝图的编译过程吧！

- TODO：蓝图编译过程

我们接着往下走：对于引擎的Runtime来说，**蓝图也可以说就是一个UBlueprintGeneratedClass对象**。要理解这个UBlueprintGeneratedClass对象，就必须对它的基类UClass有一个很好的理解。

- TODO：What is UBlueprintGeneratedClass


编译之后，蓝图字节码的解释执行了，这部分功能完全是由UObject这个基类来完成的。这个不必吐槽，这是Unreal的传统，从Unreal第一代的Unreal Script运行时就是这样的。

【相关引擎源码】
1. CoreUObject/Public/UObject/Script.h
1. CoreUObject/Private/Uobject/ScriptCore.h

我们先通过一个最简单的例子，来看看具体的执行过程。我们拉一个最简单的蓝图，从Actor派生，命名为：BP_MyActor，只加一点简单的功能：

![Blueprint Sample](/assets/img/ucookbook/custom_node/bp_in_depth_20.png)

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

接下来，这个UFunction对象作为参数，调用了“AActor::ProcessEvent()”函数，这个函数是父类：UObject::ProcessEvent()的几个简单封装，后者就是字节码解释执行的重点部分了！在我们这个例子中，这个函数做了以下几件核心的事情：
1. 创建了一个 FFrame 对象，这个对象就是执行这个UFunction所需要的的“栈”对象，他内部保存了一个“uint8* Code”指针，相当于汇编语言的PC，指向当前需要的字节码；
2. 调用这个UFunction::Invoke()，this就是刚才找到的那个代表“ReceiveBeginPlay”的UFunction对象；
3. 调用“ProcessLocalScriptFunction()”函数，解释执行字节码。

**那么蓝图的字节码又是怎样被解释执行的呢？** 在CoreUObject/Public/UObject/Script.h这个文件中有一个“enum EExprToken”，这个枚举就是蓝图的字节码定义。如果学过汇编语言或者.Net CLR IL的话，对这些东西并不会陌生：
```cpp
//
// Evaluatable expression item types.
//
enum EExprToken
{
	EX_Return				= 0x04,	// Return from function.
	EX_Jump					= 0x06,	// Goto a local address in code.
	EX_JumpIfNot			= 0x07,	// Goto if not expression.
  EX_Let					= 0x0F,	// Assign an arbitrary size value to a variable.

  EX_LocalVirtualFunction	= 0x45, // Special instructions to quickly call a virtual function that we know is going to run only locally
	EX_LocalFinalFunction	= 0x46, // Special instructions to quickly call a final function that we know is going to run only locally
};
```

在“ProcessLocalScriptFunction()”函数中，使用一个循环“	while (*Stack.Code != EX_Return)”从当前的栈上取出每个字节码，也就是是UFunction对象中的那个“TArray<uint8> Script”成员中的每个元素，解释字节码的代码是否直观：

```cpp
void FFrame::Step(UObject* Context, RESULT_DECL)
{
	int32 B = *Code++;
	(GNatives[B])(Context,*this,RESULT_PARAM);
}
```

引擎定义了一个全局变量：“FNativeFuncPtr GNatives[EX_Max]”，它保存了一个“字节码到Native Func Ptr”的映射，在引擎中通过“DEFINE_FUNCTION”、“IMPLEMENT_VM_FUNCTION”来定义蓝图字节码对应的C++函数，并注册到这个全局映射表中，例如本例中核心的操作是EX_LocalFinalFunction：

```cpp
DEFINE_FUNCTION(UObject::execLocalFinalFunction)
{
	// Call the final function.
	ProcessLocalFunction(Context, (UFunction*)Stack.ReadObject(), Stack, RESULT_PARAM);
}
IMPLEMENT_VM_FUNCTION( EX_LocalFinalFunction, execLocalFinalFunction );
```

最终，通过解释执行每一个Code，找到“Print String”对应的UFunction对象，并执行它，也就完成了这个蓝图的执行。

OK，罗里吧嗦说了这么多，下面让我们用简练的语言**概述一下上面的内容**：  
1. 蓝图首先作为一种引擎的Asset对象，可以被Unreal Editor的Asset机制所管理，并且可以被Blueprint Editor来编辑；
1. 在Blueprint Editor中，蓝图以一种UEdGraph派生类对象的方式，被Graph Editor来编辑；
1. 蓝图通过编译过程，生成UBlueprintGeneratedClass实例对象；这个实例对象就像C++的UObject派生类对应的UClass那样，拥有UProperty和UFunction；
1. 与C++生成的UClass不同的是，这些UFunction可能会使用蓝图字节码；
1. 在运行时，并不存在一个单独的“蓝图虚拟机”模块，蓝图字节码的解释执行完全是有UObject这个巨大的基类来完成的；
1. UObject通过解释执行蓝图脚本字节码，调用相应的C++实现的Thunknk函数来完成具体的操作；

### 通过Node Handler来扩展蓝图


### 参考资料

* [官方文档：Blueprint Compiler Overview](https://docs.unrealengine.com/en-US/Engine/Blueprints/TechnicalGuide/Compiler/index.html)
