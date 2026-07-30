import http from '@/api/http'
import type { Progress2Task } from '@/stores/progress2'

export interface G2ScheduleForm {
  id: number
  constructionId: string
  title: string
  tasks: Progress2Task[]
  sourceUpdatedAt: string | null
  createdAt: string
  updatedAt: string
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: T }).data
  }
  return raw as T
}

const base = '/management/construction/g2-schedule-forms'

export async function listG2ScheduleForms(constructionId: string): Promise<G2ScheduleForm[]> {
  return unwrap<G2ScheduleForm[]>(await http.get(base, { params: { constructionId } })) ?? []
}

export async function getG2ScheduleForm(
  constructionId: string,
  recordId: number,
): Promise<G2ScheduleForm> {
  return unwrap<G2ScheduleForm>(
    await http.get(`${base}/${recordId}`, { params: { constructionId } }),
  )
}

export async function createG2ScheduleSnapshot(constructionId: string): Promise<G2ScheduleForm> {
  return unwrap<G2ScheduleForm>(
    await http.post(`${base}/snapshot`, undefined, { params: { constructionId } }),
  )
}

export async function updateG2ScheduleForm(
  constructionId: string,
  recordId: number,
  payload: Pick<G2ScheduleForm, 'title' | 'tasks'>,
): Promise<G2ScheduleForm> {
  return unwrap<G2ScheduleForm>(
    await http.put(`${base}/${recordId}`, payload, { params: { constructionId } }),
  )
}

export async function deleteG2ScheduleForm(
  constructionId: string,
  recordId: number,
): Promise<void> {
  await http.delete(`${base}/${recordId}`, { params: { constructionId } })
}

export async function exportG2ScheduleForm(
  constructionId: string,
  recordId: number,
  ganttCharts: Blob[],
  sCurveChart: Blob,
): Promise<Blob> {
  const data = new FormData()
  ganttCharts.forEach((chart, index) => {
    data.append('ganttCharts', chart, `gantt-chart-${index + 1}.png`)
  })
  data.append('sCurveChart', sCurveChart, 's-curve-chart.png')
  return await http.post(`${base}/${recordId}/export`, data, {
    params: { constructionId },
    responseType: 'blob',
  }) as unknown as Blob
}
