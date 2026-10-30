<script setup lang="ts">
import { computed, ref } from 'vue';

// Aranabilir seçim kutusu (combobox): input hem seçili değeri gösterir hem de
// yazdıkça seçenekleri filtreler. il/ilçe/mahalle gibi uzun listeler için.
export interface AramaliSecenek {
  label: string;
  value: string | number;
}

const props = withDefaults(
  defineProps<{ options: AramaliSecenek[]; placeholder?: string; disabled?: boolean }>(),
  { placeholder: 'Seçiniz', disabled: false }
);

const model = defineModel<string | number | null>({ default: null });

const acik = ref(false);
const aramaMetni = ref('');
const vurgulu = ref(0);

const seciliLabel = computed(
  () => props.options.find((o) => o.value === model.value)?.label ?? ''
);

// Çok büyük listelerde (örn. 3000+ onaylı kurum) DOM şişmesin diye en fazla
// 150 seçenek render edilir — kullanıcı yazdıkça liste daralır.
const RENDER_SINIRI = 150;
const filtreli = computed(() => {
  const q = aramaMetni.value.trim().toLocaleLowerCase('tr-TR');
  const liste = q
    ? props.options.filter((o) => o.label.toLocaleLowerCase('tr-TR').includes(q))
    : props.options;
  return liste.slice(0, RENDER_SINIRI);
});

function ac() {
  if (props.disabled) return;
  acik.value = true;
  aramaMetni.value = '';
  vurgulu.value = 0;
}

function kapat() {
  acik.value = false;
  aramaMetni.value = '';
}

function yaz(event: Event) {
  aramaMetni.value = (event.target as HTMLInputElement).value;
  acik.value = true;
  vurgulu.value = 0;
}

function sec(secenek: AramaliSecenek) {
  model.value = secenek.value;
  kapat();
}

function tusa(event: KeyboardEvent) {
  if (!acik.value && (event.key === 'ArrowDown' || event.key === 'Enter')) {
    ac();
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    vurgulu.value = Math.min(vurgulu.value + 1, filtreli.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    vurgulu.value = Math.max(vurgulu.value - 1, 0);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const secenek = filtreli.value[vurgulu.value];
    if (secenek) sec(secenek);
  } else if (event.key === 'Escape') {
    kapat();
    (event.target as HTMLInputElement).blur();
  }
}
</script>

<template>
  <div class="relative">
    <input type="text" :disabled="disabled"
      :value="acik ? aramaMetni : seciliLabel"
      :placeholder="acik ? 'Yazarak arayın...' : (seciliLabel || placeholder)"
      @focus="ac" @blur="kapat" @input="yaz" @keydown="tusa"
      class="w-full bg-surface-900 py-1.5 pl-2.5 pr-7 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30 disabled:opacity-50" />
    <svg class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/60"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>

    <!-- mousedown.prevent: input blur olmadan seçim yapılabilsin -->
    <ul v-if="acik"
      class="absolute z-50 mt-1 max-h-48 w-full overflow-auto bg-[#141e17] shadow-lg shadow-black/50 ring-1 ring-white/10">
      <li v-if="!filtreli.length" class="px-2.5 py-2 text-xs text-ink-muted/60">Sonuç bulunamadı</li>
      <li v-for="(secenek, i) in filtreli" :key="secenek.value"
        @mousedown.prevent="sec(secenek)" @mousemove="vurgulu = i"
        class="cursor-pointer px-2.5 py-1.5 text-xs"
        :class="i === vurgulu ? 'bg-[#223c2d] text-ink' : 'text-ink-muted'">
        {{ secenek.label }}
      </li>
    </ul>
  </div>
</template>
