import {
  BlurMask,
  Canvas,
  CornerPathEffect,
  Group,
  Path,
  Shadow,
  Skia,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { RoundedTrapezium } from '@/components/RoundedTrapezium';

type TurnkeyBackgroundProps = {
  backgroundColor?: string;
  curveColor?: string;
  upperNotchColor?: string;
  lowerTrapeziumColor?: string;
  isTriangle?: boolean;
  shadowColor?: string;
};

export function TurnkeyBackground({
  backgroundColor = '#ffffff00',
  //apple-black
  curveColor = 'rgb(42, 42, 44)',
  // upperNotchColor = 'rgb(115, 127, 150)',
  upperNotchColor = 'transparent',
  // lowerTrapeziumColor = 'rgb(49, 59, 77)',
  lowerTrapeziumColor = '#3e4c56',
  isTriangle = true,
  shadowColor = '#191d20fb',

  //apple -white
  //     curveColor = '#ffffff',
  // upperNotchColor = "#878787",
  // lowerTrapeziumColor = "#ffffff",
  // shadowColor = "#e3e3e3",

  //theme white on black
  //   curveColor = '#bababa',
  // upperNotchColor = "#ededed",
  // lowerTrapeziumColor = "#c4c4c4",
  // shadowColor = "#000000",

  //theme black on white - blue tint
  // curveColor = '#232629',
  // upperNotchColor = "#7c8795",
  // lowerTrapeziumColor = "#3a3d44",
  // shadowColor = "#6d767f",

  //theme blue
  // curveColor = '#000139',
  //   upperNotchColor = "#50a1d0",
  //   lowerTrapeziumColor = "#000a2e",
  //   shadowColor = "#2d357f",

  //theme maroon -
  // curveColor = '#390024',
  // upperNotchColor = "#d0507f",
  // lowerTrapeziumColor = "#2E000B",
  // shadowColor = "#5c1e34",
}: TurnkeyBackgroundProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // const upperTrapeziumWidth = 10;
  // const upperTrapeziumHeight = 150;
  // const upperTrapeziumAngle = 90;
  // const upperTrapeziumCornerRadius = 15;
  // const upperTrapeziumTopInset = -10;
  const upperTrapeziumWidth = 200;
  const upperTrapeziumHeight = 65;
  const upperTrapeziumAngle = 75;
  const upperTrapeziumCornerRadius = 20;
  const upperTrapeziumTopInset = -10;

  // const trapeziumWidth = Math.min(910, Math.max(screenWidth + 80, 520));
  const trapeziumWidth = Math.min(screenWidth);
  // const trapeziumHeight = 175;
  // const trapeziumHeight = 180; // latest one
  const trapeziumHeight = screenHeight * 0.52;
  // const trapeziumAngle = 65;
  // const trapeziumCornerRadius = 75;
  const trapeziumAngle = 62;
  const trapeziumCornerRadius = 95;
  const trapeziumBottomInset = 20;
  // const gapFromCenter = 0.45 * screenWidth;
  const gapFromCenter = 0.475 * screenWidth; //bigger - away from center
  const scaleX = 0.25 * screenWidth;
  const scaleY = 1 * screenHeight;
  const centerX = screenWidth / 2;

  const notchCurveX1 = 0.69;
  const notchCurveY1 = 0.31;
  const notchCurveX2 = -0.31;
  const notchCurveY2 = 0.5;
  const notchWingWidth = 5;
  const notchStrokeWidthBase = 2;
  const notchTriangleFlatness = 0.38; // bigger = flatter triangle, less reach toward center
  const notchTriangleApexLift = 0.075; // bigger = apex sits higher up
  const notchTrianglePeakX = notchCurveX1 - notchTriangleFlatness;
  const notchTrianglePeakY = notchCurveY1 - notchTriangleApexLift;
  const notchTriangleApexRoundness = 0.08; // bigger = rounder, softer apex corner
  const notchShadowDx = 0;
  const notchShadowDy = 8 / Math.max(scaleY, 0.0001);
  const notchShadowBlur = 14 / Math.max(scaleX, scaleY, 0.0001);
  const upperNotchShadowDy = 0;
  const upperNotchShadowBlur = 12;
  const lowerTrapeziumShadowOffsetY = -2; // bigger = shadow sits farther below the trapezium
  const lowerTrapeziumShadowBlur = 12; // bigger = softer lower trapezium shadow
  // const lowerTrapeziumShadowColor = 'rgba(16, 16, 16, 0.18)';
  const lowerTrapeziumShadowColor = shadowColor;

  const leftNotchPath = isTriangle
    ? `M 0,0 L ${notchTrianglePeakX},${notchTrianglePeakY} L 0,1 L ${-notchWingWidth},1 L ${-notchWingWidth},0 Z`
    : `M 0,0 C ${notchCurveX1},${notchCurveY1} ${notchCurveX2},${notchCurveY2} 0,1 L ${-notchWingWidth},1 L ${-notchWingWidth},0 Z`;
  const rightNotchPath = isTriangle
    ? `M 0,0 L ${-notchTrianglePeakX},${notchTrianglePeakY} L 0,1 L ${notchWingWidth},1 L ${notchWingWidth},0 Z`
    : `M 0,0 C ${-notchCurveX1},${notchCurveY1} ${-notchCurveX2},${notchCurveY2} 0,1 L ${notchWingWidth},1 L ${notchWingWidth},0 Z`;

  const lowerTrapeziumPath = useMemo(() => {
    const rad = (trapeziumAngle * Math.PI) / 180;
    const offset = trapeziumHeight / Math.tan(rad);
    const topWidth = Math.max(1, trapeziumWidth - 2 * offset);
    const actualOffset = (trapeziumWidth - topWidth) / 2;

    const path = Skia.Path.Make();
    path.moveTo(actualOffset, 0);
    path.lineTo(trapeziumWidth - actualOffset, 0);
    path.lineTo(trapeziumWidth, trapeziumHeight);
    path.lineTo(0, trapeziumHeight);
    path.close();
    return path;
  }, [trapeziumAngle, trapeziumHeight, trapeziumWidth]);

  return (
    <Canvas pointerEvents="none" style={[styles.canvas, { backgroundColor }]}>
      {/* <Group
        origin={vec(0, 0)}
        transform={[{ translateX: centerX - gapFromCenter }, { scaleX }, { scaleY }]}
      >
        <Path
          path={leftNotchPath}
          color={curveColor}
          style="fill"
          strokeWidth={notchStrokeWidthBase / Math.max(scaleX, 0.0001)}
        >
          {isTriangle ? <CornerPathEffect r={notchTriangleApexRoundness} /> : null}
          <Shadow
            dx={notchShadowDx}
            dy={notchShadowDy}
            blur={notchShadowBlur}
            color={shadowColor}
          />
           <LinearGradient
            start={vec(0, 0)}
            end={vec(0.3, 1)}
            colors={[curveColor, '#171616']}
          /> 
        </Path>
        <Path path={leftNotchPath} color={'#3d3d3d'} style="stroke" strokeWidth={0.02}>
          {isTriangle ? <CornerPathEffect r={notchTriangleApexRoundness} /> : null}
        </Path>
      </Group> */}

      {/*      <Group
        origin={vec(0, 0)}
        transform={[{ translateX: centerX + gapFromCenter }, { scaleX }, { scaleY }]}
      >
        <Path
          path={rightNotchPath}
          color={curveColor}
          style="fill"
          strokeWidth={notchStrokeWidthBase / Math.max(scaleX, 0.0001)}
        >
          {isTriangle ? <CornerPathEffect r={notchTriangleApexRoundness} /> : null}
          <Shadow
            dx={notchShadowDx}
            dy={notchShadowDy}
            blur={notchShadowBlur}
            color={shadowColor}
          />
           <LinearGradient
            start={vec(0, 0)}
            end={vec(0.3, 1)}
            colors={[curveColor, '#121111']}
          /> 
        </Path>
        <Path path={rightNotchPath} color={'#3d3d3d'} style="stroke" strokeWidth={0.02}>
          {isTriangle ? <CornerPathEffect r={notchTriangleApexRoundness} /> : null}
        </Path>
      </Group>

      */}

      <Group
        transform={[
          { translateX: centerX },
          { translateY: upperTrapeziumTopInset + upperTrapeziumHeight },
          { scaleY: -1 },
        ]}
      >
        <RoundedTrapezium
          width={upperTrapeziumWidth}
          height={upperTrapeziumHeight}
          angle={upperTrapeziumAngle}
          cornerRadius={upperTrapeziumCornerRadius}
          color={upperNotchColor}
          centered
        >
          <Shadow
            dx={0}
            dy={upperNotchShadowDy}
            blur={upperNotchShadowBlur}
            color={shadowColor}
          />
        </RoundedTrapezium>
      </Group>

      <Group
        transform={[
          { translateX: centerX - trapeziumWidth / 2 },
          { translateY: screenHeight - trapeziumHeight - trapeziumBottomInset },
        ]}
      >
        <Group transform={[{ translateY: lowerTrapeziumShadowOffsetY }]}>
          <Path path={lowerTrapeziumPath} color={lowerTrapeziumShadowColor} style="fill">
            <CornerPathEffect r={trapeziumCornerRadius} />
            <BlurMask blur={lowerTrapeziumShadowBlur} />
          </Path>
        </Group>
        <Path path={lowerTrapeziumPath} color={lowerTrapeziumColor} style="fill">
          <CornerPathEffect r={trapeziumCornerRadius} />
        </Path>
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    // zIndex: -1,
  },
});
