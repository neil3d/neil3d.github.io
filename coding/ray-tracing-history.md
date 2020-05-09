---
layout: post2
title: "光线追踪简史 Ver 0.1 （1968-1986）"
author: "房燕良"
mathjax: true
---

## Ray Casting - Arthur Appel, 1968


- 伪代码

- 可运行代码

## Recursive Ray Tracing - Turner Whitted, 1980

- 原文中对公式：

$$
I = I_a + k_d \sum_{j=1}^{j=ls} (\vec{N} \cdot \vec{L_j}) + k_s S + k_t T
$$

where
- $I$ = the reflected intensity
- $I_a$ = reflection due to ambient light
- $k_d$ = diffuse reflection constant
- $\vec{N}$ = unit surface normal
- $\vec{L_j}$ = the vector in the direction of the jth light source
- $k_s$ = the specular reflection coefficient
- $S$ = the intensity of light incident from the $\vec{R}$ direction
- $k_t$ = the transmission coefficient
- $T$ = the intensity of light from the $\vec{P}$ direction.

- 伪代码

- 可运行代码