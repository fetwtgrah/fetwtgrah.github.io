---
title: "DTO"
date: "2026-09-01"
draft: false
tags: ["DTO"]
description: "DTO解决数据输入问题"
ShowToc: true
TocOpen: false
---

# DTO(数据传输对象)

## 核心问题

如果 Controller 直接用数据库 model 去接收前端请求体(`c.ShouldBindJSON(&post)`),会有安全隐患:前端可以在请求体里塞入任何 model 里存在的字段,包括本不该由客户端控制的敏感字段(如 `id`、`user_id`、`status` 等)。

### 反例

```go
var post model.Passage
c.ShouldBindJSON(&post)
```

前端请求体:

```json
{
  "content": "正文",
  "user_id": 999
}
```

`post.UserID` 会被直接篡改成 `999`,相当于可以冒充任意用户发布文章——即使后端另外从登录态(`c.Get("user_id")`)取了真实用户 ID,如果代码顺序或逻辑没处理好,这个字段依然可能被覆盖或误用。

## 解决方式:用独立的 DTO 结构体接收请求

只声明"前端真正应该能填"的字段,敏感字段(如 `user_id`)完全不出现在这个结构体里。

```go
type AddPassageRequest struct {
    Content string `json:"content" binding:"required,min=1,max=10000"`
}
```

因为结构体里根本没有 `UserID` 字段,`ShouldBindJSON` 解析 JSON 时只会绑定声明过的字段,前端就算传了 `user_id` 也不会进到 `req` 里,自然不会污染后续逻辑。

## 完整流程

```go
func AddPost(c *gin.Context) {
    // 1. 敏感字段:从服务端可信来源(登录态/JWT)获取,不接受客户端输入
    userIDVal, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"msg": "未登录"})
        return
    }
    userID, ok := userIDVal.(int64)
    if !ok {
        c.JSON(http.StatusUnauthorized, gin.H{"msg": "用户信息异常"})
        return
    }

    // 2. 普通字段:用 DTO 接收并校验客户端传入的数据
    var req AddPassageRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // 3. 组装成真正的数据库 model,两类数据来源在这里汇合
    post := model.Passage{
        UserID:  userID,      // 来自登录态,不可被前端篡改
        Content: req.Content, // 来自前端,但已经过校验
    }

    if err := configs.Db.Create(&post).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"msg": "发布失败"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"msg": "发布成功", "data": post})
}
```

## 关键原则

| 层                  | 职责                  | 数据来源                                              |
| ------------------- | --------------------- | ----------------------------------------------------- |
| DTO(Request 结构体) | 接收 + 校验客户端输入 | 前端请求体,白名单字段                                 |
| Model(数据库结构体) | 映射数据库表结构      | DTO 数据 + 服务端可信数据(登录态、系统生成值)组装而成 |

- **DTO 是白名单机制**:只声明允许客户端填写的字段,没写的字段客户端传了也无效。
- **敏感字段绝不放进 DTO**:如 `user_id`、`id`、`status`(有些场景)、`created_at` 等,这些要么由服务端从登录态取,要么由数据库/业务逻辑自动生成。
- **DTO 附带校验规则**:`binding:"required,min=1,max=10000"` 这类 tag,在绑定阶段就能拦截非法输入,不用额外写 if 判断。
- **model 和 DTO 关注点分离**:model 负责“数据库里存什么”,DTO 负责“接口允许别人传什么”,两者不一定一一对应,不要图省事合并成一个结构体。

## 关联字段同理:也不该出现在创建请求里

带有 `gorm` 关联关系的字段(如 `Passage.User`)本质上是查询时用 `Preload` 填充的关联对象,不是需要客户端传入的原始数据。创建记录时只需要外键字段(如 `UserID`),关联对象字段留空即可,GORM 不会因此报错,查询时再按需 `Preload` 拿到完整关联数据。
