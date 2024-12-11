import React, { ReactNode, useCallback, useState } from "react";
import { Dimensions, Pressable } from "react-native";
import { AnimatePresence, MotiView } from "moti";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
};

export const CustomBottomSheet = ({
  isOpen,
  onClose,
  children,
  snapPoints = [0.25, 0.5, 0.9],
  initialSnap = 0,
}: BottomSheetProps) => {
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const [isVisible, setIsVisible] = React.useState(false);

  const closeSheet = () => {
    translateY.value = withSpring(0, {
      damping: 35,
      stiffness: 300,
      mass: 0.5,
    });
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  const calculateSnapPoint = useCallback(
    (velocity: number) => {
      "worklet";
      const currentPosition = -translateY.value / SCREEN_HEIGHT;

      let nearestPoint = snapPoints[0];
      let minDistance = Math.abs(currentPosition - snapPoints[0]);

      for (const point of snapPoints) {
        const distance = Math.abs(currentPosition - point);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      }

      // If velocity is significant, possibly move to next/previous snap point
      if (Math.abs(velocity) > 500) {
        const direction = velocity > 0 ? -1 : 1;
        const currentIndex = snapPoints.indexOf(nearestPoint);
        const targetIndex = Math.max(
          0,
          Math.min(snapPoints.length - 1, currentIndex + direction)
        );
        return -snapPoints[targetIndex] * SCREEN_HEIGHT;
      }

      return -nearestPoint * SCREEN_HEIGHT;
    },
    [snapPoints]
  );

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(
        MAX_TRANSLATE_Y,
        Math.min(0, context.value.y + event.translationY)
      );
    })
    .onEnd((event) => {
      // Calculate the current position relative to screen height
      const currentPosition = -translateY.value / SCREEN_HEIGHT;

      // If dragged down past 90% of the height (10% from bottom), close the sheet
      if (currentPosition < 0.1) {
        closeSheet();
        return;
      }

      // Otherwise snap to nearest point
      translateY.value = withSpring(calculateSnapPoint(event.velocityY), {
        damping: 50,
        stiffness: 300,
      });
    })
    .activeOffsetY([-10, 10])
    .runOnJS(true)
    .enabled(true)
    .shouldCancelWhenOutside(false);

  const composedGestures = Gesture.Exclusive(gesture);

  const rBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  React.useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      translateY.value = withSpring(-snapPoints[initialSnap] * SCREEN_HEIGHT, {
        damping: 50,
        stiffness: 300,
      });
    }
  }, [isOpen, initialSnap, snapPoints]);

  if (!isOpen && !isVisible) return null;

  return (
    <AnimatePresence exitBeforeEnter>
      {(isOpen || isVisible) && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
          }}
          transition={{
            type: "timing",
            duration: 300,
          }}
          className="absolute h-screen w-screen top-0 left-0 bg-black/50"
        >
          <Pressable className="absolute h-full w-full" onPress={closeSheet} />
          <GestureDetector gesture={composedGestures}>
            <Animated.View
              className="absolute bottom-0 w-full bg-white dark:bg-slate-900 rounded-t-3xl"
              style={[
                rBottomSheetStyle,
                {
                  height: SCREEN_HEIGHT,
                  top: SCREEN_HEIGHT,
                  minHeight: SCREEN_HEIGHT * 0.25,
                  maxHeight: SCREEN_HEIGHT * 0.9,
                },
              ]}
              onStartShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
            >
              <View className="w-full items-center pt-4 pb-2">
                <View className="w-16 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
              </View>
              <View className="flex-1 px-4">{children}</View>
            </Animated.View>
          </GestureDetector>
        </MotiView>
      )}
    </AnimatePresence>
  );
};