/**
 * Storage Manager
 * 統一管理 LocalStorage 的存取，提供型別安全與一致的鍵名
 */

const APP_PREFIX = 'eip_';

export const StorageKeys = {
  // Auth
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  LOGIN_REMEMBER_EMAIL: 'login_remember_email',
  
  // Workspace & Project
  SELECTED_WORKSPACE: 'selected_workspace',
  SELECTED_PROJECT: 'selected_project',
  WORKSPACES_CACHE: 'workspaces_cache', // 快取的工作空間列表
  PROJECTS_CACHE: 'projects_cache',     // 快取的專案列表 (備用)
  
  // Schedule
  SCHEDULE_DATA: 'schedule_data',
  SCHEDULE_VERSION: 'schedule_version',
  
  // Cache
  BASIC_DATA_CACHE: 'basic_data_cache',
  
  // Developer
  CUSTOM_API_BASE_URL: 'custom_api_base_url', // 開發者自訂 API Base URL
} as const;

type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];

class StorageManager {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 取得儲存的值
   * @param key StorageKeys 定義的鍵名
   * @returns 解析後的值，若無則返回 null
   */
  get<T>(key: StorageKey | string): T | null {
    const fullKey = this.getKey(key);
    const value = localStorage.getItem(fullKey);
    
    if (!value) return null;

    try {
      // 嘗試解析 JSON，如果是純字串可能會失敗或被解析為字串
      return JSON.parse(value) as T;
    } catch (e) {
      // 如果解析失敗，假設它是純字串 (例如 token)
      return value as unknown as T;
    }
  }

  /**
   * 儲存值
   * @param key StorageKeys 定義的鍵名
   * @param value 要儲存的值 (會自動轉為 JSON 字串)
   */
  set(key: StorageKey | string, value: any): void {
    const fullKey = this.getKey(key);
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(fullKey, stringValue);
  }

  /**
   * 移除特定鍵值
   * @param key StorageKeys 定義的鍵名
   */
  remove(key: StorageKey | string): void {
    const fullKey = this.getKey(key);
    localStorage.removeItem(fullKey);
  }

  /**
   * 清除所有以此前綴開頭的儲存項目
   */
  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  /**
   * 取得完整的鍵名 (用於除錯或特殊用途)
   */
  getFullKey(key: StorageKey | string): string {
    return this.getKey(key);
  }

  /**
   * 移除符合特定模式的鍵值
   * @param pattern 要匹配的字串模式 (會匹配完整鍵名，包含前綴)
   */
  removeByPattern(pattern: string): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(pattern)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

export const storage = new StorageManager(APP_PREFIX);
