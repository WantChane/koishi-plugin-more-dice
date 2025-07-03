# koishi-plugin-more-dice

[![npm](https://img.shields.io/npm/v/koishi-plugin-more-dice?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-more-dice)


# 使用方法：

1. 首先，你需要创建一个默认的骰子组，当你添加骰子时，如果不指定骰子组，这个骰子会被默认添加到这个组中

```
md.init
```

2. 现在，你可以添加自己的骰子

```
# 向 mygroup 组中添加一个骰子 abc ，有三个面 a，b，c
md.dice.add -g mygroup abc a,b,c

# 向默认骰子组中添加骰子，通过 json 格式，指定 jsonpath
md.dice.add -j $[*].face abc [{"face":"a"},{"face":"b"},{"face":"c"}]

# 和上面的类似，但是json字符串经过base64编码
md.dice.add -j $[*].face abc base64://W3siZmFjZSI6ImEifSx7ImZhY2UiOiJiIn0seyJmYWNlIjoiYyJ9XQ==

# 当指定 -o 参数时，可以指定面的权重，以及子面
md.dice.add -j $[*] -o abc [{"face":"a","weight":1},{"face":"b","weight":1},{"face":"c","weight":2}]
md.dice.add -j $[*] -o abc [{"face":"a","weight":1},{"face":"b","weight":1},{"face":"c","weight":2,"subfaces":[{"face":"a","weight":1},{"face":"b","weight":1}]}]
```

想要定义复杂的骰子，字数往往超过了聊天软件的上限，这个插件在启用了Server配置后，可以通过 api 添加骰子

```
# 获取一个token
md.token.add

# 这种方式下，会检查 content-type 是否是 application/json ，

curl --request POST \
  --url http://127.0.0.1:5140/more-dice \
  --header 'content-type: application/json' \
  --data '{
  "action": "add",
  "token": "643GgWwh9iZwYLqh5DclZ1TqkgayGrCT53SXOVK5",
  "data": {
    "name": "abc",
    "group": "1",
    "faces": "base64://WwogICAgICB7CiAgICAgICAgImZhY2UiOiAiYSIsCiAgICAgICAgIndlaWdodCI6IDEKICAgICAgfSwKICAgICAgewogICAgICAgICJmYWNlIjogImIiLAogICAgICAgICJ3ZWlnaHQiOiAxCiAgICAgIH0sCiAgICAgIHsKICAgICAgICAiZmFjZSI6ICJjIiwKICAgICAgICAid2VpZ2h0IjogMiwKICAgICAgICAic3ViZmFjZXMiOiBbCiAgICAgICAgICB7CiAgICAgICAgICAgICJmYWNlIjogImEiLAogICAgICAgICAgICAid2VpZ2h0IjogMQogICAgICAgICAgfSwKICAgICAgICAgIHsKICAgICAgICAgICAgImZhY2UiOiAiYiIsCiAgICAgICAgICAgICJ3ZWlnaHQiOiAxCiAgICAgICAgICB9CiAgICAgICAgXQogICAgICB9CiAgICBd"
  }
}
'

curl --request POST \
  --url http://127.0.0.1:5140/more-dice \
  --header 'content-type: application/json' \
  --data '{
  "token": "643GgWwh9iZwYLqh5DclZ1TqkgayGrCT53SXOVK5",
  "action": "add",
  "data": {
    "name": "abc",
    "group": "1",
    "faces": [
      {
        "face": "a",
        "weight": 1
      },
      {
        "face": "b",
        "weight": 1
      },
      {
        "face": "c",
        "weight": 2,
        "subfaces": [
          {
            "face": "a",
            "weight": 1
          },
          {
            "face": "b",
            "weight": 1
          }
        ]
      }
    ]
  }
}
'
```

3. 丢骰子

```
md.roll abc
```