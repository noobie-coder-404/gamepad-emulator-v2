//function to calculate how far from the floating stick center should the knob be moved
export const calculateOffset = (
  touch,
  floatingCenterCoordinates,
  joystickMeasurements,
) => {
  "worklet";
  //function to calculate how far from the floating stick center should the knob be moved

  //calculate r and theta of  touch pointer with floatingStickCenter as origin
  let rTouch = Math.hypot(
    touch.absoluteX - floatingCenterCoordinates.x,
    touch.absoluteY - floatingCenterCoordinates.y,
  );
  const thetaTouch = Math.atan2(
    touch.absoluteY - floatingCenterCoordinates.y,
    touch.absoluteX - floatingCenterCoordinates.x,
  );

  // console.log(actualOffset);

  // if r > permittedOffset, then r = permittedOffset
  const permittedOffset = (joystickMeasurements.height * (1 - 0.1)) / 2;

  if (rTouch > permittedOffset) {
    rTouch = permittedOffset;
  }
  //calculate x and y for knob based on r and theta
  return {
    x: rTouch * Math.cos(thetaTouch),
    y: rTouch * Math.sin(thetaTouch),
  };
};
