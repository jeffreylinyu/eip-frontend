<script setup lang="ts">
import { computed } from 'vue'

interface VerificationLog {
    id: string
    verifiedBy: string // Username or ID
    verifiedByRole: string // Role name
    verifiedLevel: number // Level of verification
    status: 'APPROVED' | 'REJECTED' | 'PENDING'
    createdAt: string
    comment?: string
}

const props = defineProps<{
    logs: VerificationLog[]
}>()

// 1. 排序：時間倒序 (最新在最上面)
// 2. Highlighting：標示出最高 verifiedLevel 的那一筆 (代表目前進度)
const sortedLogs = computed(() => {
    if (!props.logs || props.logs.length === 0) return []
    
    // 複製並排序
    const sorted = [...props.logs].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    
    // 找出最高 Level
    const maxLevel = Math.max(...sorted.map(l => l.verifiedLevel))
    
    return sorted.map(log => ({
        ...log,
        isLatestLevel: log.verifiedLevel === maxLevel && log.status === 'APPROVED' // 只有 Approved 的最高層級才算當前水位
    }))
})

// 格式化日期
const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return dateStr.replace('T', ' ').split('.')[0]
}

// 狀態樣式
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'APPROVED': return 'badge bg-success'
        case 'REJECTED': return 'badge bg-danger'
        case 'PENDING': return 'badge bg-warning text-dark'
        default: return 'badge bg-secondary'
    }
}
</script>

<template>
  <div class="verification-log-list" v-if="sortedLogs.length > 0">
    <h6 class="fw-bold mb-3">
        <i class="fa fa-history me-2"></i>審核歷程
    </h6>
    
    <div class="table-responsive">
        <table class="table table-sm table-hover align-middle">
            <thead class="table-light">
                <tr>
                    <th>層級</th>
                    <th>審核者</th>
                    <th>狀態</th>
                    <th>備註</th>
                    <th>時間</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="log in sortedLogs" :key="log.id" :class="{'table-success': log.isLatestLevel}">
                    <td>
                        <span class="fw-bold">Level {{ log.verifiedLevel }}</span>
                        <i v-if="log.isLatestLevel" class="fa fa-check-circle text-success ms-1" title="當前最高核准層級"></i>
                    </td>
                    <td>
                        <div class="d-flex flex-column">
                            <span class="fw-bold">{{ log.verifiedByRole }}</span>
                            <span class="small text-muted">{{ log.verifiedBy }}</span>
                        </div>
                    </td>
                    <td>
                        <span :class="getStatusBadge(log.status)">{{ log.status }}</span>
                    </td>
                    <td>
                        <span v-if="log.comment" class="text-muted">{{ log.comment }}</span>
                        <span v-else class="text-muted small">-</span>
                    </td>
                    <td class="small">{{ formatDate(log.createdAt) }}</td>
                </tr>
            </tbody>
        </table>
    </div>
  </div>
  <div v-else class="text-muted small p-2 border rounded bg-light text-center">
    暫無審核紀錄
  </div>
</template>

<style scoped>
.table-success {
    --bs-table-bg: #d1e7dd66; /* 淡淡的綠色，不要太搶眼 */
}
</style>
