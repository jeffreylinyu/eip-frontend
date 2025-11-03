export type AnyRecord = Record<string, any>

// 自下而上計算父項聚合欄位：
// - Duration: 子項 Duration 總和（依需求）
// - StartDate: 子項 StartDate 最早（忽略空值）
// - EndDate: 子項 EndDate 最晚（忽略空值）
// - CostRatio: 子項 CostRatio 總和（數字）
// - ActualAmount: 子項 ActualAmount 總和（數字）
export function updateParentAggregates(tasks: AnyRecord[]): void {
  const walk = (nodes: AnyRecord[]) => {
    nodes.forEach(node => {
      if (Array.isArray(node.subtasks) && node.subtasks.length > 0) {
        // 先處理子節點
        walk(node.subtasks)

        // 聚合子節點
        let durationSum = 0
        let minStart: Date | null = null
        let maxEnd: Date | null = null
        let costSum = 0
        let amountSum = 0

        node.subtasks.forEach((child: AnyRecord) => {
          const d = Number(child.Duration || 0)
          if (!isNaN(d)) durationSum += d

          if (child.StartDate) {
            const s = new Date(child.StartDate)
            if (!isNaN(s.getTime())) {
              if (!minStart || s < minStart) minStart = s
            }
          }
          if (child.EndDate) {
            const e = new Date(child.EndDate)
            if (!isNaN(e.getTime())) {
              if (!maxEnd || e > maxEnd) maxEnd = e
            }
          }

          const cr = Number(child.CostRatio || 0)
          if (!isNaN(cr)) costSum += cr
          const aa = Number(child.ActualAmount || 0)
          if (!isNaN(aa)) amountSum += aa
        })

        // 套用到父節點
        node.Duration = durationSum
        node.StartDate = minStart || null
        node.EndDate = maxEnd || null
        node.CostRatio = costSum
        node.ActualAmount = amountSum
      }
    })
  }

  walk(tasks)
}


