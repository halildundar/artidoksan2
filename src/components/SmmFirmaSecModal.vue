<script setup lang="ts">
import type { SmmFirmasi } from '@/services/smmFirmaService';

// SMM firması seçim popup'ı — TAM SAYFA açılır: havuzdaki (Ayarlar > SMM
// Firmaları) kayıtlar listelenir, satıra dokununca "sec" olayı yayılır ve
// popup kapanır. Seçili kayıt yeşil vurgulu gösterilir.
defineProps<{ firmalar: SmmFirmasi[]; seciliId?: string | null }>();
const emit = defineEmits<{ sec: [firma: SmmFirmasi] }>();
const acik = defineModel<boolean>('acik', { default: false });

function sec(f: SmmFirmasi) {
  emit('sec', f);
  acik.value = false;
}
</script>

<template>
  <Teleport to="body">
    <div v-if="acik" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
      <div
        class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 class="truncate text-sm font-bold text-ink">SMM Firması Seç</h2>
        <button type="button" @click="acik = false"
          class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
          ✕
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <div class="mx-auto max-w-lg space-y-2 p-4">
          <p v-if="!firmalar.length" class="py-8 text-center text-sm text-ink-muted">
            SMM firması yok. Ayarlar &gt; SMM Firmaları'ndan ekleyin.
          </p>

          <button v-for="f in firmalar" :key="f._id" type="button" @click="sec(f)"
            class="block w-full p-3 text-left ring-1 active:bg-[#1a2a20]"
            :class="f._id === seciliId
              ? 'bg-[#1d3a28] ring-[#2b5c3d]'
              : 'bg-surface-800 ring-white/5'">
            <span class="flex items-center gap-2">
              <span v-if="f.yil"
                class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                {{ f.yil }}
              </span>
              <span class="truncate text-xs font-semibold text-ink">{{ f.kisaAd }}</span>
              <svg v-if="f._id === seciliId" class="ml-auto h-4 w-4 shrink-0 text-[#6fcf97]"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="m5 13 4 4 10-10" />
              </svg>
            </span>
            <span class="mt-1 block truncate text-[11px] text-ink-muted">{{ f.unvan || '—' }}</span>
            <span v-if="f.makMuhAdSoyad || f.elkMuhAdSoyad"
              class="mt-0.5 block truncate text-[11px] text-ink-muted/80">
              {{ [f.makMuhAdSoyad, f.elkMuhAdSoyad].filter(Boolean).join(' • ') }}
            </span>
          </button>
        </div>
      </div>

      <div
        class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div class="mx-auto max-w-lg">
          <button type="button" @click="acik = false"
            class="w-full bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
