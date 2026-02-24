#!/bin/bash

# Script para debug de OCR em produção
# Uso: ./debug-ocr.sh

echo "🔍 Detectando dispositivos..."
adb devices

echo ""
echo "📱 Dispositivos encontrados. Escolha um:"
echo "1) USB (7YBNU19A19311041) - RECOMENDADO"
echo "2) WiFi (192.168.18.6:5555)"
echo ""
read -p "Escolha (1 ou 2): " choice

if [ "$choice" = "1" ]; then
    DEVICE="7YBNU19A19311041"
    echo "✅ Usando conexão USB"
elif [ "$choice" = "2" ]; then
    DEVICE="192.168.18.6:5555"
    echo "✅ Usando conexão WiFi"
else
    echo "❌ Escolha inválida!"
    exit 1
fi

echo ""
echo "🧹 Limpando logs antigos..."
adb -s "$DEVICE" logcat -c

echo ""
echo "👀 Monitorando logs OCR em tempo real..."
echo "   (Abra o app e use o scanner OCR)"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

adb -s "$DEVICE" logcat | grep --color=always -E "OCR|ReactNativeJS.*OCR"
