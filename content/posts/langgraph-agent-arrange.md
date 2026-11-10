---
title: "langgraph-学习笔记"
description: "学习Langgraph的agent编排"
date: 2026-11-10
draft: true
tags: ["Langgraph","AI Agent"]
---

# `Langgraph`-学习笔记

```py	
#基本流程
class states(TypeDict){}
#定义结点
build=StateGraph(states)
#在状态图内添加结点和边
graph=build.compile()
#invoke创建respone
graph.invoke({"msg":"your msg"})
```

## 1. 分支结构

### static branch

- 并行结点

定义边的时候又一个节点指向不同的节点

- 条件结点

```python	
def router(states)->Literal["a","b"]:
    if ...
    	return "a"
    return "b"
add_conditional_edges("preNode",router,path_map=["a":"node1","b":"node2"])
```

### dynamic branch

- #### **扇出并行结构**

send结合静态分支的`add_condition_edges`执行 的`fan out`方式

```python
def router(state: InputState) -> Sequence[Send]:
    prompt = "请生成关于 {} 的 {}"
    english2chinese = {
        "poem": "一首诗",
        "ci_poem": "一首词",
        "joke": "一个笑话"
    }

    topic = state["topic"]

    return [Send(
            "worker_node",
            {
                "content_type": content_type,
                "prompt": prompt.format(topic, english2chinese[content_type]),
            }
        ) for content_type in CONTENT_TYPES
      ]
 #Sequence的意思的按照顺序添加数组（这里是Send类型）
#Send的本质：
		Send("目标节点名", {该分支专属的输入数据})
```

- #### **command实现条件分支**

command的指令是一个自带批注的调用命令

- **`update`**：更新图状态，效果等同于节点直接返回状态更新字典；
- **`goto`**：指定节点执行完成后的跳转目标，可用于运行时条件分支。当需要同时更新状态并控制跳转时，比单独使用条件边更合适；
- **`graph`**：存在子图时，用于指定跳转发生在哪一层图中，例如从子图跳转到父图；
- **`resume`**：用于恢复被中断的图执行，常见于 **`human-in-the-loop`** 场景。

```python
def router(state: OverAllState) -> Command[Literal["poem_node", "joke_node", END]]:
    content_type = state["content_type"]

    if content_type == "poem":
        return Command (
            goto="poem_node"
        )
    elif content_type == "joke":
        return Command (
            goto="joke_node"
        )
    return Command (
        goto=END
    )
 #使用router节点的goto跳转节点
```

### 多分支汇入

```python
def node_a(state: EmptyState, config: RunnableConfig) -> EmptyState:
    #当前运行的metadata的超步的序号
    cur_step = config["metadata"]["langgraph_step"]
    logger.info("cur_step: {}, node_a 被触发", cur_step)
    return {}
#config的：本次运行的配置信息
```

- #### 静态扇入（fan in）

与触发：上游节点全部执行完毕后才执行这个节点

```python
add_edge([...], "汇聚节点")
#设置多节点汇聚，等待指定的上游节点全部完成。
```

或触发：任意一个分支到达之后就触发下游的节点

```python
# 独立触发：node_c 完成后可以触发 node_e
builder.add_edge("node_c", "node_e")
# 独立触发：node_d 完成后可以触发 node_e
builder.add_edge("node_d", "node_e")
#这里的不同级的触发会触发e节点两次
```

- #### 动态扇入（map-reduce）

```python
from typing import Annotated, Sequence
import operator

from typing_extensions import TypedDict
from langgraph.types import Send
from langgraph.graph import StateGraph, START, END

# 1. 定义 State
class State(TypedDict):
    documents: list[str]
    results: Annotated[list[str], operator.add]
    final_result: str


class WorkerState(TypedDict):
    document: str
# 2. Worker 节点
def worker(state: WorkerState):
    document = state["document"]

    result = f"分析结果：{document}"

    return {
        "results": [result]
    }
# 3. Map 路由：动态分发任务
def map_router(state: State) -> Sequence[Send]:
    return [
        Send("worker", {"document": doc})
        for doc in state["documents"]
    ]
# 4. Reduce 节点
def reduce_node(state: State):
    final_result = "\n".join(state["results"])

    return {
        "final_result": final_result
    }
# 5. 构建图
builder = StateGraph(State)

builder.add_node("worker", worker)
builder.add_node("reduce", reduce_node)

builder.add_conditional_edges(
    START,
    map_router
)

builder.add_edge("worker", "reduce")

builder.add_edge("reduce", END)

graph = builder.compile()
# 6. 执行
result = graph.invoke({
    "documents": [
        "Agent 的工具调用机制",
        "Agent 的上下文管理",
        "Agent 的记忆系统"
    ],
    "results": []
})

print(result["final_result"])
#jupyter的状态图显示
from IPython.display import display
display(graph)
```

## 2. 循环结构

