---
layout: post
title: "虚幻4与现代C++：基于任务的并行编程与TaskGraph"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover3.png
  credit: ""
  creditlink: ""
brief: "基于任务的并行编程是现代C++的一个趋势，虚幻4中的TaskGraph也是这样一个方向。这个博客分享一下 TaskGraph 的基本用法。"
---

## 基于任务的并行程序设计

基于任务（task-based）的并行编程可以说是现代 C++ 的一个重要发展方向。什么是“基于任务的并行编程”呢？简单来做个比较的话就很清晰了。

传统的 C++ 并行编程是直接操作OS层面的线程（std::thread）、线程同步对象（ std::mutex, std::condition 等），这种叫做**基于线程（thread-based）**的并行编程。在这种开发模式下，程序员必须非常仔细的处理线程间的同步、共享数据等问题，为了避免条件竞争(race condition)和死锁而殚精竭虑。虚幻4里面的 FRunable 就是这种模式。

如果说“基于线程的并行编程”就像是在直接使用 D3D、OpenGL 在开发图形程序，那么“基于任务的并行编程”的模式就相当于在一个图形渲染引擎基础上做开发。我们可以更多的在自己的问题域里面思考：如果把整个处理流程划分成“任务”，哪些任务是可以并行的，哪些任务需要串行，然后通过“基于任务”的 API 来派发任务。这个小引擎内部的调度器会帮我们管理线程池等底层对象。

基于任务的模式已经相当成熟，比较有名的实现包括:

- 微软的 [PPL(Parallel Patterns Library)](https://docs.microsoft.com/en-us/cpp/parallel/concrt/parallel-patterns-library-ppl?view=vs-2019)
- Intel 的 [TBB(Threading Building Blocks)](https://github.com/intel/tbb)  

并且两家已经在2015年一起发起了C++标准提案：[N4411 | Task Block](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2015/n4411.pdf)，Herb Sutter 也是发起人之一。

## 虚幻4的 TaskGraph 简介

TaskGraph 应该是虚幻4引擎中后期才加入的一个机制，但越来越多的系统开始使用它。它不是一个标准的基于任务的并行编程框架，而一个专门针对虚幻4定制的。它的底层实现代码还蛮复杂的，咱们就先不分析它，而是着重说说**怎么用好它**。

虚幻4的 TaskGraph 有以下常用特性：

- 在创建任务时，可以指定一个或多个前置任务；这些任务就可以组成一个 Graph 啦；
- 可以指定任务在哪个线程中执行；这个太好用了，后面例子中可以看到；

至于任务之间如何共享数据等问题，TaskGraph 框架是不管的，责任在于开发 Task 的人。不过，不要害怕：你可能发现，任务分配的好的话，这个问题可以很大程度上简单化。

## 通过实例上手 TaskGraph 

我还是通过一个最简单的例子来说明 TaskGraph 的基本用法：假定我们需要异步加载一个文本文件。

下面是这个例子的接口定义：  
- 建立了一个 Actor 的派生类
- 提供一个接口，用来发起异步加载的操作：`void AsyncLoadTextFile(const FString& FilePath)`
- 提供一个蓝图事件，供上层来接受加载的文件内容：`void OnFileLoaded(const FString& FileContent)`
- 完整代码如下：FirstAsyncTask.h
``` cpp
UCLASS()
class MAKINGUSEOFTASKGRAPH_API AFirstAsyncTask : public AActor
{
	GENERATED_BODY()
public:
	UFUNCTION(BlueprintCallable)
		void AsyncLoadTextFile(const FString& FilePath);

	UFUNCTION(BlueprintImplementableEvent)
		void OnFileLoaded(const FString& FileContent);

};
```

实现代码很简单：  
- 在 `AsyncLoadTextFile()` 函数中发起一个异步操作
- `OnFileLoaded()` 将在蓝图中实现，C++这里没有代码
- 任务代码是通过自定义的一个class实现的：`FTask_LoadFileToString`，这个后面细说
- 完整代码如下：FirstAsyncTask.cpp
``` cpp
void AFirstAsyncTask::AsyncLoadTextFile(const FString& FilePath)
{
	FTaskDelegate_FileLoaded TaskDelegate;
	TaskDelegate.BindUFunction(this, "OnFileLoaded");

	TGraphTask<FTask_LoadFileToString>::CreateTask().ConstructAndDispatchWhenReady(FilePath, TaskDelegate);
}
```

主线程的代码就是这么简单！看到这几行代码，你可能想要拍砖了：我在一个异步任务里面调用蓝图 `OnFileLoaded` ，这个不是找死吗？！且慢，砖再举一会儿，容我慢慢解释！其关键就在于这个异步任务是如何定义的。

### 定义任务

用户定义的任务必须要满足 `TGraphTask` 中对 Task 的接口需求。下面这个 `class FTask_LoadFileToString` 就是我写的一个简单的任务：

```cpp
class FTask_LoadFileToString
{
	FTaskDelegate_FileLoaded TaskDelegate;
	FString FilePath;

	FString FileContent;
public:
	FTask_LoadFileToString(FString InFilePath, FTaskDelegate_FileLoaded InTaskDelegate) :
		TaskDelegate(InTaskDelegate), FilePath(MoveTemp(InFilePath))
	{}

	FORCEINLINE TStatId GetStatId() const {
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTask_LoadFileToString, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return CPrio_LoadFileToString.Get(); }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		// load file from Content folder
		FString FullPath = FPaths::Combine(FPaths::ProjectContentDir(), FilePath);
		if (FPaths::FileExists(FullPath))
		{
			FFileHelper::LoadFileToString(FileContent, *FullPath);
		}

		// create completion task
		FGraphEventRef ChildTask = TGraphTask<FTaskCompletion_LoadFileToString>::CreateTask(nullptr, ENamedThreads::GameThread).
			ConstructAndDispatchWhenReady(TaskDelegate, MoveTemp(FileContent));
		MyCompletionGraphEvent->DontCompleteUntil(ChildTask);
	}
};
```

按个说一下这个类的几个方法：

- 构造函数是完全自定义的，有多少参数都可以；底层会通过“可变参数模板(Variadic Templates)”把所有参数全都转发过来；
	* 引擎中有一句注释说不支持引用类型的参数：CAUTION!: Must not use references in the constructor args; use pointers instead if you need by reference
	* 不过，我在引擎的代码中发现了有使用引用类型参数的任务，目前还不确定；使用引用类型的话，确实是有很大的“悬空引用(dangling references)”的风险，建议还是不用；
- GetStatId()：返回一个 StatId，一般就按照这种固定写法就好了；
- GetDesiredThread()：返回这个任务希望运行的线程；常用的写法有：
	* 通过一个 FAutoConsoleTaskPriority 对象来获得一个当前合适的线程；
	* 指定某个线程，例如：ENamedThreads::GameThread ；
- GetSubsequentsMode()：有两个可选值，TrackSubsequents 和 FireAndForget ；
- DoTask()：这个就是写我们这个任务实际的工作的代码了；

下面就着重看一下这个任务的实现代码：`FTask_LoadFileToString::DoTask()`，这个函数干了两件事：

1. 首先就是加载那个文本文件了；
2. 创建了一个子任务，这个子任务负责执行“完成通知”！

OK！砖举累了的话，可以放下了：
- 我是通过这个完成通知任务`class FTaskCompletion_LoadFileToString`来调用`AFirstAsyncTask::OnFileLoaded`那个蓝图事件的；
- 我指定 `FTaskCompletion_LoadFileToString::DoTask()` 需要在 Game Thread 执行！

下面看一下`class FTaskCompletion_LoadFileToString`的完整代码：
```cpp
class FTaskCompletion_LoadFileToString
{
	FTaskDelegate_FileLoaded TaskDelegate;
	FString FileContent;
public:
	FTaskCompletion_LoadFileToString(FTaskDelegate_FileLoaded InTaskDelegate, FString InFileContent) :
		TaskDelegate(InTaskDelegate), FileContent(MoveTemp(InFileContent))
	{}

	FORCEINLINE TStatId GetStatId() const	{
		RETURN_QUICK_DECLARE_CYCLE_STAT(FTaskCompletion_LoadFileToString, STATGROUP_TaskGraphTasks);
	}

	static ENamedThreads::Type GetDesiredThread() { return ENamedThreads::GameThread; }
	static ESubsequentsMode::Type GetSubsequentsMode() { return ESubsequentsMode::TrackSubsequents; }

	void DoTask(ENamedThreads::Type CurrentThread, const FGraphEventRef& MyCompletionGraphEvent)
	{
		check(IsInGameThread());
		TaskDelegate.ExecuteIfBound(MoveTemp(FileContent));
	}
};
```

这个任务的代码就很直接了当了，有两个小点稍微说一下：
1. 你看，我在 DoTask() 里面写了 `check(IsInGameThread())`，确定是**Game Thread**。:)
1. 我通过引擎提供的 `MoveTemp` 模板，实现了`FString FileContent`的**转移拷贝**，减少了内存拷贝；[关于转移语义可以看我之前的博客](https://neil3d.gitee.io/unreal/mcpp-move.html)。

## TaskGraph 框架

- FGraphEvent
- TGraphTask

## To be continued

TaskGraph 这么好用的模块，EPIC竟然没有文档，难道是舍不得给大家用吗？哈哈！

这个例子相当于 Hello World 啦，真正在项目中使用的话，还有些问题要理清。后续我会继续分享 TaskGraph 的实战经验。相关的样例工程在我的 GitHub ：https://github.com/neil3d/UnrealCookBook/tree/master/MakingUseOfTaskGraph