import React, { useEffect } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const SCREEN_H = Dimensions.get("window").height;
const DISMISS_Y = 110;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | `${number}%`;
  sheetStyle?: ViewStyle;
  backdropColor?: string;
  showHandle?: boolean;
  handleColor?: string;
};

/** Bottom sheet sans rebond : tap extérieur + tirage vers le bas. */
export function SheetModal({
  visible,
  onClose,
  children,
  maxHeight = "92%",
  sheetStyle,
  backdropColor = "rgba(0,0,0,0.65)",
  showHandle = true,
  handleColor = "#D1D5DB",
}: Props) {
  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 240 });
      backdrop.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = SCREEN_H;
      backdrop.value = 0;
    }
  }, [visible, backdrop, translateY]);

  const animateClose = () => {
    "worklet";
    translateY.value = withTiming(SCREEN_H, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
    backdrop.value = withTiming(0, { duration: 180 });
  };

  const closeFromJs = () => {
    translateY.value = withTiming(SCREEN_H, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
    backdrop.value = withTiming(0, { duration: 180 });
  };

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-40, 40])
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_Y || e.velocityY > 850) {
        animateClose();
      } else {
        translateY.value = withTiming(0, { duration: 180 });
      }
    });

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeFromJs}
      statusBarTranslucent
    >
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor }, backdropAnim]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFromJs} accessibilityLabel="Fermer" />
        </Animated.View>

        <Animated.View style={[styles.sheet, { maxHeight }, sheetStyle, sheetAnim]}>
          {showHandle ? (
            <GestureDetector gesture={pan}>
              <Animated.View style={styles.handleWrap} accessibilityLabel="Tirer vers le bas pour fermer">
                <View style={[styles.handle, { backgroundColor: handleColor }]} />
              </Animated.View>
            </GestureDetector>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    width: "100%",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 28,
  },
  handle: { width: 40, height: 4, borderRadius: 2 },
});
