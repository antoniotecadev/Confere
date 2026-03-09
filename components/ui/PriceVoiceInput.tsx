import { Ionicons } from '@expo/vector-icons';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";

// Extrai números/preços do texto falado
export function extractPrice(text: string) {
    if (!text) return "";

    // Converte palavras numéricas comuns (PT)
    const palavras: { [key: string]: number } = {
        zero: 0, um: 1, uma: 1, dois: 2, duas: 2, três: 3, quatro: 4,
        cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
        onze: 11, doze: 12, treze: 13, catorze: 14, quinze: 15,
        dezasseis: 16, dezassete: 17, dezoito: 18, dezanove: 19,
        vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
        sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
        cem: 100, cento: 100, duzentos: 200, trezentos: 300,
        quatrocentos: 400, quinhentos: 500, mil: 1000,
    };

    let lower = text.toLowerCase();

    // Substitui vírgula decimal falada: "dez vírgula cinquenta" → "10.50"
    lower = lower.replace(/vírgula|ponto/g, ".");

    // Tenta extrair número diretamente
    const match = lower.match(/[\d]+([.,]\d+)?/);
    if (match) {
        return match[0].replace(",", ".");
    }

    // Tenta converter palavras
    const palavrasTexto = lower.split(/\s+/);
    let total = 0;
    let encontrou = false;
    for (const p of palavrasTexto) {
        if (palavras[p] !== undefined) {
            total += palavras[p];
            encontrou = true;
        }
    }

    return encontrou ? String(total) : text;
}

interface PriceVoiceInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Se fornecido, mostra um label acima do campo. Se omitido, o label não é renderizado. */
    label?: string;
    /** Style aplicado ao container externo */
    style?: ViewStyle;
    /** Style aplicado ao TextInput (sobrepõe o padrão) */
    inputStyle?: TextStyle;
    autoFocus?: boolean;
    onSubmitEditing?: () => void;
}

export default function PriceVoiceInput({
    value,
    onChange,
    placeholder = "Ex: 29.99",
    label,
    style,
    inputStyle,
    autoFocus,
    onSubmitEditing,
}: PriceVoiceInputProps) {
    const [listening, setListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useSpeechRecognitionEvent("result", (event) => {
        const transcript = event.results?.[0]?.transcript;
        if (transcript) {
            const price = extractPrice(transcript);
            onChange(price);
        }
    });

    useSpeechRecognitionEvent("end", () => setListening(false));
    useSpeechRecognitionEvent("error", (e) => {
        setError(e.message);
        setListening(false);
    });

    const startListening = useCallback(async () => {
        setError(null);
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
            setError("Permissão de microfone negada");
            return;
        }
        setListening(true);
        ExpoSpeechRecognitionModule.start({
            lang: "pt-PT",
            interimResults: false,
            maxAlternatives: 1,
        });
    }, []);

    const stopListening = useCallback(() => {
        ExpoSpeechRecognitionModule.stop();
        setListening(false);
    }, []);

    return (
        <View style={[styles.container, style]}>
            {label !== undefined && <Text style={styles.label}>{label}</Text>}
            <View style={styles.row}>
                <TextInput
                    style={[inputStyle]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor="#BDBDBD"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    numberOfLines={1}
                    autoFocus={autoFocus}
                    onSubmitEditing={onSubmitEditing}
                />
                <Pressable
                    style={[styles.micButton, listening && styles.micActive]}
                    onPressIn={startListening}
                    onPressOut={stopListening}
                >
                    {listening ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Ionicons name="mic" size={20} color="#fff" />
                    )}
                </Pressable>
            </View>
            {listening && <Text style={styles.hint}>A ouvir... solte para parar</Text>}
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 6 },
    label: { fontSize: 14, fontWeight: "600", color: "#333" },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    micButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FF9800",
        justifyContent: "center",
        alignItems: "center",
    },
    micActive: { backgroundColor: "#E65100" },
    hint: { fontSize: 12, color: "#FF9800", fontStyle: "italic" },
    error: { fontSize: 12, color: "#EF4444" },
});
