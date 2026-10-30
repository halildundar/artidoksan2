<script setup lang="ts">
// Tüm silme işlemlerinin ortak "emin misiniz?" diyaloğu (kullanıcı kuralı:
// hiçbir yerde tarayıcının window.confirm'i kullanılmaz). `aciklama` silinecek
// kaydı tanımlayan kısa metindir; onay parent'ta gerçekleştirilir.
defineProps<{ acik: boolean; aciklama: string; siliniyor?: boolean }>();
const emit = defineEmits<{ vazgec: []; onayla: [] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="acik" class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      @click.self="emit('vazgec')">
      <div class="w-full max-w-sm bg-[#101a14] p-4 ring-1 ring-white/10">
        <h2 class="text-sm font-bold text-ink">Kaydı Sil</h2>
        <p class="mt-2 text-xs leading-relaxed text-ink-muted">
          <strong class="font-semibold text-ink">{{ aciklama }}</strong>
          kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div class="mt-4 flex gap-1.5">
          <button type="button" @click="emit('vazgec')"
            class="flex-1 bg-surface-800 px-4 py-2.5 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="button" :disabled="siliniyor" @click="emit('onayla')"
            class="flex-1 bg-red-900/80 px-4 py-2.5 text-xs font-semibold text-red-100 ring-1 ring-red-500/30 active:bg-red-900 disabled:opacity-50">
            {{ siliniyor ? 'Siliniyor…' : 'Sil' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
