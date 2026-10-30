<script setup lang="ts">
import { IonPage, IonTabs, IonRouterOutlet } from '@ionic/vue';
import { useRoute, useRouter } from 'vue-router';
import { blurActive } from '@/utils/blurActive';

const route = useRoute();
const router = useRouter();

const isActive = (path: string) => route.path.startsWith(path);
const go = (path: string) => {
  blurActive();
  if (!isActive(path)) router.push(path);
};
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <!-- Özel sekme çubuğu: ion-tabs yalnızca iskelet, görünüm tamamen Tailwind -->
      <div slot="bottom" class="border-t border-white/5 bg-surface-bar pb-[env(safe-area-inset-bottom)]">
        <nav class="mx-auto grid h-16 max-w-lg grid-cols-7">
          <button type="button" @click="go('/firma')"
            class="flex flex-col items-center justify-center gap-1"
            :class="isActive('/firma') ? 'text-ink' : 'text-ink-muted'">
            <!-- Firma: iş merkezi binası -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
            </svg>
            <span class="text-[10px] font-medium leading-none">Firma</span>
          </button>

          <button type="button" @click="go('/asansor')"
            class="flex flex-col items-center justify-center gap-1"
            :class="isActive('/asansor') ? 'text-ink' : 'text-ink-muted'">
            <!-- Asansör: kabin + aşağı/yukarı ok -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M8.5 15v-5.5M6.5 11.5l2-2 2 2" />
              <path d="M15.5 9.5V15M13.5 13l2 2 2-2" />
            </svg>
            <span class="text-[10px] font-medium leading-none">Asansör</span>
          </button>

          <button type="button" @click="go('/rapor')"
            class="flex flex-col items-center justify-center gap-1"
            :class="isActive('/rapor') ? 'text-ink' : 'text-ink-muted'">
            <!-- Rapor: grafikli belge -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M8 18v-1" />
              <path d="M12 18v-6" />
              <path d="M16 18v-3" />
            </svg>
            <span class="text-[10px] font-medium leading-none">Rapor</span>
          </button>

          <button type="button" @click="go('/anasayfa')"
            class="flex flex-col items-center justify-end gap-1 pb-2"
            :class="isActive('/anasayfa') ? 'text-ink' : 'text-ink-muted'">
            <div class="grid h-14 w-14 -translate-y-5 place-items-center rounded-full shadow-lg shadow-black/50 ring-1"
              :class="isActive('/anasayfa') ? 'bg-[#1c2f25] ring-white/20' : 'bg-surface-700 ring-white/10'">
              <!-- Anasayfa: ev (büyük ikon) -->
              <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
              </svg>
            </div>
            <span class="-mt-4 text-[10px] font-semibold leading-none">Anasayfa</span>
          </button>

          <button type="button" @click="go('/denetim')"
            class="flex flex-col items-center justify-center gap-1"
            :class="isActive('/denetim') ? 'text-ink' : 'text-ink-muted'">
            <!-- Denetim: onaylı kontrol listesi -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="8" y="2" width="8" height="4" rx="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="m9 14 2 2 4-4" />
            </svg>
            <span class="text-[10px] font-medium leading-none">Denetim</span>
          </button>

          <button type="button" @click="go('/tescil')"
            class="flex flex-col items-center justify-center gap-1"
            :class="isActive('/tescil') ? 'text-ink' : 'text-ink-muted'">
            <!-- Tescil: mühür/kaşe -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 22h14" />
              <path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77" />
              <path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13" />
            </svg>
            <span class="text-[10px] font-medium leading-none">Tescil</span>
          </button>

          <button type="button" @click="go('/ayarlar')"
            class="flex flex-col items-center justify-center gap-1"
            :class="isActive('/ayarlar') ? 'text-ink' : 'text-ink-muted'">
            <!-- Ayarlar: dişli -->
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span class="text-[10px] font-medium leading-none">Ayarlar</span>
          </button>
        </nav>
      </div>
    </ion-tabs>
  </ion-page>
</template>
