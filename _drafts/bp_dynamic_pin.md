---
layout: post
title: "深入Unreal蓝图开发：自定义蓝图节点(中)"
author: "燕良"
categories: unreal
tags: [unreal, blueprint]
image:
  path: unreal
  feature: unreal4_cover.jpg
brief: "通过派生class UK2Node，为蓝图添加自定义节点，实现一个“动态添加输入Pin”的蓝图节点。"
---

通过[本系列文章：自定义蓝图节点（上）篇](/unreal/custom_bp_node.html)的介绍，我们已经可以创建一个“没什么用”的节点了。要想让它有用，关键还是上篇中说的它的典型应用场景：动态添加Pin，这篇博客就来解决这个问题。

### 目标

和上篇一样，我还将通过一个尽量简单的节点，来说明实现过程，让大家尽量聚焦在“蓝图自定义节点”这个主题上。设想这样一个节点：Say Something，把输入的N个字符串连接起来，然后打印输出。也就是说，这个节点的输入Pin是可以动态添加的。我们将在上篇的那个工程基础上，实现这个节点。

### 创建Blueprint Graph节点类型

首先，我们还是需要创建一个class UK2Node的派生类，这个过程在[上篇](/unreal/custom_bp_node.html)中已经详细说过了，照单炒菜，很容易就创建了下图这样一个空的自定义节点，这里就不赘述了。不清楚的话，可以返回去在照着*上篇*做就好了。

![Blueprint Node](/assets/img/ucookbook/custom_node/dynamic_pin_1.png)

### 创建自定义的节点Widget

我们要动态增加Pin的话，需要在节点上显示一个按钮，点击之后增加“input pin”。这就不能使用默认的Blueprint Graph Node控件了，需要对其进行扩展。这个扩展的思路和前面一样，也是找到特定的基类，重载其虚函数即可，这个基类就是class SGraphNodeK2Base。我们要重载的两个核心的函数是：
1. CreateInputSideAddButton()，创建我们需要的添加输入Pin的按钮；
2. OnAddPin()，响应这个按钮的操作；

来看一下最简化的代码吧：
**SGraphNodeSaySomething.h**
```cpp
class SGraphNodeSaySomething : public SGraphNodeK2Base
{
public:
	SLATE_BEGIN_ARGS(SGraphNodeSaySomething){}
	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs, UBPNode_SaySomething* InNode);
protected:
	virtual void CreateInputSideAddButton(TSharedPtr<SVerticalBox> InputBox) override;
	virtual FReply OnAddPin() override;
	// End of SGraphNode interface
};
```

**SGraphNodeSaySomething.cpp**
```cpp
void SGraphNodeSaySomething::Construct(const FArguments& InArgs, UBPNode_SaySomething* InNode)
{
	this->GraphNode = InNode;
	this->SetCursor( EMouseCursor::CardinalCross );
	this->UpdateGraphNode();
}

void SGraphNodeSaySomething::CreateInputSideAddButton(TSharedPtr<SVerticalBox> InputBox)
{
	FText Tmp = FText::FromString(TEXT("Add word"));
	TSharedRef<SWidget> AddPinButton = AddPinButtonContent(Tmp, Tmp);

	FMargin AddPinPadding = Settings->GetInputPinPadding();
	AddPinPadding.Top += 6.0f;

	InputBox->AddSlot()
	.AutoHeight()
	.VAlign(VAlign_Center)
	.Padding(AddPinPadding)
	[
		AddPinButton
	];
}

FReply SGraphNodeSaySomething::OnAddPin()
{ }
```

如果你接触过Unreal Slate的话，上面这个Slate Widget的代码很容易看懂啦，如果你没有玩过Slate。。。。Slate是虚幻自己的一套 Immediate Mode UI framework，如果不熟悉Slate UI Framework的同学，建议先过一下[官方文档](https://docs.unrealengine.com/en-US/Programming/Slate/index.html)。

最后，因为这个基类：SGraphNodeK2Base，属于GraphEditor模块，所以要修改MyBlueprintNodeEditor.Build.cs，把它添加到PrivateDependencyModuleNames：
```csharp
PrivateDependencyModuleNames.AddRange(new string[] {
            "UnrealEd",
            "GraphEditor",
            "BlueprintGraph",
            "KismetCompiler",
            "MyBlueprintNode"
        });
```

### 扩展蓝图编辑器的节点Widget

OK，上面我们已经创建了两个类，分别是：
1. class UBPNode_SaySomething : public UK2Node
2. class SGraphNodeSaySomething : public SGraphNodeK2Base 

下面我们就需要让蓝图编辑器知道，创建UBPNode_SaySomething对象的时候，需要使用SGraphNodeSaySomething这个Widget。添加自定义Node Widget的两种方式（参见引擎源码class FNodeFactory）：
1. 首先调用：UEdGraphNode::CreateVisualWidget()，例如：
```cpp
TSharedPtr<SGraphNode> UNiagaraNode::CreateVisualWidget() 
{
	return SNew(SNiagaraGraphNode, this);
}
```	
2. 使用 class FEdGraphUtilities 注册 class FGraphPanelNodeFactory对象，例如：
```cpp
void FBehaviorTreeEditorModule::StartupModule()
{
	GraphPanelNodeFactory_BehaviorTree = MakeShareable( new FGraphPanelNodeFactory_BehaviorTree() );
	FEdGraphUtilities::RegisterVisualNodeFactory(GraphPanelNodeFactory_BehaviorTree);
}
```	

在这里，我们使用第一种方式，也就是在class UBPNode_SaySomething中重载父类的虚函数CreateVisualWidget()。
```cpp
TSharedPtr<SGraphNode> UBPNode_SaySomething::CreateVisualWidget() {
	return SNew(SGraphNodeSaySomething, this);
}
```

完成上述代码之后，运行蓝图编辑器，添加Say Something节点，就可以看到这个Widget了：  
![SGraphNode](/assets/img/ucookbook/custom_node/dynamic_pin_2.png)

### 动态增加输入参数变量

当用户点击“+ Add word”按钮时，SGraphNodeSaySomething::OnAddPin()会被调用，下面是它的实现代码：

```cpp
FReply SGraphNodeSaySomething::OnAddPin()
{
	UBPNode_SaySomething* BPNode = CastChecked<UBPNode_SaySomething>(GraphNode);

	const FScopedTransaction Transaction(NSLOCTEXT("Kismet", "AddArgumentPin", "Add Argument Pin"));
	BPNode->Modify();

	BPNode->AddPinToNode();
	FBlueprintEditorUtils::MarkBlueprintAsModified(BPNode->GetBlueprint());

	UpdateGraphNode();
	GraphNode->GetGraph()->NotifyGraphChanged();

	return FReply::Handled();
}
```

上面这段代码主要是响应用户的UI操作，添加Pin的核心操作，还是放在UBPNode_SaySomething::AddPinToNode()这个函数里面去实现的:
```
void UBPNode_SaySomething::AddPinToNode()
{
	TMap<FString, FStringFormatArg> FormatArgs= {
			{TEXT("Count"), ArgPinNames.Num()}
	};
	FName NewPinName(*FString::Format(TEXT("Word {Count}"), FormatArgs));
	ArgPinNames.Add(NewPinName);

	CreatePin(EGPD_Input, UEdGraphSchema_K2::PC_String, NewPinName);
}
```
现在我们就可以在蓝图编辑器里面操作添加输入了：  
![Add Pin](/assets/img/ucookbook/custom_node/dynamic_pin_3.png)

### 实现这个蓝图节点的编译

通过前面的步骤，蓝图编辑器的扩展就全部完成了，接下来就是最后一步了，通过扩展蓝图编译器来实现这个节点的实际功能。

### 结束语

通过派生class SGraphNodeK2Base来扩展Blueprint Graph Editor，我们可以自己定义蓝图节点的渲染Widget，可以添加按钮，以及其他任何你想要做的东西。通过这个定制话的Node Widget，可以实现编辑时对Blueprint Graph Node的交互控制。至此，你已经掌握了最强大的蓝图节点的扩展方法。这个问题说明白之后，*下篇*将写什么呢？先卖个关子，且待下回分解吧~