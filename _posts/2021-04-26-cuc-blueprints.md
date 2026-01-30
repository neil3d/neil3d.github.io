---
layout: post
title: "虚幻4: 蓝图入门与进阶"
author: "景夫"
column: "Unreal Engine"
categories: unreal
tags: [unreal, blueprint]
image:
  path: unreal
  feature: cuc-blueprints.png
  credit: ""
  creditlink: ""
brief: "中国传媒大学动画学院虚幻4课程第七周+第八周：蓝图入门与进阶，课程录播+课件+参考资料。"
---

有幸受邀为中国传媒大学动画学院的同学们讲授虚幻4蓝图相关的知识。这次的课程面向的同学是有一定编程基础，但是对虚幻4没有太多接触的同学。

内容方面是从蓝图的基本概念讲起，然后涉及到蓝图通信等进阶话题。围绕下面这个 Concept Map 对蓝图作为一种“可视化脚本语言”进行了系统的、相对完整的讲述。  

课件内容大量参考了 Epic Games 官方讲师指南，我做的工作主要是使用现场 DEMO 实例制作的方式，把教学内容中的知识点串起来，希望同学们更有体感，避免枯燥的讲述。

![Blueprint Concept Map](/assets/img/unreal/bp-concept-map.png)
> [点击查看大图](/assets/img/unreal/bp-concept-map.png)  

> [PDF 版下载：Blueprint_poster_18x24.pdf](/assets/pdf/Blueprint_poster_18x24.pdf)


## 第七周：蓝图与关卡蓝图 

- B站课程录播: 
  - [CUC-海绵课堂](https://www.bilibili.com/video/BV1xK4y1P7be)
  - [网友按小节切分的版本](https://www.bilibili.com/video/BV1CU4y1h7fP)
- [课件下载](/assets/pdf/CUC-Week-7.pdf)

<iframe width="100%" src="//player.bilibili.com/player.html?aid=887711110&bvid=BV1xK4y1P7be&cid=327524606&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>

课程内容：
1. 通过 “Hello, World! ” 来讲解蓝图的开发环境，主要是**创建蓝图、蓝图类型、蓝图编辑器等**
2. 通过一个“自动触发打开的门”实例讲解：**构建蓝图 Actor 类，基本组件的使用、组件事件响应**
3. 通过“上锁的门”实例讲解：**蓝图变量，节点、引脚和引线等**基础知识
4. 通过把“锁住的门，自动变成红色”实例讲解：**Construction Script**
5. 通过“可拾取的道具”实例讲解：**蓝图运算符，蓝图数学表达式，Actor事件响应**
5. 通过“道具收集”实例讲解：**蓝图枚举类型的创建和使用，Game Mode，蓝图的基本数据结构（数组、Set、Map），蓝图函数**
6. 通过“在关卡中自动生成一些道具”讲解：**关卡蓝图、Spawn Actor、蓝图随机数**
7. 综合实例讲解：“收集齐所有道具，则可打开锁住的门”实例讲解


## 第八周：蓝图进阶

- B站课程录播:
  - [CUC-海绵课堂](https://www.bilibili.com/video/BV15Z4y1F7rs)
  - [网友按小节切分的版本](https://www.bilibili.com/video/BV1sA411V7az)
- [课件下载](/assets/pdf/CUC-Week-8.pdf)

<iframe width="100%" src="//player.bilibili.com/player.html?aid=375311579&bvid=BV15Z4y1F7rs&cid=329432739&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>


课程内容：
1. **Gameplay 框架入门讲解**
2. 蓝图通信的三种方式
  - 结合“灯+开关”的实例讲解：**蓝图直接通信**，包含蓝图类型转换、自定义事件等其他知识点
  - 结合“与玩家角色面前的多种对象交互”的实例解决：**蓝图接口**通信方式，包含用户输入处理，Sphere Trace 等其他知识点
  - 通过“一个电源总开关，关闭所有电器”的实例讲解：**蓝图事件调度器(Event Dispatcher)**
3. **Timeline 动画控制**
  - 门的开关动画实例讲解，并提示：使用单个Timeline同时处理这两个事件，避免状态错乱  
4. **蓝图与Prefab**
5. 其他蓝图知识点串讲
  - **蓝图结构体**
  - **蓝图调试**
  - **蓝图宏**
  - **蓝图函数库**
  - **Latent Functions**  

## DEMO 工程下载

- 点击跳转至 GitHub ：[课程中现场制作的 Demo 工程](https://github.com/neil3d/UnrealCookbook/tree/master/CUC-Blueprints)



<script type="text/javascript">
  function autoVideoHeight() {
    var iframes = document.getElementsByTagName("iframe");
    var num = iframes.length;
    for (; num > 0; num--) {
        var iframe = iframes[num-1];
        iframe.style.height = iframe.scrollWidth * 0.65 + "px";
    }
  }
  window.onresize = autoVideoHeight();
</script>