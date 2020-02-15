---
layout: post
title: "深入Unreal蓝图开发：将异步操作封装为蓝图节点"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, blueprint]
image:
  path: unreal
  feature: cover_bp.png
brief: "引擎中提供两种蓝图异步节点的实现方式，这里我们主要介绍 Blueprint Async Action 的实现方式。"
---

​	在蓝图中我们可以使用一些异步节点，典型的就是“Delay”：它并不会阻塞当前的游戏逻辑，而是在指定的时间之后，再执行后面的操作。

![latent](/assets/img/unreal/bp_async/latent.png)

​	"Delay"的实现是在`class UKismetSystemLibrary`中的 `static void	Delay(UObject* WorldContextObject, float Duration, struct FLatentActionInfo LatentInfo )`函数，详见：*EngineDir\Source\Runtime\Engine\Classes\Kismet\KismetSystemLibrary.h* 。这种实现方式叫做 **Latent Function**，这个东西在虚幻3的Unreal Script中就有了。具体实现方式这里就不细说了。因为这种方式应该属于历史遗产啦，现在有另外一种更方便的实现方式：**Blueprint Async Action**。

> 在周期很长的大型项目中，会出现一个问题有不止一种解决方案或者处理手法，这个很好理解：团队在发展，技术在发展，一些东西做着做着有了新想法，老代码跑的很稳定，也懒得改了。虚幻4就是这样一个超长周期的项目，所以也不用迷信引擎源代码，要用历史的、发展的眼光看得它。

## Blueprint Async Action

​	引擎提供了一个基类：`class UBlueprintAsyncActionBase`，只要从它派生，并按照一定的约定来实现这个派生类，在蓝图编辑器中就可以自动产生相应的异步节点啦。下面就通过一个最简单的例子，来看看这个派生类的写法。

​	这个例子很简单，就是发送一个Http请求，根据结果调用“成功”和“失败”两个分支。

![my async node](/assets/img/unreal/bp_async/my_http.png)

### 实例：把HTTP请求封装成一个蓝图的异步节点

首先，需要建立一个 `class UBlueprintAsyncActionBase` 的派生类：
```cpp
UCLASS()
class UBlueprintAsyncHttpRequest : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()
};
```

然后，要为这个类建立一个工厂方法：
1. 这个方法必须设置为*BlueprintCallable*，并标记*BlueprintInternalUseOnly*：`UFUNCTION(BlueprintCallable, meta = (BlueprintInternalUseOnly = "true"))`
1. 这个工厂方法的名称，就会是我们的蓝图节点的名称了；这个函数的参数会变为节点的输入参数；
1. 定义一个 *Multicast Delegate* 类型，作为异步操作的完成通知；这个类可以有多个完成通知，但是签名只能有一个；
1. 使用这个 delegate 类型为类添加成员变量，作为完成通知，这个可以有多个；例如，在这个类里面我定义了*OnSuccess*和*OnFail*两个Delegate，单他们的类型都是`FHttpResponseDelegatge`；

下面就是这个类的核心定义了：

```cpp
UCLASS()
class UBlueprintAsyncHttpRequest : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()
	
public:
	// Factory Method
	UFUNCTION(BlueprintCallable, meta = (BlueprintInternalUseOnly = "true"))
		static UBlueprintAsyncHttpRequest* HttpRequest(const FString& URL);

	UPROPERTY(BlueprintAssignable)
		FHttpResponseDelegatge OnSuccess;

	UPROPERTY(BlueprintAssignable)
		FHttpResponseDelegatge OnFail;
};
```

这个类实现之后，在蓝图编辑器里就可以搜到“HttpRequest”这个节点了。不过，它会有右侧会有三个Exec针脚，就像下图这样：

![my async node](/assets/img/unreal/bp_async/my_http_3exec.png)

这是因为引擎默认有一个*Then*针脚，可以通过为这个UClass设置meta来关闭它：`UCLASS(meta=(HideThen=true))`

### 稍微挖掘一下

​	这些又没有官方文档，我是咋知道的呢？ 是这样的，我稍微挖掘了一下引擎的源代码，上面说的那些规则是从源代码中的两个类来的：

- class UK2Node_AsyncAction : public UK2Node_BaseAsyncTask
  * EngineDir\Source\Editor\Kismet\Public\Nodes\K2Node_AsyncAction.h
- class UK2Node_BaseAsyncTask : public UK2Node
  * EngineDir\Source\Editor\BlueprintGraph\Classes\K2Node_BaseAsyncTask.h

`class UK2Node_AsyncAction` 从 `class UK2Node_BaseAsyncTask` 派生，它们实现的功能大致如下：

- `class UK2Node_AsyncAction` 这个类主要负责绑定`class UBlueprintAsyncActionBase`派生类的工厂方法，也就是上例中的：`UBlueprintAsyncHttpRequest* HttpRequest(const FString& URL);`
- `class UK2Node_BaseAsyncTask` 负责创建节点的基本属性：
  * 使用反射，读取工厂方法的输入参数，作为节点的输入变量
  * 还是通过反射，查找这个类有哪些`UMulticastDelegateProperty`，来创建右侧的Output针脚。前面说的`HideThen`逻辑也是这里实现的；

至于它们具体是如何实现异步操作封装的，有兴趣的朋友可以去研究一下`UK2Node_BaseAsyncTask::ExpandNode()`的实现，我先偷个懒吧！

### 例子完整代码

这个例子的完整工程在这里：https://github.com/neil3d/UnrealCookBook/tree/master/BlueprintAsync

下面是实现这个节点的完整C++代码

#### BlueprintAsyncHttpRequest.h

```cpp
#include "CoreMinimal.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "Http.h"	// HTTP
#include "BlueprintAsyncHttpRequest.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FHttpResponseDelegatge, int32, Code, FString, Data);

UCLASS(meta=(HideThen=true))
class BLUEPRINTASYNC_API UBlueprintAsyncHttpRequest : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()
	
public:
	// Factory Method
	UFUNCTION(BlueprintCallable, meta = (BlueprintInternalUseOnly = "true"))
		static UBlueprintAsyncHttpRequest* HttpRequest(const FString& URL);

	UPROPERTY(BlueprintAssignable)
		FHttpResponseDelegatge OnSuccess;

	UPROPERTY(BlueprintAssignable)
		FHttpResponseDelegatge OnFail;

private:
	void OnHttpResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful);

	void SendRequest(const FString& URL);
};
```

#### BlueprintAsyncHttpRequest.cpp

```cpp
#include "BlueprintAsyncHttpRequest.h"

UBlueprintAsyncHttpRequest* UBlueprintAsyncHttpRequest::HttpRequest(const FString& URL)
{
	UBlueprintAsyncHttpRequest* NewRequest = NewObject<UBlueprintAsyncHttpRequest>();
	NewRequest->SendRequest(URL);
	return NewRequest;
}

void UBlueprintAsyncHttpRequest::SendRequest(const FString& URL)
{
	AddToRoot();

	FHttpModule& HttpModule = FHttpModule::Get();

	TSharedRef<IHttpRequest> Request = HttpModule.CreateRequest();
	Request->SetURL(URL);
	Request->SetVerb("GET");
	Request->OnProcessRequestComplete().BindUObject(this, &UBlueprintAsyncHttpRequest::OnHttpResponse);
	Request->ProcessRequest();
}

void UBlueprintAsyncHttpRequest::OnHttpResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful)
{
	if (bWasSuccessful && Response.IsValid())
	{
		OnSuccess.Broadcast(
			Response->GetResponseCode(),
			Response->GetContentAsString()
		);
	}
	else
	{
		OnFail.Broadcast(-1, TEXT(""));
	}

	RemoveFromRoot();
}
```