---
layout: post
title: "Shadow Mapping原理与实践"
author: "燕良"
column: "Graphics"
categories: 3dengine
tags: [D3D, shader, shadow]
image:
  path: d3d
  feature: 2008-shadow-cover.png
  credit: ""
  creditlink: ""
brief: "通过本文，你可以理解 Shadow Mapping 算法原理，已经如何编程实现它。"
---

> 本文发表于《游戏创造》杂志2008年第4期  
> 相关代码：[https://github.com/neil3d/ShadowMappingD3D](https://github.com/neil3d/ShadowMappingD3D)

上世纪70年代末，正是计算机图形学迅速发展的一个年代，其间涌现出了大量“精妙”的算法，例如Jim Blinn提出的“Bump Mapping”，以及本文将要讨论的“Shadow Mapping”。Shadow Mapping的基本算法思路在1978年由Lance Williams提出，有兴趣的话，可以读一下他老人家在SIGGRAPH 1978上的论文：***CASTING CURVED SHADOWS ON CURVED SURFACES***。这一算法被广泛应用，例如我们熟知的动画片《玩具总动员》的阴影生成就基于这一算法。  

Shadow Mapping在游戏引擎中开始流行，应该是在2001年nVIDIA Geforce3对其提供了硬件支持之后。如今，Shadow Mapping已被广泛应用于Unreal Engine 3等次世代引擎之中。下面我们就先对其原理以及实做细节进行讨论，然后对近期的一些发展做一介绍。  

### Shadow Mapping原理详解

首先让我们从直觉上把整个算法的思路理一遍。我们可以这样理解Shadow Mapping算法：建立一个缓冲区，将**离光源最近的片元（fragment）**与光源的距离存储其中，这个缓冲区就被称为Shadow Map（或者Shadow Buffer）；在这之后的场景渲染中，我们可以计算出每个需要着色的片元与光源的距离，将这个距离与之前Shadow Map存储的距离值进行比较，则可以判定该片元是否在阴影之内。  

下面我们再详细的看一下。Shadow Mapping算法首先需要一个额外的pass，用来建立Shadow Map。这里的一个关键点是需要找出“离光源最近”的片元，这个可以通过标准的Z-Buffer算法来实现。请见下图：  

![图表1](/assets/img/d3d/2008-shadow-01.png)  

建立Shadow Map之后，我们可以利用它来计算每个片元是否在阴影中。  

![图表2](/assets/img/d3d/2008-shadow-02.png)  

如上图所示，当着色Pa时，Pa与Light的距离等于Shadow Buffer中的值a，所以Pa不在阴影中；而着色Pb时，Pb与Light的距离大于Shadow Buffer中的值b，因为b为Lb与Light的距离，所以Pb在阴影中。由于在实际操作中，Shadow buffer一般是一个2D texture，也就是说需要通过透视投影将场景映射到Shadow buffer中，所以实际参与运算的是片元的深度值而非距离值。请参考以下伪码：  

```
Render scene from light’s point of view
Resulting in a shadow map

Render scene from eye’s point of view
For each fragment:
     P = fragment’s position relative to light
     A = shadow_map(P.xy)
     B = P.z
     If A<B then
        Fragment is shadowed
     Else
        Fragment is lit
```

Shadow Mapping是一个图象空间（Image-space）的算法，因此它不需要像Shadow Volume那样了解物体的几何信息，它可以正确的产生Alpha镂空的面的阴影。同样也是因为它是图象空间算法，所以也就势必会遇到走样（Aliasing）的问题。Shadow Mapping另外一个主要的缺点是，它不太适用于Spot Light之外的灯光类型，例如对于方向光，走样问题会更严重；而对于点光源，则可能需要类似Cube-Map的解决方法，并保证6个view连接正确，实现起来相对困难。  

### Shadow Mapping实践

对Shadow Mapping算法有了基本的了解之后，我们就可以小试身手一番了。本文附带的源码搭建了一个基本的测试环境，这个小程序非常简单，主要由以下几个类组成：

![图表3](/assets/img/d3d/2008-shadow-uml.png)  

1.	MyD3DApp：负责管理Win32窗口，D3D设备等；它还管理了RenderScene和RenderSample的实例，通过窗口菜单可以改变当前的Scene和Sample；
2.	RenderScene：是一个虚基类，提供管理一个简单的测试场景的几何数据的接口；
3.	D3DXShapeScene：使用D3DX Shape创建的一个测试场景，包含一个box和9个sphere；
4.	D3DXMeshScene：从磁盘读入一个x模型文件，组成一个测试场景；
5.	RenderSample：是一个虚基类，提供渲染场景的操作接口；
6.	RenderShadowMapSample：是ShadowMap演示类的一个基类，主要实现了灯光数据的处理；
7.	RenderBasicShadow：实现基本Shadow Mapping算法的一个演示；
8.	RenderHardwareShadow：使用硬件Shadow Map的一个演示；

下面我们就主要看RenderBasicShadow、RenderHardwareShadow两个类的代码流程，并探讨一些实现细节。

### 实现基本的Shadow Mapping算法

灯光的位置，光照范围夹角等数据都存储在class RenderShadowMapSample中。这个类还计算了3个矩阵，分别是：  
1.	灯光的View矩阵：这里我们每帧更新灯光的位置，但是假设它总是照向坐标原点(只是为了便于观察效果，你当然也可以任意修改它)，由此，可以使用D3DXMatrixLookAtLH函数计算出灯光的View矩阵；
2.	灯光的Project矩阵：这里我们假设光源是一个Spot Light，这里使用D3DXMatrixPerspectiveFovLH函数来计算出灯光的Project矩阵；
3.	贴图坐标变换矩阵，它是用来将Render Target坐标系转换为Texture坐标系，并加上了一个Bias，这个矩阵我们将在后面详细讨论。  

class RenderBasicShadow实现了基本的Shadow Mapping算法。  
先看一下RenderBasicShadow::create()函数，它主要完成了以下几项工作：  
1.	创建了一个Shadow Map，它是一个可以作为Render Target的Texture，为了获得高精度的深度值，我们使用了R32F格式；
2.	创建了一个与Shadow Map大小相同的Depth Surface；
3.	加载了需要的Effect文件――“Basic.fx”，这个文件的内容我们在后面重点讨论；  

一切准备就绪，我们终于可以进入渲染流程了。第一步是生成Shadow Map，首先把Render Target设置为我们的Shadow Map Texture，并把Depth Stencil Surface设置为我们创建的那个Depth Surface，然后使用effect文件中的“technique genShadowMap”来渲染整个场景。下面我们重点看一下这部分的Shader代码。  

```
//--
float3 g_lgtPt;
float3 g_lgtDir;
float g_cosTheta;

struct VS_INPUT
{
	float3 pos : POSITION;
	float3 normal : NORMAL;
};

//--生成Shadow map----------------------------------------------------------------
float4x4 g_lgtWorldViewPrj;

struct lgtVS_OUTPUT
{
	float4 pos : POSITION;
	float2 depth : TEXCOORD0;
};

lgtVS_OUTPUT lgtVS(VS_INPUT vert)
{
	lgtVS_OUTPUT vsout;	
	vsout.pos = mul(float4(vert.pos,1),g_lgtWorldViewPrj);
	vsout.depth.xy = vsout.pos.zw;
	return vsout;
}

float4 lgtPS(float2 depth:TEXCOORD0):COLOR
{
	return depth.x/depth.y;
}

//--
technique genShadowMap
{
	pass p0
	{
		VertexShader = compile vs_1_1 lgtVS();
		PixelShader = compile ps_2_0 lgtPS();
	}
}
```

首先看一下Vertex Shader函数lgtVS()，这个函数首先使用g_lgtWorldViewPrj矩阵将顶点坐标转换为Projection坐标，这是标准的顶点变换计算。g_lgtWorldViewPrj矩阵使用下面的公式计算：**“物体World矩阵*灯光View矩阵*灯光Project矩阵”**。为了在Render Target中存储深度值，我们将变化之后的位置信息输出到pixel shader，只需要z和w分量即可。在Pixel Shader中将z进行透视除法，输出到Render Target。

![图表4](/assets/img/d3d/2008-shadow-depth.png)  

渲染流程的第二步，就是渲染整个场景，并使用刚才生成的Shadow Map计算哪些片元处于阴影之中。看一下这部分的Shader代码：  

```
//--渲染场景----------------------------------------------------------------
float4x4 g_worldViewPrj;
float4x4 g_world;
float4x4 g_texScaleBiasMat;

texture g_texShadowMap;

sampler2D g_smpShadowMap =
sampler_state
{
    Texture = <g_texShadowMap>;
    MinFilter = Point;
    MagFilter = Point;
    MipFilter = Point;
    AddressU = Clamp;
    AddressV = Clamp;
};

struct shdVS_OUT
{
	float4 pos : POSITION;
	float4 lgtPos : TEXCOORD0;
	float3 worldPos : TEXCOORD1;
	float3 normal : TEXCOORD2;
};

shdVS_OUT shdVS(VS_INPUT vert)
{
	shdVS_OUT vsout;
	vsout.pos = mul(float4(vert.pos,1),g_worldViewPrj);
	vsout.lgtPos = mul(float4(vert.pos,1),g_lgtWorldViewPrj);
	vsout.worldPos = mul(float4(vert.pos,1),g_world);
	vsout.normal = normalize(mul(vert.normal, g_world));
	return vsout;
}

float4 shdPS(float4 lgtPos:TEXCOORD0,
			 float3 worldPos:TEXCOORD1,
			 float3 normal:TEXCOORD2):COLOR
{
	float3 vLight = normalize(worldPos - g_lgtPt);

	//-- 计算灯光颜色
	float4 ambientColor = {0.2, 0.2, 0.2, 1};
	float4 diffuseColor = {0.9, 0.9, 0.9, 1};

	normal = normalize(normal);
	diffuseColor *= saturate(dot(normal, -vLight));

	//--
	if( dot(vLight, g_lgtDir) > g_cosTheta )
	{
		lgtPos = mul(lgtPos, g_texScaleBiasMat);

		float shadow = lgtPos.z/lgtPos.w > tex2Dproj(g_smpShadowMap, lgtPos) ? 0:1;
		return diffuseColor*shadow + ambientColor;
	}
	else
		return ambientColor;
}

technique shdScene
{
	pass p0
	{
		VertexShader = compile vs_1_1 shdVS();
		PixelShader = compile ps_2_0 shdPS();
	}
}
```

还是先看一下Vertex Shader函数shdVS()，这个函数没有什么特别之处，只有一点需要注意，它输出了一个经过g_lgtWorldViewPrj矩阵变换的位置参数，这和我们在生成Shadow Map时的变换是一样的。接下来我们看一下Pixel Shader函数shdPS()。由于光照不是我们的重点，所以这里只实现了最简单的N dot L diffuse和ambient光照计算。首先我们通过当前片元与灯光方向的夹角来判断是否在光照范围之内，如果不在光照范围之内，则只有ambient光照。如果落在了光照范围之内，则需计算是否在阴影之内。lgtPos是经过灯光view，project变换的一个坐标，通过透视除法（lgtPos.z/lgtPos.w）可以计算出当前片元在在灯光空间的深度值，然后可以使用lgtPos采样Shadow Map，来进行比较，这样就可以得出当前片元是否在阴影之内。这里直接使用lgtPos去采样Shadow Map是不对的，因为lgtPos是Render Target空间坐标，需要转换到贴图坐标。这个工作是通过下面这一行代码实现的：  
		**lgtPos = mul(lgtPos, g_texScaleBiasMat);**
g_texScaleBiasMat通过一下这段代码创建：

```
float fBias = -0.0005f;
	float fOffsetX = 0.5f + (0.5f / SHADOW_MAP_SIZE);
	float fOffsetY = 0.5f + (0.5f / SHADOW_MAP_SIZE);
	D3DXMATRIX texScaleBiasMat(
		0.5f,     0.0f,     0.0f,      0.0f,
		0.0f,    -0.5f,     0.0f,      0.0f,
		0.0f,     0.0f,     1.0f,	   0.0f,
		fOffsetX, fOffsetY, fBias,     1.0f);
```
它一共完成了三项工作：
1.	将一个坐标从Render Target空间变换到贴图空间；如下图所示：
    ![图表5](/assets/img/d3d/2008-shadow-03.png)      
2.	将贴图的u，v坐标平移了0.5个象素。这是因为D3D在处理屏幕象素（pixel）和采样贴图象素（texel）使用了不同的方法，对于pixel坐标指向象素的中间（texel坐标指向象素的左上角），所以这里需要偏移半个texel来寻址正确的深度值；（关于这个让人郁闷的特性详见D3D9文档“Directly Mapping Texels to Pixels”，这个特性在D3D10中已经移出）。
3.	将当前片元在灯光space中的深度值进行了一个微小的偏移（fBias）。它的取值没有太多的数学依据，主要是试验的结果，调节它的大小使得阴影（特别是self-shadow部分）产生最小的错误。这主要是因为Shadow Map并不是连续的，它的分辨率是有限的。下图是不使用Bias（上图）和使用Bias（下图）的渲染结果对比。
    ![图表6](/assets/img/d3d/2008-screen_sphere_nobias.png)      
    ![图表6](/assets/img/d3d/2008-screen_sphere.png)      
    
### Hardware Shadow Mapping with PCF

nVIDIA从Geforce3开始对Shadow Mapping实现了很好的硬件支持。所谓的硬件Shadow Mapping，主要包括以下几点：
1.	支持Depth格式的Texture；
2.	当贴图的格式为D24X8等Depth Stencil格式时，使用tex2DProj采样贴图返回的并非颜色值，而是与贴图坐标中带有的深度值信息比较的结果，0代表在阴影中；
3.	硬件可以使用正确的Filter对返回结果进行差值――PCF（Percentage Closer Filtering）。PCF是1987年Reeves et al.提出的。它的思路很简单：当采样Shadow Map时，采样周围的象素，对每个象素进行深度值比较，通过深度值比较的象素的百分比可以认为是光照的百分比。简言之，就是过滤比较结果。

本文附带代码中的class RenderHardwareShadow演示了硬件Shadow Mapping的实现。它与前面的例子只有少许不同：
1.	在创建Shadow Map是我们使用了“Usage=D3DUSAGE_DEPTHSTENCIL, Format=D3DFMT_D24X8”；
2.	在生成Shadow Map时，Shadow Map被设置为D3D Device的Depth Stencil Surface，并关闭了Color Write;
3.	生成Shadow Map的vertex shader和pixel shader不用在像前面的例子那样处理深度值，按照正常方式处理即可；
4.	在设置Shadow Map的sampler时，我们使用了“MinFilter = Linear; MagFilter = Linear;”，这样可以打开硬件PCF；
5.	在pixel shader中无需在对Shadow Map采样结果进行深度值比较，硬件已经完成此工作：
    **float4 shadow = tex2Dproj(g_smpShadowMap, lgtPos);**	  
  
![图表7](/assets/img/d3d/2008-screen_tank.png)      
    
### Shadow Mapping进阶

以基本的Shadow Mapping算法为基础，陆续出现了很多改良的算法。其中在游戏业讨论比较多的包括以下几种：Perspective Shadow Maps(Stamminger & Drettakis, SIGGRAPH 2002)、Light-Space Perspective Shadow Maps(Wimmer, Eurographics 2004)、Trapezoidal Shadow Maps (Martin, Eurographics 2004)。由于篇幅有限，这里无法逐一介绍这些算法细节。我们可以粗略的看一下Perspective Shadow Maps算法，而后两种可以视为PSMs算法的变形。  

要理解PSMs算法首先要对post-projection space有一个很好的理解。所谓的post-projection space，又叫做clip-space，它是指坐标经过了modelview和projection矩阵变化之后的一个空间。这个变换的一个特点就是它经过了透视变形，也就是离摄像机近的物体被“拉大”了，而离摄像机远的物体被“挤压”小了（如图8所示）。在PSMs算法中，shadow map中存储的就是场景在这个空间中以灯光视点来渲染的深度信息。  

> 下图取自DirectX SDK文档  
![图表8](/assets/img/d3d/2008-projection.png)      

与前面介绍的标准Shadow Map算法不同，PSMs算法在post-projection space中生成Shadow Map。我们首先要将场景和灯光变换到post-projection space，然后以post-projection space中的灯光视点来来拍摄这个post-projection space中的场景。由于在post projection space中已经实现了“近大远小”的透视效果，所以离摄像机近的物体也就在Shadow Map中占用了更多的texel，从而缓解了走样问题。PSMs算法另外一个有用的地方在于，平行光经过透视变形，汇聚到一点，这大大方便了平行光的处理。  

> 下图取自PSMs论文  

![图表9](/assets/img/d3d/2008-psmlsdepth.png)      
![图表9](/assets/img/d3d/2008-psmview.png)      

### 参考资料
* Lance Williams, “Casting Curved Shadows on Curved Surfaces,” SIGGRAPH 78
* William Reeves, David Salesin, and Robert Cook (Pixar), “Rendering antialiased shadows with depth maps,” SIGGRAPH 87
* Mark Segal, et. al. (SGI), “Fast Shadows and Lighting Effects Using Texture Mapping,” SIGGRAPH 92
* Stamminger, M., and G. Drettakis, “Perspective Shadow Maps,” SIGGRAPH 2002

