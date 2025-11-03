<template>
  <div>
    <!-- 隱藏此頁面按鈕 -->
    <div class="d-flex justify-content-end mt-3 mb-3">
      <button class="btn btn-sm btn-outline-secondary" @click="onHideTutorial">
        <i class="fa fa-eye-slash me-1"></i>隱藏此頁面
      </button>
    </div>

    <!-- 頁首 -->
    <div class="text-center mb-4">
      <h1 class="h3 mb-2">🔰 工程排程教學</h1>
      <p class="text-muted">
        透過「工程排程器、要徑圖、甘特圖」三個頁面，快速了解如何從工項定義到自動排程。
      </p>
    </div>

    <!-- 概念流程圖 -->
    <card class="mb-4">
      <card-body>
        <h2 class="h5 mb-4">整體流程概念</h2>
        <div
          class="d-flex align-items-center justify-content-center flex-wrap gap-4"
        >
          <div class="d-flex flex-column align-items-center">
            <div
              class="flow-box bg-primary bg-opacity-10 text-primary clickable"
              @click="goToPage('/schedule/versions')"
              role="button"
              tabindex="0"
            >
              工程排程器
            </div>
            <p class="mt-2 small text-muted">定義階層與工期</p>
          </div>

          <div class="text-muted fs-1">→</div>

          <div class="d-flex flex-column align-items-center">
            <div
              class="flow-box bg-warning bg-opacity-10 text-warning clickable"
              @click="goToPage('/schedule/cpm')"
              role="button"
              tabindex="0"
            >
              CPM 要徑圖
            </div>
            <p class="mt-2 small text-muted">設定依賴與關聯線</p>
          </div>

          <div class="text-muted fs-1">→</div>

          <div class="d-flex flex-column align-items-center">
            <div
              class="flow-box bg-success bg-opacity-10 text-success clickable"
              @click="goToPage('/schedule/gantt')"
              role="button"
              tabindex="0"
            >
              甘特圖
            </div>
            <p class="mt-2 small text-muted">檢視排程與要徑</p>
          </div>
        </div>
        <p class="text-center small text-muted mt-4 mb-0">
          三個頁面共用同一組版本資料，可依順序建立，也可自由切換進行編輯。<br />
          系統在切換頁面時會自動重新計算與更新要徑與排程。
        </p>
      </card-body>
    </card>

    <!-- 功能說明卡片 -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <card>
          <card-body>
            <h3 class="h6 mb-3 text-primary">1️⃣ 工程排程器</h3>
            <ul class="small mb-0">
              <li>建立與管理多個排程版本</li>
              <li>建立工程階層（WBS）與子工項</li>
              <li>輸入每項工期與基本資訊</li>
              <li>此資料將作為要徑與排程的基礎</li>
            </ul>
          </card-body>
        </card>
      </div>

      <div class="col-md-4">
        <card>
          <card-body>
            <h3 class="h6 mb-3 text-warning">2️⃣ CPM 要徑圖</h3>
            <ul class="small mb-0">
              <li>以節點線圖顯示工項關係</li>
              <li>可直接拉線、刪線設定依賴</li>
              <li>支援 FS、SS、FF、SF 四種邏輯</li>
              <li>變更後會重新計算要徑</li>
            </ul>
          </card-body>
        </card>
      </div>

      <div class="col-md-4">
        <card>
          <card-body>
            <h3 class="h6 mb-3 text-success">3️⃣ 甘特圖</h3>
            <ul class="small mb-0">
              <li>顯示每個工項的開始與結束日期</li>
              <li>支援拖曳修改日期與工期</li>
              <li>可顯示基線與關鍵路徑（紅色條）</li>
              <li>同步更新資料與要徑</li>
            </ul>
          </card-body>
        </card>
      </div>
    </div>

    <!-- 操作建議 -->
    <div class="alert alert-info mb-4">
      <h2 class="h6 mb-2">💡 操作建議</h2>
      <ul class="small mb-0">
        <li>
          第一次建立專案時，建議依照順序操作：工程排程器 → CPM 要徑圖 →
          甘特圖。
        </li>
        <li>後續維護階段可在任意頁面自由編輯，系統會自動同步。</li>
        <li>切換頁面時系統會自動重新計算排程與要徑。</li>
      </ul>
    </div>

    <!-- 開始按鈕 -->
    <div class="text-center mb-5">
      <button @click="goToProject" class="btn btn-primary btn-lg">
        開始建立專案
        <i class="fa fa-arrow-right ms-2"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAppSidebarMenuStore } from "@/stores/app-sidebar-menu";

const router = useRouter();
const sidebarStore = useAppSidebarMenuStore();

const CURRENT_TUTORIAL_URL = "/schedule/tutorial";

// 隱藏此頁面
const onHideTutorial = () => {
  if (
    confirm(
      "確定要隱藏此教學頁面嗎？\n\n隱藏後，此頁面將不會顯示在側邊欄選單中。\n您可以隨時在系統設定中恢復顯示。"
    )
  ) {
    // 隱藏教學頁面
    sidebarStore.hideTutorial(CURRENT_TUTORIAL_URL);
    // 重新整理頁面以更新側邊欄
    window.location.reload();
  }
};

const goToPage = (path: string) => {
  router.push(path);
};

const goToProject = () => {
  router.push("/schedule/versions"); // 導向版本管理頁面
};
</script>

<style scoped>
/* 流程圖方塊 */
.flow-box {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-weight: 600;
  text-align: center;
  padding: 1rem;
  transition: all 0.3s ease;
}

.flow-box.clickable {
  cursor: pointer;
  user-select: none;
}

.flow-box.clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.flow-box.clickable:active {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* 淡入動畫 */
.card,
.alert {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
