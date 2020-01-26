---
layout: post
title: "虚幻引擎中的现代C++：转移语义和右值引用"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover.png
  credit: ""
  creditlink: ""
brief: "虚幻引擎基于C++14标准开发，理解并运用好现代C++的语言特性对掌握Unreal C++就至关重要。转移语义是非常重要的，我们就从实用性的角度来理解一下这个概念。"
---

所谓的“现代C++”，就是指C++ 11标准之后的C++语言，与之相对应的是“经典C++”，也就是C++ 98/03标准的C++语言。Unreal Engine 4使用C++14标准开发，用到了很多现代C++的特性，然而它又没有使用标准库，对我们理解和运用它有帮助也有困扰。于是，打算把自己对于虚幻引擎中的现代C++编程的理解整理成博客，希望对Unreal C++开发的朋友有点帮助。这一系列博客主要还是讲现代C++的基础编程为主，并注重在虚幻引擎开发中的实用性。

首先，我们来聊一聊**转移语义（Move Semantics）**，这是现代C++中最重要的一个特性了。也许你在网上看过一些C++11的相关文章，往往前面先是大篇幅的讲解什么是“右值引用”，让人看的昏昏欲睡，然而“**右值引用（Rvalue References）**”只是一种底层的语言机制，基于它才能实现所谓的**转移语义（Move Semantics）**和**完美转发（Perfect Forwarding）**。在这里，咱们就直奔主题，从Why、What、How三个层面把转移语义搞明白，其中会用到“右值引用”，自然也能理解了。

## 转移语义解决什么问题？

“转移语义”真的不是啥玄妙的新技术，只是经典C++遗留问题的一个解决方案。在C++中默认使用值类型，值类型的变量之间只能执行“**拷贝语义（Copy Semantics）**”。  

![Types](/assets/img/mcpp/herb_sutter_types.png)

OK，咱别说的这么玄乎，来看个简单的例子吧。我们经常要实现一个类，其内部管理一块内存，或者操作系统句柄之类的资源对象。在C++中，一般会在构造的时候创建它们、在析构的时候要释放它们。**经典C++执行对象复制的时候，需要通过自定义的拷贝构造函数和操作符来实现内部资源对象的复制**。例如这样：

``` c++
class MyString {
  char* mData;
  unsigned int mSize;
 public:
  MyString() : mData(NULL), mSize(0) {}
  ~MyString() {
    if (mData) delete[] mData;
  }
  MyString(const MyString& other) {
    if (other.mSize > 0 && other.mData) {
      mData = new char[other.mSize];
      mSize = other.mSize;
      memcpy(mData, other.mData, mSize);
    } else {
      mData = NULL;
      mSize = 0;
    }
  }
  ... ...
};
```

当下面代码运行的时候，它就会在栈上开辟一个临时对象，然后再调用拷贝构造函数，进行一次内存拷贝，然后把原来那个临时对象析构掉。你是不是发现问题了？这太笨拙了吧？！

``` c++
MyString MakeXXXString() {
  MyString tmp("blah blah");
  tmp += "blah blah";
  return tmp;
}

MyString str = MakeXXXString();
```

为了避免这种笨拙的操作，C++11标准中就引入了“转移语义”。

## 如何实现转移语义？

为了获得更好的性能，上面那种情况下，理想的处理方式是*把那个临时对象所管理的内部资源的所有权转移给新的对象*。那么，怎么转移呢？你需要依C++ 11标准，来实现自己的**转移构造函数（Move Constructor）**和**转移赋值函数（Move Assignment）**。具体代码如下：

``` c++
class MyString {
  char* mData;
  unsigned int mSize;

 public:
    ... ...

  MyString(MyString&& rhs) {
    moveFrom(rhs);
  }

  MyString& operator=(MyString&& rhs) {
    moveFrom(rhs);
    return *this;
  }

private:
  void moveFrom(MyString&& rhs){
    mData = rhs.mData;
    mSize = rhs.mSize;
    rhs.mData = nullptr;
    rhs.mSize = 0;
  }

};
```

在上面这段代码中，我们实现了一个转移构造函数（Move Constructor）和一个转移赋值操作符（Move Assignment），它们的核心操作都由`moveFrom()`函数实现。这个函数很简单，就是把原来那个对象中的内存指针和状态值复制到这个对象内，然后把原来那个对象的指针置空，这样那个对象在析构的时候就不会释放这块内存了。于是，也就完成了**内部资源的所有权转移**。

如果你没有实现拷贝构造函数和拷贝赋值操作符，编译器会在需要的时候自动帮你实现一个；但是转移构造函数和转移赋值操作符则不会自动生成，如果你没有自己实现的话，编译器会转而调用拷贝构造函数或者拷贝赋值操作符。（C++编译器总是很热心，努力帮你把代码编译通过，除了这个，还有隐式类型转换，都是很容易出问题的地方）

上面的描述就是“转移语义”的一个最典型的场景。通过这个简单例子，我们先不谈艰涩的语言标准，先把问题和解决方法搞清楚。顺带说明一下，Move Semantics，很多人也译作“移动语义”，但是我认为“转移语义”更为贴切：它实现的对象内部资源的所有权转移！

在Unreal引擎中没有使用STL，而是使用了自定义的各种容器和算法。它的TArray、TMap、TSet、FString等，也都和STL容器一样实现了转移构造函数和转移赋值操作符。我们来用TArray做个简单的测试：

``` c++
	TArray<int32> a1 = { 2,2,3,3 };
	TArray<int32> a2 = MoveTemp(a1);
```

这两行代码执行之后，`a1.Num()`和`a2.Num()`各自会是多少呢？实际的情况是a1已经为空了，a2有那四个元素。这是因为第二行代码已经将a1的内部资源转移到a2了。

## 右值引用和MoveTemp

需要注意`class MyString`的转移构造函数和转移赋值操作符的参数类型是：`MyString&&`，有两个&符合，这个就是“右值引用”啦！因为编译器要明确区分参数类型，才能确定为你调用哪个构造函数或赋值操作符，也就是进行“拷贝”还是“转移”。上面那个`MakeXXXString()`函数的返回值，就是典型的“右值”。当`class MyString`具备在转移构造函数之后，`MyString str = MakeXXXString();`这一句就不会再调用拷贝构造函数了，而是调用转移构造函数，而其内部实现只是内存指针的所有权转移。

那么`&&`是否就一定是“右值引用”类型呢？其实不然，这个还涉及到“**万能引用（Universal Reference）**”和“**完美转发（Perfect Forwarding）**”，我打算在后面一篇博客中再细说。

说的这里，问题其实就说明白了，本小节可以结束了。嗯，不过，C++11标准库里面还提供了一个`std::move()`，它不是用来实现移动语义的吗？是的，你没说错，std::move()真的什么都没有移动。那它是用来干啥的呢？

## 在Unreal C++编程中运用转移语义

## 参考资料

- [UE4 Coding Standard](https://docs.unrealengine.com/en-US/Programming/Development/CodingStandard/index.html)
- [Modern C++: What You Need to Know](https://channel9.msdn.com/Events/Build/2014/2-661),Herb Sutter, MS Build 2014
- [右值引用与转移语义](https://www.ibm.com/developerworks/cn/aix/library/1307_lisl_c11/index.html),李胜利, IBM Developer