---
layout: post
title: "深入Unreal蓝图开发：自定义蓝图节点(上)"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, blueprint]
image:
  path: unreal
  feature: unreal4_cover.jpg
brief: "通过派生class UK2Node，为蓝图添加自定义节点；这篇博客我们先实现一个最简单的自定义节点，下篇文章将完成“动态添加输入Pin”的蓝图节点。"
---

在[前面一篇文章](/unreal/blueprint-wildcard.html)中介绍了扩展蓝图的几种方法，其中最灵活的就是自定义K2Node了，也就是通过定义一个class UK2Node的派生类来给蓝图添加新的节点。这种方法开发起来一起是最麻烦的，一般只有在需要“动态增加Pin”的时候才使用这种方式。

下面我们就一步一步的来实现一个最简单的“Hello World蓝图节点”，通过这个节点我们来看看扩展K2Node的关键步骤。在后面一篇博客再去实现“动态增加输入项”的节点

## 项目创建

我们创建一个C++: Basic Code工程，然后，手动添加一个Editor模块，如下图所示：  
![new editor module](/assets/img/ucookbook/custom_node/new_module.png)

手动添加这个模块的操作如下：
1. 修改 .uproject 文件，在Modules字段，添加新的项目，命名为：MyBlueprintNodeEditor，Type设置为：Editor；
2. 在Source目录下建立一个子目录，命名为: MyBlueprintNodeEditor，这个子目录就是保存这个模块的所有源文件了；
3. 在这个子目录下创建一个：MyBlueprintNodeEditor.Build.cs，用来实现UBT对这个模块的build的配置；并把“BlueprintGraph”模块添加的PrivateDependencyModuleNames中；
4. 在“MyBlueprintNodeEditor.Target.cs”文件中添加这个模块：
  ``` CSharp
  ExtraModuleNames.AddRange( new string[] {
            "MyBlueprintNode",
            "MyBlueprintNodeEditor"
        } );
  ```

为什么要添加一个Editor模块呢？因为class UK2Node这个类属于一个名为“BlueprintGraph”的Editor模块，而蓝图的Graph编辑，Compile之后生成一个class UBlueprintGeneratedClass的实例，而UK2Node这些对象的实例在Runtime是不需要的。

## 创建新的节点类型

首先，我们来创建一个class UK2Node的派生类，命名为：class UBPNode_SayHello
```cpp
UCLASS()
class MYBLUEPRINTNODEEDITOR_API UBPNode_SayHello : public UK2Node
{
	GENERATED_BODY()
	
};
```

有了这个类之后，在Blueprint编辑器里面还不能创建它。我们需要把这个节点的创建操作添加到右键菜单中，并且稍微美化一下这个节点的显示，通过以下几个函数来完成。
```cpp
UCLASS()
class MYBLUEPRINTNODEEDITOR_API UBPNode_SayHello : public UK2Node
{
	GENERATED_BODY()

public:
	// UEdGraphNode interface
	virtual FText GetTooltipText() const override { return FText::FromString(TEXT("a hello world node")); }
	virtual FText GetNodeTitle(ENodeTitleType::Type TitleType) const override { return FText::FromString(TEXT("Say Hello World")); }
	// End of UEdGraphNode interface

	// UK2Node interface
	virtual FText GetMenuCategory() const { return FText::FromString(TEXT("MyBlueprintNodes")); }
	virtual void GetMenuActions(FBlueprintActionDatabaseRegistrar& ActionRegistrar) const override;
	// End of UK2Node interface
};
```
这几个函数的名字已经足够说明它们的作用了，其中最重要的就是“GetMenuActions()”这个了，它的实现代码如下：
```cpp
void UBPNode_SayHello::GetMenuActions(FBlueprintActionDatabaseRegistrar& ActionRegistrar) const
{
	UClass* ActionKey = GetClass();

	if (ActionRegistrar.IsOpenForRegistration(ActionKey))
	{
		UBlueprintNodeSpawner* NodeSpawner = UBlueprintNodeSpawner::Create(GetClass());
		check(NodeSpawner != nullptr);

		ActionRegistrar.AddBlueprintAction(ActionKey, NodeSpawner);
	}
}
```
以上简单代码之后，我们就可以通过右键菜单创建一个空的节点了，如下图所示：  
![hello node creation](/assets/img/ucookbook/custom_node/hello_node_1.png)

## 实现节点连接

接下来，需要把这个Node连接到整个Graph，才能使它能够被调用。我们这个节点将通过Pin来连接到整个蓝图（Pure Node没有Pin）。通过override父类的AllocateDefaultPins()函数，我们来添加需要的两个pin：
```cpp
void UBPNode_SayHello::AllocateDefaultPins() {

	CreatePin(EGPD_Input, UEdGraphSchema_K2::PC_Exec, UEdGraphSchema_K2::PN_Execute);
	CreatePin(EGPD_Output, UEdGraphSchema_K2::PC_Exec, UEdGraphSchema_K2::PN_Then);
}
```
我们添加了一个Input Pin、一个Output Pin，实现效果如下图所示：  
![hello node pin](/assets/img/ucookbook/custom_node/hello_node_2.png)

## 实现节点的功能

上面这个节点编译就会报错，因为我们还没有实现最核心的蓝图节点编译函数。在这里，我们通过重载“ExpandNode()”来实现这个节点的功能。我个人目前理解这个函数的名字含义是：通过把这个节点展开成一个已有节点类型组成的Sub Graph来实现本节点的功能。先看代码吧：
```cpp
void UBPNode_SayHello::ExpandNode(FKismetCompilerContext & CompilerContext, UEdGraph * SourceGraph) {
	Super::ExpandNode(CompilerContext, SourceGraph);

	UEdGraphPin* ExecPin = GetExecPin();
	UEdGraphPin* ThenPin = GetThenPin();
	if (ExecPin && ThenPin) {

		// create a CallFunction node
		FName MyFunctionName = GET_FUNCTION_NAME_CHECKED(UMyBlueprintFunctionLibrary, SayHello_Internal);

		UK2Node_CallFunction* CallFuncNode = CompilerContext.SpawnIntermediateNode<UK2Node_CallFunction>(this, SourceGraph);
		CallFuncNode->FunctionReference.SetExternalMember(MyFunctionName, UMyBlueprintFunctionLibrary::StaticClass());
		CallFuncNode->AllocateDefaultPins();

		// move pins
		CompilerContext.MovePinLinksToIntermediate(*ExecPin, *(CallFuncNode->GetExecPin()));
		CompilerContext.MovePinLinksToIntermediate(*ThenPin, *(CallFuncNode->GetThenPin()));
	}

	// break any links to the expanded node
	BreakAllNodeLinks();
}
```
这段代码通过新建一个UK2Node_CallFunction节点，然后把Pin重新绑定来实现所需的功能；UK2Node_CallFunction节点可以调用任意的UFUNCTION，在这里我们调用一个自己的简单函数：UMyBlueprintFunctionLibrary::SayHello_Internal()，这个函数实现很简单，需要注意的是在它的UFUNCTION声明里面，我设置了它为“BlueprintInternalUseOnly”，具体看代码：
```
UCLASS()
class MYBLUEPRINTNODE_API UMyBlueprintFunctionLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, meta = (BlueprintInternalUseOnly = "true"))
	static void SayHello_Internal();
};
```

## 结束语

上面这个例子的完整UE4 Project和源代码都已经上传到我的GitHub供大家参考：[https://github.com/neil3d/UnrealCookBook/tree/master/MyBlueprintNode](https://github.com/neil3d/UnrealCookBook/tree/master/MyBlueprintNode)。

通过这个例子，我们已经掌握了最基本的K2Node扩展的方式，其实很简单，主要是重写父类class UK2Node以及父类的父类class UEdGraphNode的一些关键方法。当然，目前这个节点和标准的UFUNCTION节点没什么差别，在下一篇博客中我们将实现一个动态分配Pin的节点，那才能体现这种方法的价值。
