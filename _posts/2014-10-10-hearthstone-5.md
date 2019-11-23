---
layout: post
title: "《炉石传说》架构设计赏析(5)：卡牌&技能的静态数据组织"
author: "房燕良"
column: "Unity3D"
categories: gamedev
tags: [Hearthstone, Game]
image:
  path: hearthstone
  feature: cover.jpg
  credit: "Blizzard"
  creditlink: "http://hs.blizzard.cn"
brief: "分析《炉石传说》的卡牌、技能的静态数据组织。"
---

经过前面几次的尝试，我们对炉石的代码已经不陌生了。除了网络机制还没有了解以外，本机的逻辑已经比较熟悉了。  
  
接下来继续向暴雪最NB的技能系统进发，我们的目标是：  
* 分析技能的静态数据描述；
* 分析技能的运行时数据、逻辑组织；  
这篇笔记主要记录对其分析静态数据。

### 静态数据组织

#### 卡牌数据

* 卡牌的基本数据对于的AssetFamily为：AssetFamily.CardXML；
* 数据对于的资源包为“cardxml0.unity3d”；
* 资源包中的资源类型为：TextAsset；
* 资源加载使用的接口为：AssetLoader:LoadCardXml()；
* 运行时对应的数据类型为：EntityDef；
* xml文件中保存有多个Entity对象数据，具体数据例如：

``` xml
<Entity version="2" CardID="CS1_042">
    <Tag name="CardName" enumID="185" type="String">闪金镇步兵</Tag>
    <Tag name="CardSet" enumID="183" type="CardSet" value="2" />
    <Tag name="CardType" enumID="202" type="CardType" value="4" />
    <Tag name="Faction" enumID="201" type="Faction" value="2" />
    <Tag name="Rarity" enumID="203" type="Rarity" value="1" />
    <Tag name="Cost" enumID="48" type="Number" value="1" />
    <Tag name="Atk" enumID="47" type="Number" value="1" />
    <Tag name="Health" enumID="45" type="Number" value="2" />
    <Tag name="AttackVisualType" enumID="251" type="AttackVisualType" value="1" />
    <Tag name="CardTextInHand" enumID="184" type="String"><b>嘲讽</b></Tag>
    <Tag name="DevState" enumID="268" type="DevState" value="2" />
    <Tag name="Collectible" enumID="321" type="Bool" value="1" />
    <Tag name="EnchantmentBirthVisual" enumID="330" type="EnchantmentVisualType" value="0" />
    <Tag name="EnchantmentIdleVisual" enumID="331" type="EnchantmentVisualType" value="0" />
    <Tag name="ArtistName" enumID="342" type="String">Donato Giancola</Tag>
    <Tag name="HowToGetThisGoldCard" enumID="365" type="String">圣骑士达到57级后解锁。</Tag>
    <Tag name="FlavorText" enumID="351" type="String">如果闪金镇都是由1/2的步兵把守的话，那它早在多年以前就被毁了。</Tag>
    <Tag name="Taunt" enumID="190" type="Bool" value="1" />
    <Power definition="54e57583-ce5c-46e3-899a-39bd2181468d" />
  </Entity>
```

#### 卡牌实体
* 卡牌实体对象对应的AssetFamily为：AssetFamily.CardPrefab；
* 数据对应的资源包为“cards？.unity3d”，目前共有4个；
* 资源包中的资源类型为：Prefab；
* 资源加载对应的接口为：AssetLoader:LoadCardPrefab()；
* 卡牌资源使用CardID进行索引，例如“闪金镇步兵”对应“CardID="CS1_042"”；
* Prefab中的GameObject主要包含：Transform、Material、CardDef，这三个Component；
* CardDef有很多CustomEditField，主要分为以下几类：
	* EditType.SOUND_PREFAB；
	* Material，主要是Portrait--头像；
	* EditType.SPELL，其实是string类型，保存的是Spell对象的资源路径；

#### 技能对象

* 技能对象对应的AssetFamily为：AssetFamily.Spell；
* 数据对应的资源包为“spells?.unity3d”，目前共有3个；
* 资源包中的资源类型为：Prefab；
* 资源加载对应的接口为：AssetLoader:LoadSpell()；
* 卡牌通过CardDef中指定相关技能资源的路径；
* Prefab中的GameObject主要包含：AudioClip、AudioSource、Material、ParticleSystem、ParticleSystemRenderer、Transform等组件；
* 涉及到的脚本主要有：PlayerMaker相关的类，Spell及其派生类、SoundDef；
	我们看到Spell有很多的派生类，这里用到了一个小技巧：GetComponent()是可以把基类作为参数来获得子类对象的。例如，一个对象绑定了ArmorSpell对象，而ArmorSpell是Spell的派生类，那么gameObject.GetComponent<Spell>()是可以获得这个ArmorSpell对象的。

### 总结一下

卡牌和技能相关的数据主要包括以上三种，其中EntityDef是使用“策划填表”或者类似的方式，而且卡牌和技能资源，则使用Unity编辑成Pefab。技能对象中用到了PlayerMaker插件。  

本次分析涉及到的类，请详见下图。
![UML](/assets/img/hearthstone/uml_cardspell.gif)    


最后，按照惯例，还是秀一下战绩：
![GAME](/assets/img/hearthstone/game_fun_03.png)    


