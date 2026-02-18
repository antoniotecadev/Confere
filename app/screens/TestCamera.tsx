import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, runAsync, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useTextRecognition } from 'react-native-vision-camera-ocr-plus';
import { Worklets } from 'react-native-worklets-core';

export default function TestCamera() {
    const device = useCameraDevice('back');
    const { scanText } = useTextRecognition();

    const [price, setPrice] = useState("");
    const [productName, setProductName] = useState("");
    const [hasPermission, setHasPermission] = useState(false);
    
    // Buffers para estabilizar as detecções
    const priceBufferRef = useRef<string[]>([]);
    const nameBufferRef = useRef<string[]>([]);

    useEffect(() => {
        Camera.requestCameraPermission().then(permission => {
            setHasPermission(permission === 'granted');
        });
    }, []);

    // Função que extrai e estabiliza o preço e nome do produto
    const setProductDataJS = Worklets.createRunOnJS((detectedText: string) => {
        // Regex para encontrar preços: 12,99 ou 1234,56 ou 1.234,56
        const priceMatch = detectedText.match(/\d{1,4}[.,]?\d{0,3}[,]\d{2}/);
        
        if (priceMatch) {
            const foundPrice = priceMatch[0];
            const priceIndex = detectedText.indexOf(foundPrice);
            
            // Extrai o texto antes do preço como nome do produto
            const textBeforePrice = detectedText.substring(0, priceIndex).trim();
            // Pega as últimas 3-5 palavras como nome do produto
            const words = textBeforePrice.split(/\s+/).filter(w => w.length > 2);
            const foundName = words.slice(-5).join(' ').substring(0, 50);
            
            // Adiciona preço ao buffer
            priceBufferRef.current.push(foundPrice);
            if (priceBufferRef.current.length > 5) {
                priceBufferRef.current.shift();
            }
            
            // Adiciona nome ao buffer (se tiver pelo menos 3 caracteres)
            if (foundName.length >= 3) {
                nameBufferRef.current.push(foundName);
                if (nameBufferRef.current.length > 5) {
                    nameBufferRef.current.shift();
                }
            }
            
            // Estabiliza o preço
            const priceFrequency: Record<string, number> = {};
            priceBufferRef.current.forEach(p => {
                priceFrequency[p] = (priceFrequency[p] || 0) + 1;
            });
            const stablePrice = Object.keys(priceFrequency).find(p => priceFrequency[p] >= 3);
            
            // Estabiliza o nome
            const nameFrequency: Record<string, number> = {};
            nameBufferRef.current.forEach(n => {
                nameFrequency[n] = (nameFrequency[n] || 0) + 1;
            });
            const stableName = Object.keys(nameFrequency).find(n => nameFrequency[n] >= 3);
            
            // Atualiza os estados apenas se encontrou dados estáveis
            if (stablePrice && stablePrice !== price) {
                setPrice(stablePrice);
            }
            if (stableName && stableName !== productName) {
                setProductName(stableName);
            }
        }
    });

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        runAsync(frame, () => {
            'worklet';
            const data = scanText(frame);
            
            if (data && data.resultText) {
                setProductDataJS(data.resultText);
            }
        });
    }, [scanText]);

    if (device == null) return <View style={styles.container}><Text>Loading...</Text></View>;
    if (!hasPermission) return <View style={styles.container}><Text>No access to camera</Text></View>;

    return (
        <View style={styles.container}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                frameProcessor={frameProcessor}
            />
            {(price || productName) && (
                <View style={styles.priceContainer}>
                    {productName && (
                        <Text style={styles.productName}>{productName}</Text>
                    )}
                    {price && (
                        <>
                            <Text style={styles.priceLabel}>Preço:</Text>
                            <Text style={styles.priceValue}>{price}</Text>
                        </>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priceContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#00ff00',
    },
    productName: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 12,
        textAlign: 'center',
    },
    priceLabel: {
        color: '#00ff00',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    priceValue: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: 'bold',
    },
});