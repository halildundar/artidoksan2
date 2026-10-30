// Sayfa geçişinden önce odaklı elemanı bırakır; aksi halde Ionic eski sayfayı
// aria-hidden yaparken tarayıcı "Blocked aria-hidden..." uyarısı basar.
export function blurActive() {
  (document.activeElement as HTMLElement | null)?.blur();
}
