---
layout: post
title: "虚幻4与现代C++：不简单的lambda表达式"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover3.png
  credit: ""
  creditlink: ""
brief: "Lambda可以让代码简化很多，可维护性也能提高很多，但是它也有一些小细节，不小心的话，可能程序Crash了还不知道是哪里的问题。"
---

## C++ lambda 基础知识

lambda ，就是希腊字母“**λ**”，据说是代表着“λ演算（lambda calculus）”。C++11开始支持Lambda，可以说它只是一个便利机制。Lambda能做的事情，本质上都可以手写代码完成，但是它确实太方便了！怎么说呢，还好以前没有好好学std::bind各种绕法，现在用lambda方便多了。

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

上面代码中由`[]`开头的那一串就是lambda了。在大多数情况下我们就使用“lambda”这个名词就够了，但其实仔细想想，其中代码涉及到三个概念：
- lambda表达式（lambda expression）
- 闭包（closure）
- 闭包类（closure class）  

我们通过下面这个例子来看一下：
- 下面这段代码定义了一个变量：myLambda，它就是“闭包”
- myLambda 的类型是一个编译器生成的匿名的类，也就是“闭包类”；
- 这个闭包类是有等号右边的"lambda表达式"生成的，这个lambda表达式：
	* 按值捕获了var1；按引用捕获了var2;
	* 并且接受一个int型参数；
	* 返回一个std::string对象

```c++
int var1 = 100;
std::string var2 = "hello";

auto myLambda = [var1, &var2](int param) -> std::string {
    var2.append(std::to_string(var1));
    var2.append(std::to_string(param));
    return var2;
 };

std::cout << "fistLambda typeid = " << typeid(myLambda).name() << std::endl;
```

我们可以尝试把编译器自动生成的"闭包类"写出来，把“闭包”对象的构造也写出来，就应该能说明问题了。下面这段代码大体上和上面的代码等效：

```c++
int var1 = 100;
std::string var2 = "hello";

class MyClosureClass {
  int var1;
  std::string& var2;

public:
    MyClosureClass(int inVar1, std::string& inVar2)
        : var1(inVar1), var2(inVar2) {}

    // not default constructible
    MyClosureClass() = delete;

    MyClosureClass(const MyClosureClass&) = default;
    MyClosureClass(MyClosureClass&&) = default;
    ~MyClosureClass() = default;

    // not copy assignable
    MyClosureClass& operator=(const MyClosureClass&) = delete;

    // function-call operator
    std::string operator()(int param) {
      var2.append(std::to_string(var1));
      var2.append(std::to_string(param));
      return var2;
    }
    };

    auto myLambda = MyClosureClass(var1, var2);
    std::cout << "myLambda: " << myLambda(2233) << std::endl;
```
> class MyClosureClass 还可能包含一个自定义的类型转换操作符，用来把闭包对象转换成函数指针。

## 捕获列表“有坑”

lambda表达式的常用语法格式如下：
```
[ captures ] ( params ) -> return_type { body }
```
> 为了理解方便，只列出了常用元素，不全面。

其中比较值得一说的就是`[captures]`：捕获列表了！

`[captures]`支持多种写法，首先就是个人不推荐使用的两种默认捕获模式（default capture modes）：

- `[=]`: 按值捕获当前作用域所有变量
- `[&]`: 按引用捕获当前作用域所有变量

从性能、代码可维护性等方面都不建议使用这两种方式。比较常用的写法就是明确列出需要捕获的变量，例如：`[var1, &var2]`, 其中`var1`使用了“按值捕获”模式，`var2`前面加了一个`&`代表着它使用“按引用捕获”的模式。下面就分别讨论一下“按值捕获”和“按引用捕获”有什么坑。

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

当调用`TestLambda()`的时候，也许会觉得意外，输出的还是：String = First string。这就是要注意的地方，当闭包生成的那一刻，被捕获的变量已经按值赋值的方式进行了捕获，后面那个`LocalStr`对象再怎么变化，已经和闭包对象里面的值没有关系了。

如果按引用捕获，则可以跟踪`LocalStr`的更新了，但是按引用捕获的坑更深。

### 按引用捕获 & 悬空引用

如果是在C#中使用 lambda 就简单很多了，它有自动垃圾回收、class对象全部是引用类型这些特性，而对于C++来说，对象的生命周期、内存管理这根弦始终要绷紧。在C++编程中，**程序员有责任保证Lambda调用的时候，保证被捕获的变量仍然存在**--是的，责任在你，而不在编译器。如果不能很好理解这点，就会遇到悬空引用的问题！

悬空引用（ dangling references ）就是说我们创建了一个对象的引用类型的变量，但是被引用的对象被析构了、无效了。一般情况下，引用类型的变量必须在初始化的时候赋值，很少遇到这种情况，但是如果lambda被延迟调用，在调用时，已经脱离了当前的作用域，那么按引用捕获的对象就是悬空引用。  

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

前面基本概念那一部分讲到了`TestLambda`是一个闭包对象，它的类型是编译器生成的一个匿名的class。对于这个例子，我尝试把这个闭包类的核心部分写出来：

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
看到上面这个class，应该就很清晰了：
- `TestLambda()`直接调用那一句，`FString LocalStr`这个对象还在作用域内，所以可以执行；
- 而在Timer执行的时候，`LocalStr`这个对象已经出了作用域，被析构了，这个时候Lambda中捕获的那个引用就变成了**悬空引用**啦，所以会导致Crash！

### 捕获UObject指针

虚幻的UObject具备自动垃圾回收机制，但这个机制是基于对象之间的引用关系的，也就是说一个 UObject 指针被捕获之后，还是可能被垃圾回收的。所以，对于延迟调用的lambda是不建议捕获UObject的；如果实在需要的话建议使用 FWeakObjectPtr ，例如这样：

```c++
TWeakObjectPtr<AActor> ActorPtr(TargetActor);
auto ObjectLambda = [ActorPtr](const FVector& Offset) {
	if (ActorPtr.IsValid()) {
		AActor* TargetActor = ActorPtr.Get();
		TargetActor->AddActorWorldOffset(Offset);
	}
};
```

通过 FWeakObjectPtr 引用 UObject 指针不会影响对象的生命周期，在 `FWeakObjectPtr::IsValid()` 方法中默认会判断当前对象是不是 “Pending Kill” 状态。

如果希望持有某个UObject的强引用，保证它不被垃圾回收，那么建议不要用lambda，而是用 `UObject` 或者 `FGCObject` 的派生类来处理。

## 参考资料

- [Unreal Engine Coding Standard](https://docs.unrealengine.com/en-US/Programming/Development/CodingStandard/#lambdasandanonymousfunctions)
- [Lambda expressions (since C++11)](https://en.cppreference.com/w/cpp/language/lambda), cppreference.com