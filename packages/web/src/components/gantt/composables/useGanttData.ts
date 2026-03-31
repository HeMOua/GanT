/**
 * useGanttData - 数据处理 composable
 *
 * 职责：
 * 1. 将扁平任务列表转为树形结构
 * 2. 处理展开/折叠
 * 3. 生成可见的扁平化列表（用于渲染）
 */
import { ref, computed } from 'vue'
import type { GanttTask, FlattenedTask } from '../types'

export function useGanttData(tasks: () => GanttTask[]) {
  // 存储展开状态 taskId → boolean
  const expandedMap = ref<Map<number, boolean>>(new Map())

  // 初始化时默认展开所有父节点
  function initExpanded(taskList: GanttTask[]) {
    const parentIds = new Set<number>()
    for (const t of taskList) {
      if (t.parent_id !== null && t.parent_id !== undefined) {
        parentIds.add(t.parent_id)
      }
    }
    for (const pid of parentIds) {
      if (!expandedMap.value.has(pid)) {
        expandedMap.value.set(pid, true)
      }
    }
  }

  // 构建 children 映射
  function buildChildrenMap(taskList: GanttTask[]): Map<number | null, GanttTask[]> {
    const map = new Map<number | null, GanttTask[]>()
    for (const t of taskList) {
      const pid = t.parent_id ?? null
      if (!map.has(pid)) map.set(pid, [])
      map.get(pid)!.push(t)
    }
    // 按 order 排序
    for (const [, children] of map) {
      children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }
    return map
  }

  // 判断任务是否有子节点
  function hasChildrenFn(taskId: number, childrenMap: Map<number | null, GanttTask[]>): boolean {
    const children = childrenMap.get(taskId)
    return !!children && children.length > 0
  }

  // 递归展开为扁平列表
  function flattenTree(
    parentId: number | null,
    level: number,
    childrenMap: Map<number | null, GanttTask[]>,
    visible: boolean,
  ): FlattenedTask[] {
    const result: FlattenedTask[] = []
    const children = childrenMap.get(parentId)
    if (!children) return result

    for (const task of children) {
      const hasCh = hasChildrenFn(task.id, childrenMap)
      const expanded = expandedMap.value.get(task.id) ?? true
      result.push({
        task,
        level,
        hasChildren: hasCh,
        expanded,
        visible,
      })
      if (hasCh) {
        const childFlat = flattenTree(
          task.id,
          level + 1,
          childrenMap,
          visible && expanded,
        )
        result.push(...childFlat)
      }
    }
    return result
  }

  // 计算属性：扁平化任务列表
  const flattenedTasks = computed<FlattenedTask[]>(() => {
    const taskList = tasks()
    if (!taskList.length) return []
    initExpanded(taskList)
    const childrenMap = buildChildrenMap(taskList)
    return flattenTree(null, 0, childrenMap, true)
  })

  // 仅可见的任务
  const visibleTasks = computed<FlattenedTask[]>(() => {
    return flattenedTasks.value.filter(ft => ft.visible)
  })

  // 切换展开/折叠
  function toggleExpand(taskId: number) {
    const current = expandedMap.value.get(taskId) ?? true
    expandedMap.value.set(taskId, !current)
    // 触发 reactivity
    expandedMap.value = new Map(expandedMap.value)
  }

  // 全部展开/折叠
  function expandAll() {
    for (const [key] of expandedMap.value) {
      expandedMap.value.set(key, true)
    }
    expandedMap.value = new Map(expandedMap.value)
  }

  function collapseAll() {
    for (const [key] of expandedMap.value) {
      expandedMap.value.set(key, false)
    }
    expandedMap.value = new Map(expandedMap.value)
  }

  // 根据 ID 查找任务
  function getTaskById(id: number): GanttTask | undefined {
    return tasks().find(t => t.id === id)
  }

  // 获取任务在可见列表中的行索引
  function getVisibleRowIndex(taskId: number): number {
    return visibleTasks.value.findIndex(ft => ft.task.id === taskId)
  }

  return {
    flattenedTasks,
    visibleTasks,
    expandedMap,
    toggleExpand,
    expandAll,
    collapseAll,
    getTaskById,
    getVisibleRowIndex,
  }
}
