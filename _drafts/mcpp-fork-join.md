---
layout: post
title: "虚幻4与现代C++：使用TaskGraph实现Fork-Join模型"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover_graph.png
  credit: ""
  creditlink: ""
brief: "Fork-Join是并行编程中常用的设计模式，这个博客用一个实例来演示通过虚幻4TaskGraph来实现这种模式。"
---

## Fork-Join 模型简介

Fork-Join 是一种并行编程的设计模式，通过下面这个图片可以有一个直观的理解：

![task-blocks](/assets/img/mcpp/fork_join.png)

> 图片来自维基百科

在上图中，不同颜色的方块代表着可并行执行的“任务”，它们可以根据需要从主线程中“分叉(fork)”出来执行，在需要顺序执行的点上又“合并(join)”到主线程。

我们还可以使用嵌套的 Fork-Join 模型，来实现更复杂的并行任务。

![graph-loop-execution](/assets/img/mcpp/graph-loop-execution.png) 

> 图片来自 Intel TBB 文档

## 使用 TaskGraph 实现 Fork-Join 模型

虚幻4的 TaskGraph 可以为每个“任务”指定“一个或多个前置任务”，也就是组成所谓的 Graph 啦！在这种框架下，Fork-Join 也是一种常用的任务组织的手法。

下面我还是通过一个简单的例子，来看看具体的编程实现。

假定我们需要从一个 Json 格式的文本文件中读取过去 20 年的*上证指数*数据，然后需要统计出：

- 最大值，最小值，平均值

最后把这个三个值显示到一个 UMG 的界面上！

> 咋选了这么个古怪的例子呢？呃，本来是想做一个异步加载 N 个 Static Mesh 模型之类的例子，但是异步加载资源的话，其实用 FStreamableManager 更合适。为了避免误解，就想弄个简单计算的例子。

### 分拆任务

首先需要把上述需求分拆成多个小的任务，看看哪些可以并行执行：

| 任务 | 执行线程 | 说明 |
| - | - | - |
| 加载并解析 Json | Any Thread | 加载和解析这两个动作就放在一起了 |
| 计算最大值 | Any Thread | 加载之后即可执行 |
| 计算最小值 | Any Thread | 同上 |
| 计算平均值 | Any Thread | 同上 |
| 完成通知 | Game Thread | 通知界面更新 |

看下面这个图可能更直观一点：

![task graph - fork jon](/assets/img/mcpp/taskgraph-forkjoin.svg)

### Task Context 对象

在正式开始编写任务之前，我们需要先解决数据在任务之间“传递”和“共享”的问题。

在这里，我打算使用一个 Context 对象存储所有数据，这种方式也是引擎中很多 TaskGraph 所使用的。

下面是一个任务数据的详细分析：

| 数据项	| 主线程：任务发起 |	异步任务：加载并解析 |	异步任务：计算X3 |	主线程：UI更新 |	完成通知 |
| - | - | - | - | - | - |
| 数据文件路径 | 写入 |	只读 |	NA |	NA |	NA |
| 完成回调 | 写入 |	NA |	NA |	NA |	只读 |
| Json 数据对象 |	NA |	写入 |	只读 |	NA |	NA |
| 计算结果X3 |	NA |	NA | 写入 |	只读 |	只读 |

经过上面的分析之后，我设计了下面的数据结构，这个对象将在主线程和几个异步任务之间共享。结合前面那个图片中的执行序列分析，我决定：**不用给Context对象加锁**！

```cpp
struct FStockAnalyzeContext
{
	bool bRunning = false;
	FString DataFilePath;
	FTaskDelegate_StockAnalyzeComplete CompletionDelegate;
	TArray<TSharedPtr<FJsonValue>> StockData;
	FVector Result;	// {X:max, Y:min, Z:average}
};
```

> 那个 Json 对象，使用“	TSharedPtr<FJsonObject, ESPMode::ThreadSafe> StockData”感觉更好一点，不过，引擎中的 JSON 代码的参数写死了，只支持上面那个指针类型。我只能非常谨慎的编码，保证这些Json智能指针在访问的时候，不产生指针的复制。:(  如果你有更好的写法，请留言告诉我！

我们将在一个测试用的 Actor 对象里面存储一个 FStockAnalyzeContext 实例，然后在不同的 Task 之间共享它。

决定了这个 Context 数据结构之后，下面就是挨个实现每个 Task 了！

### 任务实现：异步加载 JSON

这个 Task 很简单，基本上就是把前一篇博客：[基于任务的并行编程与TaskGraph](https://neil3d.github.io/unreal/mcpp-task-begining.html) 中的 `FTask_LoadFileToString` 稍加改造，在 `DoTask()` 中加上 Json 解析，并去掉派发子任务逻辑即可：

```cpp
class FTask_LoadFileToJson
{
	FStockAnalyzeContext* Context;
public:
	FTask_LoadFileToJson(FStockAnalyzeContext* InContext) : Context(InContext)
	{}

	TStatId GetStatId() const {
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTask_LoadFileToJson, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return CPrio_StockTasks.Get(); }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		TSharedPtr<FJsonObject> JsonObject;

		// load file from Content folder
		FString FilePath = Context->DataFilePath;
		FString FileContent;
		FString FullPath = FPaths::Combine(FPaths::ProjectContentDir(), FilePath);
		if (FPaths::FileExists(FullPath))
		{
			if (FFileHelper::LoadFileToString(FileContent, *FullPath))
			{
				TSharedRef< TJsonReader<> > Reader = TJsonReaderFactory<>::Create(FileContent);
				FJsonSerializer::Deserialize(Reader, JsonObject);
			}
		}

		// write resut to context
		if (JsonObject)
			Context->StockData = JsonObject->GetArrayField(TEXT("stock"));
	}
};
```

> 为了代码简单，我没有做什么错误处理啊~

### 任务实现：数据统计计算

对“上证指数”求最大值、最小值、平均值，就是从 Context 中读取数据， 进行个简单的计算啦：

``` cpp
class FTask_StockMax
{
	FStockAnalyzeContext* Context;

public:
	FTask_StockMax(FStockAnalyzeContext* InContext) : Context(InContext)
	{}

	TStatId GetStatId() const {
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTask_StockMax, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return CPrio_StockTasks.Get(); }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		// process data 
		float Result = TNumericLimits<float>::Min();
		int32 Count = Context->GetStockDataCount();
		for (int32 i = 0; i < Count; i++)
		{
			float Value = Context->GetStockData(i);
			if (Value > Result)
				Result = Value;
		}

		// write resut to context
		Context->Result.X = Result;
	}
};
```

### 任务实现：完成通知

和前一篇博客一样：[基于任务的并行编程与TaskGraph](https://neil3d.github.io/unreal/mcpp-task-begining.html) 我还是使用一个指定在 Game Thread 执行的 Task 来调用蓝图实现的事件：

``` cpp
class FTaskCompletion_StockAnalyze
{
	FStockAnalyzeContext* Context;
public:
	FTaskCompletion_StockAnalyze(FStockAnalyzeContext* InContext) : Context(InContext)
	{}

	FORCEINLINE TStatId GetStatId() const	{
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTaskCompletion_StockAnalyze, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return ENamedThreads::GameThread; }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		check(IsInGameThread());

		Context->CompletionDelegate.ExecuteIfBound(Context->Result);
		Context->bRunning = false;
	}
};
```

### 派发所有任务

重点来了！我们需要把任务的执行组织成下面这个图片所示：

![task graph - fork jon](/assets/img/mcpp/taskgraph-forkjoin2.svg)

这个重点就是使用：`TGraphTask::CreateTask()` 函数的第一个个参数。


```cpp
void AForkJoinDemo::AsyncAnalyzeStockData(const FString& FilePath)
{
	if (TaskContext.bRunning)
		return;

	FTaskDelegate_StockAnalyzeComplete CompletionDelegate;
	CompletionDelegate.BindUFunction(this, "OnAnalyzeComplete");

	TaskContext = {};
	TaskContext.bRunning = true;
	TaskContext.CompletionDelegate = CompletionDelegate;
	TaskContext.DataFilePath = FilePath;

	FGraphEventRef LoadJson = TGraphTask<FTask_LoadFileToJson>::CreateTask().
		ConstructAndDispatchWhenReady(&TaskContext);

	// data process tasks
	FGraphEventArray RootTasks = { LoadJson };
	FGraphEventRef CalMax = TGraphTask<FTask_StockMax>::CreateTask(&RootTasks, ENamedThreads::AnyThread).
		ConstructAndDispatchWhenReady(&TaskContext);

	FGraphEventRef CalMin = TGraphTask<FTask_StockMin>::CreateTask(&RootTasks, ENamedThreads::AnyThread).
		ConstructAndDispatchWhenReady(&TaskContext);

	FGraphEventRef CalAverage = TGraphTask<FTask_StockAverage>::CreateTask(&RootTasks, ENamedThreads::AnyThread).
		ConstructAndDispatchWhenReady(&TaskContext);

	// compeletion
	FGraphEventArray CalTasks = { CalMax, CalMin, CalAverage };
	TGraphTask<FTaskCompletion_StockAnalyze>::CreateTask(&CalTasks, ENamedThreads::AnyThread).
		ConstructAndDispatchWhenReady(&TaskContext);

}
```

## 小结

通过指定任务的依赖关系，可以很方便的使用 TaskGraph 实现 Fork-Join 模型。

相关的样例工程在我的 GitHub ：https://github.com/neil3d/UnrealCookBook/tree/master/MakingUseOfTaskGraph 。
本文相关的 Demo 完整源代码也附上：

### ForkJoinDemo.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Dom/JsonObject.h"	// Json
#include "Dom/JsonValue.h"	// Json
#include "ForkJoinDemo.generated.h"

DECLARE_DELEGATE_OneParam(FTaskDelegate_StockAnalyzeComplete, FVector);

struct FStockAnalyzeContext
{
	bool bRunning = false;
	FString DataFilePath;
	FTaskDelegate_StockAnalyzeComplete CompletionDelegate;

	TArray<TSharedPtr<FJsonValue>> StockData;
	FVector Result;	// {X:max, Y:min, Z:average}

	int32 GetStockDataCount() const;
	float GetStockData(int32 Index) const;
};

UCLASS()
class MAKINGUSEOFTASKGRAPH_API AForkJoinDemo : public AActor
{
	GENERATED_BODY()
	
public:	
	// Sets default values for this actor's properties
	AForkJoinDemo();

	UFUNCTION(BlueprintCallable)
		void AsyncAnalyzeStockData(const FString& FilePath);

	UFUNCTION(BlueprintImplementableEvent)
		void OnAnalyzeComplete(FVector Result);

protected:
	FStockAnalyzeContext TaskContext;
};
```

### ForkJoinDemo.cpp

> FStockAnalyzeContext::GetStockData() 的效率有很大优化空间，这里请忽略，咱们是谈 TaskGraph 为主。

```cpp
#include "ForkJoinDemo.h"
#include "Misc/Paths.h"
#include "Misc/FileHelper.h"
#include "Math/NumericLimits.h"
#include "Async/TaskGraphInterfaces.h"	// Core
#include "Serialization/JsonReader.h"	// Json
#include "Serialization/JsonSerializer.h" // Json

int32 FStockAnalyzeContext::GetStockDataCount() const
{
	return StockData.Num();
}

float FStockAnalyzeContext::GetStockData(int32 Index) const
{
	const TSharedPtr<FJsonValue>& Element = StockData[Index];
	const TSharedPtr<FJsonObject>& Stock = Element->AsObject();
	const TSharedPtr<FJsonValue>* FieldPtr = Stock->Values.Find(TEXT("close"));

	if (!FieldPtr)
		return 0.0f;

	const TSharedPtr<FJsonValue>& Field = *FieldPtr;

	check(Field && !Field->IsNull());
	return FCString::Atof(*(Field->AsString()));
}

FAutoConsoleTaskPriority CPrio_StockTasks(
	TEXT("TaskGraph.TaskPriorities.StockTasks"),
	TEXT("Task and thread priority for stock analyzation."),
	ENamedThreads::HighThreadPriority,
	ENamedThreads::NormalTaskPriority,
	ENamedThreads::HighTaskPriority
);

class FTaskCompletion_StockAnalyze
{
	FStockAnalyzeContext* Context;

public:
	FTaskCompletion_StockAnalyze(FStockAnalyzeContext* InContext) : Context(InContext)
	{}

	FORCEINLINE TStatId GetStatId() const
	{
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTaskCompletion_StockAnalyze, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return ENamedThreads::GameThread; }

	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		check(IsInGameThread());

		Context->CompletionDelegate.ExecuteIfBound(Context->Result);
		Context->bRunning = false;
	}
};

class FTask_StockMax
{
	FStockAnalyzeContext* Context;

public:
	FTask_StockMax(FStockAnalyzeContext* InContext) : Context(InContext)
	{}

	TStatId GetStatId() const {
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTask_StockMax, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return CPrio_StockTasks.Get(); }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		// process data 
		float Result = TNumericLimits<float>::Min();
		int32 Count = Context->GetStockDataCount();
		for (int32 i = 0; i < Count; i++)
		{
			float Value = Context->GetStockData(i);
			if (Value > Result)
				Result = Value;
		}

		// write resut to context
		Context->Result.X = Result;
	}
};


class FTask_StockMin
{
	FStockAnalyzeContext* Context;

public:
	FTask_StockMin(FStockAnalyzeContext* InContext) : Context(InContext)
	{}

	TStatId GetStatId() const {
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTask_StockMin, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return CPrio_StockTasks.Get(); }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		// process data 
		float Result = TNumericLimits<float>::Max();
		int32 Count = Context->GetStockDataCount();
		for (int32 i = 0; i < Count; i++)
		{
			float Value = Context->GetStockData(i);
			if (Value < Result)
				Result = Value;
		}

		// write resut to context
		Context->Result.Y = Result;
	}
};


class FTask_StockAverage
{
	FStockAnalyzeContext* Context;

public:
	FTask_StockAverage(FStockAnalyzeContext* InContext) : Context(InContext)
	{}

	TStatId GetStatId() const {
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTask_StockAverage, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return CPrio_StockTasks.Get(); }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		// process data 
		float Result = 0;
		int32 Count = Context->GetStockDataCount();
		for (int32 i = 0; i < Count; i++)
		{
			float Value = Context->GetStockData(i);
			Result += Value;
		}

		// write resut to context
		Context->Result.Z = Result / Count;
	}
};

class FTask_LoadFileToJson
{
	FStockAnalyzeContext* Context;

public:
	FTask_LoadFileToJson(FStockAnalyzeContext* InContext) : Context(InContext)
	{}

	TStatId GetStatId() const {
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTask_LoadFileToJson, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return CPrio_StockTasks.Get(); }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		TSharedPtr<FJsonObject> JsonObject;

		// load file from Content folder
		FString FilePath = Context->DataFilePath;
		FString FileContent;
		FString FullPath = FPaths::Combine(FPaths::ProjectContentDir(), FilePath);
		if (FPaths::FileExists(FullPath))
		{
			if (FFileHelper::LoadFileToString(FileContent, *FullPath))
			{
				TSharedRef< TJsonReader<> > Reader = TJsonReaderFactory<>::Create(FileContent);
				FJsonSerializer::Deserialize(Reader, JsonObject);
			}
		}

		// write resut to context
		if (JsonObject)
			Context->StockData = JsonObject->GetArrayField(TEXT("stock"));
	}
};

// Sets default values
AForkJoinDemo::AForkJoinDemo()
{
}

void AForkJoinDemo::AsyncAnalyzeStockData(const FString& FilePath)
{
	if (TaskContext.bRunning)
		return;

	FTaskDelegate_StockAnalyzeComplete CompletionDelegate;
	CompletionDelegate.BindUFunction(this, "OnAnalyzeComplete");

	TaskContext = {};
	TaskContext.bRunning = true;
	TaskContext.CompletionDelegate = CompletionDelegate;
	TaskContext.DataFilePath = FilePath;

	FGraphEventRef LoadJson = TGraphTask<FTask_LoadFileToJson>::CreateTask().
		ConstructAndDispatchWhenReady(&TaskContext);

	// data process tasks
	FGraphEventArray RootTasks = { LoadJson };
	FGraphEventRef CalMax = TGraphTask<FTask_StockMax>::CreateTask(&RootTasks, ENamedThreads::AnyThread).
		ConstructAndDispatchWhenReady(&TaskContext);

	FGraphEventRef CalMin = TGraphTask<FTask_StockMin>::CreateTask(&RootTasks, ENamedThreads::AnyThread).
		ConstructAndDispatchWhenReady(&TaskContext);

	FGraphEventRef CalAverage = TGraphTask<FTask_StockAverage>::CreateTask(&RootTasks, ENamedThreads::AnyThread).
		ConstructAndDispatchWhenReady(&TaskContext);

	// compeletion
	FGraphEventArray CalTasks = { CalMax, CalMin, CalAverage };
	TGraphTask<FTaskCompletion_StockAnalyze>::CreateTask(&CalTasks, ENamedThreads::AnyThread).
		ConstructAndDispatchWhenReady(&TaskContext);

}
```


## 延伸阅读

- [Wiki: Fork-Join](http://en.wikipedia.org/wiki/Fork%E2%80%93join_model)