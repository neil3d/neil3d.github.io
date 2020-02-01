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

Lambda，就是希腊字母“**λ**”，代表这“λ演算（lambda calculus）”。λ演算由阿隆佐·邱奇（Alonzo Church）引入，1958年有MIT的约翰·麦肯锡（John McCarthy）设计了基于λ演算的LISP语言。

C++11中加入了lambda表达式，C++14补充了。。。。？？？？

一般情况下，lambda函数的语法是这样的：
```
[capture] (parameters) mutable ->return_type {statements}
```
- `[capture]`：捕捉列表，可以捕捉上下文中的变量供lambda函数使用。这个东西看似神奇，也是有坑的，是本文的重点，后面详述；
- `(parameters)`：参数列表，和普通函数参数列表的写法一样；如果没有参数的话，而且不使用`mutable`修饰符的话，则连同`()`可以一起省略；
- `mutable`：默认情况下，lambda是一个const函数，使用mutable修饰符可以取消其常量性；
- `->return_type`：返回值类型定义；在大多数情况下可以连同`->`一起省略，由编译器对返回类型进行推导；
- `{statements}`：函数体；写法和普通函数一样，不过除了参数以外，还可以使用捕捉列表中的变量。


## 理解捕捉列表

如果是在C#中使用Lambda就简单很多了，它有自动垃圾回收、class对象全部是引用类型这些特性，而对于C++来说，对象的生命周期、内存管理这根弦始终要绷紧。在定义Lambda的时候，我们可以捕获当前的作用域的变量，而C++的对象可能在栈（stack）上，也可以在堆（heap）上，所以Capture是Lambda编写最需要注意的地方了。编译器是如何实现这个“捕获”魔法的呢？对于C++来说，真的没什么魔法，必须完全理解编译器的行为，否则它往往就是Crash给你看！

### 基础语法

`[capture]`捕捉列表有多种：
- `[=]`：
- `[&]`：
- 

### 按值捕获 & 捕获时机


### 按引用捕获 & 悬空引用

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

为什么`TestLambda()`直接调用就可以，而`TestLambda`放到Timer里面就会Crash呢？我们要从编译器如何帮我们生成这个`TestLambda`说起。在MS VC环境下，如果你使用代码`typeid(TestLambda).name()`将得到类似这样的一个类型名称：**class <lambda_ab028d6eb4807ccdb45b6cdecd1489f2>**，也就是说TestLambda的类型是一个class，那么如果我们自己写这个class的话，能写成什么样子呢？下面是我的尝试：

``` c++
class MyLambdaClass {
	FString& LocalStr;
public:
	MyLambdaClass(FString& InLocalStr) :LocalStr(InLocalStr) {}

	void operator()() const 
	{
		UE_LOG(LogTemp, Error, TEXT("String = %s ."), *LocalStr);
		LocalStr = TEXT("Lambda string");
	}
};
```

看到上面这个class，应该就很清晰了。C++的闭包对象和C#、Javascript的闭包对象有着本质的差别：对于C++来说，如果你按引用捕获了某个变量，你有责任在调用Lambda的时候保证那个变量仍然存在--责任在你，而不在编译器。在前面的例子中：
- `TestLambda()`直接调用那一句，`FString LocalStr`这个对象还在作用域内，所以可以执行；
- 而在Timer执行的时候，`LocalStr`这个对象已经出了作用域，被析构了，这个时候Lambda中捕获的那个引用就变成了**悬空引用**啦，所以会导致Crash！

### 捕获this

如果this是一个UObject，那么又要操心了！UObject不是具备自动垃圾回收嘛，那还操心啥？  

虚幻的UObject的垃圾回收和C#等语言层面支持的垃圾回收还是两码事，一个UObject对象必须是通过

- 使用FWeakObjectPtr


## 参考资料

- [C++ FAQ]