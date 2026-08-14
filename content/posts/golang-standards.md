---
title: "Golang Standards"
date: "2026-08-05"
draft: false
tags: ["项目规范","git"]
description: "go项目的文件架构标准和git commit的message提交标准"
ShowToc: true
TocOpen: false
---

# Project-layout

[社区标准模板](https://github.com/golang-standards/project-layout.git)

## git commit 

### 常用的 type 前缀

| type       | 用途                         |
| ---------- | ---------------------------- |
| `feat`     | 新功能                       |
| `fix`      | 修 bug                       |
| `refactor` | 重构(不影响功能的代码调整)   |
| `docs`     | 文档                         |
| `chore`    | 杂项(比如调整依赖、配置文件) |
| `test`     | 测试相关                     |

以后遇到"这次改动该用哪个 type"拿不准的时候,可以这样问自己:

- **改动是不是在修一个"错误的行为"**(报错、逻辑不对、崩溃)→ `fix`
- **改动是不是在新增一个之前没有的能力**→ `feat`
- **改动是不是"代码变了,但外部行为完全没变"**(比如挪文件、改变量名、拆函数)→ `refactor`
- **改动是不是在动依赖版本、CI 配置、Docker 相关**→ `build` 或 `chore`

## 路由的url

设计路由的时候,想清楚一点会容易很多:**RESTful 的核心思路是把"动作"看成"对资源的操作"**,而不是直接把函数名搬到 URL 上。你现在这两个接口,与其叫"发送验证码"和"注册",不如换个角度想:

- 发验证码 = "创建一个验证码资源"
- 注册 = "创建一个用户资源"

这样两个接口都变成了 `POST` + 名词资源,符合 RESTful 风格:

```go
router.POST("/api/v1/verification-codes", controller.SendCode)   // 创建验证码
router.POST("/api/v1/users", controller.RegisterByCode)          // 创建用户（注册）
```

#### 为什么不建议这样写

```go
router.POST("/user/send-code", controller.SendCode)      // ❌ 动词入了URL
router.POST("/user/register", controller.RegisterByCode) // ❌ 动词入了URL
```

### 加上版本前缀和路由分组

```go
v1 := router.Group("/api/v1")
{
    users := v1.Group("/users")
    {
        users.POST("", controller.RegisterByCode)         // POST /api/v1/users → 注册
        // 以后这里还会加：
        // users.POST("/login", controller.Login)         // 登录（这个算例外，习惯上常用动词，因为"登录"本身不太算创建资源）
        // users.GET("/:id", controller.GetUser)          // 查用户详情
        // users.PUT("/:id", controller.UpdateUser)       // 改用户信息
        // users.DELETE("/:id", controller.DeleteUser)    // 删用户
    }

    v1.POST("/verification-codes", controller.SendCode)  // 发验证码，作为独立的小资源，不挂在 users 下面
}
```
