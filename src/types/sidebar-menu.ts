/**
 * 側邊欄選單節點（監造／營造／管理後台 store 共用欄位約定）
 */
export interface SidebarMenuItem {
  text?: string
  is_header?: boolean
  is_divider?: boolean
  url?: string
  icon?: string
  highlight?: boolean
  children?: SidebarMenuItem[]
  label?: string
  isTutorial?: boolean
  requiresAdmin?: boolean
  /**
   * 是否顯示於側邊欄。未設定或 true 為顯示；false 為不顯示（含其子項）。
   */
  visible?: boolean
}
