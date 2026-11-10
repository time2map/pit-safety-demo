<script setup lang="ts">
import { ref } from 'vue'
import { BellRing, ListChecks, MousePointerClick } from 'lucide-vue-next'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { Button } from '@/components/ui/button'

const KEY = 'psd-intro-dismissed'
const { options } = useApp()

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) != null
  } catch {
    return false
  }
}

const open = ref(options.mode === 'auto' && !wasDismissed())
const ICONS = [BellRing, MousePointerClick, ListChecks]

function dismiss() {
  open.value = false
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* storage blocked: the card simply shows again next visit */
  }
}
</script>

<template>
  <Transition
    appear
    enter-active-class="transition duration-300 ease-out delay-500"
    enter-from-class="opacity-0 scale-95"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="open" class="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-labelledby="intro-title"
        class="glass-floating pointer-events-auto w-[380px] max-w-full rounded-3xl p-5"
      >
        <h2 id="intro-title" class="text-base font-semibold tracking-[-0.01em]">{{ UI.intro.title }}</h2>
        <p class="mt-1.5 text-sm leading-relaxed text-neutral-700">{{ UI.intro.body }}</p>
        <ul class="mt-4 flex flex-col gap-2.5">
          <li v-for="(line, i) in UI.intro.lines" :key="line" class="flex items-center gap-2.5 text-sm">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/5 text-neutral-700">
              <component :is="ICONS[i]" :size="14" />
            </span>
            {{ line }}
          </li>
        </ul>
        <div class="mt-5 flex justify-end">
          <Button size="sm" @click="dismiss">{{ UI.intro.ok }}</Button>
        </div>
      </section>
    </div>
  </Transition>
</template>
