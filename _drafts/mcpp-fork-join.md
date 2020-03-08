---
layout: post
title: "虚幻4与现代C++：TaskGraph易学易用(下)"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover3.png
  credit: ""
  creditlink: ""
brief: ""
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

- 最大值
- 最小值
- 平均值

最后把这个三个值显示到一个 UMG 的界面上！

> 咋选了这么个古怪的例子呢？呃，本来是想做一个异步加载 N 个 Static Mesh 模型之类的例子，但是异步加载资源的话，其实用 FStreamableManager 更合适。为了避免误解，就想弄个简单计算的例子。

### 分拆任务

首先需要把上述需求分拆成多个小的任务，看看哪些可以并行执行：

| 任务 | 执行线程 | 说明 |
| - | - | - |
| 加载并解析 Json | Any Thread | 加载和解析这两个动作就放在一起了 |
| 计算最大值 | Any Thread | 加载之后即可执行 |
| 计算最小值 | Any Thread | 加载之后即可执行 |
| 计算平均值 | Any Thread | 加载之后即可执行 |
| 完成通知 | Game Thread | 通知界面更新 |

看下面这个图可能更直观一点：

![task graph - fork jon](/assets/img/mcpp/taskgraph-forkjoin.svg)

### 使用 Context 对象在任务之间传递/共享数据

在正式开始编写任务之前，我们需要先解决数据在任务之间“传递”和“共享”的问题。在这里，我打算使用一个 Context 对象存储所有数据的方式，这也是引擎中很多 TaskGraph 所使用的方式。

下面是一个任务数据的详细分析：

| 数据项	| 主线程：任务发起 |	异步任务：加载并解析 |	异步任务：计算X3 |	主线程：UI更新 |
| - | - | - | - | - |
| 数据文件路径 | 写入 |	只读 |	NA |	NA |
| Json 数据对象 |	NA |	写入 |	只读 |	NA |
| 计算结果X3 |	NA |	NA | 写入 |	只读 |

经过上面的分析之后，我设计了下面的数据结构，这个对象将在主线程和几个异步任务之间共享，并且决定：**不需要加锁**！

```cpp
struct FStockAnalyzeContext
{
	FString DataFilePath;
	TSharedPtr<FJsonObject> StockData;
	float MaxValue = 0;
	float MinValue = 0;
	float AverageValue = 0;
};
```

> 那个 Json 对象，使用“	TSharedPtr<FJsonObject, ESPMode::ThreadSafe> StockData”感觉更好一点，不过，引擎中的 JSON 序列化代码的参数写死了，只支持上面那个指针类型。:(

我们将在一个测试用的 Actor 对象里面存储一个 FStockAnalyzeContext 实例，然后在不同的 Task 之间共享它。

决定了这个 Context 数据结构之后，下面就是挨个实现每个 Task 了！

### 任务实现：异步加载/解析 JSON

这个 Task 很简单，基本上就是把前一篇博客：[]() 中的 `FTask_LoadFileToString` 稍加改造，在 `DoTask()` 中加上 Json 解析，并去掉派发子任务逻辑即可：

```cpp
```

### 任务实现：计算平均值

### 任务实现：完成通知

### 派发所有任务

## 小结

## 完整源代码

## 延伸阅读

- [Wiki: Fork-Join](http://en.wikipedia.org/wiki/Fork%E2%80%93join_model)