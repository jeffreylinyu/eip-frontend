import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { companyApi, type Company, type CreateCompanyRequest, type UpdateCompanyRequest, companyDataTransform } from '@/api/company'
import { useUserCacheStore } from './user-cache'

export type { Company, CreateCompanyRequest, UpdateCompanyRequest }

export const useCompanyStore = defineStore('company', () => {
  // 狀態
  const companies = ref<Company[]>([])
  const currentCompany = ref<Company | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 分頁資訊
  const pagination = ref({
    total: 0,
    page: 1,
    pageSize: 10
  })

  // 用戶緩存
  const userCacheStore = useUserCacheStore()

  // 計算屬性
  const companiesWithUserInfo = computed(() => {
    return companies.value.map(company => ({
      ...company,
      // 使用公司資料中的用戶角色資訊
      userRole: company.userRole || 'MEMBER',
      joinedAt: company.joinedAt || company.createdAt,
      memberCount: company.memberCount || 1
    }))
  })

  const activeCompanies = computed(() => {
    return companies.value.filter(company => company.status === 'ACTIVE')
  })

  // 由於使用 CompanyMember API，所有公司都是當前用戶的公司
  const myCompanies = computed(() => {
    return companies.value
  })

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  const clearError = () => {
    error.value = null
  }

  // 初始化公司列表（使用公司列表 API）
  const initCompanies = async () => {
    setLoading(true)
    clearError()
    
    try {
      const response = await companyApi.getList()
      
      // 將 API 回應轉換為 Company 格式
      companies.value = response.map(companyDataTransform.fromApi)
      pagination.value.total = response.length
      pagination.value.page = 1
      pagination.value.pageSize = response.length

    } catch (err: any) {
      console.error('Failed to load companies:', err)
      setError('載入公司列表失敗')
      companies.value = []
    } finally {
      setLoading(false)
    }
  }

  // 建立公司
  const createCompany = async (companyData: CreateCompanyRequest): Promise<Company | null> => {
    setLoading(true)
    clearError()
    
    try {
      // 直接使用 CreateCompanyRequest 格式，因為它已經符合API要求
      const response = await companyApi.create(companyData)
      
      // 建立成功後重新查詢列表
      await initCompanies()
      
      return response as Company
    } catch (err: any) {
      console.error('Failed to create company:', err)
      setError('建立公司失敗')
      return null
    } finally {
      setLoading(false)
    }
  }

  // 獲取公司詳情
  const getCompanyDetail = async (companyId: string): Promise<Company | null> => {
    setLoading(true)
    clearError()
    
    try {
      const response = await companyApi.getDetail(companyId)
      const company = companyDataTransform.fromApi(response)
      
      // 更新緩存中的公司資訊（保留成員列表 API 才有的權限欄位，詳情 API 通常不帶）
      const index = companies.value.findIndex(c => c.companyId === companyId)
      if (index !== -1) {
        const existing = companies.value[index]
        companies.value[index] = {
          ...company,
          userRole: company.userRole ?? existing.userRole,
          companyPermission: company.companyPermission ?? existing.companyPermission,
          jobTitle: company.jobTitle ?? existing.jobTitle,
          joinedAt: company.joinedAt ?? existing.joinedAt,
          memberCount: company.memberCount ?? existing.memberCount,
        }
      }
      
      return company
    } catch (err: any) {
      console.error('Failed to get company detail:', err)
      setError('載入公司詳情失敗')
      return null
    } finally {
      setLoading(false)
    }
  }

  // 更新公司
  const updateCompany = async (companyId: string, companyData: CreateCompanyRequest): Promise<Company | null> => {
    setLoading(true)
    clearError()
    
    try {
      // 將 CreateCompanyRequest 轉換為 UpdateCompanyRequest 格式
      const updateData: UpdateCompanyRequest = {
        companyId: companyId,
        companyName: companyData.companyName,
        companyUnifiedNumber: companyData.companyUnifiedNumber,
        companyType: companyData.companyType,
        contractorLevel: companyData.contractorLevel, // 統一使用 contractorLevel
        companyStatus: 'Y', // 預設為啟用狀態
        address: companyData.address,
        phone: companyData.phone
      }
      
      const response = await companyApi.update(updateData)
      
      // 更新成功後重新查詢列表
      await initCompanies()
      
      return response as Company
    } catch (err: any) {
      console.error('Failed to update company:', err)
      setError('更新公司失敗')
      return null
    } finally {
      setLoading(false)
    }
  }

  // 刪除公司
  const deleteCompany = async (companyId: string): Promise<boolean> => {
    setLoading(true)
    clearError()
    
    try {
      await companyApi.delete(companyId)
      
      // 從本地數據中移除
      const index = companies.value.findIndex(c => c.companyId === companyId)
      if (index !== -1) {
        companies.value.splice(index, 1)
        pagination.value.total -= 1
      }
      
      return true
    } catch (err: any) {
      console.error('Failed to delete company:', err)
      setError('刪除公司失敗')
      return false
    } finally {
      setLoading(false)
    }
  }

  // 檢查公司權限
  const checkCompanyPermission = async (companyId: string) => {
    try {
      return await companyApi.checkPermission(companyId)
    } catch (err: any) {
      console.error('Failed to check company permission:', err)
      return { hasPermission: false, userRole: '' }
    }
  }

  // 設置當前公司
  const setCurrentCompany = (company: Company | null) => {
    currentCompany.value = company
  }

  // 根據 ID 獲取公司
  const getCompanyById = (companyId: string): Company | undefined => {
    return companies.value.find(company => company.companyId === companyId)
  }

  // 重置狀態
  const resetState = () => {
    companies.value = []
    currentCompany.value = null
    isLoading.value = false
    error.value = null
    pagination.value = {
      total: 0,
      page: 1,
      pageSize: 10
    }
  }

  return {
    // 狀態
    companies,
    currentCompany,
    isLoading,
    error,
    pagination,

    // 計算屬性
    companiesWithUserInfo,
    activeCompanies,
    myCompanies,

    // Actions
    initCompanies,
    createCompany,
    getCompanyDetail,
    updateCompany,
    deleteCompany,
    checkCompanyPermission,
    setCurrentCompany,
    getCompanyById,
    resetState,
    setLoading,
    setError,
    clearError
  }
})