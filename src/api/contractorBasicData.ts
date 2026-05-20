import http from '@/api/http'

export interface SupervisoryBasicDataPreviewField {
  key: string
  label: string
  supervisoryDisplay: string
  contractorDisplay: string
  copyable?: boolean
  displayHint?: string | null
}

export interface SupervisoryBasicDataPreviewResponse {
  fields: SupervisoryBasicDataPreviewField[]
  supervisoryVersionAvailable?: boolean
  contractorVersionLabel?: string | null
  resolvedSupervisoryVersionLabel?: string | null
}

export const contractorBasicDataApi = {
  async getSupervisoryPreview(
    constructionId: string,
    contractorDesignChangeId: number | null | undefined
  ): Promise<SupervisoryBasicDataPreviewResponse> {
    const params: Record<string, string> = {}
    if (contractorDesignChangeId != null && contractorDesignChangeId !== undefined) {
      params.contractorDesignChangeId = String(contractorDesignChangeId)
    }
    const res: any = await http.get(
      `/management/constructions/${encodeURIComponent(constructionId)}/contractor-basic-data/supervisory-preview`,
      { params }
    )
    const payload = res?.fields != null ? res : res?.data ?? res
    const fields = payload?.fields
    return {
      fields: Array.isArray(fields) ? fields : [],
      supervisoryVersionAvailable: payload?.supervisoryVersionAvailable !== false,
      contractorVersionLabel: payload?.contractorVersionLabel ?? null,
      resolvedSupervisoryVersionLabel: payload?.resolvedSupervisoryVersionLabel ?? null
    }
  },

  async copyFromSupervisory(
    constructionId: string,
    body: {
      contractorDesignChangeId: number | null | undefined
    }
  ): Promise<void> {
    await http.post(
      `/management/constructions/${encodeURIComponent(constructionId)}/contractor-basic-data/copy-from-supervisory`,
      {
        contractorDesignChangeId: body.contractorDesignChangeId ?? null
      }
    )
  }
}
