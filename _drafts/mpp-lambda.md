---
layout: post
title: "虚幻引擎与现代C++：不简单的lambda表达式"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover_task.png
  credit: ""
  creditlink: ""
brief: "TODO"
---

## C++ Lambda 基础知识

Lambda，就是希腊字母“**λ**”

[capture](param) mutable_opt throwSpec_opt ->retType_opt {}

## Capture

如果是在C#中使用Lambda就简单很多了，它有自动垃圾回收、class对象全部是引用类型这些特性，而对于C++来说，对象的生命周期、内存管理这根弦始终要绷紧。在定义Lambda的时候，我们可以捕获当前的作用域的变量，而C++的对象可能在栈（stack）上，也可以在堆（heap）上，所以Capture是Lambda编写最需要注意的地方了。编译器是如何实现这个“捕获”魔法的呢？对于C++来说，真的没什么魔法，必须完全理解编译器的行为，否则它往往就是Crash给你看！

按值捕获

按引用捕获

### 当心悬空引用

我们先来看一段代码：

```c++
  FString LocalStr = TEXT("Local string");

	auto TestLambda = [&LocalStr]() {
		UE_LOG(LogTemp, Error, TEXT("String = %s ."), *LocalStr);
		LocalStr = TEXT("Lambda string");
	};

	// 在这里直接调用是没问题的
	TestLambda();

	// 在Timer中调用，妥妥的Crash！
	FTimerDelegate Delegate;
	Delegate.BindLambda(TestLambda);

	FTimerHandle TestTimer;
	GetWorldTimerManager().SetTimer(TestTimer, Delegate, 1.0f, true);
```

### 捕获this

如果this是一个UObject，那么又要操心了！

## 参考资料

- [C++ FAQ]