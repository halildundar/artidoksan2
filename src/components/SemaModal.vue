<script setup lang="ts">
// Şema popup'larının ortak kabuğu — TAM SAYFA açılır (mobil uyum, kullanıcı
// isteği): üstte sabit başlık, ortada kayan içerik, altta sabit İptal/Tamam.
// ✕ ve İptal "iptal" olayı yayar (dinleyen sayfa kaydetmeden kapatabilir);
// Tamam yalnızca kapatır.
defineProps<{ title: string }>();
const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });

function iptal() {
  emit('iptal');
  open.value = false;
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
      <div
        class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 class="truncate text-sm font-bold text-ink">{{ title }}</h2>
        <button type="button" @click="iptal"
          class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
          ✕
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-auto">
        <div class="mx-auto max-w-lg p-4">
          <slot />
        </div>
      </div>
      <div
        class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div class="mx-auto flex max-w-lg gap-1.5">
          <button type="button" @click="iptal"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            İptal
          </button>
          <button type="button" @click="open = false"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            Tamam
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
