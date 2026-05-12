import React, { JSX } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface CustomPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
}

export default function CustomPhotoModal({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
}: CustomPhotoModalProps): JSX.Element {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Background escurecido */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.alertContainer}>
          <Text style={styles.title}>Adicionar foto</Text>
          <Text style={styles.message}>Escolhe uma opção</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                onTakePhoto();
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Tirar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                onPickImage();
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Escolher da galeria</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: "red" }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: 300,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  buttonContainer: {
    width: "100%",
  },
  button: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    color: "#007AFF", // Cor padrão iOS
  },
  cancelButton: {
    borderBottomWidth: 0,
    marginTop: 5,
  },
});
