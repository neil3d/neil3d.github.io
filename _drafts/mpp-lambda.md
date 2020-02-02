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

## C++ lambda 基础知识

lambda ，就是希腊字母“**λ**”，据说是代表着“λ演算（lambda calculus）”。C++11开始支持Lambda，可以说它只是一个便利机制。Lambda能做的事情，本质上都可以手写代码完成，但是它确实太方便了！怎么说呢，还好以前我没有好好学std::bind各种绕法，现在用lambda方便多了。

我们可以通过简单的例子初步认识一下。假设我们需要对一个字符串数组进行按长度排序：

- 使用虚幻引擎的TArray

```c++
TArray<FString> StrArray = { TEXT("Hello"), TEXT("Unreal"), TEXT("Engine")};
StrArray.Sort(
	[](const FString& A, const FString& B) {
	return A.Len() < B.Len();
	}
);
```

- 使用C++标准库
```c++
std::vector<std::string> str_array = { "hello","modern","c++" };
std::sort(std::begin(str_array), std::end(str_array), 
	[](const auto& str1, const auto& str2) {
	return str1.length() < str2.length();
	}
);
```

上面代码中由`[]`开头的那一串就是lambda了。在大多数情况下我们就使用“lambda”这个名词就够了，但其实仔细想想，上述代码涉及到三个概念：
- lambda表达式（lambda expression）
- 闭包（closure）
- 闭包类（closure class）  

下面我们就挨个看一下。

### lambda 表达式（lambda expression）

```
[ captures ] ( params ) -> return_type { body }
```
- `[capture]`：捕捉列表，可以捕捉上下文中的变量供lambda函数使用。这个东西看似神奇，也是有坑的，是本文的重点，后面详述；
- `(parameters)`：参数列表，和普通函数参数列表的写法一样；如果没有参数的话，而且不使用`mutable`修饰符的话，则连同`()`可以一起省略；
- `mutable`：默认情况下，lambda是一个const函数，使用mutable修饰符可以取消其常量性；
- `->return_type`：返回值类型定义；在大多数情况下可以连同`->`一起省略，由编译器对返回类型进行推导；
- `{statements}`：函数体；写法和普通函数一样，不过除了参数以外，还可以使用捕捉列表中的变量。

### 闭包（closure）和闭包类（closure class）

闭包是一个对象，是一个匿名的函数对象（ function object ）。


## 捕捉列表“有坑”

如果是在C#中使用Lambda就简单很多了，它有自动垃圾回收、class对象全部是引用类型这些特性，而对于C++来说，对象的生命周期、内存管理这根弦始终要绷紧。在定义Lambda的时候，我们可以捕获当前的作用域的变量，而C++的对象可能在栈（stack）上，也可以在堆（heap）上，所以Capture是Lambda编写最需要注意的地方了。编译器是如何实现这个“捕获”魔法的呢？对于C++来说，真的没什么魔法，必须完全理解编译器的行为，否则它往往就是Crash给你看！

### 基础语法

`[capture]`捕捉列表有多种：
- `[=]`：
- `[&]`：
- 

### 按值捕获 & 捕获时机

按值捕获就是在创建闭包的时候，将当前作用域内的变量赋值到闭包类的成员变量中，这个比较好理解，但是也有一个小小的坑。请看下面代码：

``` c++
FString LocalStr = TEXT("First string");

auto TestLambda = [LocalStr]()  {
	UE_LOG(LogTemp, Error, TEXT("String = %s ."), *LocalStr);
};

LocalStr = TEXT("Second string");
TestLambda();
```

当调用`TestLambda()`的时候，也许会有点surprise，因为输出的还是：String = First string。这就是要注意的地方，当闭包生成的那一刻，被捕获的变量已经按值赋值的方式进行了捕获，后面那个`LocalStr`对象再怎么变化，已经和闭包对象里面的值没有关系了。

### 按引用捕获 & 悬空引用

悬空引用（ dangling references ）就是说我们创建了一个对象的引用类型的变量，但是被引用的对象被析构了、无效了。一般情况下，引用类型的变量必须在初始化的时候复制，较少遇到这种情况，但是如果lambda被延迟调用，在调用时，已经脱离了当前的作用域，那么按引用捕获的对象很可能会出现悬空引用。  

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

上面这段的代码，在定义lambda之后立即调用则可以运行，同样一个labmda放入timer则会crash！这是为什么呢？  

我们要从编译器如何帮我们生成这个`TestLambda`说起。在MS VC环境下，如果你使用代码`typeid(TestLambda).name()`将得到类似这样的一个类型名称：**class <lambda_ab028d6eb4807ccdb45b6cdecd1489f2>**，也就是说TestLambda的类型是一个class，那么如果我们自己写这个class的话，能写成什么样子呢？下面是我的尝试：

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

> 实际上编译器生成的闭包类（closure class）要比这个更复杂一些，主要是增加拷贝构造啊，赋值操作符啊等等，还包括一个自定义的类型转换操作符，用来转换成函数指针。这里只列出了最核心的点相关的代码。

看到上面这个class，应该就很清晰了。C++的闭包对象与C#、Javascript的闭包对象有着本质的差别：对于C++来说，如果你按引用捕获了某个变量，你有责任在调用Lambda的时候保证那个变量仍然存在--责任在你，而不在编译器。在前面的例子中：
- `TestLambda()`直接调用那一句，`FString LocalStr`这个对象还在作用域内，所以可以执行；
- 而在Timer执行的时候，`LocalStr`这个对象已经出了作用域，被析构了，这个时候Lambda中捕获的那个引用就变成了**悬空引用**啦，所以会导致Crash！

### 捕获UObject指针

虚幻的UObject具备自动垃圾回收机制，但这个机制是基于对象之间的引用关系的（ FGCObject 也可以），也就是说一个 UObject 指针被捕获之后，是可能被垃圾回收的。

一般情况下，我们不希望lambda影响对象的生命周期，所以建议使用 FWeakObjectPtr ，例如这样：

```c++
TWeakObjectPtr<AActor> ActorPtr(TargetActor);
auto ObjectLambda = [ActorPtr](const FVector& Offset) {
	if (ActorPtr.IsValid()) {
		AActor* TargetActor = ActorPtr.Get();
		TargetActor->AddActorWorldOffset(Offset);
	}
};
```

## 参考资料

- [Lambda expressions (since C++11)](https://en.cppreference.com/w/cpp/language/lambda), cppreference.com
https://arne-mertz.de/2015/10/new-c-features-lambdas/