---
layout: post
title: "《炉石传说》架构设计赏析(3)：Gameplay初探"
author: "燕良"
categories: gamedev
tags: [Hearthstone, Game]
brief: "经过前面两篇文章的分析，我们对炉石的代码已经不陌生了，接下来我初步尝试分析其游戏逻辑代码。"
---


经过前面两篇文章的分析，我们对炉石的代码已经不陌生了，接下来我初步尝试分析其游戏逻辑代码。  

经过前面的分析，我们已经找到了两个关键的类Gameplay和GameState（当然还有我最感兴趣的Spell和SpellController，这两个还要在后面分析）。  

首先我们看一下Gameplay这个类的Awake方法，它完成的主要工作是：

1. 调用“ GameState.Initialize()”创建一个新的GameState实例；
2. 注册CreateGame事件：在Gameplay.OnCreateGame()中响应，主要是
	* 初始化卡背；（本地玩家和远程玩家的卡背ID都通过Player类来读取）；
	* 启动一个Coroutine：NotifyPlayersOfBoardLoad，它做的主要工作是
		* 等待BoardStandardGame对象加载完成；
		* 然后调用所有Player的OnBoardLoaded()，它的主要工作是初始化法力水晶相关的管理逻辑；
3. 使用AssetLoader加载AttackSpellController、SecretSpellController、TurnStartManager等；
	这些类看上去都很重要，我们后续分析游戏逻辑时肯定用得到。
  	
接下来我们要看一下Gameplay.Start()方法，它主要是注册了一些自己关心的网络消息，然后调用
1. Network.StartCountdown()——发送网络消息“BeginPlaying”；
2. Network.GetGameState()——发送网络消息“GetGameState”；
我们在看一下Gameplay.Update()，里面似乎正常情况只是调用GameState.Update()。  
OK，以上就是从MonoBehavior继承来的三个被自动调用的函数。对于游戏逻辑来说，还是没有什么头绪。  

再往下分析，遇到的一个最大的困难是很多操作应该是通过网络交互完成的，例如【认输】操作，分析它是从GameMenu.ConcedeButtonPressed()开始的，一直调用到ConnectAPI.Concede()向服务器发了一个GiveUp消息，但是无法确定它对应的服务器返回消息是什么。  
  
接下来我们先分析一下游戏的回合的流转，还是先看一下相关的类图：  
![UML](/assets/img/hearthstone/uml_gameplay.png)    

回合结束是由玩家点击右侧的【End Trun】操作来触发的，其对应的代码为：InputManager.DoEndTurnButton()，这个函数的逻辑有些费解，目前只能是猜测如下：
* 首先判断当前是否允许访问GameState的OptionsPacket，以及EndTurnButton是否可以操作；
* 然后根据GameState.GetResponseMode()来分两种情况处理：
	* GameState.ResponseMode.OPTION——初步猜测为游戏回合中的正常操作：
	从GameState中取出所有的Network.Options，然后遍历，找到“OptionType.END_TURN”或者OptionType.PASS的对象，然后调用GameState.SetSelectedOption(i)；GameState.SendOption()；
	* GameState.ResponseMode.CHOICE——初步猜测为游戏回合开始时，选择初始手牌的相关操作；  
  
服务器端的行为就比较难以猜测了，只能等到客户端行为分析比较完整时再说了。  

服务器端相关的返回大致是这样的，在Gameplay的Start中有这样一句：

``` csharp
network.RegisterNetHandler(Network.PacketID.ALL_OPTIONS, new Network.NetHandler(this.OnAllOptions));
```
  
想象中客户端使用Gameplay.OnAllOptions()处理网络层接收到的所有玩家操作，此函数主要是将Network.GetOptions()取出的数据发送到GameState.OnAllOptions()去处理，后者主要会触发事件GameState.FireOptionsReceivedEvent()。  

我们通过对应的GameState.RegisterOptionsReceivedListener()成员函数，可以分析一下哪些对象会响应此事件。找到EndTurnButton.OnOptionsReceived()。

这阶段的分析难度越来越大了，这次分析算是有小小的收获，但是整个回合流转的流程还没有清晰。总结如下：
* 玩家的操作是在InputManager中处理的，重点的成员函数包括DoNetworkResponse()、DoEndTurnButton()；
* 玩家的操作和网络发送来的操作都保存在GameState.m_options中；
* 其中有另外一个Entity类体系也需要进一步分析。

