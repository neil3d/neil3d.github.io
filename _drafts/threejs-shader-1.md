---
layout: post
title: "Three.js 材质系统解析(1)：知识准备"
author: "燕良"
categories: 3dengine
tags: [glTF, WebGL, ThreeJS]
image:
  path: threejs
  feature: cover1.png
  credit: ""
  creditlink: ""
brief: "通过阅读 Three.js 的源代码，理解 Three.js 的材质系统，重点是 Shader。"
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