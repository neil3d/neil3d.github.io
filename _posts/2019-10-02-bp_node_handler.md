---
layout: post
title: "深入Unreal蓝图开发：自定义蓝图节点(下)"
author: "燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, blueprint]
image:
  path: unreal
  feature: 2019-blueprint-cover3.png
brief: "前面两篇博客我们都是通过ExpandNode来实现蓝图节点的功能，这一篇来介绍另外一种重要的蓝图扩展方式，就是Node Handler。"
---

通过前面的文章，我们已经能够创建自己的蓝图节点，并可以动态添加、删除Pins，但是感觉好像有什么地方不太对劲啊。你发现没有？那就是前面两篇博客中，我们自定义的蓝图节点都是通过`UK2Node::ExpandNode()`来实现节点的具体功能，然而，这个函数只不过是在内部创建了一些其他的节点，然后把自己的Pins重新连接到新建的节点的Pin之上，本质上这个过程手动连线也可以做啊！如果，我们需要做一个全新的蓝图功能节点，无法用现有节点组合完成呢？那要怎么办呢？

如果想更深入的定制化开发蓝图节点，就需要深入到蓝图的编译过程，控制蓝图编译出的字节码。引擎中实现的大多数默认节点都是这样做的。在这篇博客，就通过一个最简单的实例，来探索这个过程是怎么实现的。
首先要谈一点偏概念性的抽象的东西，概念搞明白了之后，我们再通过一个实例来看一下具体的实现步骤。

## 戏说蓝图编译过程

由于本人对蓝图编译的过程掌握的还不够，还不能非常详实的把它的原理和实现都说的很明白，所以这里只能“戏说”一番，谈个大概。在以后的博文中再进行补充吧。

- 蓝图编译过程的最终产出是一个：`UBlueprintGeneratedClass`对象。`UBlueprintGeneratedClass`它是从`UClass`派生的，也就是说它具备Unreal C++开发的类所具备的那些`UProperty`啊、`UFunction`啊等等东西；
- 蓝图里面使用可视化Graph编辑的那些逻辑，最终会生成字节码，保存到`UFunction`成员变量中，具体就是：`TArray<uint8>``UFunction::Script` 这个啦；
- 字节码生成的核心过程是
  1. 遍历Graph的所有节点，使用一定策略（具体是啥策略，另外的文章再讲）生成一个线性的列表，保存到“`TArray<UEdGraphNode*>``FKismetFunctionContext::LinearExecutionList`”；
  1. 然后遍历每个蓝图节点，生成相应的“语句”，正确的名词是：Statement，保存到“`TMap< UEdGraphNode*, TArray<FBlueprintCompiledStatement*> > FKismetFunctionContext::StatementsPerNode`”，一个Node在编译过程中可以产生多个Statement；
**重点来了：这就是我们开发的自定义节点能够控制字节码生成的地方。**
  1. Statement 有很多类型，看看它的枚举，发现很接近字节码了，是类似汇编语言那种；需要通过“条件跳转”之类的逻辑，在线性的代码中产生分支和循环；详见下图中的：`enum EKismetCompiledStatementType`
  - 上述过程可以算是编译器的前端，接下来就进入后端的流程，具体代码是在：`class ``FKismetCompilerVMBackend`；
  - 后端，也就是字节码的生成的核心代码是在：`FScriptBuilderBase::GenerateCodeForStatement()`，这个函数通过一个大的“`switch (Statement.Type)`”语句，把不同类型的statement生成字节码

![Statement Type](/assets/img/ucookbook/node_handler/statement_type.png)


那么，在前面提到的“重点步骤”是怎么实现呢？很简单，分两步：

- 定义一个`class FNodeHandlingFunctor`的派生类，重载其方法，例如：`Compile() `等，即可控制这个节点在编译过程中生成的statement；
- 重载 `class UK2Node`的虚函数“`CreateNodeHandler()`”，返回一个上述派生类的对象指针。

## FNodeHandlingFunctor 详解

既然本文重点步骤就是编写`FNodeHandlingFunctor`的派生类，那么有必要把这个基类仔细的看看啦！
这个类的代码并不多，但是包含了三个重要的概念：

- **Statement**：这个前面已经讲过了，它对应的是“`struct FBlueprintCompiledStatement`”。这个结构体有很多变量，但是并不是同时有效的，具体要根据Type字段来解释。其中的LHS和RHS是两个常用的字段，也就是我们常说的“左值”和“右值”。（简单说就是：一个表达式把一系列右侧的参数值计算之后赋值给左侧的变量）
- **Terminal**，也就是：struct FBPTerminal，它的注释说的比较明白：A terminal in the graph (literal or variable reference)，也就是说“它代表Graph中的一个端点，可能是字面量，也可能是变量的引用”
- **Net**：对于“变量引用型的Terminal”，需要注册的一个“关系网”中，用来在运行时求解它的值。

理解了这三个概念之后，再来看他的几个常用的虚函数：

- ` virtual void Compile(FKismetFunctionContext& Context, UEdGraphNode* Node)`
这个就是编译过程中的回调啦，一般用来生成这个Node对应的Statement，可以是0个到多个；
-  `virtual void RegisterNets(FKismetFunctionContext& Context, UEdGraphNode* Node)`
这个节点注册Terminal网络的回调；在这里可以使用“`FKismetFunctionContext::CreateLocalTerminal`”创建非Pin直接相关的Terminal对象；
-  `virtual void RegisterNet(FKismetFunctionContext& Context, UEdGraphPin* Pin)`
这个节点上的针脚注册Terminal网络的回调；

总结一下：
* 实现一个FNodeHandlingFunctor的派生类，我们可以实现自己的Node Handler
* 通过这个Node Handler，可以在编译过程中生成需要的Terminal，并注册到Net中
* 在编译的过程中，可以生成任意多个Statement，直接影响后续的字节码生成

## 举个栗子

下面我们就通过一个具体的例子，来看看通过Node Handler方式控制蓝图节点的编译，具体如何实现的。说实话，引擎实现的蓝图节点真的很丰富了，很难想出一个有实用性的例子，只好胡诌一个了：

* 判断输入的一个整型变量，分为：正数，零，负数，三种状态，执行不同的流程；

如下图中的“TriGate”节点所示：

![TriGate Node](/assets/img/ucookbook/node_handler/trigate.png)

> 完整的Demo工程可以从我的GitHub下载：[https://github.com/neil3d/UnrealCookBook](https://github.com/neil3d/UnrealCookBook)   

这个节点的完整源代码附在文末，我们先来step by step讲解一下，实现过程不难理解：

### 第一步：添加一个自定义的UK2Node派生类

首先就是要创建一个class UK2Node的派生类：class UBPNode_TriGate : public UK2Node，这个过程很简单，基本上和前面两篇博客介绍的一样，这里就不重复了。只有一个地方不同，那就是我们不再需要重载 ExpendNode() 函数，而是重载CreateNodeHandler()函数。它的实现也很简单，就是返回一个我们自定义的FNodeHandlingFunctor派生类对象。

```cpp
FNodeHandlingFunctor * UBPNode_TriGate::CreateNodeHandler(FKismetCompilerContext & CompilerContext) const
{
	return new FKCHandler_TriGate(CompilerContext);
}
```

### 第二步：生成两个Terminal

想象一下，代码执行过程中，我们需要比较输入的那个整数是否大于零，把结果保存到一个临时变量中，所以我们需要两个Terminal：
- 一个用来用来表示字面量“0”
- 另一个用来存储比较结果

这两个Terminal就是在"FKCHandler_TriGate::RegisterNets()"函数中定义的

```cpp
	virtual void RegisterNets(FKismetFunctionContext& Context, UEdGraphNode* Node) override
	{
		FNodeHandlingFunctor::RegisterNets(Context, Node);

        // 存储比较结果的bool变量
		FBPTerminal* BoolTerm = Context.CreateLocalTerminal();
		BoolTerm->Type.PinCategory = UEdGraphSchema_K2::PC_Boolean;
		BoolTerm->Source = Node;
		BoolTerm->Name = Context.NetNameMap->MakeValidName(Node) + TEXT("_CmpResult");
		BoolTermMap.Add(Node, BoolTerm);

        // 字面量“0”
		LiteralZeroTerm = Context.CreateLocalTerminal(ETerminalSpecification::TS_Literal);
		LiteralZeroTerm->bIsLiteral = true;
		LiteralZeroTerm->Type.PinCategory = UEdGraphSchema_K2::PC_Int;
		LiteralZeroTerm->Name = TEXT("0");
	}
```

### 第三步：实现Compile过程，生成6个Statement

做好了前面两步的准备，接下来就是关键的步骤了：定义一系列Statements来实现我们的逻辑。重复一下要实现的逻辑：

* 判断输入的一个整型变量，分为：正数，零，负数，三种状态，执行不同的流程；

逻辑很简单，不过，我们需要转换一下思考方式，要使用类似汇编语言的那种思路：要把语句顺序排列，然后使用条件跳转语句控制分支逻辑。下面将要使用到的Statement类型先说明一下：
* KCST_CallFunction：调用指定的UFunction，我们需要把“输入那个整数”和零做比较，这个功能我们将通过调用 class UKismetMathLibrary 中的函数来实现，使用到两个函数：
  1. UKismetMathLibrary::Greater_IntInt()
  2. UKismetMathLibrary::EqualEqual_IntInt()
* KCST_GotoIfNot：条件跳转，可以指定跳转到哪个Statement（或者指定的Pin）；
* KCST_UnconditionalGoto：无条件跳转，主要用来跳转到右侧的三个Exec Pin中的一个；

#### KCST_CallFunction 实例

下面说一下KCST_CallFunction具体在我们这个例子中的使用。

首先我们需要找到UFunction相关的信息：

```cpp
UClass* MathLibClass = UKismetMathLibrary::StaticClass();
UFunction* CreaterFuncPtr = FindField<UFunction>(MathLibClass, "Greater_IntInt");
UFunction* EqualFuncPtr = FindField<UFunction>(MathLibClass, "EqualEqual_IntInt");
```

下面生成的这个Statement就是比较输入变量是否大于零，并把比较结果保存到我们定义的BoolTerm变量中：

```cpp
    FBlueprintCompiledStatement& CallCreaterZero = Context.AppendStatementForNode(MyNode);
		CallCreaterZero.Type = KCST_CallFunction;
		CallCreaterZero.FunctionToCall = CreaterFuncPtr;
		CallCreaterZero.LHS = BoolTerm;
		CallCreaterZero.RHS.Add(InputTerm);
		CallCreaterZero.RHS.Add(LiteralZeroTerm);
```

### KCST_GotoIfNot 实例

下面生成的这个Statement就是通过判断BoolTerm的值为False的话，则跳转：

```cpp
		FBlueprintCompiledStatement& IfPositive = Context.AppendStatementForNode(Node);
		IfPositive.Type = KCST_GotoIfNot;
		IfPositive.LHS = BoolTerm;
```

那么，跳转到什么地方呢？跳转到后面的比较语句，具体代码如下：

``` cpp
    FBlueprintCompiledStatement& CallEqualZero = Context.AppendStatementForNode(MyNode);
    ...
		CallEqualZero.bIsJumpTarget = true;
		IfPositive.TargetLabel = &CallEqualZero;
```

设置新的语句“bIsJumpTarget = true”，使它成为一个跳转的目标，然后把前面那个跳转的Statement的TargetLabel设置为这个新的语句。

### KCST_UnconditionalGoto

无条件跳转到指定的Exec Pin。注意：下面这个Statement在运行时，根据BoolTerm的值，可能被前面的条件跳转语句跳过，来实现分支的逻辑。

```cpp
  FBlueprintCompiledStatement& ExecZero = Context.AppendStatementForNode(Node);
	ExecZero.Type = KCST_UnconditionalGoto;
	Context.GotoFixupRequestMap.Add(&ExecZero, ZeroPin);
```

### 完整的 Statement 列表

运用上面三种Statement，把他们罗列出来，即可实现我们的逻辑功能了。乍看上去可能并不直观，主要是这种类似汇编的方式并不直观，可能需要反复看几遍。

``` cpp
	virtual void Compile(FKismetFunctionContext& Context, UEdGraphNode* Node) override
	{
		UBPNode_TriGate* MyNode = CastChecked<UBPNode_TriGate>(Node);

		// 查找输入的那个整数的Pin对应的Terminal
		UEdGraphPin* InputPin = Context.FindRequiredPinByName(Node, TriGatePN::Input, EGPD_Input);

		UEdGraphPin* PinToTry = FEdGraphUtilities::GetNetFromPin(InputPin);
		FBPTerminal** pInputTerm = Context.NetMap.Find(PinToTry);
		if (pInputTerm == nullptr)
		{
			CompilerContext.MessageLog.Error(TEXT("FKCHandler_TriGate: Failed to resolve term passed into"), InputPin);
			return;
		}

		FBPTerminal* InputTerm = *pInputTerm;

		// 查找三个输出Pin
		UEdGraphPin* PositivePin = MyNode->FindPin(TriGatePN::Positive, EGPD_Output);
		UEdGraphPin* ZeroPin = MyNode->FindPin(TriGatePN::Zero, EGPD_Output);
		UEdGraphPin* NegativePin = MyNode->FindPin(TriGatePN::Negative, EGPD_Output);

		// 临时bool变量的Terminal
		FBPTerminal* BoolTerm = BoolTermMap.FindRef(MyNode);

		UClass* MathLibClass = UKismetMathLibrary::StaticClass();
		UFunction* CreaterFuncPtr = FindField<UFunction>(MathLibClass, "Greater_IntInt");
		UFunction* EqualFuncPtr = FindField<UFunction>(MathLibClass, "EqualEqual_IntInt");

		// Statement 1: 计算表达式 BoolTerm = Interger > 0
		FBlueprintCompiledStatement& CallCreaterZero = Context.AppendStatementForNode(MyNode);
		CallCreaterZero.Type = KCST_CallFunction;
		CallCreaterZero.FunctionToCall = CreaterFuncPtr;
		CallCreaterZero.LHS = BoolTerm;
		CallCreaterZero.RHS.Add(InputTerm);
		CallCreaterZero.RHS.Add(LiteralZeroTerm);

		// Statement 2: if(BoolTerm)
		FBlueprintCompiledStatement& IfPositive = Context.AppendStatementForNode(Node);
		IfPositive.Type = KCST_GotoIfNot;
		IfPositive.LHS = BoolTerm;

		// Statement 3: 执行 Positive Pin
		FBlueprintCompiledStatement& ExecPositive = Context.AppendStatementForNode(Node);
		ExecPositive.Type = KCST_UnconditionalGoto;
		Context.GotoFixupRequestMap.Add(&ExecPositive, PositivePin);

		// Statement 4: 计算表达式 BoolTerm = Interger == 0
		FBlueprintCompiledStatement& CallEqualZero = Context.AppendStatementForNode(MyNode);
		CallEqualZero.Type = KCST_CallFunction;
		CallEqualZero.FunctionToCall = EqualFuncPtr;
		CallEqualZero.LHS = BoolTerm;
		CallEqualZero.bIsJumpTarget = true;
		CallEqualZero.RHS.Add(InputTerm);
		CallEqualZero.RHS.Add(LiteralZeroTerm);

		IfPositive.TargetLabel = &CallEqualZero;

		// Statement 5: GotoIfNot(BoolTerm)
		FBlueprintCompiledStatement& IfZero = Context.AppendStatementForNode(Node);
		IfZero.Type = KCST_GotoIfNot;
		IfZero.LHS = BoolTerm;
		Context.GotoFixupRequestMap.Add(&IfZero, NegativePin);

		// Statement 6: 执行 Zero Pin
		FBlueprintCompiledStatement& ExecZero = Context.AppendStatementForNode(Node);
		ExecZero.Type = KCST_UnconditionalGoto;
		Context.GotoFixupRequestMap.Add(&ExecZero, ZeroPin);

	}
```

### 附：class UBPNode_TriGate源代码

* BPNode_TriGate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "K2Node.h"
#include "BPNode_TriGate.generated.h"

UCLASS()
class MYBLUEPRINTNODEEDITOR_API UBPNode_TriGate : public UK2Node
{
	GENERATED_BODY()
public:
	// UEdGraphNode interface
	virtual void AllocateDefaultPins() override;

	virtual FText GetTooltipText() const override { return FText::FromString(TEXT("TriGate by Integer")); }
	virtual FText GetNodeTitle(ENodeTitleType::Type TitleType) const override { return FText::FromString(TEXT("TriGate")); }
	// End of UEdGraphNode interface

	// UK2Node interface
	virtual FText GetMenuCategory() const { return FText::FromString(TEXT("MyBlueprintNodes")); }
	virtual void GetMenuActions(FBlueprintActionDatabaseRegistrar& ActionRegistrar) const override;
	virtual class FNodeHandlingFunctor* CreateNodeHandler(class FKismetCompilerContext& CompilerContext) const;
	// End of UK2Node interface
};
```

* BPNode_TriGate.cpp

```cpp
#include "BPNode_TriGate.h"
#include "EdGraphSchema_K2.h"	// BlueprintGraph
#include "BlueprintNodeSpawner.h"	// BlueprintGraph
#include "BlueprintActionDatabaseRegistrar.h"	// BlueprintGraph
#include "BPTerminal.h"
#include "KismetCompilerMisc.h"
#include "KismetCompiler.h"
#include "Kismet/KismetMathLibrary.h"
#include "EdGraphUtilities.h"

namespace TriGatePN
{
	FName Input = TEXT("Integer");
	FName Positive = TEXT("Positive");
	FName Zero = TEXT("Zero");
	FName Negative = TEXT("Negative");
}

class FKCHandler_TriGate : public FNodeHandlingFunctor
{
protected:
	// 为每个Node开辟一个临时bool变量，用来存储输入参数的比较结果
	TMap<UEdGraphNode*, FBPTerminal*> BoolTermMap;
	FBPTerminal* LiteralZeroTerm;

public:
	FKCHandler_TriGate(FKismetCompilerContext& InCompilerContext)
		: FNodeHandlingFunctor(InCompilerContext)
	{
	}

	virtual void RegisterNets(FKismetFunctionContext& Context, UEdGraphNode* Node) override
	{
		FNodeHandlingFunctor::RegisterNets(Context, Node);

		FBPTerminal* BoolTerm = Context.CreateLocalTerminal();
		BoolTerm->Type.PinCategory = UEdGraphSchema_K2::PC_Boolean;
		BoolTerm->Source = Node;
		BoolTerm->Name = Context.NetNameMap->MakeValidName(Node) + TEXT("_CmpResult");
		BoolTermMap.Add(Node, BoolTerm);

		LiteralZeroTerm = Context.CreateLocalTerminal(ETerminalSpecification::TS_Literal);
		LiteralZeroTerm->bIsLiteral = true;
		LiteralZeroTerm->Type.PinCategory = UEdGraphSchema_K2::PC_Int;
		LiteralZeroTerm->Name = TEXT("0");
	}

	virtual void Compile(FKismetFunctionContext& Context, UEdGraphNode* Node) override
	{
		UBPNode_TriGate* MyNode = CastChecked<UBPNode_TriGate>(Node);

		// 查找输入的那个整数的Pin对应的Terminal
		UEdGraphPin* InputPin = Context.FindRequiredPinByName(Node, TriGatePN::Input, EGPD_Input);

		UEdGraphPin* PinToTry = FEdGraphUtilities::GetNetFromPin(InputPin);
		FBPTerminal** pInputTerm = Context.NetMap.Find(PinToTry);
		if (pInputTerm == nullptr)
		{
			CompilerContext.MessageLog.Error(TEXT("FKCHandler_TriGate: Failed to resolve term passed into"), InputPin);
			return;
		}

		FBPTerminal* InputTerm = *pInputTerm;

		// 查找三个输出Pin
		UEdGraphPin* PositivePin = MyNode->FindPin(TriGatePN::Positive, EGPD_Output);
		UEdGraphPin* ZeroPin = MyNode->FindPin(TriGatePN::Zero, EGPD_Output);
		UEdGraphPin* NegativePin = MyNode->FindPin(TriGatePN::Negative, EGPD_Output);

		// 临时bool变量的Terminal
		FBPTerminal* BoolTerm = BoolTermMap.FindRef(MyNode);

		UClass* MathLibClass = UKismetMathLibrary::StaticClass();
		UFunction* CreaterFuncPtr = FindField<UFunction>(MathLibClass, "Greater_IntInt");
		UFunction* EqualFuncPtr = FindField<UFunction>(MathLibClass, "EqualEqual_IntInt");

		// Statement 1: 计算表达式 BoolTerm = Interger > 0
		FBlueprintCompiledStatement& CallCreaterZero = Context.AppendStatementForNode(MyNode);
		CallCreaterZero.Type = KCST_CallFunction;
		CallCreaterZero.FunctionToCall = CreaterFuncPtr;
		CallCreaterZero.LHS = BoolTerm;
		CallCreaterZero.RHS.Add(InputTerm);
		CallCreaterZero.RHS.Add(LiteralZeroTerm);

		// Statement 2: if(BoolTerm)
		FBlueprintCompiledStatement& IfPositive = Context.AppendStatementForNode(Node);
		IfPositive.Type = KCST_GotoIfNot;
		IfPositive.LHS = BoolTerm;

		// Statement 3: 执行 Positive Pin
		FBlueprintCompiledStatement& ExecPositive = Context.AppendStatementForNode(Node);
		ExecPositive.Type = KCST_UnconditionalGoto;
		Context.GotoFixupRequestMap.Add(&ExecPositive, PositivePin);

		// Statement 4: 计算表达式 BoolTerm = Interger == 0
		FBlueprintCompiledStatement& CallEqualZero = Context.AppendStatementForNode(MyNode);
		CallEqualZero.Type = KCST_CallFunction;
		CallEqualZero.FunctionToCall = EqualFuncPtr;
		CallEqualZero.LHS = BoolTerm;
		CallEqualZero.bIsJumpTarget = true;
		CallEqualZero.RHS.Add(InputTerm);
		CallEqualZero.RHS.Add(LiteralZeroTerm);

		IfPositive.TargetLabel = &CallEqualZero;

		// Statement 5: GotoIfNot(BoolTerm)
		FBlueprintCompiledStatement& IfZero = Context.AppendStatementForNode(Node);
		IfZero.Type = KCST_GotoIfNot;
		IfZero.LHS = BoolTerm;
		Context.GotoFixupRequestMap.Add(&IfZero, NegativePin);

		// Statement 6: 执行 Zero Pin
		FBlueprintCompiledStatement& ExecZero = Context.AppendStatementForNode(Node);
		ExecZero.Type = KCST_UnconditionalGoto;
		Context.GotoFixupRequestMap.Add(&ExecZero, ZeroPin);
	}
};

void UBPNode_TriGate::AllocateDefaultPins()
{
	CreatePin(EGPD_Input, UEdGraphSchema_K2::PC_Exec, UEdGraphSchema_K2::PN_Execute);
	CreatePin(EGPD_Input, UEdGraphSchema_K2::PC_Int, TriGatePN::Input);

	CreatePin(EGPD_Output, UEdGraphSchema_K2::PC_Exec, TriGatePN::Positive);
	CreatePin(EGPD_Output, UEdGraphSchema_K2::PC_Exec, TriGatePN::Zero);
	CreatePin(EGPD_Output, UEdGraphSchema_K2::PC_Exec, TriGatePN::Negative);

}

void UBPNode_TriGate::GetMenuActions(FBlueprintActionDatabaseRegistrar& ActionRegistrar) const
{
	UClass* ActionKey = GetClass();

	if (ActionRegistrar.IsOpenForRegistration(ActionKey))
	{
		UBlueprintNodeSpawner* NodeSpawner = UBlueprintNodeSpawner::Create(GetClass());
		check(NodeSpawner != nullptr);

		ActionRegistrar.AddBlueprintAction(ActionKey, NodeSpawner);
	}
}

FNodeHandlingFunctor * UBPNode_TriGate::CreateNodeHandler(FKismetCompilerContext & CompilerContext) const
{
	return new FKCHandler_TriGate(CompilerContext);
}

```
