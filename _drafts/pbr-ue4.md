---
layout: post
title: "理解PBR：从原理到实现（下）"
author: "燕良"
categories: unreal
tags: [PBR, unreal]
mathjax: true
image:
  path: pbr
  feature: cover_unreal.png
  credit: ""
  creditlink: ""
brief: "前面的文章我们讲了虚幻4中的反射率方程，及其各个部分的公式，这篇文章我们就来讲明白这个方程是如何在实时渲染中求解的！"
---

----------
**【重要提示】**  
* 本文中列出的源代码来自 Unreal Engine 4.20 版本。
* 阅读本文需要两个背景知识：**蒙特卡洛积分** 和 **Image Based Lighting**，如果你对这两不熟悉，可以先看文章后面一半的基础知识部分。  

----------  

在前面的文章中我讲了虚幻4中所使用的反射率方程，其中复杂的部分是 Cook-Torrance BRDF，我们把它带入整个积分，回顾一下完整的反射率方程。

$$
L_o(p, v) = \int\limits_H (k_d\frac{c_{diff}}{\pi} + k_s\frac{D(h)F(l,h)G(l,v,h)}{4 (n \cdot l)(n \cdot v)})L_i(p,l) n \cdot l dl
$$

这样复杂的积分是无法求**解析解**的，只能通过数值计算方法求**数值解**，在图形领域常用的方法就是“蒙特卡洛积分（Monte Carlo integration）”。对于实时渲染来说，我们还需要祭出我们最常用的两大法宝：预计算和糊弄，咳咳，说错了:wink:，近似，approximation！我们还需要另外一个重要的技术，就是 IBL，即Image Based Lighting！把它们组装起来：**把上面这个积分进行恰当的近似，并将能够预计算的部分使用蒙特卡洛积分求出数值解，存储到一个 Cube Map 上。在实时渲染的时候，通过采样 Cube Map 取得 $l$ 方向上的这些预计算值，进行 Shading！**

下面重点讲一下虚幻4在进行预计算的过程中进行了哪些公式推导和近似。我们先来看一下虚幻4文档中的公式推导的第一步：

$$
\int\limits_H L_i(p,l) f(l, v) cos \theta_l dl \approx \frac{1}{N} \sum_{k=1}^{N} \frac{L_i(l_k) f(l_k, v) cos \theta_{l_k}}{p(l_k, v)}
$$

这个约等于确不是糊弄，等式右边就是蒙特卡洛积分公式，其中 $p(l_k, v)$ 就是概率分布函数--pdf。首先要说明的是：**对于渲染方程，pdf 是一个归一化函数（normalized function），即在半球域内的积分值为 1 。** 其次，在虚幻4的 pdf 使用了重要性采样（Importance Sampling）。（上面公式中的$cos \theta_l$就是我们之前公式中的$n \cdot l$）

### Split Sum Approximation

接下来，出于性能方面的考虑，下一步是一个颇有道理的近似。

$$
\frac{1}{N} \sum_{k=1}^{N} \frac{L_i(l_k) f(l_k, v) cos \theta_{l_k}}{p(l_k, v)} \approx (\frac{1}{N} \sum_{k=1}^{N} L_i(l_k) )(\frac{1}{N} \sum_{k=1}^{N} \frac{f(l_k, v) cos \theta_{l_k}}{p(l_k, v)} )
$$

也就是把第一步的蒙特卡洛公式分拆为两个求均值的运算，这样就可以分别进行预计算。这是非常重要的一步，Epic 的大牛给它起了个名字，就叫做：**Split Sum Approximation**。名字起的很好，就是把一个 $\sum$ 拆分成了两个 $\sum \cdot \sum$ !

### 计算第一部分

让我们来聚焦第一部分：

$$
\frac{1}{N} \sum_{k=1}^{N} L_i(l_k) 
$$


#### 重要性采样（Importance Sampling）

先解释一下什么是重要性采样。蒙特卡洛积分的一个焦点就是所谓的“采样（Sampling）”。对于渲染方程，我们能计算的入射光的数量是有限的，所以计算结果和理想积分值会有差距，也就是会产生渲染结果中的 noise 。另外一方面，我们对渲染方程的行为是有一个粗略的概念的，**例如对于非常光滑的表面，那么我们应该在入射光的镜面反射方向周围分配更多的样本**。这种采样的分布控制就是通过 pdf 函数实现的。  

在虚幻4中使用了基于 GGX 分布函数的重要性采样来提高蒙特卡洛积分的精确度。GGX 函数的一个重要参数就是粗糙度。我们可以看一下虚幻4中对应的代码：“Shaders\Private\MonteCarlo.ush”，其中 ImportanceSampleGGX(E, a2) 的第一个参数 E，它的取值是 Hammersley Sequence；第二个参数 a2 的取值是粗糙度的四次方。Hammersley 可以理解为一个随机函数，它从“采样数量”和 index 计算出一个2D随机向量。

``` glsl
float4 ImportanceSampleGGX( float2 E, float a2 )
{
	float Phi = 2 * PI * E.x;
	float CosTheta = sqrt( (1 - E.y) / ( 1 + (a2 - 1) * E.y ) );
	float SinTheta = sqrt( 1 - CosTheta * CosTheta );

	float3 H;
	H.x = SinTheta * cos( Phi );
	H.y = SinTheta * sin( Phi );
	H.z = CosTheta;
	
	float d = ( CosTheta * a2 - CosTheta ) * CosTheta + 1;
	float D = a2 / ( PI*d*d );
	float PDF = D * CosTheta;

	return float4( H, PDF );
}
```

### 计算第二部分

第二部分的公式：

$$
\frac{1}{N} \sum_{k=1}^{N} \frac{f(l_k, v) cos \theta_{l_k}}{p(l_k, v)} 
$$

![lut](/assets/img/pbr/lut.png)


----------
### 基础知识

#### 蒙特卡洛积分（Monte Carlo integration）

对于一些复杂的高维定积分，在图形学中通常使用蒙特卡洛方法。蒙特卡洛本是一个地中海城市的名字，是知名的赌城，用这个名字是代表的随机的意思。下面就说一下它的基本思想。

假设我们需要对 $f(x)$ 在 $[a,b]$ 区间内进行积分：

$$
F = \int _{a}^{b}f(x)dx
$$

我们可以使用蒙特卡洛公式来求出它近似的数值解：

$$
F^{N} = \frac {1}{N}\sum _{i=1}^{N}\frac {f(X_{i})}{ pdf(X_{i}) }
$$

这个公式的意思就是在指定的范围内随机取 N 个只，并计算出相应的 $f(x)$ 值。这些值的平均值就是对理想积分的一个近似数值解。这里面比较重要的就是 *pdf*了。*pdf* 即probability distribution function，概率分布函数。

#### Image Based Lighting


## 结束语

通过这两篇文章，我们把虚幻4中 PBR 方案的理论和实现过程做了一个透彻的分析。对于一个渲染引擎来说，还有 Material Model 等重要话题没有讲，后续后时间会继续分享！这两篇文章一起哈成，自己感觉也很爽，发个图庆祝一下！

![evevalkyrie](/assets/img/pbr/evevalkyrie.jpg)