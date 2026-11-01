# Gemini Smart Toolkit (kroup-extension)

TDK Uyumlu Cümle Düzeltici, Özetleyici, Akıllı Yanıt, Görsel Çevirmen ve YouTube İki Dilli Altyazı Eklentisi (Chrome Extension Manifest V3).

## Özellikler

- **Gemini Destekli Dil Araçları:** TDK kurallarına göre metin düzeltme, özetleme ve bağlama duyarlı yanıt oluşturma.
- **YouTube İki Dilli Altyazı:** YouTube videolarında eşzamanlı çift dilli altyazı ve çeviri.
- **Görsel Çevirmen:** Sayfadaki görselleri veya belirli alanları seçerek ekran görüntüsü üzerinden anında OCR ve çeviri.
- **Yerel TOTP Authenticator:** Tamamen tarayıcıda çalışan, sunucusuz iki aşamalı doğrulama (2FA) kodu üretici.
- **Şarkı Tanıma:** Shazam API entegrasyonu ile çalan sekmelerden anlık müzik tanıma.
- **Gizlilik Odaklı:** API anahtarları tarayıcının yerel depolamasında (`chrome.storage.local`) saklanır; harici sunucuya aktarılmaz.

## Kurulum

1. Depoyu klonlayın veya ZIP olarak indirin.
2. Google Chrome'da `chrome://extensions` adresine gidin.
3. Sağ üstteki **Geliştirici modu** (Developer mode) anahtarını açın.
4. **Paketlenmemiş öge yükle** (Load unpacked) butonuna tıklayın ve bu proje klasörünü seçin.
5. Eklenti açılır penceresindeki Ayarlar bölümünden **Google Gemini API** anahtarınızı girin.
