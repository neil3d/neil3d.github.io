---
layout: post
title: "Three.js 源代码解读(1)：场景数据结构"
author: "燕良"
categories: 3dengine
tags: [glTF, WebGL]
image:
  path: gltf
  feature: 2016-gltf-jpeg-of-3d.jpg
  credit: Khronos Group
  creditlink: ""
brief: "Three.js 源代码解读，解析 Three.js 的内部结构，以及实现原理。"
---


![Three.js classes](/assets/img/threejs/start.svg)  


``` javascript
import * as THREE from 'three';

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

function animate() {
    requestAnimationFrame( animate );
    
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

	renderer.render( scene, camera );
}
animate();
``` 