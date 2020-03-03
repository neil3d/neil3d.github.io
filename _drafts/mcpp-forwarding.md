---
layout: post
title: "虚幻4与现代C++：完美转发"
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
