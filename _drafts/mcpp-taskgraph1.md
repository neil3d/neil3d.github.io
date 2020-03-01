---
layout: post
title: "虚幻4与现代C++：TaskGraph易学易用(上)"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover3.png
  credit: ""
  creditlink: ""
brief: "基于Task的并行编程是现代C++的一个趋势，虚幻4中的TaskGraph也是这样一个方向。这个博客分享一下 TaskGraph 的基本用法。"
---

## Part 1
C++ 20 Task Blocks, PPL, TBB简介
http://www.modernescpp.com/index.php/task-blocks

http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2015/n4411.pdf

![task-blocks](/assets/img/mcpp/fork_join.png)

## 虚幻4的 TaskGraph 简介

## 实例讲解：异步加载文本文件

- FirstAsyncTask.h
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

- FirstAsyncTask.cpp
``` cpp
void AFirstAsyncTask::AsyncLoadTextFile(const FString& FilePath)
{
	FTaskDelegate_FileLoaded TaskDelegate;
	TaskDelegate.BindUFunction(this, "OnFileLoaded");

	TGraphTask<FTask_LoadFileToString>::CreateTask().ConstructAndDispatchWhenReady(FilePath, TaskDelegate);
}
```


### Part 2.1
分析引擎中怎么用：SkeletonMesh、Particle
