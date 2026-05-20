import { measure } from 'react-native-reanimated';

export const isInside = (touch, measurement, expandPercentage = 0) => {
  //don't forget to use .value when inputing the sharedvalue
  //also add a way to extend the hitArea
  'worklet';

  let measured = null;
  try {
    measured = typeof measurement === 'function' ? measure(measurement) : measurement; // this is only to ensure that function works whether you give it actual measurement value from onLayout called measurement, or the reference , but ideal way is to give it the reference and let
    // it measure itself because onLayout runs on js not on UI and hence may introduce performance issues; this is a temporary fix and all calls of isInside must be migrated to component instead of measurement
    //useMeasure custom hook is not needed anymore - proceed carefully : calculateOffset needs it to work
  } catch (error) {
    console.log(
      'error with isInside() - probably because trackpad mode is on and leftJoystick ref points to nothing, or the joystick mode is on and trackpad ref points to nothing'
    );
    return false;
  }

  const { pageX, pageY, width, height } = measured;

  const x = touch.absoluteX;

  const y = touch.absoluteY;

  // 1. Calculate how much extra "meat" we are adding to each side
  const paddingX = (width * expandPercentage) / 2;
  const paddingY = (height * expandPercentage) / 2;

  // 2. Circle Logic (using center of the box)
  if (width === height) {
    const centerX = pageX + width / 2;
    const centerY = pageY + height / 2;
    const expandedRadius = width / 2 + paddingX;
    return Math.hypot(x - centerX, y - centerY) <= expandedRadius;
  }

  // 3. Rectangle Logic
  // We subtract padding from the start and add it to the end
  return (
    x >= pageX - paddingX && // Left edge
    x <= pageX + width + paddingX && // Right edge
    y >= pageY - paddingY && // Top edge
    y <= pageY + height + paddingY // Bottom edge
  );
};
