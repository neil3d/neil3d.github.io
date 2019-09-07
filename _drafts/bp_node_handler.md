---
layout: post
title: "深入Unreal蓝图开发：自定义蓝图节点(下)"
author: "燕良"
column: "Unreal Engine"
categories: unreal
tags: [unreal, blueprint]
image:
  path: unreal
  feature: 2019-blueprint-cover3.png
brief: "除了ExpandNode，还有另外一种重要的蓝图扩展方式，就是Node Handler。"
---

通过前面的文章，我们已经能够创建自己的蓝图节点，并可以动态添加、删除Pins，但是感觉好像有什么地方不太对劲啊。你发现没有？前面两篇博客中，我们自定义的蓝图节点都是通过`UK2Node::ExpandNode()`来实现节点的具体功能，然而，这个函数只不过是在内部创建了一些其他的节点，然后把自己的Pins重新连接到新建的节点的Pin之上，本质上这个过程手动连线也可以做啊！  

如果，我们需要做一个全新的蓝图功能节点，无法用现有节点组合完成呢？那要怎么办呢？