---
layout: post
title: "虚幻4与现代C++：Emplace与完美转发"
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

### 完美转发(Perfect Forwarding)

所谓“完美转发”，就是在写函数**模板**的时候，把任意类型的实参完全不变的转发到其他函数；这里的完全不变，除了参数的类型外还包括一些其他属性：**是左值还是右值，常量性（即const修饰符）等**。

下面还是通过一个简短的例子来看一下：
> 其中使用了特殊的宏: __FUNCSIG__，打印出函数的完整签名（例如：void __cdecl testProcess<int&>(int &)） , 在Visual C++环境下可编译运行

```cpp
#include <iostream>

void processMyObject(int& l) {
	std::cout << "Func 1. processing LValue" << std::endl;
}

void processMyObject(int&& r) {
	std::cout << "Func 2. processing RValue" << std::endl;
}

template<typename T>
void testProcess(T&& a) {
	std::cout << __FUNCSIG__ << std::endl;
	processMyObject(std::forward<T>(a));
}

int main() {
	int a;
	testProcess(a);
	testProcess(std::move(a));
	return 0;
}
```

上面这段代码核心的部分是`testProcess()`这个函数模板，它的要点有两个：
* 参数类型为：`T&&`，这里也用了两个`&`，单它并不是我们前面所说的“右值引用”，而被称为“万能引用”；
* 使用了`std::forward()`这个函数模板。

#### 万能引用（Universal References）

粗略的说：在**需要编译器推导的类型后面跟上`&&`**就是万能引用，也有人称之为“转发引用（forwarding references）”；相对应的：类似`FString&&`这样**确定类型后面跟上`&&`**才是右值引用。看一些例子：

```cpp
	template<typename T>	void func1(T&& p);	// 万能引用
	auto&& x = MakeSomeObject();	// 万能引用

	FString&& y = MakeSomeString();	// 右值引用
	template<typename T> void func2(TArray<T>&& arr)	// 右值引用
```

`T&&`之所以被称为“万能引用”，是因为他既可以代表左值引用，也可以代表右值引用；可以帮到到 const 或者 非const 变量，它和前面说的“右值引用”的含义和作用有本质的区别。搞清楚这两者的区别，也就理解了“完美转发”的一半。

#### Forward 函数模板

只有万能引用还不够，因为函数的实参全都是左值（它的类型可以是右值引用，但它仍然是一个左值），所以在编写函数模板的时候，要对万能引用使用 `Forward` 才能实现完美转发。就上面那个例子来说，如果不加这个`std::forwad`的话，则`testProcess(std::move(a))`也会运行到“Func 1”那个函数。

其实`Forward` 并不做任何转发的工作，就像`MoveTemp`不做任何的移动操作一样，它们本质上都是一个强制类型转换，其源代码如下：

```cpp
template <typename T>
T&& Forward(typename TRemoveReference<T>::Type&& Obj)
{
	return (T&&)Obj;
}
```

这里用到了`TRemoveReference`这个模板，顺带提一下吧：
- 它的作用就是**去掉`&`或者`&&`，保证获得一个引用类型**
- 它是通过模板的偏特化来实现的：

```cpp
/* TRemoveReference<type> will remove any references from a type. */
template <typename T> struct TRemoveReference      { typedef T Type; };
template <typename T> struct TRemoveReference<T& > { typedef T Type; };
template <typename T> struct TRemoveReference<T&&> { typedef T Type; };
```

## 延伸阅读

- [Universal References in C++11](https://isocpp.org/blog/2012/11/universal-references-in-c11-scott-meyers), Scott Meyers
- [Variadic templates in C++](https://eli.thegreenplace.net/2014/variadic-templates-in-c/), Eli Bendersky
- 条款42: 考虑置入而非插入（Consider emplacement instead of insertion），*Effective Modern C++*, Scott Meyers