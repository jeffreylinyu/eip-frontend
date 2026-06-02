import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAiAssistantStore = defineStore('aiAssistant', () => {
  const open = ref(false)

  function toggle() {
    open.value = !open.value
  }

  function show() {
    open.value = true
  }

  function hide() {
    open.value = false
  }

  return { open, toggle, show, hide }
})

