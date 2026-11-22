import { ref } from 'vue';

// Modül B denetiminden "Güvenlik Aksamı Ekle" ile açılan belge formundan geri dönüşte
// (Geri / Kaydet) denetim sayfasına taşınan bilgi: hangi komponentin seçim penceresi
// yeniden açılacak ve (kaydedildiyse) yeni belge seçili gelecek.
export const aksamDonus = ref<{ kod: string; yeniBelgeId?: string } | null>(null);
