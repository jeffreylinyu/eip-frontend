import http from './http';

/**
 * 權限列舉（工程案權限）
 */
export enum ConstructionPermissionEnum {
  ADMIN = "ADMIN",      // 工程案管理員
  MEMBER = "MEMBER",    // 工程案成員
  VIEWER = "VIEWER"     // 工程案檢視者
}

/**
 * 職位列舉（工程案職位/職稱）
 */
export enum ConstructionJobTitleEnum {
  OWNER = "OWNER",                    // 負責人
  ADMIN = "ADMIN",                    // 公司管理員
  LABOUR_SAFETY = "LABOUR_SAFETY",    // 勞安
  CONSTRUCTION_MANAGER = "CONSTRUCTION_MANAGER",  // 工地負責人
  TECHNICIAN = "TECHNICIAN",          // 技師
  ARCHITECT = "ARCHITECT",            // 建築師
  QUALITY = "QUALITY",                // 品管
  ADMIN_STAFF = "ADMIN_STAFF",        // 行政人員
  SITE_WORKER = "SITE_WORKER"         // 現場人員
}

/**
 * @deprecated 使用 ConstructionJobTitleEnum 替代
 */
export enum ConstructionRoleEnum {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  LABOUR_SAFETY = "LABOUR_SAFETY",
  CONSTRUCTION_MANAGER = "CONSTRUCTION_MANAGER",
  TECHNICIAN = "TECHNICIAN",
  ARCHITECT = "ARCHITECT",
  QUALITY = "QUALITY",
  ADMIN_STAFF = "ADMIN_STAFF",
  SITE_WORKER = "SITE_WORKER"
}

export interface UserConstructionRequest {
  userId: string;
  constructionId: string;
  role?: string;              // 職位：LABOUR_SAFETY, QUALITY ...（向後兼容）
  jobTitle?: string;           // 新欄位：工程案職位（優先使用）
  permission?: string;         // 權限：ADMIN, MEMBER, VIEWER（向後兼容）
  constructionPermission?: string;  // 新欄位：工程案權限（優先使用）
  status?: string;
}

export interface UserConstructionResponse {
  id: number;
  userId: string;
  constructionId: string;
  role: string;  // 職位（向後兼容）
  jobTitle?: string;  // 新欄位：工程案職位（優先使用）
  permission: string;  // 權限（向後兼容）
  constructionPermission?: string;  // 新欄位：工程案權限（優先使用）
  status: string;
  joinedAt: string;
  updatedAt: string;
}

export const userConstructionApi = {
  /**
   * 邀請用戶加入工程案
   */
  invite: async (data: UserConstructionRequest): Promise<UserConstructionResponse> => {
    const response = await http.post('/management/userConstruction/invite', data);
    return (response as any).data || response;
  },

  /**
   * 更新用戶在工程案中的權限
   */
  updatePermission: async (data: { userId: string; constructionId: string; permission: string }): Promise<UserConstructionResponse> => {
    const response = await http.patch('/management/userConstruction/updatePermission', data);
    return (response as any).data || response;
  },

  /**
   * 更新用戶在工程案中的角色
   */
  updateRole: async (data: { userId: string; constructionId: string; role: string }): Promise<UserConstructionResponse> => {
    const response = await http.patch('/management/userConstruction/updateRole', data);
    return (response as any).data || response;
  },

  /**
   * 移除用戶從工程案
   */
  remove: async (targetUserId: string, constructionId: string): Promise<void> => {
    await http.delete(`/management/userConstruction/remove`, {
      params: { targetUserId, constructionId }
    });
  },

  /**
   * 獲取工程案的所有成員
   */
  getMembers: async (constructionId: string): Promise<UserConstructionResponse[]> => {
    const response = await http.get(`/management/userConstruction/construction/${constructionId}/members`);
    const data = (response as any).data || response;
    return Array.isArray(data) ? data : [];
  },

  /**
   * 獲取用戶的所有工程案 (包含權限資訊)
   */
  getUserConstructions: async (userId: string): Promise<UserConstructionResponse[]> => {
    const response = await http.get(`/management/userConstruction/user/${userId}/constructions`);
    const data = (response as any).data || response;
    return Array.isArray(data) ? data : [];
  }
};

export default userConstructionApi;
