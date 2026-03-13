<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import {
  useWorkspaceStore,
  type Workspace,
  type WorkspaceProject,
} from "@/stores/workspace";
import Drawer from "@/components/bootstrap/Drawer.vue";
import Card from "@/components/bootstrap/Card.vue";
import CardBody from "@/components/bootstrap/CardBody.vue";
import CardHeader from "@/components/bootstrap/CardHeader.vue";

const workspaceStore = useWorkspaceStore();
const router = useRouter();

// Props
const props = defineProps<{
  show: boolean;
}>();

// Emits
const emit = defineEmits<{
  "update:show": [value: boolean];
  hide: [];
  workspaceSelected: [workspace: Workspace];
  projectSelected: [project: WorkspaceProject];
}>();

// 狀態
const searchQuery = ref("");
const expandedWorkspaces = ref<Set<string>>(new Set());
const loadingProjects = ref<Set<string>>(new Set());

// 計算屬性
const showDrawer = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
});

const filteredWorkspaces = computed(() => {
  if (!searchQuery.value) return workspaceStore.workspacesWithUserInfo;

  const query = searchQuery.value.toLowerCase();
  return workspaceStore.workspacesWithUserInfo.filter((workspace) => {
    // 搜索工作空間名稱或描述
    const workspaceMatch =
      workspace.name.toLowerCase().includes(query) ||
      workspace.description.toLowerCase().includes(query);

    // 搜索工作空間擁有者
    const ownerMatch = workspace.ownerDisplayName.toLowerCase().includes(query);

    // 搜索工作空間下的項目 - 從本地狀態搜索
    const projects = workspaceStore.workspaceProjects.filter(p => p.workspaceId === workspace.id)
    const projectMatch = projects.some(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.location.toLowerCase().includes(query) ||
        project.managerName.toLowerCase().includes(query)
    );

    return workspaceMatch || ownerMatch || projectMatch;
  });
});

// 方法
const hideDrawer = () => {
  emit("update:show", false);
  emit("hide");
};

const toggleWorkspace = async (workspaceId: string) => {
  if (expandedWorkspaces.value.has(workspaceId)) {
    expandedWorkspaces.value.delete(workspaceId);
  } else {
    expandedWorkspaces.value.add(workspaceId);
    
    // 當展開工作空間時，載入該工作空間的工程案
    try {
      loadingProjects.value.add(workspaceId);
      await workspaceStore.getProjectsByWorkspace(workspaceId);
    } catch (error) {
      console.error('載入工作空間工程案失敗:', error);
    } finally {
      loadingProjects.value.delete(workspaceId);
    }
  }
};

const selectWorkspace = (workspace: Workspace) => {
  // 只展開/收起工作空間，不設置為當前工作空間
  // 用戶必須選擇具體的項目才能完成選擇
  toggleWorkspace(workspace.id);
};

const selectProject = async (project: WorkspaceProject) => {
  // 自動設置該項目所屬的工作空間為當前工作空間
  const workspace = workspaceStore.workspacesWithUserInfo.find(
    (ws) => ws.id === project.workspaceId
  );
  if (workspace) {
    await workspaceStore.setCurrentWorkspace(workspace);
  }

  workspaceStore.switchProject(project.id);
  emit("projectSelected", project);
  hideDrawer();
};

const goToManagement = () => {
  router.push("/workspace/management");
  hideDrawer();
};

const getProjectsByWorkspace = (workspaceId: string) => {
  // 從本地狀態獲取工程案，而不是調用 async 方法
  return workspaceStore.workspaceProjects.filter(p => p.workspaceId === workspaceId);
};

const getProgressColor = (progress: number) => {
  if (progress < 30) return "danger";
  if (progress < 70) return "warning";
  return "success";
};

const getStatusColor = (status: string) => {
  const colors = {
    PLANNING: "info",
    IN_PROGRESS: "success",
    COMPLETED: "primary",
    SUSPENDED: "warning",
  };
  return colors[status] || "secondary";
};

const getStatusText = (status: string) => {
  const texts = {
    PLANNING: "規劃中",
    IN_PROGRESS: "進行中",
    COMPLETED: "已完成",
    SUSPENDED: "暫停",
  };
  return texts[status] || status;
};

const getRoleColor = (role: string) => {
  const colors = {
    OWNER: "danger",
    ADMIN: "warning",
    MEMBER: "primary",
    VIEWER: "secondary",
  };
  return colors[role] || "secondary";
};

const getRoleText = (role: string) => {
  const texts = {
    OWNER: "擁有者",
    ADMIN: "管理員",
    MEMBER: "成員",
    VIEWER: "檢視者",
  };
  return texts[role] || role;
};

// 生命週期
onMounted(async () => {
  await workspaceStore.initWorkspaces();
  // 重置展開狀態，只展開當前工作空間
  expandedWorkspaces.value.clear();
  if (workspaceStore.currentWorkspace) {
    expandedWorkspaces.value.add(workspaceStore.currentWorkspace.id);
    
    // 預載入當前工作空間的工程案
    try {
      loadingProjects.value.add(workspaceStore.currentWorkspace.id);
      await workspaceStore.getProjectsByWorkspace(workspaceStore.currentWorkspace.id);
    } catch (error) {
      console.error('預載入工程案失敗:', error);
    } finally {
      loadingProjects.value.delete(workspaceStore.currentWorkspace.id);
    }
  }
});

// 監聽顯示狀態變化
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      // 每次打開時重置展開狀態，只展開當前工作空間
      expandedWorkspaces.value.clear();
      if (workspaceStore.currentWorkspace) {
        expandedWorkspaces.value.add(workspaceStore.currentWorkspace.id);
      }
    }
  }
);
</script>

<template>
  <Drawer
    v-model:show="showDrawer"
    title="工作空間與項目"
    icon="fa fa-sitemap"
    size="lg"
    hide-confirm-button
    @hide="hideDrawer"
  >
    <template #body>
      <!-- 搜索欄 -->
      <div class="mb-3">
        <div class="input-group">
          <span class="input-group-text">
            <i class="fa fa-search"></i>
          </span>
          <input
            type="text"
            class="form-control"
            v-model="searchQuery"
            placeholder="搜索工作空間或項目..."
          />
        </div>
      </div>

      <!-- 操作提示 -->
      <div class="alert alert-info py-2 px-3 mb-4 border-0 bg-opacity-10">
        <small class="text-muted">
          <i class="fa fa-info-circle me-1"></i>
          點擊工作空間名稱展開，點擊具體項目進行選擇
        </small>
      </div>

      <!-- 工作空間列表 -->
      <div class="workspace-list">
        <div
          v-for="workspace in filteredWorkspaces"
          :key="workspace.id"
          class="mb-3"
        >
          <card
            class="workspace-selector-card"
            :class="{
              'current-workspace':
                workspace.id === workspaceStore.currentWorkspace?.id,
              expanded: expandedWorkspaces.has(workspace.id),
            }"
          >
            <card-header class="pb-2">
              <div class="d-flex justify-content-between align-items-start">
                <div
                  class="flex-grow-1"
                  @click="selectWorkspace(workspace)"
                  style="cursor: pointer"
                >
                  <div class="d-flex align-items-center mb-2">
                    <div
                      class="workspace-toggle-arrow me-2"
                      @click.stop="toggleWorkspace(workspace.id)"
                    >
                      <i
                        :class="[
                          'fa',
                          'fa-chevron-' +
                            (expandedWorkspaces.has(workspace.id)
                              ? 'down'
                              : 'right'),
                          'toggle-arrow-icon',
                        ]"
                      ></i>
                    </div>
                    <i class="fa fa-building text-muted me-2"></i>
                    <h6 class="fw-bold mb-0">{{ workspace.name }}</h6>
                    <span
                      v-if="workspace.ownerInfo"
                      class="text-warning ms-2"
                      title="擁有者"
                    >
                      <i class="fa fa-crown"></i>
                    </span>
                  </div>
                  <p class="text-muted small mb-0">
                    {{ workspace.description || "暫無描述" }}
                  </p>
                </div>

                <span
                  :class="`badge border border-${getRoleColor(workspace.role)} text-${getRoleColor(workspace.role)} px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center`"
                >
                  {{ getRoleText(workspace.role) }}
                </span>
              </div>
            </card-header>

            <card-body class="pt-2">
              <div class="row g-2">
                <div class="col-4">
                  <div class="d-flex align-items-center">
                    <i class="fa fa-user text-muted me-2 fs-14px"></i>
                    <span class="small">{{ workspace.ownerDisplayName }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div class="d-flex align-items-center">
                    <i class="fa fa-users text-muted me-2 fs-14px"></i>
                    <span class="small">{{ workspace.memberCount }} 成員</span>
                  </div>
                </div>
                <div class="col-4">
                  <div class="d-flex align-items-center">
                    <i
                      class="fa fa-project-diagram text-muted me-2 fs-14px"
                    ></i>
                    <span class="small">{{ workspace.projectCount }} 工程案</span>
                  </div>
                </div>
              </div>

              <!-- 工程案列表 -->
              <div
                v-if="expandedWorkspaces.has(workspace.id)"
                class="projects-section mt-3 pt-3 border-top"
              >
                <!-- 載入狀態 -->
                <div v-if="loadingProjects.has(workspace.id)" class="text-center py-3">
                  <div class="spinner-border spinner-border-sm text-theme me-2" role="status">
                    <span class="visually-hidden">載入中...</span>
                  </div>
                  <span class="text-muted small">載入工程案中...</span>
                </div>
                
                <!-- 工程案列表 -->
                <div
                  v-else-if="getProjectsByWorkspace(workspace.id).length > 0"
                  class="row g-2"
                >
                  <div
                    v-for="project in getProjectsByWorkspace(workspace.id)"
                    :key="project.id"
                    class="col-12"
                  >
                    <div
                      class="project-selector-item p-2 rounded"
                      :class="{
                        'current-project':
                          project.id === workspaceStore.currentProject?.id,
                      }"
                      @click="selectProject(project)"
                    >
                      <div
                        class="d-flex justify-content-between align-items-start mb-1"
                      >
                        <div class="d-flex align-items-center">
                          <i
                            class="fa fa-project-diagram text-theme me-2 fs-14px"
                          ></i>
                          <span class="fw-semibold small">{{
                            project.name
                          }}</span>
                        </div>
                        <span
                          :class="`badge border border-${getStatusColor(project.status)} text-${getStatusColor(project.status)} px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center`"
                        >
                          {{ getStatusText(project.status) }}
                        </span>
                      </div>

                      <div class="row g-2 mb-2">
                        <div class="col-4">
                          <div class="d-flex align-items-center">
                            <i
                              class="fa fa-map-marker-alt text-muted me-1 fs-12px"
                            ></i>
                            <span class="small text-muted">{{
                              project.location
                            }}</span>
                          </div>
                        </div>
                        <div class="col-4">
                          <div class="d-flex align-items-center">
                            <i class="fa fa-user text-muted me-1 fs-12px"></i>
                            <span class="small text-muted">{{
                              project.managerName
                            }}</span>
                          </div>
                        </div>
                        <div class="col-4">
                          <div class="d-flex align-items-center">
                            <i
                              class="fa fa-chart-line text-muted me-1 fs-12px"
                            ></i>
                            <span class="small text-muted"
                              >{{ project.progress }}%</span
                            >
                          </div>
                        </div>
                      </div>

                      <!-- 進度條 -->
                      <div class="progress" style="height: 3px">
                        <div
                          :class="`progress-bar bg-${getProgressColor(project.progress)}`"
                          :style="{ width: project.progress + '%' }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 無項目提示 -->
                <div v-else class="text-center py-3">
                  <i class="fa fa-folder-open text-muted me-2"></i>
                  <span class="text-muted small">此工作空間暫無項目</span>
                </div>
              </div>
            </card-body>
          </card>
        </div>
      </div>

      <!-- 無結果提示 -->
      <div
        v-if="filteredWorkspaces.length === 0"
        class="text-center py-5 text-muted"
      >
        <i class="fa fa-search fa-2x mb-3"></i>
        <p>沒有找到匹配的工作空間或項目</p>
      </div>
    </template>

    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <div class="text-muted small">
          <span v-if="workspaceStore.currentProject">
            當前項目：{{ workspaceStore.getCurrentWorkspaceName }} /
            {{ workspaceStore.getCurrentProjectName }}
          </span>
          <span v-else class="text-warning">
            <i class="fa fa-exclamation-triangle me-1"></i>
            請選擇工程案
          </span>
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="btn btn-outline-theme btn-sm"
            @click="goToManagement"
          >
            <i class="fa fa-cogs me-1"></i>
            管理
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            @click="hideDrawer"
          >
            關閉
          </button>
        </div>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.workspace-list {
  user-select: none;
}

.workspace-selector-card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.workspace-selector-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

.workspace-selector-card.current-workspace {
  border-color: var(--bs-theme);
  box-shadow: 0 0 0 0.1rem rgba(var(--bs-theme-rgb), 0.25);
}

.projects-section {
  animation: fadeIn 0.3s ease;
}

.project-selector-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.project-selector-item:hover {
  border-color: rgba(var(--bs-theme-rgb), 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
}

.project-selector-item.current-project {
  background-color: rgba(var(--bs-theme-rgb), 0.1);
  border-color: var(--bs-theme);
}

.project-selector-item.current-project:hover {
  background-color: rgba(var(--bs-theme-rgb), 0.15);
}

.workspace-toggle-arrow {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  border: 1px solid var(--bs-border-color);
  background-color: transparent;
  transition: all 0.3s ease;
}

.workspace-toggle-arrow:hover {
  border-color: var(--bs-theme);
  transform: scale(1.1);
}

.workspace-toggle-arrow:hover .toggle-arrow-icon {
  color: var(--bs-theme);
}

.toggle-arrow-icon {
  font-size: 10px;
  color: var(--bs-secondary);
  transition: all 0.3s ease;
}

.workspace-selector-card.current-workspace .workspace-toggle-arrow {
  border-color: var(--bs-theme);
}

.workspace-selector-card.current-workspace .toggle-arrow-icon {
  color: var(--bs-theme);
}

.progress {
  background-color: rgba(var(--bs-theme-rgb), 0.1);
  border-radius: 3px;
}

.progress-bar {
  border-radius: 3px;
}

.fs-14px {
  font-size: 14px;
}

.fs-12px {
  font-size: 12px;
}

.fs-10px {
  font-size: 10px;
}

/* 響應式 */
@media (max-width: 768px) {
  .workspace-selector-card {
    margin-bottom: 1rem;
  }

  .workspace-selector-card:hover {
    transform: none;
    box-shadow: none;
  }

  .project-selector-item:hover {
    transform: none;
    box-shadow: none;
  }
}

/* 動畫效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
