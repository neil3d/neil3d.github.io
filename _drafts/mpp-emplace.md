---
layout: post
title: "虚幻4与现代C++：emplace和push/add是啥区别
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover_task.png
  credit: ""
  creditlink: ""
brief: "UE4和C++11的容器都具备emplace API，它和push/insert有什么差别呢？它又是如何实现的呢？"
---

这篇属于那种“并没有卵用”的博客，有用的也就一句话：
* 对于UE4内置的容器来或者STL容器来说，优先使用 emplace 系列 API 吧，因为大多数时候它都比 push_back 之流效率要高；  

剩下的内容主要是为了满足好奇心~，顺便把[前面一篇](http://neil3d.gitee.io/unreal/mcpp-move.html)中没有留下没说的“完美转发”一起说一下。

## 容器的 Emplace 和 Add 的差别

我们先从一个最简单的例子入手：

- 代码1：使用 TArray::Add()
```cpp
TArray<FString> StrArray;
StrArray.Add(TEXT("Hello"));
StrArray.Add(TEXT("Unreal"));
```

- 代码2：使用 TArray::Emplace()
```cpp
TArray<FString> StrArray;
StrArray.Emplace(TEXT("Hello"));
StrArray.Emplace(TEXT("Unreal"));
```

这两段代码**执行的结果是一样的**：也就是得到了一个“含有两个FString对象的数组”。那么它们的差别在什么地方呢？差别就在于“代码2的效率更高”！这主要是因为 Emplace 使用“就地”构建对象的方式，省去了：构造一个临时的 FString 对象，以及 FString 对象的移动拷贝。下面就详细解释一下！

- 当时这一行执行时: `StrArray.Add(TEXT("Hello"))`，编辑器发现 `TArray<FString>::Add()` 函数并不能接收 `TCHAR*` 类型参数，但是它发现 `class FString` 具备`TCHAR*`类型单参数构造函数，于是就调用它构造出一个临时的 FString 对象！接下来 TArray::Add() 内部还是调用了 TArray::Emplace()，这里实际上执行的是 FString 的拷贝构造函数，对这个临时对象进行了一次拷贝。
- 而当这一行执行的时候：`StrArray.Emplace(TEXT("Hello"))`，TArray 在内部的内存中直接使用这个函数的参数来构造一个 FString 对象。

结论：

1. **Add/Push之类的函数的参数是“待添加到容器中的对象”；而 Emplace 函数的参数则是“待插入的对象的构造函数的实参”！**
2. Add/Push往往需要额外的对象构造或者拷贝/移动；而 Emplace 则是在容器内部管理的内存上直接构造容器元素对象！

这么说感觉还不够透彻，下面我们就来看一下`TArray::Emplace()`是如何实现的。

## TArray::Emplace() 实现解析

下面就是引擎中`TArray::Emplace()`的源代码：

```cpp
template <typename... ArgsType>
	FORCEINLINE SizeType Emplace(ArgsType&&... Args)
	{
		const SizeType Index = AddUninitialized(1);
		new(GetData() + Index) ElementType(Forward<ArgsType>(Args)...);
		return Index;
	}
```

这个函数只有三行：
1. 调用 `AddUninitialized()` 确保这个容器具备所需的内存；
2. 使用了一个特殊的 new 操作符，**将函数参数当做构造函数参数，在容器已有的内存上构造元素对象**；
  * 这个可以指定内存地址的 new 操作符叫做：**placement new**；简单说就是在我开辟好的内存上构造对象，跳过默认的new操作符开辟内存的操作；

看完上面这两行代码就可以对前面说的 **Emplace 是在容器内部管理的内存上直接构造容器元素对象！** 能够有足够的理解啦！

这个函数的实现代码还涉及到现代C++的两个常用特性，所以顺带一起说一下吧：
- 可变参数模板， 也就是`template <typename... ArgsType>`这个模板写法；
- 完美转发，也就是：`ElementType(Forward<ArgsType>(Args)...)`

### 可变参数模板(Variadic Templates)

这个其实我们已经在天天使用啦，例如STL的`std::make_shared()`he 引擎提供的`MakeShared()`，它们都是基于这个特性实现的。它的基本语法就是这样的：

- 模板参数可以这样写：`typename... ArgsType`，这个叫做 **模板参数包（template parameter pack)**
- 函数参数则这样写： `ArgsType... args`，这个叫做 **函数参数包（function parameter pack）**

在上面的 `Emplace()` 函数中，它是通过`Forward`模板函数，将`Args`转发到了`ElementType`的构造函数。那么这个`Forward`又是何方神圣呢？


## 延伸阅读

- [Universal References in C++11](https://isocpp.org/blog/2012/11/universal-references-in-c11-scott-meyers), Scott Meyers
- [Variadic templates in C++](https://eli.thegreenplace.net/2014/variadic-templates-in-c/), Eli Bendersky
- 条款42: 考虑置入而非插入（Consider emplacement instead of insertion），*Effective Modern C++*, Scott Meyers