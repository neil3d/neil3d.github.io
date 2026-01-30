---
layout: post
title: "《炉石传说》架构设计赏析(6)：卡牌&技能数据的运行时组织"
author: "景夫"
column: "Unity3D"
categories: gamedev
tags: [Hearthstone, Game]
image:
  path: hearthstone
  feature: cover.jpg
  credit: "Blizzard"
  creditlink: "http://hs.blizzard.cn"
brief: "接着上一篇文章，继续分析炉石的卡牌和技能。"
---

前一篇文章我们看到了《炉石传说》的核心卡牌数据的存储，今天我们继续探索卡牌&技能。:smile:

### 主要的类

通过之前的分析，卡牌&技能涉及到几个类体系：Entity，Actor，Card，Spell，令人十分困惑，特别是前两者。在这里先略带武断的说一下这几个类的基本定位：

* Entity主要用来做网络数据同步用的；
* Actor主要处理客户端的渲染对象的控制，作为Component挂载在资源对象上；
* Spell是技能Prefab挂载的脚本；
* Card是卡牌Prefab挂载的脚本，在运行时处于中心地位，处理前3者的联系。

#### Entity

* Entity是通过网络数据创建的，主要是Network.PacketID.POWER_HISTORY这个消息。详见GameState.CreateNewEntities()函数。因为Entity并不是MonoBehavior派生类，所以是new出来的，然后添加到GameState中管理（GameState.AddEntity()），网络传来的Entity数据主要是Tags（每个Tag是一个name->value对），然后调用Entity.InitEntity()；

#### Actor

* Actor也是一种资源，通过AssetLoader.LoadActor()加载；
* 对应于AssetFamily.Actor；
* 对应的资源包为“actor?.unity3d”，包内的为GameObject；
* Actor的加载入口是在：Card.DetermineActorThenTransitionToZone()

#### Spell

* Spell的加载入口是在Entity.ProcessCardDefAssetRequest()

#### Card
* 在InitEntity中调用了Entity.InitCard()，它做的工作只是创建一个空的GameObject，然后使用AddComponent把Card添加上去。
* 真正的卡牌Prefab加载是在Entity.LoadCard()中进行的，这个函数是在处理PowerTask时GameState.OnShowEntity()中调用的；
* 具体的加载操作是通过 DefLoader.LoadCardDef()进行的，其内部再调用AssetLoader.LoadCardPrefab()来进行资源加载；

### 卡牌&技能的加载流程  

Entity的创建，以及Card、Spell的加载，都由网络消息触发；整个过程比较复杂，主要是有很多异步回调，比较难用文字描述，请见下图：  

![UML](/assets/img/hearthstone/uml_spell.gif)    

