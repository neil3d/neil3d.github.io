---
layout: page
title: excel2json
---

在游戏项目中一般都需要由策划制作大量的游戏内容，其中很大一部分是使用Excel表来制作的。于是程序就需要把Excel文件转换成程序方便读取的格式。

之前项目使用的Excel表导入工具都是通过Office Excel组件来实现数据访问的，效率十分令人不满。一个端游项目一般要上百个表格，手游项目20、30个表格基本也是要的，于是表格导入程序的过程一般要几分钟，项目后期要接近半个小时。这里分享的这个小工具，在速度上有质的飞越，比上述方法实现的工具有接近100倍的速度提升.

主要功能：
* 把Excel表单转换成Json对象，并保存到一个文本文件中。支持将表中内容转换成Array，或者以第一列为ID的字典对象；
* 把Excel表单转换成SQL文本；
* 把Excel的表头转换成C#的struct数据定义代码。

由于这里使用OpenXML格式直接解析，所以只支持.xlsx文件，并不支持.xls文件。

### 支持GUI模式和命令行模式

GUI模式方便预览；而命令行式，方便将多个表格转换工作写成一个批处理文件（.bat或者.sh），一键处理几十个表格。
![excel2json_gui](/assets/img/excel2json/gui.png)  
![excel2json_cmd](/assets/img/excel2json/cmd.png)  

#### 命令行参数
-  -e, --excel       Required. 输入的Excel文件路径.
-  -j, --json        指定输出的json文件路径.
-  -s, --sql         指定输出的SQL文件路径.
-  -p, --csharp      指定输出的C#数据定义代码文件路径.
-  -h, --header      Required. 表格中有几行是表头.
-  -c, --encoding    (Default: utf8-nobom) 指定编码的名称.
-  -l, --lowcase     (Default: false) 自动把字段名称转换成小写格式.

例如：**excel2json --excel test.xlsx --json test.json --header 3 --array true**，其中的输入和输出文件，都在当前目录下；


### Excel表单格式约定

![excel2json_example](/assets/img/excel2json/example_data.png)  

* 第一行固定作为列名（用来构造json字段名称）；
* 第一列固定作为对象的ID；
* 读取Excel Workbook中的第一个sheet；
* 对于SQL导出模式：第二行固定为字段类型
* 使用表头生成C#数据定义代码

### 在Mac、Linux上运行

这个小工具使用C#编写，编译出来的.exe通过Mono即可在Mac或者Linux上运行。
* Mono下载地址：[http://www.mono-project.com/download](http://www.mono-project.com/download/)
* 运行GUI模式：mono ./excel2json.exe
* 运行命令行模式： mono ./excel2json.exe 命令行参数