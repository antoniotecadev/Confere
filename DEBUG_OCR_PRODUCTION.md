# 🔍 Debug OCR em Produção (APK)

## 📱 Como Ver Logs do APK

Quando você instalar o APK no seu dispositivo, siga estes passos para ver os logs:

### 1️⃣ Conectar via ADB
```bash
# Conectar dispositivo via USB (habilite Debug USB nas configurações do desenvolvedor)
adb devices

# Ou conectar via WiFi (mesmo WiFi do PC):
adb tcpip 5555
adb connect <IP_DO_TELEFONE>:5555
```

### 2️⃣ Ver Logs em Tempo Real
```bash
# IMPORTANTE: Se tiver múltiplos dispositivos, liste primeiro:
adb devices

# Se aparecer "error: more than one device/emulator", especifique o dispositivo:
# Exemplo de output:
# List of devices attached
# 7YBNU19A19311041        device
# 192.168.18.6:5555       device

# Escolha UM dispositivo (substitua DEVICE_ID pelo ID real):
# Via USB (mais estável):
export DEVICE="7YBNU19A19311041"

# OU via WiFi:
export DEVICE="192.168.18.6:5555"

# Limpar logs antigos
adb -s $DEVICE logcat -c

# Ver logs em tempo real (COM FILTRO para não sobrecarregar)
adb -s $DEVICE logcat | grep -E "OCR|ReactNativeJS|AndroidRuntime"

# OU ver apenas OCR:
adb -s $DEVICE logcat | grep "OCR"

# Se quiser desconectar dispositivo via WiFi e usar só USB:
adb disconnect 192.168.18.6:5555
adb logcat | grep "OCR"  # Agora funciona sem -s
```

### 3️⃣ O Que Procurar nos Logs

#### ✅ Logs Esperados (SUCESSO):
```
[OCR INIT] useTextRecognition: function
[OCR INIT] device: OK
[OCR] Solicitando permissão de câmera...
[OCR] Permissão de câmera: granted
[OCR] Abrindo câmera...
[OCR] Device: OK
[OCR] scanText function: function
[OCR] Câmera aberta
[OCR] Iniciando scanText...
[OCR] scanText completado: 5 blocos
[OCR] Blocos detectados: ARROZ, 1.500, Kz, MARCA
[OCR] Produto analisado: {price: "1500", name: "ARROZ"}
```

#### ❌ Logs de Erro (PROBLEMAS):

**Problema 1: scanText é undefined**
```
[OCR INIT] useTextRecognition: undefined
```
**Causa:** ML Kit não carregou ou vision-camera-ocr-plus não funcionou  
**Solução:** Reinstalar dependências e rebuild

**Problema 2: Permissão negada**
```
[OCR] Permissão de câmera: denied
```
**Causa:** Permissão não foi concedida  
**Solução:** Vá em Configurações > Apps > Confere > Permissões > Câmera (ATIVAR)

**Problema 3: Device NULL**
```
[OCR] Device: NULL
```
**Causa:** Câmera não detectada  
**Solução:** Problema de hardware ou permissões

**Problema 4: scanText sem blocos**
```
[OCR] scanText completado: 0 blocos
[OCR] Nenhum bloco de texto detectado
```
**Causa:** ML Kit não está reconhecendo texto (foco ruim ou ML Kit não instalado)  
**Solução:** Verificar Google Play Services, melhorar iluminação

**Problema 5: Crash de ML Kit**
```
AndroidRuntime: FATAL EXCEPTION: pool-*
com.google.mlkit.vision.text.TextRecognitionClient
```
**Causa:** ML Kit não instalado ou ProGuard removeu classes  
**Solução:** Já adicionamos ProGuard rules, rebuild

---

## 🔧 Checklist de Diagnóstico

Antes de gerar um novo build, verifique:

- [ ] **ProGuard Rules adicionadas** (já feito✅)
- [ ] **Permissões no AndroidManifest.xml** (já feito✅)  
- [ ] **app.json com CAMERA permission** (já feito✅)
- [ ] **Throttling e isProcessingRef ativos** (já feito✅)
- [ ] **Logs de diagnóstico adicionados** (já feito✅)

---

## 🚀 Comando para Novo Build

```bash
# Limpar build anterior
rm -rf android/app/build

# Gerar novo APK com todas as correções
npx eas build -p android --profile preview
```

---

## 📊 Teste Manual no APK

1. **Abrir app** → Ver logs de inicialização
2. **Ir para carrinho** → Adicionar produto
3. **Clicar em "Escanear Produto"** → Ver logs de abertura da câmera
4. **Apontar para rótulo** → Ver logs de detecção

Se ainda não funcionar, **copie TODOS os logs** e me envie!

---

## 🛠️ Possíveis Causas (Checklist)

| Causa | Como Verificar | Status |
|-------|----------------|--------|
| ProGuard removendo ML Kit | Adicionar regras `-keep` | ✅ CORRIGIDO |
| Permissões não solicitadas | Verificar logs de permissão | ✅ CORRIGIDO |
| Throttling desativado | Crash após segundos | ✅ CORRIGIDO |
| isProcessingRef não usado | Múltiplos runAsync | ✅ CORRIGIDO |
| ML Kit models não baixados | Google Play Services offline | 🔍 VERIFICAR |
| scanText undefined | useTextRecognition falhou | 🔍 VERIFICAR VIA LOGS |

---

## 💡 Dica Final

Se os logs mostrarem `scanText: undefined`, significa que o **vision-camera-ocr-plus não está carregando**.

Nesse caso, tente:
```bash
cd android
./gradlew clean
cd ..
rm -rf node_modules
npm install
npx expo prebuild --clean
npx eas build -p android --profile preview
```

Isso força reinstalação completa das dependências nativas.
