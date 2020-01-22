---
layout: post
title: "虚幻引擎中的现代C++：转移语义和右值引用"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: rendergraph
  feature: falcor_cover.png
  credit: ""
  creditlink: ""
brief: "虚幻引擎基于C++14标准开发，理解并运用好现代C++的语言特性对掌握Unreal C++就至关重要。转移语义是非常重要的，我们就从实用性的角度来理解一下这个概念。"
---

所谓的“现代C++”，就是指C++ 11标准之后的C++语言，与之相对应的是“经典C++”，也就是C++ 98/03标准的C++语言。现代C++在编程上确实和经典C++已经拉开了差距，C++ 11标准出来之后，C++之父曾经有一篇文章：[Learning Standard C++ as a New Language](http://www.stroustrup.com/new_learning.pdf)，当时我就想：哎，如果需要学一门新的语言，我干嘛要学C++？！是的，虽然从事职业C++开发二十余年，但我对C++一直是“爱恨纠缠”。直到最近，由于虚幻4引擎是基于C++14标准开发的，促使我把新标准中的东西认真学了一下！整体学下来，说实话，我开始真的爱上这门语言了！

的确，就像想象的那样：由于C++一直保持着良好的向后兼容，新的标准增加越来越多的特性，使得这门语言更加纷繁复杂。打个不太恰当的比喻，这就像《炉石传说》，每次版本更新都出一堆新的卡牌，让玩家不由的感叹：我太难了！不过，从最佳实践的角度说，其实我们只需要掌握好C++的一个特性集合，能够很好覆盖开发需求就好了，就像炉石里面你把1,2个卡组玩好就行了！

这篇博客就先来聊一下现代C++中最重要的一个特性，*“转移语义（Move Semantics）”*的基础知识，以及我们在虚幻引擎的C++编程中如何理解和运用它。

也许你在网上看过一些C++11的相关文章，往往前面先是大篇幅的讲解什么是“右值引用”，让人看的昏昏欲睡。其实“*右值引用（Rvalue References）*”只是一种底层的语言机制，基于它才能实现所谓的*转移语义（Move Semantics）*和*完美转发（Perfect Forwarding）*。所以在这里，咱们就直奔主题，从Why、What、How三个层面把转移语义搞明白，其中会用到“右值引用”，你自然也能理解了。

## 转移语义解决什么问题？

其实转移语义真的不是啥玄妙的新技术，只是经典C++遗留问题的一个解决方案，当然这个方案是满理想的。经典C++中默认使用值类型，值类型的变量之间只能执行“拷贝语义（Copy Semantics）”。  

![Types](/assets/img/mcpp/herb_sutter_types.png)

  
OK，咱别说的这么玄乎，来看个简单的代码吧。  

我们经常要实现一个类，其内部管理一块内存，或者操作系统句柄之类的资源对象。在经典C++中，一般会在构造的时候创建它们、在析构的时候要释放它们，在*对象复制的时候，需要通过自定义的拷贝构造函数和操作符来实现内部资源对象的复制*。例如这样：
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

为了获得最佳的性能，比较理想的方式是*把那个临时对象所管理的内部资源的所有权转移给新的对象*。那么，怎么转移呢？你需要依C++ 11标准，来实现自己的*转移构造函数和转移赋值函数*。具体代码如下：
``` c++
class MyString {
  char* mData;
  unsigned int mSize;

 public:
    ... ...

  // Move Constructor
  MyString(MyString&& other) {
    mData = other.mData;
    mSize = other.mSize;
    other.mData = nullptr;
    other.mSize = 0;
  }

  // Move Assignment
  MyString& operator=(MyString&& other) {
    mData = other.mData;
    mSize = other.mSize;
    other.mData = nullptr;
    other.mSize = 0;
  }
};
```

你需要注意这两个函数的参数类型是：`MyString&&`，有两个&符合，这个就是“右值引用”啦！因为编译器要明确区分参数类型，才能确定为你调用哪个构造函数或赋值操作符，也就是进行“拷贝”还是“转移”。上面那个`MakeXXXString()`函数的返回值，就是典型的“右值”。当`class MyString`具备在转移构造函数之后，`MyString str = MakeXXXString();`这一句就不会再调用拷贝构造函数了，而是调用转移构造函数，而其内部实现只是内存指针的所有权转移。

上面的描述非常的不精确，但确是“转移语义”的一个最典型的场景，通过这个简单例子，我们先不谈艰涩的语言标准，先把问题搞清楚。顺带说明一下，Move Semantics，很多人也译作“移动语义”，但是我认为“转移语义”更为贴切：它实现的对象内部资源的所有权转移！

说的这里，问题其实就说明白了，本小节可以结束了。嗯，不过，C++11标准库里面还提供了一个`std::move()`，它不是用来实现移动语义的吗？是的，你没说错，std::move()真的什么都没有移动。那它是用来干啥的呢？


## 在Unreal C++编程中运用转移语义

## 参考资料

- [Modern C++: What You Need to Know](https://channel9.msdn.com/Events/Build/2014/2-661),Herb Sutter, MS Build 2014
- [右值引用与转移语义](https://www.ibm.com/developerworks/cn/aix/library/1307_lisl_c11/index.html),李胜利, IBM Developer