import http from './http'

/** 已加入專案列表中，不同參與側（監造／營造）會重複同一工程案；以工程案 ID 去重後的筆數 */
export function countDistinctConstructionProjects(list: unknown): number {
  if (!Array.isArray(list)) return 0
  const seen = new Set<string>()
  for (const p of list as { projectId?: string; constructionId?: string }[]) {
    const id = p?.projectId ?? p?.constructionId
    if (id == null || id === '') continue
    seen.add(String(id))
  }
  return seen.size
}

/** 依工程案 ID 去重，保留 API 回傳順序中的第一筆（供自動選取第一個工程案等） */
export function dedupeJoinedProjectsByConstructionId(list: unknown): any[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: any[] = []
  for (const p of list as any[]) {
    const id = p?.projectId ?? p?.constructionId
    if (id == null || id === '') {
      out.push(p)
      continue
    }
    const key = String(id)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

export interface LoginData {
  password: string
  email: string
}

export interface LoginResponse {
    id?: number
    userId: string
    jwtToken: string
    role: string  // 系統角色：SUPER_ADMIN, ADMIN, USER（向後兼容）
    systemRole?: string  // 新欄位：系統角色（優先使用）
}

export interface User {
  id: string
  userId: string
  username: string
  email: string
  role: string  // 系統角色：SUPER_ADMIN, ADMIN, USER（向後兼容）
  systemRole?: string  // 新欄位：系統角色（優先使用）
  createdAt: string
  updatedAt: string
  verify: boolean
  companyId?: string // 新增：所屬公司ID
  companyIds?: string[] // 新增：後端回傳的公司 ID 列表
  companyNames?: string[] // 新增：後端回傳的公司名稱列表（與 companyIds 順序對應）
  currentConstructionId?: string | null // 新增：使用者目前使用的工程案 ID
  currentWorkspaceId?: string | null // 新增：使用者目前使用的工作空間 ID
  // 可以添加更多用戶字段
}

export type UserSearchResult = Pick<User, 'userId' | 'username' | 'email'>

// 個人戶註冊數據
export interface IndividualRegisterData {
  username: string
  email: string
  password: string
}


export const userApi = {
  // 系統管理員建立新帳號 (並關聯公司)
  create: async (data: { 
    username: string; 
    email: string; 
    companyId: string; 
    role?: string;
    password: string;
    companyRole?: string;
  }): Promise<User> => {
    // 1. 建立 User (後端會回傳 userId)
    const registerResponse: any = await http.post('/management/user/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        isPaidUser: 'N'
    });
    
    // 獲取 userId (http interceptor 會自動解包 data.data)
    const userId = registerResponse?.userId;

    if (!userId) {
        throw new Error('帳號建立成功，但無法獲取 User ID，請手動綁定公司。');
    }

    // 2. 綁定公司
    if (data.companyId) {
        // 動態導入避免循環依賴
        const { companyApi } = await import('./company'); 
        await companyApi.inviteMember({
            userId,
            companyId: data.companyId,
            role: data.companyRole || 'ADMIN_STAFF' // 預設角色
        });
    }

    return { userId, username: data.username, email: data.email, role: 'USER' } as User;
  },

  // 授權專案 (User-Workspace Binding)
  grantProjectAccess: (data: {
    userId: string;
    workspaceId: string;
    role: string;
    companyId?: string; // 新增 companyId 用於檢核
  }): Promise<void> => {
    // 根據新需求使用 userWorkspace/invite 並帶入 companyId
    const url = data.companyId 
      ? `/management/userWorkspace/invite?companyId=${data.companyId}`
      : '/management/userWorkspace/invite';
      
    return http.post(url, {
      userId: data.userId,
      workspaceId: data.workspaceId,
      role: data.role
    })
  },
  
  // 獲取使用者已加入的專案
  getJoinedProjects: (userId: string): Promise<any[]> => {
    return http.get(`/management/user/${userId}/projects`)
  },

  // 搜尋用戶
  search: async (keyword: string, companyId: string): Promise<UserSearchResult[]> => {
    const response = await http.get('/management/user/search', {
      params: { keyword, companyId }
    })
    const data = (response as any).data || response
    return Array.isArray(data) ? data : []
  },

  // 獲取所有用戶（系統管理員專用）
  getAll: async (): Promise<User[]> => {
    const response = await http.get('/management/admin/user/all')
    const data = (response as any).data || response
    return Array.isArray(data) ? data : []
  },

  /** 停用使用者（軟刪除，SUPER_ADMIN / ADMIN） */
  delete: async (userId: string): Promise<void> => {
    await http.delete(`/management/admin/user/${encodeURIComponent(userId)}`)
  },

  /** 變更他人系統角色（SUPER_ADMIN / ADMIN，規則見後端）；變更後對方須重新登入 */
  updateSystemRole: async (userId: string, systemRole: string): Promise<void> => {
    await http.patch(`/management/admin/user/${encodeURIComponent(userId)}/system-role`, {
      systemRole
    })
  }
}

export const authApi = {
  // 登入
  login: (data: LoginData): Promise<LoginResponse> => {
    return http.post('/management/user/login', data)
  },

  /** Firebase Google 登入（後端驗證 idToken 後回傳與帳密登入相同結構） */
  loginWithFirebase: (idToken: string): Promise<LoginResponse> => {
    return http.post('/management/user/login/firebase', { idToken })
  },

  // 登出身分由後端 JWT principal 判定。
  logout: (): Promise<void> => {
    return http.post('/management/user/logout')
  },

  // 取得目前登入者的完整資料
  getCurrentUser: (): Promise<User> => {
    return http.get('/management/user/me')
  },

  // 取得畫面顯示所需的最小公開資料
  getBasicUser: (userId: string): Promise<Pick<User, 'userId' | 'username'>> => {
    return http.get(`/management/user/${encodeURIComponent(userId)}/basic`)
  },

  /** 更新個人資料（目前僅支援顯示名稱），只能更新自己的帳號 */
  updateProfile: (data: { username: string }): Promise<void> => {
    return http.patch('/management/user/profile', data)
  },

  // 更新使用者目前使用的工程案和工作空間
  updateCurrentConstruction: (constructionId: string | null, workspaceId?: string | null): Promise<void> => {
    return http.patch('/management/user/current-construction', {
      constructionId,
      workspaceId
    })
  },

  // 刷新token
  refreshToken: (): Promise<{ jwtToken: string }> => {
    return http.post('/management/user/refresh-token')
  },

  // 個人戶註冊
  registerIndividual: (data: IndividualRegisterData): Promise<any> => {
    return http.post('/management/user/register', data)
  }
}
