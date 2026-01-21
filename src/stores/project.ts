import { defineStore } from 'pinia';
import { storage, StorageKeys } from '@/utils/storage';
import { getAllConstructions, getConstructionsByWorkspace, type Construction } from '@/api/construction';
import { useWorkspaceStore } from './workspace';

// 使用 Construction 接口，但保持原有的 Project 別名以便於遷移
export type Project = Construction;

export const useProjectStore = defineStore('project', {
  state: () => ({
    // 項目列表
    projects: [] as Construction[],
    // 當前選中的項目
    currentProject: null as Construction | null,
    // 加載狀態
    loading: false,
    // 錯誤信息
    error: null as string | null
  }),

  getters: {
    // 獲取當前項目名稱
    currentProjectName: (state) => {
      return state.currentProject?.constructionName || '請選擇項目工程';
    },
    
    // 獲取項目總數
    projectCount: (state) => state.projects.length,
    
    // 檢查是否有當前項目
    hasCurrentProject: (state) => !!state.currentProject
  },

  actions: {
    // 初始化項目數據
    async initProjects() {
      // 避免重複載入
      if (this.loading) return;
      
      // 內部函數：嘗試恢復或設定預設專案
      const tryRestoreOrSetDefault = () => {
        // 嘗試從 localStorage 恢復當前項目
        let storedProject = storage.get<Construction>(StorageKeys.SELECTED_PROJECT);
        
        // 兼容性檢查：嘗試讀取舊的 key
        if (!storedProject) {
             const oldStored = localStorage.getItem('currentProject');
             if (oldStored) {
                 try {
                     storedProject = JSON.parse(oldStored);
                 } catch (e) {}
             }
        }

        if (storedProject) {
          // 檢查存儲的項目是否在列表
          // 兼容兩種儲存格式：
          // 1. 完整 Construction 對象 (project.ts 儲存的) -> 使用 constructionId
          // 2. 簡化對象 { projectId, ... } (workspace.ts 儲存的) -> 使用 projectId
          const targetId = (storedProject as any).constructionId || (storedProject as any).projectId;
          
          if (targetId) {
             const foundProject = this.projects.find(p => p.constructionId === targetId);
             if (foundProject) {
               this.setCurrentProject(foundProject);
               return;
             }
          }
        }
        
        // 如果沒有當前項目但有項目列表，選擇第一個
        if (!this.currentProject && this.projects.length > 0) {
          this.setCurrentProject(this.projects[0]);
        }
      };

      // 如果已經有資料，直接檢查是否需要設定當前專案
      if (this.projects.length > 0) {
        if (!this.currentProject) {
           tryRestoreOrSetDefault();
        }
        return;
      }

      const workspaceStore = useWorkspaceStore();
      this.loading = true;
      try {
        // 從 API 獲取項目數據
        let apiProjects: Construction[] = [];
        
        // 如果有當前工作空間，只獲取該工作空間的工程案
        if (workspaceStore.currentWorkspace?.id) {
             apiProjects = await getConstructionsByWorkspace(workspaceStore.currentWorkspace.id);
             // 注入 workspaceId，以便後續儲存使用
             apiProjects.forEach(p => p.workspaceId = workspaceStore.currentWorkspace?.id);
        } else {
             // 否則獲取所有（或者可以考慮不獲取，視需求而定）
             apiProjects = await getAllConstructions();
        }
        
        this.projects = apiProjects;
        
        tryRestoreOrSetDefault();
        
        this.error = null;
      } catch (error) {
        this.error = '載入項目失敗';
        console.error('載入項目失敗:', error);
        
        // API 失敗時嘗試從 localStorage 載入
        await this.loadProjectsFromStorage();
      } finally {
        this.loading = false;
      }
    },

    // 從localStorage載入項目（備用方案）
    async loadProjectsFromStorage() {
      const stored = storage.get<Construction[]>(StorageKeys.PROJECTS_CACHE) || JSON.parse(localStorage.getItem('projects') || 'null');
      const storedSelection = storage.get<any>(StorageKeys.SELECTED_PROJECT) || JSON.parse(localStorage.getItem('currentProject') || 'null');
      
      if (stored) {
        this.projects = stored;
      }
      
      if (storedSelection) {
        // 嘗試還原選擇
        const targetId = storedSelection.constructionId || storedSelection.projectId;
        if (targetId) {
          const found = this.projects.find(p => p.constructionId === targetId);
          if (found) {
            this.currentProject = found;
          }
        }
      }
    },

    // 保存當前項目到localStorage
    saveCurrentProjectToStorage() {
      if (this.currentProject) {
        // 統一使用與 WorkspaceStore 相同的格式：{ projectId, workspaceId, timestamp }
        // 這樣可以解決不同頁面儲存格式不一致的問題
        const workspaceStore = useWorkspaceStore();
        storage.set(StorageKeys.SELECTED_PROJECT, {
           projectId: this.currentProject.constructionId,
           workspaceId: this.currentProject.workspaceId || workspaceStore.currentWorkspace?.id,
           timestamp: Date.now()
        });
      }
    },

    // 設置當前項目
    setCurrentProject(project: Construction) {
      this.currentProject = project;
      this.saveCurrentProjectToStorage();
    },

    // 重新載入項目列表
    async refreshProjects() {
      await this.initProjects();
    },

    // 清除錯誤
    clearError() {
      this.error = null;
    }
  }
}); 