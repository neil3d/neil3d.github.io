---
layout: post
title: "虚幻4中的C++单元测试"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, c++]
image:
  path: mcpp
  feature: cover5.png
  credit: ""
  creditlink: ""
brief: "在虚幻4项目开发中，利用 Automation 系统进行代码单元测试。"
---

也许是我太擅长写 BUG 吧，反正我一直认为“单元测试”非常之重要：
1. 如果写了一段代码，不知道怎么测试，大多数情况下是有些东西没想清楚；
2. 如果不进行单元测试，出 BUG 的概率是非常高的。

之前在标准C++的开发环境中，也用过类似 GOOGLE gtest 之类的 C++ 单元测试框架，而UE4的C++有点特别。不过，用不用测试框架并不是关键。关键在于：
1. 测试代码要在软件完整生命周期中一直发挥作用，而不是测一下就丢弃了；
2. 要很好的组织测试代码；
3. 要很方便的批量执行，并有良好的测试结果输出；

话虽然这么说，但拥有一个好用的测试框架会方便很多。最近我就尝试了使用 UE4 内部提供的 Automation 自动化测试功能，值得推荐。

## 5分钟上手 Automation 测试框架

咱们先看一下疗效吧：

![automation window](/assets/img/ucookbook/cpp_unit/02_my_simple_test.png)

- 可以使用 C++ 编写测试用例；Automation 会列出来，展示到上面这个窗口中，支持多级分类；见上图的②部分；
- 通过点击工具栏按键“Start tests”，就可以运行选中的所有测试用例，见上图的①；
- 测试结果会输出到③区域，并且在右侧的进度条也有相应的统计；

OK，看上去还不错吧！所以，咱们就不用自己费力整合 gtest 之类的第三方测试框架了，UE4内部已经有了一个这么好的单元测试框架了。

下面就来看一下怎么用，总共也就分三步：

- 首先要开启相关的插件。通过编辑器菜单“Editor-->Plugins”打开这个插件窗口，选中“Testing”分类，开启相关的插件：
![enable plugins](/assets/img/ucookbook/cpp_unit/01_enable_plugins.png)

- 然后，就是写测试用例的代码了。可以给项目添加一个或多个 .cpp 文件，用来存放测试代码，文件样例如下：

```cpp
#include "CoreTypes.h"
#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMySimpleTest, "UnrealCookbook.MySimpleTest",
                                 EAutomationTestFlags::ApplicationContextMask |
                                     EAutomationTestFlags::SmokeFilter)

bool FMySimpleTest::RunTest(const FString& Parameters) {
  TestEqual(TEXT("My first test case"), 2, 1 + 1);

  TestEqual(TEXT("My second test case"), 2, 2 + 1);
  return true;
}

#endif  // WITH_DEV_AUTOMATION_TESTS
```

- 简单说明一下：
    * 需要 include 这个"Misc/AutomationTest.h"头文件；
    * 我们使用了一个条件编译宏：WITH_DEV_AUTOMATION_TESTS ，这样在 shipping build 将不会包含这些代码；
    * 使用了 IMPLEMENT_SIMPLE_AUTOMATION_TEST 来定义一个简单的单元测试类：
      1. 第一个参数是类名；这个类实际上是 FAutomationTestBase 的派生类，即: `class FMySimpleTest: public FAutomationTestBase`；
      2. 第二个参数是一个字符串，中间可以用点号分割；用来产生上面那个窗口中的分类，例如：`UnrealCookbook.MySimpleTest`
    * 实现上面定义的这个类的 `RunTest()` 方法，在里面编写自己的一些测试用例，可以利用基类的 `TestEqual()` 等函数来进行结果验证。

- 完成了测试用例代码之后，编译项目，并启动编辑器。在编辑器的 Window 菜单中，就可以打开最开始那个窗口了：
![open test window](/assets/img/ucookbook/cpp_unit/03_open_window.png)

- 如果有测试用例没有通过的话，可以打开 Message Log 窗口来查看详情，包括错误信息、测试用例的代码位置都有清晰的呈现：
![error log](/assets/img/ucookbook/cpp_unit/06_error_log.png)

## 测试 Actor 派生类的 C++ 代码

上面这种 Simple Automation Test 测试纯逻辑、数据计算之类的代码很方便，但是我还有大量的代码是需要在关卡中测试的，也就是需要使用 Actor 的派生类来写单元测试，这个能支持吗？答案当时是：可以的！

可以看一下引擎中的“FunctionalTesting”这个模块（UE4/Source/Developer/FunctionalTesting），我们可以利用其中提供的基类：`class AFunctionalTest : public AActor`。

需要做这样几步：
1. 创建一个 AFunctionalTest 的派生类
2. 重载 PrepareTest()、StartTest()、FinishTest()等函数，来完成测试用例的开发；在测试用例中，可以调用基类的 Assert 相关函数验证测试结果；
3. 需要手动创建一个测试关卡，并把这个测试 Actor 丢到场景中；
3. 同样，在编辑器开启 Automation 窗口，这次点击工具栏的“Run Level Test”就可以进行测试了。
![actor test window](/assets/img/ucookbook/cpp_unit/04_test_actor_wnd.png)

下面是一个简单的 Actor 单元测试样例代码：

```cpp
#pragma once
#include "CoreMinimal.h"
#include "FunctionalTest.h"
#include "MyFunctionalTestActor.generated.h"

UCLASS()
class CPPUNITTEST_API AMyFunctionalTestActor : public AFunctionalTest {
  GENERATED_BODY()

 public:
  virtual void StartTest() override {
    AFunctionalTest::StartTest();

    AssertIsValid(this, TEXT("My first functional test"));
    AssertValue_Int(1 + 1, EComparisonMethod::Equal_To, 2,
                    TEXT("My 2nd functional test"));
    AssertValue_Int(1 + 1, EComparisonMethod::Not_Equal_To, 2,
                    TEXT("My 3rd functional test"));
  }
};
```

## 测试 Actor 派生类的蓝图代码

既然 C++ 的 Actor 代码能测试，那么蓝图呢？当然也可以啦。

1. 创建一个 AFunctionalTest 的派生类；
2. 在 Event Graph 中，实现响应基类提供的 **Prepare Test** 和 **Start Test** 事件相应即可；同样是调用 Assert 族函数对测试结果进行验证即可；
![bp test](/assets/img/ucookbook/cpp_unit/05_bp_test.png)

## 小结

- Automation 测试框架还是挺好用的，推荐大家用起来；
- Simple Test、Actor Test 的管理足够用了，没什么好抱怨的；
- 另外，引擎还提供了 Complex Test、截屏对比测试，有需要的话，可以看看官方文档；

这个博客相关的完整工程在我的 GitHub 上：[UnrealCookbook.CppUnitTest](https://github.com/neil3d/UnrealCookbook/tree/master/CppUnitTest) 。

## 延伸阅读

- 引擎中还有很多测试代码供参考：  
![core test](/assets/img/ucookbook/cpp_unit/01_core_tests.png)
- 官方文档：[Automation System Overview](https://docs.unrealengine.com/en-US/Programming/Automation/index.html)
- 官方文档：[Automation Technical Guide](https://docs.unrealengine.com/en-US/Programming/Automation/TechnicalGuide/index.html)
- 官方文档：[Framework for Functional Testing](https://docs.unrealengine.com/en-US/Programming/Automation/FunctionalTesting/index.html)