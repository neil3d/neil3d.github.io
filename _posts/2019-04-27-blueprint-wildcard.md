---
layout: post
title: "深入Unreal蓝图开发：实现蓝图模板函数"
author: "房燕良"
column: "Unreal Engine"
categories: unreal
top: true
tags: [unreal, blueprint]
image:
  path: unreal
  feature: 2019-blueprint-cover.png
brief: "使用UFunction CustomThunk函数方式，实现蓝图模板功能节点，用来处理任意类型的数组，并探索实现细节背后的蓝图机制。"
---

Unreal的蓝图和C++一样，也是一种静态类型的编程语言，它又不像其他静态类型语言那样支持模板，有些时候就觉得很不方便。思考了一下这个问题。想要蓝图节点支持任意类型的参数，主要分为两种情况：

* UObject派生类对象：那很简单了，使用基类指针作为参数就好，在C++里面可以Cast，或者取得对象的UClass，就可以根据反射信息做很多事了；
* Struct类型，或者`TArray<MyStruct>`类型：这个是本文的重点。

其实说蓝图完全不支持“模板”也是不对的，引擎中其实已经有很多能够处理任意Struct或者`TArray<MyStruct>`类型的节点了！官方文档中把这种情况叫做参数“Wildcard”（通配符）。感谢Unreal开源，通过阅读源代码，加上一点实验，就能够搞清楚具体实现方法和背后的细节。

下面主要探讨使用UFUNCTION的`CustomThunk`描述符，**实现自定义的Thunk函数**；然后通过指定meta的`CustomStructureParam`和`ArrayParm`参数，来**实现参数类型“通配符”**！这中间的难点是：**需要明确蓝图Stack的处理方式**。Demo如下图所示：

![Blueprint Generic Array Average](/assets/img/unreal/2019-bp-average.png){: .center-image }

在上图的Demo中：
1. 自定义了一个蓝图Struct：MyStruct
2. 使用C++实现了一个蓝图节点“Show Struct Fields”：可以接受任意UStruct的引用，具体类型可以由C++或者蓝图定义；
3. 蓝图节点“Array Numeric Field Average”：可以接受任意类型的`TArray<MyStruct>`，并对数组中指定的数值型字段求平均；

> 完整的Demo工程可以从我的GitHub下载：[https://github.com/neil3d/UnrealCookBook/tree/master/MyBlueprintNode](https://github.com/neil3d/UnrealCookBook/tree/master/MyBlueprintNode)   

## 实现蓝图功能节点的几种方式

在Unreal开发中可以使用C++对蓝图进行扩展，生成Unreal蓝图节点最方便的方法就是写一个`UFUNCTION`，无论是定义在`UBlueprintFunctionLibrary`派生类里面的static函数，还是定义在UObject、AActor派生类里面的类成员函数，只要加上UFUNCTION宏修饰，并在宏里面添加BlueprintCallable标识符，就可以自动完成蓝图编辑节点、蓝图节点执行调用的整个过程。不过，由于C++和蓝图都属于“静态类型”编程语言，这种形式编写的蓝图节点，所有的输入、输出参数的类型都必须是固定的，这样引擎才能自动处理蓝图虚拟机的栈。

先来总结一下C++实现蓝图节点的几种方式：

1. UFUNCTION，上面已经说过了；
2. 实现`class UK2Node`的派生类，这是最强大的方式，是对蓝图节点最深入的定制开发，如果你需要动态的添加、删除蓝图节点的针脚，就只能用这种方式了。例如我们常用的“Format Text”节点，可以根据输入字符串中的“{index}”来动态增加输入节点，输入节点的类型也是动态的，这个就是通过`class UK2Node_FormatText`这个类来实现的；
3. 还有介于上面两者之间的一种方式，就是在UFUNCTION中使用“CustomThunk”标识，告诉UHT（Unreal Header Tool）不要生成默认的蓝图包装函数，而是由我们手工实现。这种方式，需要手工控制蓝图虚拟机的“栈”，但是不用处理蓝图编辑器UI部分，相对第2种来说代码量要少很多，相对第1种来说，又多了很多控制力；
4. 另外，蓝图的“宏”--Macros，也可以实现自己的节点。

使用第3种方式，结合UFUNCTION的其它meta标识符，可以实现参数类型的“通配符”，就可以实现模板函数，也就是输入、输出参数可以处理多种数据类型，类似C++的泛型。这些meta标识符主要有：
1. `ArrayParm="Parameter1, Parameter2, .."`：说明 BlueprintCallable 函数应使用一个Call Array Function节点，且列出的参数应被视为通配符数组属性；
2. `ArrayTypeDependentParams="Parameter"`：使用 ArrayParm 时，此说明符将指定一个参数，其将确定 ArrayParm 列表中所有参数的类型；
3. `CustomStructureParam="Parameter1, Parameter2, .."`：列出的参数都会被视为通配符。

引擎源代码中，这种编程方式的典型的例子有：
* 蓝图编辑器中的“Utilities”->“Array”菜单中的所有节点，他们可以处理任意的UStruct类型的数组。这些节点对应的源代码是：`class UKismetArrayLibrary`
* `class UDataTableFunctionLibrary::GetDataTableRowFromName(UDataTable* Table, FName RowName, FTableRowBase& OutRow)`

> 详见官方文档：[UFunctions](https://docs.unrealengine.com/en-us/Programming/UnrealArchitecture/Reference/Functions) 

## CustomThunk函数

如果在UFUNCTION宏里面指定了CustomThunk，那么UHT就不会自动生成这个函数的“thunk”，而需要开发者自己实现。这里的“thunk”是什么呢？我们看个例子。

我们来做个最简单的小试验，在工程中建立一个Blueprint Function Library，添加一个简单的UFUNCTION：
``` cpp
#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "MyBlueprintFunctionLibrary.generated.h"

UCLASS()
class MYBLUEPRINTNODES_API UMyBlueprintFunctionLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()
public:
	UFUNCTION(BlueprintCallable)
	static int Sum(int a, int b);
};
```

然后在对应的cpp文件中，使用C++实现这个函数：
``` cpp
#include "MyBlueprintFunctionLibrary.h"

int UMyBlueprintFunctionLibrary::Sum(int a, int b) {
	return a + b;
}
```

项目build一下，然后你就可以在“Intermediate”目录找到这个"MyBlueprintFunctionLibrary.generated.h"文件。在这个文件里面，你可以找到这样一段代码：
``` cpp
    DECLARE_FUNCTION(execSum) \
	{ \
		P_GET_PROPERTY(UIntProperty,Z_Param_a); \
		P_GET_PROPERTY(UIntProperty,Z_Param_b); \
		P_FINISH; \
		P_NATIVE_BEGIN; \
		*(int32*)Z_Param__Result=UMyBlueprintFunctionLibrary::Sum(Z_Param_a,Z_Param_b); \
		P_NATIVE_END; \
	}
```
这段代码就是蓝图函数节点的thunk了！这段代码做了这样几件事：
1. 声明了一个名为“execSum”的函数，函数的签名为：`void func( UObject* Context, FFrame& Stack, RESULT_DECL )`
2. 使用P_GET_PROPERTY宏，从“FFrame& Stack”（也就是蓝图虚拟机的栈）中取出函数参数；
3. 调用`P_FINISH`宏；
4. 使用取出的这些参数调用我们实现的`UMyBlueprintFunctionLibrary::Sum()`函数；

“thunk”函数是一个包装，它完成的核心任务就是处理蓝图虚拟机的Stack，然后调用我们使用C++实现的函数。

我们还可以看一下UHT帮我们生成的另外一个文件：MyBlueprintFunctionLibrary.gen.cpp，在其中有这样一段代码：
``` cpp
void UMyBlueprintFunctionLibrary::StaticRegisterNativesUMyBlueprintFunctionLibrary()
	{
		UClass* Class = UMyBlueprintFunctionLibrary::StaticClass();
		static const FNameNativePtrPair Funcs[] = {
			{ "Sum", &UMyBlueprintFunctionLibrary::execSum },
		};
		FNativeFunctionRegistrar::RegisterFunctions(Class, Funcs, ARRAY_COUNT(Funcs));
	}
```
这段代码把刚才"MyBlueprintFunctionLibrary.generated.h"中声明的`excSum`函数注册到了`UMyBlueprintFunctionLibrary::StaticClass()`这个UClass对象之中，并指定它的名字为“Sum”，也就是我们原始C++代码中声明的函数名，也是在蓝图编辑器中显示的名字。

看清楚了什么是“thunk函数”，“CustomThunk函数”也就不言自明了。在UFUNCTION中指定“CustomThunk”标识符，就是告诉UHT，不要在.generated.h中生成DECLARE_FUNCTION那部分代码，这部分代码改由手写。为啥要抛弃自动生成，而手写呢？回到本文主题：**要实现“参数类型通配符”（或者叫做“蓝图模板节点”），就必须手写thunk！**


## 蓝图Stack探索

要实现自己的thunk函数，核心任务就是“**准确的处理蓝图虚拟机的栈**”，可惜的是官方并没有这方面的文档！下面我就把自己的一些探索记录下来，请大家指正。

以上面的`int Sum(int a, int b)`函数为例，thunk函数使用`P_GET_PROPERTY`宏从Stack取值，这个宏`P_GET_PROPERTY(UIntProperty,Z_Param_a)`展开之后的代码如下所示：
``` cpp
	UIntProperty::TCppType Z_Param_a = UIntProperty::GetDefaultPropertyValue();
	Stack.StepCompiledIn<UIntProperty>(&Z_Param_a);
```
其中`UIntProperty`派生自`TProperty_Numeric<int32>`，`UIntProperty::TCppType`就是“int32”无疑！

我们还需要处理`TArray<MyStruct>`这样的数据，所以我们重点要看一下这种参数类型的栈处理。  
假设我们有一个C++的UStruct：

``` cpp
USTRUCT(Blueprintable)
struct FMyStruct {
	GENERATED_USTRUCT_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	FString Name;

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	int Value;
};
```
类似这样一个UFUNCTION：
``` cpp
UFUNCTION(BlueprintCallable)
static void PrintMyStructArray(const TArray<FMyStruct>& MyStructArray);
```
则在.h中的thunk函数为：
``` cpp
DECLARE_FUNCTION(execPrintMyStructArray) \
	{ \
		P_GET_TARRAY_REF(FMyStruct,Z_Param_Out_MyStructArray); \
		P_FINISH; \
		P_NATIVE_BEGIN; \
		UMyBlueprintFunctionLibrary::PrintMyStructArray(Z_Param_Out_MyStructArray); \
		P_NATIVE_END; \
	} \
```
其中`P_GET_TARRAY_REF(FMyStruct,Z_Param_Out_MyStructArray);`这个宏展开之后的代码为：
``` cpp
PARAM_PASSED_BY_REF(Z_Param_Out_MyStructArray, UArrayProperty, TArray<FMyStruct>)
```
最终展开为：
``` cpp
TArray<FMyStruct> Z_Param_Out_MyStructArrayTemp;
TArray<FMyStruct>& Z_Param_Out_MyStructArray = Stack.StepCompiledInRef<UArrayProperty, TArray<FMyStruct> >(&Z_Param_Out_MyStructArrayTemp);
```

综合上面两个例子，我们发现核心操作都是调用`template<class TProperty> void FFrame::StepCompiledIn(void*const Result)`这个模板函数。通过跟踪这个函数的执行，发现它实际调用了`UObject::execInstanceVariable()`函数。
1. 更新"FFrame::PropertyChainForCompiledIn"这个成员变量；
2. 使用更新后的“FFrame::PropertyChainForCompiledIn”值，更新了"FFrame::MostRecentPropertyAddress"成员变量。

再结合引擎中CustomThunk函数的实现源码，可以得出这样的结论：

1. 通过调用`Stack.StepCompiledIn()`函数，就可以更新蓝图虚拟机的栈顶指针；

2. `Stack.MostRecentPropertyAddress`和`Stack.MostRecentProperty`这两个变量，就是当前参数值的内存地址和反射信息。
  
有了具体变量的内存地址和类型的反射信息，就足够做很多事了。下面我们就开始实践。



## 实践1：接受任意UStruct类型参数

下面我们就看一下文章开头的这张图里面的蓝图节点“Show Struct Fields”是如何接受任意类型UStruct参数的。

先上代码, **BlueprintWildcardLibrary.h**
``` cpp
USTRUCT(BlueprintInternalUseOnly)
struct FDummyStruct {
	GENERATED_USTRUCT_BODY()

};

UCLASS()
class UNREALCOOKBOOK_API UBlueprintWildcardLibrary : public UBlueprintFunctionLibrary {
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, CustomThunk, Category = "MyDemo", meta = (CustomStructureParam = "CustomStruct"))
		static void ShowStructFields(const FDummyStruct& CustomStruct);
	static void Generic_ShowStructFields(const void* StructAddr, const UStructProperty* StructProperty);

	DECLARE_FUNCTION(execShowStructFields) {

		Stack.MostRecentPropertyAddress = nullptr;
		Stack.MostRecentProperty = nullptr;

		Stack.StepCompiledIn<UStructProperty>(NULL);
		void* StructAddr = Stack.MostRecentPropertyAddress;
		UStructProperty* StructProperty = Cast<UStructProperty>(Stack.MostRecentProperty);


		P_FINISH;

		P_NATIVE_BEGIN;
		Generic_ShowStructFields(StructAddr, StructProperty);
		P_NATIVE_END;
	}
};
```

**BlueprintWildcardLibrary.cpp**
``` cpp
#include "BlueprintWildcardLibrary.h"
#include "Engine/Engine.h"

void UBlueprintWildcardLibrary::Generic_ShowStructFields(const void* StructAddr, const UStructProperty* StructProperty) {
	UScriptStruct* Struct = StructProperty->Struct;
	for (TFieldIterator<UProperty> iter(Struct); iter; ++iter) {

		FScreenMessageString NewMessage;
		NewMessage.CurrentTimeDisplayed = 0.0f;
		NewMessage.Key = INDEX_NONE;
		NewMessage.DisplayColor = FColor::Blue;
		NewMessage.TimeToDisplay = 5;
		NewMessage.ScreenMessage = FString::Printf(TEXT("Property: [%s].[%s]"),
			*(Struct->GetName()),
			*(iter->GetName())
		);
		NewMessage.TextScale = FVector2D::UnitVector;
		GEngine->PriorityScreenMessages.Insert(NewMessage, 0);
	}
}
```

解释一下这段代码：
1. 首先声明了一个UFunction：`static void ShowStructFields(const FDummyStruct& CustomStruct);`，其参数类型是“FDummyStruct”，这只是一个占位符；
2. 在UFUNCTION宏里面指定“CustomThunk”和“CustomStructureParam”；
3. 实现一个`execShowStructFields`函数。这个函数很简单，主要是处理蓝图的Stack，从中取出需要的参数，然后对用C++的实现；
4. 具体功能实现在：`static void Generic_ShowStructFields(const void* StructAddr, const UStructProperty* StructProperty)`这个函数中。


## 实践2：对数组中的Struct的数值型求平均

下面我们再来一下文章开头的这张图里面的“Array Numeric Field Average”蓝图节点是如何通过“CustomThunk”函数来实现的。

参照引擎源代码，我定义了这样一个宏，用来从栈上取出泛型数组参数，并正确的移动栈指针：

``` cpp
#define P_GET_GENERIC_ARRAY(ArrayAddr, ArrayProperty) Stack.MostRecentProperty = nullptr;\
		Stack.StepCompiledIn<UArrayProperty>(NULL);\
		void* ArrayAddr = Stack.MostRecentPropertyAddress;\
		UArrayProperty* ArrayProperty = Cast<UArrayProperty>(Stack.MostRecentProperty);\
		if (!ArrayProperty) {	Stack.bArrayContextFailed = true;	return; }
```
通过这个宏，可以得到两个局部变量：
* `void* ArrayAddr`: 数组的起始内存地址；
* `UArrayProperty* ArrayProperty`: 数组的反射信息，`ArrayProperty->Inner`就是数组成员对应的类型了；
  

有了这个宏，我们就可以很方便的写出thunk函数了：
``` cpp
DECLARE_FUNCTION(execArray_NumericPropertyAverage) {

		// get TargetArray
		P_GET_GENERIC_ARRAY(ArrayAddr, ArrayProperty);

		// get PropertyName
		P_GET_PROPERTY(UNameProperty, PropertyName);

		P_FINISH;

		P_NATIVE_BEGIN;
		*(float*)RESULT_PARAM = GenericArray_NumericPropertyAverage(ArrayAddr, ArrayProperty, PropertyName);
		P_NATIVE_END;
	}
```

经过以上的准备，我们就已经可以正确的处理“泛型数组”了。下一步就是对这个数组中指定的数“值类型成员变量”求均值了，这主要依靠Unreal的反射信息，一步步抽丝剥茧，找到数组中的每个变量即可。反射系统的使用不是本文的重点，先看完整代码吧。

### BlueprintWildcardLibrary.h
``` cpp
#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "BlueprintWildcardLibrary.generated.h"

#define P_GET_GENERIC_ARRAY(ArrayAddr, ArrayProperty) Stack.MostRecentProperty = nullptr;\
		Stack.StepCompiledIn<UArrayProperty>(NULL);\
		void* ArrayAddr = Stack.MostRecentPropertyAddress;\
		UArrayProperty* ArrayProperty = Cast<UArrayProperty>(Stack.MostRecentProperty);\
		if (!ArrayProperty) {	Stack.bArrayContextFailed = true;	return; }

UCLASS()
class UNREALCOOKBOOK_API UBlueprintWildcardLibrary : public UBlueprintFunctionLibrary {
	GENERATED_BODY()

public:

	UFUNCTION(BlueprintPure, CustomThunk, meta = (DisplayName = "Array Numeric Property Average", ArrayParm = "TargetArray", ArrayTypeDependentParams = "TargetArray"), Category = "MyDemo")
		static float Array_NumericPropertyAverage(const TArray<int32>& TargetArray, FName PropertyName);
	static float GenericArray_NumericPropertyAverage(const void* TargetArray, const UArrayProperty* ArrayProperty, FName ArrayPropertyName);

public:
	DECLARE_FUNCTION(execArray_NumericPropertyAverage) {

		// get TargetArray
		P_GET_GENERIC_ARRAY(ArrayAddr, ArrayProperty);

		// get PropertyName
		P_GET_PROPERTY(UNameProperty, PropertyName);

		P_FINISH;

		P_NATIVE_BEGIN;
		*(float*)RESULT_PARAM = GenericArray_NumericPropertyAverage(ArrayAddr, ArrayProperty, PropertyName);
		P_NATIVE_END;
	}
};

```

### BlueprintWildcardLibrary.cpp
``` cpp

#include "BlueprintWildcardLibrary.h"
#include "Engine/Engine.h"

float UBlueprintWildcardLibrary::Array_NumericPropertyAverage(const TArray<int32>& TargetArray, FName PropertyName) {
	// We should never hit these!  They're stubs to avoid NoExport on the class.  Call the Generic* equivalent instead
	check(0);
	return 0.f;
}

float UBlueprintWildcardLibrary::GenericArray_NumericPropertyAverage(const void* TargetArray, const UArrayProperty* ArrayProperty, FName PropertyName) {

	UStructProperty* InnerProperty = Cast<UStructProperty>(ArrayProperty->Inner);
	if (!InnerProperty) {
		UE_LOG(LogTemp, Error, TEXT("Array inner property is NOT a UStruct!"));
		return 0.f;
	}

	UScriptStruct* Struct = InnerProperty->Struct;
	FString PropertyNameStr = PropertyName.ToString();
	UNumericProperty* NumProperty = nullptr;
	for (TFieldIterator<UNumericProperty> iter(Struct); iter; ++iter) {
		if (Struct->PropertyNameToDisplayName(iter->GetFName()) == PropertyNameStr) {
			NumProperty = *iter;
			break;
		}
	}
	if (!NumProperty) {
		UE_LOG(LogTemp, Log, TEXT("Struct property NOT numeric = [%s]"),
			*(PropertyName.ToString())
		);
	}


	FScriptArrayHelper ArrayHelper(ArrayProperty, TargetArray);
	int Count = ArrayHelper.Num();
	float Sum = 0.f;

	if(Count <= 0)
		return 0.f;

	if (NumProperty->IsFloatingPoint())
		for (int i = 0; i < Count; i++) {
			void* ElemPtr = ArrayHelper.GetRawPtr(i);
			const uint8* ValuePtr = NumProperty->ContainerPtrToValuePtr<uint8>(ElemPtr);
			Sum += NumProperty->GetFloatingPointPropertyValue(ValuePtr);

		}
	else if (NumProperty->IsInteger()) {
		for (int i = 0; i < Count; i++) {
			void* ElemPtr = ArrayHelper.GetRawPtr(i);
			const uint8* ValuePtr = NumProperty->ContainerPtrToValuePtr<uint8>(ElemPtr);
			Sum += NumProperty->GetSignedIntPropertyValue(ValuePtr);
		}
	}
	// TODO: else if(enum类型)

	return Sum / Count;
}
```