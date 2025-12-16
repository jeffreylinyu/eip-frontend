import { defineStore } from 'pinia';
import { storage, StorageKeys } from '@/utils/storage';
import { getAllConstructions, type Construction } from '@/api/construction';

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
      this.loading = true;
      try {
        // 從 API 獲取項目數據
        const apiProjects = await getAllConstructions();
        this.projects = apiProjects;
        
        // 嘗試從 localStorage 恢復當前項目
        const currentStored = storage.get<Construction>(StorageKeys.SELECTED_PROJECT); // 注意：StorageKeys 中定義的是 CURRENT_PROJECT 但值是 'current_project'，這裡我們需要確認是否要遷移舊資料
        // 為了相容性，我們可能需要先檢查舊的 key，或者直接切換到新的 key。
        // 根據計畫，我們接受 key 變更導致的登出/重置。
        // 但為了更好的體驗，我們可以嘗試讀取舊的 key (如果新的沒有)
        
        let storedProject = currentStored;
        if (!storedProject) {
             // 嘗試讀取舊的 key (僅作遷移用，之後可移除)
             const oldStored = localStorage.getItem('currentProject');
             if (oldStored) {
                 try {
                     storedProject = JSON.parse(oldStored);
                 } catch (e) {}
             }
        }

        if (storedProject) {
          // 檢查存儲的項目是否在 API 返回的項目列表中
          const foundProject = this.projects.find(p => p.constructionId === storedProject!.constructionId);
          if (foundProject) {
            this.currentProject = foundProject;
            // 如果是從舊 key 讀到的，更新到新 key
            if (!currentStored) {
                this.saveCurrentProjectToStorage();
            }
          }
        }
        
        // 如果沒有當前項目但有項目列表，選擇第一個
        if (!this.currentProject && this.projects.length > 0) {
          this.setCurrentProject(this.projects[0]);
        }
        
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
      const currentStored = storage.get<Construction>(StorageKeys.SELECTED_PROJECT) || JSON.parse(localStorage.getItem('currentProject') || 'null');
      
      if (stored) {
        this.projects = stored;
      }
      
      if (currentStored) {
        this.currentProject = currentStored;
      }
    },

    // 保存當前項目到localStorage
    saveCurrentProjectToStorage() {
      if (this.currentProject) {
        storage.set(StorageKeys.SELECTED_PROJECT, this.currentProject);
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