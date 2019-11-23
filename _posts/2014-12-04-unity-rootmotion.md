---
layout: post
title: "在Unity3D的Legacy动画系统中应用Root Motion"
author: "房燕良"
column: "Unity3D"
categories: unity3d
tags: [unity3d]
brief: "探讨一下如何在Legacy动画系统之上附加Root Motion功能，其实很简单。"
---

最近仔细比较了Unity3D目前版本中的两套动画系统：Legacy和Mecanim。Mecanim系统功能较之Legacy要强大很多，但是使用AnimatorController着实不方便（尽管使用AnimatorOverrideController可以避免重复编辑状态机），是因为游戏逻辑层面往往要用一个状态机或者类似的机制来控制角色的状态，而角色层面的状态逻辑和动画层面是无法一一对应的，两套复杂的状态机要配合起来。。。想想就觉得蛋疼啊！难怪很多朋友现在还在使用Legacy动画系统。Legacy动画系统其实功能也很全面了，包括Layer、过渡混合、上下身混合之类的功能完全能够胜任，而且控制起来就直接的多了。唯独Root Motion这个我很需要特性没有支持，本文就探讨一下如何在Legacy动画系统之上附加Root Motion功能，其实很简单大笑。

## 何谓Root Motion

在不使用Root Motion的情况下，类似走、跑这样的位移控制是这样的：  

1. 请美术在导出动画时把位移去掉；
2. 在程序代码里控制角色移动的速度，在播放动画的同时，计算其位移。  

这种做法其实挺不科学的，程序控制的角色，只能当做一个质点来处理，并且大多数时候都是匀速运动，而动画中的角色的移动往往很难跟这个匹配。所以需要比较良好的计算和比较好的美术技巧才能避免角色“滑步”的现象。在“跑”这种快速移动这，滑步还比较好处理，如果是慢速移动。。。。再厉害的美术也爱莫能助了。这种情况下，最好还是使用Root Motion：  

1. 美术在导出动画的时候是附带位移的；
2. 程序把动画的每一帧的位移是从动画中读取出来，再应用到角色上的，这样就能达到动画和位移的完美匹配了。

## 在Legacy中添加Root Motion功能

了解了Root Motion的概念之后，在Unity3D引擎中我们很简单就可以实现此功能了。Unity3D有一个统一的对象层次结构设计，这点非常赞，我们可以很简单找到角色的根骨骼，然后把其中的Transform变换读取出来，请见以下示例代码：

``` csharp
					//-- 计算当前帧的Root Motion
        	Vector3 rootPos = m_rootBone.localPosition;
        	m_rootMotion = rootPos - m_lastRootPos;
        	m_lastRootPos = rootPos;
        	rootPos.x = 0;
        	rootPos.z = 0;
        	m_rootMotion.y = 0;
        	m_rootBone.localPosition = rootPos;
```

请注意，我们在后续的代码中要把 m_rootMotion 附加的角色对象上，所以 m_rootBone 的postion 被 reset 了。  
在读取了此帧的Root Motion，在可以把它应用到当前对象之上了：  
``` csharp
	//-- Apply Root Motion
	Vector3 nextPos = this.transform.position + m_rootMotion;
  this.transform.position = nextPos;
```

另外，一个细节需要处理一下，在动画循环的那一帧，需要特殊处理一下。好的，看一下完整的源代码吧：  
``` csharp
using UnityEngine;
using System.Collections;

public class ApplyRootMotion : MonoBehaviour 
{
	public Transform m_flagObject;	// 用来测试位置的一个对象

	//-- Root Motion 控制变量
	Transform m_rootBone;
    Vector3 m_lastRootPos;
    Vector3 m_rootMotion;
    int m_lastAnimTime;

	void Start () 
	{
		//-- 从SkinnedMeshRenderer中读取Root Bone
		SkinnedMeshRenderer skinMesh = this.gameObject.GetComponentInChildren<SkinnedMeshRenderer>();
        m_rootBone = skinMesh.rootBone;

        //-- 变量初始化
        m_rootMotion = Vector3.zero;
        m_lastRootPos = m_rootBone.localPosition;
        m_lastAnimTime = 0;
	}
	
	void Update () 
	{
		//-- Apply Root Motion
		Vector3 nextPos = this.transform.position + m_rootMotion;
        this.transform.position = nextPos;

        //-- 测试代码：更新测试物体的位置
        Vector3 flagPos = m_flagObject.position;
        flagPos.x = nextPos.x;
        flagPos.z = nextPos.z;
        m_flagObject.position = flagPos;

        //-- 测试代码：更新摄像机
        Camera.main.transform.LookAt(this.transform);
	}

	void LateUpdate()
    {
		AnimationState animState = this.animation["walking"];

		if ((int)animState.normalizedTime > m_lastAnimTime)
		{
        	//-- 动画循环处理
        	m_lastRootPos = m_rootBone.localPosition;
        	m_rootMotion = Vector3.zero;
        }
        else
        {
        	//-- 计算当前帧的Root Motion
        	Vector3 rootPos = m_rootBone.localPosition;
        	m_rootMotion = rootPos - m_lastRootPos;
        	m_lastRootPos = rootPos;
        	rootPos.x = 0;
        	rootPos.z = 0;
        	m_rootMotion.y = 0;
        	m_rootBone.localPosition = rootPos;
        }
        m_lastAnimTime = (int)animState.normalizedTime;
    }
}
```

Demo 源代码：[https://github.com/neil3d/RootMotionLegacy](https://github.com/neil3d/RootMotionLegacy)  

最后是截图。。。好吧，静态图片看不出效果，可以下载完整Demo（请使用Unity 4.6版本打开），角色移动非常平滑，毫无滑步。
![root_motion](/assets/img/unity/2014-root-motion.png)  




